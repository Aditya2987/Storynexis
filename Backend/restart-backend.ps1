# Force restart backend with clean Python process

Write-Host "Stopping any running Python processes..." -ForegroundColor Yellow

# Kill any existing Python processes running main.py
Get-Process python* -ErrorAction SilentlyContinue | Where-Object {$_.Path -like "*venv_gpu*"} | Stop-Process -Force -ErrorAction SilentlyContinue

Start-Sleep -Seconds 2

Write-Host "Starting backend server..." -ForegroundColor Cyan

Set-Location d:\Story\Backend

# Start backend in a new clean process
& .\venv_gpu\Scripts\python.exe main.py
