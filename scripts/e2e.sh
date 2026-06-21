#!/usr/bin/env bash
# VaquitaApp — levanta el stack (Mongo + backend + frontend), corre los tests E2E
# (Puppeteer) y limpia al terminar. Reutiliza servicios que ya estén corriendo
# (p. ej. `make dev` o `make docker`) y solo detiene lo que este script levantó.
set -euo pipefail

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

API_HEALTH="http://localhost:3001/api/health"
FRONT_URL="http://localhost:5173"

# ── Pre-chequeos ──────────────────────────────────────────────────────────────
if [ ! -f server/.env ]; then
  echo -e "${RED}✗ server/.env no existe. Ejecuta primero:  make setup${NC}"; exit 1
fi
if [ ! -d server/node_modules ] || [ ! -d client/node_modules ]; then
  echo -e "${RED}✗ Dependencias no instaladas. Ejecuta primero:  make setup${NC}"; exit 1
fi

# ── Node 20 (Puppeteer 22 no corre en Node >= 23; el CI fija Node 20) ─────────
# Si el shell tiene una versión demasiado nueva, usa node@20 de brew si está.
NODE_MAJOR="$(node -v | sed -E 's/^v([0-9]+).*/\1/')"
if [ "$NODE_MAJOR" -gt 22 ]; then
  N20_BIN=""
  for p in /opt/homebrew/opt/node@20/bin /usr/local/opt/node@20/bin; do
    [ -x "$p/node" ] && N20_BIN="$p" && break
  done
  if [ -n "$N20_BIN" ]; then
    export PATH="$N20_BIN:$PATH"
    echo -e "${YELLOW}ℹ Tu shell usa Node $NODE_MAJOR; los E2E corren con $("$N20_BIN/node" -v) (node@20).${NC}"
  else
    echo -e "${RED}✗ Los tests E2E requieren Node 20 (Puppeteer 22 no soporta Node $NODE_MAJOR; el CI usa Node 20).${NC}"
    echo -e "  Instálalo:  ${CYAN}brew install node@20${NC}   (o usa nvm/fnm con el .nvmrc del repo)"
    exit 1
  fi
fi

# ── Cleanup: solo detiene lo que ESTE script levantó ──────────────────────────
STARTED_PIDS=()
STARTED_PORTS=()
cleanup() {
  local code=$?
  if [ "${#STARTED_PORTS[@]}" -gt 0 ] || [ "${#STARTED_PIDS[@]}" -gt 0 ]; then
    echo -e "\n${YELLOW}Deteniendo servicios que levantó el script...${NC}"
  fi
  # Matar por puerto alcanza al árbol real (npm -> node/vite), no solo al wrapper.
  if [ "${#STARTED_PORTS[@]}" -gt 0 ]; then
    for port in "${STARTED_PORTS[@]}"; do
      lsof -ti "tcp:$port" 2>/dev/null | xargs kill 2>/dev/null || true
    done
  fi
  if [ "${#STARTED_PIDS[@]}" -gt 0 ]; then
    for pid in "${STARTED_PIDS[@]}"; do kill "$pid" 2>/dev/null || true; done
  fi
  wait 2>/dev/null || true
  exit $code
}
trap cleanup EXIT INT TERM

# Espera hasta que una URL responda 200 (o se agote el tiempo).
wait_http() {
  local url=$1 name=$2 tries=${3:-60}
  for ((i=1; i<=tries; i++)); do
    if curl -fsS -m 3 "$url" >/dev/null 2>&1; then echo -e "${GREEN}✓ $name listo${NC}"; return 0; fi
    sleep 1
  done
  echo -e "${RED}✗ $name no respondió tras ${tries}s${NC}"; return 1
}

# ── MongoDB ───────────────────────────────────────────────────────────────────
if (echo >/dev/tcp/127.0.0.1/27017) 2>/dev/null; then
  echo -e "${GREEN}✓ MongoDB ya está corriendo${NC}"
else
  echo -e "${CYAN}▶ Iniciando MongoDB...${NC}"
  if [[ "$OSTYPE" == "darwin"* ]]; then
    brew services start mongodb-community 2>/dev/null || true
  else
    sudo systemctl start mongod 2>/dev/null || true
  fi
  for i in {1..15}; do (echo >/dev/tcp/127.0.0.1/27017) 2>/dev/null && break; sleep 1; done
fi

# ── Backend (:3001) ──────────────────────────────────────────────────────────
if curl -fsS -m 3 "$API_HEALTH" >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Backend ya está corriendo (se reutiliza)${NC}"
else
  echo -e "${CYAN}▶ Iniciando backend...${NC}"
  (cd server && npm start >/tmp/vaquita-e2e-server.log 2>&1) &
  STARTED_PIDS+=($!); STARTED_PORTS+=(3001)
  wait_http "$API_HEALTH" "Backend" 60 || { echo "  log: /tmp/vaquita-e2e-server.log"; exit 1; }
fi

# ── Frontend (:5173) ─────────────────────────────────────────────────────────
if curl -fsS -m 3 "$FRONT_URL" >/dev/null 2>&1; then
  echo -e "${GREEN}✓ Frontend ya está corriendo (se reutiliza)${NC}"
else
  echo -e "${CYAN}▶ Iniciando frontend...${NC}"
  (cd client && npm run dev >/tmp/vaquita-e2e-client.log 2>&1) &
  STARTED_PIDS+=($!); STARTED_PORTS+=(5173)
  wait_http "$FRONT_URL" "Frontend" 60 || { echo "  log: /tmp/vaquita-e2e-client.log"; exit 1; }
fi

# ── Dependencias E2E + seed + tests ──────────────────────────────────────────
if [ ! -d e2e/node_modules ]; then
  echo -e "${CYAN}▶ Instalando dependencias de e2e/...${NC}"
  (cd e2e && npm install)
fi

echo -e "${CYAN}▶ Seed del usuario E2E...${NC}"
(cd e2e && node seed.js)

echo -e "${CYAN}▶ Corriendo tests E2E...${NC}"
(cd e2e && npm test)
