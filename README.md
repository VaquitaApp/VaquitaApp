# VaquitaApp

[![CI/CD](https://github.com/VaquitaApp/VaquitaApp/actions/workflows/node.js.yml/badge.svg)](https://github.com/VaquitaApp/VaquitaApp/actions/workflows/node.js.yml)

Plataforma web para gestionar fondos colectivos digitales.

> **INF331 Pruebas de Software — Tema 3 | Universidad Técnica Federico Santa María, Semestre 1 2026**
> **Entrega 1 — MVP** · Tag: `v1.0-entrega1`
> **Entrega 2 — CI** · Tag: `v2.0-entrega2`
> **Repositorio:** https://github.com/VaquitaApp/VaquitaApp

---

## Integrantes

| Nombre           | ROL         |
| ---------------- | ----------- |
| Benjamin Paulsen | 202173017-6 |
| Gaspar Navarro   | 202173003-6 |
| Vicente Pérez    | 202073042-3 |
| Diego Villouta   | 2773019-1   |

---

## Demo y recursos

- **GitHub Wiki:** https://github.com/VaquitaApp/VaquitaApp/wiki
- **Tablero JIRA:** https://usm-team-vaquitapp.atlassian.net

---

## Entrega 1

- **Presentación:** https://docs.google.com/presentation/d/1Enm3cq8AdLh2bJgn1Aa6K_XZcdc37G_fvE89OILYSZw/edit?usp=sharing
- **Video demo:** https://www.youtube.com/watch?v=wAFwALj1t4Q

---

## Entrega 2

- **Video demo:** https://www.youtube.com/watch?v=HmHlrf5R01I

---

## Stack tecnológico

| Capa          | Tecnología                               |
| ------------- | ---------------------------------------- |
| Frontend      | React 18 + Vite + Tailwind CSS 4         |
| Backend       | Node.js 20 + Express                     |
| Base de datos | MongoDB 7                                |
| Testing       | Jest + Supertest + mongodb-memory-server |
| Email (local) | Mailpit                                  |

---

## Instalación y ejecución local

Hay tres formas de levantar el proyecto. Elige la que más te acomode.

| Opción                                          | Requiere                     | Ideal para                                          |
| ----------------------------------------------- | ---------------------------- | --------------------------------------------------- |
| [A — Makefile](#opción-a--makefile-recomendado) | Node.js 20, MongoDB, Mailpit | macOS / Linux — dos comandos desde cero             |
| [B — Manual](#opción-b--instalación-manual)     | Node.js 20, MongoDB, Mailpit | Cuando el Makefile no funciona                      |
| [C — Docker](#opción-c--docker)                 | Docker Desktop               | No querer instalar MongoDB/Mailpit; equipos Windows |

---

## Opción A — Makefile (recomendado)

### 1. Requisitos previos

| Herramienta       | Versión mínima | Cómo instalar                                     |
| ----------------- | -------------- | ------------------------------------------------- |
| Node.js           | 20 LTS         | https://nodejs.org                                |
| MongoDB Community | 7              | Ver sección [Instalar MongoDB](#instalar-mongodb) |
| Mailpit           | cualquiera     | Ver sección [Instalar Mailpit](#instalar-mailpit) |
| Git               | 2              | https://git-scm.com                               |

### 2. Clonar, configurar y levantar

```bash
git clone https://github.com/VaquitaApp/VaquitaApp.git
cd VaquitaApp
make setup   # instala dependencias, crea .env y genera JWT_SECRET
make dev     # arranca MongoDB, Mailpit, backend y frontend — todo en una terminal
```

`Ctrl+C` detiene todos los servicios.

**Windows:** usa la Opción B o la Opción C (Docker). El Makefile y `dev.sh` requieren bash.

---

## Opción B — Instalación manual

```bash
git clone https://github.com/VaquitaApp/VaquitaApp.git
cd VaquitaApp

cd server && npm install && cd ..
cd client && npm install && cd ..

cp server/.env.example server/.env
cp client/.env.example client/.env
```

Edita `server/.env` y reemplaza `JWT_SECRET=change_me`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Luego levanta los servicios igual que en la Opción A.

---

## Opción C — Docker

No necesitas instalar Node.js, MongoDB ni Mailpit. Solo Docker Desktop.

### 1. Instalar Docker Desktop

- **macOS / Windows:** https://www.docker.com/products/docker-desktop
- **Linux:** https://docs.docker.com/engine/install/

### 2. Crear `server/.env`

**Si tienes Node.js** — ejecuta el script de la Opción A.

**Si NO tienes Node.js:**

```bash
cp server/.env.example server/.env

# Genera JWT_SECRET usando Docker:
docker run --rm node:20-alpine \
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Pega el valor en server/.env → JWT_SECRET=<valor>
```

**Windows (PowerShell):**

```powershell
Copy-Item server\.env.example server\.env

docker run --rm node:20-alpine `
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. Levantar

```bash
make docker          # en primer plano  (docker-compose up)
make docker-down     # detener          (docker-compose down)
make docker-clean    # detener y borrar datos de MongoDB

# O directamente:
docker-compose up -d          # en segundo plano
docker-compose up --build     # rebuild tras cambiar dependencias
```

---

## Ejecutar los tests

### Tests del servidor (unitarios + integración)

La suite consta de **314 tests** organizados por carpeta de Historia de Usuario en `server/tests/HUXX/`. Usan base de datos en memoria. **No requieren MongoDB en ejecución.**

```bash
make test        # todos los tests
make coverage    # tests + reporte de cobertura

# O directamente:
cd server && npm test
cd server && npm run test:coverage

# Docker
docker-compose run --rm server npm test
```

### Tests E2E (Puppeteer)

La suite E2E consta de **12 tests** que simulan flujos de usuario reales en un navegador headless (autenticación, CRUD de fondos, filtros, directorio público y perfil). A diferencia de los tests del servidor, **requieren la aplicación corriendo** (MongoDB + backend + frontend).

```bash
make dev         # terminal 1: levanta la app completa
make e2e         # terminal 2: instala deps, seedea el usuario E2E y corre la suite
```

Cada ejecución genera un reporte HTML en `e2e/reports/`, y los fallos capturan screenshots automáticamente. Casos de prueba, variables y detalles en [`e2e/README.md`](e2e/README.md). En CI corren en el job `e2e` del pipeline.

---

## URLs de acceso

| Servicio           | URL                                   |
| ------------------ | ------------------------------------- |
| Aplicación web     | http://localhost:5173                 |
| API / Health check | http://localhost:3001/api/health      |
| Mailpit (emails)   | http://localhost:8025                 |
| Mongo Express (BD) | http://localhost:8081 _(solo Docker)_ |

---

## Instalar MongoDB

| Plataforma    | Instrucciones                                                                                                |
| ------------- | ------------------------------------------------------------------------------------------------------------ |
| macOS         | `brew tap mongodb/brew && brew install mongodb-community`                                                    |
| Ubuntu/Debian | [Guía oficial](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/)                      |
| Windows       | [Instalador oficial](https://www.mongodb.com/try/download/community) — marcar "Install MongoDB as a Service" |

## Arrancar MongoDB

| Plataforma       | Comando                                 |
| ---------------- | --------------------------------------- |
| macOS (Homebrew) | `brew services start mongodb-community` |
| Linux (systemd)  | `sudo systemctl start mongod`           |
| Windows          | `net start MongoDB`                     |
| Sin servicio     | `mongod`                                |

## Instalar Mailpit

| Plataforma | Comando                                                                                      |
| ---------- | -------------------------------------------------------------------------------------------- |
| macOS      | `brew install mailpit`                                                                       |
| Linux      | `curl -sL https://raw.githubusercontent.com/axllent/mailpit/develop/install.sh \| sudo bash` |
| Windows    | Descargar `mailpit.exe` desde [GitHub Releases](https://github.com/axllent/mailpit/releases) |
| Docker     | `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit`                                    |

---

## Variables de entorno — `server/.env`

| Variable         | Descripción                    | Valor por defecto                      |
| ---------------- | ------------------------------ | -------------------------------------- |
| `PORT`           | Puerto backend                 | `3001`                                 |
| `MONGO_URI`      | URI MongoDB                    | `mongodb://localhost:27017/vaquitaapp` |
| `JWT_SECRET`     | Clave para firmar tokens       | _(generado en setup)_                  |
| `JWT_EXPIRES_IN` | Duración del token             | `7d`                                   |
| `SMTP_HOST`      | Host SMTP                      | `localhost`                            |
| `SMTP_PORT`      | Puerto SMTP                    | `1025`                                 |
| `SMTP_FROM`      | Remitente de emails            | `noreply@vaquitaapp.local`             |
| `APP_BASE_URL`   | URL frontend (links en emails) | `http://localhost:5173`                |

> En Docker, `MONGO_URI` y `SMTP_HOST` se sobreescriben automáticamente con los nombres de servicio internos.

---

## Documentación técnica

Documentación detallada (estrategia de pruebas, supuestos, dependencias, evidencias) en la **[GitHub Wiki](https://github.com/VaquitaApp/VaquitaApp/wiki)**.

---

## Licencia

MIT
