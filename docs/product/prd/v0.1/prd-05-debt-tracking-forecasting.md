# PRD: Debt Tracking, Forecasting & Savings Goals

**Version:** 1.0
**Status:** Shipped — Phase 6
**Last updated:** 2026-02-24

---

## Problem Statement

Users with loans, mortgages, or credit card debt need to understand their payoff timeline, how much interest they're paying, and what impact extra payments would have. Separately, users saving toward specific goals need a way to track progress and project a completion date. Both use cases benefit from having the app work with the financial data it already has.

---

## Goals

- Standard loan amortization schedule (P&I split) for any loan/mortgage/credit card account
- Automatic principal/interest splitting on each detected loan payment
- Payoff projection: how much sooner can I be debt-free if I pay $X more per month?
- Liability comparison view: all debts ranked by APR (debt avalanche method)
- Budget forecasting: project the next N months of income/expenses using historical medians
- Savings goals: set a target amount on a savings account, track progress, project completion date
- Currency conversion for multi-currency account portfolios

## Non-Goals

- Investment returns or portfolio tracking
- Debt snowball calculator (avalanche only for now)
- Automatic extra-payment suggestions
- External credit score integration

---

## Functional Requirements

### 6.1 Loan Amortization

- Any account of type `loan`, `mortgage`, or `credit_card` can have a `debt_schedule` attached
- `PUT /debt/:accountId` — upsert the schedule (principal, annual rate, term months, origination date, payment amount)
- `GET /debt/:accountId` — returns the full amortization table: month-by-month payment breakdown (total payment, principal portion, interest portion, remaining balance), total interest, payoff date
- **Auto-split on payment:** When a transaction is created against a loan/mortgage/credit_card account with `amount < 0`, `autoSplitPayment` runs non-fatally: finds the most recent amortization row for that month and stores principal/interest in `transaction_splits`

### 6.2 Payoff Projections

- `GET /debt/:accountId/what-if?extraMonthly=N` — computes payoff date and total interest with an additional $N/month payment vs. baseline
- Returns: `originalPayoffDate`, `newPayoffDate`, `monthsSaved`, `interestSaved`
- DebtDetailPage: amortization table (24-row preview with "Show all" toggle), live what-if calculator with instant recalculation

### 6.3 Budget Forecasting

- `GET /reports/forecast?months=N` — median income and median expenses from the last 6 calendar months, projected forward N months
- `isForecast: true` flag on projected entries for UI differentiation
- Dashboard MonthlyChart shows forecast bars with `fillOpacity: 0.45` and a "Show forecast" toggle

### 6.4 Savings Goals

- Any account can be linked to a savings goal (the account's `current_balance` is the goal's `currentAmount`)
- `targetAmount` and optional `targetDate`
- `GET /savings-goals/:id/progress` — computes `percentComplete`, `daysToGoal` (days until `targetDate` if set), `projectedDate` (estimated completion based on 90-day average balance growth)
- SavingsGoalsPage: create/edit/delete goals; progress bar per goal; Dashboard widget shows top 3

### 6.5 Account Enhancements

- **Full account editing:** All fields editable including `type`, `isAsset`, `startingBalance` (balance delta applied atomically)
- **Annual rate field:** `annual_rate` stored as decimal fraction on `accounts`; shown on AccountCard; used in liability comparison ranking
- **`line_of_credit` account type** added alongside existing types
- **Default currency preference:** `default_currency` on `users` table; `PATCH /auth/me` to update; used in currency conversion display

### 6.5.1 Liability Comparison View

- `/liabilities` page: all active liability accounts (`is_asset = false`) sorted by `annual_rate` descending (avalanche method)
- Summary cards: total outstanding balance, total monthly interest cost
- Per-account what-if calculator reusing the existing `GET /debt/:accountId/what-if` endpoint
- Sort toggle: by rate, balance, or monthly interest

### 6.5.2 Currency Conversion

- `exchange_rates` table: one row per currency pair, refreshed daily from Frankfurter/ECB API
- `GET /exchange-rates?from=&to=` — returns current rate; returns stale indicator if `fetched_date < today`
- `AccountCard` shows `~{defaultCurrency} {convertedAmount}` for accounts in a non-default currency
- Accounts page net worth converted to user's default currency using `useExchangeRates` (TanStack Query)
- Stale rates shown with a ⚠ warning icon; no conversion when all accounts are in the default currency

---

## Data Model

Key tables: [`debt_schedules`](../planning/database-schema.md#debt_schedules), [`transaction_splits`](../planning/database-schema.md#transaction_splits), [`savings_goals`](../planning/database-schema.md#savings_goals), [`exchange_rates`](../planning/database-schema.md#exchange_rates)

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PUT | `/api/v1/debt/:accountId` | Required | Upsert debt schedule |
| GET | `/api/v1/debt/:accountId` | Required | Get amortization schedule and totals |
| GET | `/api/v1/debt/:accountId/what-if?extraMonthly=N` | Required | Payoff projection with extra payment |
| GET | `/api/v1/savings-goals` | Required | List all savings goals |
| POST | `/api/v1/savings-goals` | Required | Create a savings goal |
| GET | `/api/v1/savings-goals/:id` | Required | Get a single goal |
| PATCH | `/api/v1/savings-goals/:id` | Required | Update goal name, target amount, or target date |
| DELETE | `/api/v1/savings-goals/:id` | Required | Delete a goal |
| GET | `/api/v1/savings-goals/:id/progress` | Required | Compute goal progress and projection |
| GET | `/api/v1/exchange-rates?from=&to=` | Required | Get current exchange rate (with stale indicator) |
| GET | `/api/v1/reports/forecast?months=N` | Required | Projected income/expenses for next N months |

---

## UI/UX Requirements

- **Debt Detail page:** Shows account info + amortization table; "Show all" / "Show less" toggle for the full schedule; what-if calculator with input and instant result
- **Liabilities page:** Summary cards; ranked liability table; per-row what-if calculator
- **Savings Goals page:** List of goals with progress bars; create/edit dialog
- **AccountCard:** Shows `annual_rate` if set; shows converted balance in user's default currency for foreign-currency accounts

---

## Security Requirements

- All debt/savings/exchange-rate endpoints scoped to `req.user.id`
- `autoSplitPayment` is non-fatal: failure to split does not prevent the transaction from being recorded
- Exchange rates are non-sensitive public data; no encryption needed

---

## Acceptance Criteria

- [x] Amortization schedule computed correctly (standard P&I formula)
- [x] `autoSplitPayment` stores principal/interest split on loan payments
- [x] What-if endpoint returns correct `monthsSaved` and `interestSaved` vs. baseline
- [x] Savings goal progress reflects linked account's live balance
- [x] Exchange rates fetched daily; stale indicator shown when rate is from a prior day
- [x] Liability comparison view sorts by `annual_rate` descending

---

## Known Limitations / Future Work

- `transaction_splits` not yet factored into Budget View actuals — interest-only view deferred
- No debt snowball calculator (avalanche only)
- Exchange rate validity not verified in real-time (once per day, stale indicator is informational only)
- `projectedDate` in savings goal progress uses a simple 90-day trailing average balance growth rate; accuracy degrades for non-linear savers
- `discarded_ids_json` growth issue for SimpleFIN dedup is separate concern — see SimpleFIN PRD
