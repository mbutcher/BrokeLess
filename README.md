# Budget App

A secure, self-hosted personal budgeting application with advanced features like intelligent transfer linking, budget forecasting, and debt tracking.

## Features

- **Secure Authentication**: Multi-factor authentication with TOTP and WebAuthn/Passkeys support
- **Intelligent Transfer Linking**: Automatically detect and link transfers between accounts to prevent double-counting in budgets
- **Budget Forecasting**: Sophisticated projection algorithms to predict future spending and budget health
- **Debt Tracking**: Separate interest/fees from principal payments to provide clear insights
- **SimpleFIN Integration**: Automated bank data import via SimpleFIN Bridge
- **Offline-First PWA**: Work seamlessly offline with encrypted local storage
- **End-to-End Encryption**: All sensitive data encrypted at rest and in transit

## Technology Stack

### Backend
- Node.js 20 with TypeScript
- Express.js framework
- MariaDB 11 with encryption
- Redis for caching/sessions
- Argon2id password hashing
- JWT + Refresh Tokens

### Frontend
- React 18 with TypeScript
- Vite build tool
- Tailwind CSS + Shadcn/ui
- TanStack Query for server state
- Zustand for client state
- IndexedDB with encryption

### Deployment
- Docker multi-container architecture
- Nginx reverse proxy with SSL/TLS
- Self-hosted on Unraid

## Quick Start

### Prerequisites
- Docker and Docker Compose
- Node.js 20+ (for local development)
- Unraid server (for production deployment)

### Development Setup

```bash
# Clone repository
git clone <repo-url>
cd BudgetApp

# Generate development secrets
./scripts/setup/generate-keys.sh development

# Initialize development environment
./scripts/setup/init-dev.sh

# Start development containers
docker-compose -f docker/docker-compose.dev.yml up -d

# Access the application
# Frontend: http://localhost:3000
# Backend: http://localhost:3001
# API Docs: http://localhost:3001/api-docs
```

## Documentation

- **[Getting Started](docs/developer/getting-started.md)** - Development environment setup
- **[API Documentation](docs/developer/api-documentation.md)** - Complete API reference
- **[Architecture Decisions](docs/planning/architecture-decisions/)** - ADRs documenting key technical decisions
- **[Database Schema](docs/planning/database-schema.md)** - Complete database design
- **[Security Guidelines](docs/developer/security-guidelines.md)** - Security best practices
- **[Deployment Guide](docs/developer/deployment.md)** - Production deployment to Unraid

## Project Structure

```
BudgetApp/
├── backend/           # Node.js/TypeScript API
├── frontend/          # React/TypeScript PWA
├── docker/            # Docker configurations
├── scripts/           # Setup and deployment scripts
├── docs/              # Comprehensive documentation
│   ├── openapi/       # OpenAPI specifications
│   ├── prd/           # Product requirements
│   ├── planning/      # Architecture & design docs
│   └── developer/     # Developer guides
└── secrets/           # Secret management (git-ignored)
```

## Security

This application implements defense-in-depth security:

- **Multi-layer encryption**: TLS, database encryption, field-level encryption, client-side encryption
- **Strong authentication**: Argon2id password hashing, 2FA, WebAuthn passkeys
- **Key management**: Hierarchical key derivation with rotation support
- **Security headers**: HSTS, CSP, X-Frame-Options, and more
- **Rate limiting**: Prevents brute force attacks
- **Input validation**: Comprehensive validation using Zod schemas

See [Security Guidelines](docs/developer/security-guidelines.md) for details.

## Testing

```bash
# Backend unit tests
cd backend && npm test

# Frontend unit tests
cd frontend && npm test

# E2E tests
npm run test:e2e

# Security scan
npm run security:scan
```

## Deployment

See the [Deployment Guide](docs/developer/deployment.md) for complete instructions.

Quick deployment to Unraid:

```bash
./scripts/deployment/deploy-unraid.sh
```

## License

[MIT License](LICENSE)

## Support

For issues, questions, or contributions, please see our [Contributing Guidelines](CONTRIBUTING.md).
