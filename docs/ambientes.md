# Ambientes de VaquitaApp

Un ambiente es **un set de valores de variables de entorno** sobre el mismo código
(patrón 12-factor). Nunca hay código distinto por ambiente; la rama define *qué
versión* se despliega y las variables definen *dónde y con qué datos*.

| | dev (local) | CI (tests) | staging (nube) | prod (nube) |
|---|---|---|---|---|
| **Fuente de código** | working tree | rama del PR | rama `develop` | rama `main` (release) |
| **Frontend** | Vite dev `:5173` | build de validación | Amplify (auto-build de `develop`) | Amplify (auto-build de `main`) |
| **Backend** | nodemon `:3001` (`make dev`) | jobs de Actions | ECS Express Mode `vaquitaapp-api-staging` | ECS Express Mode (se promueve en el release) |
| **Base de datos** | Mongo local `vaquitaapp` | memory-server / service efímero | Atlas M0, BD `vaquitaapp_staging` | Atlas M0, BD `vaquitaapp` |
| **Email** | Mailpit (`:1025`/UI `:8025`) | sin SMTP (fire-and-forget) | Brevo SMTP | Brevo SMTP (SES como evolución futura con dominio propio) |
| **Config en** | `server/.env` + `client/.env` | `.github/workflows/node.js.yml` | task definition ECS + consola Amplify | task definition ECS + consola Amplify |

## Detalles por pieza

- **Docker**: `server/Dockerfile` es multi-etapa — `dev` (nodemon + devDeps; lo usa
  `docker-compose.yml` vía `build.target: dev`) y `prod` (`npm ci --omit=dev`,
  `NODE_ENV=production`, `node src/server.js`; es la imagen que se sube a ECR para el
  servicio ECS Express Mode).
- **Frontend**: `VITE_API_URL` se hornea en build-time. Local sale de `client/.env`;
  en la nube, de las env vars de la app/rama en la consola de Amplify.
- **Atlas**: un solo cluster M0 (AWS us-east-1); los ambientes se separan por nombre
  de base de datos en el `MONGO_URI` (`vaquitaapp_staging` vs `vaquitaapp`). Acceso
  de red `0.0.0.0/0` (las tareas de ECS/Fargate no tienen IP fija) — limitación conocida, mitigada
  con contraseña fuerte del usuario de BD.
- **Secretos** (`JWT_SECRET`, `MONGO_URI`, SMTP): nunca se commitean. Viven en
  `server/.env` (gitignored) en dev y en la task definition del servicio ECS en la nube.
- **Promoción a prod** (release E3 / Fase 3): conectar la rama `main` en la misma app
  de Amplify (URL propia) y apuntar el servicio ECS Express Mode a la BD `vaquitaapp`
  (o levantar un segundo servicio `-prod` si se quieren ambos vivos a la vez).
- **Nota histórica**: el plan original usaba AWS App Runner, pero cerró a clientes
  nuevos el 30-04-2026; el reemplazo oficial recomendado por AWS es ECS Express Mode
  (imagen de ECR → servicio Fargate + balanceador con HTTPS y URL propia).

## Decisión: proveedor de email (Brevo vs AWS SES)

El backend envía correos vía SMTP autenticado con `nodemailer`. El transporter usa
auth solo si `SMTP_USER` está definido (`server/src/services/emailService.js`), así que
el proveedor es intercambiable **cambiando únicamente variables de entorno, sin tocar
código**. Se evaluaron dos opciones para staging/producción:

| | **Brevo** (elegido) | **AWS SES** |
|---|---|---|
| Nativo AWS | No (servicio externo) | Sí |
| Cambio de código | Ninguno (solo env vars) | Ninguno (solo env vars) |
| Costo | Gratis 300 correos/día, permanente | ~Gratis (cubierto por créditos) |
| Enviar a destinatarios arbitrarios | **Sí, inmediato** | **No hasta salir del sandbox** |
| Deliverability con remitente Gmail | Regular (sin DKIM/DMARC del dominio) | Igual de regular (mismo problema) |

**Por qué Brevo y no SES (por ahora):** SES arranca en **sandbox**, donde solo entrega
a destinatarios *previamente verificados*. Para que cualquier usuario externo reciba su
correo de verificación o invitación, hay que **solicitar acceso de producción**: un
formulario con justificación que AWS revisa en **1–3 días hábiles y puede rechazar**.
Esa barrera rompería el registro/invitaciones de usuarios reales. Brevo no tiene sandbox:
entrega a cualquier dirección desde el primer envío.

Además, **el salto de deliverability no lo da el proveedor sino un dominio propio** con
SPF/DKIM/DMARC. Con un remitente Gmail (`diegov17@gmail.com`), tanto Brevo como SES
quedan en la misma situación (los correos pueden caer en spam o mostrar aviso de "enviado
vía …"). Migrar a SES hoy *sumaría* el trámite del sandbox sin mejorar la entrega.

**Evolución a producción (documentada, más compleja):** el camino "100 % AWS" es
**SES + dominio propio**, y es deliberadamente más laborioso que Brevo:
1. Registrar/usar un dominio (ej. `vaquitaapp.cl`).
2. Verificar el dominio en SES creando los registros DNS de **DKIM** (y idealmente SPF/DMARC).
3. **Solicitar salida del sandbox** (caso de uso + volumen estimado), esperar aprobación 1–3 días.
4. Cambiar las env vars del servicio ECS a las credenciales SMTP de SES
   (`SMTP_HOST=email-smtp.us-east-1.amazonaws.com`, usuario/clave SMTP de SES).

Como el código ya soporta SMTP autenticado genérico, ese día el cambio es solo de
configuración. Mientras tanto, **Brevo cubre staging y la entrega del curso sin bloqueos**.
Montar un servidor SMTP propio en EC2 se descarta (AWS bloquea el puerto 25, reputación
de IP y mantención lo hacen inviable).
