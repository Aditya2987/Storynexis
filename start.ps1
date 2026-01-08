# Start both Backend and Frontend servers

Write-Host "Starting Story Generator with GPU Support..." -ForegroundColor Green

# Start Backend with GPU environment
Write-Host "`nStarting Backend Server (GPU)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\Backend'; .\venv_gpu\Scripts\activate; python main.py"

# Wait a moment for backend to start
Start-Sleep -Seconds 2

# Start Frontend
Write-Host "Starting Frontend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\Frontend'; npm run dev"

Write-Host "`nServers are starting..." -ForegroundColor Green
Write-Host "Backend (GPU): http://localhost:8000" -ForegroundColor Yellow
Write-Host "Frontend: http://localhost:5173" -ForegroundColor Yellow
Write-Host "`nYour RTX 3050 GPU will accelerate generation 5-10x faster!" -ForegroundColor Magenta
Write-Host "`nPress any key to close this window..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
