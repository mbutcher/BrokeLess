# PRD: SimpleFIN Bank Sync Integration

**Version:** 1.0
**Status:** Shipped — Phase 5
**Last updated:** 2026-02-24

---

## Problem Statement

Manually entering every transaction is time-consuming and error-prone. Users who bank at institutions supported by SimpleFIN Bridge should be able to import transactions automatically, with intelligent deduplication to prevent double-counting between manual entries and bank imports.

---

## Goals

- Allow users to connect a SimpleFIN Bridge account with a one-time setup token
- Automatically import transactions and update account balances from SimpleFIN
- Intelligently deduplicate imports against manually-entered transactions
- Surface probable duplicates for user review (accept, merge, or discard)
- Map SimpleFIN accounts to local BudgetApp accounts before importing
- Support configurable auto-sync scheduling to control when bank syncs occur

## Non-Goals

- Direct bank API integration (SimpleFIN Bridge is the abstraction layer)
- OFX/QFX file import
- Automatic category assignment from imported transactions
- Multi-SimpleFIN-connection per user

---

## Functional Requirements

### 5.1 Connection Setup

- User obtains a one-time setup token from SimpleFIN Bridge
- `POST /simplefin/connect` exchanges the token for an access URL via SimpleFIN's claim endpoint
- Access URL stored AES-256-GCM encrypted in `simplefin_connections`
- `DELETE /simplefin/disconnect` clears the connection and all associated mappings
- Settings → Integrations page shows connection status; Setup Instructions card with 4-step guide and 2FA advisory

### 5.2 Transaction Import

- `simplefinService.sync(userId)` fetches all accounts and transactions from the SimpleFIN access URL
- For each SimpleFIN account that is mapped to a local account: balance updated, transactions imported
- Imported transactions go through the same encryption pipeline as manual entries
- SimpleFIN transaction ID (`simplefin_transaction_id`) stored for primary-key deduplication on subsequent syncs

### 5.3 Deduplication Logic

Two-pass deduplication on each sync:

1. **Primary key dedup:** If `simplefin_transaction_id` already exists in `transactions`, skip
2. **Fuzzy match:** For transactions without an exact ID match, run Levenshtein similarity against existing transactions with the same amount (within $0.01) and date (within ±3 days). Similarity ≥ 0.70 → flag as pending review

**Pending review resolution:**
- `accept` — import the SimpleFIN transaction as a new record
- `merge` — mark an existing local transaction as the canonical record; discard the import
- `discard` — reject the import permanently; add its ID to `discarded_ids_json` to prevent re-flagging

### 5.4 Account Mapping

- New SimpleFIN accounts (no existing mapping) surface on the Imports page as "Unmapped Accounts"
- User must map each account before transactions from it are imported:
  - **Create:** Create a new BudgetApp account pre-filled with SimpleFIN account metadata
  - **Link:** Link to an existing BudgetApp account
- Auto-type detection: SimpleFIN type string + account name → best-guess BudgetApp `type`

### 5.5 Sync Scheduling

- `node-cron` scheduler polls every 15 minutes
- Per-user configurable settings:
  - `auto_sync_enabled`: on/off
  - `auto_sync_interval_hours`: 1, 2, 4, 6, 8, 12, or 24 hours
  - `auto_sync_window_start` / `auto_sync_window_end`: hour range (0–23) during which syncs are permitted
- Sync window bounds bank 2FA prompts to a predictable time window
- Manual sync: "Sync Now" button on the Imports page triggers immediate sync regardless of schedule

### 5.6 Imports Page

- **Unmapped Accounts section:** SimpleFIN accounts without a local mapping; action buttons for Create/Link
- **Pending Reviews section:** Side-by-side view of SimpleFIN import vs. existing local transaction; similarity % shown; Accept/Merge/Discard actions
- **Sync History:** Last sync timestamp, status (success/error), error message if applicable
- **Nav badge:** Count of unmapped accounts + pending reviews shown in sidebar

---

## Data Model

Key tables: [`simplefin_connections`](../planning/database-schema.md#simplefin_connections), [`simplefin_account_mappings`](../planning/database-schema.md#simplefin_account_mappings), [`simplefin_pending_reviews`](../planning/database-schema.md#simplefin_pending_reviews)

Also uses: `accounts` (`simplefin_account_id` column), `transactions` (`simplefin_transaction_id` column)

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/simplefin/connect` | Required | Exchange setup token for access URL |
| DELETE | `/api/v1/simplefin/disconnect` | Required | Remove SimpleFIN connection |
| GET | `/api/v1/simplefin/connection` | Required | Get current connection status and settings |
| POST | `/api/v1/simplefin/sync` | Required | Trigger an immediate sync |
| GET | `/api/v1/simplefin/imports` | Required | Get unmapped accounts and pending reviews |
| POST | `/api/v1/simplefin/accounts/:id/map` | Required | Map a SimpleFIN account (create or link) |
| GET | `/api/v1/simplefin/pending-reviews` | Required | List pending review items |
| POST | `/api/v1/simplefin/pending-reviews/:id/resolve` | Required | Resolve a pending review (accept/merge/discard) |
| PATCH | `/api/v1/simplefin/schedule` | Required | Update auto-sync schedule settings |

---

## UI/UX Requirements

- **Settings → Integrations:** Connect/disconnect button; connection status; auto-sync toggle with interval and window selectors; Setup Instructions card
- **Imports page:** Three sections: Unmapped Accounts, Pending Reviews, Sync History; "Sync Now" button in header
- **Pending review card:** Side-by-side layout — left: SimpleFIN data (payee, amount, date, account); right: matched local transaction; similarity score badge; Accept / Merge / Discard action buttons
- **Nav badge:** Orange count badge on sidebar nav item when reviews or unmapped accounts exist

---

## Security Requirements

- SimpleFIN access URL encrypted AES-256-GCM at rest; never returned in API responses
- Imported transaction `raw_data` in `simplefin_pending_reviews` encrypted AES-256-GCM
- All SimpleFIN routes behind `authenticate` middleware; scoped to `req.user.id`
- Sync runs in server-side process; SimpleFIN access URL decrypted only at sync time

---

## Acceptance Criteria

- [x] Setup token exchange creates connection; access URL stored encrypted
- [x] Manual sync imports transactions and updates account balances
- [x] Exact `simplefin_transaction_id` duplicates are skipped
- [x] Fuzzy matches (≥ 0.70 similarity, same amount ±$0.01, ±3 days) flagged for review
- [x] Discarded IDs stored in JSON; not re-flagged on subsequent syncs
- [x] Account mapping workflow (create + link) works end-to-end
- [x] Auto-sync schedule honoured by `node-cron` scheduler
- [x] Sync window prevents syncs outside the configured hour range

---

## Known Limitations / Future Work

- Only one SimpleFIN connection per user
- No automatic category assignment on import
- SimpleFIN access URL validity is not verified until the first sync; a bad token won't surface until sync time
- `discarded_ids_json` is a TEXT JSON array — will grow unboundedly for heavy discard users; a dedicated table is a future improvement
- Sync history is limited to the last sync status; full history log not stored
