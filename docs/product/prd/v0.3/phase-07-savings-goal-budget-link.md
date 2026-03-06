# PRD — Phase 7: Savings Goal ↔ Budget Line Link

**Version:** v0.3
**Priority:** Low
**Scope:** Small
**Status:** Ready for development

---

## Overview

Link a savings goal to a recurring budget line so that scheduled contributions are reflected in the goal's projected progress — not just the current account balance. This makes the savings goal progress bar more accurate by factoring in planned future contributions.

---

## Problem Statement

Savings goals currently show progress based only on the current account balance. Users who contribute to a goal via a regular budget line (e.g., "Savings Transfer: $500/month") have no way to see how their scheduled contributions project against their goal target and deadline. The progress bar is a point-in-time snapshot with no forward-looking value.

---

## Goals

- Add `recurring_contribution_budget_line_id` FK to `savings_goals`
- SavingsGoalPage progress bar reflects scheduled contributions from linked budget line
- Projected completion date updated to account for future contributions
- SavingsGoalsWidget (dashboard) reflects the projected completion date

## Non-Goals

- Automatic transaction creation from contributions (removed in recurring transactions cleanup)
- Linking multiple budget lines to one goal
- Contributing to a goal from a one-time transaction (that is already reflected via account balance)

---

## User Stories

1. As a user, I can link a recurring budget line (e.g., "Emergency Fund Transfer") to a savings goal, so the goal's progress projection includes my planned monthly contributions.
2. As a user, the SavingsGoalPage shows a projected balance curve based on current balance + scheduled contributions, and the projected completion date updates accordingly.
3. As a user, if no budget line is linked, the goal behaves exactly as it does today (no regression).

---

## Functional Requirements

### 7.1 Backend

#### Schema Change

New migration: `20260303001_add_budget_line_link_to_savings_goals.ts`

```sql
ALTER TABLE savings_goals
  ADD COLUMN recurring_contribution_budget_line_id CHAR(36) NULL,
  ADD CONSTRAINT fk_savings_goals_budget_line
    FOREIGN KEY (recurring_contribution_budget_line_id)
    REFERENCES budget_lines(id) ON DELETE SET NULL;
```

`ON DELETE SET NULL` — if the linked budget line is deleted, the goal continues to work without a link (graceful degradation).

#### Savings Goal Response Shape

`GET /api/v1/savings-goals` and `GET /api/v1/savings-goals/:id` responses gain:

```json
{
  "recurringContributionBudgetLineId": "uuid | null",
  "recurringContributionAmount": 500.00,   // from linked budget line amount, or null
  "recurringContributionFrequency": "monthly", // from linked budget line, or null
  "projectedCompletionDate": "2027-08-01"  // calculated, or null if no target date
}
```

`projectedCompletionDate` calculation (service layer):
- If `targetAmount` and current `balance` and `recurringContributionAmount` are all present:
  - `monthsRemaining = ceil((targetAmount - balance) / recurringContributionAmount)`
  - `projectedDate = startOfNextMonth + monthsRemaining months`
- If any value is missing, `projectedCompletionDate = null`

#### Savings Goals PATCH / PUT

`PATCH /api/v1/savings-goals/:id` accepts:
- `recurringContributionBudgetLineId: string | null` — set or unlink

Validate that the provided budget line ID belongs to the requesting user.

### 7.2 Frontend

#### SavingsGoalPage

- New "Linked Budget Line" section in the goal detail/edit form:
  - Dropdown: select a budget line (fetched from `GET /api/v1/budget-lines`), or "None"
  - Shows: selected line name + amount + frequency
  - Save calls `PATCH /api/v1/savings-goals/:id` with the selected line ID

- Progress section gains:
  - "Projected completion" date (from API) displayed below the progress bar
  - If no projection available: show "—" or nothing
  - If projection is past the target date: amber highlight ("Behind target pace")

#### SavingsGoalsWidget (Dashboard)

- Each goal card shows:
  - Progress bar (current balance / target amount) — unchanged
  - "Est. completion: [date]" — from `projectedCompletionDate` field (Phase 3 already designs this; this phase provides real data)
  - If behind pace: amber border or text highlight

---

## Technical Requirements

### New Files

| File | Purpose |
|------|---------|
| `backend/src/database/migrations/20260303001_add_budget_line_link_to_savings_goals.ts` | Schema migration |

### Modified Files

| File | Change |
|------|--------|
| `backend/src/repositories/savingsGoalRepository.ts` | Include budget line join for linked line details |
| `backend/src/services/savingsGoals/savingsGoalService.ts` | Calculate `projectedCompletionDate` |
| `backend/src/types/savingsGoal.ts` | Add new fields to type definitions |
| `frontend/src/features/savings/pages/SavingsGoalPage.tsx` | Budget line selector + projection display |
| `frontend/src/features/dashboard/widgets/SavingsGoalsWidget.tsx` | Show projected completion |

### i18n Keys (all 3 locales)

```json
"savingsGoals": {
  "linkedBudgetLine": "Linked Budget Line",
  "linkedBudgetLinePlaceholder": "Select a budget line...",
  "linkedBudgetLineNone": "None",
  "projectedCompletion": "Est. completion",
  "projectedCompletionBehind": "Behind target pace",
  "projectedCompletionNone": "—"
}
```

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | Budget line can be linked to a savings goal via the SavingsGoalPage form |
| AC-2 | Linked budget line can be unlinked (set to None) without affecting the goal |
| AC-3 | If budget line is deleted, `savings_goal.recurring_contribution_budget_line_id` becomes NULL (ON DELETE SET NULL) |
| AC-4 | `projectedCompletionDate` in the API response is correct given the current balance and contribution amount |
| AC-5 | SavingsGoalPage shows the projected completion date when a link exists |
| AC-6 | Goals behind pace (projected date > target date) are highlighted in amber on the goal page and dashboard widget |
| AC-7 | Goals with no linked budget line behave exactly as before — no regression |
| AC-8 | `GET /api/v1/savings-goals` response shape includes new fields without breaking existing consumers |

---

## Dependencies

- Existing `savings_goals` and `budget_lines` tables
- Phase 3 (SavingsGoalsWidget redesign) — widget already designed to show projected completion date; this phase provides real data

## Out of Scope

- Multi-line linking (one goal = one linked line, max)
- Contribution history breakdown on the goal page
- Goal contribution as a dedicated transaction type
