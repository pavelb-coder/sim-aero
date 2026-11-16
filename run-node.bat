@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   АэроЛаб — http://localhost:8085 (Node.js)
echo   Закрытие окна останавливает стенд
echo ========================================
start "" http://localhost:8085
where node >nul 2>nul
if %errorlevel%==0 (
  node server.js
) else (
  echo Node.js не найден — запускаю через Python 3...
  where py >nul 2>nul
  if %errorlevel%==0 (
    py -3 -m http.server 8085 --bind 0.0.0.0
  ) else (
    python -m http.server 8085 --bind 0.0.0.0
  )
)
pause
