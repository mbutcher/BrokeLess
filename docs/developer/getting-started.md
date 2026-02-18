# Getting Started with Budget App Development

This guide will help you set up your development environment and start contributing to the Budget App project.

## Prerequisites

### Required Software
- **Docker Desktop** (4.x or later) - [Download](https://www.docker.com/products/docker-desktop/)
- **Node.js** (20.x or later) - [Download](https://nodejs.org/)
- **Git** - [Download](https://git-scm.com/downloads)
- **Code Editor** - We recommend [VS Code](https://code.visualstudio.com/)

### Optional But Recommended
- **Postman** or **Insomnia** - For API testing
- **DBeaver** or **TablePlus** - For database management
- **Redis Insight** - For Redis debugging

### System Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Disk Space**: 10GB free space
- **OS**: macOS, Linux, or Windows with WSL2

## Initial Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd BudgetApp
```

### 2. Generate Development Secrets

The application requires encryption keys and secrets. Generate them with:

```bash
./scripts/setup/generate-keys.sh development
```

This creates:
- Database passwords
- JWT signing secrets
- Encryption master keys
- Password pepper
- All necessary environment files

**Important**: These secrets are git-ignored and never committed to version control.

### 3. Initialize Development Environment

Run the initialization script:

```bash
./scripts/setup/init-dev.sh
```

This will:
- Verify prerequisites are installed
- Create development `.env` files
- Start Docker containers
- Wait for database to be ready
- Run database migrations
- Seed initial data (categories, sample users)

### 4. Verify Installation

Check that all services are running:

```bash
docker-compose -f docker/docker-compose.dev.yml ps
```

You should see:
- `budget_backend_dev` (running)
- `budget_frontend_dev` (running)
- `budget_mariadb_dev` (running)
- `budget_redis_dev` (running)

### 5. Access the Application

- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001
- **API Documentation**: http://localhost:3001/api-docs (Swagger UI)
- **MariaDB**: localhost:3306 (user: `budget_user`, password: see `secrets/development/db_password.txt`)
- **Redis**: localhost:6379

## Development Workflow

### Starting the Development Environment

```bash
# Start all containers
docker-compose -f docker/docker-compose.dev.yml up -d

# View logs
docker-compose -f docker/docker-compose.dev.yml logs -f

# View specific service logs
docker-compose -f docker/docker-compose.dev.yml logs -f backend
```

### Stopping the Development Environment

```bash
# Stop all containers
docker-compose -f docker/docker-compose.dev.yml down

# Stop and remove volumes (fresh start)
docker-compose -f docker/docker-compose.dev.yml down -v
```

### Hot Reload

Both frontend and backend support hot reload:

- **Backend**: Uses nodemon to watch for TypeScript file changes
- **Frontend**: Uses Vite HMR for instant updates

Simply edit files and changes will automatically reload.

### Running Backend Locally (Outside Docker)

For faster iteration, you can run the backend directly:

```bash
cd backend
npm install
npm run dev
```

Make sure to update the database host in your local `.env`:
```env
DB_HOST=localhost
```

### Running Frontend Locally (Outside Docker)

```bash
cd frontend
npm install
npm run dev
```

## Database Management

### Accessing the Database

```bash
# Via Docker
docker exec -it budget_mariadb_dev mysql -u budget_user -p budget_app

# Via local MySQL client
mysql -h localhost -P 3306 -u budget_user -p budget_app
```

### Running Migrations

```bash
# Run all pending migrations
docker-compose -f docker/docker-compose.dev.yml exec backend npm run migrate

# Rollback last migration
docker-compose -f docker/docker-compose.dev.yml exec backend npm run migrate:rollback

# Create new migration
docker-compose -f docker/docker-compose.dev.yml exec backend npm run migrate:make <migration_name>
```

### Seeding Data

```bash
# Run all seeds
docker-compose -f docker/docker-compose.dev.yml exec backend npm run seed

# Reset database and re-seed
./scripts/dev/reset-db.sh
```

### Viewing Database

Use a GUI client like DBeaver:
- Host: `localhost`
- Port: `3306`
- Database: `budget_app`
- User: `budget_user`
- Password: (from `secrets/development/db_password.txt`)

## Testing

### Backend Tests

```bash
cd backend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- TransferLinkingService.test.ts

# Run in watch mode
npm test -- --watch
```

### Frontend Tests

```bash
cd frontend

# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode
npm test -- --watch
```

### E2E Tests

```bash
# Run E2E tests (requires services running)
npm run test:e2e

# Run in headed mode (see browser)
npm run test:e2e:headed

# Run specific test
npm run test:e2e -- tests/auth.spec.ts
```

## Code Quality

### Linting

```bash
# Backend
cd backend && npm run lint

# Frontend
cd frontend && npm run lint

# Auto-fix
cd backend && npm run lint:fix
```

### Type Checking

```bash
# Backend
cd backend && npm run type-check

# Frontend
cd frontend && npm run type-check
```

### Formatting

We use Prettier for code formatting:

```bash
# Check formatting
npm run format:check

# Auto-format
npm run format
```

## Debugging

### Backend Debugging

The backend runs with debugger enabled on port 9229.

**VS Code Launch Configuration**:
```json
{
  "type": "node",
  "request": "attach",
  "name": "Attach to Backend",
  "port": 9229,
  "restart": true,
  "skipFiles": ["<node_internals>/**"]
}
```

Set breakpoints in VS Code and attach the debugger.

### Frontend Debugging

Use browser DevTools:
- React DevTools extension
- Redux DevTools (for state inspection)
- Network tab for API calls

### Database Debugging

Enable query logging:
```sql
-- In MariaDB console
SET GLOBAL general_log = 'ON';
SET GLOBAL log_output = 'TABLE';

-- View logs
SELECT * FROM mysql.general_log ORDER BY event_time DESC LIMIT 100;
```

## Common Development Tasks

### Adding a New API Endpoint

1. Define route in `backend/src/routes/`
2. Create controller in `backend/src/controllers/`
3. Add service logic in `backend/src/services/`
4. Create repository method if needed
5. Add validation schema in `backend/src/validators/`
6. Update OpenAPI spec in `docs/openapi/paths/`
7. Write tests
8. Update documentation

### Adding a New Frontend Component

1. Create component in appropriate feature directory
2. Add to component export
3. Create Storybook story (if reusable)
4. Write tests
5. Update documentation

### Creating a Database Migration

```bash
cd backend
npm run migrate:make create_table_name

# Edit the migration file in backend/src/database/migrations/
# Run migration
npm run migrate
```

### Adding Encryption to a Field

1. Update model to mark field as encrypted
2. Add field to `ENCRYPTED_FIELDS` in `backend/src/config/encryption.ts`
3. Update repository to use encryption service
4. Create migration to encrypt existing data
5. Test encryption/decryption

### Understanding Nginx Configuration

The project uses **two separate Nginx configurations** for different purposes:

#### 1. Reverse Proxy (`docker/nginx/nginx.conf`)
- **Used in**: Production only (`docker-compose.prod.yml`)
- **Purpose**: Main entry point with SSL termination and routing
- **Responsibilities**:
  - SSL/TLS termination
  - HTTP to HTTPS redirect
  - Route `/api/v1/*` to backend container
  - Route `/*` to frontend container
  - Rate limiting and security headers
- **When to edit**: Adding API routes, changing SSL settings, adjusting rate limits

See [docker/nginx/README.md](../../docker/nginx/README.md) for detailed documentation.

#### 2. Frontend Server (`frontend/nginx.conf`)
- **Used in**: Production frontend container
- **Purpose**: Serve pre-built React static files
- **Responsibilities**:
  - Serve static assets
  - SPA routing (all routes → index.html)
  - Gzip compression
- **When to edit**: Changing cache headers, adding new static file routes

#### Development vs Production

| Aspect | Development | Production |
|--------|------------|------------|
| Entry Point | Vite dev server (`:3000`) | Nginx reverse proxy (`:443`) |
| Backend Access | Direct (`:3001`) | Via reverse proxy |
| SSL | Not used | Required |
| Frontend Serving | Vite HMR | Nginx static files |

For more details, see the [Nginx Configuration Guide](../../docker/nginx/README.md).

## Troubleshooting

### Port Already in Use

```bash
# Find process using port 3000
lsof -ti:3000

# Kill process
kill -9 <PID>

# Or use different port
PORT=3002 npm run dev
```

### Docker Container Won't Start

```bash
# Check logs
docker-compose -f docker/docker-compose.dev.yml logs <service_name>

# Rebuild containers
docker-compose -f docker/docker-compose.dev.yml up -d --build --force-recreate

# Clean Docker system
docker system prune -a
```

### Database Connection Errors

1. Verify MariaDB is running: `docker ps`
2. Check credentials in `secrets/development/.env`
3. Verify network connectivity: `docker network ls`
4. Check database logs: `docker-compose -f docker/docker-compose.dev.yml logs mariadb`

### Migration Errors

```bash
# Check current migration version
docker-compose -f docker/docker-compose.dev.yml exec backend npm run migrate:status

# Rollback and retry
docker-compose -f docker/docker-compose.dev.yml exec backend npm run migrate:rollback
docker-compose -f docker/docker-compose.dev.yml exec backend npm run migrate
```

### Node Module Issues

```bash
# Clear node_modules and reinstall
cd backend && rm -rf node_modules && npm install
cd frontend && rm -rf node_modules && npm install

# Clear npm cache
npm cache clean --force
```

## Next Steps

- Read [Development Workflow](development-workflow.md)
- Review [Coding Standards](coding-standards.md)
- Understand [Security Guidelines](security-guidelines.md)
- Explore [API Documentation](api-documentation.md)
- Check [Testing Strategy](testing-strategy.md)

## Getting Help

- **Documentation**: Check `docs/` directory
- **API Reference**: http://localhost:3001/api-docs
- **Issues**: Create an issue on GitHub
- **Code Review**: Submit PR for feedback

## Development Tips

1. **Use TypeScript strictly**: Enable `strict` mode, avoid `any`
2. **Write tests first**: TDD for complex business logic
3. **Keep commits atomic**: One logical change per commit
4. **Update docs**: Documentation is code - keep it current
5. **Security first**: Never commit secrets, always encrypt sensitive data
6. **Review before PR**: Self-review your changes before requesting review

Happy coding! 🚀
