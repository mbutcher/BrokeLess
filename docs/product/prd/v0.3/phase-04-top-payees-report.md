# PRD — Phase 4: Top Payees Report

**Version:** v0.3
**Priority:** Medium
**Scope:** Small
**Status:** Ready for development

---

## Overview

Add a "Top Payees" report: a bar chart showing the N payees with the highest total spend for a configurable date range, with drill-down to the transaction list for any selected payee.

---

## Problem Statement

Users have no way to see their largest spending destinations aggregated across categories. The payee field is AES-256-GCM encrypted, which means aggregation must happen in the service layer (decrypt-then-group), not at the database query level.

---

## Goals

- Add `GET /api/v1/reports/top-payees` backend endpoint
- Add a Top Payees report page/section in the frontend
- Decrypt payees at query time and aggregate in the service layer
- Allow drill-down from a bar in the chart to the filtered TransactionsPage

## Non-Goals

- Payee normalisation / deduplication (same payee spelled differently counts separately)
- Cached aggregation / materialized views
- Export of top-payees data

---

## User Stories

1. As a user, I can open a Top Payees report, select a date range, and see a bar chart of my top N spending destinations, so I can identify where most of my money goes.
2. As a user, I can click a bar in the chart to navigate to the Transactions page pre-filtered to that payee and date range, so I can inspect the individual transactions.

---

## Functional Requirements

### 4.1 Backend

#### Endpoint

```
GET /api/v1/reports/top-payees
  Query params:
    start  (required) YYYY-MM-DD
    end    (required) YYYY-MM-DD
    limit  (optional, default: 10, max: 25)
```

Response:
```json
{
  "status": "success",
  "data": [
    { "payee": "Metro Grocery", "total": 1247.83, "count": 23 },
    { "payee": "Netflix", "total": 179.88, "count": 12 }
  ]
}
```

Sorted descending by `total`. Only expense transactions (negative amounts or debit type — verify against existing transaction model).

#### Service Layer Logic

1. Fetch all transactions in the date range for the requesting user (no payee filter in SQL — payees are encrypted)
2. Decrypt each `payee` field using `encryptionService.decrypt()`
3. Group by decrypted payee, summing `amount` (absolute value) and counting occurrences
4. Sort descending by total, return top `limit` results

Performance note: This is acceptable for the single-user, small-dataset use case described in the roadmap. If dataset grows large, aggregation can be moved to a nightly background job in a future phase.

#### Validation & Auth

- Validate `start`, `end` are valid dates with `start <= end`
- Validate `limit` is an integer 1–25
- Standard JWT auth middleware — responses scoped to requesting user only

### 4.2 Frontend

#### Location

New **"Reports"** section (if it doesn't already exist) or added to existing Reports page. Route: `/reports/top-payees`.

If a Reports nav item already exists, add "Top Payees" as a sub-item or tab. If not, create a minimal Reports page with a single "Top Payees" section.

#### Page Layout

```
Top Payees
────────────────────────────────────────
[Date Range Picker: Start] [Date Range Picker: End]  [Top: 10 ▾]  [Apply]

[Horizontal bar chart — TopPayeesBarChart component]

  Metro Grocery    ██████████████████ $1,247.83  (23 txns)
  Netflix          ████████            $179.88   (12 txns)
  ...
```

- Uses existing `TopPayeesBarChart` component (Phase 1 story was created for it)
- Bars are clickable — navigate to `TransactionsPage` with `?payee=<encoded>&start=&end=` params
- Default date range: start of current month → today
- Loading state: skeleton over the chart area
- Empty state: "No transactions found for this period"

#### TransactionsPage Integration

- `TransactionsPage` already supports a `payee` filter — confirm that `?payee=` query param is handled (or add it)
- On navigation from the chart, the filter bar pre-populates with the payee name and date range

---

## Technical Requirements

### New Files

| File | Purpose |
|------|---------|
| `backend/src/controllers/reports/topPayeesController.ts` | Route handler |
| `backend/src/services/reports/topPayeesService.ts` | Decrypt + aggregate logic |
| `backend/src/routes/reports.ts` (new or extend) | Mount `GET /top-payees` |
| `frontend/src/features/reports/pages/TopPayeesPage.tsx` | Report page |
| `frontend/src/features/reports/hooks/useTopPayees.ts` | TanStack Query hook |
| `frontend/src/features/reports/api/reportsApi.ts` | API call |
| `docs/openapi/paths/reports.yaml` | OpenAPI spec for new endpoint |

### Modified Files

| File | Change |
|------|--------|
| `backend/src/routes/index.ts` | Mount `/api/v1/reports` router |
| `frontend/src/app/router.tsx` | Add `/reports/top-payees` route |
| `frontend/src/components/layout/Sidebar.tsx` | Add Reports nav item |

### i18n Keys (all 3 locales)

```json
"reports": {
  "topPayees": {
    "title": "Top Payees",
    "subtitle": "Highest spend by payee for the selected period",
    "limitLabel": "Show top",
    "emptyState": "No transactions found for this period",
    "drilldownTooltip": "Click to view transactions"
  }
}
```

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | `GET /api/v1/reports/top-payees?start=2026-01-01&end=2026-01-31&limit=10` returns correctly ordered payee totals |
| AC-2 | Totals match the sum of individual transactions for the period (verified manually) |
| AC-3 | Top Payees page renders the bar chart with correct data |
| AC-4 | Changing the date range or limit and clicking Apply updates the chart |
| AC-5 | Clicking a bar navigates to TransactionsPage filtered to that payee + date range |
| AC-6 | Loading state shown while the request is in flight |
| AC-7 | Empty state shown when no transactions exist for the period |
| AC-8 | Endpoint returns 400 for invalid date params; 401 for unauthenticated requests |
| AC-9 | OpenAPI spec updated with the new endpoint |

---

## Dependencies

- None (standalone feature; no dependency on other v0.3 phases)
- Relies on existing `encryptionService.decrypt()` and transaction repository patterns

## Out of Scope

- Payee normalisation / fuzzy matching
- Caching or materialised aggregation
- Payee-level analytics beyond top-N spend chart
