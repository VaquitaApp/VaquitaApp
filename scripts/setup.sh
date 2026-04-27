#!/usr/bin/env bash
# VaquitaApp — setup inicial (macOS y Linux)
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

echo ""
echo -e "${CYAN}=== VaquitaApp — Setup inicial ===${NC}"
echo ""

# Ubicarse en la raíz del repo
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# ── 1. Verificar Node.js ──────────────────────────────────────────────────────
if ! command -v node &> /dev/null; then
  echo -e "${RED}✗ Node.js no está instalado.${NC}"
  echo "  Instala Node.js 20 LTS desde https://nodejs.org"
  exit 1
fi

NODE_MAJOR=$(node -v | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -lt 20 ]; then
  echo -e "${RED}✗ Se requiere Node.js 20 o superior. Versión actual: $(node -v)${NC}"
  exit 1
fi
echo -e "${GREEN}✓ Node.js $(node -v)${NC}"

# ── 2. Instalar dependencias ──────────────────────────────────────────────────
echo "  Instalando dependencias del servidor..."
(cd server && npm install --silent)
echo -e "${GREEN}✓ server/node_modules instalados${NC}"

echo "  Instalando dependencias del cliente..."
(cd client && npm install --silent)
echo -e "${GREEN}✓ client/node_modules instalados${NC}"

# ── 3. Crear server/.env ──────────────────────────────────────────────────────
if [ ! -f server/.env ]; then
  if [ ! -f server/.env.example ]; then
    echo -e "${RED}✗ No se encontró server/.env.example${NC}"
    exit 1
  fi
  cp server/.env.example server/.env

  # Generar JWT_SECRET aleatorio y reemplazarlo en .env
  JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
  if [[ "$OSTYPE" == "darwin"* ]]; then
    sed -i '' "s|JWT_SECRET=change_me|JWT_SECRET=$JWT_SECRET|" server/.env
  else
    sed -i "s|JWT_SECRET=change_me|JWT_SECRET=$JWT_SECRET|" server/.env
  fi
  echo -e "${GREEN}✓ server/.env creado (JWT_SECRET generado automáticamente)${NC}"
else
  echo -e "${YELLOW}⚠ server/.env ya existe — no se sobreescribe${NC}"
fi

# ── 4. Crear client/.env ──────────────────────────────────────────────────────
if [ ! -f client/.env ]; then
  if [ ! -f client/.env.example ]; then
    echo -e "${RED}✗ No se encontró client/.env.example${NC}"
    exit 1
  fi
  cp client/.env.example client/.env
  echo -e "${GREEN}✓ client/.env creado${NC}"
else
  echo -e "${YELLOW}⚠ client/.env ya existe — no se sobreescribe${NC}"
fi

# ── 5. Verificar MongoDB ──────────────────────────────────────────────────────
echo ""
if command -v mongod &> /dev/null; then
  echo -e "${GREEN}✓ MongoDB instalado: $(mongod --version | head -1)${NC}"
else
  echo -e "${YELLOW}⚠ MongoDB no detectado en PATH.${NC}"
  echo "  macOS:  brew install mongodb-community"
  echo "  Ubuntu: https://www.mongodb.com/docs/manual/tutorial/install-mongodb-on-ubuntu/"
fi

# ── 6. Verificar Mailpit ──────────────────────────────────────────────────────
if command -v mailpit &> /dev/null; then
  echo -e "${GREEN}✓ Mailpit instalado${NC}"
else
  echo -e "${YELLOW}⚠ Mailpit no detectado.${NC}"
  echo "  macOS:  brew install mailpit"
  echo "  Linux:  curl -sL https://raw.githubusercontent.com/axllent/mailpit/develop/install.sh | sudo bash"
fi

# ── Resumen ───────────────────────────────────────────────────────────────────
echo ""
echo -e "${CYAN}=== Setup completado ===${NC}"
echo ""
echo "Para ejecutar la aplicación necesitas 4 terminales:"
echo ""
echo "  Terminal 1 — MongoDB"
echo "    macOS (Homebrew): brew services start mongodb-community"
echo "    Linux:            sudo systemctl start mongod"
echo ""
echo "  Terminal 2 — Mailpit"
echo "    mailpit"
echo ""
echo "  Terminal 3 — Backend"
echo "    cd server && npm run dev"
echo ""
echo "  Terminal 4 — Frontend"
echo "    cd client && npm run dev"
echo ""
echo "URLs:"
echo "  App:     http://localhost:5173"
echo "  API:     http://localhost:3001/api/health"
echo "  Emails:  http://localhost:8025"
echo ""
echo "Tests:"
echo "  cd server && npm test"
echo ""
