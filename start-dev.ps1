# Disha Dev Starter (no Docker) - Fixed for Windows/PowerShell
# Run with: powershell -ExecutionPolicy Bypass -File .\start-dev.ps1
# Starts Brain in background job (correct PYTHONPATH)
# Gives instructions for Web (best in separate terminal for logs)

Write-Host "=== Disha Manual Dev Starter (Windows, no Docker) ===" -ForegroundColor Cyan

# Set dev env vars (DB/Redis disabled for graceful fallback - see .env)
$env:DISHA_AUTH_MODE = "dev-jwt"
$env:DISHA_JWT_SECRET = "dev-jwt-secret-32chars-minimum-12345678901234567890"
$env:DISHA_DEV_PASSWORD = "devpassword123"
$env:DISHA_BRAIN_URL = "http://localhost:8080"
$env:DISHA_BRAIN_API_TOKEN = "change-me"
$env:NEXT_PUBLIC_APP_URL = "https://disha.production.example.com"
$env:DISHA_WORKSPACE_ROOT = ".."
$env:DISHA_ALLOWED_ORIGINS = "http://localhost:3000"

Write-Host "Env vars set for dev (DB/Redis disabled for graceful fallback)"

# Kill old
Get-Process node,python -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue

# Start Brain in background job - MUST run from root with PYTHONPATH for imports
Write-Host "`nStarting Brain (FastAPI + SQLite) in background..."
$brainJob = Start-Job -Name "DishaBrain" -ScriptBlock {
    cd $using:PWD
    $env:PYTHONPATH = "."
    $env:DISHA_BRAIN_API_TOKEN = "change-me"
    $env:DISHA_BRAIN_DB_PATH = "data/disha_brain.db"
    python -m uvicorn disha.brain.app:app --host 0.0.0.0 --port 8080
}
Write-Host "Brain job ID: $($brainJob.Id)  (use Get-Job to check / Receive-Job)"

Start-Sleep -Seconds 5

# Check brain
try {
    $health = Invoke-WebRequest -Uri "http://localhost:8080/api/v1/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "Brain health: OK" -ForegroundColor Green
    Write-Host $health.Content
} catch {
    Write-Host "Brain not ready yet. Check logs with: Receive-Job DishaBrain -Keep" -ForegroundColor Yellow
}

# Web instructions (run in NEW window for best logs - job version is limited)
Write-Host "`n=== NOW START THE WEB DEV SERVER (in a NEW PowerShell window) ===" -ForegroundColor Green
Write-Host "Copy-paste these exact lines in a new terminal:"
Write-Host ""
Write-Host "cd $PWD\web" -ForegroundColor Yellow
Write-Host '$env:DISHA_AUTH_MODE="dev-jwt"' -ForegroundColor Yellow
Write-Host '$env:DISHA_JWT_SECRET="dev-jwt-secret-32chars-minimum-12345678901234567890"' -ForegroundColor Yellow
Write-Host '$env:DISHA_DEV_PASSWORD="devpassword123"' -ForegroundColor Yellow
Write-Host '$env:DISHA_BRAIN_URL="http://localhost:8080"' -ForegroundColor Yellow
Write-Host '$env:DISHA_BRAIN_API_TOKEN="change-me"' -ForegroundColor Yellow
Write-Host '$env:NEXT_PUBLIC_APP_URL="https://disha.production.example.com"' -ForegroundColor Yellow
Write-Host '$env:DISHA_WORKSPACE_ROOT=".."' -ForegroundColor Yellow
Write-Host "npm run dev" -ForegroundColor Yellow
Write-Host ""
Write-Host "Then open http://localhost:3000" -ForegroundColor Cyan
Write-Host "Login with any email + password: devpassword123"

Write-Host "`nUseful commands (in this window):"
Write-Host "  Brain health: irm http://localhost:8080/api/v1/health"
Write-Host "  To stop everything: Get-Job | Stop-Job; Get-Job | Remove-Job"
Write-Host "  Check jobs/logs: Get-Job; Receive-Job DishaBrain -Keep"

Write-Host "`nCore flows should work (login + share URLs use production base)." -ForegroundColor Green
Write-Host "Run 'Receive-Job DishaBrain -Keep' to see brain startup logs." -ForegroundColor Yellow