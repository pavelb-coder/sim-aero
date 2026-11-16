@echo off
setlocal EnableExtensions
chcp 65001 >nul
title АэроЛаб
cd /d "%~dp0"

rem ───────────────────────────────────────────────────────────
rem  АэроЛаб — запуск на Windows
rem  Подхватывает Node.js (если есть) → иначе Python 3.
rem  Порт 8085 по умолчанию; если занят, Node сам возьмёт следующий
rem  (8086, 8087 … до 8095). Иначе задайте порт переменной PORT.
rem  Пример:  set PORT=8090 ^&^& run-windows.bat
rem ───────────────────────────────────────────────────────────

if not defined PORT set PORT=8085

echo ========================================
echo   АэроЛаб — виртуальная лаборатория
echo   http://localhost:%PORT%
echo ========================================

where node >nul 2>nul
if %errorlevel%==0 goto start_node

where py >nul 2>nul
if %errorlevel%==0 goto start_py

where python >nul 2>nul
if %errorlevel%==0 goto start_python

echo.
echo [АэроЛаб] Не найдены ни Node.js, ни Python 3.
echo Установите один из них:
echo   Node.js LTS : https://nodejs.org/
echo   Python 3    : https://www.python.org/downloads/  (при установке отметьте "Add python.exe to PATH")
echo После установки запустите run-windows.bat снова.
echo.
pause
exit /b 1

:start_node
echo Запускаю через Node.js (рекомендуется)...
start "" http://localhost:%PORT%
node server.js %PORT%
goto finish

:start_py
echo Node.js не найден — запускаю через Python 3 (py launcher)...
start "" http://localhost:%PORT%
py -3 -m http.server %PORT% --bind 0.0.0.0
goto finish

:start_python
echo Node.js не найден — запускаю через Python 3...
start "" http://localhost:%PORT%
python -m http.server %PORT% --bind 0.0.0.0
goto finish

:finish
echo.
echo АэроЛаб остановлен. Закройте окно двойного щелчка или нажмите любую клавишу.
pause >nul
endlocal
exit /b 0
