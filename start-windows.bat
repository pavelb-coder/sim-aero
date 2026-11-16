@echo off
setlocal EnableExtensions
cd /d "%~dp0"
if "%PORT%"=="" set PORT=8085
set URL=http://localhost:%PORT%

echo ==================================================
echo   AeroLab - %URL%
echo ==================================================

rem [1] Node.js works?
node --version >nul 2>nul
if %ERRORLEVEL%==0 goto run_node

rem [2] winget available? Offer automatic install of Node.js LTS
where winget >nul 2>nul
if %ERRORLEVEL%==0 goto offer_winget

rem [3] Python 3? (real check, not just path)
py -3 --version >nul 2>nul
if %ERRORLEVEL%==0 goto run_py
python --version >nul 2>nul
if %ERRORLEVEL%==0 goto run_python

echo.
echo [AeroLab] Not found: Node.js or Python 3.
echo Install Node.js LTS:
echo   winget install OpenJS.NodeJS.LTS   or   https://nodejs.org/
echo.
pause
exit /b 1

:offer_winget
echo.
echo [AeroLab] Node.js not found.
choice /c YN /m "Install Node.js LTS automatically via winget?"
if %ERRORLEVEL%==2 goto check_python_only
winget install -e --id OpenJS.NodeJS.LTS --accept-source-agreements --accept-package-agreements
echo.
echo [AeroLab] Install done, looking for node...
set "FOUND_NODE="
for %%D in ("%LOCALAPPDATA%\Microsoft\WinGet\Links\node.exe" "%ProgramFiles%\nodejs\node.exe" "%ProgramFiles(x86)%\nodejs\node.exe" "%LOCALAPPDATA%\Programs\nodejs\node.exe") do (
  if exist "%%~D" set "FOUND_NODE=%%~D"
)
if defined FOUND_NODE (
  echo [AeroLab] Found: "%FOUND_NODE%"
  "%FOUND_NODE%" server.js --open
  pause
  exit /b 0
)
echo [AeroLab] Node installed but not visible in this window.
echo Close this window and run start-windows.bat again.
pause
exit /b 0

:check_python_only
py -3 --version >nul 2>nul
if %ERRORLEVEL%==0 goto run_py
python --version >nul 2>nul
if %ERRORLEVEL%==0 goto run_python
echo.
echo [AeroLab] Python 3 also not found.
echo Install Node.js LTS: winget install OpenJS.NodeJS.LTS
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
