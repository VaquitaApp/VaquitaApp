#!/usr/bin/env bash
# VaquitaApp — inicia todos los servicios en una sola terminal
set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# ── Verificar setup previo ────────────────────────────────────────────────────
if [ ! -f server/.env ]; then
  echo -e "${RED}✗ server/.env no existe. Ejecuta primero:  make setup${NC}"
  exit 1
fi

if [ ! -d server/node_modules ] || [ ! -d client/node_modules ]; then
  echo -e "${RED}✗ Dependencias no instaladas. Ejecuta primero:  make setup${NC}"
  exit 1
fi

# ── Cleanup al salir (Ctrl+C o error) ────────────────────────────────────────
PIDS=()
cleanup() {
  echo ""
  echo -e "${YELLOW}Deteniendo servicios...${NC}"
  for pid in "${PIDS[@]}"; do
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo -e "${GREEN}Servicios detenidos.${NC}"
}
trap cleanup EXIT INT TERM

# ── MongoDB ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}▶ Iniciando MongoDB...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
  brew services start mongodb-community 2>/dev/null || true
else
  sudo systemctl start mongod 2>/dev/null || true
fi

# ── Mailpit ───────────────────────────────────────────────────────────────────
if command -v mailpit &>/dev/null; then
  echo -e "${CYAN}▶ Iniciando Mailpit...${NC}"
  mailpit >/dev/null 2>&1 &
  PIDS+=($!)
  echo -e "${GREEN}✓ Mailpit → http://localhost:8025${NC}"
else
  echo -e "${YELLOW}⚠ Mailpit no instalado — emails no funcionarán (brew install mailpit)${NC}"
fi

# ── Backend ───────────────────────────────────────────────────────────────────
echo -e "${CYAN}▶ Iniciando backend...${NC}"
(cd server && npm run dev) &
PIDS+=($!)

# ── Frontend ─────────────────────────────────────────────────────────────────
echo -e "${CYAN}▶ Iniciando frontend...${NC}"
(cd client && npm run dev) &
PIDS+=($!)

echo ""
echo -e "${GREEN}=== VaquitaApp corriendo ===${NC}"
echo "  App:    http://localhost:5173"
echo "  API:    http://localhost:3001/api/health"
echo "  Emails: http://localhost:8025"
echo ""
echo -e "${YELLOW}Presiona Ctrl+C para detener todo${NC}"
echo ""

wait
