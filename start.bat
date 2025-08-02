@echo off
echo.
echo ================================================
echo   🏦 Finance Tracker - One-Click Startup
echo ================================================
echo.

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running or not installed!
    echo Please start Docker Desktop and try again.
    pause
    exit /b 1
)

echo ✅ Docker is running
echo.

REM Check if docker-compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not available!
    echo Please install Docker Compose and try again.
    pause
    exit /b 1
)

echo ✅ Docker Compose is available
echo.

echo 🚀 Starting Finance Tracker services...
echo This may take a few minutes on first run (downloading images)
echo.

REM Start services in detached mode
docker-compose up -d

REM Wait for services to be healthy
echo.
echo ⏳ Waiting for services to start up...
timeout /t 10 /nobreak >nul

REM Check service status
echo.
echo 📊 Service Status:
docker-compose ps

echo.
echo ================================================
echo   🎉 Finance Tracker is now running!
echo ================================================
echo.
echo 🌐 Frontend: http://localhost:3000
echo 🔧 Backend API: http://localhost:8000/api/v1/
echo 👑 Admin Panel: http://localhost:8000/admin/
echo.
echo To stop the services, run: docker-compose down
echo To view logs, run: docker-compose logs -f
echo.

REM Open browser automatically
echo 🔗 Opening browser...
start http://localhost:3000

echo.
echo Press any key to exit this window...
pause >nul