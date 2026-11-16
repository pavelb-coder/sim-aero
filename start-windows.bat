@echo off
chcp 65001 >nul
setlocal EnableExtensions EnableDelayedExpansion
cd /d "%~dp0"
if "%PORT%"=="" set PORT=8085
set URL=http://localhost:%PORT%

echo ==================================================
echo   АэроЛаб — %URL%
echo ==================================================

rem [1] Node.js работает? (проверяем именно запуск, а не только путь)
node --version >nul 2>nul
if %ERRORLEVEL%==0 goto run_node

rem [2] winget установлен? Предложим поставить Node.js LTS автоматически
where winget >nul 2>nul
if %ERRORLEVEL%==0 goto offer_winget

rem [3] Python 3? (py launcher или python.exe, проверяем реальный запуск)
py -3 --version >nul 2>nul
if %ERRORLEVEL%==0 goto run_py
python --version >nul 2>nul
if %ERRORLEVEL%==0 goto run_python

echo.
echo [АэроЛаб] Не найдены ни Node.js, ни Python 3.
echo Установите Node.js LTS:
echo   winget install OpenJS.NodeJS.LTS   или   https://nodejs.org/
echo.
pause
exit /b 1

:offer_winget
echo.
echo [АэроЛаб] Node.js не найден.
choice /c YN /m "Установить Node.js LTS автоматически через winget?"
if %ERRORLEVEL%==2 goto check_python_only
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
echo.
echo [АэроЛаб] Установка завершена, ищу node...
set "FOUND_NODE="
for %%D in ("%LOCALAPPDATA%\Microsoft\WinGet\Links\node.exe" "%ProgramFiles%\nodejs\node.exe" "%ProgramFiles(x86)%\nodejs\node.exe" "%LOCALAPPDATA%\Programs\nodejs\node.exe") do (
  if exist "%%~D" set "FOUND_NODE=%%~D"
)
if defined FOUND_NODE (
  echo [АэроЛаб] Найден: "%FOUND_NODE%"
  "%FOUND_NODE%" server.js --open
  pause
  exit /b 0
)
echo [АэроЛаб] Node установился, но не виден этому окну.
echo Закройте окно и запустите start-windows.bat снова.
pause
exit /b 0

:check_python_only
py -3 --version >nul 2>nul
if %ERRORLEVEL%==0 goto run_py
python --version >nul 2>nul
if %ERRORLEVEL%==0 goto run_python
echo.
echo [АэроЛаб] Python тоже не найден.
echo Установите Node.js LTS: winget install OpenJS.NodeJS.LTS
echo.
pause
exit /b 1

:run_node
node server.js --open
pause
exit /b 0

:run_py
start "" "%URL%"
py -m http.server %PORT% --bind 0.0.0.0
pause
exit /b 0

:run_python
start "" "%URL%"
python -m http.server %PORT% --bind 0.0.0.0
pause
exit /b 0
