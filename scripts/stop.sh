#!/usr/bin/env bash
# VaquitaApp — detiene lo que se haya levantado en local, sea Docker o nativo, y
# libera los puertos para poder arrancar otra cosa sin choques.
set -uo pipefail

GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$ROOT_DIR"

# Comando de compose disponible: v2 o v1.
if docker compose version >/dev/null 2>&1; then DC="docker compose"; else DC="docker-compose"; fi

# 1. Stack de Docker, si el daemon está corriendo.
if docker info >/dev/null 2>&1; then
  echo -e "${CYAN}Bajando el stack de Docker si está arriba...${NC}"
  $DC down >/dev/null 2>&1 || true
fi

# 2. Procesos nativos por puerto: backend 3001 y frontend 5173.
for port in 3001 5173; do
  pids="$(lsof -ti "tcp:$port" 2>/dev/null || true)"
  if [ -n "$pids" ]; then
    echo -e "${CYAN}Deteniendo lo que escucha en :$port...${NC}"
    echo "$pids" | xargs kill 2>/dev/null || true
  fi
done

# 3. Mailpit nativo.
pkill -f mailpit 2>/dev/null && echo -e "${CYAN}Mailpit detenido.${NC}" || true

# 4. MongoDB local; libera el 27017. make dev y make e2e lo reinician al arrancar.
echo -e "${CYAN}Deteniendo MongoDB local...${NC}"
if [[ "$OSTYPE" == "darwin"* ]]; then
  brew services stop mongodb-community >/dev/null 2>&1 || true
else
  sudo systemctl stop mongod 2>/dev/null || true
fi

sleep 1
echo -e "${GREEN}Listo. Puertos 3001 / 5173 / 27017 y Mailpit liberados.${NC}"
