# Ambientes de VaquitaApp

Un ambiente es **un set de valores de variables de entorno** sobre el mismo código
(patrón 12-factor). Nunca hay código distinto por ambiente; la rama define *qué
versión* se despliega y las variables definen *dónde y con qué datos*.

| | dev (local) | CI (tests) | staging (nube) | prod (nube) |
|---|---|---|---|---|
| **Fuente de código** | working tree | rama del PR | rama `develop` | rama `main` (release) |
| **Frontend** | Vite dev `:5173` | build de validación | Amplify (auto-build de `develop`) | Amplify (auto-build de `main`) |
| **Backend** | nodemon `:3001` (`make dev`) | jobs de Actions | App Runner `vaquitaapp-api-staging` | App Runner (se promueve en el release) |
| **Base de datos** | Mongo local `vaquitaapp` | memory-server / service efímero | Atlas M0, BD `vaquitaapp_staging` | Atlas M0, BD `vaquitaapp` |
| **Email** | Mailpit (`:1025`/UI `:8025`) | sin SMTP (fire-and-forget) | SMTP real o simulado (decisión Fase 2) | SMTP real (Brevo/SES) |
| **Config en** | `server/.env` + `client/.env` | `.github/workflows/node.js.yml` | consolas App Runner + Amplify | consolas App Runner + Amplify |

## Detalles por pieza

- **Docker**: `server/Dockerfile` es multi-etapa — `dev` (nodemon + devDeps; lo usa
  `docker-compose.yml` vía `build.target: dev`) y `prod` (`npm ci --omit=dev`,
  `NODE_ENV=production`, `node src/server.js`; es la imagen que se sube a ECR para
  App Runner).
- **Frontend**: `VITE_API_URL` se hornea en build-time. Local sale de `client/.env`;
  en la nube, de las env vars de la app/rama en la consola de Amplify.
- **Atlas**: un solo cluster M0 (AWS us-east-1); los ambientes se separan por nombre
  de base de datos en el `MONGO_URI` (`vaquitaapp_staging` vs `vaquitaapp`). Acceso
  de red `0.0.0.0/0` (App Runner no tiene IP fija) — limitación conocida, mitigada
  con contraseña fuerte del usuario de BD.
- **Secretos** (`JWT_SECRET`, `MONGO_URI`, SMTP): nunca se commitean. Viven en
  `server/.env` (gitignored) en dev y en la consola de App Runner en la nube.
- **Promoción a prod** (release E3 / Fase 3): conectar la rama `main` en la misma app
  de Amplify (URL propia) y apuntar el servicio de App Runner a la BD `vaquitaapp`
  (o levantar un segundo servicio `-prod` si se quieren ambos vivos a la vez).
