# Changelog

All notable changes to this project will be documented in this file.

## [1.1.0] - 2025-11-05

### Added
- **Dark Theme UI**: Complete redesign with professional dark theme inspired by Claude
  - Dark background colors (#0f0f0f, #1a1a1a, #242424)
  - Optimized text contrast for readability
  - Smooth transitions and hover effects
  - Updated all pages: Dashboard, Prospects, Meetings, Call Simulator, Login

- **Docker Deployment**: Production-ready containerized architecture
  - 2 backend API instances for redundancy and load distribution
  - Nginx load balancer with round-robin algorithm
  - Separate data volumes for each backend instance
  - Health checks for all services
  - Auto-restart capabilities

- **Scalability Features**:
  - Horizontal scaling support for backend instances
  - Load balancing with automatic failover
  - Rate limiting (10 req/s per IP)
  - Connection keep-alive to backends
  - Request routing headers (X-Upstream-Server)

- **Makefile**: Comprehensive command-line interface
  - Development commands (dev, install, seed)
  - Docker operations (up, down, build, restart)
  - Logging commands (logs, logs-backend, logs-frontend, logs-lb)
  - Health monitoring (health, health-watch, stats)
  - Container management (exec, ps)
  - Cleanup commands (clean, clean-docker)

- **Documentation**:
  - DOCKER_DEPLOYMENT.md - Complete Docker deployment guide
  - Updated README.md with deployment options
  - Environment variable templates (.env.docker.example)
  - Makefile help system

### Changed
- Updated all frontend pages to use dark theme colors
- Modified Layout component with dark navigation
- Enhanced button and form styling for dark backgrounds
- Updated Tailwind config with custom dark color palette

### Infrastructure
- Dockerfile for backend (multi-stage build)
- Dockerfile for frontend (Nginx-based)
- docker-compose.yml with 2 backend instances
- Nginx load balancer configuration
- Health check endpoints
- .dockerignore files for optimized builds

## [1.0.0] - Initial Release

### Added
- Multi-channel AI automation (Voice + WhatsApp)
- Smart prospect research with AI-driven scoring
- Automated meeting scheduling
- Real-time voice calls via Vapi.ai
- WhatsApp campaigns via Twilio
- Dashboard with analytics
- Prospect management with custom instructions
- Meeting tracking
- JWT authentication
- SQLite database
- React + TypeScript frontend
- Express + TypeScript backend
