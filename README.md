# BudgetApp

A secure, self-hosted personal budgeting application with bank import, budget forecasting, debt tracking, and an offline-first PWA. Designed for self-hosting on Unraid or any Linux host running Docker.

**Current version: v0.3**

---

## Get Started

### I want to run it on my home server

See the **[User Deployment Guide](docs/deployment/user-guide.md)** — step-by-step instructions for installing BudgetApp on Unraid (or any Docker host), setting up SSL, running your first migration, and getting your household up and running.

### I want to develop or contribute

See **[Developer Getting Started](docs/deployment/getting-started.md)** for environment setup, hot-reload, debugging, and database management.

---

## Features

- **Secure Authentication** — Argon2id passwords, JWT sessions, TOTP 2FA, WebAuthn passkeys
- **Account Management** — Checking, savings, credit cards, loans, mortgages, investments; multi-currency support
- **Transactions** — Manual entry with categories, tags, payees, notes; transfer linking eliminates double-counting
- **Budget Lines** — Define income and expenses at any frequency (weekly, biweekly, monthly, annually, etc.); prorated across any date window
- **Customizable Dashboard** — Drag-and-drop widget grid with 12 widgets across spending, budgeting, savings, and debt categories
- **Reports** — Spending by category, net worth history, top payees, tag summaries
- **SimpleFIN Integration** — Automated bank and credit card data import via [SimpleFIN Bridge](https://bridge.simplefin.org/)
- **Debt Tracking** — Amortization schedules with principal/interest splitting and payoff planning
- **Savings Goals** — Track progress toward goals with projected completion dates
- **Multi-User Households** — Shared household with per-account access control (view/write)
- **Offline-First PWA** — Installable, works without a network connection; encrypted local cache
- **Push Notifications** — Upcoming bill alerts, goal deadline reminders, SimpleFIN sync errors
- **Localization** — English (CA/US) and French (CA); per-user currency, date format, and timezone

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Node.js 20, TypeScript, Express.js, Knex.js |
| Database | MariaDB 11 (InnoDB encryption), Redis 7 |
| Auth | Argon2id, JWT (15m / 30d refresh), TOTP, WebAuthn |
| Frontend | React 18, TypeScript, Vite 5, Tailwind CSS, Shadcn/ui |
| State | TanStack Query v5 (server), Zustand (client) |
| Offline | Dexie 4 (IndexedDB), vite-plugin-pwa |
| Deployment | Docker Compose, Nginx, self-hosted on Unraid |

---

## Security

Defense-in-depth security model:

- **Encryption at rest** — MariaDB InnoDB encryption + AES-256-GCM field-level encryption for PII (emails, transaction details)
- **Encryption in transit** — TLS required in production; strict CORS and Helmet security headers
- **Authentication** — Argon2id + server-side pepper, 2FA (TOTP), WebAuthn passkeys, refresh token reuse detection
- **Rate limiting** — 100 req/15 min general; 5 req/15 min on authentication endpoints
- **Input validation** — Schema validation at all API boundaries
- **No secrets in code** — All secrets via Docker secrets or git-ignored environment files

---

## Documentation

| Document | Description |
|----------|-------------|
| [User Deployment Guide](docs/deployment/user-guide.md) | Install and configure BudgetApp on Unraid or Docker |
| [Developer Getting Started](docs/deployment/getting-started.md) | Developer environment setup |
| [Production Deployment Reference](docs/deployment/deployment.md) | Full production deployment reference |
| [Database Schema](docs/developer/database-schema.md) | Full schema reference |
| [Architecture Decisions](docs/developer/architecture-decisions/) | ADRs for key technical decisions |
| [API Reference](docs/api/openapi.yaml) | OpenAPI 3.1 spec |
| [Product Roadmap](docs/product/product-roadmap-v0.4.md) | Current roadmap |

---

## License

[MIT License](LICENSE)
