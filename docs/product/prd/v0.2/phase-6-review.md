# Phase 6 Review — Debt Tracking & Budget Forecasting

**Date:** 2026-02-20
**Status:** Complete
**Bugs fixed post-implementation:** 0

---

## Summary

Phase 6 implemented all four sub-features: loan amortization tracking with principal/interest payment splits, payoff projection "what-if" calculator, budget forecasting from historical median cash flows, and savings goal tracking. Phase 5 (SimpleFIN bank sync) was intentionally deferred.

---

## Files Created

### Backend

#### Database Migrations

| File | Purpose |
|------|---------|
| `database/migrations/20260220001_create_debt_schedules_table.ts` | Debt schedules — principal, annual_rate (decimal fraction), term_months, origination_date, payment_amount; unique constraint on (user_id, account_id) |
| `database/migrations/20260220002_create_transaction_splits_table.ts` | Transaction splits — principal_amount, interest_amount per payment; no user_id (access via JOIN through transactions); immutable (no updated_at) |
| `database/migrations/20260220003_create_savings_goals_table.ts` | Savings goals — account_id FK, name, target_amount, nullable target_date |

#### Types

| File | Changes |
|------|---------|
| `types/core.types.ts` | Added: DebtSchedule, UpsertDebtScheduleData, AmortizationRow, AmortizationSchedule, WhatIfResult, TransactionSplit, SavingsGoal, CreateSavingsGoalData, UpdateSavingsGoalData, SavingsGoalProgress, ForecastMonth |

#### Validators

| File | Changes |
|------|---------|
| `validators/coreValidators.ts` | Added: upsertDebtScheduleSchema (annualRate as 0–1 fraction), whatIfQuerySchema, createSavingsGoalSchema, updateSavingsGoalSchema |

#### Repositories

| File | Purpose |
|------|---------|
| `repositories/debtRepository.ts` | findByUserAndAccount, findAllByUser, upsert (update-or-insert by unique key), delete, createSplit, findSplitByTransaction |
| `repositories/savingsGoalRepository.ts` | Full CRUD: findAllByUser, findById, create, update, delete |

#### Services

| File | Purpose |
|------|---------|
| `services/core/debtService.ts` | getSchedule, upsertSchedule, deleteSchedule, getAmortizationSchedule, whatIfExtraPayment, autoSplitPayment (non-fatal fire-and-forget), getSplitForTransaction |
| `services/core/savingsGoalService.ts` | listGoals, getGoal, createGoal, updateGoal, deleteGoal, getProgress (currentAmount, percentComplete, daysToGoal, projectedDate) |
| `services/core/forecastService.ts` | getForecast — queries last 6 months of transactions, computes median income/expense, generates N future months with isForecast: true |
| `services/core/transactionService.ts` | **Edited:** after successful create on loan/mortgage/credit_card accounts with negative amount, calls `void debtService.autoSplitPayment(...)` (fire-and-forget, non-fatal) |

#### Controllers

| File | Purpose |
|------|---------|
| `controllers/debtController.ts` | getSchedule, upsertSchedule, deleteSchedule, getAmortizationSchedule, whatIfExtraPayment, getSplit |
| `controllers/savingsGoalController.ts` | list, create, getById, update, delete, getProgress |
| `controllers/reportController.ts` | **Edited:** added forecast handler |

#### Routes

| File | Purpose |
|------|---------|
| `routes/debtRoutes.ts` | GET/PUT/DELETE /schedule/:accountId, GET /amortization/:accountId, GET /what-if/:accountId, GET /split/:transactionId |
| `routes/savingsGoalRoutes.ts` | GET /, POST /, GET /:id, PATCH /:id, DELETE /:id, GET /:id/progress |
| `routes/reportRoutes.ts` | **Edited:** added GET /forecast |
| `routes/index.ts` | **Edited:** mounted /debt and /savings-goals |

### Frontend

| File | Purpose |
|------|---------|
| `features/core/types/index.ts` | **Edited:** added DebtSchedule, AmortizationRow, AmortizationSchedule, WhatIfResult, TransactionSplit, SavingsGoal, SavingsGoalProgress, ForecastMonth |
| `features/core/api/debtApi.ts` | getSchedule, upsertSchedule, deleteSchedule, getAmortizationSchedule, whatIfExtraPayment, getSplit |
| `features/core/api/savingsGoalApi.ts` | Full CRUD + getProgress |
| `features/core/api/reportApi.ts` | **Edited:** added isForecast?: boolean to MonthlySummaryEntry; added forecast() method |
| `features/core/hooks/useDebt.ts` | useDebtSchedule (retry skips 404), useAmortizationSchedule, useWhatIf, useTransactionSplit, useUpsertDebtSchedule, useDeleteDebtSchedule |
| `features/core/hooks/useSavingsGoals.ts` | useSavingsGoals, useSavingsGoal, useSavingsGoalProgress, useCreateSavingsGoal, useUpdateSavingsGoal, useDeleteSavingsGoal |
| `features/core/hooks/useReports.ts` | **Edited:** added useForecast(months) |
| `features/core/pages/DebtDetailPage.tsx` | Route /accounts/:accountId/debt — DebtScheduleForm, AmortizationTable (24-row preview + show all), ExtraPaymentCalculator |
| `features/core/pages/SavingsGoalsPage.tsx` | Route /savings-goals — GoalForm, GoalCard (progress bar, projected date, days remaining), list page |
| `features/core/components/AccountCard.tsx` | **Edited:** added "Debt detail" link for loan/mortgage/credit_card account types |
| `components/charts/MonthlyChart.tsx` | **Edited:** added Recharts Cell to dim forecast bars (fillOpacity 0.4 when isForecast) |
| `components/layout/AppLayout.tsx` | **Edited:** added Savings Goals nav item (Target icon) |
| `features/dashboard/pages/DashboardPage.tsx` | **Edited:** showForecast toggle merging forecast data; savings goals widget (top 3 goals) |
| `app/App.tsx` | **Edited:** added routes for DebtDetailPage and SavingsGoalsPage |

### Tests

| File | Coverage |
|------|---------|
| `backend/src/__tests__/services/debtService.test.ts` | buildAmortizationRows structure and math, 404 when no schedule, balance reaches zero, known loan math (6.5% APR), whatIfExtraPayment months/interest saved, autoSplitPayment (no schedule → null, creates split, returns null on error), getSplitForTransaction 404 (9 tests) |
| `backend/src/__tests__/services/forecastService.test.ts` | Returns N months with isForecast=true, caps at 12, zero history returns zeros, median correctly de-weights outliers, future months start from next calendar month (5 tests) |

---

## API Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/debt/schedule/:accountId` | Get debt schedule for an account |
| PUT | `/api/v1/debt/schedule/:accountId` | Create or replace debt schedule |
| DELETE | `/api/v1/debt/schedule/:accountId` | Remove debt schedule |
| GET | `/api/v1/debt/amortization/:accountId` | Full amortization schedule + payoff date + total interest |
| GET | `/api/v1/debt/what-if/:accountId?extraMonthly=N` | What-if: months saved and interest saved with extra payment |
| GET | `/api/v1/debt/split/:transactionId` | Principal/interest split for a payment transaction |
| GET | `/api/v1/savings-goals` | List all savings goals |
| POST | `/api/v1/savings-goals` | Create savings goal |
| GET | `/api/v1/savings-goals/:id` | Get savings goal |
| PATCH | `/api/v1/savings-goals/:id` | Update savings goal |
| DELETE | `/api/v1/savings-goals/:id` | Delete savings goal |
| GET | `/api/v1/savings-goals/:id/progress` | Progress: current amount, %, projected date, days to goal |
| GET | `/api/v1/reports/forecast?months=N` | N months of projected income/expenses (median-based) |

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| `annualRate` storage | Decimal fraction (0.065 = 6.5%) | Eliminates percent vs. fraction ambiguity in math; validated `Joi.number().max(1)` |
| `autoSplitPayment` error handling | Log + continue (non-fatal) | Payment must not fail due to amortization split calculation errors |
| `transaction_splits` ownership | No `user_id` column | Access always via JOIN through `transactions WHERE user_id = ?`; avoids denormalization |
| Forecast algorithm | Median of last 6 months | Robust to irregular paydays and one-off large transactions; MVP before pattern detection |
| `useDebtSchedule` 404 | Not treated as error | 404 means no schedule configured yet — normal initial state; `retry: (_, err) => err.response?.status !== 404` |
| Amortization computation | Server-side on demand | Deterministic; no caching needed; prevents client-side math drift |
| Frontend `annualRate` display | Displayed as percent, stored as fraction | Form uses `annualRatePct` (0–100); divides by 100 on submit |
| Forecast bar dimming | Recharts `Cell` with `fillOpacity` | Per-entry opacity control without separate chart series |

---

## Security Checklist

| Control | Status |
|---------|--------|
| All routes behind `authenticate` middleware | ✅ |
| All write routes validated via `validateRequest` + Joi | ✅ |
| userId always injected from JWT (never from request body) | ✅ |
| Account ownership enforced at service layer (`findByUserAndAccount(userId, accountId)`) | ✅ |
| Transaction ownership verified before returning split (`findById(transactionId, userId)`) | ✅ |
| Savings goal ownership enforced via `findById(userId, goalId)` | ✅ |
| `autoSplitPayment` failure does not expose error details to caller | ✅ |
| No PII stored in new tables (debt schedules contain only financial figures; savings goals contain only amounts and dates) | ✅ |

---

## Known Limitations / Phase 7+ Work

- **Forecast accuracy:** Uses median of last 6 months — a simple MVP. A future improvement could detect recurring transactions by payee + amount within a ±7-day monthly window (as originally spec'd) for higher precision.
- **autoSplitPayment balance source:** Uses the account's current balance at the time of payment (post-update), which is a good approximation but differs from a strict amortization-schedule-derived balance for accounts that have irregular extra payments. The amortization table itself always starts from the original principal.
- **Savings goal progress source:** Reads `accounts.current_balance` at query time — no snapshot history. If the linked account is used for non-savings transactions, progress may fluctuate.
- **Debt detail nav entry:** Accessible only from the "Debt detail" link on each account card (loan/mortgage/credit_card); no top-level sidebar entry. Intentional — most users have 1–2 debt accounts.
- **No `database-schema.md`:** A schema reference doc does not exist in `docs/planning/`. New tables (`debt_schedules`, `transaction_splits`, `savings_goals`) should be documented there when the file is created.
