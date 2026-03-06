# BudgetApp — Product Roadmap v0.3

**Last updated:** 2026-03-02
**Previous release:** [v0.2](./product-roadmap.md)

---

## Vision

v0.3 focuses on developer experience, design quality, feature completeness, and the foundational shift to multi-user household support. It opens with Storybook (component library + interaction tests), followed by a theme preset system and design refresh, and a full dashboard widget revision pass. Multi-user household support (Phase 10) is built in parallel — backend first alongside Phases 1–3, frontend wired up after Phase 2. Reporting, tagging, rollover handling, and PWA improvements round out the release. Data export tools are on the wish list with no active development planned.

> **Recurring Transactions removed:** Phase 13.2 was cut. Budget lines cover the forecasting use case; SimpleFIN covers real transaction ingestion. Auto-generating real transactions via cron creates duplication risk with no meaningful gain. All backend/frontend recurring transaction code will be fully deleted and the `recurring_transactions` table dropped via a new migration.

---

## Phase 1 — Storybook Integration ✓

**Status:** Complete
**Priority:** High
**Scope:** Medium

#### 1.1 Storybook Setup

- Install `@storybook/react-vite`, `@storybook/test`, `@storybook/addon-interactions`, `@storybook/addon-essentials`
- `.storybook/main.ts`: Vite builder with all 8 path alias mappings from `vite.config.ts`
- `.storybook/preview.ts`: Tailwind global import, `I18nextProvider` decorator, `QueryClientProvider` decorator (fresh client per story), `ThemeProvider` decorator, viewport presets (mobile/tablet/desktop)
- Add `storybook`, `build-storybook`, and `test-storybook` scripts to `frontend/package.json`

#### 1.2 UI Primitive Stories (`src/components/ui/`)

Stories for all 11 Shadcn components with interaction tests (`@storybook/test`):
- `button` — variants, sizes, disabled, loading
- `input` — placeholder, with label, error, disabled
- `card` — with/without header/footer
- `dialog` — open/closed, with form content; interaction test
- `badge` — all colour variants
- `alert` — info/warning/error
- `tabs` — multi-tab; interaction test for tab switching
- `dropdown-menu` — trigger, items, disabled items; interaction test
- `form-field` — label + input + error composition
- `separator` — horizontal/vertical
- `label` — standalone, with `htmlFor`

#### 1.3 Chart & Layout Component Stories

- `MonthlyChart` — 6-month mock data, with/without forecast, empty
- `NetWorthChart` — positive trend, negative trend, flat
- `SpendingPieChart` — multi-category, single, empty
- `TopPayeesBarChart` — top 5 payees, empty
- `AccountCard` — asset/liability/credit/negative balance states
- `UserAvatarMenu` — closed/opened; interaction test for menu navigation

#### 1.4 Dashboard Widget Stories (`src/features/dashboard/widgets/`)

Each widget story mocks its custom hooks (no real API calls) and covers loaded, loading, and empty/error states. Interaction tests where applicable (e.g., WarningsWidget collapse/expand, MonthlyChartWidget forecast toggle).

#### Acceptance Criteria

- `npm run storybook` starts without errors; all stories render
- `npm run test-storybook` — all interaction tests pass
- Path aliases, Tailwind, and i18n work correctly in all stories
- No story makes real network requests

---

## Phase 2 — Theme Presets & Design Refresh ✓

**Status:** Complete
**Priority:** High
**Scope:** Medium

#### 2.1 CSS Custom Property Theme System

- Refactor Tailwind config to use CSS custom properties (`--color-primary`, `--color-surface`, `--color-muted`, etc.) instead of hardcoded palette values
- Define 5 curated theme presets applied via `data-theme="<name>"` on `<html>`:
  - **Default** (current design — starting reference)
  - **Slate** (cool grey/blue tones)
  - **Forest** (green accents)
  - **Warm** (amber/terracotta accents)
  - **Midnight** (darker surface, high-contrast accents)
- Theme stored in `user_preferences` (backend) and mirrored to `localStorage` for instant load without flash
- `ThemeProvider` React context applies `data-theme` and listens for preference changes

#### 2.2 Theme Picker in Account Settings

- "Appearance" card in `AccountSettingsPage` with a visual grid of theme swatches
- Selection calls `PATCH /api/v1/auth/me/preferences` (existing endpoint)
- i18n keys added to all 3 locales

#### 2.3 One-Time Design Refresh

- Audit and tune default spacing, font sizing, and padding across: navigation sidebar, table rows, card components, widget headers
- No user-facing toggle — improved baseline aesthetic only
- Update Storybook stories after refresh so they reflect the new visual baseline

#### Acceptance Criteria

- All 5 themes render without style leakage between switches
- Theme persists across page refresh and new sessions
- Design refresh passes visual review across all major pages at `lg` breakpoint
- Storybook stories updated to match refreshed design

---

## Phase 3 — Dashboard Widget Revisions ✓

**Status:** Complete
**Priority:** High
**Scope:** Medium
**Dependency:** Phase 1 (Storybook) — iterate widget designs in isolation before integration

#### 3.1 New Widgets

- **SpendingByCategoryWidget** — Pie/bar toggle showing category spend for the current period; reuses `SpendingPieChart`; powered by budget-view actuals or reports endpoint
- **DebtPayoffWidget** — Per-debt-account card showing principal, interest paid to date, and projected payoff date; powered by existing `useDebt()` hook
- **TagSummaryWidget** *(Phase 5 dependency)* — Horizontal bar chart of spend by tag; registered in widgetRegistry but gated by `featureFlag: 'tagging'` until Phase 5 ships

#### 3.2 Existing Widget Redesigns

- **AccountBalancesWidget**: Compact grid of balance cards with account type icon/badge; negative balances highlighted in red
- **BudgetSnapshotWidget**: Horizontal stacked bar (spent / remaining / over-budget) replaces single progress bar; over-budget categories as inline chips
- **MonthlyChartWidget**: Stacked area chart (income vs. expenses) replaces grouped bars; period selector (3 / 6 / 12 months)
- **NetWorthWidget**: Sparkline over last 6 months plus current total, colour-coded by positive/negative trend
- **RecentTransactionsWidget**: Category badge + account name per row; rows are clickable links; debit/credit colour coding
- **UpcomingExpensesWidget**: Built out from placeholder — lists budget line occurrences in the next 30 days grouped by week with amount and account
- **SavingsGoalsWidget**: Projected completion date alongside progress bar; goals behind pace highlighted in amber

#### 3.3 Widget Grid UX

- Update `DEFAULT_LAYOUTS` in `widgetRegistry.ts` to accommodate new widgets
- Add `minH` / `minW` constraints so widgets can't be shrunk below readability thresholds
- WidgetTray: group widgets by category (Overview, Budgeting, Savings, Spending, Debt)

#### Acceptance Criteria

- All 3 new widgets appear in WidgetTray and can be added to the dashboard
- All redesigned widgets render correctly across xs/sm/lg/xl breakpoints
- Widget Storybook stories updated to match new designs
- Existing saved dashboard configs load cleanly — no breaking changes to `DashboardConfig` schema

---

## Phase 4 — Top Payees Report ✓

**Status:** Complete
**Priority:** Medium
**Scope:** Small

- Bar chart: top N payees by total spend for a configurable period
- Payee field is AES-256-GCM encrypted — aggregate at query time by decrypting in the service layer (acceptable for single-user, small dataset)
- `GET /api/v1/reports/top-payees?start=&end=&limit=10` endpoint
- Drill-down to transaction list for a selected payee

#### Acceptance Criteria

- Top payees chart matches sum of transactions for the period

---

## Phase 5 — Transaction Tagging ✓

**Status:** Complete
**Priority:** Medium
**Scope:** Small

Allow freeform tags on transactions for cross-category grouping (e.g., "vacation", "home reno") without disrupting the category hierarchy.

- `transaction_tags` table: `transaction_id`, `tag` (plaintext, lowercase, trimmed)
- Tag input on TransactionForm (autocomplete from existing tags)
- Filter by tag in TransactionsPage filter bar
- `GET /api/v1/transactions?tag=vacation` endpoint filter
- Tag summary in Reports: total spend per tag for a date range
- Unlocks **TagSummaryWidget** in Phase 3 (remove `featureFlag` guard after this phase ships)

#### Acceptance Criteria

- Tags survive edit without duplication
- Tag filter in transactions list returns correct results
- Tag summary totals match raw transaction sums

---

## Phase 6 — Budget Period Rollover & Carry-Forward ✓

**Status:** Complete
**Priority:** Medium
**Scope:** Medium

When a budget period ends, surface unspent variable amounts and overspent categories for conscious carry-forward decisions rather than silently resetting. Also prompts the user to review all budget lines once every 365 days to confirm amounts and frequencies remain accurate.

#### 6.1 Rollover Detection

- At pay period boundary, compute surplus/deficit per flexible budget line vs. actual spend
- `GET /api/v1/budget-view/rollover?previousStart=&previousEnd=` — returns per-line variance summary

#### 6.2 Carry-Forward UI

- Dashboard warning widget surfaces "X budget period ended with unreviewed rollover"
- Rollover review dialog: list over/under lines, let user optionally create a one-time adjustment transaction
- After review, mark period as acknowledged (stored in `user_dashboard_config`)

#### 6.3 Annual Budget Line Review

Prompt the user once every 365 days (rolling from last review) to confirm all active budget lines are still accurate.

**Storage:** `budgetLinesLastReviewedAt` (ISO timestamp) persisted in `user_dashboard_config` JSON blob alongside existing acknowledged-rollover keys. No new backend table required.

**Warning surface:** `WarningsWidget` emits a "Your budget hasn't been reviewed in over a year — review now" notice when `budgetLinesLastReviewedAt` is `null` or older than 365 days. Driven by `GET /api/v1/dashboard/hints` (same pattern as existing warnings).

**Review dialog:**
- Lists all active budget lines: name, category, amount, frequency
- Per-line action: "Looks good ✓" (inline confirm) or "Edit" (navigates to the budget line edit form in a new tab / inline)
- "Done" button stamps `budgetLinesLastReviewedAt = now()` in dashboard config — only enabled once all lines have been either confirmed or saved
- Dismissing without completing does not update the timestamp; warning persists

**i18n:** `warnings.annualBudgetReview`, `budget.reviewDialog.*` keys added to all 3 locales

#### Acceptance Criteria

- Rollover summary accurately reflects prior period actuals vs. planned amounts
- One-time adjustment transaction created by user appears correctly in the new period's actuals
- Acknowledged rollovers do not re-appear in the warnings widget
- Annual review warning appears when `budgetLinesLastReviewedAt` is null or > 365 days ago
- Warning does not appear for a fresh install where no budget lines exist yet
- Completing the review (all lines confirmed or edited) stamps the timestamp and clears the warning for 365 days
- Dismissing the dialog without completing does not clear the warning

---

## Phase 7 — Savings Goal ↔ Budget Line Link ✓

**Status:** Complete
**Priority:** Low
**Scope:** Small

Link a savings goal to an existing budget line so that the line's scheduled contribution amount drives the goal's projected completion date.

#### 7.1 Backend

- Migration `20260227002`: adds `budget_line_id` (CHAR 36, nullable, FK → `budget_lines.id` SET NULL) to `savings_goals`
- `SavingsGoal` type updated with `budgetLineId: string | null`
- `savingsGoalRepository`: `rowToGoal()`, `create()`, `update()` all handle `budget_line_id`
- `savingsGoalService.getProgress()`: when `budgetLineId` is set, converts the line's `amount` + `frequency` to a monthly rate and projects `targetAmount − currentBalance` → months needed → `projectedDate`
- `createSavingsGoalSchema` / `updateSavingsGoalSchema`: `budgetLineId` Joi field added
- `GET /savings-goals/{id}/progress`: `projectedDate` is now budget-line driven when linked; falls back to target-date interpolation otherwise

#### 7.2 Frontend

- `SavingsGoal` / `CreateSavingsGoalInput` / `UpdateSavingsGoalInput` frontend types updated with `budgetLineId`
- `SavingsGoalsPage` form: optional "Linked Budget Line" select; filters to active income lines; shows `$amount / frequency` label
- `SavingsGoalCard` display: shows linked budget line name when present
- `SavingsGoalsWidget`: `projectedDate` from `useSavingsGoalProgress()` reflects budget-line-driven projection

#### 7.3 Documentation

- `docs/openapi/paths/savings-goals.yaml`: `budgetLineId` added to `SavingsGoal`, `CreateSavingsGoalRequest`, `UpdateSavingsGoalRequest` schemas; `GET /{id}/progress` description updated

#### Acceptance Criteria

- A savings goal with a linked biweekly $500 budget line shows a projected completion date of ≈ current balance deficit ÷ $1,083/month
- Unlinking the budget line (set to null) reverts projection to target-date interpolation or null
- Deleting the budget line automatically nullifies the FK (SET NULL) without deleting the goal

---

## Phase 8 — Mobile App Companion (PWA Enhancement) ✓

**Status:** Complete
**Priority:** Low
**Scope:** Large

Improve the PWA experience specifically for mobile use cases.

#### 8.1 Quick-Add Transaction ✓

- Floating action button (`md:hidden`) in `AppLayout` — fixed bottom-right, opens `QuickAddSheet` Dialog
- Minimal form: amount, payee, account (select), category (select), date; expense sign applied automatically
- Reuses `useCreateTransaction()` which handles offline queueing via Dexie + `queueMutation`

#### 8.2 Push Notifications ✓

- **Backend:** `web-push` npm package; VAPID keys + email in `env.push.*`; optional — all handlers no-op when unconfigured
- **Migration 20260301004:** `push_subscriptions` table; `push_enabled BOOLEAN DEFAULT false` + `push_preferences JSON NULL` columns on `users`
- **`pushSubscriptionRepository`:** `findByUser`, `findById`, `create`, `delete`, `deleteByUser`, `deleteByEndpoint`
- **`pushNotificationService`:** `isPushEnabled()` guard, `sendToUser(userId, payload)` (removes expired subs on 410), typed helpers `sendUpcomingBillAlert`, `sendGoalDeadlineAlert`, `sendSimplefinSyncError`
- **`notificationScheduler`:** daily cron 07:00 — upcoming fixed expenses due tomorrow, savings goal deadlines within 7 days; per-user `PushPreferences` respected
- **Routes:** `GET /push/vapid-key` (no auth), `POST /push/subscribe`, `DELETE /push/subscribe/:id`, `GET /push/subscriptions`
- **SimpleFIN scheduler:** fires `sendSimplefinSyncError` on sync failure (fire-and-forget)
- **`authService` / `userRepository`:** `pushEnabled` + `pushPreferences` read from DB + returned in `PublicUser`; `updatePreferences` persists both fields
- **Frontend types:** `PushPreferences`, `PushSubscriptionRecord` added to `auth/types`; `User.pushEnabled` + `User.pushPreferences` added; `UpdateProfileInput` extended
- **`pushApi.ts`:** `getVapidKey`, `subscribe`, `unsubscribe`, `listSubscriptions`
- **`sw.ts`:** `push` event handler (shows notification via `self.registration.showNotification`); `notificationclick` handler (focuses or opens app at target URL)
- **`usePushNotifications.ts`:** `usePushSubscriptions`, `usePushSubscribe` (request permission + subscribe), `useUnsubscribePush`, `isPushSupported()`
- **Notifications card in `AccountSettingsPage`:** master push toggle, per-type preference checkboxes (upcomingBills / simplefinErrors / goalDeadlines), device subscription list with remove button
- **i18n:** `settings.notifications.*` (16 keys) + `quickAdd.*` (9 keys) added to all 3 locales
- **OpenAPI:** `docs/openapi/paths/push.yaml` — `PushSubscription` schema + all 4 push endpoints

#### Acceptance Criteria

- Quick-add flow completes in < 5 taps on a phone ✓
- Push subscription survives browser restart ✓
- Push notifications respect user opt-in preferences ✓

---

## Phase 9 — Production Deployment Guide ✓

**Status:** Complete
**Priority:** Low
**Scope:** Small

- Step-by-step Unraid Community Application template documentation
- Docker Compose prod profile validation with HTTPS/TLS via Let's Encrypt or reverse proxy
- Backup/restore procedure for MariaDB volumes
- Health check endpoint documentation (`GET /health`)

See `docs/developer/deployment.md` for the full guide covering prerequisites, secret generation, SSL setup (Nginx Proxy Manager + self-signed options), first-run migrations, backup/restore via `mysqldump`, upgrade workflow, and troubleshooting reference.

---

## Phase 10 — Multi-User Household Support

**Priority:** High
**Scope:** Large
**Build order:** Backend (Phase 10.1) runs in parallel with Phases 1–3; Frontend (Phase 10.2) wired up after Phase 2

One household per deployment. The first registered user creates and names the household; thereafter registration is locked — new members are added directly by the owner. Each user can share any of their accounts with household members at a configurable access level. Categories become household-wide.

#### 10.1 Backend: Data Model & API

**New tables:**
- `households` — `id`, `name`, `created_at`, `updated_at`
- `household_members` — `id`, `household_id`, `user_id` (UNIQUE), `role ENUM('owner','member')`, `joined_at`
- `account_shares` — `id`, `account_id`, `shared_with_user_id`, `access_level ENUM('view','write')`, UNIQUE(`account_id`, `shared_with_user_id`)

**Modified tables:**
- `categories` — drop `user_id`; add `household_id FK → households`; data migration sets `household_id` from existing user's new household

**Registration guard:** `authService.register()` checks `SELECT COUNT(*) FROM households`. If > 0, throws 403. After first registration, returns `householdSetupRequired: true` on the user object.

**New endpoints:**
- `GET /api/v1/auth/registration-status` *(no auth)* — `{ registrationOpen: boolean }`
- `POST /api/v1/household/setup` — creates household, adds requesting user as owner, migrates categories
- `GET /api/v1/household` — household info + member list
- `POST /api/v1/household/members` — owner creates a new member account with optional account shares
- `DELETE /api/v1/household/members/:userId` — owner removes member; cleans up shares, deactivates account
- `PATCH /api/v1/household` — rename household (owner only)
- `GET /api/v1/accounts/:id/shares` — list account shares (account owner only)
- `PUT /api/v1/accounts/:id/shares` — bulk replace account shares
- `PATCH /api/v1/accounts/:id/shares/:userId` — update one share's access level

**Query changes:** All account-scoped repository queries updated to include shared accounts:
```sql
WHERE (a.user_id = :userId OR EXISTS (
  SELECT 1 FROM account_shares s
  WHERE s.account_id = a.id AND s.shared_with_user_id = :userId
))
```
Write mutations on shared accounts additionally verify `access_level = 'write'`.
Category queries switch from `user_id = :userId` to `household_id = :householdId`.

New middleware: `requireHouseholdRole('owner' | 'member')` — guards owner-only routes.

#### 10.2 Frontend: Household UI

**First-run flow:**
- `/setup` route (HouseholdSetupPage) — accessible only when `user.householdSetupRequired = true`
- After household name is submitted, redirect to dashboard; flag cleared on user object

**Login page:**
- Calls `GET /registration-status` on mount; shows "Get Started" button only when `registrationOpen: true`
- After household exists, login page shows no sign-up link

**Settings → Household:**
- New `/settings/household` page — household name (editable by owner), member list, "Add Member" button
- Add Member dialog: email + display name + password + account access selector (per-account: None / View / Write, with "Select All View" and "Select All Write" buttons)

**Account sharing:**
- AccountCard: shared accounts show "Shared" badge + owner's name
- Share icon in account actions → AccountShareDialog (per-member access level controls)
- AccountsPage groups accounts: "My Accounts" + "Shared with Me" sections

**Shared data visibility:**
- TransactionsPage: transactions on shared accounts visible; owner name shown on shared account rows
- Categories: fetched by household — no per-user filtering

#### Acceptance Criteria

- Fresh deployment: registration open, first user registers, household setup page appears
- After household setup: `/register` returns 403; login page shows no sign-up link
- Owner adds a member with View access on account A and Write access on account B
- New member logs in: sees accounts A and B; can add transactions to B but not A
- Owner removes member: account_shares cleaned up; member account deactivated
- Existing data unaffected — all single-user queries still return correct results

---

## Wish List — Export & Attachments

**Priority:** Deferred (no active development planned)
**Scope:** Medium

#### CSV / OFX Export

- `GET /api/v1/transactions/export?format=csv&start=&end=` — streams CSV with decrypted payee/description; rate-limited and scoped to requesting user
- OFX format export for import into Quicken/Mint
- Download button on TransactionsPage with format selector and date range picker

#### Receipt Attachments

- Photo attachment upload per transaction; stored encrypted (AES-256-GCM) in MinIO/S3-compatible object storage
- `transaction_attachments` table: `transaction_id`, `storage_key`, `mime_type`, `size_bytes`
- Thumbnail preview on transaction detail; download button
- Docker Compose dev environment extended with MinIO service

---

## Technical Debt Candidates for v0.3

| Item | Priority | Notes |
|------|----------|-------|
| Recurring transaction code + schema deletion | High | Full removal: backend service/scheduler/controller/repo/routes, frontend page/hooks/api/types, DROP TABLE migration |
| Tailwind CSS custom property refactor | High | Prerequisite for Phase 2 theme system |
| Category table migration (user_id → household_id) | High | Prerequisite for Phase 10 household support; data migration must run cleanly on existing single-user deployments |
| Account repository query refactor for sharing | High | All account-scoped queries in Phase 10 must include `account_shares` join |
| OpenAPI coverage for new v0.3 endpoints | Medium | Maintain full spec coverage — household + account-sharing endpoints need YAML definitions |
| E2E tests for household, tagging, and rollover flows | Medium | Extend Playwright suite |
| Dashboard hints — ML/agent augmentation | Low | MCP server (Phase 18) can push hints via `GET /dashboard/hints`; consider structured hint schema |
| MinIO/S3 integration | Low | Only needed if Export wish list item is promoted |

---

## Architecture Decisions Log (v0.3 additions)

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| Recurring transactions | **Removed** | Budget lines cover the forecasting use case; SimpleFIN covers real transaction import. Auto-generation created duplication risk with no meaningful gain for a single-user app. |
| Theme system | CSS custom properties + `data-theme` attribute | Zero-JS theme switching; compatible with Tailwind 3.x via `var(--token)` in config; survives PWA without FOUC when combined with `localStorage` pre-load |
| Storybook builder | `@storybook/react-vite` | Matches existing Vite 5 setup; shares path aliases and plugin config; faster than webpack builder |
| Widget hook mocking in Storybook | Module-level mock via Storybook loaders | Avoids MSW complexity for a single-user app; custom hooks return static fixture data in story context |
| Tag model | Flat `transaction_tags` join table | Simple; avoids FK complexity of a `tags` master table for freeform user labels |
| Rollover carry-forward | User-initiated adjustment transactions | Preserves immutable transaction history; no silent balance corrections |
| Annual budget review trigger | Rolling 365 days from last review | Simpler than calendar-year logic; works regardless of when the user started using the app; stored as a timestamp in existing `user_dashboard_config` JSON — no new schema needed |
| Annual review completion gate | All lines must be confirmed or edited before timestamp is stamped | Prevents accidental dismissal; ensures the user has consciously evaluated every line rather than just clicking through |
| Household model | One household per deployment; `household_members` join table; owner creates members directly | Single-household constraint keeps the auth model simple; no invite emails required for a family self-hosted setup |
| Account sharing | `account_shares` with `access_level ENUM('view','write')` per pair | Configurable per account rather than per user role; owner always retains full control |
| Category ownership | Household-wide (migrated from per-user) | Shared categories are the natural fit for household budgeting; per-user categories added complexity for no real benefit |
| Registration lockdown | Guard in `authService.register()` checking household count; `GET /registration-status` for UI | Server-side guard is authoritative; status endpoint prevents bad UX of a rejected form submission |
| Attachment storage | MinIO (S3-compatible) | Self-hosted, Unraid-native; same AES-256-GCM pipeline as DB fields — deferred to wish list |
