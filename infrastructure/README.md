# NoteEarly Infrastructure

Production infrastructure for NoteEarly using **DigitalOcean + Coolify**.

## 🚀 Quick Start

```bash
# 1. Navigate to terraform directory
cd infrastructure/terraform

# 2. Set your credentials
export DIGITALOCEAN_TOKEN='dop_v1_your_token_here'
export SSH_PUBLIC_KEY="$(cat ~/.ssh/id_rsa.pub)"

# 3. Deploy infrastructure
./deploy.sh
```

## 📁 Directory Structure

```
infrastructure/
├── README.md                    # This file
├── INFRASTRUCTURE_PLAN.md       # Detailed infrastructure documentation
└── terraform/                  # Terraform infrastructure as code
    ├── main.tf                  # Main infrastructure configuration
    ├── variables.tf             # Variable definitions
    ├── outputs.tf               # Output definitions
    ├── cloud-init.yml           # Server setup script
    ├── terraform.tfvars.reference # Configuration template
    ├── deploy.sh                # Deployment script
    └── .gitignore               # Git ignore for sensitive files
```

## 💰 Cost Overview

- **Starting**: $6/month (1GB droplet)
- **Scaling**: Up to $96/month (16GB droplet)
- **Load Balancer**: +$12/month (commented out)
- **Backups**: +20% of droplet cost (disabled)

## 🔧 Prerequisites

1. **DigitalOcean Account** with API token
2. **SSH Key Pair** for server access
3. **Terraform** installed locally
4. **Domain** (noteearly.com) for DNS setup

## 📋 Deployment Commands

```bash
# Full deployment
./deploy.sh

# Plan only (see what will be created)
./deploy.sh plan

# View outputs
./deploy.sh output

# Destroy infrastructure
./deploy.sh destroy
```

## 🔗 What Gets Created

- ✅ Ubuntu 22.04 droplet in Sydney
- ✅ VPC with firewall rules
- ✅ Domain DNS records
- ✅ Coolify installation
- ✅ Docker + Docker Compose
- ✅ Security hardening (UFW, Fail2ban)

## 📖 More Information

See [`INFRASTRUCTURE_PLAN.md`](./INFRASTRUCTURE_PLAN.md) for detailed architecture, scaling options, and deployment procedures.

---

**Region**: Sydney, Australia  
**Cost**: Starting at $6/month  
**Uptime Target**: 99.5% 