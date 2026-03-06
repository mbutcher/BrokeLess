# PRD — Phase 6: Budget Period Rollover & Carry-Forward

**Version:** v0.3
**Priority:** Medium
**Scope:** Medium
**Status:** Ready for development

---

## Overview

When a budget period ends, surface unspent and overspent category amounts for a conscious carry-forward decision rather than silently resetting. Users can optionally create a one-time adjustment transaction to carry a surplus or deficit into the new period. Reviewed rollovers are acknowledged and stop re-appearing in the warnings widget.

---

## Problem Statement

Currently, when a budget period ends, the next period starts fresh with no visibility into whether the previous period was over or under. Users who underspend in one period lose that surplus implicitly; users who overspend have no prompt to account for the deficit. This forces manual tracking outside the app.

---

## Goals

- Compute per-budget-line surplus/deficit at period boundary
- Surface the rollover summary in a dashboard warning
- Provide a review dialog where users can create one-time adjustment transactions
- Mark reviewed rollovers as acknowledged so the warning clears

## Non-Goals

- Automatic carry-forward (user must always review)
- Carry-forward for fixed budget lines (only variable/flexible lines are meaningful to roll over)
- Historical rollover log/report

---

## User Stories

1. As a user, when a budget period ends, I see a warning on my dashboard: "Previous period has unreviewed rollover — X lines over budget, Y lines under budget".
2. As a user, I can click the warning to open a rollover review dialog, which shows each budget line's planned vs. actual and the surplus/deficit.
3. As a user, for lines I choose, I can create a one-time adjustment transaction that moves the surplus/deficit into the new period's actuals.
4. As a user, after I click "Done reviewing", the rollover warning disappears and does not re-appear for that period.

---

## Functional Requirements

### 6.1 Backend — Rollover Detection Endpoint

```
GET /api/v1/budget-view/rollover?previousStart=YYYY-MM-DD&previousEnd=YYYY-MM-DD
```

Response:
```json
{
  "status": "success",
  "data": {
    "periodStart": "2026-01-01",
    "periodEnd": "2026-01-31",
    "lines": [
      {
        "budgetLineId": "uuid",
        "budgetLineName": "Groceries",
        "categoryId": "uuid",
        "categoryName": "Food",
        "planned": 600.00,
        "actual": 543.25,
        "variance": 56.75,       // positive = underspent (surplus)
        "varianceType": "surplus" // "surplus" | "deficit"
      }
    ],
    "totalSurplus": 56.75,
    "totalDeficit": -123.40
  }
}
```

Logic:
- Query budget lines active during `previousStart`–`previousEnd`
- For each line, sum matching transactions in that period (same logic as budget-view actuals)
- Compute `variance = planned - actual` (positive = underspent)
- Only include lines where `abs(variance) > 0.01` (skip exactly on-budget lines)
- Only include flexible/variable budget lines (exclude fixed expenses like rent where carry-forward is meaningless) — determined by a `line_type` field or explicit list; clarify against existing schema

### 6.2 Backend — Acknowledge Rollover

Rollover acknowledgement is stored in `user_dashboard_config` as metadata (existing table, JSON blob field or separate column). No new table needed.

Storage key: `acknowledgedRollovers` — array of `{ periodStart: string; periodEnd: string; acknowledgedAt: string }`.

**Endpoint (reuse existing dashboard config PUT):**
```
PUT /api/v1/dashboard/config
  Body: { ..., metadata: { acknowledgedRollovers: [...] } }
```

Or add a dedicated endpoint if the dashboard config structure doesn't support free metadata:
```
POST /api/v1/budget-view/rollover/acknowledge
  Body: { previousStart: "YYYY-MM-DD", previousEnd: "YYYY-MM-DD" }
  Upserts an acknowledge record for the period
```

Decision: use whichever approach fits the existing `user_dashboard_config` schema. If the config is already a JSON blob, store it there. If not, create the dedicated endpoint.

### 6.3 Frontend — Dashboard Warning

#### Detection Logic

`WarningsWidget` (or a dedicated hook `useRolloverStatus`) checks:
1. Compute `previousPeriodStart`/`previousPeriodEnd` from the user's current pay period settings
2. `GET /api/v1/budget-view/rollover` for the previous period
3. Check `acknowledgedRollovers` in dashboard config — if the previous period is already acknowledged, skip
4. If unacknowledged rollover data exists, show the rollover warning in `WarningsWidget`

Warning message (i18n):
```
"Previous budget period ended with unreviewed carry-forward."
"X categories over budget, Y categories under budget."
[Review now →]
```

#### Rollover Review Dialog

Triggered by the "Review now" link in the warning.

```
┌─────────────────────────────────────────────────────────────┐
│  Review Budget Period Rollover                              │
│  January 1 – January 31, 2026                              │
├─────────────────────────────────────────────────────────────┤
│  Category        Planned   Actual    Variance               │
│  Groceries       $600      $543.25   +$56.75 (surplus) [✓] │
│  Dining Out      $200      $287.40   -$87.40 (deficit) [✓] │
│  Entertainment   $100      $95.00    +$5.00  (surplus) [ ] │
│  ...                                                        │
├─────────────────────────────────────────────────────────────┤
│  For each checked line, a one-time adjustment transaction   │
│  will be created in the current period.                     │
│                                                             │
│  [Skip — Don't Create Adjustments]  [Create & Done]        │
└─────────────────────────────────────────────────────────────┘
```

- Each line has a checkbox (default: checked for over-budget lines, unchecked for under-budget — user can toggle)
- "Create & Done" action:
  1. For each checked line, create a one-time transaction:
     - Amount: `abs(variance)` (positive for surplus adjustment, negative for deficit)
     - Category: same category as the budget line
     - Payee: "Rollover Adjustment — [Budget Line Name]" (plaintext — will be encrypted by normal transaction create flow)
     - Description: "Carry-forward from [periodStart]–[periodEnd]"
     - Date: first day of the current period
     - Account: user's default account (or prompt to select — TBD based on UX review)
  2. Mark rollover as acknowledged (call acknowledge endpoint)
  3. Close dialog; `WarningsWidget` clears the rollover warning
- "Skip" action: acknowledges without creating transactions

#### Account Selection for Adjustment Transactions

If the user has more than one account, the dialog needs to know which account to use for adjustment transactions. Options:
1. Use the first/default checking account (simplest)
2. Show an account selector at the top of the dialog

**Decision: add a single account selector at the top of the dialog.** It defaults to the most-recently-used account, and the selection applies to all adjustment transactions created in that session.

---

## Technical Requirements

### New Files

| File | Purpose |
|------|---------|
| `backend/src/controllers/budget/rolloverController.ts` | GET rollover + acknowledge |
| `backend/src/services/budget/rolloverService.ts` | Period variance computation |
| `backend/src/routes/budgetView.ts` (extend) | Mount rollover endpoints |
| `frontend/src/features/dashboard/hooks/useRolloverStatus.ts` | Detect pending rollover |
| `frontend/src/features/dashboard/components/RolloverReviewDialog.tsx` | Review + create dialog |

### Modified Files

| File | Change |
|------|--------|
| `frontend/src/features/dashboard/widgets/WarningsWidget.tsx` | Add rollover warning item |
| `frontend/src/features/transactions/api/transactionsApi.ts` | Used to create adjustment transactions |

### i18n Keys (all 3 locales)

```json
"dashboard": {
  "rollover": {
    "warningTitle": "Unreviewed budget carry-forward",
    "warningBody_one": "{{count}} category needs review",
    "warningBody_other": "{{count}} categories need review",
    "reviewLink": "Review now",
    "dialogTitle": "Review Budget Period Rollover",
    "columnCategory": "Category",
    "columnPlanned": "Planned",
    "columnActual": "Actual",
    "columnVariance": "Variance",
    "surplus": "surplus",
    "deficit": "deficit",
    "accountSelectLabel": "Apply adjustments to account",
    "createAction": "Create Adjustments & Done",
    "skipAction": "Skip — Don't Create Adjustments",
    "adjustmentPayee": "Rollover Adjustment — {{lineName}}",
    "adjustmentDescription": "Carry-forward from {{start}}–{{end}}"
  }
}
```

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | `GET /api/v1/budget-view/rollover` returns correct per-line variance for a completed period |
| AC-2 | Rollover warning appears in WarningsWidget when the previous period has unreviewed rollover |
| AC-3 | Rollover warning does not appear if the previous period is already acknowledged |
| AC-4 | Rollover review dialog opens and displays all lines with non-zero variance |
| AC-5 | Creating adjustments results in transactions visible in TransactionsPage with the correct amounts |
| AC-6 | After Create & Done, rollover warning clears and does not reappear for that period |
| AC-7 | Skip action also acknowledges the rollover (warning clears) |
| AC-8 | One-time adjustment transactions appear correctly in the new period's budget-view actuals |
| AC-9 | i18n keys present and correct in all 3 locales |

---

## Dependencies

- Existing `user_dashboard_config` table and GET/PUT dashboard config endpoints (Phase 19)
- Existing transaction create endpoint

## Out of Scope

- Automatic carry-forward without user review
- Rollover history / audit log
- Fixed-expense line rollovers
