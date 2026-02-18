#!/bin/bash
set -e

# Script to initialize development environment for Budget App
# This script sets up everything needed to start development

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "🚀 Initializing Budget App Development Environment"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check Docker
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed"
  echo "   Please install Docker Desktop: https://www.docker.com/products/docker-desktop/"
  exit 1
fi
echo "✅ Docker installed: $(docker --version)"

# Check Docker Compose
if ! docker compose version &> /dev/null; then
  echo "❌ Docker Compose is not installed or not available"
  exit 1
fi
echo "✅ Docker Compose installed: $(docker compose version)"

# Check Node.js (optional for local development)
if command -v node &> /dev/null; then
  echo "✅ Node.js installed: $(node --version)"
else
  echo "⚠️  Node.js not installed (optional for local development)"
fi

echo ""

# Generate secrets if they don't exist
if [[ ! -d "$PROJECT_ROOT/secrets/development" ]] || [[ ! -f "$PROJECT_ROOT/secrets/development/jwt_secret.txt" ]]; then
  echo "🔐 Generating development secrets..."
  echo ""
  bash "$SCRIPT_DIR/generate-keys.sh" development
  echo ""
else
  echo "✅ Development secrets already exist"
  echo ""
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p "$PROJECT_ROOT/backend/logs"
mkdir -p "$PROJECT_ROOT/backend/uploads"
mkdir -p "$PROJECT_ROOT/docker/ssl"
echo "✅ Directories created"
echo ""

# Start Docker containers
echo "🐳 Starting Docker containers..."
echo ""
cd "$PROJECT_ROOT"
docker compose -f docker/docker-compose.dev.yml up -d

echo ""
echo "⏳ Waiting for services to be ready..."
echo ""

# Wait for database to be ready
echo "Waiting for MariaDB..."
max_attempts=30
attempt=0
until docker compose -f docker/docker-compose.dev.yml exec -T mariadb mysql -u budget_user -pdev_pass -e "SELECT 1" &> /dev/null; do
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "❌ MariaDB failed to start after $max_attempts attempts"
    echo ""
    echo "Check logs with: docker compose -f docker/docker-compose.dev.yml logs mariadb"
    exit 1
  fi
  echo "  Attempt $attempt/$max_attempts..."
  sleep 2
done
echo "✅ MariaDB is ready"
echo ""

# Wait for backend to be ready
echo "Waiting for backend..."
max_attempts=30
attempt=0
until curl -f http://localhost:3001/health &> /dev/null; do
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "❌ Backend failed to start after $max_attempts attempts"
    echo ""
    echo "Check logs with: docker compose -f docker/docker-compose.dev.yml logs backend"
    exit 1
  fi
  echo "  Attempt $attempt/$max_attempts..."
  sleep 2
done
echo "✅ Backend is ready"
echo ""

# Wait for frontend to be ready
echo "Waiting for frontend..."
max_attempts=30
attempt=0
until curl -f http://localhost:3000 &> /dev/null; do
  attempt=$((attempt + 1))
  if [ $attempt -eq $max_attempts ]; then
    echo "❌ Frontend failed to start after $max_attempts attempts"
    echo ""
    echo "Check logs with: docker compose -f docker/docker-compose.dev.yml logs frontend"
    exit 1
  fi
  echo "  Attempt $attempt/$max_attempts..."
  sleep 2
done
echo "✅ Frontend is ready"
echo ""

# Display service status
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "✅ Development environment initialized successfully!"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "🌐 Services running:"
echo "   Frontend:  http://localhost:3000"
echo "   Backend:   http://localhost:3001"
echo "   Health:    http://localhost:3001/health"
echo ""
echo "🗄️  Database access:"
echo "   Host:      localhost"
echo "   Port:      3306"
echo "   Database:  budget_app"
echo "   User:      budget_user"
echo "   Password:  dev_pass"
echo ""
echo "📦 Redis access:"
echo "   Host:      localhost"
echo "   Port:      6379"
echo ""
echo "🔧 Useful commands:"
echo "   View logs:        docker compose -f docker/docker-compose.dev.yml logs -f"
echo "   Stop services:    docker compose -f docker/docker-compose.dev.yml down"
echo "   Restart services: docker compose -f docker/docker-compose.dev.yml restart"
echo "   Shell (backend):  docker compose -f docker/docker-compose.dev.yml exec backend sh"
echo "   Database shell:   docker compose -f docker/docker-compose.dev.yml exec mariadb mysql -u budget_user -pdev_pass budget_app"
echo ""
echo "📚 Documentation:"
echo "   Getting Started: docs/developer/getting-started.md"
echo "   API Docs:        http://localhost:3001/api-docs (coming soon)"
echo ""
echo "🎉 Happy coding!"
echo ""
