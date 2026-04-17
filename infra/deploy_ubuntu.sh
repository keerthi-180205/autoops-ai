#!/bin/bash
set -e

# =======================================================
# EC2 Deployment Script for AUTOops
# Run this on a fresh Ubuntu EC2 instance to setup Docker
# =======================================================

echo "Updating system..."
sudo apt-get update -y

echo "Installing Docker prerequisites..."
sudo apt-get install -y ca-certificates curl gnupg

echo "Adding Docker GPG key..."
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "Adding Docker repository..."
echo \
  "deb [arch="$(dpkg --print-architecture)" signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  "$(. /etc/os-release && echo "$VERSION_CODENAME")" stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

echo "Installing Docker Engine and Compose..."
sudo apt-get update -y
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

echo "Enabling Docker service..."
sudo systemctl enable docker
sudo systemctl start docker

echo "Adding current user to docker group..."
sudo usermod -aG docker ubuntu

echo "========================================="
echo "✅ Docker installed successfully."
echo "========================================="
echo ""
echo "NEXT STEPS TO DEPLOY YOUR APP:"
echo "1. Log out and log back in to apply docker group permissions (or type 'newgrp docker')"
echo "2. git clone <YOUR_REPO_URL> AUTOops"
echo "3. cd AUTOops/infra"
echo "4. cp .env.example .env (Edit the file and insert your AWS + OpenAI keys)"
echo "5. docker compose build"
echo "6. docker compose up -d"
echo ""
echo "Your app will be live and your teammates will think you are a genius."
