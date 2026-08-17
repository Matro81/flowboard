@echo off
title Flowboard Starter
cd /d "%~dp0"

echo Starting Flowboard Backend (:8101)...
start "Flowboard Backend Agent" /D "%~dp0agent" cmd /k ".venv\Scripts\uvicorn.exe flowboard.main:app --reload --port 8101 --timeout-graceful-shutdown 2"

echo Starting Flowboard Frontend (:5173)...
start "Flowboard Frontend UI" /D "%~dp0frontend" cmd /k "npm run dev"

echo.
echo Both servers started!
ping 127.0.0.1 -n 3 >nul
start http://localhost:5173
