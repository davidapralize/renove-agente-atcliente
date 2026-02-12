Write-Host "Starting Renove Chatbot Backend..." -ForegroundColor Green
Write-Host ""

if (-not (Test-Path ".env")) {
    Write-Host "Error: .env file not found!" -ForegroundColor Red
    Write-Host "Please copy .env.example to .env and configure it" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Quick setup:" -ForegroundColor Cyan
    Write-Host "  1. Copy-Item .env.example .env" -ForegroundColor White
    Write-Host "  2. Edit .env and add your OPENAI_API_KEY" -ForegroundColor White
    Write-Host "  3. Run: python test_openai.py (to verify)" -ForegroundColor White
    Write-Host ""
    Write-Host "Note: This app uses the modern Responses API" -ForegroundColor Cyan
    Write-Host "      No assistant creation needed!" -ForegroundColor Cyan
    Write-Host ""
    pause
    exit 1
}

if (-not (Test-Path "venv")) {
    Write-Host "Creating virtual environment..." -ForegroundColor Yellow
    python -m venv venv
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error creating virtual environment" -ForegroundColor Red
        pause
        exit 1
    }
}

Write-Host "Activating virtual environment..." -ForegroundColor Yellow
& .\venv\Scripts\Activate.ps1

Write-Host "Installing dependencies..." -ForegroundColor Yellow
pip install -r requirements.txt --quiet
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error installing dependencies" -ForegroundColor Red
    pause
    exit 1
}

Write-Host ""
Write-Host "Checking setup..." -ForegroundColor Yellow
python check_setup.py
Write-Host ""

Write-Host "Starting SocketIO server on http://localhost:5000 ..." -ForegroundColor Green
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""
python socketio_app.py
