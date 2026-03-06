# PRD: Dashboard & Reports

**Version:** 1.0
**Status:** Shipped — Phase 4 (Dashboard), Phase 6 (Forecasting); Budget View widget updated Phase 8
**Last updated:** 2026-02-24

---

## Problem Statement

Users need a fast, at-a-glance view of their financial health without navigating to each individual section. The dashboard should surface the most actionable information: net worth, monthly cash flow, recent transactions, budget status, and savings progress. The reports layer provides historical trend data and forward-looking projections.

---

## Goals

- Single-screen overview of financial health (net worth, income, expenses)
- Visual income vs. expenses trend chart for the last 6 months
- Budget snapshot showing current month's plan vs. actual
- Recent transactions list
- Savings goals progress
- Monthly summary API for historical data
- 3-month median forecast for projected income/expenses
- All amounts display in the user's preferred currency and locale (Phase 9)

## Non-Goals

- Spending-by-category breakdown chart (Phase 10)
- Net worth over time line chart (Phase 10)
- Top-payees chart (Phase 10)
- Customizable dashboard widget layout

---

## Functional Requirements

### Dashboard Page

**Summary cards:**
- Net worth: sum of (asset accounts × +1) + (liability accounts × −1); formatted in user's currency
- Income This Month: from monthly summary for current calendar month
- Expenses This Month: from monthly summary for current calendar month

**Accounts row:**
- Horizontal scrollable list of active account cards; "View all" link to `/accounts`

**Income vs. Expenses chart:**
- Recharts grouped bar chart: 6 months of historical data + optional 3-month forecast
- "Show forecast" checkbox toggle; dimmed bars indicate projected months
- Forecast disclaimer text when enabled

**Recent Transactions:**
- 5 most recent transactions across all accounts; "View all" link to `/transactions`
- Shows payee/description (whichever is set), date, and amount (color-coded positive/negative)

**Budget Snapshot:**
- Current calendar month's Budget View (from Phase 8 `GET /budget-view`)
- Progress bar: actual expenses / prorated planned expenses
- "Remaining" or "Over budget" indicator
- Top 3 most over-budget expense lines listed by variance
- Empty state with "Set up your budget" link
- Offline error state

**Savings Goals widget:**
- Top 3 goals (by creation order); progress bar per goal; current / target amounts; "View all" link

### Monthly Summary Report

`GET /api/v1/reports/monthly-summary?months=N`

- Returns array of `{ month: 'YYYY-MM', income: number, expenses: number }` for the last N calendar months
- Income: sum of positive transactions excluding transfers
- Expenses: sum of absolute value of negative transactions excluding transfers
- Ordered ascending by month

### Forecast Report

`GET /api/v1/reports/forecast?months=N`

- Computes the median income and median expenses from the last 6 months of actuals
- Projects that median forward N months (default 3)
- Returns array of `{ month: 'YYYY-MM', income: number, expenses: number, isForecast: true }`

---

## Data Model

No dedicated tables. Reports are computed from the `transactions` table on demand.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/reports/monthly-summary?months=N` | Required | Historical income/expenses by calendar month |
| GET | `/api/v1/reports/forecast?months=N` | Required | Median-based projection for the next N months |

---

## UI/UX Requirements

- Dashboard uses a responsive grid layout (`max-w-5xl`, 1→3 columns for summary cards)
- Monthly chart uses Recharts `BarChart` with `ResponsiveContainer`; forecast bars use `fillOpacity: 0.45`
- Summary cards show a shimmer skeleton during loading
- Budget snapshot: progress bar turns red if `actual > prorated`; remaining text color-coded green/red

---

## Security Requirements

- All report endpoints scoped to `req.user.id`; cross-user data impossible
- Transfers excluded from all aggregations to prevent double-counting
- Sensitive fields (payee/description) not returned in summary reports — only aggregated amounts

---

## Acceptance Criteria

- [x] Net worth card reflects live account balances
- [x] Monthly chart shows 6 months of income/expenses; forecast works on toggle
- [x] Budget snapshot uses Budget View data from Phase 8
- [x] Top 3 over-budget lines shown in Budget Snapshot
- [x] Recent transactions show last 5 across all accounts
- [x] Monthly summary excludes transfers

---

## Known Limitations / Future Work

- **Spending by category:** Pie/donut chart per category deferred to Phase 10
- **Net worth over time:** Requires `net_worth_snapshots` table; deferred to Phase 10
- **Top payees:** Requires decrypting payee field at query time; deferred to Phase 10
- **Recurring transactions:** Deferred to Phase 10
- **Dashboard layout customization:** Not planned; fixed widget layout
