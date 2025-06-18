# NoteEarly Production Deployment Guide

## 🏗️ Infrastructure Overview

**Production Server Details:**
- **Provider**: DigitalOcean
- **Server IP**: `134.199.167.55`
- **Specs**: 2 GiB RAM, 1 CPU, 50 GiB SSD, 2,000 GiB Transfer
- **Cost**: $12/month
- **Region**: Sydney, Australia (syd1)
- **OS**: Ubuntu 22.04 LTS

**Domain Configuration:**
- **Primary Domain**: `noteearly.com`
- **API Subdomain**: `api.noteearly.com`
- **WWW Subdomain**: `www.noteearly.com`

## 🚀 Deployment Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    noteearly.com                        │
│                 (Cloudflare DNS)                        │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────┐
│              DigitalOcean Droplet                       │
│              134.199.167.55                             │
│  ┌─────────────────────────────────────────────────────┐│
│  │                  Coolify                            ││
│  │              (Port 8000)                            ││
│  │  ┌─────────────┐  ┌─────────────┐                  ││
│  │  │   Frontend  │  │   Backend   │                  ││
│  │  │  (Next.js)  │  │ (Express.js)│                  ││
│  │  │    :3000    │  │    :8000    │                  ││
│  │  └─────────────┘  └─────────────┘                  ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## 📋 Step-by-Step Deployment Process

### Phase 1: Infrastructure Setup with Terraform

#### 1.1 Terraform Configuration
```bash
cd infrastructure/terraform
```

**Key Files:**
- `main.tf` - Main infrastructure configuration
- `variables.tf` - Variable definitions (updated to s-1vcpu-2gb)
- `outputs.tf` - Output values
- `cloud-init.yml` - Server initialization script

#### 1.2 Deploy Infrastructure
```bash
terraform apply -auto-approve
```

**What This Creates:**
- ✅ VPC with IP range `10.30.0.0/24`
- ✅ SSH Key pair
- ✅ Firewall rules (ports 22, 80, 443, 8000, 8080)
- ✅ Ubuntu 22.04 droplet (2GB RAM)
- ✅ DNS records for noteearly.com
- ✅ DigitalOcean project organization

#### 1.3 Cloud-Init Installation Process
The server automatically installs:
1. **System Updates** - Latest Ubuntu packages
2. **Security Tools** - fail2ban, ufw firewall
3. **Docker** - Latest Docker Engine
4. **Coolify** - v4.0.0-beta.419 (self-hosted deployment platform)

**Installation Time**: ~5-10 minutes

### Phase 2: Coolify Configuration

#### 2.1 Access Coolify
- **URL**: `http://134.199.167.55:8000`
- **First-time setup**: Create admin account

#### 2.2 Server Connection Setup
**SSH Configuration:**
- **Connection Type**: Remote Server
- **Name**: `noteearly-production-server`
- **IP Address**: `134.199.167.55`
- **Port**: `22`
- **User**: `root`
- **SSH Key**: Use your private key from `~/.ssh/id_rsa`

**SSH Key Command:**
```bash
cat ~/.ssh/id_rsa
```

#### 2.3 Application Configuration
**General Settings:**
- **Name**: `NoteEarly Production`
- **Description**: `NoteEarly - AI-powered reading comprehension platform`
- **Build Pack**: `Docker Compose`
- **Repository**: `https://github.com/nineteen17/note-early.git`
- **Branch**: `dev`

**Domain Configuration:**
- **Frontend Domain**: `noteearly.com`
- **Backend Domain**: `api.noteearly.com`

**Build Settings:**
- **Base Directory**: `/`
- **Docker Compose Location**: `/docker-compose.yaml`
- **Preserve Repository**: ✅ Enabled
- **Custom Build Command**: `docker compose build`
- **Custom Start Command**: `docker compose up -d`

### Phase 3: DNS and SSL Configuration

#### 3.1 Cloudflare DNS Setup
**Required DNS Records:**
```
Type: A
Name: @
Value: 134.199.167.55
TTL: Auto

Type: CNAME
Name: api
Value: noteearly.com
TTL: Auto

Type: CNAME
Name: www
Value: noteearly.com
TTL: Auto
```

#### 3.2 SSL Certificate Setup
- **Cloudflare SSL Mode**: Flexible (initially)
- **Coolify SSL**: Enable after DNS propagation
- **Let's Encrypt**: Automatic certificate generation

### Phase 4: Environment Variables

#### 4.1 Frontend Environment Variables
```env
NODE_ENV=production
NEXT_PUBLIC_API_BASE_URL=https://api.noteearly.com
```

#### 4.2 Backend Environment Variables
```env
# Application
NODE_ENV=production
PORT=8000

# Database
DATABASE_URL=postgresql://username:password@host:5432/database

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# JWT
JWT_SECRET=your-super-secure-jwt-secret-here
JWT_EXPIRES_IN=7d

# Frontend URLs
FRONTEND_URL=https://noteearly.com
ADMIN_FRONTEND_URL=https://noteearly.com
STUDENT_FRONTEND_URL=https://noteearly.com

# Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100

# Stripe
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_live_...

# Storage
STORAGE_PROVIDER=supabase
SUPABASE_STORAGE_BUCKET=your-bucket-name
```

## 🔧 Infrastructure Management

### Scaling Options
**Horizontal Scaling:**
- Load balancer: +$12/month (currently disabled)
- Multiple droplets behind load balancer

**Vertical Scaling:**
```bash
# Update droplet_size in variables.tf
terraform apply
```

**Available Sizes:**
- `s-1vcpu-1gb` - $6/month
- `s-1vcpu-2gb` - $12/month (current)
- `s-2vcpu-2gb` - $18/month
- `s-2vcpu-4gb` - $24/month
- `s-4vcpu-8gb` - $48/month

### Backup Strategy
**Current**: Disabled (save $2.40/month)
**To Enable**: Set `enable_backups = true` in terraform.tfvars

### Monitoring and Maintenance
**Coolify Dashboard**: Application monitoring and logs
**DigitalOcean Monitoring**: Server metrics (free)
**Log Access**: 
```bash
ssh root@134.199.167.55
docker logs coolify
```

## 🛡️ Security Configuration

### Firewall Rules
```
Inbound:
- Port 22 (SSH)
- Port 80 (HTTP)
- Port 443 (HTTPS)
- Port 8000 (Coolify)
- Port 8080 (Application)

Outbound:
- All traffic allowed
```

### SSH Security
- **Root access**: Enabled for Coolify management
- **Key-based authentication**: Only (no passwords)
- **Fail2ban**: Automatic IP blocking for failed attempts

### Application Security
- **CORS**: Configured for production domains
- **Rate limiting**: 100 requests per 15 minutes
- **Environment variables**: Secure storage in Coolify
- **SSL/TLS**: Automated via Let's Encrypt

## 🔄 Deployment Workflow

### Code Changes
1. **Push to GitHub** (`dev` branch)
2. **Coolify auto-deploys** (if webhook configured)
3. **Or manual deploy** via Coolify dashboard

### Database Migrations
```bash
ssh root@134.199.167.55
docker exec -it <backend-container> npm run migrate
```

### Rolling Back
- **Coolify UI**: Previous deployment versions
- **Git**: Revert commit and redeploy

## 📊 Cost Breakdown

### Monthly Costs
```
DigitalOcean Droplet (2GB): $12.00
Domain (noteearly.com): $0.00 (owned)
Cloudflare: $0.00 (free tier)
Total: $12.00/month
```

### Optional Add-ons
```
Backups (+20%): +$2.40/month
Load Balancer: +$12.00/month
Monitoring: $0.00 (included)
```

## 🚨 Troubleshooting

### Common Issues
1. **Coolify SSH Connection**: Verify private key matches public key on server
2. **Domain Not Resolving**: Check Cloudflare DNS propagation
3. **SSL Issues**: Ensure DNS is pointing correctly before enabling SSL
4. **Container Crashes**: Check logs in Coolify dashboard

### Emergency Access
```bash
# Direct server access
ssh root@134.199.167.55

# Check Coolify status
docker ps

# Restart Coolify
docker restart coolify

# View application logs
docker logs <app-container-name>
```

### Disaster Recovery
1. **Infrastructure**: `terraform apply` recreates everything
2. **Database**: Restore from Supabase backups
3. **Application**: Redeploy from Git repository
4. **DNS**: Cloudflare records preserved

## 📈 Performance Optimization

### Current Optimizations
- **Docker multi-stage builds**: Smaller image sizes
- **Next.js standalone**: Optimized production builds
- **Redis caching**: Via Coolify built-in Redis
- **Static file serving**: Optimized for production

### Future Improvements
- **CDN**: Cloudflare for static assets
- **Database connection pooling**: PgBouncer
- **Application monitoring**: Sentry or similar
- **Performance monitoring**: New Relic or DataDog

---

## 📞 Support Information

**Infrastructure Provider**: DigitalOcean
**Deployment Platform**: Coolify (self-hosted)
**Domain Registrar**: Your domain provider
**DNS Provider**: Cloudflare
**Repository**: GitHub (nineteen17/note-early)

**Key Commands:**
- **Server Access**: `ssh root@134.199.167.55`
- **Coolify UI**: `http://134.199.167.55:8000`
- **Terraform**: `cd infrastructure/terraform && terraform apply` 