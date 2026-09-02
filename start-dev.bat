@echo off
echo ========================================================
echo   Starting Agaate Precision Agriculture Platform...
echo ========================================================
echo.

echo [1/3] Starting Docker services (MySQL + MinIO)...
docker compose up -d
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] Docker failed to start. Please make sure Docker Desktop is running.
    echo.
)

echo [2/3] Seeding demo database...
call npm run db:seed

echo.
echo [3/3] Launching Next.js Dev Server...
echo App will be live at: http://localhost:3000
echo.
call npm run dev
