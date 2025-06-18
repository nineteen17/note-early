terraform {
  required_version = ">= 1.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

provider "digitalocean" {
  token = var.do_token
}

# Local values for cost calculation
locals {
  cost_map = {
    "s-1vcpu-1gb"    = 6
    "s-1vcpu-2gb"    = 12
    "s-2vcpu-2gb"    = 18
    "s-2vcpu-4gb"    = 24
    "s-4vcpu-8gb"    = 48
    "s-8vcpu-16gb"   = 96
  }
  
  backup_cost = var.enable_backups ? (local.cost_map[var.droplet_size] * 0.2) : 0
  estimated_monthly_cost = local.cost_map[var.droplet_size] + local.backup_cost
}

# VPC
resource "digitalocean_vpc" "noteearly_vpc" {
  name     = "${var.project_name}-vpc"
  region   = var.region
  ip_range = "10.30.0.0/24"
}

# SSH Key
resource "digitalocean_ssh_key" "noteearly_key" {
  name       = "${var.project_name}-key"
  public_key = var.ssh_public_key
}

# Firewall
resource "digitalocean_firewall" "noteearly_firewall" {
  name = "${var.project_name}-firewall"

  droplet_ids = [digitalocean_droplet.noteearly_server.id]

  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "8080"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  inbound_rule {
    protocol         = "tcp"
    port_range       = "8000"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "tcp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "1-65535"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}

# Main Droplet
resource "digitalocean_droplet" "noteearly_server" {
  image     = "ubuntu-22-04-x64"
  name      = "${var.project_name}-server"
  region    = var.region
  size      = var.droplet_size
  backups   = var.enable_backups
  vpc_uuid  = digitalocean_vpc.noteearly_vpc.id
  
  ssh_keys = [digitalocean_ssh_key.noteearly_key.id]

  user_data = file("${path.module}/cloud-init.yml")

  tags = ["noteearly", "production", "web"]
}

# Load Balancer (commented out to save $12/month - uncomment when needed)
# resource "digitalocean_loadbalancer" "noteearly_lb" {
#   count = var.enable_load_balancer ? 1 : 0
#   
#   name     = "${var.project_name}-lb"
#   region   = var.region
#   vpc_uuid = digitalocean_vpc.noteearly_vpc.id
#
#   forwarding_rule {
#     entry_protocol  = "http"
#     entry_port      = 80
#     target_protocol = "http"
#     target_port     = 80
#   }
#
#   forwarding_rule {
#     entry_protocol  = "https"
#     entry_port      = 443
#     target_protocol = "https"
#     target_port     = 443
#     tls_passthrough = true
#   }
#
#   healthcheck {
#     protocol = "http"
#     port     = 80
#     path     = "/health"
#   }
#
#   droplet_ids = [digitalocean_droplet.noteearly_server.id]
#
#   tags = ["noteearly", "production"]
# }

# Domain Records
resource "digitalocean_domain" "noteearly_domain" {
  name = var.domain_name
}

resource "digitalocean_record" "noteearly_a" {
  domain = digitalocean_domain.noteearly_domain.name
  type   = "A"
  name   = "@"
  value  = digitalocean_droplet.noteearly_server.ipv4_address
  ttl    = 300
}

resource "digitalocean_record" "noteearly_www" {
  domain = digitalocean_domain.noteearly_domain.name
  type   = "CNAME"
  name   = "www"
  value  = "${var.domain_name}."
  ttl    = 300
}

resource "digitalocean_record" "noteearly_api" {
  domain = digitalocean_domain.noteearly_domain.name
  type   = "CNAME"
  name   = "api"
  value  = "${var.domain_name}."
  ttl    = 300
}

# Project
resource "digitalocean_project" "noteearly_project" {
  name        = var.project_name
  description = "NoteEarly application infrastructure"
  purpose     = "Web Application"
  environment = "Production"

  resources = [
    digitalocean_droplet.noteearly_server.urn,
    digitalocean_domain.noteearly_domain.urn
  ]
} 