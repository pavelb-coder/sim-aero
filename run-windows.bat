@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo ========================================
echo   АэроЛаб — http://localhost:8084
echo   Закрытие окна останавливает стенд
echo ========================================
start "" http://localhost:8084
where py >nul 2>nul
if %errorlevel%==0 (
  py -3 -m http.server 8084 --bind 0.0.0.0
) else (
  python -m http.server 8084 --bind 0.0.0.0
)
pause
