variable "do_token" {
  description = "DigitalOcean API token"
  type        = string
  sensitive   = true
}

variable "ssh_public_key" {
  description = "SSH public key for server access"
  type        = string
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "noteearly"
}

variable "region" {
  description = "DigitalOcean region"
  type        = string
  default     = "syd1"
}

variable "droplet_size" {
  description = "Size of the droplet"
  type        = string
  default     = "s-1vcpu-2gb"
  validation {
    condition = contains([
      "s-1vcpu-1gb",
      "s-1vcpu-2gb", 
      "s-2vcpu-2gb",
      "s-2vcpu-4gb",
      "s-4vcpu-8gb",
      "s-8vcpu-16gb"
    ], var.droplet_size)
    error_message = "Droplet size must be one of the supported sizes."
  }
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "noteearly.com"
}

variable "enable_load_balancer" {
  description = "Enable load balancer (+$12/month)"
  type        = bool
  default     = false
}

variable "enable_backups" {
  description = "Enable droplet backups (+20% of droplet cost)"
  type        = bool
  default     = false
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
} 