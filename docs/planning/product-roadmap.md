# BudgetApp — Product Development Roadmap

**Last updated:** 2026-02-23
**Status:** Phase 7 complete; offline-first PWA shipped

---

## Vision

BudgetApp is a secure, self-hosted personal budgeting application designed for deployment on Unraid. The long-term goal is a feature-complete, offline-capable PWA that can synchronize with real bank accounts via SimpleFIN, track and amortize debt, forecast budget outcomes, and generate actionable financial reports — all while keeping sensitive financial data encrypted and under the user's direct control.

---

## Completed Phases

### Phase 1 — Foundation
**Status:** Complete

- Project scaffolding: Express + TypeScript backend, React + Vite frontend
- Docker setup for development and production (Unraid)
- MariaDB 11 + Redis 7 via Docker Compose
- Knex migration infrastructure
- Tailwind CSS 3.4 + Shadcn/ui component library
- ESLint + Prettier configuration (strict TypeScript, no `any`)
- Winston logger, centralized env validation, secret loading from Docker secrets
- Vitest + React Testing Library (frontend), Jest + ts-jest (backend)

### Phase 2 — Authentication
**Status:** Complete

- User registration and login with Argon2id password hashing
- JWT dual-token authentication: 15-min access tokens (Zustand memory), 30-day refresh tokens (httpOnly cookies)
- Refresh token rotation with reuse detection (revoked token kills all sessions)
- TOTP 2FA with QR code setup, backup codes
- WebAuthn / Passkey registration and authentication
- Security settings page: manage passkeys, TOTP, active sessions
- All secrets AES-256-GCM encrypted at rest (email, TOTP secret)

### Phase 3 — Core Financial Domain
**Status:** Complete

- **Accounts:** 7 types (checking, savings, credit card, loan, mortgage, investment, other), asset/liability flag, atomic balance updates
- **Categories:** Income/expense categorization, parent/child hierarchy, 20 default categories seeded on registration, soft-delete
- **Transactions:** CRUD with atomic balance side-effects; AES-256-GCM encrypted description/payee/notes; transfer detection (±3 days, equal/opposite amounts); transfer linking (transfer/payment/refund types); transfer pair unlinking
- **Budgets:** Date-range budgets with per-category allocation; `getBudgetProgress` aggregates spending per category excluding transfers
- Full validation via Joi (backend) and Zod (frontend)
- TanStack Query hooks for all four domains

### Phase 4 — Dashboard & Polish
**Status:** Complete (2026-02-19)

- **AppLayout:** Shared sidebar navigation (Dashboard, Accounts, Transactions, Budgets, Settings), responsive with mobile hamburger drawer
- **DashboardPage:** Net worth card, income/expenses this month, account cards row, monthly chart, recent transactions, budget snapshot
- **Reports endpoint:** `GET /api/v1/reports/monthly-summary?months=N` — aggregates income and expenses per calendar month, excludes transfers
- **MonthlyChart:** Recharts bar chart (income green / expenses pink), responsive, formatted dollar values
- **Backend fixes:** `GET /categories/:id` endpoint; `createBatch()` UUID alignment; removed unimplementable `search` filter (ciphertext not searchable)

### Phase 5 — SimpleFIN Bank Sync
**Status:** Complete (2026-02-20)

- **5.1 SimpleFIN Configuration:** Access URL exchanged from one-time setup token, AES-256-GCM encrypted at rest; `simplefin_connections` table (one per user); connect/disconnect from Settings → Integrations page; Setup Instructions card with 4-step guide and 2FA advisory
- **5.2 Transaction Import:** `simplefinService.sync(userId)` fetches accounts + transactions; balance updates applied to mapped accounts; imported transactions AES-256-GCM encrypted (same pipeline as manual entry); SimpleFIN transaction ID stored for deduplication
- **5.3 Deduplication Logic:** Primary key deduplication by `simplefin_transaction_id`; Levenshtein fuzzy-match fallback (≥ 0.70 similarity, same amount within $0.01) flags probable duplicates as pending reviews; discarded IDs stored in `discarded_ids_json` to prevent re-flagging; `simplefin_pending_reviews` table with accept/merge/discard resolution
- **5.4 Account Mapping:** `simplefin_account_mappings` table; new SimpleFIN accounts surface on the Imports page for user mapping before transactions are imported (create new BudgetApp account or link to existing); auto-type detection from account name + SimpleFIN type string
- **5.5 Sync Scheduling:** `node-cron` scheduler (15-min poll); per-user configurable interval (1/2/4/6/8/12/24 h) and sync window (start/end hour) to bound bank 2FA prompts; schedule stored in `simplefin_connections`
- **5.6 Imports Page:** Unmapped accounts section, pending review section (side-by-side bank vs. existing entry + similarity %), sync history; Sync Now button; nav badge showing pending action count

### Phase 6 — Debt Tracking & Budget Forecasting
**Status:** Complete (2026-02-20)

- **6.1 Loan Amortization:** `debt_schedules` table; amortization schedule computed server-side (standard P&I math); `transaction_splits` table stores principal/interest breakdown per payment; `autoSplitPayment` triggered non-fatally after each loan/mortgage/credit_card payment
- **6.2 Payoff Projections:** `GET /api/v1/debt/what-if/:accountId?extraMonthly=N` — returns months saved and interest saved vs. baseline; DebtDetailPage shows amortization table (24-row preview, "Show all" toggle) and live what-if calculator
- **6.3 Budget Forecasting:** `GET /api/v1/reports/forecast?months=N` — median of last 6 months of income/expenses projected N months forward; Dashboard MonthlyChart shows forecast bars dimmed via Recharts Cell fillOpacity
- **6.4 Savings Goals:** `savings_goals` table; progress computed from linked account's currentBalance vs. targetAmount; projectedDate and daysToGoal derived at runtime; SavingsGoalsPage with create/edit/delete; Dashboard widget showing top 3 goals
- **6.5 Account Enhancements (2026-02-23):** Full account editing (type, isAsset, startingBalance, currency — balance delta preserved); filter/sort bar on Accounts page (by type, institution, assets/liabilities, name, balance, rate); `annual_rate` field on accounts (APR/APY, stored as decimal fraction, shown on card); `line_of_credit` account type; user default currency preference (`PATCH /auth/me`, stored on users table, defaults to CAD); auto-type detection from SimpleFIN account name/type on import mapping
- **6.5.1 Liability Comparison View (2026-02-23):** `/liabilities` page listing all active liability accounts ranked by `annualRate` descending (avalanche method); summary cards (total outstanding + total monthly interest); per-account what-if paydown simulator reusing existing debt `what-if` endpoint; sort by rate, balance, or monthly interest; "Liabilities" nav item in sidebar
- **6.5.2 Currency Converter (2026-02-23):** `exchange_rates` table + `exchangeRateService` fetching from Frankfurter/ECB API; `GET /api/v1/exchange-rates?from=&to=` endpoint (cached, refreshed daily); `AccountCard` shows `~{defaultCurrency} {convertedAmount}` for non-default currency accounts; Accounts page net worth converted to user's default currency via `useExchangeRates` (parallel TanStack Query); stale rates shown with ⚠ warning; no conversion when all accounts in default currency

---

### Phase 7 — Offline-First PWA
**Status:** Complete (2026-02-23)

- **7.1 Dexie Schema & Sync Engine:** `BudgetDB` (8 tables); `syncEngine.push()` flushes `pendingMutations` in creation order; `syncEngine.pull(since?)` fetches delta from `GET /api/v1/sync?updatedSince=`; `sync()` runs push then pull; `lastSyncAt` stored in `syncMeta` table
- **7.2 PRF Key Derivation:** WebAuthn PRF extension on passkey assertion → HKDF(SHA-256) → AES-256-GCM CryptoKey; stored only in module-level variable (never in Zustand or IndexedDB); `pendingMutations.body` encrypted before storage; password-only users read-only offline
- **7.3 Service Worker:** Switched to `injectManifest` strategy; custom `sw.ts` with Workbox precaching, NetworkFirst for `/api/`, CacheFirst for images, background sync relay (`FLUSH_MUTATIONS` message to window clients)
- **7.4 Offline-Aware Hooks:** All 5 core hooks (`useAccounts`, `useTransactions`, `useCategories`, `useBudgets`, `useSavingsGoals`) fall back to Dexie on network error; all mutations queue offline with `queueMutation`; `OfflineWriteNotAvailableError` thrown without PRF key
- **7.5 Offline UI:** Sticky amber offline banner with pending count; orange passkey prompt banner when write attempted without PRF key; conflict notification toast + detail dialog after reconciliation; pending mutations badge in sidebar; PWA install prompt after 3rd visit
- **7.6 Icon Generation:** `scripts/generate-pwa-icons.js` using `sharp`; 9 standard PNGs (72–512px) + 2 maskable PNGs (192, 512px); icons committed to `frontend/public/icons/`
- **Conflict resolution:** Server always wins (simplified from original last-write-wins plan); conflicts surfaced as notifications, not silently merged

---

## Upcoming Phases

---

### Phase 8 — Enhanced Reports & Recurring Transactions
**Priority:** Medium
**Estimated scope:** Medium

#### Overview
Add richer reporting and recurring transaction management.

#### Feature Specs

**8.1 Enhanced Reports**
- Spending by category (pie/donut chart, configurable date range)
- Income vs. expenses trend (extend Phase 4's 6-month bar chart to custom date ranges)
- Net worth over time (line chart, monthly snapshots stored in `net_worth_snapshots` table)
- Top payees by spend (bar chart, configurable period)

**8.2 Recurring Transactions**
- `recurring_transactions` table: template transaction, frequency (daily/weekly/biweekly/monthly/annually), next_due_date, end_date
- Cron job generates actual transaction records when due date is reached
- UI to define and manage recurring transactions; "Skip this occurrence" action

#### Acceptance Criteria
- [ ] Spending by category chart is accurate and matches sum of transactions in that category for the period
- [ ] Recurring transactions are created on schedule without duplication
- [ ] Net worth chart reflects balance history accurately

#### Notes
- **8.1 Net worth chart** requires a new `net_worth_snapshots` table — no migration yet
- **8.2 Recurring transactions** — cron idempotency is critical; use `next_due_date` advancement (not delete-and-recreate) to prevent duplicates on crash/restart

---

### Future Additions (Deferred)

Features that may be added later if the app is shared or needs broader data portability.

**CSV & OFX Export**
- `GET /api/v1/transactions/export?format=csv&startDate=&endDate=` — streams CSV with decrypted payee/description
- OFX format export for import into Quicken/Mint
- All exports rate-limited and scoped to the requesting user
- *Note: transaction sensitive fields must be decrypted before streaming*

**Receipt Attachments**
- Photo attachment support: upload receipt images, stored encrypted in object storage (S3-compatible, e.g., MinIO on Unraid)
- `transaction_attachments` table: transaction_id FK, storage_key, mime_type, size_bytes; object stored encrypted with AES-256-GCM
- Thumbnail preview on transaction detail; download button

---

## Technical Debt & Non-Feature Work

| Item | Priority | Notes |
|------|----------|-------|
| Full-text transaction search | Medium | Requires maintaining a plaintext search index (Meilisearch or dedicated search table) alongside encrypted fields. Deferred until Phase 5+ when sync architecture is finalized. |
| Budget total validation | Low | Nothing prevents allocations from exceeding a desired ceiling. Add optional `limit` field to budgets table. |
| Category `createBatch()` return values | Low | Currently `void`; returning created categories would allow the seeded defaults to be immediately shown in the UI without a second fetch. |
| API pagination for accounts | Low | Accounts list is unbounded; add `page`/`limit` for users with many accounts. |
| Session management UI | Medium | Currently users can see active sessions but cannot see device names for refresh tokens. Add `device_name` population from User-Agent parsing. |
| Rate limit tuning | Low | Auth endpoints use 5 req/15 min; evaluate whether this needs adjustment for WebAuthn flows where multiple round-trips are expected. |
| E2E test suite | High | No end-to-end tests exist. Add Playwright tests for critical paths: registration, login, create transaction, budget progress. |
| Load testing | Medium | No load tests. Add k6 scripts for the transaction import endpoint before Phase 5 ships. |

---

## Architecture Decisions Log

See [docs/planning/architecture-decisions/](./architecture-decisions/) for full ADRs. Key decisions:

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| Database | MariaDB 11 | InnoDB encryption at rest; Unraid-native; well-supported by Knex |
| Auth tokens | JWT dual-token | Stateless access token for performance; refresh token in DB for revocation |
| Field encryption | AES-256-GCM | Sensitive financial fields encrypted before storage; authenticated encryption prevents tampering |
| Offline storage | Dexie (IndexedDB) | Well-maintained; TypeScript-first; handles large datasets |
| Charts | Recharts | Already installed; React-native; sufficient for bar/line/pie charts needed |
| Search | Deferred | Encrypted fields cannot be searched with SQL LIKE; requires dedicated search index |
| SimpleFIN | Phase 5 | Requires stable account/transaction schema first |
