@echo off
setlocal
set "LOCALCUT_HOME=%~dp0"
set "TEMP=%~dp0cache"
set "TMP=%TEMP%"
set "HF_HOME=%~dp0cache\huggingface"
set "PUPPETEER_CACHE_DIR=%~dp0cache\browser"
if not exist "%~dp0runtime\node.exe" exit /b 2
if not exist "%~dp0app\launcher.cjs" exit /b 3
if not exist "%~dp0data\logs" mkdir "%~dp0data\logs"
cd /d "%~dp0"
"%~dp0runtime\node.exe" "%~dp0app\launcher.cjs" >> "%~dp0data\logs\launcher.log" 2>&1
exit /b %errorlevel%
