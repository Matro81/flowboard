$root = $PSScriptRoot
$agentDir = Join-Path $root "agent"
$frontendDir = Join-Path $root "frontend"

Write-Host "Starting Flowboard Backend (:8101)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$agentDir'; .\.venv\Scripts\uvicorn.exe flowboard.main:app --reload --port 8101 --timeout-graceful-shutdown 2"

Write-Host "Starting Flowboard Frontend (:5173)..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location -LiteralPath '$frontendDir'; npm run dev"

Start-Sleep -Seconds 2
Start-Process "http://localhost:5173"
