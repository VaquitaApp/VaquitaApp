.PHONY: setup dev test coverage docker docker-down docker-clean

setup:
	./scripts/setup.sh

dev:
	./scripts/dev.sh

test:
	cd server && npm test

coverage:
	cd server && npm run test:coverage

docker:
	docker-compose up

docker-down:
	docker-compose down

docker-clean:
	docker-compose down -v
