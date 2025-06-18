output "server_ip" {
  description = "Public IP address of the server"
  value       = digitalocean_droplet.noteearly_server.ipv4_address
}

output "server_private_ip" {
  description = "Private IP address of the server"
  value       = digitalocean_droplet.noteearly_server.ipv4_address_private
}

# Load balancer output (commented out since LB is disabled)
# output "load_balancer_ip" {
#   description = "Load balancer IP address (if enabled)"
#   value       = var.enable_load_balancer ? digitalocean_loadbalancer.noteearly_lb[0].ip : null
# }

output "domain_name" {
  description = "Domain name"
  value       = var.domain_name
}

output "estimated_monthly_cost" {
  description = "Estimated monthly cost in USD"
  value       = "$${local.estimated_monthly_cost}"
}

output "cost_breakdown" {
  description = "Cost breakdown"
  value = {
    droplet_cost = "$${local.cost_map[var.droplet_size]}"
    backup_cost  = "$${local.backup_cost}"
    total_cost   = "$${local.estimated_monthly_cost}"
  }
}

output "ssh_connection" {
  description = "SSH connection command"
  value       = "ssh root@${digitalocean_droplet.noteearly_server.ipv4_address}"
}

output "urls" {
  description = "Application URLs"
  value = {
    frontend = "https://${var.domain_name}"
    api      = "https://api.${var.domain_name}"
    www      = "https://www.${var.domain_name}"
  }
}

output "next_steps" {
  description = "Next steps after deployment"
  value = [
    "1. Wait for cloud-init to complete (~5-10 minutes)",
    "2. SSH to server: ssh root@${digitalocean_droplet.noteearly_server.ipv4_address}",
    "3. Check Coolify status: docker ps",
    "4. Access Coolify UI: http://${digitalocean_droplet.noteearly_server.ipv4_address}:8080",
    "5. Configure your applications in Coolify",
    "6. Point your domain DNS to the server IP"
  ]
} 