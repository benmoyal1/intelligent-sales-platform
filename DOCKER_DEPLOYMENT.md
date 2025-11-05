# Docker Deployment Guide

This guide explains how to deploy the AI-Powered Outbound Sales Platform using Docker with scalability features.

## Architecture

The Docker deployment includes:
- **2 Backend API instances** (backend1, backend2) for redundancy and load distribution
- **Nginx Load Balancer** for round-robin load balancing across backend instances
- **Frontend** served via Nginx
- **Separate data volumes** for each backend instance
- **Health checks** for all services
- **Auto-restart** capabilities

## Prerequisites

- Docker Engine 20.10+
- Docker Compose 2.0+
- Make (optional, but recommended)

## Quick Start

### 1. Setup Environment Variables

```bash
# Copy the example environment file
cp .env.docker.example .env.docker

# Edit with your API keys
nano .env.docker
```

Required environment variables:
```env
JWT_SECRET=your-secure-jwt-secret
OPENAI_API_KEY=your-openai-api-key
VAPI_API_KEY=your-vapi-api-key
VAPI_PHONE_NUMBER=your-vapi-phone-number
VAPI_ASSISTANT_ID=your-vapi-assistant-id
TWILIO_ACCOUNT_SID=your-twilio-account-sid
TWILIO_AUTH_TOKEN=your-twilio-auth-token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
```

### 2. Build and Start Services

Using Make (recommended):
```bash
# View all available commands
make help

# Build and start all containers
make up-build

# Check health status
make health
```

Using Docker Compose directly:
```bash
# Build images
docker-compose build

# Start containers
docker-compose --env-file .env.docker up -d

# Check status
docker-compose ps
```

### 3. Access the Application

- **Frontend**: http://localhost:3000
- **API (Load Balanced)**: http://localhost:8080/api
- **Load Balancer Health**: http://localhost:8080/lb-health
- **Backend Health**: http://localhost:8080/api/health

## Makefile Commands

The Makefile provides convenient commands for managing the deployment:

### Development
```bash
make dev              # Start development servers (local)
make dev-backend      # Start backend dev server only
make dev-frontend     # Start frontend dev server only
```

### Docker Operations
```bash
make build            # Build Docker images
make up               # Start containers
make up-build         # Build and start containers
make down             # Stop containers
make down-volumes     # Stop and remove volumes
make restart          # Restart all containers
make restart-backend  # Restart backend containers only
make restart-frontend # Restart frontend only
```

### Logs
```bash
make logs             # View all logs
make logs-backend     # View backend logs
make logs-backend1    # View backend1 logs
make logs-backend2    # View backend2 logs
make logs-frontend    # View frontend logs
make logs-lb          # View load balancer logs
```

### Health Checks
```bash
make health           # Check health of all services
make health-watch     # Continuously watch health (5s interval)
make ps               # Show container status
make stats            # Show resource usage
```

### Container Access
```bash
make exec-backend1    # Open shell in backend1
make exec-backend2    # Open shell in backend2
make exec-frontend    # Open shell in frontend
make exec-lb          # Open shell in load balancer
```

### Database
```bash
make seed             # Seed database with sample data
make seed-100         # Seed 100 prospects
```

### Cleanup
```bash
make clean            # Remove build artifacts
make clean-docker     # Remove all Docker resources
```

## Load Balancing

The Nginx load balancer uses **round-robin** algorithm to distribute requests across two backend instances:

### Features:
- **Automatic failover**: If one backend fails, traffic routes to healthy instance
- **Health monitoring**: Unhealthy backends are automatically removed from rotation
- **Connection keep-alive**: Maintains persistent connections to backends
- **Rate limiting**: 10 requests/second per IP with burst capacity
- **Request headers**: Adds `X-Upstream-Server` header showing which backend served the request

### Testing Load Balancing:
```bash
# Make multiple requests and check which backend responds
for i in {1..10}; do
  curl -I http://localhost:8080/api/health 2>&1 | grep "X-Upstream-Server"
done
```

You should see responses alternating between backend1:3001 and backend2:3001.

## Scaling

### Adding More Backend Instances

1. Edit `docker-compose.yml` to add backend3:
```yaml
backend3:
  build:
    context: ./backend
    dockerfile: Dockerfile
  container_name: alta-backend-3
  environment:
    # Same as backend1/backend2
  volumes:
    - backend3_data:/app/data
  networks:
    - alta_network
  restart: unless-stopped
```

2. Update `nginx/nginx.conf`:
```nginx
upstream backend_servers {
    server backend1:3001 max_fails=3 fail_timeout=30s;
    server backend2:3001 max_fails=3 fail_timeout=30s;
    server backend3:3001 max_fails=3 fail_timeout=30s;
}
```

3. Add volume in docker-compose.yml:
```yaml
volumes:
  backend1_data:
  backend2_data:
  backend3_data:
```

4. Rebuild and restart:
```bash
make down
make up-build
```

## Monitoring

### View Real-Time Logs
```bash
# All services
make logs

# Specific service
docker-compose logs -f backend1
```

### Check Resource Usage
```bash
make stats
```

### Health Checks
All services have automated health checks that run every 30 seconds:
- **Backend**: GET /health endpoint
- **Frontend**: HTTP request to /health
- **Load Balancer**: GET /lb-health endpoint

View health status:
```bash
docker-compose ps
```

Healthy services show "healthy" in the STATUS column.

## Troubleshooting

### Container Won't Start
```bash
# Check logs
make logs

# Check specific container
docker-compose logs backend1

# Inspect container
docker inspect alta-backend-1
```

### Backend Not Responding
```bash
# Check health
make health

# Restart backends
make restart-backend

# Check individual backend
docker-compose exec backend1 wget -O- http://localhost:3001/health
```

### Load Balancer Issues
```bash
# Check nginx config
docker-compose exec load_balancer cat /etc/nginx/nginx.conf

# Test nginx config
docker-compose exec load_balancer nginx -t

# View nginx logs
make logs-lb
```

### Database Issues
Each backend has its own SQLite database in a Docker volume. To reset:
```bash
# Stop containers
make down

# Remove volumes (WARNING: deletes all data)
make down-volumes

# Start fresh
make up-build
make seed
```

## Production Considerations

### Security
1. **Use secrets management**: Don't commit .env.docker to Git
2. **Enable HTTPS**: Use a reverse proxy (Traefik, Caddy) in front of Nginx
3. **Rate limiting**: Already configured in Nginx (10 req/s per IP)
4. **Network isolation**: Services communicate via Docker bridge network

### Performance
1. **Adjust worker connections**: Edit `nginx/nginx.conf` → `worker_connections`
2. **Scale backends**: Add more backend instances as needed
3. **Database**: Consider using PostgreSQL instead of SQLite for production
4. **Caching**: Add Redis for session management and caching

### Monitoring
Consider adding:
- **Prometheus + Grafana**: For metrics and dashboards
- **ELK Stack**: For log aggregation
- **Health check endpoints**: Already implemented (/health, /lb-health)

## Backup and Recovery

### Backup Databases
```bash
# Backup backend1 database
docker cp alta-backend-1:/app/data/alta.db ./backup-backend1-$(date +%Y%m%d).db

# Backup backend2 database
docker cp alta-backend-2:/app/data/alta.db ./backup-backend2-$(date +%Y%m%d).db
```

### Restore Database
```bash
# Restore to backend1
docker cp ./backup.db alta-backend-1:/app/data/alta.db
docker-compose restart backend1
```

## Environment Variables Reference

| Variable | Description | Required |
|----------|-------------|----------|
| JWT_SECRET | Secret key for JWT tokens | Yes |
| OPENAI_API_KEY | OpenAI API key for GPT-4 | Yes |
| VAPI_API_KEY | Vapi.ai API key for voice calls | Yes |
| VAPI_PHONE_NUMBER | Vapi.ai phone number | Yes |
| VAPI_ASSISTANT_ID | Vapi.ai assistant ID | No |
| TWILIO_ACCOUNT_SID | Twilio account SID | Yes |
| TWILIO_AUTH_TOKEN | Twilio auth token | Yes |
| TWILIO_WHATSAPP_NUMBER | Twilio WhatsApp number | Yes |

## Support

For issues or questions:
1. Check logs: `make logs`
2. Verify health: `make health`
3. Review this documentation
4. Check GitHub issues
