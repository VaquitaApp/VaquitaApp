# VaquitaApp

Plataforma web para gestionar fondos colectivos digitales: paseos, regalos grupales, cuotas, rifas y vaquitas en general.

> **INF331 Pruebas de Software — Tema 3 | Universidad Técnica Federico Santa María, Semestre 1 2026**

---

## Integrantes

| Nombre | Rol |
|---|---|
| _(agregar)_ | _(agregar)_ |

---

## Demo y recursos

- **Video demo:** _(agregar link)_
- **GitHub Wiki:** _(agregar link)_
- **Tablero JIRA:** _(agregar link)_

---

## Stack tecnológico

| Capa | Tecnología |
|---|---|
| Frontend | React 18 + Vite + Tailwind CSS 4 |
| Backend | Node.js 20 + Express |
| Base de datos | MongoDB 7 |
| Testing | Jest + Supertest + mongodb-memory-server |
| Email (local) | Mailpit |

---

## Instalación y ejecución local

Hay tres formas de levantar el proyecto. Elige la que más te acomode.

| Opción | Requiere | Ideal para |
|---|---|---|
| [A — Script automático](#opción-a--script-automático) | Node.js 20, MongoDB, Mailpit | Desarrollo con hot-reload completo |
| [B — Manual](#opción-b--instalación-manual) | Node.js 20, MongoDB, Mailpit | Cuando el script no funciona |
| [C — Docker](#opción-c--docker) | Docker Desktop | No querer instalar MongoDB/Mailpit; equipos Windows/Linux |

---

## Opción A — Script automático

El script instala dependencias, crea los `.env` y genera el `JWT_SECRET` automáticamente.

### 1. Requisitos previos

| Herramienta | Versión mínima | Cómo instalar |
|---|---|---|
| Node.js | 20 LTS | https://nodejs.org |
| MongoDB Community | 7 | Ver sección [Instalar MongoDB](#instalar-mongodb) |
| Mailpit | cualquiera | Ver sección [Instalar Mailpit](#instalar-mailpit) |
| Git | 2 | https://git-scm.com |

### 2. Clonar y configurar

```bash
git clone https://github.com/VaquitaApp/VaquitaApp.git
cd VaquitaApp
```

**macOS / Linux:**
```bash
chmod +x scripts/setup.sh
./scripts/setup.sh
```

**Windows (PowerShell):**
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\scripts\setup.ps1
```

### 3. Levantar los servicios

Necesitas cuatro terminales.

| Terminal | Comando |
|---|---|
| 1 — MongoDB | Ver [Arrancar MongoDB](#arrancar-mongodb) |
| 2 — Mailpit | `mailpit` |
| 3 — Backend | `cd server && npm run dev` |
| 4 — Frontend | `cd client && npm run dev` |

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
docker-compose up          # en primer plano
docker-compose up -d       # en segundo plano
docker-compose down        # detener
docker-compose down -v     # detener y eliminar datos de MongoDB
```

Para rebuild tras cambiar dependencias:
```bash
docker-compose up --build
```

---

## Ejecutar los tests

Los tests usan base de datos en memoria. **No requieren MongoDB en ejecución.**

```bash
# Local
cd server && npm test
cd server && npm run test:coverage

# Docker
docker-compose run --rm server npm test
```

---

## URLs de acceso

| Servicio | URL |
|---|---|
| Aplicación web | http://localhost:5173 |
| API / Health check | http://localhost:3001/api/health |
| Mailpit (emails) | http://localhost:8025 |
| Mongo Express (BD) | http://localhost:8081 *(solo Docker)* |

---

## Instalar MongoDB

| Plataforma | Instrucciones |
|---|---|
| macOS | `brew tap mongodb/brew && brew install mongodb-community` |
| Ubuntu/Debian | [Guía oficial](https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/) |
| Windows | [Instalador oficial](https://www.mongodb.com/try/download/community) — marcar "Install MongoDB as a Service" |

## Arrancar MongoDB

| Plataforma | Comando |
|---|---|
| macOS (Homebrew) | `brew services start mongodb-community` |
| Linux (systemd) | `sudo systemctl start mongod` |
| Windows | `net start MongoDB` |
| Sin servicio | `mongod` |

## Instalar Mailpit

| Plataforma | Comando |
|---|---|
| macOS | `brew install mailpit` |
| Linux | `curl -sL https://raw.githubusercontent.com/axllent/mailpit/develop/install.sh \| sudo bash` |
| Windows | Descargar `mailpit.exe` desde [GitHub Releases](https://github.com/axllent/mailpit/releases) |
| Docker | `docker run -d -p 1025:1025 -p 8025:8025 axllent/mailpit` |

---

## Variables de entorno — `server/.env`

| Variable | Descripción | Valor por defecto |
|---|---|---|
| `PORT` | Puerto backend | `3001` |
| `MONGO_URI` | URI MongoDB | `mongodb://localhost:27017/vaquitaapp` |
| `JWT_SECRET` | Clave para firmar tokens | *(generado en setup)* |
| `JWT_EXPIRES_IN` | Duración del token | `7d` |
| `SMTP_HOST` | Host SMTP | `localhost` |
| `SMTP_PORT` | Puerto SMTP | `1025` |
| `SMTP_FROM` | Remitente de emails | `noreply@vaquitaapp.local` |
| `APP_BASE_URL` | URL frontend (links en emails) | `http://localhost:5173` |

> En Docker, `MONGO_URI` y `SMTP_HOST` se sobreescriben automáticamente con los nombres de servicio internos.

---

## Documentación técnica

Ver `docs/` para el plan de implementación y los requerimientos del sistema.

---

## Licencia

MIT
