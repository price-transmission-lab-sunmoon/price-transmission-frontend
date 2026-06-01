@echo off
REM build 모드 검증 단축 — tsc + vite build 후 preview 서빙.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0run.ps1" -Mode build
pause
