# NoteEarly Infrastructure Plan

## 🏗️ Architecture Overview

This document outlines the production infrastructure for NoteEarly, a full-stack educational platform built with Next.js and Express.js.

### 🎯 Deployment Strategy
- **Platform**: DigitalOcean + Coolify
- **Region**: Sydney, Australia (syd1)
- **Domain**: noteearly.com
- **Cost**: Starting at $6/month with autoscaling capability

## 🧱 Infrastructure Components

### Core Infrastructure
```
┌─────────────────────────────────────────────────────────┐
│                    DigitalOcean VPC                     │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                 Firewall Rules                      │ │
│  │  • SSH (22) - Admin access                         │ │  
│  │  • HTTP (80) - Web traffic                         │ │
│  │  • HTTPS (443) - Secure web traffic               │ │
│  │  • Coolify (8080) - Management interface          │ │
│  └─────────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────────┐ │
│  │               Ubuntu 22.04 Droplet                 │ │
│  │  ┌─────────────────────────────────────────────────┐ │ │
│  │  │                 Coolify                         │ │ │
│  │  │  ┌─────────────────┐  ┌─────────────────────┐   │ │ │
│  │  │  │  Frontend       │  │  Backend            │   │ │ │
│  │  │  │  (Next.js)      │  │  (Express.js)       │   │ │ │
│  │  │  │  Port: 3000     │  │  Port: 5000         │   │ │ │
│  │  │  └─────────────────┘  └─────────────────────┘   │ │ │
│  │  └─────────────────────────────────────────────────┘ │ │
│  └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘

External Services:
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   Supabase      │  │   Cloudflare    │  │     Stripe      │
│   (Database)    │  │   (DNS/CDN)     │  │   (Payments)    │
└─────────────────┘  └─────────────────┘  └─────────────────┘
```

## 💰 Cost Structure & Scaling

### Starting Configuration ($6/month)
- **Droplet**: s-1vcpu-1gb (1 vCPU, 1GB RAM) - $6/month
- **VPC**: Free
- **Firewall**: Free  
- **Backups**: Disabled (save $1.20/month)
- **Load Balancer**: Commented out (save $12/month)

### Scaling Options
| Size | vCPU | RAM | Cost/Month | Use Case |
|------|------|-----|------------|----------|
| s-1vcpu-1gb | 1 | 1GB | $6 | MVP/Testing |
| s-1vcpu-2gb | 1 | 2GB | $12 | Light Traffic |
| s-2vcpu-2gb | 2 | 2GB | $18 | Growing Users |
| s-2vcpu-4gb | 2 | 4GB | $24 | Medium Traffic |
| s-4vcpu-8gb | 4 | 8GB | $48 | High Traffic |
| s-8vcpu-16gb | 8 | 16GB | $96 | Enterprise |

### Optional Features
- **Load Balancer**: +$12/month (High Availability)
- **Backups**: +20% of droplet cost (Data Protection)
- **Monitoring**: Free (DigitalOcean included)

## 🔧 Technology Stack

### Frontend (Next.js 15.3.0)
- **Framework**: React 19 with TypeScript
- **Styling**: TailwindCSS + ShadCN/UI
- **State**: Zustand
- **Forms**: React Hook Form
- **Data Fetching**: TanStack Query
- **Deployment**: Docker container via Coolify

### Backend (Express.js)
- **Runtime**: Node.js with TypeScript
- **Database**: PostgreSQL (Supabase)
- **ORM**: Drizzle
- **Authentication**: Supabase Auth
- **Payments**: Stripe
- **Validation**: Zod
- **Deployment**: Docker container via Coolify

### External Services
- **Database**: Supabase PostgreSQL (Free tier: 500MB)
- **Authentication**: Supabase Auth (Free tier: 50,000 MAU)
- **File Storage**: Supabase Storage (Free tier: 1GB)
- **DNS/CDN**: Cloudflare (Free tier)
- **Payments**: Stripe (2.9% + 30¢ per transaction)

## 🚀 Deployment Process

### 1. Infrastructure Setup (Terraform)
```bash
cd infrastructure/terraform
export DIGITALOCEAN_TOKEN='your-token'
export SSH_PUBLIC_KEY="$(cat ~/.ssh/id_rsa.pub)"
./deploy.sh
```

### 2. Coolify Configuration
1. Access Coolify: `http://server-ip:8080`
2. Connect GitHub repositories
3. Configure environment variables
4. Deploy applications

### 3. Domain Configuration
1. Point DNS to server IP
2. Configure SSL certificates
3. Set up subdomains (api.noteearly.com)

## 🔒 Security Features

### Server Security
- **Firewall**: UFW with restricted ports
- **SSH Protection**: Fail2ban with 3-attempt limit
- **SSL/TLS**: Automatic certificates via Coolify
- **Updates**: Automatic security updates enabled

### Application Security
- **Environment Variables**: Secure storage in Coolify
- **Database**: Row Level Security (Supabase)
- **Authentication**: JWT tokens with refresh
- **Rate Limiting**: Express rate limiter
- **CORS**: Configured for production domains

### Data Protection
- **Secrets Management**: Environment variables only
- **Database Encryption**: At rest and in transit
- **Backup Strategy**: Optional automated backups
- **Access Control**: Role-based permissions

## 📊 Monitoring & Maintenance

### Built-in Monitoring
- **DigitalOcean Monitoring**: CPU, Memory, Disk, Network
- **Coolify Logs**: Application logs and metrics
- **Uptime Monitoring**: Health checks via load balancer
- **Error Tracking**: Application-level error handling

### Maintenance Tasks
- **Security Updates**: Automatic via cloud-init
- **Application Updates**: Git-based deployments
- **Database Maintenance**: Managed by Supabase
- **SSL Renewal**: Automatic via Coolify

## 🌐 Domain & DNS Setup

### DNS Records (Cloudflare)
```
A    @           -> SERVER_IP
A    api         -> SERVER_IP  
CNAME www        -> noteearly.com
```

### SSL Certificates
- **Provider**: Let's Encrypt (via Coolify)
- **Renewal**: Automatic
- **Coverage**: Wildcard certificate for subdomains

## 📈 Growth Strategy

### Phase 1: MVP (Current)
- **Cost**: $6/month
- **Capacity**: ~100 concurrent users
- **Features**: Core functionality

### Phase 2: Growth ($18-24/month)
- **Upgrade**: 2 vCPU, 2-4GB RAM
- **Add**: Automated backups
- **Capacity**: ~500 concurrent users

### Phase 3: Scale ($48-60/month)
- **Upgrade**: 4 vCPU, 8GB RAM
- **Add**: Load balancer for HA
- **Add**: Advanced monitoring
- **Capacity**: ~2000 concurrent users

### Phase 4: Enterprise ($96+/month)
- **Upgrade**: 8+ vCPU, 16+ GB RAM
- **Add**: Multi-region deployment
- **Add**: Advanced analytics
- **Capacity**: ~10,000+ concurrent users

## 🎛️ Configuration Management

### Environment Variables
```bash
# Application
NODE_ENV=production
FRONTEND_URL=https://noteearly.com
BACKEND_URL=https://api.noteearly.com

# Database (Supabase)
DATABASE_URL=postgresql://...
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Payments (Stripe)
STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Security
JWT_SECRET=...
ENCRYPTION_KEY=...
```

### Feature Flags
- **Load Balancer**: `enable_load_balancer = false`
- **Backups**: `enable_backups = false`
- **Monitoring**: Built-in enabled

## 🔄 Disaster Recovery

### Backup Strategy
1. **Database**: Supabase automatic backups
2. **Application**: Git repository
3. **Environment**: Infrastructure as Code (Terraform)
4. **Files**: Supabase Storage

### Recovery Process
1. **Rebuild Infrastructure**: `terraform apply`
2. **Restore Applications**: Coolify git deployment
3. **Restore Database**: Supabase backup restore
4. **Update DNS**: Point to new server IP

### RTO/RPO Targets
- **Recovery Time Objective**: < 30 minutes
- **Recovery Point Objective**: < 1 hour
- **Availability Target**: 99.5% uptime

## 📋 Deployment Checklist

### Pre-deployment
- [ ] DigitalOcean API token obtained
- [ ] SSH key pair generated
- [ ] Domain DNS configured
- [ ] Supabase project created
- [ ] Stripe account configured

### Infrastructure
- [ ] Terraform files validated
- [ ] Infrastructure deployed
- [ ] Firewall rules verified
- [ ] SSH access confirmed

### Applications
- [ ] Coolify accessed and configured
- [ ] GitHub repositories connected
- [ ] Environment variables set
- [ ] Applications deployed and tested

### Post-deployment
- [ ] Domain SSL certificates verified
- [ ] Application functionality tested
- [ ] Monitoring configured
- [ ] Backup strategy implemented

## 🆘 Troubleshooting

### Common Issues
1. **SSH Access Denied**: Check firewall rules and SSH key
2. **Domain Not Resolving**: Verify DNS propagation
3. **SSL Certificate Issues**: Check domain ownership
4. **Application Won't Start**: Review environment variables
5. **Database Connection Failed**: Verify Supabase credentials

### Support Resources
- **DigitalOcean**: Community forums and documentation
- **Coolify**: GitHub issues and documentation  
- **Supabase**: Support dashboard and documentation
- **Domain Issues**: Registrar support

---

**Last Updated**: December 2024  
**Next Review**: Monthly review of costs and performance metrics 