# PRD: Budget Lines, Schedules & Budget View

**Version:** 1.0
**Status:** Shipped — Phase 8 (2026-02-24)
**Last updated:** 2026-02-24

---

## Problem Statement

The previous budget model (Phase 3) used named date-range containers with static per-category allocations. This model is retrospective: a user sets a ceiling for a time period and checks whether they stayed under it. It does not answer:

- "How much should I expect to spend on my biweekly car payment this month?"
- "I'm paid biweekly — how do I see my budget normalized to my actual pay cycle?"
- "If I spend $200/week on groceries, what should my monthly grocery budget be?"

A schedule-driven model answers these questions by separating *what you plan to spend* (Budget Lines) from *how you view the data* (Budget View over an arbitrary time window).

---

## Goals

- Budget Lines as first-class objects: each line has its own recurrence schedule
- Seven frequency types to cover all common payment patterns
- Budget View: normalize any set of Budget Lines to an arbitrary time window via proration
- Pay period view: normalize to the actual pay cycle of the user's income
- Category/Subcategory grouping in the budget UI
- Income and expense Budget Lines unified in one view
- Dashboard budget snapshot powered by Budget View data

## Non-Goals

- Occurrence persistence (explicit matched/missed tracking with transaction linkage — deferred)
- Multi-user budget sharing
- Budget templates or plan-switching
- Recurring transaction creation (separate from Budget Lines — Phase 10)
- Offline Budget View (computed server-side — deferred)

---

## Functional Requirements

### Budget Lines

Each Budget Line represents one planned income or expense item with its own recurrence schedule:

**Required fields:**
- `name` — display name
- `classification` — `'income'` or `'expense'`
- `flexibility` — `'fixed'` (predictable) or `'flexible'` (discretionary)
- `categoryId` — must reference a top-level Category (`parent_id IS NULL`); enforced at service layer
- `amount` — per-occurrence amount (always positive)
- `frequency` — recurrence type (see below)
- `anchorDate` — establishes the recurrence cycle; first/next known occurrence date

**Optional fields:**
- `subcategoryId` — must be a direct child of `categoryId`
- `frequencyInterval` — required when `frequency = 'every_n_days'`; number of days between occurrences
- `isPayPeriodAnchor` — at most one income Budget Line per user; drives "This Pay Period" view; atomic clear+set via DB transaction
- `notes`

**Frequency types:**

| Value | Description | Annual multiplier |
|-------|-------------|-------------------|
| `weekly` | Every 7 days | × 52 |
| `biweekly` | Every 14 days | × 26 |
| `semi_monthly` | Twice per month (1st and 15th) | × 24 |
| `monthly` | Once per calendar month | × 12 |
| `every_n_days` | Every N days (user-specified) | × (365 / N) |
| `annually` | Once per year | × 1 |
| `one_time` | Occurs once; prorated amount is full amount if anchor falls in window, else 0 | — |

**CRUD:**
- `GET /budget-lines` — list all active Budget Lines for the user
- `POST /budget-lines` — create; validates Category hierarchy; if `isPayPeriodAnchor`, atomically clears all existing anchors then creates
- `GET /budget-lines/:id` — get single line
- `PATCH /budget-lines/:id` — partial update; validates Category hierarchy if category/subcategory changed; if `isPayPeriodAnchor = true`, atomically clears existing anchors then updates
- `DELETE /budget-lines/:id` — soft-delete (`is_active = false`)

### Budget View

`GET /budget-view?start=YYYY-MM-DD&end=YYYY-MM-DD`

Computed server-side. Not stored. For each active Budget Line:

1. **Prorate:** `annualAmount × (daysInWindow / 365)` (see frequency table above)
2. **Fetch actuals:** Sum of matching transactions (by category/subcategory, excluding transfers) within the window; income and expense queried separately
3. **Occurrences:** Compute occurrence dates within the window by walking forward from `anchorDate` using the frequency rule
4. **Variance:** `proratedAmount − actualAmount` (negative = overspent for expenses, under-received for income)
5. **Occurrence status:** `'missed'` if `dueDate <= today`; `'upcoming'` if `dueDate > today`

Returns `BudgetView` with per-line details and four totals: `totalProratedIncome`, `totalProratedExpenses`, `totalActualIncome`, `totalActualExpenses`.

### Pay Period View

`GET /budget-view/pay-period`

Returns `{ start, end, budgetLineId, frequency }` for the current pay period derived from the income Budget Line where `is_pay_period_anchor = true`. Returns `null` if no anchor is set.

Pay period boundary calculation:
- For fixed-day-count frequencies (weekly, biweekly, every_n_days): walk `anchorDate` forward in steps until the period containing today is found
- For month-based frequencies (monthly, semi_monthly, annually): walk backward to the most recent occurrence on or before today, then forward one period

### Budget Page UI

**Period Selector:**
- Month navigator (← previous / next →) for monthly view
- View mode dropdown: Monthly | This Week | This Pay Period | Custom (date range inputs)
- "This Pay Period" disabled if no pay period anchor is set

**Summary Bar:**
- 4 cells: Planned Income, Planned Expenses, Actual Expenses, Remaining Budget
- Net row: Planned net (Planned Income − Planned Expenses) and Actual net

**Budget Line Groups:**
- Expense Budget Lines grouped by Category; each group collapsible
- Income Budget Lines shown in a separate section below expenses
- Group header shows Category name + group planned total + group actual total

**Budget Line Rows:**
- Name, `FlexibilityBadge` (fixed/flexible), `FrequencyBadge` (monthly/biweekly/etc.)
- Planned amount (prorated to view window)
- Progress bar (actual / prorated, red if over)
- Actual amount
- Variance chip (green if under, red if over)
- Click row → inline expand with edit form (all fields editable); "Delete" soft-delete action

**Add Budget Line Dialog:**
- All required + optional fields
- Category selector (top-level only); Subcategory selector populates when Category is selected
- `isPayPeriodAnchor` checkbox (shown only for income lines)

---

## Data Model

Key table: [`budget_lines`](../planning/database-schema.md#budget_lines)

See also: [`categories`](../planning/database-schema.md#categories) — Category/Subcategory hierarchy enforced via FK constraints + service-layer validation.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/budget-lines` | Required | List active Budget Lines |
| POST | `/api/v1/budget-lines` | Required | Create a Budget Line |
| GET | `/api/v1/budget-lines/:id` | Required | Get a single Budget Line |
| PATCH | `/api/v1/budget-lines/:id` | Required | Update a Budget Line |
| DELETE | `/api/v1/budget-lines/:id` | Required | Soft-delete a Budget Line |
| GET | `/api/v1/budget-view?start=&end=` | Required | Compute Budget View for a time window |
| GET | `/api/v1/budget-view/pay-period` | Required | Get current pay period boundaries |

---

## Security Requirements

- All routes behind `authenticate` middleware; scoped to `req.user.id`
- Category hierarchy validated server-side before any Budget Line write
- `isPayPeriodAnchor` clear+set is atomic via Knex transaction (no race window)
- `frequencyInterval` required server-side when `frequency = 'every_n_days'` (both create and update validators)

---

## Acceptance Criteria

- [x] Budget Lines with mixed frequencies produce correct prorated amounts (biweekly $450 → ~$975/mo; weekly $200 → ~$867/mo)
- [x] Budget View returns correct `totalProratedExpenses` and `totalActualExpenses`
- [x] Occurrence `status` is `'missed'` for due dates on or before today; `'upcoming'` for future dates
- [x] Pay period anchor enforced: at most one income line per user; setting a new anchor atomically clears the previous one
- [x] Category hierarchy validation rejects subcategoryId that is not a child of categoryId
- [x] Budget page UI groups expense lines by Category, income lines in separate section

---

## Known Limitations / Future Work

- **Occurrence persistence deferred:** Explicit `matched`/`missed` tracking (with manual transaction linkage) requires a `budget_line_occurrences` table — not yet implemented
- **Offline support deferred:** Budget View is computed server-side; `budget_lines` not in Dexie schema; offline Budget View shows an error state
- **`budgets`/`budget_categories` tables not dropped:** Left in place to preserve legacy data; no UI accesses them; drop in a future cleanup migration
- **Savings Goal ↔ Budget Line link deferred:** `recurring_contribution_budget_line_id` FK on `savings_goals` not yet added
- **Debt `transaction_splits` not factored into actuals:** Interest-only view would require joining `transaction_splits`; deferred
