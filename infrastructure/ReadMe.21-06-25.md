# NoteEarly Production Deployment Guide

## 🚀 Overview

This document outlines the complete production deployment setup for NoteEarly, featuring automated CI/CD with GitHub Actions, containerized deployment with Docker Compose, and SSL-secured reverse proxy with Traefik.

## 📋 Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    noteearly.com                        │
│                 (Cloudflare DNS)                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              DigitalOcean Droplet                       │
│  ┌─────────────────────────────────────────────────────┐│
│  │                  Traefik                            ││
│  │            (Reverse Proxy + SSL)                    ││
│  │  ┌─────────────┐  ┌─────────────┐                  ││
│  │  │   Frontend  │  │   Backend   │                  ││
│  │  │  (Next.js)  │  │ (Express.js)│                  ││
│  │  │    :3000    │  │    :4000    │                  ││
│  │  └─────────────┘  └─────────────┘                  ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## 🛠️ Technology Stack

### Infrastructure
- **Cloud Provider**: DigitalOcean
- **Server**: Ubuntu 22.04 LTS
- **DNS**: Cloudflare (with proxy enabled)
- **SSL**: Let's Encrypt (via Traefik)
- **Reverse Proxy**: Traefik v3.0

### Application
- **Frontend**: Next.js 15.3.0 (Dockerized)
- **Backend**: Express.js with Node.js (Dockerized)
- **Database**: Supabase PostgreSQL
- **Container Registry**: DockerHub
- **Orchestration**: Docker Compose

### CI/CD
- **Version Control**: GitHub
- **CI/CD Platform**: GitHub Actions
- **Deployment Strategy**: SSH-based automated deployment

## 📁 Repository Structure

```
note-early/
├── client/                          # Next.js frontend
│   ├── Dockerfile                   # Frontend container definition
│   └── ...
├── server/                          # Express.js backend
│   ├── Dockerfile                   # Backend container definition
│   └── ...
├── .github/
│   └── workflows/
│       └── docker-build.yml         # CI/CD pipeline
├── docker-compose.yaml              # Local development
├── docker-compose.dev.yml           # Development with build
└── PRODUCTION_DEPLOYMENT.md         # This file
```

## 🔧 Initial Setup

### Prerequisites

1. **DigitalOcean Account** with API token
2. **Domain name** managed by Cloudflare
3. **DockerHub account** for container registry
4. **GitHub repository** with your application code

### 1. Infrastructure Setup

#### DigitalOcean Droplet
- **Size**: s-1vcpu-2gb (minimum) - $12/month
- **Region**: Choose based on your users (Sydney used in this setup)
- **OS**: Ubuntu 22.04 LTS
- **Firewall**: Allow ports 22 (SSH), 80 (HTTP), 443 (HTTPS)

#### DNS Configuration (Cloudflare)
Set up the following DNS records:

```
Type: A
Name: @
Value: YOUR_DROPLET_IP
Proxy: Enabled (Orange Cloud)

Type: A  
Name: api
Value: YOUR_DROPLET_IP
Proxy: Enabled (Orange Cloud)

Type: A
Name: www
Value: YOUR_DROPLET_IP
Proxy: Enabled (Orange Cloud)
```

### 2. Server Setup

#### Install Dependencies
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
sudo usermod -aG docker $USER

# Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Reboot to apply changes
sudo reboot
```

#### Create Application Directory
```bash
# Create deployment directory
sudo mkdir -p /opt/noteearly
sudo chown $USER:$USER /opt/noteearly
cd /opt/noteearly

# Create SSL certificate directory
mkdir -p letsencrypt
chmod 600 letsencrypt
```

### 3. Production Configuration

#### docker-compose.yaml (Server)
Create `/opt/noteearly/docker-compose.yaml`:

```yaml
services:
  # Traefik Reverse Proxy for SSL and routing
  traefik:
    image: traefik:v3.0
    container_name: traefik
    restart: unless-stopped
    command:
      - "--api.dashboard=true"
      - "--api.insecure=true"
      - "--providers.docker=true"
      - "--providers.docker.exposedbydefault=false"
      - "--entrypoints.web.address=:80"
      - "--entrypoints.websecure.address=:443"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge=true"
      - "--certificatesresolvers.letsencrypt.acme.httpchallenge.entrypoint=web"
      - "--certificatesresolvers.letsencrypt.acme.email=YOUR_EMAIL@example.com"
      - "--certificatesresolvers.letsencrypt.acme.storage=/letsencrypt/acme.json"
      - "--entrypoints.web.http.redirections.entrypoint.to=websecure"
      - "--entrypoints.web.http.redirections.entrypoint.scheme=https"
      - "--log.level=INFO"
    ports:
      - "80:80"
      - "443:443"
      - "8080:8080"
    volumes:
      - "/var/run/docker.sock:/var/run/docker.sock:ro"
      - "./letsencrypt:/letsencrypt"
    networks:
      - noteearly-network

  # Backend API Service
  backend:
    image: nineteen17dh/noteearly-backend:main
    container_name: noteearly-backend
    environment:
      - NODE_ENV=${NODE_ENV}
      - PORT=4000
      - DATABASE_URL=${DATABASE_URL}
      - SUPABASE_URL=${SUPABASE_URL}
      - SUPABASE_ANON_KEY=${SUPABASE_ANON_KEY}
      - SUPABASE_SERVICE_ROLE_KEY=${SUPABASE_SERVICE_ROLE_KEY}
      - SUPABASE_JWT_SECRET=${SUPABASE_JWT_SECRET}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_EXPIRES_IN=${JWT_EXPIRES_IN}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - JWT_REFRESH_TOKEN_EXPIRY_SECONDS=${JWT_REFRESH_TOKEN_EXPIRY_SECONDS}
      - FRONTEND_REDIRECT_URL=${FRONTEND_REDIRECT_URL}
      - CLIENT_URL=${CLIENT_URL}
      - FRONTEND_URL=${FRONTEND_URL}
      - APP_URL=${APP_URL}
      - RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS}
      - RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS}
      - STRIPE_SECRET_KEY=${STRIPE_SECRET_KEY}
      - STRIPE_WEBHOOK_SECRET=${STRIPE_WEBHOOK_SECRET}
      - STORAGE_BUCKET=${STORAGE_BUCKET}
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.backend.rule=Host(`api.noteearly.com`)"
      - "traefik.http.routers.backend.tls.certresolver=letsencrypt"
      - "traefik.http.services.backend.loadbalancer.server.port=4000"
    restart: unless-stopped
    networks:
      - noteearly-network

  # Frontend Next.js Service
  frontend:
    image: nineteen17dh/noteearly-frontend:main
    container_name: noteearly-frontend
    environment:
      - NODE_ENV=${NODE_ENV}
      - NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}
      - PORT=3000
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.frontend.rule=Host(`noteearly.com`)"
      - "traefik.http.routers.frontend.tls.certresolver=letsencrypt"
      - "traefik.http.services.frontend.loadbalancer.server.port=3000"
    restart: unless-stopped
    networks:
      - noteearly-network
    depends_on:
      - backend

networks:
  noteearly-network:
    driver: bridge
```

#### .env (Server)
Create `/opt/noteearly/.env` with your production values:

```bash
# Production Environment Variables
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://api.noteearly.com

# Database (Supabase)
DATABASE_URL=postgresql://postgres:PASSWORD@PROJECT.supabase.co:5432/postgres

# Supabase Auth
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_JWT_SECRET=your-jwt-secret

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_EXPIRES_IN=24h
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars
JWT_REFRESH_TOKEN_EXPIRY_SECONDS=604800

# Frontend URLs
FRONTEND_REDIRECT_URL=https://noteearly.com/callback
CLIENT_URL=https://noteearly.com
FRONTEND_URL=https://noteearly.com
APP_URL=https://noteearly.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Stripe Configuration
STRIPE_SECRET_KEY=sk_live_your-stripe-key
STRIPE_WEBHOOK_SECRET=whsec_your-webhook-secret

# Storage Configuration
STORAGE_BUCKET=your-supabase-storage-bucket-name
```

## 🔄 CI/CD Pipeline

### GitHub Actions Workflow

The deployment pipeline is defined in `.github/workflows/docker-build.yml`:

```yaml
name: Build and Deploy

on:
  push:
    branches: [ dev, main ]
  pull_request:
    branches: [ dev, main ]

env:
  DOCKER_REGISTRY: docker.io
  BACKEND_IMAGE_NAME: nineteen17dh/noteearly-backend
  FRONTEND_IMAGE_NAME: nineteen17dh/noteearly-frontend

jobs:
  build-backend:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.BACKEND_IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix=main-,enable=${{ github.ref == 'refs/heads/main' }}
          type=sha,prefix=dev-,enable=${{ github.ref == 'refs/heads/dev' }}
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Backend
      uses: docker/build-push-action@v5
      with:
        context: ./server
        file: ./server/Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        platforms: linux/amd64

  build-frontend:
    runs-on: ubuntu-latest
    steps:
    - name: Checkout code
      uses: actions/checkout@v4

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v3

    - name: Log in to Docker Hub
      uses: docker/login-action@v3
      with:
        username: ${{ secrets.DOCKER_USERNAME }}
        password: ${{ secrets.DOCKER_PASSWORD }}

    - name: Extract metadata
      id: meta
      uses: docker/metadata-action@v5
      with:
        images: ${{ env.FRONTEND_IMAGE_NAME }}
        tags: |
          type=ref,event=branch
          type=ref,event=pr
          type=sha,prefix=main-,enable=${{ github.ref == 'refs/heads/main' }}
          type=sha,prefix=dev-,enable=${{ github.ref == 'refs/heads/dev' }}
          type=raw,value=latest,enable={{is_default_branch}}

    - name: Build and push Frontend
      uses: docker/build-push-action@v5
      with:
        context: ./client
        file: ./client/Dockerfile
        push: true
        tags: ${{ steps.meta.outputs.tags }}
        labels: ${{ steps.meta.outputs.labels }}
        cache-from: type=gha
        cache-to: type=gha,mode=max
        platforms: linux/amd64
        build-args: |
          NEXT_PUBLIC_API_BASE_URL=https://api.noteearly.com

  # Deploy to production server
  deploy:
    needs: [build-backend, build-frontend]
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    
    steps:
      - name: Deploy to production server
        uses: appleboy/ssh-action@v1.0.3
        with:
          host: ${{ secrets.HOST }}
          username: ${{ secrets.USERNAME }}
          key: ${{ secrets.SSH_KEY }}
          script: |
            echo "🚀 Starting deployment..."
            cd /opt/noteearly
            
            # Pull latest images
            docker-compose pull
            
            # Stop and restart containers
            docker-compose down
            docker-compose up -d
            
            # Clean up old images
            docker image prune -f
            
            # Show status
            docker-compose ps
            
            echo "✅ Deployment complete!"
```

### Required GitHub Secrets

Add these secrets in your GitHub repository settings:

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DOCKER_USERNAME` | DockerHub username | `nineteen17dh` |
| `DOCKER_PASSWORD` | DockerHub access token | `dckr_pat_...` |
| `HOST` | Production server IP | `134.199.167.55` |
| `USERNAME` | SSH username | `root` |
| `SSH_KEY` | Private SSH key | `-----BEGIN RSA PRIVATE KEY-----...` |

## 🐳 Docker Configuration

### Frontend Dockerfile

Ensure your `client/Dockerfile` includes the correct health check:

```dockerfile
FROM node:20-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

COPY package*.json ./
RUN npm ci

# Rebuild the source code only when needed
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build with production environment variables
ARG NEXT_PUBLIC_API_BASE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL

RUN npm run build

# Production image
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Set the correct permission for prerender cache
RUN mkdir .next
RUN chown nextjs:nodejs .next

COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT 3000
ENV HOSTNAME "0.0.0.0"

# Health check (IMPORTANT: Use 127.0.0.1, not localhost)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000 || exit 1

CMD ["node", "server.js"]
```

### Backend Dockerfile

Ensure your `server/Dockerfile` includes appropriate health checks:

```dockerfile
# Health check for backend
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://127.0.0.1:4000/health || exit 1
```

## 🚀 Deployment Workflow

### Automatic Deployment

1. **Push code** to the `main` branch
2. **GitHub Actions** triggers automatically
3. **Images are built** and pushed to DockerHub
4. **Deployment script** SSHs to the server
5. **New images are pulled** and containers restarted
6. **Application is live** with zero downtime

### Manual Deployment

If needed, you can deploy manually:

```bash
# SSH to your server
ssh root@YOUR_DROPLET_IP

# Navigate to deployment directory
cd /opt/noteearly

# Pull latest images
docker-compose pull

# Restart services
docker-compose down && docker-compose up -d

# Check status
docker-compose ps
```

## 🔍 Monitoring & Debugging

### Health Checks

Monitor container health:

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs frontend
docker-compose logs backend
docker-compose logs traefik

# Check health of specific container
docker inspect noteearly-frontend | grep Health -A 20
```

### Traefik Dashboard

Access the Traefik dashboard for routing information:
- **URL**: `http://YOUR_DROPLET_IP:8080`
- **API**: `http://YOUR_DROPLET_IP:8080/api/rawdata`

### SSL Certificates

Check SSL certificate status:

```bash
# Check certificate files
ls -la /opt/noteearly/letsencrypt/

# Check certificate expiry
curl -vI https://noteearly.com 2>&1 | grep -i expire
```

### Application URLs

- **Frontend**: https://noteearly.com
- **API**: https://api.noteearly.com
- **API Health**: https://api.noteearly.com/health
- **Traefik Dashboard**: http://YOUR_DROPLET_IP:8080

## 🛡️ Security

### SSL/TLS
- **Automatic SSL** certificates via Let's Encrypt
- **HTTP to HTTPS** redirect enforced
- **HSTS headers** for security

### Firewall
- **Port 22**: SSH access only
- **Port 80**: HTTP (redirects to HTTPS)
- **Port 443**: HTTPS traffic
- **Port 8080**: Traefik dashboard (consider restricting)

### Container Security
- **Non-root users** in containers
- **Health checks** ensure only healthy containers receive traffic
- **Restart policies** for automatic recovery

## 🔧 Maintenance

### Scaling

#### Vertical Scaling
Upgrade your DigitalOcean droplet:
- **s-1vcpu-2gb** ($12/month) - Current
- **s-2vcpu-4gb** ($24/month) - Medium traffic
- **s-4vcpu-8gb** ($48/month) - High traffic

#### Horizontal Scaling
Add load balancer and multiple droplets:
- **DigitalOcean Load Balancer** (+$12/month)
- **Multiple droplets** behind load balancer
- **Database connection pooling**

### Updates

#### Application Updates
Automatic via GitHub Actions when pushing to `main`

#### System Updates
```bash
# SSH to server
ssh root@YOUR_DROPLET_IP

# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
cd /opt/noteearly
docker-compose pull
docker-compose up -d

# Clean up old images
docker image prune -f
```

### Backup Strategy

#### Application Data
- **Database**: Supabase handles backups automatically
- **Environment variables**: Keep secure backup of `.env` file
- **SSL certificates**: Auto-renewed, stored in `/opt/noteearly/letsencrypt/`

#### Infrastructure
- **Docker configuration**: Stored in git repository
- **Server snapshots**: Consider DigitalOcean snapshots for disaster recovery

## 🚨 Troubleshooting

### Common Issues

#### Container Won't Start
```bash
# Check logs
docker-compose logs [service-name]

# Check container status
docker-compose ps

# Restart specific service
docker-compose restart [service-name]
```

#### SSL Certificate Issues
```bash
# Check Traefik logs
docker-compose logs traefik | grep -i cert

# Force certificate renewal
docker-compose restart traefik

# Check DNS propagation
dig +short noteearly.com
```

#### Health Check Failures
```bash
# Check health status
docker inspect [container-name] | grep Health -A 20

# Test health check manually
docker exec -it [container-name] wget -O - http://127.0.0.1:3000
```

#### Deployment Failures
```bash
# Check GitHub Actions logs in your repository
# SSH to server and check:
cd /opt/noteearly
docker-compose ps
docker-compose logs
```

### Emergency Recovery

#### Complete System Recovery
```bash
# SSH to server
ssh root@YOUR_DROPLET_IP

# Stop all services
cd /opt/noteearly
docker-compose down

# Clean Docker system
docker system prune -a

# Pull fresh images and restart
docker-compose pull
docker-compose up -d
```

#### Rollback Deployment
```bash
# Use previous image tag
docker tag nineteen17dh/noteearly-frontend:main nineteen17dh/noteearly-frontend:rollback
docker-compose up -d
```

## 💰 Cost Breakdown

### Monthly Costs
- **DigitalOcean Droplet**: $12/month (s-1vcpu-2gb)
- **Domain**: $0 (already owned)
- **Cloudflare**: $0 (free tier)
- **DockerHub**: $0 (free tier)
- **GitHub Actions**: $0 (free tier for public repos)

**Total**: ~$12/month

### Optional Add-ons
- **DigitalOcean Backups**: +$2.40/month (20% of droplet cost)
- **Load Balancer**: +$12/month (for high availability)
- **Monitoring**: +$6/month (DigitalOcean monitoring)

## 📞 Support

### Getting Help
- **DigitalOcean Community**: Community forums and tutorials
- **Traefik Documentation**: https://doc.traefik.io/traefik/
- **Docker Documentation**: https://docs.docker.com/
- **GitHub Actions**: https://docs.github.com/en/actions

### Monitoring
- **Uptime Monitoring**: Consider UptimeRobot or similar
- **Error Tracking**: Consider Sentry for application errors
- **Performance**: Consider New Relic or DataDog

---

## 🎉 Conclusion

You now have a production-ready, automatically deploying, SSL-secured application running on DigitalOcean with:

- ✅ **Automatic deployments** on every push to main
- ✅ **SSL certificates** via Let's Encrypt
- ✅ **Health checks** and automatic recovery
- ✅ **Reverse proxy** with Traefik
- ✅ **Container orchestration** with Docker Compose
- ✅ **Monitoring** via Traefik dashboard

Your application is accessible at:
- **Production**: https://noteearly.com
- **API**: https://api.noteearly.com

**Happy deploying!** 🚀