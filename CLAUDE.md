# CLAUDE.md

## Project Overview

BudgetApp is a secure, self-hosted personal budgeting application. Key features include intelligent transfer linking, budget forecasting, debt tracking (principal/interest separation), and SimpleFIN integration for automated bank data import. It is an offline-first PWA designed for deployment on Unraid.

---

## Tech Stack

### Backend (`/backend`)
- **Runtime:** Node.js 20, TypeScript 5.5
- **Framework:** Express.js 4.19
- **Database:** MariaDB 11 (InnoDB encryption), migrations via Knex.js
- **Cache/Sessions:** Redis 7
- **Auth:** Argon2id passwords, JWT dual-token (15m access / 30d refresh), TOTP 2FA, WebAuthn/Passkeys
- **Encryption:** AES-256-GCM field-level encryption
- **Testing:** Jest + ts-jest
- **Linting:** ESLint + TypeScript ESLint; **Formatting:** Prettier

### Frontend (`/frontend`)
- **Framework:** React 18, TypeScript 5.5, Vite 5.4
- **Styling:** Tailwind CSS 3.4 + Shadcn/ui
- **State:** Zustand (client) + TanStack Query v5 (server)
- **Forms:** React Hook Form + Zod
- **Routing:** React Router v6
- **Offline Storage:** Dexie 4 (IndexedDB)
- **Charts:** Recharts 2
- **Testing:** Vitest 2 + React Testing Library
- **PWA:** vite-plugin-pwa + Workbox

---

## Common Commands

### Backend
```bash
cd backend
npm run dev             # Start with hot reload (nodemon + ts-node)
npm run build           # Compile TypeScript → dist/
npm start               # Run production build
npm run type-check      # Type-check without emitting
npm run lint            # ESLint
npm run lint:fix        # ESLint auto-fix
npm run format          # Prettier
npm run format:check    # Check Prettier compliance
npm test                # Jest
npm run test:watch      # Jest watch mode
npm run test:coverage   # Jest with coverage
npm run migrate         # Run Knex migrations
npm run migrate:make    # Create new migration
npm run migrate:status  # Check migration status
npm run seed            # Run seeders
```

### Frontend
```bash
cd frontend
npm run dev             # Vite dev server (port 3000)
npm run build           # Type-check + Vite production build
npm run preview         # Preview production build
npm run type-check      # TypeScript check
npm run lint            # ESLint (max-warnings: 0)
npm run lint:fix        # ESLint auto-fix
npm run format          # Prettier
npm run format:check    # Check Prettier compliance
npm test                # Vitest
npm run test:ui         # Vitest UI dashboard
npm run test:coverage   # Vitest with coverage
```

### Docker
```bash
# Development
docker-compose -f docker/docker-compose.dev.yml up -d
docker-compose -f docker/docker-compose.dev.yml down

# Production (Unraid)
docker-compose -f docker/docker-compose.prod.yml up -d
docker-compose -f docker/docker-compose.prod.yml down
```

### Initial Setup
```bash
./scripts/setup/generate-keys.sh development   # Generate dev secrets
./scripts/setup/init-dev.sh                    # Initialize dev environment
# Frontend: http://localhost:3000
# Backend:  http://localhost:3001
# API Docs: http://localhost:3001/api-docs
# Debugger: localhost:9229
```

---

## Architecture

### Backend Layers
```
Controllers → Services → Repositories → Database (Knex/MariaDB)
```
- `src/controllers/` — Request handling
- `src/services/` — Business logic (auth, encryption, budget, debt, transaction)
- `src/repositories/` — Data access layer (CRUD over Knex)
- `src/middleware/` — Auth (JWT), error handling, rate limiting, request validation
- `src/routes/` — Express route definitions
- `src/database/migrations/` — Knex schema migrations
- `src/config/env.ts` — Centralized env var validation; secrets loaded from `/run/secrets/` (Docker) or `secrets/` dir

### Frontend Structure
```
src/
  app/           # Root App component, providers
  features/      # Feature modules (auth, dashboard, accounts, transactions, budgets)
    <feature>/
      components/
      pages/
      hooks/
      api/
      stores/
      types/
      schemas/   # Zod schemas
  components/    # Shared: ui/ (Shadcn), charts/, forms/, layout/, common/
  hooks/         # Shared custom hooks
  lib/
    api/         # Axios client + interceptors (silent refresh on 401)
    db/          # Dexie (IndexedDB) initialization
    utils/
    constants/
  stores/        # Global Zustand stores
  types/         # Shared TypeScript types
```

---

## Key Patterns & Conventions

### TypeScript
- Strict mode enabled in both backend and frontend
- No `any` — use proper types or `unknown`
- Explicit return types on functions (backend enforced by ESLint)
- Zod schemas used for runtime validation on both sides

### Formatting & Linting
- Prettier: single quotes, semi-colons, 100 print width, trailing commas (es5), LF line endings
- ESLint: errors block CI; frontend allows zero warnings
- Run `lint:fix` and `format` before committing

### Database
- UUID primary keys on all tables
- `created_at` / `updated_at` timestamps everywhere
- Sensitive fields (email, TOTP secrets) are AES-256-GCM encrypted at the application layer
- All schema changes via Knex migrations — never modify DB directly

### Authentication Flow
- Access tokens (15 min): stored in Zustand memory only (not localStorage)
- Refresh tokens (30 days): `httpOnly; SameSite=Strict; Secure` cookies
- Refresh token hashes (SHA-256) stored in DB — not raw JWTs
- Reuse detection: presenting a revoked refresh token kills all sessions

### API Responses
- Standard envelope: `{ success: boolean, data?: T, error?: string }`
- HTTP status codes used semantically
- Rate limiting: 100 req / 15 min general; 5 req / 15 min on login

### Testing
- Coverage threshold: 70% (lines, functions, branches, statements) for both frontend and backend
- Test files: `**/*.test.ts`, `**/*.spec.ts`, `**/__tests__/**`

---

## Security Considerations

- Never log secrets, tokens, or PII
- All sensitive env vars loaded from Docker secrets in production
- No `console.log` in backend source — use the Winston logger (`src/utils/logger.ts`)
- Validate all user input at route boundaries via middleware before it reaches services
- Do not bypass rate limiters or auth middleware in new routes
- Follow existing patterns for encrypted fields — use `encryptionService` for any new PII

---

## Docs & References
- `docs/planning/architecture-decisions/` — ADRs for tech stack and auth strategy
- `docs/planning/database-schema.md` — Full schema reference
- `docs/developer/` — Getting started, API docs, security guidelines, deployment
- `secrets/.env.example` — All supported environment variables
