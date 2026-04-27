# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Context

**VaquitaApp** — plataforma de gestión de fondos colectivos digitales (juntas, cuotas, vaquitas), construida para INF331 Pruebas de Software (Semestre 1 2026, Universidad Técnica Federico Santa María). Tema 3. Esta es Entrega 1: un MVP con pruebas automatizadas.

Entidades principales: usuarios (organizador / participante), fondos (con nombre, objetivo, monto, fecha límite, frecuencia de aporte) y aportes (con estado: pendiente / al día / en mora).

## Stack Tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React + Tailwind CSS |
| Backend | Node.js (Express) |
| Base de datos | MongoDB (Mongoose) |
| Cloud (futuro) | AWS |
| Ejecución actual | 100% local |

Estructura de carpetas esperada:
```
/
├── client/       # React app (Vite o CRA)
├── server/       # Express API
│   ├── models/   # Mongoose schemas
│   ├── routes/   # Express routers
│   └── ...
└── .mcp.json     # MCP Jira config
```

## Commands

```bash
# Backend
cd server && npm install
npm run dev          # nodemon

# Frontend
cd client && npm install
npm run dev          # Vite

# Tests (herramienta a confirmar — probablemente Jest)
npm test                        # todos los tests
npm test -- <path/to/test>      # un archivo específico
npm test -- --coverage          # con cobertura
```

## Branch Naming & Git Workflow

GitFlow obligatorio. `main` protegido — solo se toca con PR + tag en release. Todo lo demás va a `develop` vía PR.

Formato: `<tipo>/<jira-id>-<descripcion-corta-kebab>`

Tipos: `feature/`, `fix/`, `test/`, `ci/`, `docs/`, `refactor/`, `chore/`

Ejemplos:
- `feature/VA-12-crear-fondo`
- `test/VA-25-pruebas-unitarias-aportes`
- `fix/VA-18-validacion-fecha-limite`

Tag de entrega: `v1.0-entrega1` apuntando a un commit en `main`.

## MVP Scope (Entrega 1)

CRUD obligatorio sobre **fondos** como entidad principal:

| Operación | Descripción |
|---|---|
| Listar | Fondos del usuario autenticado |
| Buscar/filtrar | Por nombre, estado o fecha |
| Ver detalle | Panel del fondo: participantes, aportes, progreso |
| Crear | Nuevo fondo con datos básicos |
| Editar | Modificar datos del fondo |
| Eliminar | Dar de baja un fondo |

Adicional en E1: autenticación (registro/login), roles organizador vs. participante, registro básico de aportes, al menos una funcionalidad con IA.

## Deliverables Checklist

- [ ] MVP funcional con CRUD de fondos
- [ ] Pruebas automatizadas corriendo
- [ ] README con instrucciones de instalación + links a video, Wiki e integrantes
- [ ] `.gitignore` y `LICENSE`
- [ ] Directorio `docs/`
- [ ] GitHub Wiki: Home + páginas del proyecto + Entrega 1
- [ ] Tag `v1.0-entrega1` + GitHub Release en `main`
- [ ] JIRA Kanban actualizado con historias, criterios de aceptación y estimaciones
- [ ] Integraciones GitHub + JIRA + Slack/Discord activas
