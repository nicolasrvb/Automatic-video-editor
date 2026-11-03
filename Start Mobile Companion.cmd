@echo off
setlocal
cd /d "%~dp0"
if not defined LOCALCUT_HOME set "LOCALCUT_HOME=D:\LocalCut Studio"
set "LOCALCUT_DATA=%LOCALCUT_HOME%\data"
set "NODE_PATH=%LOCALCUT_HOME%\node_modules"
set "LOCALCUT_INSTANCE=mobile"
set "LOCALCUT_COMPANION=1"
set "LOCALCUT_PORT=8789"
"%LOCALCUT_HOME%\runtime\node.exe" app\launcher.cjs --no-browser
if errorlevel 1 pause
