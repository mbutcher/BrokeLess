# Phase 5 Review — SimpleFIN Bank Sync

**Date:** 2026-02-20
**Status:** Complete
**Bugs fixed post-implementation:** 4

---

## Summary

Phase 5 added SimpleFIN Bridge integration so BudgetApp can pull real bank transactions. The design is **manual-first sync**: the user explicitly triggers sync because SimpleFIN pulls live from banks, which can trigger 2FA prompts from financial institutions. An optional scheduled sync (node-cron, every 15 min with per-user eligibility checks) is available as opt-in with a user-configured time window. A five-layer deduplication pipeline prevents double-imports, and a fuzzy Levenshtein similarity check flags near-duplicates for user review rather than silently importing or dropping them.

---

## Files Created

### Backend

#### Database Migrations

| File | Purpose |
|------|---------|
| `database/migrations/20260220010_add_simplefin_to_accounts.ts` | Adds `simplefin_account_id VARCHAR(255) NULLABLE` + unique constraint per user — maps a local account to its SimpleFIN counterpart |
| `database/migrations/20260220011_add_simplefin_to_transactions.ts` | Adds `simplefin_transaction_id VARCHAR(255) NULLABLE` + unique constraint per user — primary deduplication key for imported transactions |
| `database/migrations/20260220012_create_simplefin_connections.ts` | Per-user SimpleFIN connection: encrypted access URL, sync status/timestamp, auto-sync schedule (enabled, interval hours, window start/end), `discarded_ids_json` TEXT for discard tombstones |
| `database/migrations/20260220013_create_simplefin_account_mappings.ts` | Tracks each SimpleFIN account discovered during sync — `local_account_id` null until user maps it on the Imports page |
| `database/migrations/20260220014_create_simplefin_pending_reviews.ts` | Holds fuzzy-match near-duplicates pending user review — stores encrypted raw SimpleFIN JSON, similarity score, candidate transaction ID, and local account ID |
| `database/migrations/20260220015_add_local_account_to_pending_reviews.ts` | Post-review bug fix: adds `local_account_id` to `simplefin_pending_reviews` so `resolveReview` accept knows which account to import into without re-querying mappings |

#### Types

| File | Purpose |
|------|---------|
| `types/simplefin.types.ts` | SimpleFIN Bridge API response shapes: `SimplefinOrg`, `SimplefinTransaction`, `SimplefinAccount`, `SimplefinApiResponse` |
| `types/core.types.ts` (edited) | Added `SimplefinConnection`, `SimplefinAccountMapping`, `SimplefinPendingReview` (with `localAccountId`), `SyncResult`, `MapAccountData`, `UpdateSimplefinScheduleData` |

#### Repositories

| File | Purpose |
|------|---------|
| `repositories/simplefinRepository.ts` | Connection CRUD; `findAccessUrl` (encrypted URL, internal use only); `updateSyncStatus/Timestamp`; `updateSchedule`; `addDiscardedId`/`getDiscardedIds` (JSON array in `discarded_ids_json`); `findAllAutoSyncEligible` for scheduler |
| `repositories/simplefinAccountMappingRepository.ts` | `findBySimplefinId`, `findAllByUser`, `findUnmapped`, `upsert` (INSERT … ON DUPLICATE KEY UPDATE), `setLocalAccount` |
| `repositories/simplefinPendingReviewRepository.ts` | `findAllByUser`, `findById`, `findBySimplefinTxId`, `create` (encrypts raw JSON), `delete`, `countByUser`; `rowToReview` decrypts raw data before returning |

#### Services / Clients

| File | Purpose |
|------|---------|
| `services/integrations/simplefinApiClient.ts` | Thin Axios wrapper; `fetchAccounts(accessUrl, startDate?)` — access URL is itself the endpoint with embedded credentials; maps HTTP errors to `AppError` |
| `services/integrations/simplefinService.ts` | Core business logic: `connect` (validate URL before storing), `disconnect`, `getConnection`, `sync` (5-layer deduplication pipeline), `importTransactions` (private), `mapAccount` (link or create), `getPendingReviews`, `getPendingReviewCount`, `resolveReview` (accept/merge/discard), `updateSchedule`, `getSchedule` |
| `services/integrations/simplefinScheduler.ts` | node-cron job (every 15 min); per-connection eligibility check (auto-sync enabled, within time window, interval elapsed); graceful `start()`/`shutdown()` |
| `utils/similarity.ts` | Levenshtein edit-distance similarity function; pure, no npm dependencies; returns 0.0–1.0 |

#### Controllers & Routes

| File | Purpose |
|------|---------|
| `controllers/simplefinController.ts` | 11 `asyncHandler`-wrapped handlers: `getStatus`, `connect`, `disconnect`, `sync`, `getSchedule`, `updateSchedule`, `getUnmappedAccounts`, `mapAccount`, `getPendingReviews`, `getPendingReviewCount`, `resolveReview` |
| `routes/simplefinRoutes.ts` | All routes behind `authenticate`; `validateRequest` on `connect`, `updateSchedule`, `mapAccount`, `resolveReview` |
| `routes/index.ts` (edited) | Added `router.use('/simplefin', simplefinRoutes)` |
| `index.ts` (edited) | `simplefinScheduler.start()` after DB init; `simplefinScheduler.shutdown()` in SIGTERM/SIGINT handlers |

#### Validators

| File | Schemas added |
|------|---------------|
| `validators/coreValidators.ts` (edited) | `connectSimplefinSchema`, `updateSimplefinScheduleSchema`, `mapAccountSchema`, `resolveReviewSchema` |

### Tests

| File | Coverage |
|------|---------|
| `__tests__/utils/similarity.test.ts` | Identical strings, empty strings, case-insensitivity, partial similarity, symmetry, one-empty-string edge case, related payee scores, unrelated payee below 0.70 threshold (10 tests) |
| `__tests__/services/simplefinService.test.ts` | connect (validate + encrypt), disconnect (404 + success), sync (unmapped, import, pending, discarded, fuzzy, error handling), resolveReview (404, accept, accept-no-account, discard, merge, merge-no-id, merge-target-not-found), getPendingReviewCount (21 tests) |
| `__tests__/controllers/simplefinController.test.ts` | getStatus (connected + disconnected), connect (201), disconnect, sync, mapAccount, getPendingReviewCount, resolveReview (with and without targetTransactionId) (9 tests) |

### Frontend

| File | Purpose |
|------|---------|
| `features/integrations/types/index.ts` | `SimplefinConnection`, `SimplefinAccountMapping`, `SimplefinPendingReview` (with `localAccountId`), `SyncResult`, `UpdateScheduleInput`, `MapAccountAction`, `ResolveReviewAction` |
| `features/integrations/api/simplefinApi.ts` | 11 typed Axios wrappers for all SimpleFIN endpoints |
| `features/integrations/hooks/useSimplefin.ts` | 5 queries (`useSimplefinStatus`, `useSimplefinSchedule`, `useUnmappedAccounts`, `usePendingReviews`, `usePendingReviewCount`) + 6 mutations (`useConnectSimplefin`, `useDisconnectSimplefin`, `useSyncNow`, `useUpdateSchedule`, `useMapAccount`, `useResolveReview`); `useSyncNow` also invalidates `accounts` and `transactions` queries |
| `features/integrations/components/SetupInstructionsCard.tsx` | Collapsible 4-step setup guide with 2FA advisory; `defaultCollapsed` prop collapses it once connected |
| `features/integrations/pages/SimplefinSettingsPage.tsx` | Setup Instructions, Connection (connect form / sync + disconnect), Sync Schedule (enable toggle, interval select, time-window selects) |
| `features/integrations/pages/ImportsPage.tsx` | Account Mapping Required (per-account link/create cards), Pending Transaction Reviews (side-by-side comparison, 3 action buttons), Last Sync history |
| `components/layout/AppLayout.tsx` (edited) | Added "Imports" nav item (conditional on SimpleFIN connection, badge = reviews + unmapped); added "Integrations" link to settings section |
| `app/App.tsx` (edited) | Added routes `/imports` → `ImportsPage`, `/settings/integrations/simplefin` → `SimplefinSettingsPage` |

### Frontend Tests

| File | Coverage |
|------|---------|
| `__tests__/hooks/useSimplefin.test.tsx` | `useSimplefinStatus` (success + null when disconnected), `usePendingReviews`, `usePendingReviewCount`, `useConnectSimplefin`, `useDisconnectSimplefin`, `useSyncNow`, `useResolveReview` (8 tests) |

---

## Bugs Found and Fixed During Review

### 1. CRITICAL: `resolveReview` accept imported transaction into wrong account

**Impact:** The `accept` action loaded all account mappings for the user, then picked the first one with a non-null `localAccountId`. This was arbitrary — for a user with multiple mapped accounts it would import transactions into whichever account happened to sort first, silently corrupting the transaction history.

**Fix:** Added `local_account_id` column to `simplefin_pending_reviews` (migration 20260220015). The `importTransactions` method now stores `localAccountId` when creating a review. `resolveReview` accept reads `review.localAccountId` directly — no mapping lookup needed. Added a 422 guard for the (impossible post-fix) case where the field is null.

---

### 2. CRITICAL: `resolveReview` accept double-counted the transaction amount in the account balance

**Impact:** When a user accepted a pending review, the service created the transaction via `transactionRepository.create()` and then called `accountRepository.updateBalance()` with the SimpleFIN amount. But the balance was already set from SimpleFIN's reported balance during sync (`setCurrentBalance`). This caused a second incorrect adjustment — e.g., a -$25 grocery would cause the balance to drop by $25 again even though it had already been accounted for.

**Fix:** Removed the `accountRepository.updateBalance()` call from the accept path. Added a code comment in `importTransactions` making the no-balance-update intent explicit, matching the comment that already existed in that method.

---

### 3. Schedule form initialized from stale defaults, not saved server data

**Impact:** `useState(() => schedule?.autoSyncEnabled ?? false)` runs once at mount. When `useSimplefinSchedule()` returned `undefined` on first render (query still loading), the form initialised to all defaults and never updated when data arrived. Users who had previously saved a custom schedule would see the default state (auto-sync off, 24-hour interval) rather than their saved settings.

**Fix:** Replaced the `useState` initialiser with hardcoded defaults. Added a `useEffect` that calls `setScheduleForm(...)` whenever the `schedule` query result changes from `undefined` to a loaded value. `useState` import was extended to include `useEffect`.

---

### 4. Unguarded `JSON.parse` in `getDiscardedIds` and `addDiscardedId`

**Impact:** If `discarded_ids_json` in the database contained malformed JSON (e.g., truncated write, manual edit, or migration artefact), both methods would throw an uncaught `SyntaxError` that would propagate through the sync pipeline, causing the entire sync to fail with a 500 error instead of recovering gracefully.

**Fix:** Wrapped `JSON.parse` calls in try/catch in both methods. On parse failure, `getDiscardedIds` returns `[]` (treat as no discarded IDs — safe, may re-flag some reviews but won't lose data) and `addDiscardedId` initialises `existing` to `[]` before pushing the new ID.

---

## Refactors Applied During Review

### Refactor 1: Add `findById` to `simplefinPendingReviewRepository` — eliminate full-table scan in `resolveReview`

**Before:** `resolveReview` called `findAllByUser(userId)` then did an in-memory `Array.find()` to locate the review by ID. This loaded and decrypted all pending reviews (O(n) DB rows + O(n) decryption operations) to find a single row.

**After:** Added `findById(userId, reviewId)` to the repository (single-row query by PK + user_id for ownership check). `resolveReview` now calls `findById` directly.

---

## API Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/simplefin/status` | Get SimpleFIN connection status |
| POST | `/api/v1/simplefin/connect` | Connect SimpleFIN (exchange setup URL) |
| DELETE | `/api/v1/simplefin/disconnect` | Disconnect SimpleFIN (keeps mappings + reviews) |
| POST | `/api/v1/simplefin/sync` | Trigger manual sync; returns `SyncResult` |
| GET | `/api/v1/simplefin/schedule` | Get auto-sync schedule settings |
| PATCH | `/api/v1/simplefin/schedule` | Update auto-sync schedule |
| GET | `/api/v1/simplefin/accounts/unmapped` | List unmapped SimpleFIN accounts |
| POST | `/api/v1/simplefin/accounts/:simplefinAccountId/map` | Map SimpleFIN account (link or create) |
| GET | `/api/v1/simplefin/reviews` | List pending transaction reviews |
| GET | `/api/v1/simplefin/reviews/count` | Count pending reviews (for nav badge) |
| POST | `/api/v1/simplefin/reviews/:reviewId/resolve` | Resolve review (accept / merge / discard) |

---

## Security Checklist

| Control | Status |
|---------|--------|
| All routes behind `authenticate` middleware | ✅ |
| Write routes validated via `validateRequest` + Joi | ✅ |
| userId always from JWT — never trusted from request body | ✅ |
| SimpleFIN access URL AES-256-GCM encrypted at rest | ✅ |
| Access URL excluded from `SimplefinConnection` type — `findAccessUrl()` is a separate internal method | ✅ |
| Pending review raw transaction data AES-256-GCM encrypted at rest | ✅ |
| `mapAccount` verifies local account belongs to requesting user before linking | ✅ |
| `resolveReview` verifies review belongs to requesting user via `findById(userId, reviewId)` | ✅ |
| `resolveReview` merge verifies target transaction belongs to requesting user | ✅ |
| No balance manipulation on `resolveReview` accept — balance already set from SimpleFIN reported value | ✅ |
| Discard tombstones stored server-side (not client-controllable) | ✅ |
| Fuzzy match compares amount within $0.01 AND payee similarity ≥ 0.70 — both required | ✅ |
| `JSON.parse` for discarded IDs wrapped in try/catch — corrupt data degrades gracefully | ✅ |

---

## Architectural Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Sync trigger | Manual-first; optional scheduled | User controls when bank 2FA prompts fire |
| Scheduler | node-cron every 15 min + per-connection eligibility | Already installed; no Bull/Redis queue needed |
| Access URL storage | `encryptionService.encrypt()` (AES-256-GCM) | Consistent with email/TOTP encryption pattern |
| New SimpleFIN account | Require user mapping before importing | Prevents silent duplicate account creation |
| Fuzzy match threshold | 0.70 similarity + $0.01 amount tolerance | Below 0.70 is coincidental; not so strict it misses real duplicates |
| Fuzzy match scope | Last 14 days, same account, decrypted in-memory | Bounds memory; new imports won't be older than 14 days |
| Discard tombstone | `discarded_ids_json` TEXT on `simplefin_connections` | Bounded JSON array; no extra table needed |
| Pending review `merge` | Mark existing transaction cleared; no new transaction | Reuses existing transaction; avoids double-counting |
| `disconnect` behavior | Deletes connection; keeps mappings + reviews | Re-connecting retains account mappings and review history |
| Levenshtein | Inline utility, no npm dependency | Simple enough to implement; avoids an extra dependency |
| `localAccountId` on pending reviews | Stored at review-creation time during sync | Ensures `resolveReview` accept uses the correct account without re-querying mappings |

---

## Known Limitations / Phase 6+ Work

- **No balance reconciliation on accept:** When a user accepts a pending review, the transaction is imported but the account balance is not adjusted. The balance reflects SimpleFIN's last-reported value from the most recent sync; it will be corrected on the next sync. This is intentional but means balances can lag by one sync cycle after accepts.
- **Discard list is unbounded in edge cases:** The `discarded_ids_json` array grows with each discard. In practice users rarely discard many transactions, but a future migration could add a dedicated `simplefin_discarded_ids` table if the list becomes large.
- **No balance update on `setCurrentBalance` during accept path:** If a user has not synced recently and accepts a review, the account balance shown in the UI will be the SimpleFIN balance from the last sync, not the current bank balance.
- **Scheduler uses server local time for window checks:** `new Date().getHours()` returns server local time. Deployments in a different timezone from the user will see window drift. A future improvement could store windows as UTC offsets.
