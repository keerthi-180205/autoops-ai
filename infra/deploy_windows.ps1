<#
.SYNOPSIS
    Windows Deployment Script for AUTOops
.DESCRIPTION
    This script automates the installation of Docker Desktop on a Windows machine,
    and provides the final instructions to deploy the AUTOops architecture.
    Run this script as Administrator.
#>

# Require Administrator privileges
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Please run this script as Administrator."
    exit
}

$ErrorActionPreference = "Stop"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " AUTOops Windows Docker Setup" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan

# Check if Docker is already installed
if (Get-Command docker -ErrorAction SilentlyContinue) {
    Write-Host "✅ Docker is already installed." -ForegroundColor Green
} else {
    Write-Host "Downloading Docker Desktop Installer..." -ForegroundColor Yellow
    $installerPath = "$env:TEMP\DockerDesktopInstaller.exe"
    Invoke-WebRequest -Uri "https://desktop.docker.com/win/main/amd64/Docker%20Desktop%20Installer.exe" -OutFile $installerPath

    Write-Host "Installing Docker Desktop (this may take a few minutes)..." -ForegroundColor Yellow
    # Standard quiet installation
    Start-Process -FilePath $installerPath -ArgumentList "install", "--quiet", "--accept-license" -Wait -NoNewWindow
    
    Write-Host "✅ Docker Desktop installed successfully." -ForegroundColor Green
    Write-Host "Note: You may need to restart your computer or start Docker Desktop manually from the Start menu." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host " NEXT STEPS TO DEPLOY YOUR APP" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "1. Ensure Docker Desktop is running (check your system tray)." -ForegroundColor White
Write-Host "2. Open a new PowerShell window (to reload environment variables)." -ForegroundColor White
Write-Host "3. Clone your repository: git clone <YOUR_REPO_URL> AUTOops" -ForegroundColor White
Write-Host "4. cd AUTOops/infra" -ForegroundColor White
Write-Host "5. Copy the environment file:" -ForegroundColor White
Write-Host "   Copy-Item .env.example .env" -ForegroundColor Gray
Write-Host "6. Edit the .env file and insert your AWS + OpenAI keys." -ForegroundColor White
Write-Host "7. Build and run the containers:" -ForegroundColor White
Write-Host "   docker compose build" -ForegroundColor Gray
Write-Host "   docker compose up -d" -ForegroundColor Gray
Write-Host ""
Write-Host "Your system will be live!" -ForegroundColor Green
