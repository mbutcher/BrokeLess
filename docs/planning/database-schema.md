# Database Schema Reference

**Last updated:** 2026-02-26
**Database:** MariaDB 11 (InnoDB)
**Migration tool:** Knex.js

All primary keys are UUIDs generated via `UUID()`. All tables include `created_at` and `updated_at` timestamps unless noted. Sensitive fields are AES-256-GCM encrypted at the application layer before storage.

---

## Table of Contents

### MariaDB Tables (Production)
1. [users](#users)
2. [refresh_tokens](#refresh_tokens)
3. [passkeys](#passkeys)
4. [totp_backup_codes](#totp_backup_codes)
5. [api_keys](#api_keys)
6. [accounts](#accounts)
7. [categories](#categories)
8. [transactions](#transactions)
9. [transaction_links](#transaction_links)
10. [budgets](#budgets) *(legacy — no longer used by UI)*
11. [budget_categories](#budget_categories) *(legacy — no longer used by UI)*
12. [debt_schedules](#debt_schedules)
13. [transaction_splits](#transaction_splits)
14. [savings_goals](#savings_goals)
15. [simplefin_connections](#simplefin_connections)
16. [simplefin_account_mappings](#simplefin_account_mappings)
17. [simplefin_pending_reviews](#simplefin_pending_reviews)
18. [exchange_rates](#exchange_rates)
19. [budget_lines](#budget_lines)

### IndexedDB Tables (Client-Side, Dexie)
19. [IndexedDB Schema](#indexeddb-schema)

---

## MariaDB Tables

---

### `users`

Core user accounts. Created in migration `20260217001`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `email_encrypted` | TEXT | No | — | AES-256-GCM encrypted email (`iv:authTag:ciphertext`) |
| `email_hash` | VARCHAR(64) | No | — | HMAC-SHA256 of lowercased email; used for unique lookup |
| `password_hash` | VARCHAR(255) | No | — | Argon2id output (self-describing, ~95 chars) |
| `is_active` | BOOLEAN | No | `true` | Account enabled flag |
| `email_verified` | BOOLEAN | No | `false` | Email verification status |
| `totp_enabled` | BOOLEAN | No | `false` | Whether TOTP 2FA is configured and confirmed |
| `totp_secret_encrypted` | TEXT | Yes | `NULL` | AES-256-GCM encrypted TOTP secret; null until TOTP confirmed |
| `webauthn_enabled` | BOOLEAN | No | `false` | Whether at least one passkey is registered |
| `failed_login_attempts` | INT | No | `0` | Consecutive failed login count (reset on success) |
| `locked_until` | TIMESTAMP | Yes | `NULL` | Account lockout expiry; null = not locked |
| `last_login_at` | TIMESTAMP | Yes | `NULL` | Last successful login timestamp |
| `default_currency` | VARCHAR(3) | No | `'CAD'` | ISO 4217 currency code for display defaults *(added 20260223003)* |
| `locale` | VARCHAR(10) | No | `'en-CA'` | BCP 47 locale tag; drives `Intl.*` API *(added 20260225001)* |
| `date_format` | ENUM | No | `'DD/MM/YYYY'` | `'DD/MM/YYYY'` \| `'MM/DD/YYYY'` \| `'YYYY-MM-DD'` *(added 20260225001)* |
| `time_format` | ENUM | No | `'12h'` | `'12h'` \| `'24h'` *(added 20260225001)* |
| `timezone` | VARCHAR(100) | No | `'America/Toronto'` | IANA timezone identifier *(added 20260225001)* |
| `week_start` | ENUM | No | `'sunday'` | `'sunday'` \| `'monday'` \| `'saturday'` *(added 20260225001)* |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

**Indexes:** `email_hash` UNIQUE

---

### `refresh_tokens`

JWT refresh token tracking. Created in migration `20260217002`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `token_hash` | VARCHAR(64) | No | — | SHA-256 of the raw refresh token (the token itself is never stored) |
| `expires_at` | TIMESTAMP | No | — | Token expiry (30 days from issuance) |
| `revoked` | BOOLEAN | No | `false` | Revocation flag; presenting a revoked token kills all sessions |
| `created_at` | TIMESTAMP | No | `NOW()` | |

**Indexes:** `user_id`, `token_hash` UNIQUE

---

### `passkeys`

WebAuthn credential storage. Created in migration `20260217003`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `credential_id` | TEXT | No | — | WebAuthn credential ID (Base64URL encoded) |
| `public_key` | TEXT | No | — | COSE-encoded public key (Base64URL) |
| `counter` | BIGINT | No | `0` | Signature counter (replay protection) |
| `device_type` | VARCHAR(32) | Yes | `NULL` | `'singleDevice'` or `'multiDevice'` |
| `backed_up` | BOOLEAN | No | `false` | Whether credential is synced to cloud |
| `name` | VARCHAR(255) | Yes | `NULL` | User-provided display name for the credential |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

**Indexes:** `user_id`, `credential_id` UNIQUE

---

### `totp_backup_codes`

One-time use TOTP recovery codes. Created in migration `20260217004`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `code_hash` | VARCHAR(64) | No | — | SHA-256 of the raw backup code |
| `used` | BOOLEAN | No | `false` | True once the code has been consumed |
| `created_at` | TIMESTAMP | No | `NOW()` | |

**Indexes:** `user_id`

---

### `api_keys`

Long-lived credentials for programmatic access (e.g. MCP server). Created in migration `20260228001`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | CHAR(36) | No | — | Primary key (UUID) |
| `user_id` | CHAR(36) | No | — | FK → `users.id` ON DELETE CASCADE |
| `label` | VARCHAR(255) | No | — | Human-readable name (e.g. "Home server MCP") |
| `key_hash` | CHAR(64) | No | — | SHA-256 hex digest of the raw API key; raw key is never stored |
| `scopes` | JSON | No | — | Array of granted scope strings (e.g. `["accounts:read","transactions:read"]`) |
| `last_used_at` | DATETIME | Yes | `NULL` | Updated (fire-and-forget) on each successful authentication |
| `expires_at` | DATETIME | Yes | `NULL` | Optional expiry; `NULL` = no expiry |
| `created_at` | DATETIME | No | `NOW()` | |
| `updated_at` | DATETIME | No | `NOW()` | Auto-updated |

**Indexes:** `user_id`, `key_hash` UNIQUE

**Valid scopes:** `accounts:read`, `transactions:read`, `transactions:write`, `budget:read`, `reports:read`, `simplefin:read`, `simplefin:write`

**Notes:**
- Raw key (`ba64url`, 32 random bytes → 43 chars) is returned **once** at creation and never persisted
- `write` scope implies read for the same resource (enforced in `requireScope` middleware)
- JWT-authenticated requests bypass scope checks entirely (full access)
- `touchLastUsed` is fire-and-forget — a failed update does not block the request

---

### `accounts`

Financial accounts (assets and liabilities). Created in migration `20260218001`; extended by `20260223001` and `20260223002`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `name` | VARCHAR(255) | No | — | Display name |
| `type` | ENUM | No | — | `'checking'` \| `'savings'` \| `'credit_card'` \| `'loan'` \| `'line_of_credit'` \| `'mortgage'` \| `'investment'` \| `'other'` |
| `is_asset` | BOOLEAN | No | `true` | `true` = asset, `false` = liability |
| `starting_balance` | DECIMAL(15,2) | No | `0` | Opening balance at account creation |
| `current_balance` | DECIMAL(15,2) | No | `0` | Updated atomically with each transaction write |
| `currency` | VARCHAR(3) | No | `'USD'` | ISO 4217 currency code |
| `color` | VARCHAR(7) | Yes | `NULL` | Hex color code (e.g. `'#3b82f6'`) |
| `institution` | VARCHAR(255) | Yes | `NULL` | Bank or institution name |
| `is_active` | BOOLEAN | No | `true` | Soft-delete flag |
| `annual_rate` | DECIMAL(6,4) | Yes | `NULL` | APR/APY as decimal fraction (e.g. `0.0525` = 5.25%) *(added 20260223001)* |
| `simplefin_account_id` | VARCHAR(255) | Yes | `NULL` | SimpleFIN account identifier for sync *(added 20260220010)* |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

**Indexes:** `user_id`, `(user_id, is_active)`

---

### `categories`

User-defined spending/income categories with optional hierarchy. Created in migration `20260218002`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `name` | VARCHAR(100) | No | — | Display name |
| `color` | VARCHAR(7) | Yes | `NULL` | Hex color code |
| `icon` | VARCHAR(50) | Yes | `NULL` | Lucide icon name |
| `is_income` | BOOLEAN | No | `false` | `true` = income category; `false` = expense category |
| `parent_id` | UUID | Yes | `NULL` | FK → `categories.id` ON DELETE SET NULL; `NULL` = top-level Category; non-null = Subcategory |
| `is_active` | BOOLEAN | No | `true` | Soft-delete flag |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

**Indexes:** `user_id`, `parent_id`

**Notes:**
- `parent_id IS NULL` → **Category** (top-level label in UI)
- `parent_id IS NOT NULL` → **Subcategory** (child of the parent Category)
- 20 default categories seeded per user on registration; `is_income` follows the category type

---

### `transactions`

Financial transaction records. Created in migration `20260218003`; extended by `20260220011`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `account_id` | UUID | No | — | FK → `accounts.id` ON DELETE CASCADE |
| `amount` | DECIMAL(15,2) | No | — | Positive = income/deposit; Negative = expense/debit |
| `description` | TEXT | Yes | `NULL` | AES-256-GCM encrypted |
| `payee` | VARCHAR(512) | Yes | `NULL` | AES-256-GCM encrypted |
| `notes` | TEXT | Yes | `NULL` | AES-256-GCM encrypted |
| `date` | DATE | No | — | Transaction date (user-selected, not `created_at`) |
| `category_id` | UUID | Yes | `NULL` | FK → `categories.id` ON DELETE SET NULL |
| `is_transfer` | BOOLEAN | No | `false` | Set to `true` when transaction is part of a confirmed transfer link |
| `is_cleared` | BOOLEAN | No | `false` | User-controlled reconciliation flag |
| `simplefin_transaction_id` | VARCHAR(255) | Yes | `NULL` | SimpleFIN ID; used for deduplication on subsequent syncs *(added 20260220011)* |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

**Indexes:** `user_id`, `account_id`, `date`, `category_id`, `is_transfer`

---

### `transaction_links`

Links between pairs of related transactions (transfers, payments, refunds). Created in migration `20260218004`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `from_transaction_id` | UUID | No | — | FK → `transactions.id` ON DELETE CASCADE |
| `to_transaction_id` | UUID | No | — | FK → `transactions.id` ON DELETE CASCADE |
| `link_type` | ENUM | No | — | `'transfer'` \| `'payment'` \| `'refund'` |
| `created_at` | TIMESTAMP | No | `NOW()` | |

**Indexes:** `from_transaction_id`, `to_transaction_id`

---

### `budgets`

Legacy: date-range budget containers. Created in migration `20260218005`. **No longer used by the UI** — superseded by Budget Lines in Phase 8. Not dropped; left in place to preserve any existing data.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `name` | VARCHAR(100) | No | — | Budget name |
| `start_date` | DATE | No | — | Budget period start |
| `end_date` | DATE | No | — | Budget period end |
| `is_active` | BOOLEAN | No | `true` | Soft-delete / active flag |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

---

### `budget_categories`

Legacy: per-category allocations within a Budget. Created in migration `20260218005`. **No longer used by the UI.** Not dropped.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `budget_id` | UUID | No | — | FK → `budgets.id` ON DELETE CASCADE |
| `category_id` | UUID | No | — | FK → `categories.id` ON DELETE CASCADE |
| `allocated_amount` | DECIMAL(15,2) | No | `0` | Amount allocated to this category for the budget period |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

---

### `debt_schedules`

Loan amortization schedules. Created in migration `20260220001`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `account_id` | UUID | No | — | FK → `accounts.id` ON DELETE CASCADE; UNIQUE (one schedule per account) |
| `principal` | DECIMAL(15,2) | No | — | Original loan amount |
| `annual_rate` | DECIMAL(6,4) | No | — | Decimal fraction: `0.065` = 6.5% APR |
| `term_months` | INT | No | — | Total loan term in months |
| `origination_date` | DATE | No | — | Date the loan originated (YYYY-MM-DD) |
| `payment_amount` | DECIMAL(15,2) | No | — | Regular payment amount |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

**Indexes:** `user_id`, `account_id` UNIQUE

---

### `transaction_splits`

Principal/interest breakdown for loan payment transactions. Created in migration `20260220002`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `transaction_id` | UUID | No | — | FK → `transactions.id` ON DELETE CASCADE; UNIQUE (one split per payment) |
| `principal_amount` | DECIMAL(15,2) | No | — | Principal portion of the payment |
| `interest_amount` | DECIMAL(15,2) | No | — | Interest portion of the payment |
| `created_at` | TIMESTAMP | No | `NOW()` | |

**Indexes:** `transaction_id` UNIQUE

---

### `savings_goals`

Financial savings targets linked to an account. Created in migration `20260220003`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `account_id` | UUID | No | — | FK → `accounts.id` ON DELETE CASCADE; `currentBalance` of this account is the goal's `currentAmount` |
| `name` | VARCHAR(255) | No | — | Goal display name |
| `target_amount` | DECIMAL(15,2) | No | — | Target balance to reach |
| `target_date` | DATE | Yes | `NULL` | Optional target completion date (YYYY-MM-DD) |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

**Indexes:** `user_id`

---

### `simplefin_connections`

SimpleFIN Bridge integration per user. Created in migration `20260220012`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE; UNIQUE (one connection per user) |
| `access_url_encrypted` | TEXT | No | — | AES-256-GCM encrypted SimpleFIN access URL |
| `last_sync_at` | DATETIME | Yes | `NULL` | Timestamp of last completed sync attempt |
| `last_sync_status` | ENUM | Yes | `NULL` | `'success'` \| `'error'` \| `'pending'` |
| `last_sync_error` | TEXT | Yes | `NULL` | Error message from last failed sync |
| `auto_sync_enabled` | BOOLEAN | No | `false` | Whether the scheduler should auto-sync this connection |
| `auto_sync_interval_hours` | TINYINT UNSIGNED | No | `24` | Sync interval: 1, 2, 4, 6, 8, 12, or 24 hours |
| `auto_sync_window_start` | TINYINT UNSIGNED | No | `0` | Start of sync window (hour 0–23) |
| `auto_sync_window_end` | TINYINT UNSIGNED | No | `23` | End of sync window (hour 0–23) |
| `discarded_ids_json` | TEXT | Yes | `NULL` | JSON array of SimpleFIN tx IDs the user explicitly discarded; prevents re-flagging on resync |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

---

### `simplefin_account_mappings`

Maps SimpleFIN external account identifiers to local BudgetApp accounts. Created in migration `20260220013`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `simplefin_account_id` | VARCHAR(255) | No | — | SimpleFIN's unique account identifier |
| `simplefin_org_name` | VARCHAR(255) | No | — | Bank/institution name from SimpleFIN |
| `simplefin_account_name` | VARCHAR(255) | No | — | Account name as reported by SimpleFIN |
| `simplefin_account_type` | VARCHAR(100) | No | — | Account type string from SimpleFIN |
| `local_account_id` | UUID | Yes | `NULL` | FK → `accounts.id`; `NULL` = unmapped (pending user action) |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

**Indexes:** `user_id`, `(user_id, simplefin_account_id)` UNIQUE

---

### `simplefin_pending_reviews`

Probable duplicate transactions flagged for user review. Created in migrations `20260220014` and `20260220015`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `simplefin_transaction_id` | VARCHAR(255) | No | — | SimpleFIN transaction ID that triggered the review |
| `raw_data_encrypted` | TEXT | No | — | AES-256-GCM encrypted SimpleFIN transaction JSON |
| `candidate_transaction_id` | UUID | Yes | `NULL` | FK → `transactions.id`; the existing transaction the import was matched against |
| `local_account_id` | UUID | Yes | `NULL` | FK → `accounts.id`; the account this import belongs to *(added 20260220015)* |
| `similarity_score` | DECIMAL(4,3) | No | — | Levenshtein similarity score (0.0–1.0) |
| `created_at` | TIMESTAMP | No | `NOW()` | |

**Indexes:** `user_id`

---

### `exchange_rates`

Cached currency exchange rates fetched from Frankfurter/ECB API. Created in migration `20260223004`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `from_currency` | VARCHAR(3) | No | — | ISO 4217 source currency code |
| `to_currency` | VARCHAR(3) | No | — | ISO 4217 target currency code |
| `rate` | DECIMAL(18,8) | No | — | Exchange rate: 1 `from_currency` = `rate` `to_currency` |
| `fetched_date` | DATE | No | — | Date the rate was fetched (YYYY-MM-DD) |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

**Indexes:** `(from_currency, to_currency)` UNIQUE, `fetched_date`

**Notes:** Rate considered stale if `fetched_date < today`. Refreshed daily on demand.

---

### `budget_lines`

Forward-looking planned income and expense items with embedded recurrence schedules. Created in migration `20260223005`.

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | `UUID()` | Primary key |
| `user_id` | UUID | No | — | FK → `users.id` ON DELETE CASCADE |
| `name` | VARCHAR(100) | No | — | Display name |
| `classification` | ENUM | No | — | `'income'` \| `'expense'` |
| `flexibility` | ENUM | No | — | `'fixed'` (predictable) \| `'flexible'` (discretionary) |
| `category_id` | UUID | No | — | FK → `categories.id` ON DELETE RESTRICT; must be a top-level Category (`parent_id IS NULL`) |
| `subcategory_id` | UUID | Yes | `NULL` | FK → `categories.id` ON DELETE SET NULL; must be a direct child of `category_id` |
| `amount` | DECIMAL(15,2) | No | — | Amount per single occurrence (always positive) |
| `frequency` | ENUM | No | `'monthly'` | `'weekly'` \| `'biweekly'` \| `'semi_monthly'` \| `'monthly'` \| `'every_n_days'` \| `'annually'` \| `'one_time'` |
| `frequency_interval` | INT | Yes | `NULL` | Number of days between occurrences; only used when `frequency = 'every_n_days'` |
| `anchor_date` | DATE | No | — | First/next known occurrence date; establishes the recurrence cycle (YYYY-MM-DD) |
| `is_pay_period_anchor` | BOOLEAN | No | `false` | At most one income Budget Line per user may have this set; drives "This Pay Period" view |
| `is_active` | BOOLEAN | No | `true` | Soft-delete flag |
| `notes` | VARCHAR(255) | Yes | `NULL` | Optional notes |
| `created_at` | TIMESTAMP | No | `NOW()` | |
| `updated_at` | TIMESTAMP | No | `NOW()` | Auto-updated |

**Indexes:** `user_id`, `category_id`, `subcategory_id`, `(user_id, is_pay_period_anchor)`

**Proration formula:**
```
annualAmount = toAnnual(amount, frequency)
proratedAmount = annualAmount × (daysInWindow / 365)

toAnnual multipliers:
  weekly:        × 52
  biweekly:      × 26
  semi_monthly:  × 24
  monthly:       × 12
  every_n_days:  × (365 / frequency_interval)
  annually:      × 1
  one_time:      full amount only if anchor_date falls in the view window, else 0
```

---

## IndexedDB Schema

Client-side offline storage implemented with Dexie 4. Populated by the sync engine from `GET /api/v1/sync`. Sensitive fields in `pendingMutations` are AES-256-GCM encrypted at queue time using the PRF-derived key.

| Table | Key | Fields | Description |
|-------|-----|--------|-------------|
| `accounts` | `id` | `id, userId, name, type, isAsset, currentBalance, currency, ...` | Mirror of server `accounts` |
| `transactions` | `id` | `id, userId, accountId, amount, description, payee, notes, date, categoryId, ...` | Mirror of server `transactions` (decrypted — note: stored in plaintext in IndexedDB; access requires PRF key) |
| `categories` | `id` | `id, userId, name, color, icon, isIncome, parentId, isActive` | Mirror of server `categories` |
| `budgets` | `id` | `id, userId, name, startDate, endDate, isActive` | Mirror of server `budgets` |
| `budgetCategories` | `id` | `id, budgetId, categoryId, allocatedAmount` | Mirror of server `budget_categories` |
| `savingsGoals` | `id` | `id, userId, accountId, name, targetAmount, targetDate` | Mirror of server `savings_goals` |
| `pendingMutations` | `id` | `id, method, url, body, bodyEncrypted, createdAt` | Offline write queue; `body` is AES-256-GCM encrypted JSON when PRF key is available; `bodyEncrypted: true` flag signals the push engine to decrypt before sending |
| `syncMeta` | `key` | `key, value` | Key-value store; `lastSyncAt` holds the ISO 8601 timestamp used as cursor for delta syncs |

**Note:** `budget_lines` are not yet in the Dexie schema (offline Budget View support deferred to Phase 10+).
