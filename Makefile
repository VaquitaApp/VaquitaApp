.PHONY: setup dev test coverage docker docker-down docker-clean e2e-install e2e-seed e2e stop

setup:
	./scripts/setup.sh

dev:
	./scripts/dev.sh

test:
	cd server && npm test

coverage:
	cd server && npm run test:coverage

# ── E2E con Puppeteer ──────────────────────────────────────────
# Levanta el stack (Mongo + backend + frontend), seedea y corre los tests.
# Reutiliza servicios ya corriendo (make dev / make docker) y limpia al terminar.
e2e:
	./scripts/e2e.sh

# Helpers manuales (pasos sueltos, con el stack ya arriba):
e2e-install:
	cd e2e && npm install

e2e-seed:
	cd e2e && node seed.js

# ── Docker ────────────────────────────────────────────────────
docker:
	docker-compose up

docker-down:
	docker-compose down

docker-clean:
	docker-compose down -v

# ── Detener todo lo local, Docker o nativo, y liberar puertos ──
stop:
	./scripts/stop.sh
