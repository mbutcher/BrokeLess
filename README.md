# BudgetApp

**v0.1** — A secure, self-hosted personal budgeting application with bank import, budget forecasting, debt tracking, and an offline-first PWA.

---

## Features

- **Secure Authentication** — Argon2id passwords, JWT sessions, TOTP 2FA, WebAuthn/Passkeys
- **Account Management** — Track checking, savings, credit cards, loans, lines of credit, mortgages, investments
- **Transactions** — Manual entry with categories, payees, notes, and transfer linking to eliminate double-counting
- **Budget Lines** — Define recurring income and expenses at any frequency (weekly, biweekly, semi-monthly, twice-monthly, monthly, annually, every N days, one-time); prorated across any date window
- **Upcoming Expenses** — Per-pay-period bill calendar with optional account overdraft warnings
- **Budget Snapshot** — Income vs. expense summary for the current pay period with actual vs. planned comparison
- **Reports** — Spending by category (pie chart) and net worth history (line chart) with configurable date ranges
- **SimpleFIN Integration** — Automated bank/credit card data import via [SimpleFIN Bridge](https://bridge.simplefin.org/)
- **Debt Tracking** — Amortization schedules with automatic interest/principal payment splitting
- **Net Worth Snapshots** — Scheduled daily snapshots for trend analysis
- **Localization** — Currency and locale preferences per user
- **Offline-First PWA** — Works without a network connection; encrypted local IndexedDB cache

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20, TypeScript, Express.js, Knex.js |
| Database | MariaDB 11 (InnoDB encryption), Redis 7 |
| Auth | Argon2id, JWT (15 min / 30 day refresh), TOTP, WebAuthn |
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, Shadcn/ui |
| State | TanStack Query v5 (server), Zustand (client) |
| Offline | Dexie 4 (IndexedDB), vite-plugin-pwa |
| Deployment | Docker, Nginx, self-hosted on Unraid |

---

## Quick Start

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop/) 4.x+
- [Node.js](https://nodejs.org/) 20+
- Git

### Development Setup

```bash
# 1. Clone the repository
git clone <repo-url>
cd BudgetApp

# 2. Generate development secrets (DB password, JWT keys, encryption keys)
./scripts/setup/generate-keys.sh development

# 3. Initialize the development environment (starts Docker, runs migrations, seeds data)
./scripts/setup/init-dev.sh

# 4. Access the application
#    Frontend:  http://localhost:3000
#    API:       http://localhost:3001
#    API Docs:  http://localhost:3001/api-docs
```

> See [Developer Getting Started](docs/developer/getting-started.md) for full details including hot-reload, debugging, and database management.

### First Steps (User Guide)

Once the application is running:

1. **Register** — Navigate to `http://localhost:3000` and create your account
2. **Add Accounts** — Go to Accounts and add your bank accounts, credit cards, and loans
3. **Set Up Categories** — Categories are seeded with a default hierarchy; customize them as needed
4. **Add Budget Lines** — Define your recurring income (paycheck) and expenses (rent, utilities, subscriptions). Mark your paycheck line as the **pay period anchor** to enable pay-period based views
5. **Connect SimpleFIN** (optional) — Go to Settings → SimpleFIN to connect your bank for automatic transaction import
6. **Enter Transactions** — Manually enter transactions or let SimpleFIN import them automatically
7. **View Dashboard** — The dashboard shows your upcoming bills, budget snapshot for the current pay period, recent transactions, and account balances

---

## Project Structure

```
BudgetApp/
├── backend/              # Node.js/TypeScript API (Express + Knex)
│   ├── src/
│   │   ├── controllers/  # HTTP request handlers
│   │   ├── services/     # Business logic
│   │   ├── repositories/ # Data access layer
│   │   ├── middleware/   # Auth, validation, error handling
│   │   ├── routes/       # Express route definitions
│   │   ├── database/     # Migrations and seeds
│   │   ├── types/        # TypeScript type definitions
│   │   └── utils/        # Shared utilities
├── frontend/             # React 18 PWA (Vite + Tailwind)
│   ├── src/
│   │   ├── app/          # Root App component, providers
│   │   ├── features/     # Feature modules (auth, dashboard, core, reports, integrations)
│   │   ├── components/   # Shared UI components (Shadcn/ui based)
│   │   └── lib/          # API client, utilities, Dexie DB
├── docker/               # Docker Compose configs (dev + prod) and Nginx
├── scripts/              # Setup and deployment scripts
├── docs/                 # Architecture decisions, database schema, developer guides
└── secrets/              # Secret management (git-ignored)
```

---

## Documentation

| Document | Description |
|----------|-------------|
| [Getting Started](docs/developer/getting-started.md) | Developer environment setup |
| [Database Schema](docs/planning/database-schema.md) | Full schema reference |
| [Architecture Decisions](docs/planning/architecture-decisions/) | ADRs for key technical decisions |
| [Product Roadmap](docs/planning/product-roadmap.md) | Feature roadmap and priorities |

---

## Security

Defense-in-depth security model:

- **Encryption at rest** — MariaDB InnoDB encryption + AES-256-GCM field-level encryption for PII
- **Encryption in transit** — TLS (production), strict CORS, Helmet security headers
- **Authentication** — Argon2id password hashing, 2FA (TOTP), WebAuthn passkeys, refresh token reuse detection
- **Rate limiting** — 100 req/15 min general; 5 req/15 min on authentication endpoints
- **Input validation** — Joi (backend) and Zod (frontend) schema validation at all boundaries
- **No secrets in code** — All secrets via Docker secrets or environment files (git-ignored)

---

## Development

```bash
# Backend
cd backend
npm run dev          # Hot-reload dev server
npm run type-check   # TypeScript check
npm run lint         # ESLint
npm test             # Jest tests

# Frontend
cd frontend
npm run dev          # Vite dev server (port 3000)
npm run type-check   # TypeScript check
npm run lint         # ESLint (zero warnings)
npm test             # Vitest tests

# Database
cd backend
npm run migrate      # Run pending migrations
npm run migrate:make create_table_name  # Create new migration
npm run seed         # Seed development data
```

---

## Known Issues (v0.1)

- **Backend lint** — 109 pre-existing ESLint errors in repository files stem from Knex's untyped query results (`any` returns). These are technical debt and do not affect runtime correctness. The codebase type-checks cleanly (`tsc --noEmit` passes).
- **E2E tests** — Not yet implemented.
- **Deployment guide** — Production Unraid deployment documentation is in progress.

---

## License

[MIT License](LICENSE)
