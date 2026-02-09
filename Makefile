.PHONY: install dev build lint format format-check preview clean validate-eips sync-calls docker-dev docker-build

install: ## Install dependencies
	npm ci

dev: ## Start local dev server
	npm run dev

build: ## Production build
	npm run build

preview: ## Preview production build locally
	npm run preview

lint: ## Run ESLint
	npm run lint

format: ## Format code with Prettier
	npm run format

format-check: ## Check code formatting
	npm run format:check

validate-eips: ## Validate EIP metadata
	npm run validate-eips

sync-calls: ## Sync call assets (transcripts, chat logs)
	npm run sync-calls

clean: ## Remove build artifacts
	rm -rf dist node_modules/.vite

docker-dev: ## Start dev server via Docker (no node/npm required)
	docker compose up --build dev

docker-build: ## Production build via Docker
	docker build --target prod -t forkcast .

help: ## Show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-20s\033[0m %s\n", $$1, $$2}'

.DEFAULT_GOAL := help
