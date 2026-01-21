.PHONY: all server frontend storybook install build clean

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
	cd server && go run ./cmd/townview

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

# Development: run both server and frontend
dev:
	@echo "Starting development servers..."
	@echo "Run 'make server' in one terminal"
	@echo "Run 'make frontend' in another terminal"
	@echo "Or run 'make storybook' to develop components"

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
