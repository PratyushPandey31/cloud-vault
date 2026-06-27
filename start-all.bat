@echo off
echo =================================================================
echo        HYBRID CRYPTOGRAPHY MULTI-TENANT STORAGE SYSTEM
echo =================================================================
echo.
echo Launching Backend Database Server (Express + SQLite)...
start cmd /k "cd backend && npm run dev"

echo Launching Frontend Web Client (Vite + React)...
start cmd /k "cd frontend && npm run dev"

echo.
echo =================================================================
echo [SUCCESS] Both servers are starting up in separate consoles.
echo.
echo 1. The Backend API will be active on http://localhost:5000
echo 2. The Frontend UI will open shortly on http://localhost:5173
echo =================================================================
echo.
pause
