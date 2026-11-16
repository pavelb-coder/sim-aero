# АэроЛаб — запуск на Windows (PowerShell 5.1+, входит в Windows 10/11)
# Ищет свободный порт (8085 → 8086 …), Node.js (предлагает поставить через winget),
# иначе Python 3, открывает браузер.
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

$Port = 8085
if ($env:PORT) { $Port = [int]$env:PORT }

function Test-PortFree([int]$p) {
  $listener = $null
  try {
    $listener = New-Object System.Net.Sockets.TcpListener([System.Net.IPAddress]::Any, $p)
    $listener.Start()
    return $true
  } catch {
    return $false
  } finally {
    if ($listener) { $listener.Stop() }
  }
}

$basePort = $Port
while (-not (Test-PortFree $Port)) {
  $Port++
  if ($Port -gt ($basePort + 10)) {
    Write-Host "Порты $basePort..$Port заняты — закройте другой АэроЛаб или задайте PORT=8096" -ForegroundColor Red
    exit 1
  }
}
if ($Port -ne $basePort) { Write-Host "Порт $basePort занят — использую $Port" -ForegroundColor Yellow }

Write-Host "──────────────────────────────────────"
Write-Host "  АэроЛаб — http://localhost:$Port"
Write-Host "  Ctrl+C останавливает стенд"
Write-Host "──────────────────────────────────────"

function Find-Node {
  $cmd = Get-Command node -ErrorAction SilentlyContinue
  if ($cmd -and $cmd.Source) {
    try { & $cmd.Source --version | Out-Null; return $cmd.Source } catch { return $null }
  }
  $candidates = @(
    "$env:LOCALAPPDATA\Microsoft\WinGet\Links\node.exe",
    "$env:ProgramFiles\nodejs\node.exe",
    "${env:ProgramFiles(x86)}\nodejs\node.exe",
    "$env:LOCALAPPDATA\Programs\nodejs\node.exe"
  )
  foreach ($c in $candidates) {
    if (Test-Path $c) { try { & $c --version | Out-Null; return $c } catch { } }
  }
  return $null
}

function Find-Python {
  $py = Get-Command py -ErrorAction SilentlyContinue
  if ($py) {
    try { & py -3 --version | Out-Null; return 'py' } catch { }
  }
  $python = Get-Command python -ErrorAction SilentlyContinue
  if ($python) {
    try { & python --version | Out-Null; return 'python' } catch { }
  }
  return $null
}

# 1. Готовый Node.js?
$nodeExe = Find-Node
# 2. Нет Node — предложим поставить через winget
if (-not $nodeExe -and (Get-Command winget -ErrorAction SilentlyContinue)) {
  Write-Host "Node.js не найден." -ForegroundColor Yellow
  $answer = Read-Host "Установить Node.js LTS автоматически через winget? [Y/N]"
  if ($answer -match '^(y|д)') {
    winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
    $nodeExe = Find-Node
    if (-not $nodeExe) {
      Write-Host "Node.js установлен, но не виден этому окну. Закройте и запустите start-windows.ps1 снова." -ForegroundColor Yellow
      Read-Host "Нажмите Enter для выхода"
      exit
    }
  }
}
if ($nodeExe) {
  Write-Host "Запускаю через Node.js: $nodeExe" -ForegroundColor Green
  Start-Process "http://localhost:$Port"
  & $nodeExe server.js $Port
  exit
}

# 3. Python 3?
$pyKind = Find-Python
if ($pyKind) {
  Write-Host "Node.js не найден — запускаю через Python 3…" -ForegroundColor Green
  Start-Process "http://localhost:$Port"
  if ($pyKind -eq 'py') { & py -3 -m http.server $Port --bind 0.0.0.0 } else { & python -m http.server $Port --bind 0.0.0.0 }
  exit
}

Write-Host "Не найдены ни Node.js, ни Python 3." -ForegroundColor Yellow
Write-Host "  winget install OpenJS.NodeJS.LTS"
Write-Host "  Node.js LTS : https://nodejs.org/"
Write-Host "  Python 3    : https://www.python.org/downloads/  (в установщике отметьте «Add python.exe to PATH»)"
Read-Host "Нажмите Enter для выхода"
