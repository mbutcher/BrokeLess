# BudgetApp — Product Development Roadmap

**Last updated:** 2026-02-24
**Status:** Phase 10 complete; development & test data infrastructure shipped

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

### Phase 7 — Offline-First PWA
**Status:** Complete (2026-02-23)

- **7.1 Dexie Schema & Sync Engine:** `BudgetDB` (8 tables); `syncEngine.push()` flushes `pendingMutations` in creation order; `syncEngine.pull(since?)` fetches delta from `GET /api/v1/sync?updatedSince=`; `sync()` runs push then pull; `lastSyncAt` stored in `syncMeta` table
- **7.2 PRF Key Derivation:** WebAuthn PRF extension on passkey assertion → HKDF(SHA-256) → AES-256-GCM CryptoKey; stored only in module-level variable (never in Zustand or IndexedDB); `pendingMutations.body` encrypted before storage; password-only users read-only offline
- **7.3 Service Worker:** Switched to `injectManifest` strategy; custom `sw.ts` with Workbox precaching, NetworkFirst for `/api/`, CacheFirst for images, background sync relay (`FLUSH_MUTATIONS` message to window clients)
- **7.4 Offline-Aware Hooks:** All 5 core hooks (`useAccounts`, `useTransactions`, `useCategories`, `useBudgets`, `useSavingsGoals`) fall back to Dexie on network error; all mutations queue offline with `queueMutation`; `OfflineWriteNotAvailableError` thrown without PRF key
- **7.5 Offline UI:** Sticky amber offline banner with pending count; orange passkey prompt banner when write attempted without PRF key; conflict notification toast + detail dialog after reconciliation; pending mutations badge in sidebar; PWA install prompt after 3rd visit
- **7.6 Icon Generation:** `scripts/generate-pwa-icons.js` using `sharp`; 9 standard PNGs (72–512px) + 2 maskable PNGs (192, 512px); icons committed to `frontend/public/icons/`
- **Conflict resolution:** Server always wins (simplified from original last-write-wins plan); conflicts surfaced as notifications, not silently merged

### Phase 8 — Budget Lines, Schedules & Budget View
**Status:** Complete (2026-02-24)

- **8.1 Budget Lines data model:** `budget_lines` table with embedded Schedule (frequency, frequency_interval, anchor_date); `income`/`expense` classification; `fixed`/`flexible` flexibility; Category/Subcategory hierarchy enforced at service layer (`categoryId` → top-level, `subcategoryId` → child of same parent); `is_pay_period_anchor` flag on at most one income line per user
- **8.2 Schedule math:** Occurrence generation via `computeOccurrences()` walking forward from `anchor_date`; 7 frequency types: weekly, biweekly, semi_monthly, monthly, every_n_days, annually, one_time; `toAnnual()` converts any frequency to an annual figure for proration
- **8.3 Budget View:** `GET /budget-view?start=&end=` computes the full `BudgetView` server-side: prorated amounts (annualized × days/365), spending actuals from transactions, variance (plan − actual), and occurrences within the window; `GET /budget-view/pay-period` returns current pay period boundaries derived from the anchor income line
- **8.4 Frontend — BudgetPage:** Replaced legacy date-range budget UI; period selector (Monthly / This Week / This Pay Period / Custom); `BudgetSummaryBar` with planned income, planned expenses, actual expenses, remaining budget, planned net, actual net; `BudgetLineGroup` (collapsible by Category) → `BudgetLineRow` (progress bar, actual vs. prorated, variance, inline edit); `AddBudgetLineDialog` with frequency/anchor/flexibility/category fields
- **8.5 Dashboard integration:** Budget snapshot widget updated to query live Budget View data; shows top 3 over-budget expense lines
- **8.6 Post-implementation bug fixes:** Occurrence status comparison `d < today` → `d <= today`; composite index `(user_id, is_pay_period_anchor)` added; pay period anchor clear+set wrapped in Knex transaction; `frequencyInterval` conditional required in `updateBudgetLineSchema`; dead `formatCurrency` export removed from `budgetViewUtils.ts`

### Phase 9 — Localization, User Preferences & i18n Infrastructure
**Status:** Complete (2026-02-24)

- **9.1 User preference fields:** 5 new columns on `users` table: `locale` (VARCHAR 10, default `'en-CA'`), `date_format` (ENUM, default `'DD/MM/YYYY'`), `time_format` (ENUM, default `'12h'`), `timezone` (VARCHAR 100, default `'America/Toronto'`), `week_start` (ENUM, default `'sunday'`); existing `default_currency` retained
- **9.2 Backend:** Migration `20260225001`; updated `User`/`PublicUser` types and `userRepository` mappers; extended `updateProfileSchema` (all 6 fields optional, at least 1 required); `updateProfile` service and controller pass all preference fields through `PATCH /auth/me`
- **9.3 i18next infrastructure:** `i18next` + `react-i18next` installed; `src/lib/i18n/index.ts` initializes with `lng: 'en-CA'`; `src/lib/i18n/locales/en-CA.json` contains all UI strings organized by feature section; `i18n.changeLanguage(locale)` called in `AuthInitializer` when user locale changes
- **9.4 `useFormatters()` hook:** Single formatting surface for all components; reads user preferences from Zustand auth store; returns `{ currency(n, override?), date(v), time(v), dateTime(v) }` — all `useMemo`-memoized; `Intl.NumberFormat` for currency, `Intl.DateTimeFormat` for dates/times; ISO date-only strings split directly (no UTC midnight shift); accepts optional currency override for per-account display
- **9.5 Component updates:** `AppLayout` nav uses `useTranslation()` for all labels; `BudgetLineRow`, `BudgetLineGroup`, `BudgetSummaryBar`, `AccountCard`, `DashboardPage` all migrated from `formatCurrency` import to `useFormatters().currency`
- **9.6 PreferencesPage:** Full rewrite — 6 sections: Language (locale, `fr-CA` disabled "Coming soon"), Default Currency, Date Format, Time Format (radio), Timezone (grouped IANA optgroup select built from `Intl.supportedValuesOf('timeZone')`), Start of Week; single Save button sends all fields in one `PATCH`

### Phase 10 — Development & Test Data Infrastructure
**Status:** Complete (2026-02-24)

- **10.1 Seed file:** `backend/src/database/seeds/dev_seed.ts` — single comprehensive seed; covers every entity type in the schema
- **10.2 Environment guard:** Seed refuses to run when `NODE_ENV` is `production` or `staging`; throws with a clear error message
- **10.3 Two test users:**
  - `alpha@test.local / test123` — Canadian profile (CAD, en-CA, America/Toronto, biweekly pay period)
  - `beta@test.local / test123` — American profile (USD, en-US, America/New_York, semi-monthly pay period)
- **10.4 Account coverage:** 10 accounts across both users — checking, savings, credit card, loan, investment; realistic starting and current balances; interest rates set on savings and loan accounts
- **10.5 Category hierarchy:** 13 top-level + ~40 subcategories per user (Housing, Food & Dining, Transportation, Healthcare, Personal Care, Entertainment, Shopping, Financial, Subscriptions, Transfers, Miscellaneous, Employment, Other Income)
- **10.6 Budget lines:** All 7 frequency types covered — `weekly`, `biweekly`, `semi_monthly`, `monthly`, `every_n_days`, `annually`, `one_time`; both pay period anchors set
- **10.7 Transaction history:** ~170 transactions for Alpha (Sep 2025 → Feb 2026), ~95 for Beta (Nov 2025 → Feb 2026); includes recurring income/expenses, credit card charges, credit card payment transfers, savings transfers, annual one-off payments, holiday shopping
- **10.8 Transfer links:** All credit card payment pairs and savings transfer pairs linked via `transaction_links` with correct `link_type`
- **10.9 Debt payment splits:** All car loan and student loan payments have `transaction_splits` rows with principal/interest breakdown following correct amortization schedule
- **10.10 Savings goals & debt schedules:** 4 savings goals and 2 debt schedules with full field coverage
- **10.11 Idempotent:** Truncates all seed-managed tables before inserting; running twice produces a clean, identical dataset
- **10.12 npm scripts:** `seed` / `seed:dev` (truncate + reload), `seed:fresh` (rollback all → migrate → seed)

---

## Upcoming Phases

---

### Phase 11 — Enhanced Reports & Analytics
**Priority:** High
**Estimated scope:** Medium

#### Overview
Extend the reporting layer with category-level drill-down, net worth history, and top-payee analysis. These capabilities were deferred when Phase 8 shifted from a simpler budget model to the full Budget Lines architecture.

#### Feature Specs

**11.1 Spending by Category**
- Pie/donut chart: spending per category for a configurable date range
- Drill-down to subcategory level
- Toggle between expense categories and income categories

**11.2 Net Worth Over Time**
- Line chart: monthly net worth snapshots stored in `net_worth_snapshots` table
- Background job or on-demand snapshot via `POST /reports/net-worth/snapshot`
- Display alongside income/expenses chart on Dashboard

**11.3 Top Payees**
- Bar chart: top N payees by total spend for a configurable period
- Requires decrypting payee field at query time — consider a plaintext search index if performance is a concern

**11.4 Recurring Transactions**
- `recurring_transactions` table: template transaction, frequency, next_due_date, end_date
- Cron job generates actual transactions when due date is reached (idempotent via `next_due_date` advancement)
- UI to create/edit/pause/delete recurring transactions; "Skip this occurrence" action

#### Acceptance Criteria
- [ ] Spending by category chart matches sum of transactions for the period
- [ ] Net worth line chart reflects actual balance history
- [ ] Recurring transactions are generated on schedule without duplication

#### Notes
- **11.2 Net worth chart** requires new `net_worth_snapshots` table — no migration yet
- **11.4 Recurring transactions** — cron idempotency critical; use `next_due_date` advancement, not delete-and-recreate

---

### Phase 12 — Full-Text Transaction Search
**Priority:** Medium
**Estimated scope:** Medium

Build a secondary plaintext search index alongside encrypted transaction storage, enabling payee/description search without exposing PII in plaintext at rest.


- Dedicated search table (`transaction_search_index`) storing a deterministic hash-based search token or Meilisearch integration
- `GET /transactions?q=coffee` endpoint
- Frontend search bar in TransactionsPage

---

### Future Additions (Deferred)

**CSV & OFX Export**
- `GET /api/v1/transactions/export?format=csv&startDate=&endDate=` — streams CSV with decrypted payee/description
- OFX format export for import into Quicken/Mint
- All exports rate-limited and scoped to the requesting user
- *Note: transaction sensitive fields must be decrypted before streaming*

**Receipt Attachments**
- Photo attachment support: upload receipt images, stored encrypted in object storage (S3-compatible, e.g., MinIO on Unraid)
- `transaction_attachments` table: transaction_id FK, storage_key, mime_type, size_bytes; object stored encrypted with AES-256-GCM
- Thumbnail preview on transaction detail; download button

**fr-CA Localization**
- French (Canada) translation strings in `src/lib/i18n/locales/fr-CA.json`
- Locale selector in PreferencesPage becomes fully functional (currently `fr-CA` shown as "Coming soon")

**Savings Goal ↔ Budget Line Link**
- Add `recurring_contribution_budget_line_id` FK on `savings_goals`
- Budget Line contributions automatically tracked against goal progress
- Deferred: `savings_goals` table exists; FK can be added non-breakingly

---

## Technical Debt & Non-Feature Work

| Item | Priority | Notes |
|------|----------|-------|
| E2E test suite | High | No end-to-end tests exist. Add Playwright tests for critical paths: registration, login, create transaction, budget progress, budget view. |
| OpenAPI spec coverage | High | Spec only documents `/health` and partial auth paths. All other endpoints are undocumented. Full spec rewrite needed. |
| `database-schema.md` | Medium | Full schema reference document exists now (see `docs/planning/database-schema.md`). Keep updated as migrations are added. |
| Full-text transaction search | Medium | Requires maintaining a plaintext search index alongside encrypted fields. Deferred until architecture is finalized. |
| Budget Lines offline support | Medium | `useBudgetLines` hook lacks Dexie fallback; Budget View cannot be served offline — last cached view or clear "offline" state needed. Dexie schema needs `LocalBudgetLine` added. |
| Session management UI | Medium | Currently users can see active sessions but cannot see device names for refresh tokens. Add `device_name` population from User-Agent parsing. |
| Load testing | Medium | No load tests. Add k6 scripts for transaction import endpoint. |
| API pagination for accounts | Low | Accounts list is unbounded; add `page`/`limit` for users with many accounts. |
| Budget total validation | Low | Nothing prevents allocations from exceeding a desired ceiling. Add optional `limit` field to budgets table. |
| Rate limit tuning | Low | Auth endpoints use 5 req/15 min; evaluate whether this needs adjustment for WebAuthn flows where multiple round-trips are expected. |
| fr-CA i18n keys | Low | `en-CA.json` translation keys exist; `fr-CA.json` stub is needed but deferred. |
| Lighthouse PWA score | Low | Not formally measured. Requires production build with HTTPS to audit accurately. |

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
| Budget model | Budget Lines (Phase 8) | Forward-looking plan: lines belong to user (not a date-range container), schedule-driven occurrences, prorated Budget View replaces static allocations |
| i18n | i18next + react-i18next | Industry standard; JSON resource files; `useFormatters()` hook wraps `Intl.*` APIs for currency/date/time formatting |
| Conflict resolution (offline) | Server always wins | Single-user app — server is authoritative; conflicts surfaced as notifications, not silently merged |
