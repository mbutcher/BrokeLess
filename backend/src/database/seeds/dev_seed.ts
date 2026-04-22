/**
 * dev_seed.ts — Development & Test Data Seed
 *
 * Loads a comprehensive set of realistic test data for development and testing.
 * Covers every entity type in the schema: users, accounts, categories,
 * budget lines (all 7 frequency types), transactions (6 months), savings goals,
 * debt schedules, transaction splits, and transfer links.
 *
 * TEST USERS
 *   mike_alpha / test123  (mike+alpha@thebutchers.ca) — Canadian user, CAD, en-CA, Toronto timezone
 *   mike_beta  / test123  (mike+beta@thebutchers.ca)  — American user, USD, en-US, New York timezone
 *
 * SAFETY: Refuses to run in production. Staging is permitted so integration
 * tests can reset and reseed via the /api/admin/reset-seeds endpoint.
 */

import type { Knex } from 'knex';
import * as argon2 from 'argon2';
import { env } from '../../config/env';
import { encryptionService } from '../../services/encryption/encryptionService';
import { dialectHelper } from '../../utils/db/dialectHelper';
import { categoryService } from '../../services/core/categoryService';

// ─── Environment Guard ────────────────────────────────────────────────────────

function assertSeedableEnvironment(): void {
  if (env.nodeEnv === 'production') {
    throw new Error(
      `[dev_seed] Refusing to run in NODE_ENV="production". ` +
        `Seeds are only permitted in development, test, and staging environments.`
    );
  }
}

// ─── Password Hashing (mirrors passwordService.ts) ───────────────────────────

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

async function hashPassword(password: string): Promise<string> {
  return argon2.hash(env.password.pepper + password, ARGON2_OPTIONS);
}

// ─── Deterministic ID Helper ──────────────────────────────────────────────────
// Produces stable, recognisable UUIDs for seed rows.
// Format: 00000000-TTTT-4000-0000-SSSSSSSSSSSS
// TTTT = 4-hex entity-type tag; SSSS = 12-hex sequence.

const uid = (type: string, seq: number): string =>
  `00000000-${type}-4000-0000-${seq.toString(16).padStart(12, '0')}`;

// ─── Date Shifting ────────────────────────────────────────────────────────────
// The seed data was originally written with hard-coded dates covering
// roughly 2025-09 → 2026-02. To keep the dataset relevant as time moves on,
// every ISO date in the seed is shifted by a single offset at runtime so the
// latest transaction lands a few days before today. This preserves all
// relative date relationships (budget anchors, goal targets, transaction
// spacing) while keeping "this month" reports populated.

const ORIGINAL_DATA_END = '2026-02-24'; // newest hard-coded transaction date
const RECENCY_BUFFER_DAYS = 3; // leave a small gap between latest tx and today
const _dateOffsetMs = (() => {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const origEnd = new Date(`${ORIGINAL_DATA_END}T00:00:00Z`);
  return today.getTime() - origEnd.getTime() - RECENCY_BUFFER_DAYS * 86_400_000;
})();

/** Shift a hard-coded YYYY-MM-DD string by the global seed offset. */
function d(iso: string): string {
  const dt = new Date(`${iso}T00:00:00Z`);
  dt.setTime(dt.getTime() + _dateOffsetMs);
  return dt.toISOString().slice(0, 10);
}

// ─── Entity IDs ───────────────────────────────────────────────────────────────

// Users
const ALPHA_ID = uid('0001', 1);
const BETA_ID = uid('0001', 2);

// Households (one per user — single-user households for seed data)
const ALPHA_HH_ID = uid('0001', 3);
const BETA_HH_ID = uid('0001', 4);

// Accounts — Alpha (CAD)
const A_CHECKING = uid('0002', 1); // RBC Chequing
const A_TFSA = uid('0002', 2); // RBC TFSA
const A_EMERGENCY = uid('0002', 3); // Emergency Fund Savings
const A_VISA = uid('0002', 4); // RBC Visa Infinite
const A_CAR_LOAN = uid('0002', 5); // Toyota Financing

// Accounts — Beta (USD)
const B_CHECKING = uid('0002', 11); // Chase Total Checking
const B_SAVINGS = uid('0002', 12); // Ally High-Yield Savings
const B_DISCOVER = uid('0002', 13); // Discover It Cash Back
const B_STUDENT_LOAN = uid('0002', 14); // Federal Student Loan
const B_ROTH = uid('0002', 15); // Roth IRA (Vanguard)

// ─── Budget Line IDs ──────────────────────────────────────────────────────────

// Alpha (covers all 7 frequency types)
const A_BL_SALARY = uid('0007', 1); // biweekly  ← pay period anchor
const A_BL_FREELANCE = uid('0007', 2); // monthly
const A_BL_RENT = uid('0007', 3); // monthly
const A_BL_CAR_PMT = uid('0007', 4); // biweekly
const A_BL_HYDRO = uid('0007', 5); // monthly
const A_BL_INTERNET = uid('0007', 6); // monthly
const A_BL_GROCERIES = uid('0007', 7); // weekly
const A_BL_GAS = uid('0007', 8); // every_n_days (10)
const A_BL_NETFLIX = uid('0007', 9); // monthly
const A_BL_SPOTIFY = uid('0007', 10); // monthly
const A_BL_GYM = uid('0007', 11); // monthly
const A_BL_HOME_INS = uid('0007', 12); // annually
const A_BL_CAR_INS = uid('0007', 13); // semi_monthly
const A_BL_DENTAL = uid('0007', 14); // annually
const A_BL_HAIRCUT = uid('0007', 15); // every_n_days (42)
const A_BL_DINING = uid('0007', 16); // monthly
const A_BL_COFFEE = uid('0007', 17); // weekly
const A_BL_HOLIDAY = uid('0007', 18); // one_time

// Beta
const B_BL_SALARY = uid('0008', 1); // semi_monthly  ← pay period anchor
const B_BL_SIDE_INCOME = uid('0008', 2); // monthly
const B_BL_MORTGAGE = uid('0008', 3); // monthly
const B_BL_UTILITIES = uid('0008', 4); // monthly
const B_BL_INTERNET = uid('0008', 5); // monthly
const B_BL_GROCERIES = uid('0008', 6); // weekly
const B_BL_STUDENT_LOAN = uid('0008', 7); // monthly
const B_BL_GYM = uid('0008', 8); // monthly
const B_BL_GAS = uid('0008', 9); // every_n_days (12)
const B_BL_COFFEE = uid('0008', 10); // weekly
const B_BL_NETFLIX = uid('0008', 11); // monthly
const B_BL_SPOTIFY = uid('0008', 12); // monthly
const B_BL_AMAZON_PRIME = uid('0008', 13); // annually
const B_BL_CAR_INS = uid('0008', 14); // semi_monthly
const B_BL_DINING = uid('0008', 15); // monthly

// ─── Savings Goals & Debt IDs ─────────────────────────────────────────────────

const A_GOAL_EMERGENCY = uid('0009', 1);
const A_GOAL_VACATION = uid('0009', 2);
const B_GOAL_DOWN_PMT = uid('0009', 3);
const B_GOAL_EMERGENCY = uid('0009', 4);

const A_DEBT_CAR = uid('000a', 1);
const B_DEBT_STUDENT = uid('000a', 2);

// ─── Transaction ID Counter ───────────────────────────────────────────────────

let _txSeq = 0;
const atx = (): string => uid('000b', ++_txSeq); // alpha transaction
const btx = (): string => uid('000c', ++_txSeq); // beta transaction

// ─── Row Type Helpers ─────────────────────────────────────────────────────────

interface TxRow {
  id: string;
  user_id: string;
  account_id: string;
  amount: number;
  payee: string;
  description: string | null;
  date: string;
  budget_line_id: string | null;
  is_transfer: boolean;
  is_cleared: boolean;
}

interface LinkRow {
  id: string;
  from_transaction_id: string;
  to_transaction_id: string;
  link_type: 'transfer' | 'payment' | 'refund';
}

interface SplitRow {
  id: string;
  transaction_id: string;
  principal_amount: number;
  interest_amount: number;
}

// ─── Tables to Truncate ───────────────────────────────────────────────────────

const TRUNCATE_TABLES = [
  'transaction_splits',
  'transaction_links',
  'simplefin_pending_reviews',
  'simplefin_account_mappings',
  'simplefin_connections',
  'transactions',
  'budget_lines',
  'savings_goals',
  'debt_schedules',
  'accounts',
  'categories',
  'totp_backup_codes',
  'passkeys',
  'refresh_tokens',
  'budget_categories', // legacy
  'budgets', // legacy
  'household_members',
  'households',
  'users',
];

// ─── Transaction Builder ──────────────────────────────────────────────────────

let _linkSeq = 0;
let _splitSeq = 0;

function addTx(
  arr: TxRow[],
  id: string,
  userId: string,
  accountId: string,
  amount: number,
  payee: string,
  date: string,
  budgetLineId: string | null,
  isTransfer = false,
  isCleared = true,
  description: string | null = null
): void {
  arr.push({
    id,
    user_id: userId,
    account_id: accountId,
    amount,
    payee: encryptionService.encrypt(payee),
    description: description ? encryptionService.encrypt(description) : null,
    date: d(date),
    budget_line_id: budgetLineId,
    is_transfer: isTransfer,
    is_cleared: isCleared,
  });
}

function addTransfer(
  arr: TxRow[],
  links: LinkRow[],
  fromId: string,
  toId: string,
  fromUserId: string,
  fromAccountId: string,
  toUserId: string,
  toAccountId: string,
  amount: number,
  payee: string,
  date: string,
  linkType: 'transfer' | 'payment' = 'transfer'
): void {
  addTx(arr, fromId, fromUserId, fromAccountId, -amount, payee, date, null, true);
  addTx(arr, toId, toUserId, toAccountId, amount, payee, date, null, true);
  links.push({
    id: uid('000d', ++_linkSeq),
    from_transaction_id: fromId,
    to_transaction_id: toId,
    link_type: linkType,
  });
}

function addDebtPayment(
  arr: TxRow[],
  splits: SplitRow[],
  txId: string,
  userId: string,
  accountId: string,
  total: number,
  principal: number,
  interest: number,
  payee: string,
  date: string,
  budgetLineId: string | null
): void {
  addTx(arr, txId, userId, accountId, -total, payee, date, budgetLineId);
  splits.push({
    id: uid('000e', ++_splitSeq),
    transaction_id: txId,
    principal_amount: principal,
    interest_amount: interest,
  });
}

// ─── Seed Entry Point ─────────────────────────────────────────────────────────

export async function seed(knex: Knex): Promise<void> {
  assertSeedableEnvironment();

  // ── Hash passwords and encrypt emails ──────────────────────────────────────
  console.log('[dev_seed] Hashing passwords (Argon2id — this takes a few seconds)...');
  const [alphaHash, betaHash] = await Promise.all([
    hashPassword('test123'),
    hashPassword('test123'),
  ]);

  const alphaEmailEnc = encryptionService.encrypt('mike+alpha@thebutchers.ca');
  const alphaEmailHash = encryptionService.hash('mike+alpha@thebutchers.ca');
  const betaEmailEnc = encryptionService.encrypt('mike+beta@thebutchers.ca');
  const betaEmailHash = encryptionService.hash('mike+beta@thebutchers.ca');

  // ── Truncate all seed-managed tables ───────────────────────────────────────
  console.log('[dev_seed] Truncating tables...');
  await dialectHelper.disableForeignKeyChecks(knex);
  for (const table of TRUNCATE_TABLES) {
    await dialectHelper.truncateTable(knex, table);
  }
  await dialectHelper.enableForeignKeyChecks(knex);

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log('[dev_seed] Inserting users...');
  await knex('users').insert([
    {
      id: ALPHA_ID,
      username: 'mike_alpha',
      email_encrypted: alphaEmailEnc,
      email_hash: alphaEmailHash,
      password_hash: alphaHash,
      is_active: true,
      email_verified: true,
      totp_enabled: false,
      webauthn_enabled: false,
      failed_login_attempts: 0,
      default_currency: 'CAD',
      locale: 'en-CA',
      date_format: 'DD/MM/YYYY',
      time_format: '12h',
      timezone: 'America/Toronto',
      week_start: 'sunday',
    },
    {
      id: BETA_ID,
      username: 'mike_beta',
      email_encrypted: betaEmailEnc,
      email_hash: betaEmailHash,
      password_hash: betaHash,
      is_active: true,
      email_verified: true,
      totp_enabled: false,
      webauthn_enabled: false,
      failed_login_attempts: 0,
      default_currency: 'USD',
      locale: 'en-US',
      date_format: 'MM/DD/YYYY',
      time_format: '12h',
      timezone: 'America/New_York',
      week_start: 'sunday',
    },
  ]);

  // ── Households & Members ───────────────────────────────────────────────────
  console.log('[dev_seed] Inserting households...');
  await knex('households').insert([
    { id: ALPHA_HH_ID, name: "Mike Alpha's Household" },
    { id: BETA_HH_ID, name: "Mike Beta's Household" },
  ]);
  await knex('household_members').insert([
    {
      id: uid('000d', 1),
      household_id: ALPHA_HH_ID,
      user_id: ALPHA_ID,
      role: 'owner',
      joined_at: new Date().toISOString(),
    },
    {
      id: uid('000d', 2),
      household_id: BETA_HH_ID,
      user_id: BETA_ID,
      role: 'owner',
      joined_at: new Date().toISOString(),
    },
  ]);

  // ── Accounts ───────────────────────────────────────────────────────────────
  console.log('[dev_seed] Inserting accounts...');
  await knex('accounts').insert([
    // Alpha — CAD accounts
    {
      id: A_CHECKING,
      user_id: ALPHA_ID,
      name: 'RBC Chequing',
      type: 'checking',
      is_asset: true,
      starting_balance: 2450.0,
      current_balance: 3840.22,
      currency: 'CAD',
      color: '#3b82f6',
      institution: 'RBC Royal Bank',
      annual_rate: null,
      is_active: true,
    },
    {
      id: A_TFSA,
      user_id: ALPHA_ID,
      name: 'RBC TFSA',
      type: 'savings',
      is_asset: true,
      starting_balance: 7500.0,
      current_balance: 9200.0,
      currency: 'CAD',
      color: '#10b981',
      institution: 'RBC Royal Bank',
      annual_rate: 0.0425,
      is_active: true,
    },
    {
      id: A_EMERGENCY,
      user_id: ALPHA_ID,
      name: 'Emergency Fund',
      type: 'savings',
      is_asset: true,
      starting_balance: 5000.0,
      current_balance: 6200.0,
      currency: 'CAD',
      color: '#f59e0b',
      institution: 'RBC Royal Bank',
      annual_rate: 0.038,
      is_active: true,
    },
    {
      id: A_VISA,
      user_id: ALPHA_ID,
      name: 'RBC Visa Infinite',
      type: 'credit_card',
      is_asset: false,
      starting_balance: -2340.0,
      current_balance: -1847.33,
      currency: 'CAD',
      color: '#8b5cf6',
      institution: 'RBC Royal Bank',
      annual_rate: 0.1999,
      is_active: true,
    },
    {
      id: A_CAR_LOAN,
      user_id: ALPHA_ID,
      name: 'Toyota Financing',
      type: 'loan',
      is_asset: false,
      starting_balance: -28500.0,
      current_balance: -20850.0,
      currency: 'CAD',
      color: '#ef4444',
      institution: 'Toyota Financial Services',
      annual_rate: 0.059,
      is_active: true,
    },
    // Beta — USD accounts
    {
      id: B_CHECKING,
      user_id: BETA_ID,
      name: 'Chase Total Checking',
      type: 'checking',
      is_asset: true,
      starting_balance: 3200.0,
      current_balance: 4120.5,
      currency: 'USD',
      color: '#3b82f6',
      institution: 'Chase',
      annual_rate: null,
      is_active: true,
    },
    {
      id: B_SAVINGS,
      user_id: BETA_ID,
      name: 'Ally High-Yield Savings',
      type: 'savings',
      is_asset: true,
      starting_balance: 15000.0,
      current_balance: 18350.0,
      currency: 'USD',
      color: '#10b981',
      institution: 'Ally Bank',
      annual_rate: 0.0495,
      is_active: true,
    },
    {
      id: B_DISCOVER,
      user_id: BETA_ID,
      name: 'Discover It Cash Back',
      type: 'credit_card',
      is_asset: false,
      starting_balance: -1200.0,
      current_balance: -890.45,
      currency: 'USD',
      color: '#f97316',
      institution: 'Discover',
      annual_rate: 0.2299,
      is_active: true,
    },
    {
      id: B_STUDENT_LOAN,
      user_id: BETA_ID,
      name: 'Federal Student Loan',
      type: 'loan',
      is_asset: false,
      starting_balance: -35000.0,
      current_balance: -27150.0,
      currency: 'USD',
      color: '#ef4444',
      institution: 'Federal Student Aid',
      annual_rate: 0.045,
      is_active: true,
    },
    {
      id: B_ROTH,
      user_id: BETA_ID,
      name: 'Roth IRA',
      type: 'investment',
      is_asset: true,
      starting_balance: 10000.0,
      current_balance: 14280.0,
      currency: 'USD',
      color: '#6366f1',
      institution: 'Vanguard',
      annual_rate: null,
      is_active: true,
    },
  ]);

  // ── Categories ──────────────────────────────────────────────────────────────
  console.log('[dev_seed] Seeding categories via service...');
  await categoryService.seedDefaultsForHousehold(ALPHA_HH_ID, {
    region: 'CA',
    isFreelancer: true,
    hasPets: false,
    hasKids: false,
    isStudent: false,
  });
  await categoryService.seedDefaultsForHousehold(BETA_HH_ID, {
    region: 'US',
    isFreelancer: false,
    hasPets: false,
    hasKids: false,
    isStudent: true,
  });

  // Build category lookup maps (name → id) for each household
  type CatRow = { id: string; name: string; parent_id: string | null };
  const alphaCats = (await knex('categories')
    .where('household_id', ALPHA_HH_ID)
    .select('id', 'name', 'parent_id')) as CatRow[];
  const betaCats = (await knex('categories')
    .where('household_id', BETA_HH_ID)
    .select('id', 'name', 'parent_id')) as CatRow[];

  function catId(cats: CatRow[], name: string): string | null {
    return cats.find((c) => c.name === name)?.id ?? null;
  }

  // ── Budget Lines ───────────────────────────────────────────────────────────
  console.log('[dev_seed] Inserting budget lines...');
  await knex('budget_lines').insert([
    // ── Alpha budget lines (all 7 frequency types) ──────────────────────────
    {
      id: A_BL_SALARY,
      user_id: ALPHA_ID,
      name: 'Employment Income',
      classification: 'income',
      flexibility: 'fixed',
      category_id: catId(alphaCats, 'Earned Income'),
      subcategory_id: catId(alphaCats, 'Salary / Wages'),
      amount: 3200.0,
      frequency: 'biweekly',
      frequency_interval: null,
      anchor_date: d('2026-02-18'),
      is_pay_period_anchor: true,
      is_active: true,
      notes: 'Net pay after deductions',
    },
    {
      id: A_BL_FREELANCE,
      user_id: ALPHA_ID,
      name: 'Monthly Freelance',
      classification: 'income',
      flexibility: 'flexible',
      category_id: catId(alphaCats, 'Freelance / Self-Employment'),
      subcategory_id: catId(alphaCats, 'Client Payments'),
      amount: 850.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: A_BL_RENT,
      user_id: ALPHA_ID,
      name: 'Rent',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(alphaCats, 'Housing'),
      subcategory_id: catId(alphaCats, 'Rent / Mortgage'),
      amount: 1800.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: A_BL_CAR_PMT,
      user_id: ALPHA_ID,
      name: 'Car Loan Payment',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(alphaCats, 'Debt Payments'),
      subcategory_id: catId(alphaCats, 'Vehicle Loan'),
      amount: 548.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-15'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: 'Toyota Financing — 5.9% APR',
    },
    {
      id: A_BL_HYDRO,
      user_id: ALPHA_ID,
      name: 'Hydro & Electricity',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(alphaCats, 'Utilities'),
      subcategory_id: catId(alphaCats, 'Electricity'),
      amount: 115.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: 'Varies seasonally',
    },
    {
      id: A_BL_INTERNET,
      user_id: ALPHA_ID,
      name: 'Internet & Phone Bundle',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(alphaCats, 'Utilities'),
      subcategory_id: catId(alphaCats, 'Internet'),
      amount: 85.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-15'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: A_BL_GROCERIES,
      user_id: ALPHA_ID,
      name: 'Groceries',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(alphaCats, 'Food'),
      subcategory_id: catId(alphaCats, 'Groceries'),
      amount: 175.0,
      frequency: 'weekly',
      frequency_interval: null,
      anchor_date: d('2026-02-17'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: A_BL_GAS,
      user_id: ALPHA_ID,
      name: 'Gas',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(alphaCats, 'Transportation'),
      subcategory_id: catId(alphaCats, 'Fuel / Gas'),
      amount: 60.0,
      frequency: 'every_n_days',
      frequency_interval: 10,
      anchor_date: d('2026-02-14'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: 'Fill-up roughly every 10 days',
    },
    {
      id: A_BL_NETFLIX,
      user_id: ALPHA_ID,
      name: 'Netflix',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(alphaCats, 'Entertainment'),
      subcategory_id: catId(alphaCats, 'Streaming Services'),
      amount: 17.99,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-08'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: A_BL_SPOTIFY,
      user_id: ALPHA_ID,
      name: 'Spotify',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(alphaCats, 'Entertainment'),
      subcategory_id: catId(alphaCats, 'Streaming Services'),
      amount: 10.99,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-09'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: A_BL_GYM,
      user_id: ALPHA_ID,
      name: 'Gym Membership',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(alphaCats, 'Health & Wellness'),
      subcategory_id: catId(alphaCats, 'Fitness / Gym'),
      amount: 45.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: A_BL_HOME_INS,
      user_id: ALPHA_ID,
      name: "Tenant's Insurance",
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(alphaCats, 'Housing'),
      subcategory_id: catId(alphaCats, 'Home Insurance'),
      amount: 420.0,
      frequency: 'annually',
      frequency_interval: null,
      anchor_date: d('2026-01-15'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: A_BL_CAR_INS,
      user_id: ALPHA_ID,
      name: 'Car Insurance',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(alphaCats, 'Transportation'),
      subcategory_id: catId(alphaCats, 'Vehicle Insurance'),
      amount: 95.0,
      frequency: 'semi_monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: 'Due 1st and 15th',
    },
    {
      id: A_BL_DENTAL,
      user_id: ALPHA_ID,
      name: 'Dental Checkup',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(alphaCats, 'Health & Wellness'),
      subcategory_id: catId(alphaCats, 'Dental'),
      amount: 250.0,
      frequency: 'annually',
      frequency_interval: null,
      anchor_date: d('2026-06-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: A_BL_HAIRCUT,
      user_id: ALPHA_ID,
      name: 'Haircut',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(alphaCats, 'Shopping'),
      subcategory_id: catId(alphaCats, 'Personal Care'),
      amount: 35.0,
      frequency: 'every_n_days',
      frequency_interval: 42,
      anchor_date: d('2026-02-20'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: 'Every 6 weeks',
    },
    {
      id: A_BL_DINING,
      user_id: ALPHA_ID,
      name: 'Dining Out',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(alphaCats, 'Food'),
      subcategory_id: catId(alphaCats, 'Dining Out'),
      amount: 200.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: A_BL_COFFEE,
      user_id: ALPHA_ID,
      name: 'Coffee',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(alphaCats, 'Food'),
      subcategory_id: catId(alphaCats, 'Coffee & Cafes'),
      amount: 25.0,
      frequency: 'weekly',
      frequency_interval: null,
      anchor_date: d('2026-02-17'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: A_BL_HOLIDAY,
      user_id: ALPHA_ID,
      name: 'Holiday Gift Fund',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(alphaCats, 'Shopping'),
      subcategory_id: catId(alphaCats, 'Gifts Given'),
      amount: 500.0,
      frequency: 'one_time',
      frequency_interval: null,
      anchor_date: d('2026-12-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: 'Christmas gifts',
    },
    // ── Beta budget lines ─────────────────────────────────────────────────────
    {
      id: B_BL_SALARY,
      user_id: BETA_ID,
      name: 'Software Engineer Salary',
      classification: 'income',
      flexibility: 'fixed',
      category_id: catId(betaCats, 'Earned Income'),
      subcategory_id: catId(betaCats, 'Salary / Wages'),
      amount: 4800.0,
      frequency: 'semi_monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-15'),
      is_pay_period_anchor: true,
      is_active: true,
      notes: 'Net pay',
    },
    {
      id: B_BL_SIDE_INCOME,
      user_id: BETA_ID,
      name: 'Freelance Dev Work',
      classification: 'income',
      flexibility: 'flexible',
      category_id: catId(betaCats, 'Other Income'),
      subcategory_id: catId(betaCats, 'Gifts Received'),
      amount: 600.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_MORTGAGE,
      user_id: BETA_ID,
      name: 'Mortgage',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(betaCats, 'Housing'),
      subcategory_id: catId(betaCats, 'Rent / Mortgage'),
      amount: 2150.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_UTILITIES,
      user_id: BETA_ID,
      name: 'Utilities',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(betaCats, 'Utilities'),
      subcategory_id: catId(betaCats, 'Electricity'),
      amount: 145.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_INTERNET,
      user_id: BETA_ID,
      name: 'Internet',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(betaCats, 'Utilities'),
      subcategory_id: catId(betaCats, 'Internet'),
      amount: 90.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-15'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_GROCERIES,
      user_id: BETA_ID,
      name: 'Groceries',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(betaCats, 'Food'),
      subcategory_id: catId(betaCats, 'Groceries'),
      amount: 220.0,
      frequency: 'weekly',
      frequency_interval: null,
      anchor_date: d('2026-02-16'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_STUDENT_LOAN,
      user_id: BETA_ID,
      name: 'Student Loan Payment',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(betaCats, 'Debt Payments'),
      subcategory_id: catId(betaCats, 'Student Loan'),
      amount: 363.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: '4.5% APR federal loan',
    },
    {
      id: B_BL_GYM,
      user_id: BETA_ID,
      name: 'Planet Fitness',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(betaCats, 'Health & Wellness'),
      subcategory_id: catId(betaCats, 'Fitness / Gym'),
      amount: 25.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_GAS,
      user_id: BETA_ID,
      name: 'Gas',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(betaCats, 'Transportation'),
      subcategory_id: catId(betaCats, 'Fuel / Gas'),
      amount: 70.0,
      frequency: 'every_n_days',
      frequency_interval: 12,
      anchor_date: d('2026-02-13'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_COFFEE,
      user_id: BETA_ID,
      name: 'Coffee',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(betaCats, 'Food'),
      subcategory_id: catId(betaCats, 'Coffee & Cafes'),
      amount: 30.0,
      frequency: 'weekly',
      frequency_interval: null,
      anchor_date: d('2026-02-16'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_NETFLIX,
      user_id: BETA_ID,
      name: 'Netflix',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(betaCats, 'Entertainment'),
      subcategory_id: catId(betaCats, 'Streaming Services'),
      amount: 15.99,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-08'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_SPOTIFY,
      user_id: BETA_ID,
      name: 'Spotify',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(betaCats, 'Entertainment'),
      subcategory_id: catId(betaCats, 'Streaming Services'),
      amount: 10.99,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-09'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_AMAZON_PRIME,
      user_id: BETA_ID,
      name: 'Amazon Prime',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(betaCats, 'Shopping'),
      subcategory_id: catId(betaCats, 'Memberships'),
      amount: 139.0,
      frequency: 'annually',
      frequency_interval: null,
      anchor_date: d('2026-03-15'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_CAR_INS,
      user_id: BETA_ID,
      name: 'Car Insurance',
      classification: 'expense',
      flexibility: 'fixed',
      category_id: catId(betaCats, 'Transportation'),
      subcategory_id: catId(betaCats, 'Vehicle Insurance'),
      amount: 195.0,
      frequency: 'semi_monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
    {
      id: B_BL_DINING,
      user_id: BETA_ID,
      name: 'Dining Out',
      classification: 'expense',
      flexibility: 'flexible',
      category_id: catId(betaCats, 'Food'),
      subcategory_id: catId(betaCats, 'Dining Out'),
      amount: 250.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: d('2026-02-01'),
      is_pay_period_anchor: false,
      is_active: true,
      notes: null,
    },
  ]);

  // ── Savings Goals ──────────────────────────────────────────────────────────
  console.log('[dev_seed] Inserting savings goals...');
  await knex('savings_goals').insert([
    {
      id: A_GOAL_EMERGENCY,
      user_id: ALPHA_ID,
      account_id: A_EMERGENCY,
      name: 'Emergency Fund (6 months)',
      target_amount: 15000.0,
      target_date: d('2026-12-31'),
    },
    {
      id: A_GOAL_VACATION,
      user_id: ALPHA_ID,
      account_id: A_TFSA,
      name: 'Summer Vacation',
      target_amount: 3500.0,
      target_date: d('2026-06-01'),
    },
    {
      id: B_GOAL_DOWN_PMT,
      user_id: BETA_ID,
      account_id: B_SAVINGS,
      name: 'House Down Payment',
      target_amount: 50000.0,
      target_date: d('2027-09-01'),
    },
    {
      id: B_GOAL_EMERGENCY,
      user_id: BETA_ID,
      account_id: B_SAVINGS,
      name: 'Emergency Fund',
      target_amount: 20000.0,
      target_date: null,
    },
  ]);

  // ── Debt Schedules ─────────────────────────────────────────────────────────
  console.log('[dev_seed] Inserting debt schedules...');
  await knex('debt_schedules').insert([
    {
      id: A_DEBT_CAR,
      user_id: ALPHA_ID,
      account_id: A_CAR_LOAN,
      principal: 28500.0,
      annual_rate: 0.059, // 5.9% APR
      term_months: 60,
      origination_date: d('2024-08-01'),
      payment_amount: 548.0,
    },
    {
      id: B_DEBT_STUDENT,
      user_id: BETA_ID,
      account_id: B_STUDENT_LOAN,
      principal: 35000.0,
      annual_rate: 0.045, // 4.5% APR
      term_months: 120,
      origination_date: d('2022-09-01'),
      payment_amount: 363.0,
    },
  ]);

  // ── Transactions ───────────────────────────────────────────────────────────
  // Alpha: Sep 1 2025 → Feb 24 2026 (~6 months, ~170 transactions)
  // Beta:  Nov 1 2025 → Feb 24 2026 (~4 months, ~100 transactions)

  console.log('[dev_seed] Building transactions...');
  const txns: TxRow[] = [];
  const links: LinkRow[] = [];
  const splits: SplitRow[] = [];

  // ── Alpha transactions ─────────────────────────────────────────────────────
  // Helper aliases — map to budget line IDs; null = no matching budget line
  const A = ALPHA_ID;
  const aSalary = A_BL_SALARY;
  const aClientPmts = A_BL_FREELANCE;
  const aRentMortgage = A_BL_RENT;
  const aElectricity = A_BL_HYDRO;
  const aInternet = A_BL_INTERNET;
  const aHomeInsurance = A_BL_HOME_INS;
  const aGroceries = A_BL_GROCERIES;
  const aDiningOut = A_BL_DINING;
  const aCoffee = A_BL_COFFEE;
  const aFuel = A_BL_GAS;
  const aVehicleIns = A_BL_CAR_INS;
  const aVehicleLoan = A_BL_CAR_PMT;
  const aGym = A_BL_GYM;
  const aStreaming = A_BL_NETFLIX; // covers Netflix + Spotify transactions
  // No budget lines for these — will be unassigned
  const aDoctor: string | null = null;
  const aPharmacy: string | null = null;
  const aPersonalCare: string | null = null;
  const aClothing: string | null = null;
  const aEvents: string | null = null;
  const aHouseholdGoods: string | null = null;
  const aGiftsGiven: string | null = null;

  // Shorthand budget line refs for Beta
  const B = BETA_ID;
  const bSalary = B_BL_SALARY;
  const bOtherIncome = B_BL_SIDE_INCOME;
  const bRentMortgage = B_BL_MORTGAGE;
  const bElectricity = B_BL_UTILITIES;
  const bInternet = B_BL_INTERNET;
  const bGroceries = B_BL_GROCERIES;
  const bDiningOut = B_BL_DINING;
  const bCoffee = B_BL_COFFEE;
  const bFuel = B_BL_GAS;
  const bVehicleIns = B_BL_CAR_INS;
  const bGym = B_BL_GYM;
  const bStreaming = B_BL_NETFLIX; // covers Netflix + Spotify transactions
  const bStudentLoan = B_BL_STUDENT_LOAN;
  // No budget lines for these — will be unassigned
  const bEvents: string | null = null;
  const bHouseholdGoods: string | null = null;
  const bElectronics: string | null = null;
  const bGiftsGiven: string | null = null;

  // September 2025
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-09-03', aSalary);
  addTx(
    txns,
    atx(),
    A,
    A_CHECKING,
    -1800.0,
    'Landlord Property Mgmt',
    '2025-09-01',
    aRentMortgage,
    false,
    true,
    'September rent'
  );
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2025-09-01', aGym);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-09-01', aVehicleIns);
  addTx(txns, atx(), A, A_CHECKING, -11.5, "Timothy's Coffee", '2025-09-03', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -134.28, 'Loblaw Companies', '2025-09-05', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2025-09-08', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2025-09-09', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -58.4, 'Shell Gas Station', '2025-09-09', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -9.25, 'Tim Hortons', '2025-09-10', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -89.15, 'Metro Grocery', '2025-09-12', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -45.6, "East Side Mario's", '2025-09-14', aDiningOut);
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2025-09-15', aInternet);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-09-15', aVehicleIns);
  const aSep15LoanTx = atx();
  addDebtPayment(
    txns,
    splits,
    aSep15LoanTx,
    A,
    A_CHECKING,
    548.0,
    408.35,
    139.65,
    'Toyota Financial Services',
    '2025-09-15',
    aVehicleLoan
  );
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-09-17', aSalary);
  addTx(txns, atx(), A, A_CHECKING, -13.75, 'Second Cup', '2025-09-17', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -156.3, 'Loblaws', '2025-09-19', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -52.1, 'Esso Gas', '2025-09-19', aFuel);
  addTx(txns, atx(), A, A_VISA, -34.99, 'Amazon.ca', '2025-09-20', aHouseholdGoods);
  addTx(txns, atx(), A, A_CHECKING, -67.8, 'The Keg Steakhouse', '2025-09-22', aDiningOut);
  addTx(txns, atx(), A, A_CHECKING, -12.0, 'Starbucks', '2025-09-24', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -35.0, 'Great Clips', '2025-09-25', aPersonalCare);
  addTx(txns, atx(), A, A_CHECKING, -108.45, 'No Frills', '2025-09-26', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -61.2, 'Petro Canada', '2025-09-29', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -112.4, 'Toronto Hydro', '2025-09-30', aElectricity);
  const aSepCcFromId = atx();
  const aSepCcToId = atx();
  addTransfer(
    txns,
    links,
    aSepCcFromId,
    aSepCcToId,
    A,
    A_CHECKING,
    A,
    A_VISA,
    1200.0,
    'Credit Card Payment',
    '2025-09-30',
    'payment'
  );

  // October 2025
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-10-01', aSalary);
  addTx(
    txns,
    atx(),
    A,
    A_CHECKING,
    -1800.0,
    'Landlord Property Mgmt',
    '2025-10-01',
    aRentMortgage,
    false,
    true,
    'October rent'
  );
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2025-10-01', aGym);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-10-01', aVehicleIns);
  addTx(txns, atx(), A, A_CHECKING, -10.5, "Timothy's Coffee", '2025-10-03', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -142.8, 'Loblaws', '2025-10-04', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -54.3, 'Shell Gas Station', '2025-10-07', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2025-10-08', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2025-10-09', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -8.75, 'Tim Hortons', '2025-10-11', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -52.4, "Jack Astor's", '2025-10-14', aDiningOut);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-10-15', aSalary);
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2025-10-15', aInternet);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-10-15', aVehicleIns);
  const aOct15LoanTx = atx();
  addDebtPayment(
    txns,
    splits,
    aOct15LoanTx,
    A,
    A_CHECKING,
    548.0,
    410.36,
    137.64,
    'Toyota Financial Services',
    '2025-10-15',
    aVehicleLoan
  );
  addTx(txns, atx(), A, A_CHECKING, -89.35, 'Metro Grocery', '2025-10-16', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -63.1, 'Esso Gas', '2025-10-17', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -122.45, 'Loblaws', '2025-10-17', aGroceries);
  addTx(
    txns,
    atx(),
    A,
    A_VISA,
    -67.99,
    'Amazon.ca',
    '2025-10-19',
    aHouseholdGoods,
    false,
    true,
    'Fall shoes'
  );
  addTx(txns, atx(), A, A_CHECKING, -14.0, 'Second Cup', '2025-10-20', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -78.5, 'Milestones Restaurant', '2025-10-21', aDiningOut);
  addTx(txns, atx(), A, A_VISA, -28.0, 'Cineplex Entertainment', '2025-10-22', aEvents);
  addTx(txns, atx(), A, A_CHECKING, -135.2, 'No Frills', '2025-10-25', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -55.8, 'Petro Canada', '2025-10-27', aFuel);
  addTx(
    txns,
    atx(),
    A,
    A_VISA,
    -156.49,
    'Amazon.ca',
    '2025-10-30',
    aClothing,
    false,
    true,
    'Clothing'
  );
  addTx(txns, atx(), A, A_CHECKING, -118.9, 'Toronto Hydro', '2025-10-31', aElectricity);
  const aOctCcFromId = atx();
  const aOctCcToId = atx();
  addTransfer(
    txns,
    links,
    aOctCcFromId,
    aOctCcToId,
    A,
    A_CHECKING,
    A,
    A_VISA,
    1500.0,
    'Credit Card Payment',
    '2025-10-31',
    'payment'
  );

  // November 2025
  addTx(
    txns,
    atx(),
    A,
    A_CHECKING,
    -1800.0,
    'Landlord Property Mgmt',
    '2025-11-01',
    aRentMortgage,
    false,
    true,
    'November rent'
  );
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2025-11-01', aGym);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-11-01', aVehicleIns);
  addTx(txns, atx(), A, A_CHECKING, 850.0, 'Freelance Client Payment', '2025-11-01', aClientPmts);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-11-12', aSalary);
  addTx(txns, atx(), A, A_CHECKING, -12.25, "Timothy's Coffee", '2025-11-05', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -148.6, 'Loblaws', '2025-11-06', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2025-11-08', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2025-11-09', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -59.7, 'Shell Gas Station', '2025-11-11', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -24.95, 'Shoppers Drug Mart', '2025-11-11', aPharmacy);
  addTx(txns, atx(), A, A_CHECKING, -9.5, 'Tim Hortons', '2025-11-12', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -61.2, 'Boston Pizza', '2025-11-13', aDiningOut);
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2025-11-15', aInternet);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-11-15', aVehicleIns);
  const aNov15LoanTx = atx();
  addDebtPayment(
    txns,
    splits,
    aNov15LoanTx,
    A,
    A_CHECKING,
    548.0,
    412.38,
    135.62,
    'Toyota Financial Services',
    '2025-11-15',
    aVehicleLoan
  );
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-11-26', aSalary);
  addTx(txns, atx(), A, A_CHECKING, -132.1, 'Metro Grocery', '2025-11-18', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -57.4, 'Petro Canada', '2025-11-20', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -98.45, 'No Frills', '2025-11-21', aGroceries);
  addTx(
    txns,
    atx(),
    A,
    A_VISA,
    -89.99,
    'Amazon.ca',
    '2025-11-21',
    aHouseholdGoods,
    false,
    true,
    'Holiday pre-shopping'
  );
  addTx(txns, atx(), A, A_CHECKING, -35.0, 'Great Clips', '2025-11-24', aPersonalCare);
  addTx(txns, atx(), A, A_CHECKING, -11.25, 'Starbucks', '2025-11-25', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -54.8, 'The Keg Steakhouse', '2025-11-26', aDiningOut);
  addTx(
    txns,
    atx(),
    A,
    A_CHECKING,
    -189.3,
    'Loblaws',
    '2025-11-27',
    aGroceries,
    false,
    true,
    'Holiday groceries'
  );
  addTx(txns, atx(), A, A_CHECKING, -49.8, 'Esso Gas', '2025-11-28', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -125.7, 'Toronto Hydro', '2025-11-30', aElectricity);
  const aNovSavFromId = atx();
  const aNovSavToId = atx();
  addTransfer(
    txns,
    links,
    aNovSavFromId,
    aNovSavToId,
    A,
    A_CHECKING,
    A,
    A_EMERGENCY,
    500.0,
    'Savings Transfer',
    '2025-11-29',
    'transfer'
  );
  const aNovCcFromId = atx();
  const aNovCcToId = atx();
  addTransfer(
    txns,
    links,
    aNovCcFromId,
    aNovCcToId,
    A,
    A_CHECKING,
    A,
    A_VISA,
    1100.0,
    'Credit Card Payment',
    '2025-11-30',
    'payment'
  );

  // December 2025
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-12-10', aSalary);
  addTx(
    txns,
    atx(),
    A,
    A_CHECKING,
    -1800.0,
    'Landlord Property Mgmt',
    '2025-12-01',
    aRentMortgage,
    false,
    true,
    'December rent'
  );
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2025-12-01', aGym);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-12-01', aVehicleIns);
  addTx(
    txns,
    atx(),
    A,
    A_VISA,
    -245.67,
    'Amazon.ca',
    '2025-12-05',
    aGiftsGiven,
    false,
    true,
    'Holiday gifts'
  );
  addTx(txns, atx(), A, A_CHECKING, -13.5, "Timothy's Coffee", '2025-12-06', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -165.4, 'Loblaws', '2025-12-07', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2025-12-08', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2025-12-09', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -62.3, 'Shell Gas Station', '2025-12-10', aFuel);
  addTx(
    txns,
    atx(),
    A,
    A_VISA,
    -129.99,
    'Winners / HomeSense',
    '2025-12-12',
    aClothing,
    false,
    true,
    'Winter clothing'
  );
  addTx(txns, atx(), A, A_CHECKING, -10.25, 'Tim Hortons', '2025-12-12', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -142.85, 'Metro Grocery', '2025-12-14', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2025-12-15', aInternet);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-12-15', aVehicleIns);
  const aDec15LoanTx = atx();
  addDebtPayment(
    txns,
    splits,
    aDec15LoanTx,
    A,
    A_CHECKING,
    548.0,
    414.4,
    133.6,
    'Toyota Financial Services',
    '2025-12-15',
    aVehicleLoan
  );
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-12-24', aSalary);
  addTx(
    txns,
    atx(),
    A,
    A_CHECKING,
    850.0,
    'Freelance Client Payment',
    '2025-12-24',
    aClientPmts,
    false,
    true,
    'End of year freelance'
  );
  addTx(txns, atx(), A, A_CHECKING, -58.8, 'Esso Gas', '2025-12-17', aFuel);
  addTx(
    txns,
    atx(),
    A,
    A_VISA,
    -312.4,
    'Amazon.ca',
    '2025-12-19',
    aGiftsGiven,
    false,
    true,
    'More holiday gifts'
  );
  addTx(
    txns,
    atx(),
    A,
    A_VISA,
    -89.5,
    'Milestones Restaurant',
    '2025-12-20',
    aDiningOut,
    false,
    true,
    'Holiday dinner'
  );
  addTx(
    txns,
    atx(),
    A,
    A_CHECKING,
    -198.25,
    'Loblaws',
    '2025-12-21',
    aGroceries,
    false,
    true,
    'Christmas groceries'
  );
  addTx(txns, atx(), A, A_CHECKING, -15.0, 'Starbucks', '2025-12-22', aCoffee);
  addTx(
    txns,
    atx(),
    A,
    A_VISA,
    -78.99,
    'Amazon.ca',
    '2025-12-26',
    aHouseholdGoods,
    false,
    true,
    'Boxing Day deal'
  );
  addTx(txns, atx(), A, A_CHECKING, -65.1, 'Shell Gas Station', '2025-12-28', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -138.2, 'Toronto Hydro', '2025-12-31', aElectricity);
  const aDecCcFromId = atx();
  const aDecCcToId = atx();
  addTransfer(
    txns,
    links,
    aDecCcFromId,
    aDecCcToId,
    A,
    A_CHECKING,
    A,
    A_VISA,
    2200.0,
    'Credit Card Payment',
    '2025-12-31',
    'payment'
  );

  // January 2026
  addTx(
    txns,
    atx(),
    A,
    A_CHECKING,
    -1800.0,
    'Landlord Property Mgmt',
    '2026-01-01',
    aRentMortgage,
    false,
    true,
    'January rent'
  );
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2026-01-01', aGym);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2026-01-01', aVehicleIns);
  addTx(
    txns,
    atx(),
    A,
    A_CHECKING,
    -420.0,
    'Aviva Insurance',
    '2026-01-15',
    aHomeInsurance,
    false,
    true,
    'Annual tenant insurance'
  );
  addTx(txns, atx(), A, A_CHECKING, -11.5, "Timothy's Coffee", '2026-01-03', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -152.6, 'No Frills', '2026-01-04', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2026-01-07', aSalary);
  addTx(txns, atx(), A, A_CHECKING, 850.0, 'Freelance Client Payment', '2026-01-07', aClientPmts);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2026-01-08', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2026-01-09', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -55.6, 'Shell Gas Station', '2026-01-09', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -12.75, 'Tim Hortons', '2026-01-10', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -113.4, 'Metro Grocery', '2026-01-11', aGroceries);
  addTx(
    txns,
    atx(),
    A,
    A_CHECKING,
    -180.0,
    'Sunnybrook Family Health',
    '2026-01-12',
    aDoctor,
    false,
    true,
    'Annual physical'
  );
  addTx(txns, atx(), A, A_CHECKING, -42.3, "Montana's BBQ", '2026-01-14', aDiningOut);
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2026-01-15', aInternet);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2026-01-15', aVehicleIns);
  const aJan15LoanTx = atx();
  addDebtPayment(
    txns,
    splits,
    aJan15LoanTx,
    A,
    A_CHECKING,
    548.0,
    416.44,
    131.56,
    'Toyota Financial Services',
    '2026-01-15',
    aVehicleLoan
  );
  addTx(txns, atx(), A, A_CHECKING, -60.2, 'Petro Canada', '2026-01-17', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -127.85, 'Loblaws', '2026-01-18', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -58.4, 'Esso Gas', '2026-01-19', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -35.0, 'Great Clips', '2026-01-19', aPersonalCare);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2026-01-21', aSalary);
  addTx(txns, atx(), A, A_VISA, -45.99, 'Amazon.ca', '2026-01-23', aHouseholdGoods);
  addTx(txns, atx(), A, A_CHECKING, -13.5, 'Second Cup', '2026-01-24', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -139.2, 'No Frills', '2026-01-25', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -72.4, "Jack Astor's", '2026-01-26', aDiningOut);
  addTx(txns, atx(), A, A_CHECKING, -63.7, 'Shell Gas Station', '2026-01-28', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -129.8, 'Toronto Hydro', '2026-01-30', aElectricity);
  const aJanCcFromId = atx();
  const aJanCcToId = atx();
  addTransfer(
    txns,
    links,
    aJanCcFromId,
    aJanCcToId,
    A,
    A_CHECKING,
    A,
    A_VISA,
    1400.0,
    'Credit Card Payment',
    '2026-01-31',
    'payment'
  );

  // February 2026 (to Feb 24)
  addTx(
    txns,
    atx(),
    A,
    A_CHECKING,
    -1800.0,
    'Landlord Property Mgmt',
    '2026-02-01',
    aRentMortgage,
    false,
    true,
    'February rent'
  );
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2026-02-01', aGym);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2026-02-01', aVehicleIns);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2026-02-04', aSalary);
  addTx(txns, atx(), A, A_CHECKING, 850.0, 'Freelance Client Payment', '2026-02-04', aClientPmts);
  addTx(txns, atx(), A, A_CHECKING, -10.25, 'Tim Hortons', '2026-02-05', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -148.3, 'Loblaws', '2026-02-06', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -57.8, 'Shell Gas Station', '2026-02-07', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2026-02-08', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2026-02-09', aStreaming);
  addTx(txns, atx(), A, A_CHECKING, -12.0, "Timothy's Coffee", '2026-02-11', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -98.45, 'Metro Grocery', '2026-02-12', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -61.3, 'Petro Canada', '2026-02-13', aFuel);
  addTx(
    txns,
    atx(),
    A,
    A_VISA,
    -92.45,
    'The Keg Steakhouse',
    '2026-02-14',
    aDiningOut,
    false,
    true,
    "Valentine's Day dinner"
  );
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2026-02-15', aInternet);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2026-02-15', aVehicleIns);
  const aFeb15LoanTx = atx();
  addDebtPayment(
    txns,
    splits,
    aFeb15LoanTx,
    A,
    A_CHECKING,
    548.0,
    418.49,
    129.51,
    'Toyota Financial Services',
    '2026-02-15',
    aVehicleLoan
  );
  addTx(txns, atx(), A, A_CHECKING, -134.6, 'No Frills', '2026-02-17', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2026-02-18', aSalary);
  addTx(txns, atx(), A, A_CHECKING, -11.75, 'Second Cup', '2026-02-18', aCoffee);
  addTx(txns, atx(), A, A_CHECKING, -52.4, 'Shell Gas Station', '2026-02-19', aFuel);
  addTx(txns, atx(), A, A_CHECKING, -35.0, 'Great Clips', '2026-02-20', aPersonalCare);
  addTx(txns, atx(), A, A_CHECKING, -112.8, 'Loblaws', '2026-02-22', aGroceries);
  addTx(txns, atx(), A, A_CHECKING, -14.25, 'Starbucks', '2026-02-24', aCoffee);

  // ── Beta transactions ──────────────────────────────────────────────────────

  // November 2025
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2025-11-01', bSalary);
  addTx(
    txns,
    btx(),
    B,
    B_CHECKING,
    -2150.0,
    'Chase Mortgage Auto-Pay',
    '2025-11-01',
    bRentMortgage,
    false,
    true,
    'November mortgage'
  );
  addTx(txns, btx(), B, B_CHECKING, -25.0, 'Planet Fitness', '2025-11-01', bGym);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2025-11-01', bVehicleIns);
  const bNovStudentTx = btx();
  addDebtPayment(
    txns,
    splits,
    bNovStudentTx,
    B,
    B_CHECKING,
    363.0,
    267.16,
    95.84,
    'Federal Student Aid',
    '2025-11-01',
    bStudentLoan
  );
  addTx(txns, btx(), B, B_CHECKING, -9.5, 'Dunkin Donuts', '2025-11-03', bCoffee);
  addTx(txns, btx(), B, B_CHECKING, -187.42, 'Whole Foods Market', '2025-11-04', bGroceries);
  addTx(txns, btx(), B, B_CHECKING, -15.99, 'Netflix', '2025-11-08', bStreaming);
  addTx(txns, btx(), B, B_CHECKING, -10.99, 'Spotify', '2025-11-09', bStreaming);
  addTx(txns, btx(), B, B_CHECKING, -62.4, 'Shell Gas Station', '2025-11-10', bFuel);
  addTx(txns, btx(), B, B_CHECKING, 600.0, 'Freelance Project', '2025-11-12', bOtherIncome);
  addTx(txns, btx(), B, B_CHECKING, -11.0, 'Starbucks', '2025-11-12', bCoffee);
  addTx(txns, btx(), B, B_CHECKING, -68.9, 'Olive Garden', '2025-11-14', bDiningOut);
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2025-11-15', bSalary);
  addTx(txns, btx(), B, B_CHECKING, -90.0, 'Comcast Xfinity', '2025-11-15', bInternet);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2025-11-15', bVehicleIns);
  addTx(txns, btx(), B, B_CHECKING, -148.65, 'Kroger', '2025-11-17', bGroceries);
  addTx(txns, btx(), B, B_CHECKING, -59.2, 'Chevron Gas', '2025-11-20', bFuel);
  addTx(txns, btx(), B, B_CHECKING, -122.3, 'Whole Foods Market', '2025-11-21', bGroceries);
  addTx(
    txns,
    btx(),
    B,
    B_DISCOVER,
    -89.99,
    'Amazon.com',
    '2025-11-21',
    bHouseholdGoods,
    false,
    true,
    'Pre-holiday shopping'
  );
  addTx(
    txns,
    btx(),
    B,
    B_CHECKING,
    -134.0,
    'ConEdison',
    '2025-11-25',
    bElectricity,
    false,
    true,
    'Electric + gas bill'
  );
  addTx(
    txns,
    btx(),
    B,
    B_CHECKING,
    -210.4,
    'Whole Foods Market',
    '2025-11-27',
    bGroceries,
    false,
    true,
    'Thanksgiving groceries'
  );
  addTx(
    txns,
    btx(),
    B,
    B_DISCOVER,
    -112.5,
    'Target.com',
    '2025-11-28',
    bGiftsGiven,
    false,
    true,
    'Black Friday'
  );
  addTx(txns, btx(), B, B_CHECKING, -28.0, 'Regal Cinemas', '2025-11-29', bEvents);
  const bNovCcFromId = btx();
  const bNovCcToId = btx();
  addTransfer(
    txns,
    links,
    bNovCcFromId,
    bNovCcToId,
    B,
    B_CHECKING,
    B,
    B_DISCOVER,
    900.0,
    'Credit Card Payment',
    '2025-11-30',
    'payment'
  );

  // December 2025
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2025-12-01', bSalary);
  addTx(
    txns,
    btx(),
    B,
    B_CHECKING,
    -2150.0,
    'Chase Mortgage Auto-Pay',
    '2025-12-01',
    bRentMortgage,
    false,
    true,
    'December mortgage'
  );
  addTx(txns, btx(), B, B_CHECKING, -25.0, 'Planet Fitness', '2025-12-01', bGym);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2025-12-01', bVehicleIns);
  const bDecStudentTx = btx();
  addDebtPayment(
    txns,
    splits,
    bDecStudentTx,
    B,
    B_CHECKING,
    363.0,
    268.16,
    94.84,
    'Federal Student Aid',
    '2025-12-01',
    bStudentLoan
  );
  addTx(
    txns,
    btx(),
    B,
    B_DISCOVER,
    -278.45,
    'Amazon.com',
    '2025-12-05',
    bGiftsGiven,
    false,
    true,
    'Christmas gifts'
  );
  addTx(txns, btx(), B, B_CHECKING, -14.0, 'Dunkin Donuts', '2025-12-06', bCoffee);
  addTx(txns, btx(), B, B_CHECKING, -163.2, "Trader Joe's", '2025-12-07', bGroceries);
  addTx(txns, btx(), B, B_CHECKING, -15.99, 'Netflix', '2025-12-08', bStreaming);
  addTx(txns, btx(), B, B_CHECKING, -10.99, 'Spotify', '2025-12-09', bStreaming);
  addTx(txns, btx(), B, B_CHECKING, 600.0, 'Freelance Project', '2025-12-10', bOtherIncome);
  addTx(txns, btx(), B, B_CHECKING, -71.8, 'Chevron Gas', '2025-12-10', bFuel);
  addTx(
    txns,
    btx(),
    B,
    B_DISCOVER,
    -199.99,
    'Best Buy',
    '2025-12-12',
    bElectronics,
    false,
    true,
    'Christmas gift'
  );
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2025-12-15', bSalary);
  addTx(txns, btx(), B, B_CHECKING, -90.0, 'Comcast Xfinity', '2025-12-15', bInternet);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2025-12-15', bVehicleIns);
  addTx(txns, btx(), B, B_CHECKING, -178.9, 'Whole Foods Market', '2025-12-17', bGroceries);
  addTx(txns, btx(), B, B_CHECKING, -67.3, 'Shell Gas Station', '2025-12-18', bFuel);
  addTx(
    txns,
    btx(),
    B,
    B_CHECKING,
    -218.6,
    'Whole Foods Market',
    '2025-12-21',
    bGroceries,
    false,
    true,
    'Christmas groceries'
  );
  addTx(
    txns,
    btx(),
    B,
    B_DISCOVER,
    -108.5,
    'Pottery Barn',
    '2025-12-22',
    bHouseholdGoods,
    false,
    true,
    'Christmas decor'
  );
  addTx(txns, btx(), B, B_CHECKING, -153.8, 'ConEdison', '2025-12-28', bElectricity);
  const bDecSavFromId = btx();
  const bDecSavToId = btx();
  addTransfer(
    txns,
    links,
    bDecSavFromId,
    bDecSavToId,
    B,
    B_CHECKING,
    B,
    B_SAVINGS,
    800.0,
    'Transfer to Savings',
    '2025-12-30',
    'transfer'
  );
  const bDecCcFromId = btx();
  const bDecCcToId = btx();
  addTransfer(
    txns,
    links,
    bDecCcFromId,
    bDecCcToId,
    B,
    B_CHECKING,
    B,
    B_DISCOVER,
    1400.0,
    'Credit Card Payment',
    '2025-12-31',
    'payment'
  );

  // January 2026
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2026-01-01', bSalary);
  addTx(
    txns,
    btx(),
    B,
    B_CHECKING,
    -2150.0,
    'Chase Mortgage Auto-Pay',
    '2026-01-01',
    bRentMortgage,
    false,
    true,
    'January mortgage'
  );
  addTx(txns, btx(), B, B_CHECKING, -25.0, 'Planet Fitness', '2026-01-01', bGym);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2026-01-01', bVehicleIns);
  const bJanStudentTx = btx();
  addDebtPayment(
    txns,
    splits,
    bJanStudentTx,
    B,
    B_CHECKING,
    363.0,
    269.17,
    93.83,
    'Federal Student Aid',
    '2026-01-01',
    bStudentLoan
  );
  addTx(txns, btx(), B, B_CHECKING, -10.5, 'Starbucks', '2026-01-03', bCoffee);
  addTx(txns, btx(), B, B_CHECKING, -155.7, "Trader Joe's", '2026-01-05', bGroceries);
  addTx(txns, btx(), B, B_DISCOVER, -42.99, 'Amazon.com', '2026-01-06', bHouseholdGoods);
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2026-01-15', bSalary);
  addTx(txns, btx(), B, B_CHECKING, -15.99, 'Netflix', '2026-01-08', bStreaming);
  addTx(txns, btx(), B, B_CHECKING, -10.99, 'Spotify', '2026-01-09', bStreaming);
  addTx(txns, btx(), B, B_CHECKING, -63.4, 'Chevron Gas', '2026-01-10', bFuel);
  addTx(txns, btx(), B, B_CHECKING, 600.0, 'Freelance Project', '2026-01-12', bOtherIncome);
  addTx(txns, btx(), B, B_CHECKING, -75.6, 'The Cheesecake Factory', '2026-01-14', bDiningOut);
  addTx(txns, btx(), B, B_CHECKING, -90.0, 'Comcast Xfinity', '2026-01-15', bInternet);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2026-01-15', bVehicleIns);
  addTx(txns, btx(), B, B_CHECKING, -132.8, 'Kroger', '2026-01-17', bGroceries);
  addTx(txns, btx(), B, B_CHECKING, -68.5, 'Shell Gas Station', '2026-01-19', bFuel);
  addTx(txns, btx(), B, B_CHECKING, -38.0, 'Regal Cinemas', '2026-01-21', bEvents);
  addTx(txns, btx(), B, B_CHECKING, -148.2, 'Whole Foods Market', '2026-01-22', bGroceries);
  addTx(txns, btx(), B, B_CHECKING, -145.0, 'ConEdison', '2026-01-26', bElectricity);
  addTx(txns, btx(), B, B_CHECKING, -62.3, 'Chevron Gas', '2026-01-28', bFuel);
  const bJanCcFromId = btx();
  const bJanCcToId = btx();
  addTransfer(
    txns,
    links,
    bJanCcFromId,
    bJanCcToId,
    B,
    B_CHECKING,
    B,
    B_DISCOVER,
    800.0,
    'Credit Card Payment',
    '2026-01-31',
    'payment'
  );

  // February 2026 (to Feb 24)
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2026-02-01', bSalary);
  addTx(
    txns,
    btx(),
    B,
    B_CHECKING,
    -2150.0,
    'Chase Mortgage Auto-Pay',
    '2026-02-01',
    bRentMortgage,
    false,
    true,
    'February mortgage'
  );
  addTx(txns, btx(), B, B_CHECKING, -25.0, 'Planet Fitness', '2026-02-01', bGym);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2026-02-01', bVehicleIns);
  const bFebStudentTx = btx();
  addDebtPayment(
    txns,
    splits,
    bFebStudentTx,
    B,
    B_CHECKING,
    363.0,
    270.18,
    92.82,
    'Federal Student Aid',
    '2026-02-01',
    bStudentLoan
  );
  addTx(txns, btx(), B, B_CHECKING, -11.25, 'Dunkin Donuts', '2026-02-03', bCoffee);
  addTx(txns, btx(), B, B_CHECKING, -162.45, 'Whole Foods Market', '2026-02-04', bGroceries);
  addTx(txns, btx(), B, B_CHECKING, -59.8, 'Shell Gas Station', '2026-02-05', bFuel);
  addTx(txns, btx(), B, B_CHECKING, 600.0, 'Freelance Project', '2026-02-07', bOtherIncome);
  addTx(txns, btx(), B, B_CHECKING, -15.99, 'Netflix', '2026-02-08', bStreaming);
  addTx(txns, btx(), B, B_CHECKING, -10.99, 'Spotify', '2026-02-09', bStreaming);
  addTx(txns, btx(), B, B_CHECKING, -12.5, 'Starbucks', '2026-02-10', bCoffee);
  addTx(txns, btx(), B, B_CHECKING, -138.9, "Trader Joe's", '2026-02-11', bGroceries);
  addTx(txns, btx(), B, B_CHECKING, -67.1, 'Chevron Gas', '2026-02-13', bFuel);
  addTx(
    txns,
    btx(),
    B,
    B_DISCOVER,
    -178.9,
    'OpenTable Restaurant',
    '2026-02-14',
    bDiningOut,
    false,
    true,
    "Valentine's Day dinner"
  );
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2026-02-15', bSalary);
  addTx(txns, btx(), B, B_CHECKING, -90.0, 'Comcast Xfinity', '2026-02-15', bInternet);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2026-02-15', bVehicleIns);
  addTx(txns, btx(), B, B_CHECKING, -182.3, 'Kroger', '2026-02-17', bGroceries);
  addTx(txns, btx(), B, B_CHECKING, -72.4, 'Shell Gas Station', '2026-02-19', bFuel);
  addTx(txns, btx(), B, B_CHECKING, -155.6, 'Whole Foods Market', '2026-02-22', bGroceries);
  addTx(txns, btx(), B, B_CHECKING, -14.75, 'Dunkin Donuts', '2026-02-24', bCoffee);

  // ── Insert all transactions in batches ────────────────────────────────────
  console.log(
    `[dev_seed] Inserting ${txns.length} transactions, ${links.length} links, ${splits.length} splits...`
  );

  const BATCH = 50;
  for (let i = 0; i < txns.length; i += BATCH) {
    await knex('transactions').insert(txns.slice(i, i + BATCH));
  }

  if (links.length > 0) {
    await knex('transaction_links').insert(links);
  }

  if (splits.length > 0) {
    await knex('transaction_splits').insert(splits);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  console.log('');
  console.log('✓ [dev_seed] Seed complete.');
  console.log(
    `  Transactions: ${txns.length} (${links.length} linked transfers, ${splits.length} debt splits)`
  );
  console.log('');
  console.log('  Test credentials:');
  console.log('    mike+alpha@thebutchers.ca / test123  (CAD · en-CA · Toronto)');
  console.log('    mike+beta@thebutchers.ca  / test123  (USD · en-US · New York)');
  console.log('');
}
