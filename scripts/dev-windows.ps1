param(
  [switch]$Install,
  [switch]$EnableRedis
)

$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $root ".env"

if (-not (Test-Path $envFile)) {
  Copy-Item (Join-Path $root ".env.example") $envFile
  Write-Host "Created .env from .env.example. Set AUTH_SECRET, DATABASE_URL, and any LLM API key, then run this script again." -ForegroundColor Yellow
  exit 1
}

# Load the simple KEY=value format used by .env into this PowerShell process.
Get-Content $envFile | ForEach-Object {
  $line = $_.Trim()
  if ($line -and -not $line.StartsWith("#") -and $line -match "^([A-Za-z_][A-Za-z0-9_]*)=(.*)$") {
    $key = $Matches[1]
    $value = $Matches[2].Trim()
    if (($value.StartsWith('"') -and $value.EndsWith('"')) -or ($value.StartsWith("'") -and $value.EndsWith("'"))) {
      $value = $value.Substring(1, $value.Length - 2)
    }
    [Environment]::SetEnvironmentVariable($key, $value, "Process")
  }
}

if (-not $EnableRedis) {
  $env:REDIS_ENABLED = "false"
  Write-Host "Redis disabled for Docker-free mode. Stream-based delegation is unavailable." -ForegroundColor Yellow
} else {
  $env:REDIS_ENABLED = "true"
}

if (-not (Get-Command pnpm -ErrorAction SilentlyContinue)) {
  throw "pnpm is not installed. Install Node.js 22+ and pnpm 10+ first."
}
if (-not (Get-Command python -ErrorAction SilentlyContinue)) {
  throw "Python is not installed or not on PATH. Install Python 3.12+ first."
}

if ($Install) {
  Push-Location $root
  try {
    pnpm install --no-frozen-lockfile
    if ($LASTEXITCODE -ne 0) { throw "pnpm install failed." }
  } finally {
    Pop-Location
  }

  $agentDir = Join-Path $root "apps\agent-service"
  $venvPython = Join-Path $agentDir ".venv\Scripts\python.exe"
  if (-not (Test-Path $venvPython)) {
    python -m venv (Join-Path $agentDir ".venv")
    if ($LASTEXITCODE -ne 0) { throw "Could not create the agent-service virtual environment." }
  }
  & $venvPython -m pip install -r (Join-Path $agentDir "requirements.txt")
  if ($LASTEXITCODE -ne 0) { throw "Installing agent-service Python dependencies failed." }
}

$apiDir = Join-Path $root "apps\api"
$webDir = Join-Path $root "apps\web"
$agentDir = Join-Path $root "apps\agent-service"
$desktopDir = Join-Path $root "apps\desktop-agent"
$venvPython = Join-Path $agentDir ".venv\Scripts\python.exe"

if (-not (Test-Path (Join-Path $root "node_modules"))) {
  throw "Workspace dependencies are missing. Run .\scripts\dev-windows.ps1 -Install first."
}
if (-not (Test-Path $venvPython)) {
  throw "Agent-service Python environment is missing. Run .\scripts\dev-windows.ps1 -Install first."
}

# Avoid Next silently selecting another port and colliding with the API.
$conflicts = @()
foreach ($port in @(3000, 3001, 8000)) {
  $listeners = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
  foreach ($listener in $listeners) {
    $processName = "unknown"
    try { $processName = (Get-Process -Id $listener.OwningProcess -ErrorAction Stop).ProcessName } catch {}
    $conflicts += "port $port ($processName, PID $($listener.OwningProcess))"
  }
}
if ($conflicts.Count -gt 0) {
  throw "Required ports are already in use: $($conflicts -join ', '). Close the owning apps (including Docker Desktop if it is holding a port) and rerun. Do not terminate an unknown process blindly."
}

$apiCommand = 'Set-Location "' + $root + '"; pnpm --filter @ai-teammates/api build; if ($LASTEXITCODE -eq 0) { pnpm --filter @ai-teammates/api start }'
$webCommand = 'Set-Location "' + $root + '"; pnpm --filter @ai-teammates/web dev'
$agentCommand = 'Set-Location "' + $agentDir + '"; & "' + $venvPython + '" -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000'

Start-Process powershell.exe -WorkingDirectory $root -ArgumentList @("-NoExit", "-Command", $apiCommand)
Start-Process powershell.exe -WorkingDirectory $root -ArgumentList @("-NoExit", "-Command", $webCommand)
Start-Process powershell.exe -WorkingDirectory $agentDir -ArgumentList @("-NoExit", "-Command", $agentCommand)

$deviceToken = [Environment]::GetEnvironmentVariable("DEVICE_TOKEN", "Process")
if (-not [string]::IsNullOrWhiteSpace($deviceToken)) {
  $desktopCommand = 'Set-Location "' + $root + '"; pnpm --filter @ai-teammates/desktop-agent start'
  Start-Process powershell.exe -WorkingDirectory $root -ArgumentList @("-NoExit", "-Command", $desktopCommand)
  Write-Host "Desktop agent started (local DEVICE_TOKEN was configured)." -ForegroundColor Green
} else {
  Write-Host "Desktop agent not started because DEVICE_TOKEN is empty in .env." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Started API, web, and agent-service in separate PowerShell windows." -ForegroundColor Green
Write-Host "Web: http://localhost:3000"
Write-Host "API health: http://localhost:3001/api/health"
Write-Host "Agent service health: http://localhost:8000/health"
Write-Host "PostgreSQL with pgvector must already be running and the schema must be applied."
Write-Host "The Docker-based sandbox worker is intentionally not started."
