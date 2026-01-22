.PHONY: all server frontend storybook install build clean dev help

# Town root - override with: make dev TOWN_ROOT=/path/to/gt
# From crew/jeremy/ we need to go up 3 levels: jeremy → crew → townview → gt
TOWN_ROOT ?= $(shell cd ../../.. && pwd)

# Default target
all: install

# Install dependencies
install:
	@echo "Installing Go dependencies..."
	cd server && go mod download
	@echo "Installing frontend dependencies..."
	cd frontend && npm install

# Run the Go backend server
server:
	@echo "Starting Town View server on http://localhost:8080..."
	@echo "TOWN_ROOT=$(TOWN_ROOT)"
	cd server && TOWN_ROOT="$(TOWN_ROOT)" go run ./cmd/townview

# Run the frontend dev server
frontend:
	@echo "Starting frontend dev server on http://localhost:3000..."
	cd frontend && npm run dev

# Run Storybook
storybook:
	@echo "Starting Storybook on http://localhost:6006..."
	cd frontend && npm run storybook

# Build everything
build:
	@echo "Building Go server..."
	cd server && go build -o ../bin/townview ./cmd/townview
	@echo "Building frontend..."
	cd frontend && npm run build
	@echo "Copying frontend build to server static..."
	mkdir -p server/static
	cp -r frontend/dist/* server/static/

# Clean build artifacts
clean:
	rm -rf bin/
	rm -rf frontend/dist/
	rm -rf frontend/node_modules/
	rm -rf server/static/

# Development: run both server and frontend (Ctrl+C to stop both)
dev:
	@echo "Starting Town View development environment..."
	@echo "TOWN_ROOT=$(TOWN_ROOT)"
	@echo "Backend: http://localhost:8080"
	@echo "Frontend: http://localhost:3000"
	@echo "Press Ctrl+C to stop both servers"
	@trap 'kill 0' EXIT; \
		(cd server && TOWN_ROOT="$(TOWN_ROOT)" go run ./cmd/townview) & \
		(cd frontend && npm run dev)

# Help
help:
	@echo "Town View - Gas Town Visualization"
	@echo ""
	@echo "Commands:"
	@echo "  make install    - Install all dependencies"
	@echo "  make server     - Run Go backend (port 8080)"
	@echo "  make frontend   - Run React frontend (port 3000)"
	@echo "  make storybook  - Run Storybook (port 6006)"
	@echo "  make build      - Build for production"
	@echo "  make clean      - Clean build artifacts"
	@echo ""
	@echo "Development workflow:"
	@echo "  1. make install"
	@echo "  2. Terminal 1: make server"
	@echo "  3. Terminal 2: make frontend"
	@echo "  4. Open http://localhost:3000"
