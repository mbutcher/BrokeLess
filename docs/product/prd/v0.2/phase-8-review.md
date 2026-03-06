# Phase 8 Review — Budget Lines, Schedules & Budget View

**Date:** 2026-02-24
**Status:** Complete
**Bugs fixed post-implementation:** 5 (from internal review — see Security & Correctness Fixes)

---

## Summary

Phase 8 replaced the legacy date-range budget model (a named period with static per-category allocations) with a forward-looking, schedule-driven Budget Lines architecture.

The core insight is separating three concerns that were previously conflated:
- **Budget Lines** — what the user plans to spend or earn, and on what schedule. These live independently of any view period.
- **Schedules** — the recurrence rule (frequency + anchor date) embedded on each Budget Line.
- **Budget View** — a user-selected time window that normalizes all Budget Lines via proration. The view is always computed; it is never stored.

The old `budgets` and `budget_categories` tables were left in place (not dropped) but are no longer used by the new UI.

---

## Canonical Terminology

| Term | Definition |
|------|------------|
| **Budget Line** | A planned income or expense item with its own embedded Schedule |
| **Schedule** | The recurrence rule on a Budget Line (`frequency`, `frequency_interval`, `anchor_date`) |
| **Occurrence** | A specific dated instance of a Budget Line, computed on the fly |
| **Fixed** | Predictable, unchanging amount per occurrence (`flexibility: 'fixed'`) |
| **Flexible** | Discretionary or variable target (`flexibility: 'flexible'`) |
| **Budget View** | A computed time-window projection over all Budget Lines |
| **Prorated Amount** | A Budget Line's amount normalized to the view window (`annualAmount × days / 365`) |
| **Budget View Line** | Rendered row: prorated plan + actual spend + variance |
| **Actual Amount** | Sum of matching transactions in a Category within the view window |
| **Variance** | `proratedAmount − actualAmount`. Negative = overspent (expenses). |
| **Category** | Top-level label (`parentId IS NULL`) |
| **Subcategory** | Second-level label (`parentId IS NOT NULL`) |
| **Pay Period** | Derived from the income Budget Line where `is_pay_period_anchor = true` |

---

## Files Created

### Backend

| File | Purpose |
|------|---------|
| `backend/src/database/migrations/20260223005_create_budget_lines.ts` | `budget_lines` table with embedded Schedule fields |
| `backend/src/repositories/budgetLineRepository.ts` | `findAllForUser`, `findById`, `findPayPeriodAnchor`, `create`, `update`, `softDelete`, `clearPayPeriodAnchors`, `getActuals`, `getIncomeActuals`, `transaction` helper |
| `backend/src/services/core/budgetLineService.ts` | CRUD with category hierarchy validation; `getBudgetView()` — prorates, fetches actuals, computes occurrences; `getCurrentPayPeriod()` |
| `backend/src/controllers/budgetLineController.ts` | REST handlers: `list`, `get`, `create`, `update`, `delete`, `getBudgetView`, `getPayPeriod` |
| `backend/src/routes/budgetLineRoutes.ts` | `GET/POST /budget-lines`, `GET/PATCH/DELETE /budget-lines/:id` |
| `backend/src/routes/budgetViewRoutes.ts` | `GET /budget-view`, `GET /budget-view/pay-period` |

**Edited:**

| File | Change |
|------|--------|
| `backend/src/routes/index.ts` | Mounted `/budget-lines` and `/budget-view` |
| `backend/src/types/core.types.ts` | Added `BudgetLine`, `BudgetLineFrequency`, `BudgetLineClassification`, `BudgetLineFlexibility`, `CreateBudgetLineData`, `UpdateBudgetLineData`, `Occurrence`, `BudgetViewLine`, `BudgetView`, `PayPeriod` |
| `backend/src/validators/coreValidators.ts` | Added `createBudgetLineSchema`, `updateBudgetLineSchema`, `budgetViewQuerySchema` |

### Frontend

| File | Purpose |
|------|---------|
| `src/features/core/pages/BudgetPage.tsx` | Top-level page; owns period state; groups Budget View Lines by Category; renders expense groups then income section |
| `src/features/core/components/PeriodSelector.tsx` | Month navigator ← → with view mode dropdown (Monthly / This Week / This Pay Period / Custom); emits `{start, end}` ISO strings |
| `src/features/core/components/BudgetSummaryBar.tsx` | 4-cell summary (Planned Income, Planned Expenses, Actual Expenses, Remaining Budget) + net row |
| `src/features/core/components/BudgetLineGroup.tsx` | Collapsible group header — Category name, group planned vs. actual totals; renders `BudgetLineRow` for each line |
| `src/features/core/components/BudgetLineRow.tsx` | Single row: name, `FlexibilityBadge`, `FrequencyBadge`, prorated amount, progress bar, actual, variance chip; inline edit expand on click |
| `src/features/core/components/AddBudgetLineDialog.tsx` | Form: name, classification, flexibility, category (top-level only), subcategory (child of selected category), amount, frequency, frequencyInterval, anchorDate, isPayPeriodAnchor, notes |
| `src/features/core/components/FrequencyBadge.tsx` | Pill badge: "Monthly", "Biweekly", "Every 14 days", etc. |
| `src/features/core/components/FlexibilityBadge.tsx` | Pill badge: "fixed" (filled) or "flexible" (outlined) |
| `src/features/core/api/budgetLineApi.ts` | `list`, `get`, `create`, `update`, `remove`; `getBudgetView(start, end)`, `getPayPeriod()` |
| `src/features/core/hooks/useBudgetLines.ts` | TanStack Query + Dexie fallback for CRUD |
| `src/features/core/hooks/useBudgetView.ts` | `useBudgetView(start, end)` — queries Budget View endpoint; `usePayPeriod()` — derives pay period boundaries |
| `src/lib/budget/budgetViewUtils.ts` | Pure utilities: `toAnnual`, `proratedAmount`, `currentPayPeriod`, `monthWindow`, `weekWindow`, `toISODate`, `frequencyLabel` |

**Edited:**

| File | Change |
|------|--------|
| `src/features/core/types/index.ts` | Added `BudgetLine`, `BudgetLineFrequency`, `Occurrence`, `BudgetViewLine`, `BudgetView`, `PayPeriod` frontend types |
| `src/app/App.tsx` | Replaced `/budgets/*` routes with `/budget` |
| `src/components/layout/AppLayout.tsx` | "Budgets" nav → `/budget` |
| `src/features/dashboard/pages/DashboardPage.tsx` | Budget snapshot updated to use `useBudgetView` for current month; shows top 3 over-budget expense lines |
| `src/features/core/components/TransactionForm.tsx` | Category selector changed to grouped Category/Subcategory display |

---

## API Endpoints Added

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/budget-lines` | Required | List all active Budget Lines for the authenticated user |
| POST | `/api/v1/budget-lines` | Required | Create a new Budget Line |
| GET | `/api/v1/budget-lines/:id` | Required | Get a single Budget Line by ID |
| PATCH | `/api/v1/budget-lines/:id` | Required | Update a Budget Line (partial update) |
| DELETE | `/api/v1/budget-lines/:id` | Required | Soft-delete a Budget Line (`is_active = false`) |
| GET | `/api/v1/budget-view?start=&end=` | Required | Compute Budget View: prorated amounts, actuals, variance, occurrences |
| GET | `/api/v1/budget-view/pay-period` | Required | Current pay period `{ start, end }` derived from anchor income line; returns `null` if no anchor set |

### `BudgetView` response shape

```typescript
interface BudgetView {
  start: string;                  // YYYY-MM-DD
  end: string;                    // YYYY-MM-DD
  lines: BudgetViewLine[];
  totalProratedIncome: number;
  totalProratedExpenses: number;
  totalActualIncome: number;
  totalActualExpenses: number;
}

interface BudgetViewLine {
  budgetLine: BudgetLine;
  proratedAmount: number;         // normalized to view window
  actualAmount: number;           // sum of matching transactions
  variance: number;               // proratedAmount − actualAmount
  occurrences: Occurrence[];
}

interface Occurrence {
  budgetLineId: string;
  dueDate: string;                // YYYY-MM-DD
  expectedAmount: number;
  status: 'upcoming' | 'missed'; // missed if dueDate <= today and no matching tx
}
```

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| No `budget_plans` container | Budget Lines belong directly to the user | Single living budget per user; a plan-switcher can be added later non-breakingly by adding a `plan_id` FK |
| Embedded Schedule | Inline fields on `budget_lines`, not a separate `schedules` table | Budget Lines always have exactly one Schedule; normalization adds no value |
| Occurrences not persisted | Computed on the fly in `getBudgetView()` | MVP simplicity; explicit `matched`/`missed` tracking deferred to a future phase |
| `categoryId` → top-level, `subcategoryId` → child | Enforced at service layer | Prevents orphaned Budget Lines and maintains the Category/Subcategory hierarchy contract |
| `is_pay_period_anchor` at-most-one constraint | Service enforces via `clearPayPeriodAnchors()` before setting a new anchor | Single "pay period" concept per user; multiple anchors would be ambiguous |
| Anchor clear+set in a DB transaction | `budgetLineRepository.transaction(async (trx) => { ... })` | Prevents race condition where two anchors could briefly coexist between the clear and the insert/update |
| Proration formula | `toAnnual(amount, frequency) × (daysInWindow / 365)` | Consistent cross-frequency comparison; one_time lines score 0 unless anchor falls in window |
| Actuals lookup | `getActuals()` + `getIncomeActuals()` — two separate queries grouped by `category_id` | Reuses `getBudgetProgress()` aggregation pattern from Phase 3; expense and income summed in opposite directions (`amount < 0` vs `amount > 0`) |
| `semi_monthly` occurrence walking | Alternate between 1st and 15th of the month | Standard twice-monthly payroll pattern |

---

## Security & Correctness Fixes (Post-Implementation Review)

Five issues were identified and fixed after initial implementation:

| # | Issue | Fix |
|---|-------|-----|
| 1 | Occurrence `status: d < today` — today's occurrences were incorrectly marked "upcoming" | Changed to `d <= today` (due date on or before today = missed) |
| 2 | Missing `(user_id, is_pay_period_anchor)` index | Added composite index to `20260223005_create_budget_lines.ts` migration; optimises `findPayPeriodAnchor` query |
| 3 | Pay period anchor clear+set was non-atomic (race condition) | Wrapped `clearPayPeriodAnchors` + `create`/`update` in `budgetLineRepository.transaction()`; `clearPayPeriodAnchors`, `create`, and `update` now accept optional `Knex.Transaction` |
| 4 | `updateBudgetLineSchema` lacked the `when('frequency', { is: 'every_n_days' })` conditional on `frequencyInterval` | Added same `.when()` conditional as `createBudgetLineSchema` |
| 5 | `formatCurrency` export in `budgetViewUtils.ts` became dead code after all components migrated to `useFormatters()` | Removed the export |

---

## Security Checklist

| Control | Status |
|---------|--------|
| All budget-line and budget-view routes behind `authenticate` middleware | ✅ |
| All queries scoped to `req.user.id` — cross-user data impossible | ✅ |
| `getActuals` and `getIncomeActuals` explicitly filter by `user_id` | ✅ |
| No PII in Budget Lines (names, notes are user-defined labels, not sensitive) | ✅ |
| `isPayPeriodAnchor` restricted to income lines only; enforced at service layer | ✅ |
| Category hierarchy validated server-side before write | ✅ |
| Pay period anchor mutation is atomic (Knex transaction) | ✅ |

---

## Known Limitations / Phase 9+ Work

- **Offline support incomplete:** `useBudgetLines` and `useBudgetView` hooks lack Dexie fallback. Budget View (computed) cannot be served offline — "offline" state shows a clear error but no cached data. `LocalBudgetLine` not added to Dexie schema.
- **Occurrence persistence deferred:** MVP derives occurrence status (`upcoming`/`missed`) on the fly. Explicit `matched`/`missed` tracking with manual transaction linkage requires a `budget_line_occurrences` table — deferred.
- **Savings Goal ↔ Budget Line link deferred:** `savings_goals` table exists; a `recurring_contribution_budget_line_id` FK can be added later without breaking changes.
- **`transaction_splits` (debt amortization) not factored into actuals:** When a loan payment is split into principal + interest, the full transaction amount is counted in the actuals for the budget category. Interest-only view requires joining `transaction_splits` — deferred.
- **`budgets` / `budget_categories` tables not dropped:** Left in place to preserve existing data. No UI accesses them. Drop can be done in a future cleanup migration.
