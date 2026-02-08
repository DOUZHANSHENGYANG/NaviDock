param(
  [int]$Port = 9101,
  [switch]$SkipInstall,
  [switch]$NoKillPort,
  [switch]$DryRun
)

$ErrorActionPreference = 'Stop'
Set-StrictMode -Version Latest

function Write-Step {
  param([string]$Message)
  Write-Host "`n[STEP] $Message" -ForegroundColor Cyan
}

function Write-Info {
  param([string]$Message)
  Write-Host "[INFO] $Message" -ForegroundColor Gray
}

function Write-WarnMsg {
  param([string]$Message)
  Write-Host "[WARN] $Message" -ForegroundColor Yellow
}

function Stop-ProcessesUsingPort {
  param([int]$TargetPort)

  $connections = Get-NetTCPConnection -LocalPort $TargetPort -State Listen -ErrorAction SilentlyContinue
  if (-not $connections) {
    Write-Info "Port $TargetPort is free."
    return
  }

  $pids = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($pidItem in $pids) {
    if ($pidItem -eq $PID) { continue }

    try {
      $proc = Get-Process -Id $pidItem -ErrorAction Stop
      Write-WarnMsg ("Stopping PID {0} ({1}) using port {2}..." -f $proc.Id, $proc.ProcessName, $TargetPort)
      Stop-Process -Id $proc.Id -Force -ErrorAction Stop
    } catch {
      Write-WarnMsg "Failed to stop PID $pidItem. Continue anyway."
    }
  }
}

function Ensure-Command {
  param([string]$Name)
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "Command '$Name' not found. Please install it and retry."
  }
}

function Ensure-Dependencies {
  if (Test-Path -Path "node_modules") {
    Write-Info "node_modules exists, skip npm install."
    return
  }

  Write-Step "Installing npm dependencies..."
  npm install
}

try {
  $scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
  Set-Location $scriptRoot

  Write-Step "Checking required commands..."
  Ensure-Command -Name "npm"
  Ensure-Command -Name "npx"

  if (-not $NoKillPort) {
    Write-Step "Checking and cleaning dev port $Port..."
    Stop-ProcessesUsingPort -TargetPort $Port
  } else {
    Write-Info "Skip port cleanup by request."
  }

  if (-not $SkipInstall) {
    Ensure-Dependencies
  } else {
    Write-Info "Skip npm install by request."
  }

  if ($DryRun) {
    Write-Host "`n[DRY-RUN] Ready to run: npm run tauri:dev" -ForegroundColor Green
    exit 0
  }

  Write-Step "Launching NaviDock (tauri dev)..."
  npm run tauri:dev
} catch {
  Write-Host "`n[ERROR] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
