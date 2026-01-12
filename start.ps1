# ===================================================
# StoryNexis - GPU-Accelerated Story Generator
# Startup Script
# ===================================================

$ErrorActionPreference = "Continue"

# ASCII Art Banner
Write-Host ""
Write-Host "  =======================================" -ForegroundColor Magenta
Write-Host "       StoryNexis AI Generator" -ForegroundColor Magenta
Write-Host "       GPU-Accelerated Edition" -ForegroundColor Magenta
Write-Host "  =======================================" -ForegroundColor Magenta
Write-Host ""

# Check if port is in use
function Test-PortInUse {
    param([int]$Port)
    try {
        $connection = New-Object System.Net.Sockets.TcpClient
        $connection.Connect("127.0.0.1", $Port)
        $connection.Close()
        return $true
    } catch {
        return $false
    }
}

# Check prerequisites
Write-Host "Checking prerequisites..." -ForegroundColor Cyan

# Check if Backend venv exists
if (-not (Test-Path "$PSScriptRoot\Backend\venv_gpu\Scripts\activate")) {
    Write-Host "  ERROR: Backend virtual environment not found!" -ForegroundColor Red
    Write-Host "  Please run: cd Backend && python -m venv venv_gpu" -ForegroundColor Yellow
    exit 1
}
Write-Host "  Backend virtual environment found" -ForegroundColor Green

# Check if node_modules exists
if (-not (Test-Path "$PSScriptRoot\Frontend\node_modules")) {
    Write-Host "  Frontend dependencies not installed" -ForegroundColor Yellow
    Write-Host "  Installing npm packages..." -ForegroundColor Cyan
    Push-Location "$PSScriptRoot\Frontend"
    npm install
    Pop-Location
}
Write-Host "  Frontend dependencies ready" -ForegroundColor Green

Write-Host ""
Write-Host "Starting servers..." -ForegroundColor Cyan

# Start Backend Server
Write-Host "  Starting Backend Server (with GPU)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\Backend'; .\venv_gpu\Scripts\activate; python main.py"

# Wait for backend
Write-Host "  Waiting for backend to initialize..." -ForegroundColor Gray
Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host "  Starting Frontend Server..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\Frontend'; npm run dev"

# Wait for frontend
Start-Sleep -Seconds 2

Write-Host ""
Write-Host "=======================================" -ForegroundColor Magenta
Write-Host ""
Write-Host "  Servers are starting!" -ForegroundColor Green
Write-Host ""
Write-Host "  Frontend:  http://localhost:5173" -ForegroundColor Cyan
Write-Host "  Backend:   http://localhost:8000" -ForegroundColor Cyan
Write-Host "  API Docs:  http://localhost:8000/docs" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Your RTX GPU will accelerate story generation!" -ForegroundColor Magenta
Write-Host ""
Write-Host "=======================================" -ForegroundColor Magenta
Write-Host ""

# Open browser
Write-Host "  Opening browser..." -ForegroundColor Cyan
Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"

Write-Host ""
Write-Host "Press any key to close this window..." -ForegroundColor Gray
Write-Host "(Servers will keep running in their own windows)" -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
