PYTHON ?= $(shell if [ -x "$(CURDIR)/.venv/bin/python" ]; then echo "$(CURDIR)/.venv/bin/python"; else echo python3; fi)

.PHONY: up down seed test test-unit test-e2e lint validate build clean desktop desktop-dev

up:
	docker compose -f docker-compose.dev.yml up --build -d
	@echo "Waiting for app to be healthy..."
	@until curl -sf http://localhost:8030/health > /dev/null 2>&1; do sleep 1; done
	@echo "App is ready at http://localhost:8030"

down:
	docker compose -f docker-compose.dev.yml down -v

seed:
	docker compose -f docker-compose.dev.yml run --rm seed

test: test-unit test-e2e

test-unit:
	cd app && $(PYTHON) -m pytest tests/test_*.py -v

test-e2e:
	cd app && $(PYTHON) -m pytest tests/e2e/ -v

lint:
	cd app && $(PYTHON) -m ruff check . || true
	cd app/frontend && npm run lint || true

build:
	docker compose -f docker-compose.dev.yml build

validate:
	./scripts/validate.sh

clean:
	docker compose -f docker-compose.dev.yml down -v --rmi local
	rm -rf app/frontend/node_modules app/frontend/dist

dev-backend:
	DATABASE_URL=postgresql://postgres:postgres@localhost:5432/cloneapp \
	  uvicorn app.server:app --port 8030 --reload

dev-frontend:
	cd app/frontend && npm run dev

desktop-dev:
	cd app/frontend && npm run electron:dev

desktop:
	cd app/frontend && ELECTRON=true npm run electron:build
