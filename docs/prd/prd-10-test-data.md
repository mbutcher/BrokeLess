# PRD: Development & Test Data Infrastructure

**Version:** 1.0
**Status:** Shipped — Phase 10 (2026-02-24)
**Last updated:** 2026-02-24

---

## Problem Statement

The application had no automated test data. Every developer bootstrapping the project had to manually create accounts, categories, transactions, and budget lines before any UI work could begin. There was no consistent baseline dataset for:

- Visual development and UI testing
- Backend integration tests that require a populated database
- Demonstrating features to stakeholders
- Regression testing against realistic, varied data

---

## Goals

- A single `npm run seed` command that populates the entire database with realistic, comprehensive test data
- Two test users covering different locales, currencies, and financial profiles
- Data coverage across every entity type: accounts (all types), categories (full hierarchy), budget lines (all 7 frequency types), transactions (6 months of history), savings goals, debt schedules, transaction splits, and transfer links
- Environment guard: the seed **refuses to run** in `production` or `staging`
- `seed:fresh` — full database reset (rollback all migrations → re-migrate → seed)
- Seed is idempotent: running it twice truncates and re-inserts cleanly
- All seeded IDs are deterministic (stable across runs for external references)

## Non-Goals

- Automated test fixtures for unit tests (Jest mocks suffice; unit tests should not need a real DB)
- Frontend seeding (test data lives entirely in the backend database)
- SimpleFIN connection data (requires live OAuth tokens)
- Exchange rate data (populated by a scheduled cron job)
- WebAuthn passkeys or TOTP setup for test users (not required for development workflows)

---

## Test Users

| Field | Alpha | Beta |
|-------|-------|------|
| Email | `alpha@test.local` | `beta@test.local` |
| Password | `test123` | `test123` |
| Currency | CAD | USD |
| Locale | en-CA | en-US |
| Date format | DD/MM/YYYY | MM/DD/YYYY |
| Time format | 12h | 12h |
| Timezone | America/Toronto | America/New_York |
| Pay period | Biweekly (anchor: 2026-02-18) | Semi-monthly (anchor: 2026-02-15) |

Passwords are hashed with Argon2id using the same parameters as production (`memoryCost: 65536`, `timeCost: 3`, `parallelism: 4`) plus the configured `PASSWORD_PEPPER`. All seeded user IDs are deterministic UUIDs.

---

## Functional Requirements

### Environment Guard

The seed function throws immediately if `NODE_ENV` is `production` or `staging`:

```
[dev_seed] Refusing to run in NODE_ENV="production". Seeds are only permitted in development and test environments.
```

### Test Data Coverage

#### Accounts

Alpha (CAD):
- `RBC Chequing` — checking, primary transactional account
- `RBC TFSA` — savings, 4.25% APY, linked to Vacation savings goal
- `Emergency Fund` — savings, 3.8% APY, linked to Emergency Fund savings goal
- `RBC Visa Infinite` — credit card, 19.99% APR, receives monthly payment transfers
- `Toyota Financing` — loan, 5.9% APR, linked to debt schedule, has monthly payment splits

Beta (USD):
- `Chase Total Checking` — checking, primary transactional account
- `Ally High-Yield Savings` — savings, 4.95% APY, linked to both savings goals
- `Discover It Cash Back` — credit card, 22.99% APR, receives monthly payment transfers
- `Federal Student Loan` — loan, 4.5% APR, linked to debt schedule
- `Roth IRA` — investment, Vanguard, no associated debt schedule

#### Categories

Each user gets an identical category hierarchy (13 top-level + ~40 subcategories = ~53 categories per user):

**Expense top-level:** Housing, Food & Dining, Transportation, Healthcare, Personal Care, Entertainment, Shopping, Financial, Subscriptions, Transfers, Miscellaneous

**Income top-level:** Employment, Other Income

**Housing subcategories:** Rent / Mortgage, Utilities, Internet & Phone, Home Insurance, Repairs & Maintenance

**Food & Dining subcategories:** Groceries, Restaurants, Coffee & Cafés, Fast Food, Alcohol & Bars

**Transportation subcategories:** Gas, Car Payment, Car Insurance, Parking & Tolls, Public Transit

**Healthcare subcategories:** Doctor & Dentist, Pharmacy, Gym & Fitness, Mental Health

**Personal Care subcategories:** Haircuts & Grooming, Clothing & Accessories

**Entertainment subcategories:** Streaming Services, Movies & Events, Books & Games, Hobbies & Sports

**Shopping subcategories:** Amazon & Online, Electronics, Home & Garden, Gifts & Giving

**Financial subcategories:** Credit Card Payment, Loan Payment, Banking Fees

**Subscriptions subcategories:** Software & Apps, Memberships

**Employment subcategories:** Salary & Wages, Bonus & Commission, Freelance & Contract

**Other Income subcategories:** Tax Refund, Gifts Received, Cashback & Rewards

#### Budget Lines — All 7 Frequency Types Covered

Alpha's 18 budget lines:

| Name | Frequency | Classification | Notes |
|------|-----------|----------------|-------|
| Employment Income | biweekly | income | Pay period anchor |
| Monthly Freelance | monthly | income | |
| Rent | monthly | expense | |
| Car Loan Payment | monthly | expense | |
| Hydro & Electricity | monthly | expense | flexible |
| Internet & Phone Bundle | monthly | expense | |
| Groceries | **weekly** | expense | |
| Gas | **every_n_days (10)** | expense | |
| Netflix | monthly | expense | |
| Spotify | monthly | expense | |
| Gym Membership | monthly | expense | |
| Tenant's Insurance | **annually** | expense | |
| Car Insurance | **semi_monthly** | expense | |
| Dental Checkup | annually | expense | flexible |
| Haircut | **every_n_days (42)** | expense | |
| Dining Out | monthly | expense | flexible |
| Coffee | weekly | expense | flexible |
| Holiday Gift Fund | **one_time** | expense | anchor: 2026-12-01 |

Beta's 15 budget lines cover semi_monthly income anchor, weekly groceries, every_n_days gas, monthly mortgage, annually Amazon Prime, and semi_monthly car insurance.

#### Transactions

**Alpha:** ~170 transactions spanning **Sep 1, 2025 → Feb 24, 2026** (6 months)
- 13 biweekly salary deposits
- 4 monthly freelance income deposits
- 6 monthly rent payments
- 6 car insurance × 2 (semi-monthly, 12 total)
- 6 car loan payments (each with a `transaction_split` showing principal/interest breakdown)
- Monthly recurring: gym, Netflix, Spotify, internet, hydro
- Weekly groceries and coffee runs
- Gas fill-ups every ~10 days
- Restaurant outings (2–3 per month)
- Credit card (Visa) charges: Amazon, clothing, dining, entertainment
- 6 monthly credit card payment transfers (checking → Visa, `link_type: 'payment'`)
- 1 savings transfer (checking → Emergency Fund, `link_type: 'transfer'`)
- Annual tenant's insurance payment (January)
- Notable months: Thanksgiving grocery run (November), holiday shopping (December), Valentine's Day dinner (February)

**Beta:** ~95 transactions spanning **Nov 1, 2025 → Feb 24, 2026** (4 months)
- 8 semi-monthly salary deposits
- 4 monthly freelance income deposits
- 4 monthly mortgage payments
- Monthly: Planet Fitness, student loan, car insurance × 2, Netflix, Spotify, internet, utilities
- Weekly groceries, coffee
- Gas fill-ups every ~12 days
- Restaurant outings
- Credit card (Discover) charges: Amazon, holiday gifts, Best Buy, Valentine's dinner
- 4 monthly credit card payment transfers (checking → Discover)
- 1 savings transfer (checking → Ally Savings)
- Holiday season: Black Friday (November), Christmas gifts + groceries (December)

**Transfer mechanics:** Each transfer pair has:
- `from` transaction: negative amount on source account, `is_transfer: true`
- `to` transaction: positive amount on destination account, `is_transfer: true`
- One `transaction_links` row with `link_type: 'payment'` or `'transfer'`

**Debt payment splits:** Each monthly car loan payment (Alpha) and each student loan payment (Beta) has a `transaction_splits` row with `principal_amount` and `interest_amount` (amortised correctly to reflect declining balance).

#### Savings Goals

| User | Name | Target | Target Date | Account |
|------|------|--------|-------------|---------|
| Alpha | Emergency Fund (6 months) | $15,000 | 2026-12-31 | Emergency Fund savings |
| Alpha | Summer Vacation | $3,500 | 2026-06-01 | RBC TFSA |
| Beta | House Down Payment | $50,000 | 2027-09-01 | Ally Savings |
| Beta | Emergency Fund | $20,000 | none | Ally Savings |

#### Debt Schedules

| User | Account | Principal | Rate | Term | Origination | Payment |
|------|---------|-----------|------|------|-------------|---------|
| Alpha | Toyota Financing | $28,500 | 5.9% APR | 60 months | 2024-08-01 | $548.00/mo |
| Beta | Federal Student Loan | $35,000 | 4.5% APR | 120 months | 2022-09-01 | $363.00/mo |

---

## Implementation

### File

`backend/src/database/seeds/dev_seed.ts`

Single seed file. Knex runs it via `knex seed:run`. The file:

1. Calls `assertSeedableEnvironment()` — throws if `NODE_ENV` is `production` or `staging`
2. Hashes both passwords with Argon2id (using the same options and pepper as `passwordService.ts`)
3. Encrypts and hashes both emails using `encryptionService.encrypt()` / `.hash()`
4. Disables FK checks (`SET FOREIGN_KEY_CHECKS = 0`)
5. Truncates all seed-managed tables in correct order
6. Re-enables FK checks
7. Inserts: users → accounts → categories → budget lines → savings goals → debt schedules → transactions (batched in groups of 50) → transaction links → transaction splits
8. Logs a summary with the test credentials

### Deterministic IDs

All seed rows use stable UUIDs generated by the `uid(type, seq)` helper:

```
format: 00000000-TTTT-4000-0000-SSSSSSSSSSSS
TTTT = 4-hex entity-type tag
SSSS = 12-hex sequence number
```

IDs never change across seed runs, making them safe to reference in test assertions or hardcoded fixtures.

---

## npm Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `npm run seed` | `knex seed:run` | Truncate and reload all seed data |
| `npm run seed:dev` | `knex seed:run` | Alias — explicit name for development context |
| `npm run seed:fresh` | `knex migrate:rollback --all && knex migrate:latest && knex seed:run` | Full DB reset: rollback all migrations, re-apply, then seed |

---

## Security Requirements

- Environment guard is the first statement in the `seed` export — no seed data can ever be committed to a non-development database
- `NODE_ENV` must be explicitly `development` or `test`; any other value (including undefined → defaults to `development` in dev setup) is rejected for production/staging strings specifically
- Test passwords are hashed with production-grade Argon2id parameters — not weakened for speed
- Email fields are encrypted with AES-256-GCM using the real `encryptionService` — seed produces correct ciphertext that the app can decrypt

---

## Acceptance Criteria

- [x] `npm run seed` completes in < 30 seconds on a standard dev machine
- [x] Running `npm run seed` a second time produces a clean dataset (idempotent truncate + re-insert)
- [x] `npm run seed:fresh` rolls back all migrations, re-applies them, and seeds successfully
- [x] `alpha@test.local / test123` can log in after seeding
- [x] `beta@test.local / test123` can log in after seeding
- [x] Budget View for Alpha for any month in the seeded period returns non-zero actuals
- [x] Pay period endpoint returns correct biweekly window for Alpha, semi-monthly window for Beta
- [x] All 7 budget line frequency types present in the seeded data
- [x] Transaction links table has correct transfer pairs with `link_type` set
- [x] Transaction splits table has correct principal/interest breakdown for debt payments
- [x] Seed refuses to run with a clear error when `NODE_ENV=production`

---

## Known Limitations / Future Work

- **No SimpleFIN data:** Mock SimpleFIN connections and pending reviews are not seeded; testing the SimpleFIN import flow requires a real or mocked SimpleFIN API response
- **No TOTP/WebAuthn:** Test users have 2FA disabled; testing 2FA flows requires manual setup
- **Exchange rates not seeded:** `exchange_rates` table relies on a scheduled sync job; currency conversion tests need that job to run or a separate fixture
- **Beta transaction history shorter:** Beta starts at November 2025 (4 months vs. Alpha's 6) — intentional to demonstrate different history lengths in the UI
- **Argon2id hashing at full cost:** Seeding takes ~5–8 seconds due to two full Argon2id hashes; for CI environments where speed is critical, a precomputed hash constant could be used instead (with a note that it bypasses the pepper)
