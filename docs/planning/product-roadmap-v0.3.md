# BudgetApp — Product Roadmap v0.3

**Last updated:** 2026-02-26
**Previous release:** [v0.2](./product-roadmap.md)

---

## Vision

v0.3 focuses on completing the reporting surface, enabling data portability, tightening the savings-goal and budget-line model, and hardening the production deployment story. It also introduces the recurring transaction engine that was deferred from v0.1.

---

## Carried Forward from v0.2

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

### Phase 17.3 — Savings Goal ↔ Budget Line Link

**Priority:** Low
**Scope:** Small

- Add `recurring_contribution_budget_line_id` FK on `savings_goals`
- Budget Line contributions automatically tracked against goal progress
- `savings_goals` table exists; FK can be added non-breakingly
- Progress bar on SavingsGoalPage reflects scheduled contributions in addition to current balance

---

### Phase 17.6 — Production Deployment Guide

**Priority:** Low
**Scope:** Small

- Step-by-step Unraid Community Application template documentation
- Docker Compose prod profile validation with HTTPS/TLS via Let's Encrypt or reverse proxy
- Backup/restore procedure for MariaDB volumes and MinIO data
- Health check endpoint documentation (`GET /health`)

---

## New in v0.3

### Phase 21 — Transaction Tagging & Notes

**Priority:** Medium
**Scope:** Small

Allow freeform tags on transactions for cross-category grouping (e.g., "vacation", "home reno") without disrupting the category hierarchy.

- `transaction_tags` table: `transaction_id`, `tag` (plaintext, lowercase, trimmed)
- Tag input on TransactionForm (autocomplete from existing tags)
- Filter by tag in TransactionsPage filter bar
- `GET /api/v1/transactions?tag=vacation` endpoint filter
- Tag summary in Reports: total spend per tag for a date range

#### Acceptance Criteria

- Tags survive edit without duplication
- Tag filter in transactions list returns correct results
- Tag summary totals match raw transaction sums

---

### Phase 22 — Budget Period Rollover & Carry-Forward

**Priority:** Medium
**Scope:** Medium

When a budget period ends, surface unspent variable amounts and overspent categories for conscious carry-forward decisions rather than silently resetting.

#### 22.1 Rollover Detection

- At pay period boundary, compute surplus/deficit per flexible budget line vs. actual spend
- `GET /api/v1/budget-view/rollover?previousStart=&previousEnd=` — returns per-line variance summary

#### 22.2 Carry-Forward UI

- Dashboard warning widget surfaces "X budget period ended with unreviewed rollover"
- Rollover review dialog: list over/under lines, let user optionally create a one-time adjustment transaction
- After review, mark period as acknowledged (stored in `user_dashboard_config`)

#### Acceptance Criteria

- Rollover summary accurately reflects prior period actuals vs. planned amounts
- One-time adjustment transaction created by user appears correctly in the new period's actuals
- Acknowledged rollovers do not re-appear in the warnings widget

---

### Phase 23 — Mobile App Companion (PWA Enhancement)

**Priority:** Low
**Scope:** Large

Improve the PWA experience specifically for mobile use cases.

#### 23.1 Quick-Add Transaction

- Floating action button on mobile (`xs`/`sm` breakpoints) → bottom sheet with minimal transaction form (amount, payee, account, category)
- Pre-fills date to today; opens full form if more detail needed
- Queues offline if no connection

#### 23.2 Push Notifications (optional)

- `PushManager` subscription stored per device session
- Notification triggers: upcoming bill within 24 h, SimpleFIN sync error, savings goal deadline in 7 days
- Backend: `POST /api/v1/push/subscribe`, `DELETE /api/v1/push/subscribe/:id`
- Opt-in per notification type in Account Settings → Preferences

#### Acceptance Criteria

- Quick-add flow completes in < 5 taps on a phone
- Push subscription survives browser restart
- Push notifications respect user opt-in preferences

---

## Technical Debt Candidates for v0.3

| Item | Priority | Notes |
|------|----------|-------|
| Recurring transaction cron idempotency | High | Prerequisite for Phase 13.2 |
| MinIO/S3 integration for attachments | Medium | Prerequisite for Phase 15.2 |
| OpenAPI coverage for new v0.3 endpoints | Medium | Maintain full spec coverage |
| E2E tests for export and recurring flows | Medium | Extend Playwright suite |
| Dashboard hints — ML/agent augmentation | Low | MCP server (Phase 18) can push hints via `GET /dashboard/hints`; consider structured hint schema |

---

## Architecture Decisions Log (v0.3 additions)

| Decision | Chosen | Rationale |
|----------|--------|-----------|
| Attachment storage | MinIO (S3-compatible) | Self-hosted, Unraid-native; same AES-256-GCM pipeline as DB fields |
| Tag model | Flat `transaction_tags` join table | Simple; avoids FK complexity of a `tags` master table for freeform user labels |
| Rollover carry-forward | User-initiated adjustment transactions | Preserves immutable transaction history; no silent balance corrections |
