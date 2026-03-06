# Phase 3 Review — Core Domain (Accounts, Categories, Transactions, Budgets)

**Date:** 2026-02-19
**Status:** Complete
**Bugs fixed post-implementation:** 5

---

## Summary

Phase 3 implemented the full core financial domain: accounts, categories, transactions, and budgets. All CRUD endpoints are live, transfer-linking logic is in place, and budget progress tracking aggregates spending by category. The frontend feature module (`features/core`) covers pages, hooks, and API clients for all four domains.

---

## Files Created

### Backend

#### Database Migrations

| File | Purpose |
|------|---------|
| `database/migrations/20260218001_create_accounts_table.ts` | Accounts — type enum (7 variants), is_asset flag, starting/current balance, currency, soft-delete |
| `database/migrations/20260218002_create_categories_table.ts` | Categories — income/expense flag, optional parent_id hierarchy, icon, color, soft-delete |
| `database/migrations/20260218003_create_transactions_table.ts` | Transactions — amount, AES-256-GCM encrypted description/payee/notes, user-chosen date, category FK (SET NULL on delete), is_transfer/is_cleared flags |
| `database/migrations/20260218004_create_transaction_links_table.ts` | Transfer links — from_id/to_id pair, link_type (transfer\|payment\|refund), unique constraint prevents duplicate links |
| `database/migrations/20260218005_create_budgets_table.ts` | Budgets + budget_categories junction — date range, ON DUPLICATE KEY UPDATE for allocation upserts |

#### Services

| File | Purpose |
|------|---------|
| `services/core/accountService.ts` | Account CRUD + soft-archive; listAccounts, getAccount, createAccount, updateAccount, archiveAccount |
| `services/core/categoryService.ts` | Category CRUD + soft-archive; seedDefaultsForUser (20 categories seeded at registration) |
| `services/core/transactionService.ts` | Transaction CRUD with atomic balance updates; transfer candidate detection (±3 days, equal/opposite amounts); linkTransactions/unlinkTransactions |
| `services/core/budgetService.ts` | Budget CRUD with date-range validation (startDate < endDate); getBudgetProgress aggregates spending per category |

#### Controllers

| File | Purpose |
|------|---------|
| `controllers/accountController.ts` | list, create, getById, update, archive |
| `controllers/categoryController.ts` | list, create, update, archive |
| `controllers/transactionController.ts` | list, create, getById, update, delete, getCandidates, link, unlink |
| `controllers/budgetController.ts` | list, create, getById (with progress), update, delete, upsertCategories |

#### Repositories

| File | Purpose |
|------|---------|
| `repositories/accountRepository.ts` | Account CRUD + updateBalance (atomic increment for transaction side-effects) |
| `repositories/categoryRepository.ts` | Category CRUD + createBatch (bulk seed) |
| `repositories/transactionRepository.ts` | Transaction CRUD + findTransferCandidates (JOIN with accounts, LEFT JOIN excludes already-linked rows) + setIsTransfer |
| `repositories/transactionLinkRepository.ts` | Link create/find/delete by either transaction ID |
| `repositories/budgetRepository.ts` | Budget CRUD + upsertCategories (raw INSERT … ON DUPLICATE KEY UPDATE) + getBudgetProgress (correlated subquery per category) |

#### Validators & Routes

| File | Purpose |
|------|---------|
| `validators/coreValidators.ts` | Joi schemas: createAccountSchema, updateAccountSchema, createCategorySchema, updateCategorySchema, createTransactionSchema, updateTransactionSchema, linkTransactionSchema, transactionFiltersSchema, createBudgetSchema, updateBudgetSchema, budgetCategoriesSchema |
| `routes/accountRoutes.ts` | GET /, POST /, GET /:id, PATCH /:id, DELETE /:id |
| `routes/categoryRoutes.ts` | GET /, POST /, PATCH /:id, DELETE /:id |
| `routes/transactionRoutes.ts` | GET /, POST /, GET /:id, PATCH /:id, DELETE /:id, GET /:id/candidates, POST /:id/link, DELETE /:id/link |
| `routes/budgetRoutes.ts` | GET /, POST /, GET /:id, PATCH /:id, DELETE /:id, PUT /:id/categories |

### Frontend

| File | Purpose |
|------|---------|
| `features/core/types/index.ts` | Shared domain types: Account, Category, Transaction, Budget, BudgetCategory, TransferCandidate, pagination |
| `features/core/api/accountApi.ts` | Typed Axios wrappers: list, get, create, update, archive |
| `features/core/api/categoryApi.ts` | Typed Axios wrappers: list, create, update, archive |
| `features/core/api/transactionApi.ts` | Typed Axios wrappers: list, get, create, update, delete, getCandidates, link, unlink |
| `features/core/api/budgetApi.ts` | Typed Axios wrappers: list, get, create, update, delete, upsertCategories |
| `features/core/hooks/useAccounts.ts` | TanStack Query hooks: useAccounts, useAccount, useCreateAccount, useUpdateAccount, useArchiveAccount |
| `features/core/hooks/useCategories.ts` | TanStack Query hooks: useCategories, useCreateCategory, useUpdateCategory, useArchiveCategory |
| `features/core/hooks/useTransactions.ts` | TanStack Query hooks: useTransactions, useTransaction, useCreateTransaction, useUpdateTransaction, useDeleteTransaction, useLinkTransaction, useUnlinkTransaction |
| `features/core/hooks/useBudgets.ts` | TanStack Query hooks: useBudgets, useBudget, useCreateBudget, useUpdateBudget, useDeleteBudget, useUpsertBudgetCategories |
| `features/core/components/AccountForm.tsx` | Create/edit account form with Zod validation |
| `features/core/components/AccountCard.tsx` | Account summary card with balance and type badge |
| `features/core/components/TransactionForm.tsx` | Create/edit transaction form; category select, date picker |
| `features/core/components/TransactionList.tsx` | Paginated transaction list with filter controls |
| `features/core/components/TransferLinkingDialog.tsx` | Dialog to confirm/dismiss transfer candidate suggestions |
| `features/core/components/BudgetForm.tsx` | Create/edit budget form with date range picker |
| `features/core/components/BudgetCard.tsx` | Budget card showing period and progress summary |
| `features/core/components/CategoryBadge.tsx` | Inline category pill with color dot |
| `features/core/pages/AccountsPage.tsx` | Accounts list page with create action |
| `features/core/pages/TransactionsPage.tsx` | Transactions list page with filter panel |
| `features/core/pages/BudgetListPage.tsx` | Budget list page |
| `features/core/pages/BudgetDetailPage.tsx` | Budget detail with per-category progress bars |

### Tests

| File | Coverage |
|------|---------|
| `backend/src/__tests__/validators/coreValidators.test.ts` | All 11 Joi schemas — required fields, enum values, hex color, date formats, UUID fields, default values, limit caps (38 tests) |
| `backend/src/__tests__/services/accountService.test.ts` | listAccounts, getAccount (404), createAccount, updateAccount (404 + success), archiveAccount (404, 409 already archived, success) (8 tests) |
| `backend/src/__tests__/services/categoryService.test.ts` | seedDefaultsForUser (20 categories), getCategory (404 + success), archiveCategory (409 + success) (4 tests) |
| `backend/src/__tests__/services/transactionService.test.ts` | getTransaction (404), createTransaction (404 no account, success + candidates), deleteTransaction (404, balance reversal + unlink), linkTransactions (400 self, 422 unequal, 409 already linked), unlinkTransactions (404, 409 not linked) (11 tests) |
| `backend/src/__tests__/services/budgetService.test.ts` | getBudget (404), createBudget (422 invalid dates, success), updateBudget (404, 422, success), deleteBudget (404, success), getBudgetProgress (404, aggregated totals) (11 tests) |
| `frontend/src/__tests__/hooks/useAccounts.test.tsx` | useAccounts (success + error), useAccount (by id, disabled when empty), useCreateAccount, useArchiveAccount (6 tests) |

---

## Bugs Found and Fixed During Review

### 1. CRITICAL: UUID insert returns numeric insert ID, not UUID string
**Impact:** `accountRepository.create()`, `categoryRepository.create()`, `budgetRepository.create()`, and `transactionRepository.create()` all did `const [id] = await db.insert(...)` then `where({ id })`. With MariaDB UUID primary keys (`DEFAULT (UUID())`), `insert()` returns `[0]` (no auto-increment), so the subsequent `where({ id: 0 })` finds no rows. `rowTo*()` would receive `undefined` and crash with a runtime error. Every create endpoint would fail in production.
**Fix:** Generate UUID in the application via `randomUUID()` from Node's built-in `crypto` module, pass `id` explicitly in the INSERT, and fetch the row using that known UUID. This is consistent with how `userRepository`, `refreshTokenRepository`, and `passkeyRepository` already handle the same pattern.

### 2. `any` type in errorHandler.ts
**Impact:** `const errorResponse: any` bypassed TypeScript strict-mode checks, violating the no-`any` project rule and masking the `noPropertyAccessFromIndexSignature` requirement.
**Fix:** Changed to `Record<string, unknown>` and updated property accesses to bracket notation (`errorResponse['stack']`, `errorResponse['error']`).

### 3. `Function` type in `asyncHandler`
**Impact:** `(fn: Function)` bypasses type checking on the wrapped handler parameter, again violating the no-`any`/no-loose-types rule.
**Fix:** Changed to explicit signature `(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>)`. Controllers passing two-parameter handlers remain valid because TypeScript allows narrower parameter counts to satisfy broader function types.

---

## API Endpoint Summary

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/v1/accounts` | List all accounts |
| POST | `/api/v1/accounts` | Create account |
| GET | `/api/v1/accounts/:id` | Get account |
| PATCH | `/api/v1/accounts/:id` | Update account |
| DELETE | `/api/v1/accounts/:id` | Archive account (soft delete) |
| GET | `/api/v1/categories` | List all categories |
| POST | `/api/v1/categories` | Create category |
| PATCH | `/api/v1/categories/:id` | Update category |
| DELETE | `/api/v1/categories/:id` | Archive category (soft delete) |
| GET | `/api/v1/transactions` | List transactions (filters: accountId, categoryId, startDate, endDate, isTransfer; pagination: page, limit) |
| POST | `/api/v1/transactions` | Create transaction (returns transaction + transfer candidates) |
| GET | `/api/v1/transactions/:id` | Get transaction |
| PATCH | `/api/v1/transactions/:id` | Update transaction (atomic balance delta) |
| DELETE | `/api/v1/transactions/:id` | Delete transaction (reverses balance, removes link) |
| GET | `/api/v1/transactions/:id/candidates` | Get transfer candidates |
| POST | `/api/v1/transactions/:id/link` | Link transfer pair |
| DELETE | `/api/v1/transactions/:id/link` | Unlink transfer pair |
| GET | `/api/v1/budgets` | List budgets |
| POST | `/api/v1/budgets` | Create budget |
| GET | `/api/v1/budgets/:id` | Get budget with per-category progress |
| PATCH | `/api/v1/budgets/:id` | Update budget |
| DELETE | `/api/v1/budgets/:id` | Delete budget (hard delete) |
| PUT | `/api/v1/budgets/:id/categories` | Upsert category allocations |

---

## Security Checklist

| Control | Status |
|---------|--------|
| All routes behind `authenticate` middleware | ✅ |
| All write routes validated via `validateRequest` + Joi | ✅ |
| userId always injected from JWT (never trusted from body) | ✅ |
| Transaction description/payee/notes AES-256-GCM encrypted | ✅ |
| Balance updates atomic (Knex transaction wraps insert + increment) | ✅ |
| Transfer linking validates equal/opposite amounts | ✅ |
| Self-link prevention (400 if txId === targetId) | ✅ |
| Budget progress query excludes `is_transfer=1` (prevents double-counting) | ✅ |
| Soft-delete (archive) preserves transaction history on account/category removal | ✅ |
| Category FK uses `ON DELETE SET NULL` — transactions survive category archival | ✅ |

---

## Known Limitations / Phase 4+ Work

- `search` parameter is accepted by `transactionFiltersSchema` and passed through `TransactionFilters` but `transactionRepository.findAll()` does not yet apply it — full-text payee/description search is not implemented.
- `GET /categories/:id` endpoint is not exposed (service has the method; route was not added). Not required by current frontend but omits a conventional REST resource.
- DashboardPage is a stub — no summary widgets, net-worth chart, or spending overview are implemented yet.
- Empty placeholder feature directories exist (`features/accounts/`, `features/budgets/`, `features/transactions/`) — all live code is in `features/core/`. These directories should either be populated or removed when the feature structure is revisited.
- `categoryRepository.createBatch()` does not include `id` in the inserted rows, relying on `DEFAULT (UUID())`. Since the batch method returns `void` (does not fetch rows back), this is safe for the seeding use case but means batch-created categories cannot be returned to the caller.
- No budget total validation — nothing prevents the sum of `allocatedAmount` entries from exceeding a desired budget ceiling.
