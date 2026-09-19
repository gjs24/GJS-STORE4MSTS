#!/bin/bash
# ==============================================================================
# 1-Click Ubuntu VPS Setup for MSTS-GJS Production Store (Java Spring Boot Stack)
# Target OS: Ubuntu 22.04 / 24.04 LTS
# ==============================================================================

set -e

echo "========================================================="
echo "🚂 Setting up MSTS Store Java Full-Stack Production Server"
echo "========================================================="

# 1. Update system packages
echo "📦 Updating APT repositories..."
apt-get update && apt-get upgrade -y

# 2. Install Docker, Docker Compose, Nginx, and Certbot
echo "🐳 Installing Docker, Nginx, and Certbot..."
apt-get install -y \
    ca-certificates \
    curl \
    gnupg \
    lsb-release \
    docker.io \
    docker-compose-v2 \
    nginx \
    certbot \
    python3-certbot-nginx \
    ufw \
    git

systemctl enable docker
systemctl start docker
systemctl enable nginx
systemctl start nginx

# 3. Configure Firewall (UFW)
echo "🛡️ Configuring Firewall..."
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw --force enable

# 4. Create App Directory
APP_DIR="/opt/msts-store"
echo "📁 Setting up Application in $APP_DIR..."
mkdir -p $APP_DIR

echo "✅ VPS preparation complete!"
echo "Next steps:"
echo "1. Clone your repo to $APP_DIR"
echo "2. Run: cd $APP_DIR/learn-java/deploy && docker compose up -d --build"
echo "3. Run: certbot --nginx -d api.yourdomain.com"

