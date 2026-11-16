# АэроЛаб — запуск на Windows (PowerShell 5.1+, входит в Windows 10/11)
# Переходит в папку скрипта, ищет свободный порт (8085 → 8086 …),
# подхватывает Node.js → иначе Python 3 и открывает браузер.
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
    Write-Host "Порты $basePort..$Port заняты — закройте другой АэроЛаб или задайте PORT=8090" -ForegroundColor Red
    exit 1
  }
}
if ($Port -ne $basePort) { Write-Host "Порт $basePort занят — использую $Port" -ForegroundColor Yellow }

echo "──────────────────────────────────────"
echo "  АэроЛаб — http://localhost:$Port"
echo "  Ctrl+C останавливает стенд"
echo "──────────────────────────────────────"

$node = Get-Command node -ErrorAction SilentlyContinue
if ($node) {
  Write-Host "Запускаю через Node.js…" -ForegroundColor Green
  Start-Process "http://localhost:$Port"
  & node server.js $Port
  exit
}

$py = Get-Command py -ErrorAction SilentlyContinue
if (-not $py) { $py = Get-Command python -ErrorAction SilentlyContinue }
if ($py) {
  Write-Host "Node.js не найден — запускаю через Python 3…" -ForegroundColor Green
  Start-Process "http://localhost:$Port"
  if ($py.Name -eq 'py') { & py -3 -m http.server $Port --bind 0.0.0.0 }
  else { & python -m http.server $Port --bind 0.0.0.0 }
  exit
}

Write-Host "Не найдены ни Node.js, ни Python 3." -ForegroundColor Yellow
Write-Host "  Node.js LTS : https://nodejs.org/"
Write-Host "  Python 3    : https://www.python.org/downloads/  (в установщике отметьте «Add python.exe to PATH»)"
Read-Host "Нажмите Enter для выхода"
