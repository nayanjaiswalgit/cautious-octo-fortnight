#!/bin/bash

# Finance Tracker - One-Click Startup Script
echo "================================================"
echo "   🏦 Finance Tracker - One-Click Startup"
echo "================================================"
echo ""

# Check if Docker is running
if ! docker info >/dev/null 2>&1; then
    echo "❌ Docker is not running or not installed!"
    echo "Please start Docker and try again."
    exit 1
fi

echo "✅ Docker is running"
echo ""

# Check if docker-compose is available
if ! command -v docker-compose >/dev/null 2>&1; then
    echo "❌ Docker Compose is not available!"
    echo "Please install Docker Compose and try again."
    exit 1
fi

echo "✅ Docker Compose is available"
echo ""

echo "🚀 Starting Finance Tracker services..."
echo "This may take a few minutes on first run (downloading images)"
echo ""

# Start services in detached mode
docker-compose up -d

# Wait for services to be healthy
echo ""
echo "⏳ Waiting for services to start up..."
sleep 10

# Check service status
echo ""
echo "📊 Service Status:"
docker-compose ps

echo ""
echo "================================================"
echo "   🎉 Finance Tracker is now running!"
echo "================================================"
echo ""
echo "🌐 Frontend: http://localhost:3000"
echo "🔧 Backend API: http://localhost:8000/api/v1/"
echo "👑 Admin Panel: http://localhost:8000/admin/"
echo ""
echo "To stop the services, run: docker-compose down"
echo "To view logs, run: docker-compose logs -f"
echo ""

# Try to open browser (works on macOS and most Linux distributions)
if command -v open >/dev/null 2>&1; then
    echo "🔗 Opening browser..."
    open http://localhost:3000
elif command -v xdg-open >/dev/null 2>&1; then
    echo "🔗 Opening browser..."
    xdg-open http://localhost:3000
else
    echo "🔗 Please open http://localhost:3000 in your browser"
fi

echo ""
echo "Finance Tracker is ready to use! 🎉"