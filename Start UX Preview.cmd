@echo off
setlocal
set "LOCALCUT_HOME=D:\LocalCut Studio"
set "LOCALCUT_DATA=%~dp0.localcut-preview"
set "LOCALCUT_PORT=8788"
set "NODE_PATH=%LOCALCUT_HOME%\node_modules"
set "TEMP=%LOCALCUT_HOME%\cache"
set "TMP=%TEMP%"
cd /d "%~dp0"
"%LOCALCUT_HOME%\runtime\node.exe" "%~dp0tools\prepare-preview.cjs"
if errorlevel 1 exit /b 1
"%LOCALCUT_HOME%\runtime\node.exe" "%~dp0app\launcher.cjs"
