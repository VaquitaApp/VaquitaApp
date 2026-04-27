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
│       └── pages/           # Una por ruta
├── server/
│   └── src/
│       ├── jobs/            # reminderJob.js (node-cron)
│       ├── middleware/      # auth.js (JWT)
│       ├── models/          # User, Fund, Contribution
│       ├── routes/          # auth, funds, participants, contributions, invitations, users
│       └── services/        # emailService, paymentService, notificationService
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
- **Campos bloqueados**: `targetAmount`, `deadline`, `recipientAccount`, `frequency`, `quotaAmount` no se pueden editar si el fondo ya tiene aportes.
- **Organizador puede aportar**: el endpoint de contribuciones acepta al organizador y a participantes con `status === 'accepted'`.
- **Pago simulado**: `transactionId` empieza con `sim_`, `provider: 'simulation'`. En E2/E3 se reemplaza por Stripe Connect.
- **Tests**: usan `mongodb-memory-server`, no requieren MongoDB externo. Corren con `--runInBand`.
- **Cron de recordatorios**: definido en `server/src/jobs/reminderJob.js`, importado solo en `server.js` (no en `app.js`) para no interferir con tests.

## Deliverables Checklist — Entrega 1

- [x] MVP funcional con CRUD de fondos
- [x] Pruebas automatizadas (78 tests: unitarios + integración + E2E)
- [x] README con instrucciones de instalación
- [x] `.gitignore` y `LICENSE`
- [x] Directorio `docs/`
- [ ] README: agregar links a video, Wiki e integrantes
- [ ] GitHub Wiki: Home + páginas del proyecto + Entrega 1
- [ ] Tag `v1.0-entrega1` + GitHub Release en `main`
- [ ] JIRA Kanban actualizado
