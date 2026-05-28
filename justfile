# Show available recipes
default:
    @just --list

# Install dependencies
install:
    npm ci

# Start local dev server
dev:
    npm run dev

# Production build
build:
    npm run build

# Preview production build locally
preview:
    npm run preview

# Run ESLint
lint:
    npm run lint

# Format code with Prettier
format:
    npm run format

# Check code formatting
format-check:
    npm run format:check

# Validate EIP metadata
validate-eips:
    npm run validate-eips

# Sync call assets (transcripts, chat logs)
sync-calls:
    npm run sync-calls

# Remove build artifacts
clean:
    rm -rf dist node_modules/.vite

# Start dev server via Docker (no node/npm required)
docker-dev:
    docker compose up --build dev

# Show available recipes
help:
    @just --list
