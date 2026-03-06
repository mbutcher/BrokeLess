# PRD — Page: Reports

**Version:** v0.4
**Status:** Pending
**Component:** Page
**Route:** `/reports`
**File:** [frontend/src/features/reports/pages/ReportsPage.tsx](../../../../frontend/src/features/reports/pages/ReportsPage.tsx)

---

## Current State

Four-tab layout:
1. **Spending** — Period + type (expense/income) selectors; SpendingPieChart with category breakdown.
2. **Net Worth** — 3/6/12/24-month range selector, liability toggle, "Take Snapshot" button; summary cards + NetWorthChart (line chart).
3. **Top Payees** — Period + type + limit (5/10/20) selectors; TopPayeesBarChart (horizontal bars, clicking navigates to /transactions?q=).
4. **Tags** — Period + type selectors; TopPayeesBarChart adapted for tags (clicking navigates to /transactions?tag=).

Period options across all tabs: this_month, last_month, last_3_months, last_6_months, this_year, last_year.

---

## Problems / Observations

_To be defined._

---

## Proposed Changes

_To be defined._

---

## Acceptance Criteria

_To be defined._
