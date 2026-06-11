.PHONY: setup dev test coverage docker docker-down docker-clean e2e-install e2e-seed e2e

setup:
	./scripts/setup.sh

dev:
	./scripts/dev.sh

test:
	cd server && npm test

coverage:
	cd server && npm run test:coverage

# ── E2E con Puppeteer ──────────────────────────────────────────
e2e-install:
	cd e2e && npm install

e2e-seed:
	cd e2e && node seed.js

e2e: e2e-install e2e-seed
	cd e2e && npm test

# ── Docker ────────────────────────────────────────────────────
docker:
	docker-compose up

docker-down:
	docker-compose down

docker-clean:
	docker-compose down -v
