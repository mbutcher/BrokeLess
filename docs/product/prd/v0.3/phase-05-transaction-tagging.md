# PRD — Phase 5: Transaction Tagging

**Version:** v0.3
**Priority:** Medium
**Scope:** Small
**Status:** Ready for development

---

## Overview

Allow users to attach freeform tags to transactions for cross-category grouping (e.g., "vacation", "home reno"). Tags are orthogonal to the category hierarchy — a vacation restaurant transaction can be tagged "vacation" while still categorised as "Dining Out". Tags are stored in a simple join table, exposed in TransactionForm with autocomplete, filterable in TransactionsPage, and summarised in a Tags report. Completing this phase also unlocks the TagSummaryWidget from Phase 3.

---

## Problem Statement

Users running multi-category projects (vacations, renovations, events) have no way to see all spending associated with that project without exporting and filtering manually. The category tree handles budget classification; tags handle ad-hoc grouping without polluting the category hierarchy.

---

## Goals

- Add `transaction_tags` table (join table: transaction_id + tag string)
- Tag input on TransactionForm with autocomplete from existing tags
- Filter by tag in TransactionsPage filter bar
- Backend endpoint for tag-filtered transaction queries
- Tag summary report: total spend per tag for a date range
- Unlock TagSummaryWidget in the widget registry

## Non-Goals

- Tag colour assignment or icons
- Hierarchical tags / tag groups
- Auto-tagging rules
- Tag management page (rename, delete all instances of a tag)

---

## User Stories

1. As a user adding or editing a transaction, I can type a tag (e.g., "vacation") in a tag input and have it saved, so I can associate that transaction with a project.
2. As a user, the tag input autocompletes from tags I've used before, so I don't have to remember exact spellings.
3. As a user, I can filter my Transactions page by tag, so I can see all spending for a specific project in one list.
4. As a user, I can view a Tag Summary report showing total spend per tag for a date range, so I can see the full cost of a project.
5. As a user, I can add the TagSummaryWidget to my dashboard after this phase ships.

---

## Functional Requirements

### 5.1 Data Model

#### New Table: `transaction_tags`

```sql
CREATE TABLE transaction_tags (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  transaction_id CHAR(36)  NOT NULL,
  tag         VARCHAR(100) NOT NULL,
  created_at  DATETIME     NOT NULL,
  CONSTRAINT fk_transaction_tags_transaction
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
  INDEX idx_transaction_tags_transaction (transaction_id),
  INDEX idx_transaction_tags_tag (tag)
);
```

Tag constraints:
- Lowercase, trimmed on write (normalised at the API layer — `tag.toLowerCase().trim()`)
- Max 100 characters
- A transaction may have 0–20 tags
- Tags are plaintext (not encrypted — they are user-chosen labels, not PII)

### 5.2 Backend

#### Endpoints

**Get all tags for autocomplete:**
```
GET /api/v1/tags
  Response: { "status": "success", "data": ["vacation", "home reno", ...] }
  Returns distinct tag values for the authenticated user, sorted alphabetically
```

**Tag filter on transactions:**
```
GET /api/v1/transactions?tag=vacation&start=&end=&...
  Existing endpoint gains an optional `tag` query param
  Filters to transactions that have that tag
```

**Tag summary report:**
```
GET /api/v1/reports/tags?start=YYYY-MM-DD&end=YYYY-MM-DD
  Response: {
    "status": "success",
    "data": [
      { "tag": "vacation", "total": 2847.50, "count": 34 },
      { "tag": "home reno", "total": 1200.00, "count": 8 }
    ]
  }
  Sorted descending by total
```

#### Transaction Create / Update

- `POST /api/v1/transactions` payload gains optional `tags: string[]`
- `PUT /api/v1/transactions/:id` payload gains optional `tags: string[]`
- On create: insert rows into `transaction_tags` after transaction insert
- On update: **replace** (delete all existing rows for transaction_id, then insert new set) — simplest correct approach

#### Transaction GET Response

Existing `GET /api/v1/transactions` and `GET /api/v1/transactions/:id` responses include `tags: string[]` field (fetched via LEFT JOIN or secondary query).

#### Repository

New `transactionTagsRepository.ts`:
- `setTags(transactionId: string, tags: string[]): Promise<void>` — delete + insert
- `getTagsForTransaction(transactionId: string): Promise<string[]>`
- `getAllTags(userId: string): Promise<string[]>` — distinct tags across user's transactions
- `getTagSummary(userId: string, start: string, end: string): Promise<TagSummaryRow[]>`

### 5.3 Frontend

#### TransactionForm

- New `TagInput` component: multi-value text input that accepts comma-separated or Enter-confirmed tags
- Autocomplete: as user types, `GET /api/v1/tags` results filtered client-side
- Display: each confirmed tag as a removable chip/badge
- Validation: max 20 tags per transaction; max 100 chars per tag; non-empty after trim

#### TransactionsPage Filter Bar

- Add "Tag" filter dropdown/input to the existing filter bar
- Selecting a tag calls the transactions endpoint with `?tag=<value>`
- Filter shown in active-filters strip with a clear (×) button

#### Tag Summary Report

Route: `/reports/tags`

Layout:
```
Tag Summary
───────────────────────────────────────────
[Date Range Picker: Start] [Date Range Picker: End]  [Apply]

Tag               Total       Transactions
vacation          $2,847.50   34
home reno         $1,200.00    8
...
```

- Table view (not chart) — simple and readable
- Clicking a tag row navigates to TransactionsPage filtered by that tag + date range
- Empty state: "No tagged transactions for this period"

#### TagSummaryWidget (unlock Phase 3 gate)

- Remove `featureFlag: 'tagging'` guard from `widgetRegistry.ts` entry
- Widget becomes visible in WidgetTray and functional

---

## Technical Requirements

### Migration

New migration: `20260302001_create_transaction_tags.ts`
- Creates `transaction_tags` table as specified above

### Zod Validation

Backend route validator (`tagsValidator.ts` or inline in `transactionValidators.ts`):
- `tags` field: `z.array(z.string().min(1).max(100)).max(20).optional()`
- Normalisation applied in controller/service before insert: `tags.map(t => t.toLowerCase().trim())`

### OpenAPI

`docs/openapi/paths/transactions.yaml` — add `tags` field to transaction request/response schemas
`docs/openapi/paths/reports.yaml` — add `/tags` endpoint

### i18n Keys (all 3 locales)

```json
"transactions": {
  "tags": {
    "label": "Tags",
    "placeholder": "Add tag...",
    "noTags": "No tags"
  }
},
"reports": {
  "tags": {
    "title": "Tag Summary",
    "subtitle": "Total spend per tag for the selected period",
    "columnTag": "Tag",
    "columnTotal": "Total",
    "columnCount": "Transactions",
    "emptyState": "No tagged transactions for this period"
  }
}
```

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | Tags can be added to a new transaction and saved correctly |
| AC-2 | Tags persist through a transaction edit without duplication (replace semantics) |
| AC-3 | Tag input autocompletes from existing tags; case-insensitive match |
| AC-4 | `GET /api/v1/transactions?tag=vacation` returns only transactions with that tag |
| AC-5 | Tag filter in TransactionsPage filter bar works and shows active-filter chip |
| AC-6 | Tag Summary report totals match the sum of transactions for those tags |
| AC-7 | Clicking a tag row in Tag Summary navigates to filtered TransactionsPage |
| AC-8 | TagSummaryWidget is visible in WidgetTray and displays correct data |
| AC-9 | Tags are normalised to lowercase/trimmed on save |
| AC-10 | `GET /api/v1/tags` returns distinct tags for the user |
| AC-11 | Deleting a transaction cascades to `transaction_tags` (no orphan rows) |
| AC-12 | OpenAPI spec updated for transaction payloads and new reports/tags endpoint |

---

## Dependencies

- Phase 3 (Dashboard Widgets) — TagSummaryWidget registered but gated; this phase unlocks it

## Out of Scope

- Tag management UI (rename, bulk-delete a tag)
- Tag-based budgeting rules
- Tags on budget lines (transaction-level only)
