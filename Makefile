.PHONY: help dev dev-backend dev-frontend build up down restart logs health ps clean install seed test

# Colors for output
BLUE := \033[0;34m
GREEN := \033[0;32m
YELLOW := \033[0;33m
RED := \033[0;31m
NC := \033[0m # No Color

# Default target
.DEFAULT_GOAL := help

help: ## Show this help message
	@echo "$(BLUE)Alta AI Sales Platform - Available Commands$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(GREEN)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

# Development Commands
dev: ## Start development servers (backend + frontend)
	@echo "$(BLUE)Starting development servers...$(NC)"
	@make -j2 dev-backend dev-frontend

dev-backend: ## Start backend development server
	@echo "$(BLUE)Starting backend development server...$(NC)"
	@cd backend && npm run dev

dev-frontend: ## Start frontend development server
	@echo "$(BLUE)Starting frontend development server...$(NC)"
	@cd frontend && npm run dev

# Docker Commands
build: ## Build all Docker images
	@echo "$(BLUE)Building Docker images...$(NC)"
	@docker-compose build

up: ## Start all containers in detached mode
	@echo "$(BLUE)Starting containers...$(NC)"
	@docker-compose --env-file .env.docker up -d
	@echo "$(GREEN)Containers started successfully!$(NC)"
	@echo "Frontend: http://localhost:3000"
	@echo "API Load Balancer: http://localhost:8080"
	@make health

up-build: ## Build and start all containers
	@echo "$(BLUE)Building and starting containers...$(NC)"
	@docker-compose --env-file .env.docker up -d --build
	@echo "$(GREEN)Containers started successfully!$(NC)"
	@make health

down: ## Stop and remove all containers
	@echo "$(YELLOW)Stopping containers...$(NC)"
	@docker-compose down
	@echo "$(GREEN)Containers stopped$(NC)"

down-volumes: ## Stop containers and remove volumes
	@echo "$(RED)Stopping containers and removing volumes...$(NC)"
	@docker-compose down -v
	@echo "$(GREEN)Containers and volumes removed$(NC)"

restart: ## Restart all containers
	@echo "$(YELLOW)Restarting containers...$(NC)"
	@docker-compose restart
	@echo "$(GREEN)Containers restarted$(NC)"

restart-backend: ## Restart only backend containers
	@echo "$(YELLOW)Restarting backend containers...$(NC)"
	@docker-compose restart backend1 backend2
	@echo "$(GREEN)Backend containers restarted$(NC)"

restart-frontend: ## Restart only frontend container
	@echo "$(YELLOW)Restarting frontend container...$(NC)"
	@docker-compose restart frontend
	@echo "$(GREEN)Frontend container restarted$(NC)"

# Logs Commands
logs: ## View logs from all containers
	@docker-compose logs -f

logs-backend: ## View logs from backend containers
	@docker-compose logs -f backend1 backend2

logs-backend1: ## View logs from backend1 container
	@docker-compose logs -f backend1

logs-backend2: ## View logs from backend2 container
	@docker-compose logs -f backend2

logs-frontend: ## View logs from frontend container
	@docker-compose logs -f frontend

logs-lb: ## View logs from load balancer
	@docker-compose logs -f load_balancer

# Health Check Commands
health: ## Check health of all services
	@echo "$(BLUE)Checking service health...$(NC)"
	@echo ""
	@echo "$(YELLOW)Frontend:$(NC)"
	@curl -sf http://localhost:3000/health && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Load Balancer:$(NC)"
	@curl -sf http://localhost:8080/lb-health && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Backend (via LB):$(NC)"
	@curl -sf http://localhost:8080/api/health && echo "$(GREEN)✓ Healthy$(NC)" || echo "$(RED)✗ Unhealthy$(NC)"
	@echo ""
	@echo "$(YELLOW)Docker Container Status:$(NC)"
	@docker-compose ps

health-watch: ## Continuously watch health status (5s interval)
	@watch -n 5 make health

# Container Management
ps: ## Show container status
	@docker-compose ps

stats: ## Show container resource usage
	@docker stats $$(docker-compose ps -q)

exec-backend1: ## Open shell in backend1 container
	@docker-compose exec backend1 /bin/sh

exec-backend2: ## Open shell in backend2 container
	@docker-compose exec backend2 /bin/sh

exec-frontend: ## Open shell in frontend container
	@docker-compose exec frontend /bin/sh

exec-lb: ## Open shell in load balancer container
	@docker-compose exec load_balancer /bin/sh

# Installation Commands
install: ## Install dependencies for both backend and frontend
	@echo "$(BLUE)Installing backend dependencies...$(NC)"
	@cd backend && npm install
	@echo "$(BLUE)Installing frontend dependencies...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)Dependencies installed successfully!$(NC)"

install-backend: ## Install backend dependencies
	@cd backend && npm install

install-frontend: ## Install frontend dependencies
	@cd frontend && npm install

# Database Commands
seed: ## Seed database with sample data
	@echo "$(BLUE)Seeding database...$(NC)"
	@cd backend && npm run seed
	@echo "$(GREEN)Database seeded successfully!$(NC)"

seed-100: ## Seed database with 100 prospects
	@echo "$(BLUE)Seeding database with 100 prospects...$(NC)"
	@cd backend && npm run seed-100
	@echo "$(GREEN)Database seeded with 100 prospects!$(NC)"

# Build Commands (Local)
build-backend: ## Build backend TypeScript
	@echo "$(BLUE)Building backend...$(NC)"
	@cd backend && npm run build
	@echo "$(GREEN)Backend built successfully!$(NC)"

build-frontend: ## Build frontend for production
	@echo "$(BLUE)Building frontend...$(NC)"
	@cd frontend && npm run build
	@echo "$(GREEN)Frontend built successfully!$(NC)"

# Testing Commands
test: ## Run tests
	@echo "$(BLUE)Running tests...$(NC)"
	@cd backend && npm test || true

test-calls: ## Test call functionality
	@echo "$(BLUE)Testing call functionality...$(NC)"
	@cd backend && npm run test-calls

test-vapi: ## Test Vapi integration
	@echo "$(BLUE)Testing Vapi integration...$(NC)"
	@cd backend && npm run test-vapi

# Clean Commands
clean: ## Clean build artifacts and node_modules
	@echo "$(RED)Cleaning build artifacts...$(NC)"
	@rm -rf backend/dist
	@rm -rf frontend/dist
	@rm -rf backend/node_modules
	@rm -rf frontend/node_modules
	@echo "$(GREEN)Clean complete!$(NC)"

clean-docker: ## Remove all Docker images and containers
	@echo "$(RED)Removing Docker containers and images...$(NC)"
	@docker-compose down -v --rmi all
	@echo "$(GREEN)Docker cleanup complete!$(NC)"

# Setup Commands
setup: install ## Initial setup (install dependencies + create env files)
	@echo "$(BLUE)Creating environment files...$(NC)"
	@test -f backend/.env || cp backend/.env.example backend/.env
	@test -f frontend/.env || cp frontend/.env.example frontend/.env
	@test -f .env.docker || cp .env.docker.example .env.docker
	@echo "$(GREEN)Setup complete!$(NC)"
	@echo "$(YELLOW)Please update the .env files with your API keys$(NC)"

setup-docker: ## Setup for Docker deployment
	@test -f .env.docker || cp .env.docker.example .env.docker
	@echo "$(YELLOW)Please update .env.docker with your API keys before running 'make up'$(NC)"

# Production Commands
prod-build: ## Build for production
	@make build-backend
	@make build-frontend
	@echo "$(GREEN)Production build complete!$(NC)"

prod-up: ## Start production containers
	@echo "$(BLUE)Starting production environment...$(NC)"
	@docker-compose --env-file .env.docker up -d
	@echo "$(GREEN)Production environment started!$(NC)"

# Utility Commands
validate-env: ## Validate environment variables
	@echo "$(BLUE)Validating environment variables...$(NC)"
	@test -f .env.docker && echo "$(GREEN)✓ .env.docker exists$(NC)" || echo "$(RED)✗ .env.docker missing$(NC)"
	@test -f backend/.env && echo "$(GREEN)✓ backend/.env exists$(NC)" || echo "$(RED)✗ backend/.env missing$(NC)"
	@test -f frontend/.env && echo "$(GREEN)✓ frontend/.env exists$(NC)" || echo "$(RED)✗ frontend/.env missing$(NC)"

ports: ## Show which ports are in use
	@echo "$(BLUE)Port usage:$(NC)"
	@echo "  Frontend:       http://localhost:3000"
	@echo "  Load Balancer:  http://localhost:8080"
	@echo "  Backend API:    http://localhost:8080/api"

info: ## Show system information
	@echo "$(BLUE)System Information:$(NC)"
	@echo "  Docker Version: $$(docker --version)"
	@echo "  Docker Compose: $$(docker-compose --version)"
	@echo "  Node Version:   $$(node --version)"
	@echo "  NPM Version:    $$(npm --version)"
