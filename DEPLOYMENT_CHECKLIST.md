# Deployment Checklist

## Pre-Deployment Checks ✓

### System Requirements
- [x] Docker Engine 20.10+ installed
- [x] Docker Compose 2.0+ installed
- [x] Node.js 18+ installed (for local dev)
- [x] npm installed
- [x] Make installed (for Makefile commands)

### Git Repository
- [x] All changes committed to Git
- [x] `.gitignore` properly configured
- [x] Documentation complete
- [x] Dark theme implemented
- [x] Docker infrastructure created

### Configuration Files
- [x] `Dockerfile` for backend created
- [x] `Dockerfile` for frontend created
- [x] `docker-compose.yml` configured
- [x] Nginx load balancer configured
- [x] `.env.docker.example` template created
- [x] Health checks implemented

### Documentation
- [x] `README.md` updated
- [x] `DOCKER_DEPLOYMENT.md` created
- [x] `DEPLOYMENT_SUMMARY.md` created
- [x] `CHANGELOG.md` created
- [x] Makefile help documented

## Deployment Steps

### 1. Environment Setup
```bash
# Copy environment template
cp .env.docker.example .env.docker

# Edit with your actual API keys
nano .env.docker  # or vim, code, etc.
```

Required environment variables:
- `JWT_SECRET` - Strong random string for JWT tokens
- `OPENAI_API_KEY` - OpenAI API key for GPT-4
- `VAPI_API_KEY` - Vapi.ai API key for voice calls
- `VAPI_PHONE_NUMBER` - Your Vapi.ai phone number
- `VAPI_ASSISTANT_ID` - Your Vapi.ai assistant ID (optional)
- `TWILIO_ACCOUNT_SID` - Twilio account SID
- `TWILIO_AUTH_TOKEN` - Twilio auth token
- `TWILIO_WHATSAPP_NUMBER` - Twilio WhatsApp number

### 2. Build Docker Images
```bash
make build
```

Expected output:
- ✓ Backend image built successfully
- ✓ Frontend image built successfully
- ✓ No build errors

### 3. Start Services
```bash
make up-build
```

Wait for all services to start (30-60 seconds).

### 4. Verify Deployment
```bash
# Check health of all services
make health

# Expected output:
# Frontend: ✓ Healthy
# Load Balancer: ✓ Healthy
# Backend (via LB): ✓ Healthy

# View container status
make ps
```

All containers should show "Up" status with "(healthy)" indicator.

### 5. Test Load Balancing
```bash
# Make 10 requests and observe round-robin
for i in {1..10}; do
  curl -I http://localhost:8080/api/health 2>&1 | grep "X-Upstream-Server"
done
```

You should see requests alternating between `backend1:3001` and `backend2:3001`.

### 6. Access Application
- **Frontend**: http://localhost:3000
- **API**: http://localhost:8080/api
- **Load Balancer Health**: http://localhost:8080/lb-health

Login with demo credentials:
- Username: `demo`
- Password: `password`

### 7. Seed Database (Optional)
```bash
# Seed sample data
make seed

# Or seed 100 prospects for testing
make seed-100
```

## Post-Deployment Verification

### Functional Tests
- [ ] Frontend loads successfully
- [ ] Login works with demo credentials
- [ ] Dashboard displays metrics
- [ ] Dark theme applied correctly
- [ ] Prospects page loads
- [ ] Can add new prospect
- [ ] Can run research on prospect
- [ ] Can start voice call
- [ ] Can start WhatsApp campaign
- [ ] Meetings page displays data

### Technical Tests
- [ ] Both backend instances are healthy
- [ ] Load balancer distributes requests
- [ ] Health checks passing
- [ ] Logs are accessible via `make logs`
- [ ] Containers restart on failure

### Performance Tests
- [ ] Frontend loads in < 2 seconds
- [ ] API responses in < 500ms
- [ ] Database queries performant
- [ ] No memory leaks visible

## Monitoring

### View Logs
```bash
# All services
make logs

# Specific services
make logs-backend
make logs-frontend
make logs-lb

# Specific backend instance
make logs-backend1
make logs-backend2
```

### Check Resource Usage
```bash
# Show CPU/Memory usage
make stats

# Container status
make ps

# Continuous health monitoring
make health-watch
```

### Health Endpoints
- Frontend: http://localhost:3000/health
- Load Balancer: http://localhost:8080/lb-health
- Backend: http://localhost:8080/api/health

## Troubleshooting

### Backend Not Starting
```bash
# Check logs
make logs-backend

# Common issues:
# - Missing environment variables
# - Port conflicts
# - Database initialization errors

# Restart backends
make restart-backend
```

### Frontend Not Loading
```bash
# Check logs
make logs-frontend

# Common issues:
# - Build errors
# - Nginx configuration
# - API connection issues

# Restart frontend
make restart-frontend
```

### Load Balancer Issues
```bash
# Check load balancer logs
make logs-lb

# Test nginx configuration
docker-compose exec load_balancer nginx -t

# Common issues:
# - Backend instances not healthy
# - Port conflicts
# - Configuration errors
```

### Database Issues
```bash
# Reset database (WARNING: deletes all data)
make down-volumes
make up-build
make seed
```

## Scaling

### Add More Backend Instances

1. **Edit `docker-compose.yml`**:
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
  healthcheck:
    # Same as backend1/backend2

volumes:
  backend1_data:
  backend2_data:
  backend3_data:  # Add new volume
```

2. **Update `nginx/nginx.conf`**:
```nginx
upstream backend_servers {
    server backend1:3001 max_fails=3 fail_timeout=30s;
    server backend2:3001 max_fails=3 fail_timeout=30s;
    server backend3:3001 max_fails=3 fail_timeout=30s;  # Add new server
}
```

3. **Rebuild and restart**:
```bash
make down
make up-build
make health
```

## Production Recommendations

### Security
- [ ] Use strong JWT secret (32+ random characters)
- [ ] Enable HTTPS (add Traefik or Caddy)
- [ ] Configure firewall rules
- [ ] Use secrets management (Docker secrets, Vault)
- [ ] Regular security updates

### Performance
- [ ] Add Redis for caching
- [ ] Use PostgreSQL instead of SQLite
- [ ] Configure CDN for frontend
- [ ] Enable Gzip compression
- [ ] Optimize Docker images

### Monitoring
- [ ] Set up Prometheus + Grafana
- [ ] Configure log aggregation (ELK stack)
- [ ] Set up alerting (PagerDuty, Slack)
- [ ] Monitor resource usage
- [ ] Track error rates

### Backup
- [ ] Automated database backups
- [ ] Configuration backups
- [ ] Disaster recovery plan
- [ ] Backup testing

### CI/CD
- [ ] GitHub Actions workflow
- [ ] Automated testing
- [ ] Automated deployments
- [ ] Rolling updates

## Cleanup

### Stop Services
```bash
# Stop all containers
make down

# Stop and remove volumes (deletes data)
make down-volumes
```

### Remove Images
```bash
# Remove all Docker resources
make clean-docker
```

## Support

For issues:
1. Check logs: `make logs`
2. Verify health: `make health`
3. Review [DOCKER_DEPLOYMENT.md](DOCKER_DEPLOYMENT.md)
4. Check [DEPLOYMENT_SUMMARY.md](DEPLOYMENT_SUMMARY.md)
5. Run `make help` for all commands

## Success Criteria

Deployment is successful when:
- ✓ All containers are running and healthy
- ✓ Frontend accessible at http://localhost:3000
- ✓ API accessible at http://localhost:8080/api
- ✓ Load balancer distributes requests
- ✓ Health checks passing
- ✓ Demo login works
- ✓ Dark theme displayed correctly
- ✓ All features functional

## Next Steps

After successful deployment:
1. Test all features thoroughly
2. Monitor logs for errors
3. Review performance metrics
4. Plan for production deployment
5. Set up monitoring and alerting
6. Configure automated backups
7. Document any custom configurations
8. Train team on Makefile commands

---

**Deployment Date**: ____________

**Deployed By**: ____________

**Environment**: [ ] Development  [ ] Staging  [ ] Production

**Status**: [ ] Successful  [ ] Failed  [ ] Partial

**Notes**: ____________________________________________
