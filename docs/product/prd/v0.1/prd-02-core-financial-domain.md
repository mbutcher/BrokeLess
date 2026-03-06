# PRD: Core Financial Domain — Accounts, Categories, Transactions

**Version:** 1.0
**Status:** Shipped — Phase 3
**Last updated:** 2026-02-24

---

## Problem Statement

The foundational data model must accurately represent a user's financial life: the accounts they hold, the categories they use to organize spending and income, and the transactions that move money between accounts or in and out of the system. These three domains must interoperate correctly — most critically, account balances must stay precisely synchronized with transaction history at all times.

---

## Goals

- Represent all common account types (checking, savings, credit cards, loans, mortgages, investments, lines of credit)
- Support user-defined spending and income categories with a two-level hierarchy (Category → Subcategory)
- Record transactions with encrypted sensitive fields; update account balances atomically
- Detect and link transfer pairs automatically; allow manual linking and unlinking
- Provide full CRUD for all three domains with soft-delete semantics

## Non-Goals

- Multi-user / shared accounts
- Investment portfolio tracking (price history, lots, dividends)
- Import from CSV/OFX (bank sync via SimpleFIN is Phase 5)
- Full-text search (encrypted fields prevent SQL LIKE; deferred)

---

## Functional Requirements

### Accounts

- **Types:** `checking`, `savings`, `credit_card`, `loan`, `line_of_credit`, `mortgage`, `investment`, `other`
- **Asset vs. liability flag:** `is_asset` — drives sign convention in net worth calculation
- **Starting balance:** Captured on creation; `current_balance` initialized to this value
- **Atomic balance updates:** Every transaction create/update/delete adjusts `current_balance` in the same DB transaction
- **Currency:** Per-account ISO 4217 code; defaults to `'USD'`
- **Color:** Optional hex color (`#rrggbb`) for display
- **Institution:** Optional bank/institution name
- **Annual rate:** Optional APR/APY stored as decimal fraction (e.g., `0.0525` = 5.25%)
- **Soft-delete:** `is_active = false` preserves transaction history
- **Editing:** All fields editable; `startingBalance` changes apply a balance delta (new starting − old starting) to `current_balance`

### Categories

- **Hierarchy:** `parent_id IS NULL` = top-level **Category**; `parent_id IS NOT NULL` = **Subcategory**
- **Income vs. expense:** `is_income` flag on each category
- **Defaults:** 20 categories seeded per user on registration (e.g., Housing, Food, Transportation, Income, etc.)
- **Custom:** Users can create unlimited additional categories and subcategories
- **Soft-delete:** Archived categories preserved on existing transactions; `category_id` set to NULL via ON DELETE SET NULL if a category is hard-deleted (hard delete not exposed in UI)

### Transactions

- **Amount sign convention:** Positive = income/deposit; Negative = expense/debit
- **Sensitive fields:** `description`, `payee`, `notes` are AES-256-GCM encrypted at rest; decrypted before API response
- **Date:** User-selected transaction date (not `created_at`); allows backdating
- **Category:** Optional; `NULL` = uncategorized
- **Cleared flag:** `is_cleared` — user-controlled reconciliation marker
- **Filters:** By account, category, date range, is_transfer; paginated (`page`/`limit`)

### Transfer Detection & Linking

- On transaction create/update, the service scans for transfer candidates: opposite-sign transactions within ±3 days with amount difference ≤ $0.01, belonging to the same user but different accounts
- Auto-detected candidates returned in `GET /transactions/:id/candidates`
- **Linking:** `POST /transactions/:id/link` with `targetTransactionId` + `link_type` (`transfer`/`payment`/`refund`); sets `is_transfer = true` on both transactions
- **Unlinking:** `DELETE /transactions/:id/link` clears `is_transfer` on both and removes the `transaction_links` row
- Transfer-linked transactions are excluded from budget actuals and monthly summary calculations

---

## Data Model

Key tables: [`accounts`](../planning/database-schema.md#accounts), [`categories`](../planning/database-schema.md#categories), [`transactions`](../planning/database-schema.md#transactions), [`transaction_links`](../planning/database-schema.md#transaction_links)

---

## API Endpoints

### Accounts

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/accounts` | Required | List all active accounts for the user |
| POST | `/api/v1/accounts` | Required | Create a new account |
| GET | `/api/v1/accounts/:id` | Required | Get a single account |
| PATCH | `/api/v1/accounts/:id` | Required | Update account fields; applies balance delta for `startingBalance` changes |
| DELETE | `/api/v1/accounts/:id` | Required | Soft-delete (`is_active = false`) |

### Categories

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/categories` | Required | List all active categories |
| POST | `/api/v1/categories` | Required | Create a category or subcategory |
| POST | `/api/v1/categories/batch` | Required | Create multiple categories in one request (used for seeding defaults) |
| GET | `/api/v1/categories/:id` | Required | Get a single category |
| PATCH | `/api/v1/categories/:id` | Required | Update name, color, icon |
| DELETE | `/api/v1/categories/:id` | Required | Soft-delete (`is_active = false`) |

### Transactions

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/v1/transactions` | Required | List transactions with filters (account, category, date range, is_transfer); paginated |
| POST | `/api/v1/transactions` | Required | Create a transaction; atomically updates account balance |
| GET | `/api/v1/transactions/:id` | Required | Get a single transaction (decrypted) |
| PATCH | `/api/v1/transactions/:id` | Required | Update transaction; applies balance delta |
| DELETE | `/api/v1/transactions/:id` | Required | Delete transaction; reverses balance effect |
| GET | `/api/v1/transactions/:id/candidates` | Required | List auto-detected transfer match candidates |
| POST | `/api/v1/transactions/:id/link` | Required | Link two transactions as a transfer/payment/refund |
| DELETE | `/api/v1/transactions/:id/link` | Required | Unlink a transfer pair |

---

## UI/UX Requirements

- **Accounts page:** Card grid of all active accounts; filter/sort bar (by type, institution, assets/liabilities, name, balance, rate); net worth summary; "Add account" dialog
- **Account card:** Name, type badge, balance, institution, currency; converted balance in user's default currency for non-default-currency accounts
- **Transactions page:** Paginated list with filters (account, category, date range, transfers toggle); "Add transaction" button
- **Transaction form:** Account selector, amount, date, payee, description, notes, category (grouped Category/Subcategory selector), cleared checkbox
- **Transfer linking:** After creating a transaction that matches a candidate, the UI surfaces a "Link as transfer?" prompt showing the matched transaction

---

## Security Requirements

- `description`, `payee`, `notes` encrypted with AES-256-GCM at write time; decrypted at read time — plaintext never stored
- All queries scoped to `req.user.id` — cross-user data impossible
- Balance updates atomic with transaction writes (Knex transaction wrapper)
- Soft-delete preserves history; no hard-delete exposed in the API

---

## Acceptance Criteria

- [x] Account balance stays synchronized with transaction history through all create/update/delete operations
- [x] Transfer linking sets `is_transfer = true` on both sides; unlinking reverses this
- [x] Transfers excluded from monthly summary and budget actuals
- [x] Category hierarchy (Category → Subcategory) correctly represented and queryable
- [x] Sensitive transaction fields decrypted in API responses; encrypted in DB

---

## Known Limitations / Future Work

- No full-text search on encrypted payee/description fields (requires plaintext index — Phase 11)
- No CSV/OFX import (SimpleFIN bank sync is Phase 5)
- Category `createBatch()` returns void; the created categories are not immediately returned to the caller
- Account list is unbounded (no pagination); acceptable for personal use
