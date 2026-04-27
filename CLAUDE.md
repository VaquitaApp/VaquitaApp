# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

**VaquitaApp** — plataforma de gestión de fondos colectivos digitales (juntas, cuotas, vaquitas), construida para INF331 Pruebas de Software (Semestre 1 2026, Universidad Técnica Federico Santa María). Tema 3.

Entidades principales: usuarios (organizador / participante), fondos (con nombre, objetivo, monto, fecha límite, frecuencia de aporte) y aportes (con estado: pendiente / al día / en mora).

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS 4 |
| Backend | Node.js 20 + Express |
| Base de datos | MongoDB 7 (Mongoose) |
| Testing | Jest + Supertest + mongodb-memory-server |
| Email (local) | Mailpit (SMTP localhost:1025, UI localhost:8025) |
| Cloud (futuro) | AWS |

Estructura de carpetas:
```
/
├── client/                  # React app (Vite)
│   └── src/
│       ├── api/             # Axios wrappers por dominio
│       ├── components/      # funds/, layout/, ui/
│       ├── contexts/        # AuthContext
│       ├── pages/           # Una por ruta
│       └── utils/           # format.js (Intl formatters hoisted)
├── server/
│   └── src/
│       ├── jobs/            # reminderJob.js (node-cron)
│       ├── middleware/      # auth.js (JWT)
│       ├── models/          # User, Fund, Contribution
│       ├── routes/          # auth, funds, participants, contributions, invitations, users
│       └── services/        # emailService, paymentService, notificationService, quotaService
├── docs/                    # Plan de implementación y requerimientos
├── scripts/                 # setup.sh / setup.ps1
└── docker-compose.yml
```

## Commands

```bash
# Backend
cd server && npm install
npm run dev               # nodemon → http://localhost:3001

# Frontend
cd client && npm install
npm run dev               # Vite → http://localhost:5173

# Tests (Jest + Supertest, sin MongoDB externo)
cd server
npm test                        # todos los tests
npm test -- <path/to/test>      # archivo específico
npm test:coverage               # con reporte de cobertura
```

## Branch Naming & Git Workflow

GitFlow obligatorio. `main` protegido — solo se toca con PR + tag en release. Todo lo demás va a `develop` vía PR.

Formato: `<tipo>/<jira-id>-<descripcion-corta-kebab>`

Tipos: `feature/`, `fix/`, `test/`, `ci/`, `docs/`, `refactor/`, `chore/`

JIRA project key: **SCRUM**

Ejemplos:
- `feature/SCRUM-12-crear-fondo`
- `test/SCRUM-25-pruebas-unitarias-aportes`
- `fix/SCRUM-18-validacion-fecha-limite`

Tag de entrega: `v1.0-entrega1` apuntando a un commit en `main`.

## Decisiones de diseño relevantes

- **Tailwind v4**: usa `@tailwindcss/vite` plugin (sin `tailwind.config.js`). CSS: `@import "tailwindcss"`.
- **Rutas Express**: `GET /funds/public` debe definirse ANTES de `GET /funds/:id`.
- **Campos bloqueados**: `targetAmount`, `deadline`, `recipientAccount`, `frequency`, `quotaAmount`, `type`, `visibility` no se pueden editar si el fondo ya tiene aportes.
- **Organizador puede aportar**: el endpoint de contribuciones acepta al organizador y a participantes con `status === 'accepted'`.
- **Pago simulado**: `transactionId` empieza con `sim_`, `provider: 'simulation'`. En E2/E3 se reemplaza por Stripe Connect.
- **Tests**: usan `mongodb-memory-server`, no requieren MongoDB externo. Corren con `--runInBand`.
- **Cron de recordatorios**: definido en `server/src/jobs/reminderJob.js`, importado solo en `server.js` (no en `app.js`) para no interferir con tests.
- **Verificación de email**: requerida antes de hacer login. Token uuid sin expiración en E1. `GET /api/auth/verify-email/:token` activa la cuenta. Frontend: `/verificar-email/:token`. Tests usan `factories.createUser` con `isEmailVerified: true` por defecto (sin bypass en código de producción).
- **`recipientAccount` es subdocumento**: `{ bank, accountType, accountNumber }`. `accountType` enum: `corriente | vista | ahorro | chequera_electronica`. `accountNumber` solo dígitos (validado en Mongoose y en el frontend con `.replace(/\D/g, '')`).
- **`preferredAccount` en User**: mismo esquema que `recipientAccount`. Se edita en `/perfil`. `GET /api/auth/me` consulta la BD (no solo el JWT) para incluirlo. `PATCH /api/users/profile` actualiza solo la cuenta preferida (nombre es de solo lectura en perfil).
- **Validación de cuotas**: fondos tipo `quota` solo aceptan aportes de exactamente `pendingQuotas × quotaAmount`. Lógica en `quotaService.js` (compartida entre la ruta y el frontend).
- **Directorio público**: filtra fondos cuyo `organizer` sea `null` después del populate (organizador eliminado de la BD).
- **Gráfico de aportes**: eje X ordenado por timestamp de período, de menor a mayor fecha.
- **RUT chileno**: requerido en registro. Validado en cliente (formato + dígito verificador, módulo 11) y en servidor (`POST /api/auth/register`). Almacenado normalizado: sin puntos, con guión, DV en mayúscula (ej. `11111111-1`). Campo opcional en el modelo Mongoose (para no romper factories de tests).
- **Formulario de aporte**: los campos de cuenta origen se pre-rellenan desde `preferredAccount`. Si el usuario los modifica, aparece sugerencia inline para actualizar la cuenta guardada.
- **Pago al destinatario**: muestra cuenta `recipientAccount` del fondo y monto recaudado; solo requiere confirmación. Solo visible cuando `collectedAmount > 0`.
- **Cierre/eliminación de fondos con aportes**: "Cerrar fondo" se oculta (y el servidor rechaza con 422) si hay aportes. "Eliminar fondo" se oculta si `collectedAmount > 0`. El único camino para terminar un fondo con dinero es "Pagar al destinatario" → estado `completed`.
- **Formateo**: `fmtDate` usa `month: 'long'` con mes capitalizado (`"27 de Abril de 2026"`). `fmtName` capitaliza primera letra de cada palabra. Ambos en `client/src/utils/format.js`.
- **Eliminación de cuenta**: `POST /api/users/request-delete` verifica que el usuario no sea organizador ni participante aceptado en ningún fondo; genera `deleteAccountToken`, envía email de confirmación. `GET /api/users/confirm-delete/:token` elimina la cuenta sin autenticación. Frontend: `/confirmar-eliminacion/:token`. `ConfirmDeletePage` llama `logout()` tras confirmar.
- **Notificación de cambio de estado del fondo**: `sendStatusChangeEmail` (fire-and-forget con `.catch()`) enviada a organizador y todos los participantes con `status === 'accepted'` cuando el fondo cambia a `completed` o `closed`. Ambas rutas (`/payment` y `/close`) populan `organizer` y `participants.user` antes de llamarla.
- **TypeBadge en FundCard**: Pill violeta "Por cuotas" para `quota`, pill azul "Libre" para `free` (`TypeBadge` en `Badge.jsx`, con `whitespace-nowrap shrink-0`). FundCard muestra además cantidad de cuotas calculadas (de `createdAt` a `deadline` según frecuencia) y el valor de cada cuota.
- **ParticipantList**: Solo columnas Nombre y Aportes. Columnas Invitación y Acciones eliminadas. Badge "Organizador" mostrado debajo del email en la fila del organizador.
- **Cuenta destinataria en detalle de fondo**: Mostrada verticalmente — banco (línea 1), tipo de cuenta (línea 2), número de cuenta (línea 3).
- **Validaciones de creación de fondo**: (1) `quotaAmount` no puede superar `targetAmount` — validado en servidor (`POST /api/funds`) y cliente (`FundForm`). (2) `deadline` debe ser posterior al día actual — validado en servidor con `isDeadlineValid()` en POST y PATCH, y en cliente con atributo `min` usando `toLocaleDateString('en-CA')` para obtener YYYY-MM-DD en zona horaria local.
- **Cuotas pendientes**: `pendingQuotas = Math.max(0, periodsElapsed - paidPeriods)`. Servidor retorna 400 "Estás al día" si `pending === 0`. Frontend (`ContributionForm`) muestra pantalla informativa ("Estás al día") en lugar del formulario cuando `pending === 0`.

## Deliverables Checklist — Entrega 1

- [x] MVP funcional con CRUD de fondos
- [x] Pruebas automatizadas (89 tests: unitarios + integración + E2E)
- [x] README con instrucciones de instalación
- [x] `.gitignore` y `LICENSE`
- [x] Directorio `docs/`
- [x] Código en `develop` (PR #1 mergeado — `chore/SCRUM-15-project-setup` → `develop`)
- [ ] README: agregar links a video, Wiki e integrantes
- [ ] GitHub Wiki: Home + páginas del proyecto + Entrega 1
- [ ] PR `develop` → `main` + Tag `v1.0-entrega1` + GitHub Release
- [ ] JIRA: solo SCRUM-15 debe quedar en Finalizado; el resto permanece sin cambios
