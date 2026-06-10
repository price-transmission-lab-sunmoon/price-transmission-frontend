@echo off
REM 더블클릭 진입점 — dev 모드로 부트스트랩 후 실행.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" %*
if errorlevel 1 pause
