# BudgetApp — Product Development Roadmap

**Last updated:** 2026-02-26
**Current release:** v0.1

---

## Vision

BudgetApp is a secure, self-hosted personal budgeting application designed for deployment on Unraid. The long-term goal is a feature-complete, offline-capable PWA that can synchronize with real bank accounts via SimpleFIN, track and amortize debt, forecast budget outcomes, and generate actionable financial reports — all while keeping sensitive financial data encrypted and under the user's direct control.

---

## v0.1 — Completed

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

**Status:** Complete

- **AppLayout:** Shared sidebar navigation (Dashboard, Accounts, Transactions, Budgets, Settings), responsive with mobile hamburger drawer
- **DashboardPage:** Net worth card, income/expenses this month, account cards row, monthly chart, recent transactions, budget snapshot
- **Reports endpoint:** `GET /api/v1/reports/monthly-summary?months=N` — aggregates income and expenses per calendar month, excludes transfers
- **MonthlyChart:** Recharts bar chart (income green / expenses pink), responsive, formatted dollar values
- **Backend fixes:** `GET /categories/:id` endpoint; `createBatch()` UUID alignment; removed unimplementable `search` filter (ciphertext not searchable)

### Phase 5 — SimpleFIN Bank Sync

**Status:** Complete

- **5.1 SimpleFIN Configuration:** Access URL exchanged from one-time setup token, AES-256-GCM encrypted at rest; `simplefin_connections` table (one per user); connect/disconnect from Settings → Integrations page; Setup Instructions card with 4-step guide and 2FA advisory
- **5.2 Transaction Import:** `simplefinService.sync(userId)` fetches accounts + transactions; balance updates applied to mapped accounts; imported transactions AES-256-GCM encrypted (same pipeline as manual entry); SimpleFIN transaction ID stored for deduplication
- **5.3 Deduplication Logic:** Primary key deduplication by `simplefin_transaction_id`; Levenshtein fuzzy-match fallback (≥ 0.70 similarity, same amount within $0.01) flags probable duplicates as pending reviews; discarded IDs stored in `discarded_ids_json` to prevent re-flagging; `simplefin_pending_reviews` table with accept/merge/discard resolution
- **5.4 Account Mapping:** `simplefin_account_mappings` table; new SimpleFIN accounts surface on the Imports page for user mapping before transactions are imported (create new BudgetApp account or link to existing); auto-type detection from account name + SimpleFIN type string
- **5.5 Sync Scheduling:** `node-cron` scheduler (15-min poll); per-user configurable interval (1/2/4/6/8/12/24 h) and sync window (start/end hour) to bound bank 2FA prompts; schedule stored in `simplefin_connections`
- **5.6 Imports Page:** Unmapped accounts section, pending review section (side-by-side bank vs. existing entry + similarity %), sync history; Sync Now button; nav badge showing pending action count

### Phase 6 — Debt Tracking & Budget Forecasting

**Status:** Complete

- **6.1 Loan Amortization:** `debt_schedules` table; amortization schedule computed server-side (standard P&I math); `transaction_splits` table stores principal/interest breakdown per payment; `autoSplitPayment` triggered non-fatally after each loan/mortgage/credit_card payment
- **6.2 Payoff Projections:** `GET /api/v1/debt/what-if/:accountId?extraMonthly=N` — returns months saved and interest saved vs. baseline; DebtDetailPage shows amortization table (24-row preview, "Show all" toggle) and live what-if calculator
- **6.3 Budget Forecasting:** `GET /api/v1/reports/forecast?months=N` — median of last 6 months of income/expenses projected N months forward; Dashboard MonthlyChart shows forecast bars dimmed via Recharts Cell fillOpacity
- **6.4 Savings Goals:** `savings_goals` table; progress computed from linked account's currentBalance vs. targetAmount; projectedDate and daysToGoal derived at runtime; SavingsGoalsPage with create/edit/delete; Dashboard widget showing top 3 goals
- **6.5 Account Enhancements:** Full account editing (type, isAsset, startingBalance, currency — balance delta preserved); filter/sort bar on Accounts page (by type, institution, assets/liabilities, name, balance, rate); `annual_rate` field on accounts (APR/APY, stored as decimal fraction, shown on card); `line_of_credit` account type; user default currency preference (`PATCH /auth/me`); auto-type detection from SimpleFIN account name/type on import mapping
- **6.5.1 Liability Comparison View:** `/liabilities` page listing all active liability accounts ranked by `annualRate` descending (avalanche method); summary cards (total outstanding + total monthly interest); per-account what-if paydown simulator; sort by rate, balance, or monthly interest
- **6.5.2 Currency Converter:** `exchange_rates` table + `exchangeRateService` fetching from Frankfurter/ECB API; `GET /api/v1/exchange-rates?from=&to=` endpoint (cached, refreshed daily); `AccountCard` shows `~{defaultCurrency} {convertedAmount}` for non-default currency accounts; stale rates shown with ⚠ warning

### Phase 7 — Offline-First PWA

**Status:** Complete

- **7.1 Dexie Schema & Sync Engine:** `BudgetDB` (8 tables); `syncEngine.push()` flushes `pendingMutations` in creation order; `syncEngine.pull(since?)` fetches delta from `GET /api/v1/sync?updatedSince=`; `sync()` runs push then pull; `lastSyncAt` stored in `syncMeta` table
- **7.2 PRF Key Derivation:** WebAuthn PRF extension on passkey assertion → HKDF(SHA-256) → AES-256-GCM CryptoKey; stored only in module-level variable (never in Zustand or IndexedDB); `pendingMutations.body` encrypted before storage; password-only users read-only offline
- **7.3 Service Worker:** Switched to `injectManifest` strategy; custom `sw.ts` with Workbox precaching, NetworkFirst for `/api/`, CacheFirst for images, background sync relay (`FLUSH_MUTATIONS` message to window clients)
- **7.4 Offline-Aware Hooks:** All 5 core hooks (`useAccounts`, `useTransactions`, `useCategories`, `useBudgets`, `useSavingsGoals`) fall back to Dexie on network error; all mutations queue offline with `queueMutation`; `OfflineWriteNotAvailableError` thrown without PRF key
- **7.5 Offline UI:** Sticky amber offline banner with pending count; orange passkey prompt banner when write attempted without PRF key; conflict notification toast + detail dialog after reconciliation; pending mutations badge in sidebar; PWA install prompt after 3rd visit
- **7.6 Icon Generation:** `scripts/generate-pwa-icons.js` using `sharp`; 9 standard PNGs (72–512px) + 2 maskable PNGs (192, 512px); icons committed to `frontend/public/icons/`
- **Conflict resolution:** Server always wins (simplified from original last-write-wins plan); conflicts surfaced as notifications, not silently merged

### Phase 8 — Budget Lines, Schedules & Budget View

**Status:** Complete

- **8.1 Budget Lines data model:** `budget_lines` table with embedded Schedule (frequency, frequency_interval, anchor_date); `income`/`expense` classification; `fixed`/`flexible` flexibility; Category/Subcategory hierarchy enforced at service layer; `is_pay_period_anchor` flag on at most one income line per user
- **8.2 Schedule math:** Occurrence generation via `computeOccurrences()` walking forward from `anchor_date`; 8 frequency types: weekly, biweekly, semi_monthly, **twice_monthly**, monthly, every_n_days, annually, one_time; `toAnnual()` converts any frequency to an annual figure for proration
- **8.3 Budget View:** `GET /budget-view?start=&end=` computes the full `BudgetView` server-side: prorated amounts (annualized × days/365), spending actuals from transactions, variance (plan − actual), and occurrences within the window; `GET /budget-view/pay-period` returns current pay period boundaries derived from the anchor income line
- **8.4 Frontend — BudgetPage:** Period selector (Monthly / This Week / This Pay Period / Custom); `BudgetSummaryBar` with planned income, planned expenses, actual expenses, remaining budget, planned net, actual net; `BudgetLineGroup` (collapsible by Category) → `BudgetLineRow` (progress bar, actual vs. prorated, variance, inline edit); `AddBudgetLineDialog` with frequency/anchor/flexibility/category fields
- **8.5 Dashboard integration:** Budget snapshot widget updated to query live Budget View data; shows top 3 over-budget expense lines
- **8.6 Post-implementation bug fixes:** Occurrence status comparison; composite index `(user_id, is_pay_period_anchor)`; pay period anchor clear+set wrapped in Knex transaction; dead `formatCurrency` export removed

### Phase 9 — Localization, User Preferences & i18n Infrastructure

**Status:** Complete

- **9.1 User preference fields:** 5 new columns on `users` table: `locale`, `date_format`, `time_format`, `timezone`, `week_start`; existing `default_currency` retained
- **9.2 Backend:** Migration `20260225001`; updated `User`/`PublicUser` types and `userRepository` mappers; extended `updateProfileSchema`; `PATCH /auth/me` passes all preference fields
- **9.3 i18next infrastructure:** `i18next` + `react-i18next` installed; `src/lib/i18n/index.ts` initializes with `lng: 'en-CA'`; `src/lib/i18n/locales/en-CA.json` with all UI strings organized by feature section
- **9.4 `useFormatters()` hook:** Single formatting surface for all components; reads user preferences from Zustand auth store; returns `{ currency(n, override?), date(v), time(v), dateTime(v) }` — all `useMemo`-memoized; `Intl.NumberFormat` for currency, `Intl.DateTimeFormat` for dates/times
- **9.5 Component updates:** `AppLayout` nav uses `useTranslation()`; all major components migrated from `formatCurrency` import to `useFormatters().currency`
- **9.6 PreferencesPage:** Full rewrite — 6 sections: Language, Default Currency, Date Format, Time Format, Timezone (grouped IANA optgroup select), Start of Week

### Phase 10 — Development & Test Data Infrastructure

**Status:** Complete

- **10.1–10.4 Seed file:** `backend/src/database/seeds/dev_seed.ts`; environment guard (blocks production/staging); two test users — `alpha@test.local / test123` (Canadian, biweekly) and `beta@test.local / test123` (American, semi-monthly)
- **10.5–10.7 Coverage:** 10 accounts, 13 top-level + ~40 subcategories, all 8 budget line frequency types, ~265 transactions across Sep 2025 – Feb 2026
- **10.8–10.11 Referential integrity:** All credit card payment and savings transfer pairs linked; all loan payments have `transaction_splits` with principal/interest breakdown; 4 savings goals and 2 debt schedules; idempotent (truncate + reload on each run)
- **10.12 npm scripts:** `seed` / `seed:dev` (truncate + reload), `seed:fresh` (rollback all → migrate → seed)

### Phase 11 — Enhanced Reports & Analytics

**Status:** Partially complete (11.1 and 11.2 shipped in v0.1; 11.3 and 11.4 deferred to v0.2)

- **11.1 Spending by Category** ✓ — Pie chart: spending per category for configurable date range; ReportsPage with period selector and category breakdown
- **11.2 Net Worth Over Time** ✓ — Line chart: monthly net worth snapshots from `net_worth_snapshots` table; background `netWorthScheduler` job; Dashboard widget; `POST /reports/net-worth/snapshot` on-demand endpoint; `GET /reports/net-worth/history?months=N` for chart data
- **11.3 Top Payees** — Deferred to v0.2
- **11.4 Recurring Transactions auto-generation** — Deferred to v0.2; `recurring_transactions` table and infrastructure exists, but cron-based auto-generation is disabled pending design review of idempotency strategy

### Phase 12 — Upcoming Expenses & Budget Consolidation

**Status:** Complete

- **12.1 Upcoming Expenses widget:** `GET /budget-view/upcoming-expenses?start=&end=&includeFlexible=` — returns all fixed (and optionally flexible) budget line occurrences in the window with account association; `UpcomingExpenses` dashboard widget groups bills by account pay period with overdraft detection
- **12.2 `twice_monthly` frequency:** New frequency type with configurable `dayOfMonth1` / `dayOfMonth2` (1–31; 31 = last day of month); `computeNextDueDate` handles month-length clamping; `AddBudgetLineDialog` and `BudgetLineRow` support day-pair configuration; `frequencyLabel` displays "Xth & Yth of month"
- **12.3 Occurrence enumerator consolidation:** Single canonical `computeOccurrences()` exported from `recurringDates.ts`; all date arithmetic uses local midnight consistently; proration math corrected (exact integer days)
- **12.4 Route validation:** `validateRequest` middleware applied to all Budget View and Upcoming Expenses query routes; `budgetViewQuerySchema` and `upcomingExpensesSchema` enforce ISO date format and `start ≤ end`
- **12.5 Code review fixes:** `setCurrentBalance` scoped to `userId`; `budget_lines.account_id` index (migration 20260226003); dead `recurringTransactionScheduler` import removed; dead `currentPayPeriod` export removed; `toLocalISO` and `getDefaultPeriod` consolidated into `budgetViewUtils.ts`; frontend ESLint config created; Prettier formatting applied across backend; 3 test suite mock objects updated for `annualRate` field

---

## v0.2 — Planned

### Phase 13 — Top Payees & Recurring Transactions

**Priority:** High
**Scope:** Medium

#### 13.1 Top Payees Report

- Bar chart: top N payees by total spend for a configurable period
- Payee field is AES-256-GCM encrypted — aggregate at query time by decrypting in the service layer (acceptable for single-user, small dataset)
- `GET /api/v1/reports/top-payees?start=&end=&limit=10` endpoint
- Drill-down to transaction list for a selected payee

#### 13.2 Recurring Transactions

- `recurring_transactions` table exists; auto-generation cron was disabled pending design review
- Define idempotency strategy: advance `next_due_date` after generation (prevent duplicate generation on cron restart)
- Re-enable `recurringTransactionService` and `recurringTransactionScheduler` in `index.ts`
- UI: create/edit/pause/delete recurring transactions; "Skip this occurrence" action

#### Acceptance Criteria

- Top payees chart matches sum of transactions for the period
- Recurring transactions generated on schedule without duplication across server restarts

---

### Phase 14 — Full-Text Transaction Search

**Priority:** Medium
**Scope:** Medium

Build a secondary plaintext search index alongside encrypted transaction storage, enabling payee/description search without exposing PII in plaintext at rest.

- Dedicated search table (`transaction_search_index`) storing a deterministic HMAC-based search token (keyed with server secret) per payee/description token
- `GET /transactions?q=coffee` endpoint — tokenizes query, looks up matching HMAC tokens
- Frontend search bar in TransactionsPage with debounced input
- Migration to backfill existing transactions' search tokens on deploy

---

### Phase 15 — Export & Attachments

**Priority:** Medium
**Scope:** Medium

#### 15.1 CSV / OFX Export

- `GET /api/v1/transactions/export?format=csv&start=&end=` — streams CSV with decrypted payee/description; rate-limited and scoped to requesting user
- OFX format export for import into Quicken/Mint
- Download button on TransactionsPage with format selector and date range picker

#### 15.2 Receipt Attachments

- Photo attachment upload per transaction; stored encrypted (AES-256-GCM) in MinIO/S3-compatible object storage
- `transaction_attachments` table: `transaction_id`, `storage_key`, `mime_type`, `size_bytes`
- Thumbnail preview on transaction detail; download button
- Docker Compose dev environment extended with MinIO service

---

### Phase 16 — E2E Testing & OpenAPI Coverage

**Status:** Complete
**Priority:** High
**Scope:** Medium

#### 16.1 Playwright E2E Tests ✓

- Critical paths covered: registration, login (password + TOTP + passkey), create/edit/delete transaction, budget view for current pay period, SimpleFIN connect flow
- Test environment with seeded test data

#### 16.2 Full OpenAPI Spec ✓

- OpenAPI 3.1 spec completed for all endpoints: accounts, transactions, categories, budgets, budget lines, budget view, debt, reports, SimpleFIN, sync
- Served via `swagger-ui-express` at `/api-docs`

---

### Phase 17 — Remaining Quality & Polish

**Status:** Partially complete (17.1 done; 17.2–17.6 pending)
**Priority:** Low–Medium
**Scope:** Small

#### 17.1 Full i18n Migration — en-CA, en-US, fr-CA ✓

Expanded in scope from the original fr-CA stub:

- Extended `en-CA.json` from 146 → 360 keys across 16 namespaces (auth, security, accounts, transactions, recurring, savingsGoals, liabilities, debt, reports, simplefin, plus budget, budgetLine, periodSelector, dashboard, preferences, nav)
- Created `en-US.json` (360 keys; 4 intentional differences: Checking/Chequing, USD/CAD, Analyze/Analyse, Uncategorized/Uncategorised)
- Created `fr-CA.json` (360 keys, full French-Canada translation)
- Registered all 3 locales in `i18n/index.ts`; `en-CA` is fallback
- Migrated all 24+ pages and feature components from hardcoded strings to `t()` via `useTranslation()`: LoginPage, RegisterPage, LoginForm, TwoFactorPage, SecuritySettingsPage, PreferencesPage, DashboardPage, AccountsPage, AccountCard, TransactionsPage, BudgetPage, RecurringTransactionsPage, SavingsGoalsPage, LiabilitiesPage, DebtDetailPage, ReportsPage, SimplefinSettingsPage, ImportsPage
- Deleted `ACCOUNT_TYPE_LABELS` from `core/constants.ts`; all call sites updated to `t(\`accounts.types.${account.type}\`)`
- PreferencesPage: en-US added as selectable option, fr-CA enabled (no longer "coming soon")
- Type-check: 0 errors; lint: 0 warnings

#### 17.2 Budget Lines Offline Support

- `useBudgetLines` and `useBudgetView` hooks lack Dexie fallback; budget view cannot be served offline
- Add `LocalBudgetLine` to Dexie schema; extend `syncEngine.pull()` to include budget lines delta
- Show last-cached budget view with an "offline" indicator

#### 17.3 Savings Goal ↔ Budget Line Link

- Add `recurring_contribution_budget_line_id` FK on `savings_goals`
- Budget Line contributions automatically tracked against goal progress
- `savings_goals` table exists; FK can be added non-breakingly

#### 17.4 Session Device Names

- Populate `device_name` on refresh tokens from User-Agent header at login time
- Session management UI shows device name alongside creation timestamp

#### 17.5 discardedIds Pruning (SimpleFIN)

- `discarded_ids_json` TEXT column on `simplefin_connections` grows without bound
- Migrate to a separate `simplefin_discarded_ids` table (FK to connection + `simplefin_transaction_id`)
- Prune entries older than 90 days on each sync

#### 17.6 Production Deployment Guide

- Step-by-step Unraid Community Application template documentation
- Docker Compose prod profile validation with HTTPS/TLS via Let's Encrypt or reverse proxy
- Backup/restore procedure for MariaDB volumes and MinIO data

---

### Phase 18 — MCP Server (Agent Access)

**Priority:** Medium
**Scope:** Medium

Expose BudgetApp as an [MCP (Model Context Protocol)](https://modelcontextprotocol.io/) server so that a personal AI agent (Claude, etc.) can query and update financial data through natural language — e.g., "How much did I spend on groceries last month?", "Add a $45 transaction to Whole Foods from my checking account", "What's my net worth today?"

#### 18.1 Authentication Model

The MCP server authenticates to the BudgetApp API using a **long-lived API key** rather than the JWT flow (which requires interactive browser login and TOTP). Design:

- New `api_keys` table: `id`, `user_id`, `key_hash` (SHA-256 of the raw key), `label`, `scopes` (JSON array), `last_used_at`, `created_at`, `expires_at` (nullable)
- Raw key shown once at creation (never stored); stored as SHA-256 hash
- Scope field controls read-only vs. read-write access (e.g., `["transactions:read", "transactions:write", "accounts:read"]`)
- `POST /api/v1/auth/api-keys` — create key; `GET /api/v1/auth/api-keys` — list; `DELETE /api/v1/auth/api-keys/:id` — revoke
- API Keys section in Security Settings page

#### 18.2 MCP Server Implementation

The MCP server is a standalone Node.js process that uses the [`@modelcontextprotocol/sdk`](https://github.com/modelcontextprotocol/typescript-sdk) and communicates with the BudgetApp REST API using an API key. It can be run locally or as a Docker container alongside the app.

Location: `mcp/` directory at the repository root.

```
mcp/
  src/
    index.ts        # MCP server entry point (stdio transport)
    client.ts       # Typed HTTP client for BudgetApp REST API
    tools/          # One file per tool group
      accounts.ts
      transactions.ts
      budget.ts
      reports.ts
  package.json
  tsconfig.json
  Dockerfile
```

#### 18.3 Tool Definitions

**Accounts**
- `list_accounts` — Returns all accounts with current balances, types, and currencies
- `get_net_worth` — Returns total assets, total liabilities, and net worth (with optional currency conversion to default currency)

**Transactions**
- `list_transactions` — Query transactions with filters: `accountId`, `start`, `end`, `categoryId`, `minAmount`, `maxAmount`, `limit`; returns decrypted payee/description
- `add_transaction` — Create a transaction: `accountId`, `amount`, `date`, `payee`, `description`, `categoryId`; returns the created transaction and any transfer candidates
- `get_spending_by_category` — Aggregate spending per category for a date range (wraps the existing reports endpoint)

**Budget**
- `get_budget_view` — Returns the full budget view for a date range: planned income/expenses, actuals, variance per line
- `get_upcoming_expenses` — Returns upcoming bill occurrences in a window with account associations
- `get_pay_period` — Returns the start and end of the current pay period

**Reports**
- `get_monthly_summary` — Income vs. expense totals per calendar month for the last N months
- `get_forecast` — Projected income/expenses for the next N months based on historical median

**Integrations**
- `trigger_simplefin_sync` — Trigger a SimpleFIN import and return the sync result summary (requires `simplefin:write` scope)

#### 18.4 Deployment

- **Local (stdio):** `node mcp/dist/index.ts` with `BUDGET_APP_URL` and `BUDGET_APP_API_KEY` env vars; configure in Claude Desktop / claude config as an MCP server entry
- **Docker:** `docker-compose -f docker/docker-compose.prod.yml` extended with an `mcp` service
- `mcp/README.md` — setup instructions and example prompts

#### Acceptance Criteria

- Agent can answer "What's my net worth?" with a single tool call
- Agent can add a transaction with natural language input
- Agent can produce a spending summary for any requested date range
- API key with `read-only` scope cannot execute write operations
- MCP server gracefully handles API errors (network down, auth failure, validation errors) and returns descriptive error messages

#### Notes

- Encrypted fields (`description`, `payee`, `notes`) are decrypted server-side by the existing service layer — no additional decryption logic needed in the MCP server
- The MCP server does not need access to the encryption master key directly; it communicates only over the REST API
- Consider rate limiting API key requests at the same tier as the general API (`100 req / 15 min`)
- `write` scopes should require explicit user confirmation when creating the API key (checkbox in settings UI)

---

### Phase 19 — Editable Dashboard

**Priority:** High
**Scope:** Large

Replace the hardcoded DashboardPage layout with a fully user-configurable grid: choose which widgets to show, position and size them per breakpoint, filter which accounts appear, and surface warnings and suggestions in dedicated widgets.

#### 19.1 Grid System

The dashboard uses a column-based responsive grid with four named breakpoints:

| Breakpoint | Min width | Columns | Typical device |
|------------|-----------|---------|----------------|
| `xs`       | 0 px      | 2       | Phone (portrait) |
| `sm`       | 640 px    | 4       | Phone (landscape) / tablet |
| `lg`       | 1024 px   | 6       | Desktop |
| `xl`       | 1440 px   | 8       | Wide desktop |

**Library:** [`react-grid-layout`](https://github.com/react-grid-layout/react-grid-layout) — `ResponsiveGridLayout` component. Each breakpoint has its own independent layout array (`Array<{ i: widgetId, x: col, y: row, w: colSpan, h: rowSpan }>`). Repositioning a widget on `lg` leaves the `xs` layout unchanged. `react-grid-layout` handles this natively.

**Drag on mobile:** Touch drag is supported by `react-grid-layout` but finicky on phones. At `xs`, edit mode falls back to **tap-to-reorder** (up/down arrows on each widget card) rather than drag-and-drop.

**New widgets:** When a widget is first enabled and has no saved position for a given breakpoint, `react-grid-layout`'s bin-packing algorithm auto-places it. That breakpoint's layout is committed to the server only after the user explicitly saves or exits edit mode.

**Default column spans per widget:**

| Widget | xs (2 col) | sm (4 col) | lg (6 col) | xl (8 col) |
|--------|-----------|-----------|-----------|-----------|
| Warnings | 2 (full) | 4 (full) | 6 (full) | 8 (full) |
| Net Worth | 2 | 2 | 2 | 2 |
| Account Balances | 2 | 4 | 4 | 4 |
| Budget Snapshot | 2 | 4 | 4 | 4 |
| Upcoming Expenses | 2 | 4 | 4 | 4 |
| Monthly Chart | 2 | 4 | 6 | 6 |
| Savings Goals | 2 | 2 | 2 | 2 |
| Recent Transactions | 2 | 4 | 4 | 4 |
| Hints & Suggestions | 2 | 2 | 2 | 2 |

Warnings is always positioned at the top and spans full width at every breakpoint. It is not moveable or removeable (it can be collapsed to a minimal height when there are no active warnings).

#### 19.2 Layout Persistence

Dashboard configuration is stored server-side per user, synced on save.

**New table: `user_dashboard_config`**

```sql
user_dashboard_config (
  user_id          UUID PRIMARY KEY,  -- FK → users.id, one row per user
  widget_visibility JSON NOT NULL,    -- { "net-worth": true, "savings-goals": false, ... }
  excluded_account_ids JSON NOT NULL, -- UUID[] of accounts hidden from the dashboard
  layouts          JSON NOT NULL,     -- { xs: [...], sm: [...], lg: [...], xl: [...] }
  updated_at       TIMESTAMP
)
```

`layouts` is the JSON object `react-grid-layout` serializes. On each breakpoint, it is an array of `{ i, x, y, w, h }` objects.

**API endpoints:**
- `GET /api/v1/dashboard/config` — returns the user's current config; returns sensible defaults if no row exists yet
- `PUT /api/v1/dashboard/config` — replace the entire config; called when the user exits edit mode (not on every drag event)

**Offline:** Dashboard config is synced into Dexie so the last-known layout is rendered immediately on load and during offline mode.

#### 19.3 Widget Catalog

Each widget is a React component that accepts a standard `WidgetProps` interface (shared `accountFilter`, locale formatters, loading/error state). Widgets have a **compact variant** rendered automatically at `xs` where appropriate (e.g., Account Balances renders as a vertical scrollable list instead of a horizontal cards row).

**`warnings`** *(always on, full-width)*
- SimpleFIN sync errors or stale sync (last synced > 24 h with auto-sync enabled)
- Count of pending SimpleFIN reviews requiring action
- Upcoming overdraft risk: account projected balance < 0 within the next pay period based on upcoming bill occurrences
- Savings goal deadline approaching within 30 days and behind pace
- Budget category >90% spent this period with >7 days remaining
- Dismissed warnings suppressed for 24 h (stored in dashboard config)

**`hints`** *(optional, default on)*
Rule-based suggestions — no AI required initially, but designed so that MCP/agent integration (Phase 18) can push additional hints via the same endpoint:
- "X transactions uncategorized this month" → deep-link to Transactions filtered view
- "[Category] spending is 18% above your 3-month average"
- "Your [Savings Goal] is on track to be met by [date]"
- "You have X transfer pairs that haven't been linked yet"
- "No pay period anchor is set — set one to enable pay-period budget view"
- Hints are generated server-side at `GET /api/v1/dashboard/hints` (computes at request time, not stored); cached for 15 min per user

**`net-worth`** — Single figure: assets − liabilities (converted to default currency). Trend arrow vs. last snapshot.

**`account-balances`** — All non-excluded accounts as cards. Respects `excluded_account_ids`. Liability accounts show remaining credit / outstanding balance. Exchange-rate conversion shown for non-default-currency accounts.

**`budget-snapshot`** — `BudgetSummaryBar` for the current pay period + top 3 over/near-budget lines. Links to BudgetPage.

**`upcoming-expenses`** — Current `UpcomingExpenses` widget; filters to non-excluded accounts.

**`monthly-chart`** — Income vs expenses bar chart with forecast overlay. Configurable month count (3/6/12) stored per widget in `widget_visibility` config.

**`savings-goals`** — Top 3 goals by deadline proximity. Progress bars. Links to SavingsGoalsPage.

**`recent-transactions`** — Last 10 transactions across all non-excluded accounts. Links to TransactionsPage.

#### 19.4 Account Filter

A global **Excluded Accounts** list stored in `user_dashboard_config.excluded_account_ids`. This only affects dashboard display — no data is modified.

- Controlled via a panel in edit mode: checkboxes listing all active accounts, grouped by type
- Affects: Account Balances, Net Worth calculation (widget only), Upcoming Expenses, Recent Transactions
- Does **not** affect actual reports, budget view, or any other page
- Default: all accounts included

#### 19.5 Edit Mode

A persistent **"Edit Dashboard"** button in the DashboardPage header (or top-right corner) toggles edit mode.

In edit mode:
- Drag handles appear on each widget (desktop `lg`/`xl`) or up/down tap arrows (mobile `xs`/`sm`)
- Resize handles appear at widget corners (desktop only)
- A **Widget Tray** panel slides in from the right or bottom: lists all available widgets with toggle switches and a preview thumbnail; toggling adds/removes the widget from the current layout
- An **Account Filter** section (also in the tray) shows account checkboxes
- Individual widgets show a gear icon for per-widget settings (e.g., chart month range)
- A **"Save"** button and **"Reset to defaults"** button appear in the header

Exiting edit mode (Save or clicking away) fires a single `PUT /api/v1/dashboard/config` with the full updated config.

#### 19.6 Implementation Notes

- The existing `DashboardPage` component is refactored into a `DashboardGrid` component that renders `ResponsiveGridLayout` with the saved layout
- Each current hardcoded dashboard section becomes a widget component in `src/features/dashboard/widgets/`
- Widget components should not know about grid positioning — they receive data via hooks and render into whatever space they are given
- `react-grid-layout` CSS must be imported; grid rows can be a fixed pixel height (e.g., 80 px per row unit) or auto-sized; recommend fixed row height for predictability
- Test the edit mode at each breakpoint explicitly; `react-grid-layout` `isDraggable={false}` and `isResizable={false}` can be conditionally set for `xs` to enforce tap-to-reorder

#### Acceptance Criteria

- User can add, remove, and reposition all widgets without a page refresh
- Layout changes at `lg` do not affect the `xs` layout
- Excluded accounts are not shown in Account Balances or counted in the dashboard Net Worth figure
- Warnings widget is always visible at full width and cannot be moved or removed
- Hints are generated at request time and reflect the current state of the user's data
- Dashboard layout is restored correctly after logout and re-login on a different device
- Edit mode is accessible and functional at all four breakpoints

---

## Technical Debt

| Item | Priority | Notes |
|------|----------|-------|
| Backend Knex `any` types | Medium | 109 pre-existing ESLint errors from Knex's untyped query results across repository files. Add Knex generics to typed `select<T>()` calls incrementally. |
| Budget Lines offline support | Medium | `useBudgetLines`/`useBudgetView` hooks lack Dexie fallback. See Phase 17.2. |
| `discardedIds` JSON growth | Medium | Unbounded `discarded_ids_json` column. See Phase 17.5. |
| Session management device names | Medium | Refresh tokens lack `device_name`. See Phase 17.4. |
| Orphaned `frequencyLabel.ts` | Low | `frontend/src/lib/utils/frequencyLabel.ts` is unreferenced dead code; both `budgetViewUtils.ts` and `RecurringTransactionsPage.tsx` define their own equivalent. Safe to delete. |
| Load testing | Low | No load tests. Add k6 scripts for transaction import endpoint. |
| API pagination | Low | Accounts and transactions lists are unbounded; add `page`/`limit`. |
| Rate limit tuning | Low | Evaluate 5 req/15 min auth limit for WebAuthn multi-round-trip flows. |
| Lighthouse PWA score | Low | Not formally measured. Requires production build with HTTPS to audit accurately. |

---

## Architecture Decisions Log

See [docs/planning/architecture-decisions/](./architecture-decisions/) for full ADRs.

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| Database | MariaDB 11 | InnoDB encryption at rest; Unraid-native; well-supported by Knex |
| Auth tokens | JWT dual-token | Stateless access token for performance; refresh token in DB for revocation |
| Field encryption | AES-256-GCM | Sensitive financial fields encrypted before storage; authenticated encryption prevents tampering |
| Offline storage | Dexie (IndexedDB) | Well-maintained; TypeScript-first; handles large datasets |
| Charts | Recharts | React-native; sufficient for bar/line/pie charts needed |
| Search | Deferred (Phase 14) | Encrypted fields cannot be searched with SQL LIKE; requires HMAC token index |
| SimpleFIN | Phase 5 | Requires stable account/transaction schema first |
| Budget model | Budget Lines (Phase 8) | Forward-looking plan: lines belong to user, schedule-driven occurrences, prorated Budget View replaces static allocations |
| i18n | i18next + react-i18next | Industry standard; JSON resource files; `useFormatters()` hook wraps `Intl.*` APIs |
| Conflict resolution (offline) | Server always wins | Single-user app — server is authoritative; conflicts surfaced as notifications, not silently merged |
| Recurring tx generation | Disabled (v0.1) | Cron idempotency strategy needs design review before re-enabling |
