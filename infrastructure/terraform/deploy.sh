#!/bin/bash

# NoteEarly Infrastructure Deployment Script
# This script helps deploy your infrastructure to DigitalOcean

set -e  # Exit on any error

echo "🚀 NoteEarly Infrastructure Deployment"
echo "======================================"

# Check if running from correct directory
if [ ! -f "main.tf" ]; then
    echo "❌ Error: Please run this script from the terraform directory"
    echo "   cd infrastructure/terraform && ./deploy.sh"
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Error: Terraform is not installed"
    echo "   Please install Terraform first: https://terraform.io/downloads"
    exit 1
fi

# Function to check environment variables
check_env_vars() {
    echo "🔍 Checking environment variables..."
    
    if [ -z "$DIGITALOCEAN_TOKEN" ]; then
        echo "❌ Error: DIGITALOCEAN_TOKEN not set"
        echo "   Please set your DigitalOcean token:"
        echo "   export DIGITALOCEAN_TOKEN='your-token-here'"
        exit 1
    fi
    
    if [ -z "$SSH_PUBLIC_KEY" ]; then
        echo "❌ Error: SSH_PUBLIC_KEY not set"
        echo "   Please set your SSH public key:"
        echo "   export SSH_PUBLIC_KEY='\$(cat ~/.ssh/id_rsa.pub)'"
        exit 1
    fi
    
    echo "✅ Environment variables are set"
}

# Function to check for terraform.tfvars.secret
check_tfvars() {
    if [ -f "terraform.tfvars.secret" ]; then
        echo "✅ Found terraform.tfvars.secret - will use file-based configuration"
        USE_TFVARS=true
    else
        echo "ℹ️  No terraform.tfvars.secret found - will use environment variables"
        USE_TFVARS=false
        check_env_vars
    fi
}

# Function to initialize Terraform
init_terraform() {
    echo "🔧 Initializing Terraform..."
    terraform init
    echo "✅ Terraform initialized"
}

# Function to plan deployment
plan_deployment() {
    echo "📋 Planning deployment..."
    
    if [ "$USE_TFVARS" = true ]; then
        terraform plan -var-file="terraform.tfvars.secret" -out=tfplan
    else
        terraform plan \
            -var="do_token=$DIGITALOCEAN_TOKEN" \
            -var="ssh_public_key=$SSH_PUBLIC_KEY" \
            -var="region=syd1" \
            -var="droplet_size=s-1vcpu-1gb" \
            -var="domain_name=noteearly.com" \
            -var="enable_load_balancer=false" \
            -var="enable_backups=false" \
            -out=tfplan
    fi
    
    echo "✅ Plan created successfully"
}

# Function to apply deployment
apply_deployment() {
    echo "🚀 Applying deployment..."
    terraform apply tfplan
    echo "✅ Deployment completed!"
}

# Function to show outputs
show_outputs() {
    echo ""
    echo "📊 Deployment Information:"
    echo "========================="
    terraform output
}

# Main execution
main() {
    echo "Starting deployment process..."
    
    # Check configuration
    check_tfvars
    
    # Initialize Terraform
    init_terraform
    
    # Plan deployment
    plan_deployment
    
    # Ask for confirmation
    echo ""
    echo "🤔 Ready to deploy? This will create real infrastructure and incur costs."
    echo "   Starting cost: ~$6/month for basic setup"
    read -p "   Continue? (y/N): " -n 1 -r
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        apply_deployment
        show_outputs
        
        echo ""
        echo "🎉 Deployment successful!"
        echo "   Check the outputs above for next steps"
    else
        echo "❌ Deployment cancelled"
        rm -f tfplan
        exit 0
    fi
}

# Handle script arguments
case "${1:-}" in
    "destroy")
        echo "🗑️  Destroying infrastructure..."
        if [ "$USE_TFVARS" = true ]; then
            terraform destroy -var-file="terraform.tfvars.secret"
        else
            check_env_vars
            terraform destroy \
                -var="do_token=$DIGITALOCEAN_TOKEN" \
                -var="ssh_public_key=$SSH_PUBLIC_KEY" \
                -var="region=syd1" \
                -var="droplet_size=s-1vcpu-1gb" \
                -var="domain_name=noteearly.com" \
                -var="enable_load_balancer=false" \
                -var="enable_backups=false"
        fi
        ;;
    "plan")
        check_tfvars
        init_terraform
        plan_deployment
        echo "📋 Plan completed. Run ./deploy.sh to apply."
        ;;
    "output")
        show_outputs
        ;;
    *)
        main
        ;;
esac 