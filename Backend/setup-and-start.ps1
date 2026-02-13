# Quick fix script for backend dependencies and environment setup

Write-Host "StoryNexis Backend Setup" -ForegroundColor Cyan
Write-Host "================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Install python-dotenv
Write-Host "[1/3] Installing python-dotenv..." -ForegroundColor Yellow
Set-Location d:\Story\Backend
& .\venv_gpu\Scripts\pip.exe install python-dotenv

if ($LASTEXITCODE -ne 0) {
    Write-Host "ERROR: Failed to install python-dotenv" -ForegroundColor Red
    exit 1
}

Write-Host "SUCCESS: python-dotenv installed" -ForegroundColor Green
Write-Host ""

# Step 2: Create .env file if it doesn't exist
Write-Host "[2/3] Checking .env file..." -ForegroundColor Yellow
if (-Not (Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
    Write-Host "SUCCESS: .env file created from .env.example" -ForegroundColor Green
} else {
    Write-Host "SUCCESS: .env file already exists" -ForegroundColor Green
}

Write-Host ""
Write-Host "[3/3] Starting backend server..." -ForegroundColor Cyan
Write-Host ""

# Step 3: Start the backend
& .\venv_gpu\Scripts\python.exe main.py
