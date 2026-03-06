# PRD — Phase 10: Multi-User Household Support

**Version:** v0.3
**Priority:** High
**Scope:** Large
**Status:** Ready for development
**Build order:** Backend (10.1) runs in parallel with Phases 1–3; Frontend (10.2) wired up after Phase 2

---

## Overview

Add multi-user household support to BudgetApp. A single deployment serves one household. The first user to register creates the household; thereafter registration is locked and new members are added directly by the household owner. Users can share individual accounts with other household members at configurable access levels. Categories become household-wide (migrated from per-user).

---

## Problem Statement

BudgetApp is currently strictly single-user. Partners or family members who share finances must choose one account or run two separate deployments. The architecture requires a foundational multi-user data model before household-level features (shared budgets, combined reporting) can be built.

---

## Goals

- First user registers → creates household → others invited by owner (no public sign-up)
- Per-account sharing with `view` or `write` access level per member
- Categories become household-wide (migration from per-user)
- UI for household management: member list, add member, remove member, account sharing controls
- All existing single-user queries continue to return correct results

## Non-Goals

- Multiple households per deployment
- Email invitation flow (owner sets member password directly)
- Per-user category overrides (categories are fully shared)
- Role-based budget line ownership

---

## User Stories

1. As the first user to deploy BudgetApp, I register normally and am prompted to set up my household name.
2. As the household owner, I can add family members by creating accounts for them (name, email, password).
3. As the household owner, I can grant a member View or Write access to specific accounts.
4. As a household member, I can log in and see accounts shared with me; I can add transactions to Write-access accounts.
5. As the household owner, I can remove a member — their access to all shared accounts is revoked.
6. As a non-owner member, attempting to register via `/register` returns 403.

---

## Functional Requirements

### 10.1 Backend: Data Model & API

#### New Tables

**`households`**
```sql
CREATE TABLE households (
  id          CHAR(36)     NOT NULL PRIMARY KEY,
  name        VARCHAR(255) NOT NULL,
  created_at  DATETIME     NOT NULL,
  updated_at  DATETIME     NOT NULL
);
```

**`household_members`**
```sql
CREATE TABLE household_members (
  id           CHAR(36)                    NOT NULL PRIMARY KEY,
  household_id CHAR(36)                    NOT NULL,
  user_id      CHAR(36)                    NOT NULL UNIQUE,
  role         ENUM('owner', 'member')     NOT NULL DEFAULT 'member',
  joined_at    DATETIME                    NOT NULL,
  CONSTRAINT fk_hm_household FOREIGN KEY (household_id) REFERENCES households(id),
  CONSTRAINT fk_hm_user      FOREIGN KEY (user_id)      REFERENCES users(id) ON DELETE CASCADE
);
```

**`account_shares`**
```sql
CREATE TABLE account_shares (
  id                  CHAR(36)                   NOT NULL PRIMARY KEY,
  account_id          CHAR(36)                   NOT NULL,
  shared_with_user_id CHAR(36)                   NOT NULL,
  access_level        ENUM('view', 'write')      NOT NULL,
  created_at          DATETIME                   NOT NULL,
  CONSTRAINT fk_as_account FOREIGN KEY (account_id)          REFERENCES accounts(id) ON DELETE CASCADE,
  CONSTRAINT fk_as_user    FOREIGN KEY (shared_with_user_id) REFERENCES users(id)    ON DELETE CASCADE,
  UNIQUE KEY uq_account_shares (account_id, shared_with_user_id)
);
```

#### Modified Tables

**`categories`** — migrate from per-user to per-household:
```sql
ALTER TABLE categories
  DROP FOREIGN KEY fk_categories_user,    -- existing user_id FK
  DROP COLUMN user_id,
  ADD COLUMN household_id CHAR(36) NOT NULL,
  ADD CONSTRAINT fk_categories_household
    FOREIGN KEY (household_id) REFERENCES households(id);
```

Data migration: for the existing single user's categories, set `household_id = <their household id>` (created during the migration from seed/existing data — see migration notes below).

**Migration strategy for existing single-user deployments:**
1. Create a household record: `INSERT INTO households (id, name) VALUES (uuid(), 'My Household')`
2. Create a `household_members` record for each existing user: `INSERT INTO household_members ...`
3. Set `categories.household_id` for all existing categories to the new household ID
4. Set the first user's `household_members.role = 'owner'`

This migration must be idempotent and safe to run on databases with zero or one user.

#### Registration Guard

In `authService.register()`:
```ts
const householdCount = await knex('households').count('id as count').first();
if (Number(householdCount.count) > 0) {
  throw new ForbiddenError('Registration is closed. Contact your household owner to be added.');
}
```

After successful registration: the response includes `householdSetupRequired: true` on the user object (flag stored in `users` table or derived from absence of household_members record).

New column on `users`: `household_setup_complete BOOLEAN NOT NULL DEFAULT FALSE` — set to `TRUE` after household setup endpoint is called.

#### New Endpoints

**Registration status (unauthenticated):**
```
GET /api/v1/auth/registration-status
Response: { "registrationOpen": boolean }
```
Queries `SELECT COUNT(*) FROM households`. No auth required.

**Household setup (first user only):**
```
POST /api/v1/household/setup
Auth: JWT (authenticated user)
Body: { "name": "Smith Family" }
Response: { household: HouseholdDto }
```
Guard: requesting user must not already belong to a household. Creates household, adds user as owner, migrates their categories to household_id, sets `household_setup_complete = true`.

**Household info:**
```
GET /api/v1/household
Auth: JWT (any household member)
Response: { household: HouseholdDto, members: HouseholdMemberDto[] }
```

**Rename household:**
```
PATCH /api/v1/household
Auth: owner only
Body: { "name": "Updated Name" }
```

**Add member:**
```
POST /api/v1/household/members
Auth: owner only
Body: {
  "displayName": "Jane Smith",
  "email": "jane@example.com",
  "password": "temporaryPass123",
  "accountShares": [
    { "accountId": "uuid", "accessLevel": "write" }
  ]
}
```
Creates a new user account, adds them to the household, creates `account_shares` records.

**Remove member:**
```
DELETE /api/v1/household/members/:userId
Auth: owner only
```
Deletes `account_shares` for the user, deletes `household_members` record, sets `users.active = false` (soft-delete — no data deletion).

**List account shares:**
```
GET /api/v1/accounts/:id/shares
Auth: account owner only
Response: { shares: AccountShareDto[] }
```

**Bulk replace account shares:**
```
PUT /api/v1/accounts/:id/shares
Auth: account owner only
Body: { shares: [{ "userId": "uuid", "accessLevel": "view" | "write" }] }
```
Replaces all existing shares for the account.

**Update one share:**
```
PATCH /api/v1/accounts/:id/shares/:userId
Auth: account owner only
Body: { "accessLevel": "view" | "write" }
```

#### New Middleware

`requireHouseholdRole(role: 'owner' | 'member')`:
- Validates JWT as usual
- Queries `household_members` to verify user belongs to a household with the required role
- 403 if not

#### Query Changes

All account-scoped repository queries updated to include shared accounts:
```sql
WHERE (a.user_id = :userId OR EXISTS (
  SELECT 1 FROM account_shares s
  WHERE s.account_id = a.id AND s.shared_with_user_id = :userId
))
```

Write mutations on shared accounts additionally verify `access_level = 'write'`:
```sql
AND EXISTS (
  SELECT 1 FROM account_shares s
  WHERE s.account_id = a.id AND s.shared_with_user_id = :userId AND s.access_level = 'write'
)
```

Category queries switch from `WHERE c.user_id = :userId` to `WHERE c.household_id = :householdId`. Middleware attaches `req.user.householdId` after auth.

### 10.2 Frontend: Household UI

#### First-Run Setup Flow

- `AuthInitializer` checks `user.householdSetupRequired === true`
- Redirects to `/setup` (HouseholdSetupPage) before any other navigation
- `HouseholdSetupPage`: single input for household name + submit button
- On success: flag cleared on user object; redirect to dashboard

#### Login Page

- On mount: `GET /api/v1/auth/registration-status`
- If `registrationOpen: true`: show "Get Started" / register link
- If `registrationOpen: false`: hide sign-up link entirely

#### Settings → Household (New Page)

Route: `/settings/household`

Contents:
- **Household name card**: editable by owner only (shows name, edit button)
- **Members card**: table of members (name, email, role, joined date); owner sees "Add Member" and "Remove" buttons
- **Add Member dialog**:
  - Fields: Display name, Email, Temporary password, Account access (per-account grid: None / View / Write)
  - "Select All View" and "Select All Write" quick-set buttons
  - Submit: calls `POST /api/v1/household/members`
- **Remove member confirmation dialog**: "This will revoke all account access. The account will be deactivated."

#### Account Sharing UI

**AccountCard** (in AccountsPage):
- Shared accounts show a "Shared" badge + owner's display name (for member view)
- Account owner sees a Share icon in the action menu → AccountShareDialog

**AccountShareDialog** (per-account):
- Table of household members with access level selector: None / View / Write
- Save calls `PUT /api/v1/accounts/:id/shares`

**AccountsPage grouping** (for members):
- "My Accounts" section (accounts owned by this user)
- "Shared with Me" section (accounts shared to this user)

#### Shared Data Visibility

- **TransactionsPage**: transactions on shared accounts visible; "Owner: [name]" shown on shared account rows
- **Categories**: fetched by `GET /api/v1/categories` which now returns household-wide categories (no per-user filtering change needed — just the backend query change)
- **Budget lines**: per-user (unchanged for now)

---

## Technical Requirements

### Migration

New migration: `20260305001_multi_user_household_support.ts`
- Creates `households`, `household_members`, `account_shares` tables
- Migrates `categories.user_id → household_id`
- Data migration for existing single-user deployments (see strategy above)
- Must be safe to run on empty databases (COUNT check before data migration)

### New Files

| File | Purpose |
|------|---------|
| `backend/src/controllers/household/householdController.ts` | Household CRUD + members |
| `backend/src/services/household/householdService.ts` | Business logic |
| `backend/src/repositories/householdRepository.ts` | DB queries |
| `backend/src/repositories/accountSharesRepository.ts` | Shares CRUD |
| `backend/src/middleware/requireHouseholdRole.ts` | Role guard middleware |
| `backend/src/routes/household.ts` | Route definitions |
| `backend/src/controllers/accounts/accountSharesController.ts` | Shares endpoints |
| `frontend/src/features/household/pages/HouseholdSetupPage.tsx` | First-run setup |
| `frontend/src/features/household/pages/HouseholdSettingsPage.tsx` | /settings/household |
| `frontend/src/features/household/components/AddMemberDialog.tsx` | Add member UI |
| `frontend/src/features/household/components/AccountShareDialog.tsx` | Per-account sharing |
| `frontend/src/features/household/hooks/useHousehold.ts` | TanStack Query hooks |
| `frontend/src/features/household/api/householdApi.ts` | API calls |
| `docs/openapi/paths/household.yaml` | OpenAPI spec |

### Modified Files

| File | Change |
|------|--------|
| `backend/src/services/auth/authService.ts` | Registration guard |
| `backend/src/repositories/accountRepository.ts` | Shared account queries |
| `backend/src/repositories/categoryRepository.ts` | household_id filter |
| `backend/src/middleware/authenticate.ts` | Attach `householdId` to req.user |
| `backend/src/routes/index.ts` | Mount household + registration-status routes |
| `frontend/src/app/AuthInitializer.tsx` | Check householdSetupRequired |
| `frontend/src/features/auth/pages/LoginPage.tsx` | Registration status check |
| `frontend/src/app/router.tsx` | Add /setup and /settings/household routes |
| `frontend/src/features/accounts/pages/AccountsPage.tsx` | Shared sections grouping |
| `frontend/src/features/accounts/components/AccountCard.tsx` | Shared badge |

### i18n Keys (all 3 locales)

```json
"household": {
  "setup": {
    "title": "Create Your Household",
    "subtitle": "Give your household a name to get started.",
    "namePlaceholder": "e.g. Smith Family",
    "submitButton": "Create Household"
  },
  "settings": {
    "title": "Household",
    "nameLabel": "Household Name",
    "membersTitle": "Members",
    "addMemberButton": "Add Member",
    "roleOwner": "Owner",
    "roleMember": "Member",
    "removeButton": "Remove",
    "removeConfirmTitle": "Remove Member",
    "removeConfirmBody": "This will revoke all account access and deactivate this account.",
    "addMember": {
      "title": "Add Member",
      "displayNameLabel": "Display Name",
      "emailLabel": "Email",
      "passwordLabel": "Temporary Password",
      "accountAccessTitle": "Account Access",
      "selectAllView": "All View",
      "selectAllWrite": "All Write",
      "accessNone": "None",
      "accessView": "View",
      "accessWrite": "Write"
    }
  },
  "sharedBadge": "Shared",
  "sharedWith": "Owner: {{name}}",
  "myAccounts": "My Accounts",
  "sharedWithMe": "Shared with Me"
},
"auth": {
  "registrationClosed": "Registration is closed. Contact your household owner to be added.",
  "getStarted": "Get Started"
}
```

---

## Acceptance Criteria

| # | Criterion |
|---|-----------|
| AC-1 | Fresh deployment: `GET /registration-status` returns `{ registrationOpen: true }` |
| AC-2 | First user registers and is redirected to `/setup`; enters household name and proceeds to dashboard |
| AC-3 | After household created: `/register` returns 403; login page shows no sign-up link |
| AC-4 | Owner can add a member with View on account A and Write on account B |
| AC-5 | Member logs in and sees accounts A and B |
| AC-6 | Member can add transactions to account B (Write access) |
| AC-7 | Member cannot add/edit transactions on account A (View access) — receives 403 |
| AC-8 | Owner removes member: `account_shares` cleaned up; member account deactivated; member cannot log in |
| AC-9 | Existing single-user data unaffected — all own-data queries return correct results |
| AC-10 | Categories are household-wide — both owner and member see the same category list |
| AC-11 | AccountsPage groups "My Accounts" and "Shared with Me" for members |
| AC-12 | AccountShareDialog correctly saves and updates per-account share configurations |
| AC-13 | Data migration runs cleanly on an existing single-user database |
| AC-14 | Data migration runs cleanly on an empty database |
| AC-15 | OpenAPI spec covers all new household and account-shares endpoints |

---

## Dependencies

- Phases 1–3 (Storybook, Theme, Dashboard) — frontend wired up after Phase 2 completion
- Existing auth middleware and user session infrastructure
- `categories` table with existing `user_id` column (to be migrated)

## Out of Scope

- Multiple households per deployment
- Email invitation flow
- Per-member budget line ownership
- Shared savings goals
- Household-level reporting (combined income/expense across all members)
