# PRD — Phase 8: Mobile App Companion (PWA Enhancement)

**Version:** v0.3
**Priority:** Low
**Scope:** Large
**Status:** Ready for development

---

## Overview

Improve the Progressive Web App experience for mobile use cases. Phase 8.1 adds a quick-add transaction flow (floating action button → bottom sheet) optimised for one-handed phone use. Phase 8.2 (optional) adds push notifications for key budget events.

---

## Problem Statement

Adding a transaction on mobile currently requires navigating to TransactionsPage, tapping the add button, and filling a full form — 6+ taps and significant scrolling. The app has a desktop-first UX that works acceptably on mobile but is not optimised for the quick "just spent $8 on coffee" capture use case that mobile users need most.

---

## Goals

- Quick-add transaction flow completeable in < 5 taps on mobile
- Bottom sheet with minimal required fields (amount, payee, account, category)
- Pre-fill date to today; option to open full form for additional fields
- Offline queueing: if no connection, transaction queues to Dexie and syncs when back online
- (Optional) Push notifications for upcoming bills, sync errors, and savings goal deadlines

## Non-Goals

- Full transaction editing in the quick-add flow
- Voice input
- Receipt capture (Wish List item)
- Quick-add on desktop (FAB only visible at `xs`/`sm` breakpoints)

---

## User Stories

1. As a user on my phone, I can tap a floating action button on any page to open a quick-add transaction sheet, so I can log spending immediately without navigating to the transactions page.
2. As a user, the quick-add sheet pre-fills today's date and remembers my last used account, so I minimise taps.
3. As a user offline, I can still add a transaction via the quick-add sheet — it queues locally and syncs automatically when connection is restored.
4. *(Optional)* As a user, I can opt in to push notifications for upcoming bills, sync errors, and savings goal deadlines.

---

## Functional Requirements

### 8.1 Quick-Add Transaction

#### Floating Action Button (FAB)

- Visible only at `xs` and `sm` breakpoints (hidden at `md` and above via `hidden md:hidden` or Tailwind responsive class)
- Position: fixed, bottom-right, above bottom navigation (if any) — `bottom: 1.5rem; right: 1.5rem`
- Icon: `+` or `Plus` icon
- Tapping FAB opens the QuickAddSheet
- FAB is rendered in `AppLayout` so it appears on all authenticated pages

#### QuickAddSheet (Bottom Sheet)

Bottom sheet slides up from the bottom of the screen. Required fields only:

```
┌─────────────────────────────────────────────┐
│  ⌄ Quick Add Transaction                   │
├─────────────────────────────────────────────┤
│  Amount        [  $   0.00  ]               │
│  Payee         [ ____________ ]             │
│  Account       [ ▾ Chequing  ]              │
│  Category      [ ▾ Dining    ]              │
│  Date          [ Today       ]              │
├─────────────────────────────────────────────┤
│  [Open Full Form]    [Save Transaction]     │
└─────────────────────────────────────────────┘
```

- **Amount:** numeric input; keyboard opens in numeric mode (`inputMode="decimal"`)
- **Payee:** text input with autocomplete from recent payees (reuse existing payee autocomplete logic)
- **Account:** dropdown from user's accounts; defaults to last used account (stored in localStorage key `quickAddLastAccount`)
- **Category:** dropdown from categories; defaults to last used category (stored in localStorage key `quickAddLastCategory`)
- **Date:** defaults to today; tapping opens a date picker; most users will leave it as today
- **"Open Full Form":** saves current field values to sessionStorage and navigates to `/transactions/new` with those values pre-filled
- **"Save Transaction":** validates and submits; on success shows a brief success toast and closes the sheet

#### Offline Queueing

When `useNetworkStore().isOnline === false`:
- Transaction is saved to a new Dexie table `pendingTransactions` (or existing offline queue if one exists — check `src/lib/db/index.ts`)
- Toast: "Saved offline — will sync when reconnected"
- When `isOnline` returns to `true`, a background effect flushes `pendingTransactions` one at a time via the normal create endpoint
- If sync fails for a queued transaction, it stays in the queue with a `failedAt` timestamp and the user sees a toast: "X transactions waiting to sync"

Dexie schema addition (new version bump):
```ts
pendingTransactions: '++id, queuedAt, failedAt'
```

#### Validation

Same Zod schema as the full transaction form, applied to the minimal fields. Amount must be > 0. Payee must be non-empty.

### 8.2 Push Notifications (Optional)

#### Subscription Flow

- `NotificationSettings` card in Account Settings → Preferences
- "Enable notifications" toggle — calls `PushManager.requestPermission()`
- On granted: generates push subscription, `POST /api/v1/push/subscribe`
- Per-notification-type toggles (defaults: all on):
  - Upcoming bill within 24 hours
  - SimpleFIN sync error
  - Savings goal deadline within 7 days

#### Backend

New endpoints:
- `POST /api/v1/push/subscribe` — stores `{ endpoint, keys: { p256dh, auth } }` in new `push_subscriptions` table
- `DELETE /api/v1/push/subscribe/:id` — removes subscription

New table: `push_subscriptions`
```sql
CREATE TABLE push_subscriptions (
  id           CHAR(36)  NOT NULL PRIMARY KEY,
  user_id      CHAR(36)  NOT NULL,
  endpoint     TEXT      NOT NULL,
  p256dh_key   TEXT      NOT NULL,
  auth_key     TEXT      NOT NULL,
  preferences  JSON      NOT NULL DEFAULT '{"upcomingBill":true,"syncError":true,"goalDeadline":true}',
  created_at   DATETIME  NOT NULL,
  CONSTRAINT fk_push_subscriptions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
```

Notification dispatch: Node.js `web-push` library. Trigger points (cron or event-driven):
- Upcoming bill: budget lines with next occurrence within 24h → push to all user subscriptions
- Sync error: SimpleFIN sync job failure → push immediately
- Goal deadline: savings goals with `targetDate` within 7 days and progress < 100% → daily check

---

## Technical Requirements

### New Files

| File | Purpose |
|------|---------|
| `frontend/src/features/transactions/components/QuickAddSheet.tsx` | Bottom sheet component |
| `frontend/src/features/transactions/components/FloatingActionButton.tsx` | FAB component |
| `frontend/src/features/transactions/hooks/useQuickAdd.ts` | Submit + offline queue logic |
| `backend/src/controllers/push/pushController.ts` | Subscribe/unsubscribe (Phase 8.2) |
| `backend/src/services/push/pushService.ts` | web-push dispatch (Phase 8.2) |
| `backend/src/database/migrations/20260304001_create_push_subscriptions.ts` | Phase 8.2 table |

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/app/AppLayout.tsx` | Add FAB component (mobile only) |
| `frontend/src/lib/db/index.ts` | Add `pendingTransactions` table (new Dexie version) |
| `frontend/src/features/auth/pages/AccountSettingsPage.tsx` | Notification settings (Phase 8.2) |

### i18n Keys (all 3 locales)

```json
"quickAdd": {
  "title": "Quick Add Transaction",
  "amountLabel": "Amount",
  "payeeLabel": "Payee",
  "accountLabel": "Account",
  "categoryLabel": "Category",
  "dateLabel": "Date",
  "openFullForm": "Open Full Form",
  "save": "Save Transaction",
  "successToast": "Transaction saved",
  "offlineToast": "Saved offline — will sync when reconnected",
  "syncPendingToast_one": "{{count}} transaction waiting to sync",
  "syncPendingToast_other": "{{count}} transactions waiting to sync"
},
"settings": {
  "notifications": {
    "title": "Notifications",
    "enable": "Enable push notifications",
    "upcomingBill": "Upcoming bill reminders",
    "syncError": "SimpleFIN sync errors",
    "goalDeadline": "Savings goal deadlines"
  }
}
```

---

## Acceptance Criteria

### 8.1 Quick-Add

| # | Criterion |
|---|-----------|
| AC-1 | FAB visible on mobile (xs/sm); hidden on desktop (md+) |
| AC-2 | Tapping FAB opens QuickAddSheet from the bottom |
| AC-3 | Transaction saved with valid minimal fields (amount, payee, account, category, date=today) |
| AC-4 | Transaction appears in TransactionsPage immediately after save |
| AC-5 | "Open Full Form" navigates to `/transactions/new` with fields pre-populated |
| AC-6 | While offline, transaction is queued to Dexie with offline toast |
| AC-7 | On reconnect, queued transactions sync automatically |
| AC-8 | Full flow completeable in < 5 taps (Amount → Payee → Save using defaults for account/category) |
| AC-9 | Last used account and category are remembered across sessions |

### 8.2 Push Notifications (Optional)

| # | Criterion |
|---|-----------|
| AC-10 | Push subscription survives browser restart |
| AC-11 | Notification received for a budget line due within 24h |
| AC-12 | Notification preferences respected — disabling a type stops that notification |
| AC-13 | Removing subscription via settings stops all notifications |

---

## Dependencies

- Existing offline detection via `useNetworkStore`
- Existing Dexie database (`src/lib/db/index.ts`)
- Existing transaction create endpoint

## Out of Scope

- Quick-add on desktop
- FAB on unauthenticated pages
- Receipt capture
- Notification history / inbox
