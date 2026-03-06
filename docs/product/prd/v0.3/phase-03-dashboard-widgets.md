# PRD — Phase 3: Dashboard Widget Revisions

**Version:** v0.3
**Priority:** High
**Scope:** Medium
**Status:** Complete
**Dependencies:** Phase 1 (Storybook), Phase 2 (Theme Presets) — widget designs iterated in Storybook before integration; design refresh provides visual baseline

---

## Overview

Add 3 new dashboard widgets, redesign 7 existing widgets, and improve the widget grid UX (minimum size constraints, category grouping in the WidgetTray). All widget changes are backwards-compatible with saved dashboard configs. New widget stories are added to Storybook as part of this phase.

---

## Problem Statement

Several existing dashboard widgets are placeholder-quality (UpcomingExpensesWidget) or use charts that are less informative than they could be (MonthlyChartWidget, NetWorthWidget). The widget tray has no organisational structure, making it hard to find widgets. There is no spending-by-category or debt payoff widget.

---

## Goals

- Ship 3 new widgets: SpendingByCategoryWidget, DebtPayoffWidget, TagSummaryWidget (gated)
- Redesign 7 existing widgets with improved charts and layouts
- Improve WidgetTray UX with category grouping
- Add `minH`/`minW` constraints to prevent unreadable widget sizes
- All widget stories added to Storybook

## Non-Goals

- New chart libraries (reuse Recharts 2)
- Widget-level settings/configuration UI
- TagSummaryWidget functionality (gated behind Phase 5 feature flag)

---

## User Stories

1. As a user, I can add a **SpendingByCategoryWidget** to my dashboard to see where my money is going this month without navigating to reports.
2. As a user, I can add a **DebtPayoffWidget** to track my debt accounts' progress and projected payoff dates at a glance.
3. As a user, the **MonthlyChartWidget** shows a stacked area chart of income vs expenses and lets me select 3, 6, or 12-month windows.
4. As a user, the **BudgetSnapshotWidget** shows a horizontal stacked bar (spent / remaining / over-budget) so I can see budget health at a glance.
5. As a user, the **WidgetTray** groups widgets by category (Overview, Budgeting, Savings, Spending, Debt), making it easy to find what I need.
6. As a user, resizing a widget on the dashboard is constrained so it never becomes too small to read.

---

## Functional Requirements

### 3.1 New Widgets

#### SpendingByCategoryWidget

- **Chart types:** Toggle between Pie chart and horizontal Bar chart (user's last choice stored in widget's local state, not persisted)
- **Data:** Current budget period's actual spend grouped by category
- **API:** Reuse existing budget-view endpoint actuals or `GET /api/v1/reports/spending-by-category?start=&end=` (create if needed)
- **States:** Loaded (chart), Loading (skeleton), Empty (no transactions this period)
- **Registry:** `widgetId: 'spending-by-category'`, category: `'spending'`

#### DebtPayoffWidget

- **Display:** Card-per-debt-account layout showing:
  - Account name + type badge
  - Current principal balance
  - Total interest paid to date (from `debt_payments` records)
  - Projected payoff date (calculated: remaining balance ÷ average monthly payment × months)
- **API:** Reuse `useDebt()` hook / `GET /api/v1/debt` endpoint
- **States:** Loaded, Loading, Empty (no debt accounts)
- **Registry:** `widgetId: 'debt-payoff'`, category: `'debt'`

#### TagSummaryWidget *(Phase 5 dependency — registered but gated)*

- **Display:** Horizontal bar chart of total spend per tag for the current period
- **API:** `GET /api/v1/reports/tags?start=&end=` (Phase 5 endpoint)
- **Feature gate:** `widgetRegistry` entry includes `featureFlag: 'tagging'`; WidgetTray hides the widget unless the flag is enabled; flag enabled automatically when Phase 5 ships
- **States:** Loaded, Loading, Empty
- **Registry:** `widgetId: 'tag-summary'`, category: `'spending'`

### 3.2 Existing Widget Redesigns

#### AccountBalancesWidget
- Compact grid of balance cards (was a plain list)
- Each card: account type icon, account name, formatted balance
- Negative balances: text in `--color-destructive`
- Grouped by type: Assets → Liabilities → Credit Cards

#### BudgetSnapshotWidget
- Replace single progress bar with **horizontal stacked bar per category**: spent (primary) / remaining (muted) / over-budget (destructive)
- Over-budget categories also shown as inline chips below the chart
- Period label in widget header

#### MonthlyChartWidget
- Replace grouped bar chart with **stacked area chart** (Recharts `AreaChart`)
  - Area 1: Income (primary colour, 30% opacity fill)
  - Area 2: Expenses (destructive colour, 30% opacity fill)
- **Period selector:** Segmented control in widget header — 3M / 6M / 12M (state in widget, not persisted)
- Empty state: "No data for selected period"

#### NetWorthWidget
- Add **sparkline** (last 6 months trend) above the current net worth figure
- Colour-code total: green if positive, red if negative
- Delta label: "+$X vs last month"

#### RecentTransactionsWidget
- Each row: category badge (colour-coded) + account name + payee + amount
- Debit amounts: destructive colour; credit amounts: success colour
- Rows are clickable links to `TransactionsPage` filtered by that transaction

#### UpcomingExpensesWidget
- **Build out from placeholder** — was empty shell
- Lists budget line occurrences in the next 30 days
- Grouped by week (e.g., "This week", "Next week", "In 2 weeks")
- Each row: budget line name + account + amount + date
- "No upcoming expenses" empty state

#### SavingsGoalsWidget
- Add **projected completion date** below progress bar
- Goals behind pace (completion date > goal target date): amber highlight
- Progress bar shows: filled (current balance) / projected (scheduled contributions from Phase 7, if available, otherwise same as current)

### 3.3 Widget Grid UX

#### Minimum Size Constraints

Add `minH` and `minW` to each widget entry in `widgetRegistry.ts`:

| Widget | minW | minH |
|--------|------|------|
| AccountBalancesWidget | 2 | 2 |
| BudgetSnapshotWidget | 3 | 3 |
| MonthlyChartWidget | 4 | 3 |
| NetWorthWidget | 2 | 2 |
| RecentTransactionsWidget | 3 | 3 |
| SavingsGoalsWidget | 2 | 3 |
| UpcomingExpensesWidget | 2 | 3 |
| WarningsWidget | 2 | 2 |
| SpendingByCategoryWidget | 3 | 3 |
| DebtPayoffWidget | 3 | 3 |
| TagSummaryWidget | 3 | 2 |

#### WidgetTray Category Grouping

WidgetTray renders widgets grouped under headings:

| Category | Widgets |
|----------|---------|
| Overview | AccountBalancesWidget, NetWorthWidget, WarningsWidget |
| Budgeting | BudgetSnapshotWidget, MonthlyChartWidget, UpcomingExpensesWidget |
| Savings | SavingsGoalsWidget |
| Spending | SpendingByCategoryWidget, RecentTransactionsWidget, TagSummaryWidget |
| Debt | DebtPayoffWidget |

`widgetRegistry.ts` entries gain a `category` field; WidgetTray groups by this field.

#### Default Layouts Update

`DEFAULT_LAYOUTS` in `widgetRegistry.ts` updated to include the 3 new widgets at sensible starting positions/sizes.

---

## Technical Requirements

### New API Endpoint (if needed)

If the existing budget-view endpoint does not expose per-category actuals in the right shape for `SpendingByCategoryWidget`:

```
GET /api/v1/reports/spending-by-category?start=YYYY-MM-DD&end=YYYY-MM-DD
```

Response:
```json
{
  "status": "success",
  "data": [
    { "categoryId": "uuid", "categoryName": "Groceries", "total": 423.50 }
  ]
}
```

Controller → Service → Repository pattern. Repository query groups `transactions` by `category_id` for the date range, joining `categories` for name. AES-GCM `amount` field: amounts are stored as numbers (not encrypted) — verify against schema.

### Widget Registry Changes

```ts
// widgetRegistry.ts — entry shape additions
interface WidgetDefinition {
  id: WidgetId;
  category: 'overview' | 'budgeting' | 'savings' | 'spending' | 'debt';
  minW: number;
  minH: number;
  featureFlag?: string;   // new optional field
  // ...existing fields
}
```

### Storybook Stories

Each of the 3 new widgets requires a story file (`*.stories.tsx`) with:
- Loaded, Loading, Empty states
- Mocked hook data (no real API calls)

All 7 redesigned widget stories must be updated to reflect new layouts.

---

## Data Considerations

- No schema changes required for this phase (debt payoff projection is calculated in the service/frontend)
- SpendingByCategoryWidget may require a new backend endpoint (see above)
- TagSummaryWidget is display-only until Phase 5 provides the tags data

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | SpendingByCategoryWidget appears in WidgetTray (Spending category) and can be added to dashboard; pie/bar toggle works |
| AC-2 | DebtPayoffWidget displays principal, interest paid, and projected payoff date per debt account |
| AC-3 | TagSummaryWidget appears in WidgetTray but is hidden/disabled until Phase 5 ships |
| AC-4 | All 7 redesigned widgets render their new layouts correctly |
| AC-5 | MonthlyChartWidget period selector (3M/6M/12M) updates the chart |
| AC-6 | UpcomingExpensesWidget shows budget line occurrences for next 30 days grouped by week |
| AC-7 | Widgets cannot be resized below their `minH`/`minW` thresholds |
| AC-8 | WidgetTray shows widgets grouped under category headings |
| AC-9 | Existing saved dashboard configs load without errors — no breaking DashboardConfig schema changes |
| AC-10 | Storybook stories added for 3 new widgets; updated for 7 redesigned widgets; all render without errors |
| AC-11 | All widgets render correctly across xs/sm/lg/xl breakpoints |

---

## Dependencies

- Phase 1 (Storybook) — stories developed in isolation first
- Phase 2 (Theme Presets) — widget designs use CSS tokens, not hardcoded colours
- Phase 5 (Tagging) — TagSummaryWidget functionality (gated until Phase 5 ships)

## Out of Scope

- Widget-level persistence of UI state (chart type toggle, period selector)
- TagSummaryWidget live data (Phase 5)
- SavingsGoals projected-contribution line (Phase 7)
