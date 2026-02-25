/**
 * dev_seed.ts — Development & Test Data Seed
 *
 * Loads a comprehensive set of realistic test data for development and testing.
 * Covers every entity type in the schema: users, accounts, categories,
 * budget lines (all 7 frequency types), transactions (6 months), savings goals,
 * debt schedules, transaction splits, and transfer links.
 *
 * TEST USERS
 *   mike+alpha@thebutchers.ca / test123  — Canadian user, CAD, en-CA, Toronto timezone
 *   mike+beta@thebutchers.ca  / test123  — American user, USD, en-US, New York timezone
 *
 * SAFETY: Refuses to run in production or staging environments.
 */

import type { Knex } from 'knex';
import * as argon2 from 'argon2';
import { env } from '../../config/env';
import { encryptionService } from '../../services/encryption/encryptionService';

// ─── Environment Guard ────────────────────────────────────────────────────────

function assertSeedableEnvironment(): void {
  const blocked = ['production', 'staging'];
  if (blocked.includes(env.nodeEnv)) {
    throw new Error(
      `[dev_seed] Refusing to run in NODE_ENV="${env.nodeEnv}". ` +
        `Seeds are only permitted in development and test environments.`,
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

// ─── Entity IDs ───────────────────────────────────────────────────────────────

// Users
const ALPHA_ID = uid('0001', 1);
const BETA_ID = uid('0001', 2);

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

// ─── Categories — Alpha ───────────────────────────────────────────────────────

// Top-level expense
const A_C_HOUSING = uid('0003', 1);
const A_C_FOOD = uid('0003', 2);
const A_C_TRANSPORT = uid('0003', 3);
const A_C_HEALTH = uid('0003', 4);
const A_C_PERSONAL = uid('0003', 5);
const A_C_ENTERTAIN = uid('0003', 6);
const A_C_SHOPPING = uid('0003', 7);
const A_C_FINANCIAL = uid('0003', 8);
const A_C_SUBS = uid('0003', 9);
const A_C_TRANSFERS = uid('0003', 10);
const A_C_MISC = uid('0003', 11);
// Top-level income
const A_C_EMPLOYMENT = uid('0003', 12);
const A_C_OTHER_INC = uid('0003', 13);

// Housing subcategories
const A_S_RENT = uid('0004', 1);
const A_S_UTILITIES = uid('0004', 2);
const A_S_INTERNET = uid('0004', 3);
const A_S_HOME_INS = uid('0004', 4);
const A_S_REPAIRS = uid('0004', 5);
// Food & Dining subcategories
const A_S_GROCERIES = uid('0004', 6);
const A_S_RESTAURANTS = uid('0004', 7);
const A_S_COFFEE = uid('0004', 8);
const A_S_FASTFOOD = uid('0004', 9);
const A_S_ALCOHOL = uid('0004', 10);
// Transportation subcategories
const A_S_GAS = uid('0004', 11);
const A_S_CAR_PMT = uid('0004', 12);
const A_S_CAR_INS = uid('0004', 13);
const A_S_PARKING = uid('0004', 14);
const A_S_TRANSIT = uid('0004', 15);
// Healthcare subcategories
const A_S_DOCTOR = uid('0004', 16);
const A_S_PHARMACY = uid('0004', 17);
const A_S_GYM = uid('0004', 18);
const A_S_MENTAL = uid('0004', 19);
// Personal Care subcategories
const A_S_HAIRCUT = uid('0004', 20);
const A_S_CLOTHING = uid('0004', 21);
// Entertainment subcategories
const A_S_STREAMING = uid('0004', 22);
const A_S_MOVIES = uid('0004', 23);
const A_S_BOOKS = uid('0004', 24);
const A_S_HOBBIES = uid('0004', 25);
// Shopping subcategories
const A_S_AMAZON = uid('0004', 26);
const A_S_ELECTRONICS = uid('0004', 27);
const A_S_HOME_GARDEN = uid('0004', 28);
const A_S_GIFTS = uid('0004', 29);
// Financial subcategories
const A_S_CC_PMT = uid('0004', 30);
const A_S_LOAN_PMT = uid('0004', 31);
const A_S_BANK_FEES = uid('0004', 32);
// Subscriptions subcategories
const A_S_SOFTWARE = uid('0004', 33);
const A_S_MEMBERSHIPS = uid('0004', 34);
// Employment subcategories
const A_S_SALARY = uid('0004', 35);
const A_S_BONUS = uid('0004', 36);
const A_S_FREELANCE = uid('0004', 37);
// Other Income subcategories
const A_S_TAX_REFUND = uid('0004', 38);
const A_S_GIFTS_RECV = uid('0004', 39);
const A_S_CASHBACK = uid('0004', 40);

// ─── Categories — Beta ────────────────────────────────────────────────────────

const B_C_HOUSING = uid('0005', 1);
const B_C_FOOD = uid('0005', 2);
const B_C_TRANSPORT = uid('0005', 3);
const B_C_HEALTH = uid('0005', 4);
const B_C_PERSONAL = uid('0005', 5);
const B_C_ENTERTAIN = uid('0005', 6);
const B_C_SHOPPING = uid('0005', 7);
const B_C_FINANCIAL = uid('0005', 8);
const B_C_SUBS = uid('0005', 9);
const B_C_TRANSFERS = uid('0005', 10);
const B_C_MISC = uid('0005', 11);
const B_C_EMPLOYMENT = uid('0005', 12);
const B_C_OTHER_INC = uid('0005', 13);

const B_S_MORTGAGE = uid('0006', 1);
const B_S_UTILITIES = uid('0006', 2);
const B_S_INTERNET = uid('0006', 3);
const B_S_HOME_INS = uid('0006', 4);
const B_S_REPAIRS = uid('0006', 5);
const B_S_GROCERIES = uid('0006', 6);
const B_S_RESTAURANTS = uid('0006', 7);
const B_S_COFFEE = uid('0006', 8);
const B_S_FASTFOOD = uid('0006', 9);
const B_S_ALCOHOL = uid('0006', 10);
const B_S_GAS = uid('0006', 11);
const B_S_CAR_INS = uid('0006', 12);
const B_S_PARKING = uid('0006', 13);
const B_S_RIDESHARE = uid('0006', 14);
const B_S_DOCTOR = uid('0006', 15);
const B_S_PHARMACY = uid('0006', 16);
const B_S_GYM = uid('0006', 17);
const B_S_MENTAL = uid('0006', 18);
const B_S_HAIRCUT = uid('0006', 19);
const B_S_CLOTHING = uid('0006', 20);
const B_S_STREAMING = uid('0006', 21);
const B_S_MOVIES = uid('0006', 22);
const B_S_BOOKS = uid('0006', 23);
const B_S_HOBBIES = uid('0006', 24);
const B_S_AMAZON = uid('0006', 25);
const B_S_ELECTRONICS = uid('0006', 26);
const B_S_HOME_GARDEN = uid('0006', 27);
const B_S_GIFTS = uid('0006', 28);
const B_S_CC_PMT = uid('0006', 29);
const B_S_LOAN_PMT = uid('0006', 30);
const B_S_BANK_FEES = uid('0006', 31);
const B_S_SOFTWARE = uid('0006', 32);
const B_S_MEMBERSHIPS = uid('0006', 33);
const B_S_SALARY = uid('0006', 34);
const B_S_BONUS = uid('0006', 35);
const B_S_FREELANCE = uid('0006', 36);
const B_S_TAX_REFUND = uid('0006', 37);
const B_S_GIFTS_RECV = uid('0006', 38);
const B_S_CASHBACK = uid('0006', 39);
const B_S_CAR_PMT_PH = uid('0006', 40); // Beta placeholder — Beta has no Car Payment subcategory

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
  category_id: string | null;
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
  'users',
];

// ─── Categories Data ──────────────────────────────────────────────────────────

function buildCategories(
  userId: string,
  ids: {
    housing: string;
    food: string;
    transport: string;
    health: string;
    personal: string;
    entertain: string;
    shopping: string;
    financial: string;
    subs: string;
    transfers: string;
    misc: string;
    employment: string;
    otherInc: string;
    sRent: string;
    sUtilities: string;
    sInternet: string;
    sHomeIns: string;
    sRepairs: string;
    sGroceries: string;
    sRestaurants: string;
    sCoffee: string;
    sFastFood: string;
    sAlcohol: string;
    sGas: string;
    sCarPmt: string;
    sCarIns: string;
    sParking: string;
    sTransit: string;
    sDoctor: string;
    sPharmacy: string;
    sGym: string;
    sMental: string;
    sHaircut: string;
    sClothing: string;
    sStreaming: string;
    sMovies: string;
    sBooks: string;
    sHobbies: string;
    sAmazon: string;
    sElectronics: string;
    sHomeGarden: string;
    sGifts: string;
    sCcPmt: string;
    sLoanPmt: string;
    sBankFees: string;
    sSoftware: string;
    sMemberships: string;
    sSalary: string;
    sBonus: string;
    sFreelance: string;
    sTaxRefund: string;
    sGiftsRecv: string;
    sCashback: string;
  },
): object[] {
  const top = (
    id: string,
    name: string,
    color: string,
    icon: string,
    isIncome = false,
  ) => ({
    id,
    user_id: userId,
    name,
    color,
    icon,
    is_income: isIncome,
    parent_id: null,
    is_active: true,
  });

  const sub = (id: string, parentId: string, name: string, isIncome = false) => ({
    id,
    user_id: userId,
    name,
    color: null,
    icon: null,
    is_income: isIncome,
    parent_id: parentId,
    is_active: true,
  });

  return [
    // Top-level expense categories
    top(ids.housing, 'Housing', '#3b82f6', 'Home'),
    top(ids.food, 'Food & Dining', '#f59e0b', 'UtensilsCrossed'),
    top(ids.transport, 'Transportation', '#10b981', 'Car'),
    top(ids.health, 'Healthcare', '#ef4444', 'Heart'),
    top(ids.personal, 'Personal Care', '#a855f7', 'User'),
    top(ids.entertain, 'Entertainment', '#f97316', 'Tv'),
    top(ids.shopping, 'Shopping', '#ec4899', 'ShoppingBag'),
    top(ids.financial, 'Financial', '#6366f1', 'CreditCard'),
    top(ids.subs, 'Subscriptions', '#14b8a6', 'Repeat'),
    top(ids.transfers, 'Transfers', '#9ca3af', 'ArrowRightLeft'),
    top(ids.misc, 'Miscellaneous', '#6b7280', 'MoreHorizontal'),
    // Top-level income categories
    top(ids.employment, 'Employment', '#22c55e', 'Briefcase', true),
    top(ids.otherInc, 'Other Income', '#84cc16', 'PlusCircle', true),
    // Housing subcategories
    sub(ids.sRent, ids.housing, 'Rent / Mortgage'),
    sub(ids.sUtilities, ids.housing, 'Utilities'),
    sub(ids.sInternet, ids.housing, 'Internet & Phone'),
    sub(ids.sHomeIns, ids.housing, 'Home Insurance'),
    sub(ids.sRepairs, ids.housing, 'Repairs & Maintenance'),
    // Food & Dining subcategories
    sub(ids.sGroceries, ids.food, 'Groceries'),
    sub(ids.sRestaurants, ids.food, 'Restaurants'),
    sub(ids.sCoffee, ids.food, 'Coffee & Cafés'),
    sub(ids.sFastFood, ids.food, 'Fast Food'),
    sub(ids.sAlcohol, ids.food, 'Alcohol & Bars'),
    // Transportation subcategories
    sub(ids.sGas, ids.transport, 'Gas'),
    sub(ids.sCarPmt, ids.transport, 'Car Payment'),
    sub(ids.sCarIns, ids.transport, 'Car Insurance'),
    sub(ids.sParking, ids.transport, 'Parking & Tolls'),
    sub(ids.sTransit, ids.transport, 'Public Transit'),
    // Healthcare subcategories
    sub(ids.sDoctor, ids.health, 'Doctor & Dentist'),
    sub(ids.sPharmacy, ids.health, 'Pharmacy'),
    sub(ids.sGym, ids.health, 'Gym & Fitness'),
    sub(ids.sMental, ids.health, 'Mental Health'),
    // Personal Care subcategories
    sub(ids.sHaircut, ids.personal, 'Haircuts & Grooming'),
    sub(ids.sClothing, ids.personal, 'Clothing & Accessories'),
    // Entertainment subcategories
    sub(ids.sStreaming, ids.entertain, 'Streaming Services'),
    sub(ids.sMovies, ids.entertain, 'Movies & Events'),
    sub(ids.sBooks, ids.entertain, 'Books & Games'),
    sub(ids.sHobbies, ids.entertain, 'Hobbies & Sports'),
    // Shopping subcategories
    sub(ids.sAmazon, ids.shopping, 'Amazon & Online'),
    sub(ids.sElectronics, ids.shopping, 'Electronics'),
    sub(ids.sHomeGarden, ids.shopping, 'Home & Garden'),
    sub(ids.sGifts, ids.shopping, 'Gifts & Giving'),
    // Financial subcategories
    sub(ids.sCcPmt, ids.financial, 'Credit Card Payment'),
    sub(ids.sLoanPmt, ids.financial, 'Loan Payment'),
    sub(ids.sBankFees, ids.financial, 'Banking Fees'),
    // Subscriptions subcategories
    sub(ids.sSoftware, ids.subs, 'Software & Apps'),
    sub(ids.sMemberships, ids.subs, 'Memberships'),
    // Employment subcategories
    sub(ids.sSalary, ids.employment, 'Salary & Wages', true),
    sub(ids.sBonus, ids.employment, 'Bonus & Commission', true),
    sub(ids.sFreelance, ids.employment, 'Freelance & Contract', true),
    // Other Income subcategories
    sub(ids.sTaxRefund, ids.otherInc, 'Tax Refund', true),
    sub(ids.sGiftsRecv, ids.otherInc, 'Gifts Received', true),
    sub(ids.sCashback, ids.otherInc, 'Cashback & Rewards', true),
  ];
}

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
  categoryId: string | null,
  isTransfer = false,
  isCleared = true,
  description: string | null = null,
): void {
  arr.push({
    id,
    user_id: userId,
    account_id: accountId,
    amount,
    payee,
    description,
    date,
    category_id: categoryId,
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
  fromCatId: string | null,
  toCatId: string | null,
  linkType: 'transfer' | 'payment' = 'transfer',
): void {
  addTx(arr, fromId, fromUserId, fromAccountId, -amount, payee, date, fromCatId, true);
  addTx(arr, toId, toUserId, toAccountId, amount, payee, date, toCatId, true);
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
  categoryId: string | null,
): void {
  addTx(arr, txId, userId, accountId, -total, payee, date, categoryId);
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
  await knex.raw('SET FOREIGN_KEY_CHECKS = 0');
  for (const table of TRUNCATE_TABLES) {
    await knex(table).truncate();
  }
  await knex.raw('SET FOREIGN_KEY_CHECKS = 1');

  // ── Users ──────────────────────────────────────────────────────────────────
  console.log('[dev_seed] Inserting users...');
  await knex('users').insert([
    {
      id: ALPHA_ID,
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

  // ── Categories ─────────────────────────────────────────────────────────────
  console.log('[dev_seed] Inserting categories...');

  const alphaCategories = buildCategories(ALPHA_ID, {
    housing: A_C_HOUSING,
    food: A_C_FOOD,
    transport: A_C_TRANSPORT,
    health: A_C_HEALTH,
    personal: A_C_PERSONAL,
    entertain: A_C_ENTERTAIN,
    shopping: A_C_SHOPPING,
    financial: A_C_FINANCIAL,
    subs: A_C_SUBS,
    transfers: A_C_TRANSFERS,
    misc: A_C_MISC,
    employment: A_C_EMPLOYMENT,
    otherInc: A_C_OTHER_INC,
    sRent: A_S_RENT,
    sUtilities: A_S_UTILITIES,
    sInternet: A_S_INTERNET,
    sHomeIns: A_S_HOME_INS,
    sRepairs: A_S_REPAIRS,
    sGroceries: A_S_GROCERIES,
    sRestaurants: A_S_RESTAURANTS,
    sCoffee: A_S_COFFEE,
    sFastFood: A_S_FASTFOOD,
    sAlcohol: A_S_ALCOHOL,
    sGas: A_S_GAS,
    sCarPmt: A_S_CAR_PMT,
    sCarIns: A_S_CAR_INS,
    sParking: A_S_PARKING,
    sTransit: A_S_TRANSIT,
    sDoctor: A_S_DOCTOR,
    sPharmacy: A_S_PHARMACY,
    sGym: A_S_GYM,
    sMental: A_S_MENTAL,
    sHaircut: A_S_HAIRCUT,
    sClothing: A_S_CLOTHING,
    sStreaming: A_S_STREAMING,
    sMovies: A_S_MOVIES,
    sBooks: A_S_BOOKS,
    sHobbies: A_S_HOBBIES,
    sAmazon: A_S_AMAZON,
    sElectronics: A_S_ELECTRONICS,
    sHomeGarden: A_S_HOME_GARDEN,
    sGifts: A_S_GIFTS,
    sCcPmt: A_S_CC_PMT,
    sLoanPmt: A_S_LOAN_PMT,
    sBankFees: A_S_BANK_FEES,
    sSoftware: A_S_SOFTWARE,
    sMemberships: A_S_MEMBERSHIPS,
    sSalary: A_S_SALARY,
    sBonus: A_S_BONUS,
    sFreelance: A_S_FREELANCE,
    sTaxRefund: A_S_TAX_REFUND,
    sGiftsRecv: A_S_GIFTS_RECV,
    sCashback: A_S_CASHBACK,
  });

  const betaCategories = buildCategories(BETA_ID, {
    housing: B_C_HOUSING,
    food: B_C_FOOD,
    transport: B_C_TRANSPORT,
    health: B_C_HEALTH,
    personal: B_C_PERSONAL,
    entertain: B_C_ENTERTAIN,
    shopping: B_C_SHOPPING,
    financial: B_C_FINANCIAL,
    subs: B_C_SUBS,
    transfers: B_C_TRANSFERS,
    misc: B_C_MISC,
    employment: B_C_EMPLOYMENT,
    otherInc: B_C_OTHER_INC,
    sRent: B_S_MORTGAGE,
    sUtilities: B_S_UTILITIES,
    sInternet: B_S_INTERNET,
    sHomeIns: B_S_HOME_INS,
    sRepairs: B_S_REPAIRS,
    sGroceries: B_S_GROCERIES,
    sRestaurants: B_S_RESTAURANTS,
    sCoffee: B_S_COFFEE,
    sFastFood: B_S_FASTFOOD,
    sAlcohol: B_S_ALCOHOL,
    sGas: B_S_GAS,
    sCarPmt: B_S_CAR_PMT_PH, // Beta has no car payment; placeholder (not referenced by any budget line or transaction)
    sCarIns: B_S_CAR_INS,
    sParking: B_S_PARKING,
    sTransit: B_S_RIDESHARE,
    sDoctor: B_S_DOCTOR,
    sPharmacy: B_S_PHARMACY,
    sGym: B_S_GYM,
    sMental: B_S_MENTAL,
    sHaircut: B_S_HAIRCUT,
    sClothing: B_S_CLOTHING,
    sStreaming: B_S_STREAMING,
    sMovies: B_S_MOVIES,
    sBooks: B_S_BOOKS,
    sHobbies: B_S_HOBBIES,
    sAmazon: B_S_AMAZON,
    sElectronics: B_S_ELECTRONICS,
    sHomeGarden: B_S_HOME_GARDEN,
    sGifts: B_S_GIFTS,
    sCcPmt: B_S_CC_PMT,
    sLoanPmt: B_S_LOAN_PMT,
    sBankFees: B_S_BANK_FEES,
    sSoftware: B_S_SOFTWARE,
    sMemberships: B_S_MEMBERSHIPS,
    sSalary: B_S_SALARY,
    sBonus: B_S_BONUS,
    sFreelance: B_S_FREELANCE,
    sTaxRefund: B_S_TAX_REFUND,
    sGiftsRecv: B_S_GIFTS_RECV,
    sCashback: B_S_CASHBACK,
  });

  await knex('categories').insert([...alphaCategories, ...betaCategories]);

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
      category_id: A_C_EMPLOYMENT,
      subcategory_id: A_S_SALARY,
      amount: 3200.0,
      frequency: 'biweekly',
      frequency_interval: null,
      anchor_date: '2026-02-18',
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
      category_id: A_C_EMPLOYMENT,
      subcategory_id: A_S_FREELANCE,
      amount: 850.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: A_C_HOUSING,
      subcategory_id: A_S_RENT,
      amount: 1800.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: A_C_FINANCIAL,
      subcategory_id: A_S_LOAN_PMT,
      amount: 548.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-15',
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
      category_id: A_C_HOUSING,
      subcategory_id: A_S_UTILITIES,
      amount: 115.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: A_C_HOUSING,
      subcategory_id: A_S_INTERNET,
      amount: 85.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-15',
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
      category_id: A_C_FOOD,
      subcategory_id: A_S_GROCERIES,
      amount: 175.0,
      frequency: 'weekly',
      frequency_interval: null,
      anchor_date: '2026-02-17',
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
      category_id: A_C_TRANSPORT,
      subcategory_id: A_S_GAS,
      amount: 60.0,
      frequency: 'every_n_days',
      frequency_interval: 10,
      anchor_date: '2026-02-14',
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
      category_id: A_C_SUBS,
      subcategory_id: A_S_STREAMING,
      amount: 17.99,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-08',
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
      category_id: A_C_SUBS,
      subcategory_id: A_S_STREAMING,
      amount: 10.99,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-09',
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
      category_id: A_C_HEALTH,
      subcategory_id: A_S_GYM,
      amount: 45.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: A_C_HOUSING,
      subcategory_id: A_S_HOME_INS,
      amount: 420.0,
      frequency: 'annually',
      frequency_interval: null,
      anchor_date: '2026-01-15',
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
      category_id: A_C_TRANSPORT,
      subcategory_id: A_S_CAR_INS,
      amount: 95.0,
      frequency: 'semi_monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: A_C_HEALTH,
      subcategory_id: A_S_DOCTOR,
      amount: 250.0,
      frequency: 'annually',
      frequency_interval: null,
      anchor_date: '2026-06-01',
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
      category_id: A_C_PERSONAL,
      subcategory_id: A_S_HAIRCUT,
      amount: 35.0,
      frequency: 'every_n_days',
      frequency_interval: 42,
      anchor_date: '2026-02-20',
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
      category_id: A_C_FOOD,
      subcategory_id: A_S_RESTAURANTS,
      amount: 200.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: A_C_FOOD,
      subcategory_id: A_S_COFFEE,
      amount: 25.0,
      frequency: 'weekly',
      frequency_interval: null,
      anchor_date: '2026-02-17',
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
      category_id: A_C_SHOPPING,
      subcategory_id: A_S_GIFTS,
      amount: 500.0,
      frequency: 'one_time',
      frequency_interval: null,
      anchor_date: '2026-12-01',
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
      category_id: B_C_EMPLOYMENT,
      subcategory_id: B_S_SALARY,
      amount: 4800.0,
      frequency: 'semi_monthly',
      frequency_interval: null,
      anchor_date: '2026-02-15',
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
      category_id: B_C_EMPLOYMENT,
      subcategory_id: B_S_FREELANCE,
      amount: 600.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: B_C_HOUSING,
      subcategory_id: B_S_MORTGAGE,
      amount: 2150.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: B_C_HOUSING,
      subcategory_id: B_S_UTILITIES,
      amount: 145.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: B_C_HOUSING,
      subcategory_id: B_S_INTERNET,
      amount: 90.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-15',
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
      category_id: B_C_FOOD,
      subcategory_id: B_S_GROCERIES,
      amount: 220.0,
      frequency: 'weekly',
      frequency_interval: null,
      anchor_date: '2026-02-16',
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
      category_id: B_C_FINANCIAL,
      subcategory_id: B_S_LOAN_PMT,
      amount: 363.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: B_C_HEALTH,
      subcategory_id: B_S_GYM,
      amount: 25.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: B_C_TRANSPORT,
      subcategory_id: B_S_GAS,
      amount: 70.0,
      frequency: 'every_n_days',
      frequency_interval: 12,
      anchor_date: '2026-02-13',
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
      category_id: B_C_FOOD,
      subcategory_id: B_S_COFFEE,
      amount: 30.0,
      frequency: 'weekly',
      frequency_interval: null,
      anchor_date: '2026-02-16',
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
      category_id: B_C_SUBS,
      subcategory_id: B_S_STREAMING,
      amount: 15.99,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-08',
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
      category_id: B_C_SUBS,
      subcategory_id: B_S_STREAMING,
      amount: 10.99,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-09',
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
      category_id: B_C_SUBS,
      subcategory_id: B_S_MEMBERSHIPS,
      amount: 139.0,
      frequency: 'annually',
      frequency_interval: null,
      anchor_date: '2026-03-15',
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
      category_id: B_C_TRANSPORT,
      subcategory_id: B_S_CAR_INS,
      amount: 195.0,
      frequency: 'semi_monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      category_id: B_C_FOOD,
      subcategory_id: B_S_RESTAURANTS,
      amount: 250.0,
      frequency: 'monthly',
      frequency_interval: null,
      anchor_date: '2026-02-01',
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
      target_date: '2026-12-31',
    },
    {
      id: A_GOAL_VACATION,
      user_id: ALPHA_ID,
      account_id: A_TFSA,
      name: 'Summer Vacation',
      target_amount: 3500.0,
      target_date: '2026-06-01',
    },
    {
      id: B_GOAL_DOWN_PMT,
      user_id: BETA_ID,
      account_id: B_SAVINGS,
      name: 'House Down Payment',
      target_amount: 50000.0,
      target_date: '2027-09-01',
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
      origination_date: '2024-08-01',
      payment_amount: 548.0,
    },
    {
      id: B_DEBT_STUDENT,
      user_id: BETA_ID,
      account_id: B_STUDENT_LOAN,
      principal: 35000.0,
      annual_rate: 0.045, // 4.5% APR
      term_months: 120,
      origination_date: '2022-09-01',
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
  // Helper aliases
  const A = ALPHA_ID;

  // September 2025
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-09-03', A_S_SALARY);
  addTx(txns, atx(), A, A_CHECKING, -1800.0, 'Landlord Property Mgmt', '2025-09-01', A_S_RENT, false, true, 'September rent');
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2025-09-01', A_S_GYM);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-09-01', A_S_CAR_INS);
  addTx(txns, atx(), A, A_CHECKING, -11.5, 'Timothy\'s Coffee', '2025-09-03', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -134.28, 'Loblaw Companies', '2025-09-05', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2025-09-08', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2025-09-09', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -58.4, 'Shell Gas Station', '2025-09-09', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -9.25, 'Tim Hortons', '2025-09-10', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -89.15, 'Metro Grocery', '2025-09-12', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -45.6, 'East Side Mario\'s', '2025-09-14', A_S_RESTAURANTS);
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2025-09-15', A_S_INTERNET);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-09-15', A_S_CAR_INS);
  const aSep15LoanTx = atx();
  addDebtPayment(txns, splits, aSep15LoanTx, A, A_CHECKING, 548.0, 408.35, 139.65, 'Toyota Financial Services', '2025-09-15', A_S_LOAN_PMT);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-09-17', A_S_SALARY);
  addTx(txns, atx(), A, A_CHECKING, -13.75, 'Second Cup', '2025-09-17', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -156.3, 'Loblaws', '2025-09-19', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -52.1, 'Esso Gas', '2025-09-19', A_S_GAS);
  addTx(txns, atx(), A, A_VISA, -34.99, 'Amazon.ca', '2025-09-20', A_S_AMAZON);
  addTx(txns, atx(), A, A_CHECKING, -67.8, 'The Keg Steakhouse', '2025-09-22', A_S_RESTAURANTS);
  addTx(txns, atx(), A, A_CHECKING, -12.0, 'Starbucks', '2025-09-24', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -35.0, 'Great Clips', '2025-09-25', A_S_HAIRCUT);
  addTx(txns, atx(), A, A_CHECKING, -108.45, 'No Frills', '2025-09-26', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -61.2, 'Petro Canada', '2025-09-29', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -112.4, 'Toronto Hydro', '2025-09-30', A_S_UTILITIES);
  const aSepCcFromId = atx();
  const aSepCcToId = atx();
  addTransfer(txns, links, aSepCcFromId, aSepCcToId, A, A_CHECKING, A, A_VISA, 1200.0, 'Credit Card Payment', '2025-09-30', A_S_CC_PMT, A_C_TRANSFERS, 'payment');

  // October 2025
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-10-01', A_S_SALARY);
  addTx(txns, atx(), A, A_CHECKING, -1800.0, 'Landlord Property Mgmt', '2025-10-01', A_S_RENT, false, true, 'October rent');
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2025-10-01', A_S_GYM);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-10-01', A_S_CAR_INS);
  addTx(txns, atx(), A, A_CHECKING, -10.5, 'Timothy\'s Coffee', '2025-10-03', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -142.8, 'Loblaws', '2025-10-04', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -54.3, 'Shell Gas Station', '2025-10-07', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2025-10-08', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2025-10-09', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -8.75, 'Tim Hortons', '2025-10-11', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -52.4, 'Jack Astor\'s', '2025-10-14', A_S_RESTAURANTS);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-10-15', A_S_SALARY);
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2025-10-15', A_S_INTERNET);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-10-15', A_S_CAR_INS);
  const aOct15LoanTx = atx();
  addDebtPayment(txns, splits, aOct15LoanTx, A, A_CHECKING, 548.0, 410.36, 137.64, 'Toyota Financial Services', '2025-10-15', A_S_LOAN_PMT);
  addTx(txns, atx(), A, A_CHECKING, -89.35, 'Metro Grocery', '2025-10-16', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -63.1, 'Esso Gas', '2025-10-17', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -122.45, 'Loblaws', '2025-10-17', A_S_GROCERIES);
  addTx(txns, atx(), A, A_VISA, -67.99, 'Amazon.ca', '2025-10-19', A_S_AMAZON, false, true, 'Fall shoes');
  addTx(txns, atx(), A, A_CHECKING, -14.0, 'Second Cup', '2025-10-20', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -78.5, 'Milestones Restaurant', '2025-10-21', A_S_RESTAURANTS);
  addTx(txns, atx(), A, A_VISA, -28.0, 'Cineplex Entertainment', '2025-10-22', A_S_MOVIES);
  addTx(txns, atx(), A, A_CHECKING, -135.2, 'No Frills', '2025-10-25', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -55.8, 'Petro Canada', '2025-10-27', A_S_GAS);
  addTx(txns, atx(), A, A_VISA, -156.49, 'Amazon.ca', '2025-10-30', A_S_CLOTHING, false, true, 'Clothing');
  addTx(txns, atx(), A, A_CHECKING, -118.9, 'Toronto Hydro', '2025-10-31', A_S_UTILITIES);
  const aOctCcFromId = atx();
  const aOctCcToId = atx();
  addTransfer(txns, links, aOctCcFromId, aOctCcToId, A, A_CHECKING, A, A_VISA, 1500.0, 'Credit Card Payment', '2025-10-31', A_S_CC_PMT, A_C_TRANSFERS, 'payment');

  // November 2025
  addTx(txns, atx(), A, A_CHECKING, -1800.0, 'Landlord Property Mgmt', '2025-11-01', A_S_RENT, false, true, 'November rent');
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2025-11-01', A_S_GYM);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-11-01', A_S_CAR_INS);
  addTx(txns, atx(), A, A_CHECKING, 850.0, 'Freelance Client Payment', '2025-11-01', A_S_FREELANCE);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-11-12', A_S_SALARY);
  addTx(txns, atx(), A, A_CHECKING, -12.25, 'Timothy\'s Coffee', '2025-11-05', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -148.6, 'Loblaws', '2025-11-06', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2025-11-08', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2025-11-09', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -59.7, 'Shell Gas Station', '2025-11-11', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -24.95, 'Shoppers Drug Mart', '2025-11-11', A_S_PHARMACY);
  addTx(txns, atx(), A, A_CHECKING, -9.5, 'Tim Hortons', '2025-11-12', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -61.2, 'Boston Pizza', '2025-11-13', A_S_RESTAURANTS);
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2025-11-15', A_S_INTERNET);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-11-15', A_S_CAR_INS);
  const aNov15LoanTx = atx();
  addDebtPayment(txns, splits, aNov15LoanTx, A, A_CHECKING, 548.0, 412.38, 135.62, 'Toyota Financial Services', '2025-11-15', A_S_LOAN_PMT);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-11-26', A_S_SALARY);
  addTx(txns, atx(), A, A_CHECKING, -132.1, 'Metro Grocery', '2025-11-18', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -57.4, 'Petro Canada', '2025-11-20', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -98.45, 'No Frills', '2025-11-21', A_S_GROCERIES);
  addTx(txns, atx(), A, A_VISA, -89.99, 'Amazon.ca', '2025-11-21', A_S_AMAZON, false, true, 'Holiday pre-shopping');
  addTx(txns, atx(), A, A_CHECKING, -35.0, 'Great Clips', '2025-11-24', A_S_HAIRCUT);
  addTx(txns, atx(), A, A_CHECKING, -11.25, 'Starbucks', '2025-11-25', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -54.8, 'The Keg Steakhouse', '2025-11-26', A_S_RESTAURANTS);
  addTx(txns, atx(), A, A_CHECKING, -189.3, 'Loblaws', '2025-11-27', A_S_GROCERIES, false, true, 'Holiday groceries');
  addTx(txns, atx(), A, A_CHECKING, -49.8, 'Esso Gas', '2025-11-28', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -125.7, 'Toronto Hydro', '2025-11-30', A_S_UTILITIES);
  const aNovSavFromId = atx();
  const aNovSavToId = atx();
  addTransfer(txns, links, aNovSavFromId, aNovSavToId, A, A_CHECKING, A, A_EMERGENCY, 500.0, 'Savings Transfer', '2025-11-29', A_C_TRANSFERS, A_C_TRANSFERS, 'transfer');
  const aNovCcFromId = atx();
  const aNovCcToId = atx();
  addTransfer(txns, links, aNovCcFromId, aNovCcToId, A, A_CHECKING, A, A_VISA, 1100.0, 'Credit Card Payment', '2025-11-30', A_S_CC_PMT, A_C_TRANSFERS, 'payment');

  // December 2025
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-12-10', A_S_SALARY);
  addTx(txns, atx(), A, A_CHECKING, -1800.0, 'Landlord Property Mgmt', '2025-12-01', A_S_RENT, false, true, 'December rent');
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2025-12-01', A_S_GYM);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-12-01', A_S_CAR_INS);
  addTx(txns, atx(), A, A_VISA, -245.67, 'Amazon.ca', '2025-12-05', A_S_GIFTS, false, true, 'Holiday gifts');
  addTx(txns, atx(), A, A_CHECKING, -13.5, 'Timothy\'s Coffee', '2025-12-06', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -165.4, 'Loblaws', '2025-12-07', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2025-12-08', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2025-12-09', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -62.3, 'Shell Gas Station', '2025-12-10', A_S_GAS);
  addTx(txns, atx(), A, A_VISA, -129.99, 'Winners / HomeSense', '2025-12-12', A_S_CLOTHING, false, true, 'Winter clothing');
  addTx(txns, atx(), A, A_CHECKING, -10.25, 'Tim Hortons', '2025-12-12', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -142.85, 'Metro Grocery', '2025-12-14', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2025-12-15', A_S_INTERNET);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2025-12-15', A_S_CAR_INS);
  const aDec15LoanTx = atx();
  addDebtPayment(txns, splits, aDec15LoanTx, A, A_CHECKING, 548.0, 414.40, 133.60, 'Toyota Financial Services', '2025-12-15', A_S_LOAN_PMT);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2025-12-24', A_S_SALARY);
  addTx(txns, atx(), A, A_CHECKING, 850.0, 'Freelance Client Payment', '2025-12-24', A_S_FREELANCE, false, true, 'End of year freelance');
  addTx(txns, atx(), A, A_CHECKING, -58.8, 'Esso Gas', '2025-12-17', A_S_GAS);
  addTx(txns, atx(), A, A_VISA, -312.4, 'Amazon.ca', '2025-12-19', A_S_GIFTS, false, true, 'More holiday gifts');
  addTx(txns, atx(), A, A_VISA, -89.5, 'Milestones Restaurant', '2025-12-20', A_S_RESTAURANTS, false, true, 'Holiday dinner');
  addTx(txns, atx(), A, A_CHECKING, -198.25, 'Loblaws', '2025-12-21', A_S_GROCERIES, false, true, 'Christmas groceries');
  addTx(txns, atx(), A, A_CHECKING, -15.0, 'Starbucks', '2025-12-22', A_S_COFFEE);
  addTx(txns, atx(), A, A_VISA, -78.99, 'Amazon.ca', '2025-12-26', A_S_AMAZON, false, true, 'Boxing Day deal');
  addTx(txns, atx(), A, A_CHECKING, -65.1, 'Shell Gas Station', '2025-12-28', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -138.2, 'Toronto Hydro', '2025-12-31', A_S_UTILITIES);
  const aDecCcFromId = atx();
  const aDecCcToId = atx();
  addTransfer(txns, links, aDecCcFromId, aDecCcToId, A, A_CHECKING, A, A_VISA, 2200.0, 'Credit Card Payment', '2025-12-31', A_S_CC_PMT, A_C_TRANSFERS, 'payment');

  // January 2026
  addTx(txns, atx(), A, A_CHECKING, -1800.0, 'Landlord Property Mgmt', '2026-01-01', A_S_RENT, false, true, 'January rent');
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2026-01-01', A_S_GYM);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2026-01-01', A_S_CAR_INS);
  addTx(txns, atx(), A, A_CHECKING, -420.0, 'Aviva Insurance', '2026-01-15', A_S_HOME_INS, false, true, 'Annual tenant insurance');
  addTx(txns, atx(), A, A_CHECKING, -11.5, 'Timothy\'s Coffee', '2026-01-03', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -152.6, 'No Frills', '2026-01-04', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2026-01-07', A_S_SALARY);
  addTx(txns, atx(), A, A_CHECKING, 850.0, 'Freelance Client Payment', '2026-01-07', A_S_FREELANCE);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2026-01-08', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2026-01-09', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -55.6, 'Shell Gas Station', '2026-01-09', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -12.75, 'Tim Hortons', '2026-01-10', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -113.4, 'Metro Grocery', '2026-01-11', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -180.0, 'Sunnybrook Family Health', '2026-01-12', A_S_DOCTOR, false, true, 'Annual physical');
  addTx(txns, atx(), A, A_CHECKING, -42.3, 'Montana\'s BBQ', '2026-01-14', A_S_RESTAURANTS);
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2026-01-15', A_S_INTERNET);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2026-01-15', A_S_CAR_INS);
  const aJan15LoanTx = atx();
  addDebtPayment(txns, splits, aJan15LoanTx, A, A_CHECKING, 548.0, 416.44, 131.56, 'Toyota Financial Services', '2026-01-15', A_S_LOAN_PMT);
  addTx(txns, atx(), A, A_CHECKING, -60.2, 'Petro Canada', '2026-01-17', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -127.85, 'Loblaws', '2026-01-18', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -58.4, 'Esso Gas', '2026-01-19', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -35.0, 'Great Clips', '2026-01-19', A_S_HAIRCUT);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2026-01-21', A_S_SALARY);
  addTx(txns, atx(), A, A_VISA, -45.99, 'Amazon.ca', '2026-01-23', A_S_AMAZON);
  addTx(txns, atx(), A, A_CHECKING, -13.5, 'Second Cup', '2026-01-24', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -139.2, 'No Frills', '2026-01-25', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -72.4, 'Jack Astor\'s', '2026-01-26', A_S_RESTAURANTS);
  addTx(txns, atx(), A, A_CHECKING, -63.7, 'Shell Gas Station', '2026-01-28', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -129.8, 'Toronto Hydro', '2026-01-30', A_S_UTILITIES);
  const aJanCcFromId = atx();
  const aJanCcToId = atx();
  addTransfer(txns, links, aJanCcFromId, aJanCcToId, A, A_CHECKING, A, A_VISA, 1400.0, 'Credit Card Payment', '2026-01-31', A_S_CC_PMT, A_C_TRANSFERS, 'payment');

  // February 2026 (to Feb 24)
  addTx(txns, atx(), A, A_CHECKING, -1800.0, 'Landlord Property Mgmt', '2026-02-01', A_S_RENT, false, true, 'February rent');
  addTx(txns, atx(), A, A_CHECKING, -45.0, 'GoodLife Fitness', '2026-02-01', A_S_GYM);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2026-02-01', A_S_CAR_INS);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2026-02-04', A_S_SALARY);
  addTx(txns, atx(), A, A_CHECKING, 850.0, 'Freelance Client Payment', '2026-02-04', A_S_FREELANCE);
  addTx(txns, atx(), A, A_CHECKING, -10.25, 'Tim Hortons', '2026-02-05', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -148.3, 'Loblaws', '2026-02-06', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -57.8, 'Shell Gas Station', '2026-02-07', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -17.99, 'Netflix', '2026-02-08', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -10.99, 'Spotify', '2026-02-09', A_S_STREAMING);
  addTx(txns, atx(), A, A_CHECKING, -12.0, 'Timothy\'s Coffee', '2026-02-11', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -98.45, 'Metro Grocery', '2026-02-12', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -61.3, 'Petro Canada', '2026-02-13', A_S_GAS);
  addTx(txns, atx(), A, A_VISA, -92.45, 'The Keg Steakhouse', '2026-02-14', A_S_RESTAURANTS, false, true, "Valentine's Day dinner");
  addTx(txns, atx(), A, A_CHECKING, -85.0, 'Rogers Communications', '2026-02-15', A_S_INTERNET);
  addTx(txns, atx(), A, A_CHECKING, -95.0, 'Intact Insurance', '2026-02-15', A_S_CAR_INS);
  const aFeb15LoanTx = atx();
  addDebtPayment(txns, splits, aFeb15LoanTx, A, A_CHECKING, 548.0, 418.49, 129.51, 'Toyota Financial Services', '2026-02-15', A_S_LOAN_PMT);
  addTx(txns, atx(), A, A_CHECKING, -134.6, 'No Frills', '2026-02-17', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, 3200.0, 'Employer Direct Deposit', '2026-02-18', A_S_SALARY);
  addTx(txns, atx(), A, A_CHECKING, -11.75, 'Second Cup', '2026-02-18', A_S_COFFEE);
  addTx(txns, atx(), A, A_CHECKING, -52.4, 'Shell Gas Station', '2026-02-19', A_S_GAS);
  addTx(txns, atx(), A, A_CHECKING, -35.0, 'Great Clips', '2026-02-20', A_S_HAIRCUT);
  addTx(txns, atx(), A, A_CHECKING, -112.8, 'Loblaws', '2026-02-22', A_S_GROCERIES);
  addTx(txns, atx(), A, A_CHECKING, -14.25, 'Starbucks', '2026-02-24', A_S_COFFEE);

  // ── Beta transactions ──────────────────────────────────────────────────────
  const B = BETA_ID;

  // November 2025
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2025-11-01', B_S_SALARY);
  addTx(txns, btx(), B, B_CHECKING, -2150.0, 'Chase Mortgage Auto-Pay', '2025-11-01', B_S_MORTGAGE, false, true, 'November mortgage');
  addTx(txns, btx(), B, B_CHECKING, -25.0, 'Planet Fitness', '2025-11-01', B_S_GYM);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2025-11-01', B_S_CAR_INS);
  const bNovStudentTx = btx();
  addDebtPayment(txns, splits, bNovStudentTx, B, B_CHECKING, 363.0, 267.16, 95.84, 'Federal Student Aid', '2025-11-01', B_S_LOAN_PMT);
  addTx(txns, btx(), B, B_CHECKING, -9.5, 'Dunkin Donuts', '2025-11-03', B_S_COFFEE);
  addTx(txns, btx(), B, B_CHECKING, -187.42, 'Whole Foods Market', '2025-11-04', B_S_GROCERIES);
  addTx(txns, btx(), B, B_CHECKING, -15.99, 'Netflix', '2025-11-08', B_S_STREAMING);
  addTx(txns, btx(), B, B_CHECKING, -10.99, 'Spotify', '2025-11-09', B_S_STREAMING);
  addTx(txns, btx(), B, B_CHECKING, -62.4, 'Shell Gas Station', '2025-11-10', B_S_GAS);
  addTx(txns, btx(), B, B_CHECKING, 600.0, 'Freelance Project', '2025-11-12', B_S_FREELANCE);
  addTx(txns, btx(), B, B_CHECKING, -11.0, 'Starbucks', '2025-11-12', B_S_COFFEE);
  addTx(txns, btx(), B, B_CHECKING, -68.9, 'Olive Garden', '2025-11-14', B_S_RESTAURANTS);
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2025-11-15', B_S_SALARY);
  addTx(txns, btx(), B, B_CHECKING, -90.0, 'Comcast Xfinity', '2025-11-15', B_S_INTERNET);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2025-11-15', B_S_CAR_INS);
  addTx(txns, btx(), B, B_CHECKING, -148.65, 'Kroger', '2025-11-17', B_S_GROCERIES);
  addTx(txns, btx(), B, B_CHECKING, -59.2, 'Chevron Gas', '2025-11-20', B_S_GAS);
  addTx(txns, btx(), B, B_CHECKING, -122.3, 'Whole Foods Market', '2025-11-21', B_S_GROCERIES);
  addTx(txns, btx(), B, B_DISCOVER, -89.99, 'Amazon.com', '2025-11-21', B_S_AMAZON, false, true, 'Pre-holiday shopping');
  addTx(txns, btx(), B, B_CHECKING, -134.0, 'ConEdison', '2025-11-25', B_S_UTILITIES, false, true, 'Electric + gas bill');
  addTx(txns, btx(), B, B_CHECKING, -210.4, 'Whole Foods Market', '2025-11-27', B_S_GROCERIES, false, true, 'Thanksgiving groceries');
  addTx(txns, btx(), B, B_DISCOVER, -112.5, 'Target.com', '2025-11-28', B_S_GIFTS, false, true, 'Black Friday');
  addTx(txns, btx(), B, B_CHECKING, -28.0, 'Regal Cinemas', '2025-11-29', B_S_MOVIES);
  const bNovCcFromId = btx();
  const bNovCcToId = btx();
  addTransfer(txns, links, bNovCcFromId, bNovCcToId, B, B_CHECKING, B, B_DISCOVER, 900.0, 'Credit Card Payment', '2025-11-30', B_S_CC_PMT, B_C_TRANSFERS, 'payment');

  // December 2025
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2025-12-01', B_S_SALARY);
  addTx(txns, btx(), B, B_CHECKING, -2150.0, 'Chase Mortgage Auto-Pay', '2025-12-01', B_S_MORTGAGE, false, true, 'December mortgage');
  addTx(txns, btx(), B, B_CHECKING, -25.0, 'Planet Fitness', '2025-12-01', B_S_GYM);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2025-12-01', B_S_CAR_INS);
  const bDecStudentTx = btx();
  addDebtPayment(txns, splits, bDecStudentTx, B, B_CHECKING, 363.0, 268.16, 94.84, 'Federal Student Aid', '2025-12-01', B_S_LOAN_PMT);
  addTx(txns, btx(), B, B_DISCOVER, -278.45, 'Amazon.com', '2025-12-05', B_S_GIFTS, false, true, 'Christmas gifts');
  addTx(txns, btx(), B, B_CHECKING, -14.0, 'Dunkin Donuts', '2025-12-06', B_S_COFFEE);
  addTx(txns, btx(), B, B_CHECKING, -163.2, 'Trader Joe\'s', '2025-12-07', B_S_GROCERIES);
  addTx(txns, btx(), B, B_CHECKING, -15.99, 'Netflix', '2025-12-08', B_S_STREAMING);
  addTx(txns, btx(), B, B_CHECKING, -10.99, 'Spotify', '2025-12-09', B_S_STREAMING);
  addTx(txns, btx(), B, B_CHECKING, 600.0, 'Freelance Project', '2025-12-10', B_S_FREELANCE);
  addTx(txns, btx(), B, B_CHECKING, -71.8, 'Chevron Gas', '2025-12-10', B_S_GAS);
  addTx(txns, btx(), B, B_DISCOVER, -199.99, 'Best Buy', '2025-12-12', B_S_ELECTRONICS, false, true, 'Christmas gift');
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2025-12-15', B_S_SALARY);
  addTx(txns, btx(), B, B_CHECKING, -90.0, 'Comcast Xfinity', '2025-12-15', B_S_INTERNET);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2025-12-15', B_S_CAR_INS);
  addTx(txns, btx(), B, B_CHECKING, -178.9, 'Whole Foods Market', '2025-12-17', B_S_GROCERIES);
  addTx(txns, btx(), B, B_CHECKING, -67.3, 'Shell Gas Station', '2025-12-18', B_S_GAS);
  addTx(txns, btx(), B, B_CHECKING, -218.6, 'Whole Foods Market', '2025-12-21', B_S_GROCERIES, false, true, 'Christmas groceries');
  addTx(txns, btx(), B, B_DISCOVER, -108.5, 'Pottery Barn', '2025-12-22', B_S_HOME_GARDEN, false, true, 'Christmas decor');
  addTx(txns, btx(), B, B_CHECKING, -153.8, 'ConEdison', '2025-12-28', B_S_UTILITIES);
  const bDecSavFromId = btx();
  const bDecSavToId = btx();
  addTransfer(txns, links, bDecSavFromId, bDecSavToId, B, B_CHECKING, B, B_SAVINGS, 800.0, 'Transfer to Savings', '2025-12-30', B_C_TRANSFERS, B_C_TRANSFERS, 'transfer');
  const bDecCcFromId = btx();
  const bDecCcToId = btx();
  addTransfer(txns, links, bDecCcFromId, bDecCcToId, B, B_CHECKING, B, B_DISCOVER, 1400.0, 'Credit Card Payment', '2025-12-31', B_S_CC_PMT, B_C_TRANSFERS, 'payment');

  // January 2026
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2026-01-01', B_S_SALARY);
  addTx(txns, btx(), B, B_CHECKING, -2150.0, 'Chase Mortgage Auto-Pay', '2026-01-01', B_S_MORTGAGE, false, true, 'January mortgage');
  addTx(txns, btx(), B, B_CHECKING, -25.0, 'Planet Fitness', '2026-01-01', B_S_GYM);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2026-01-01', B_S_CAR_INS);
  const bJanStudentTx = btx();
  addDebtPayment(txns, splits, bJanStudentTx, B, B_CHECKING, 363.0, 269.17, 93.83, 'Federal Student Aid', '2026-01-01', B_S_LOAN_PMT);
  addTx(txns, btx(), B, B_CHECKING, -10.5, 'Starbucks', '2026-01-03', B_S_COFFEE);
  addTx(txns, btx(), B, B_CHECKING, -155.7, 'Trader Joe\'s', '2026-01-05', B_S_GROCERIES);
  addTx(txns, btx(), B, B_DISCOVER, -42.99, 'Amazon.com', '2026-01-06', B_S_AMAZON);
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2026-01-15', B_S_SALARY);
  addTx(txns, btx(), B, B_CHECKING, -15.99, 'Netflix', '2026-01-08', B_S_STREAMING);
  addTx(txns, btx(), B, B_CHECKING, -10.99, 'Spotify', '2026-01-09', B_S_STREAMING);
  addTx(txns, btx(), B, B_CHECKING, -63.4, 'Chevron Gas', '2026-01-10', B_S_GAS);
  addTx(txns, btx(), B, B_CHECKING, 600.0, 'Freelance Project', '2026-01-12', B_S_FREELANCE);
  addTx(txns, btx(), B, B_CHECKING, -75.6, 'The Cheesecake Factory', '2026-01-14', B_S_RESTAURANTS);
  addTx(txns, btx(), B, B_CHECKING, -90.0, 'Comcast Xfinity', '2026-01-15', B_S_INTERNET);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2026-01-15', B_S_CAR_INS);
  addTx(txns, btx(), B, B_CHECKING, -132.8, 'Kroger', '2026-01-17', B_S_GROCERIES);
  addTx(txns, btx(), B, B_CHECKING, -68.5, 'Shell Gas Station', '2026-01-19', B_S_GAS);
  addTx(txns, btx(), B, B_CHECKING, -38.0, 'Regal Cinemas', '2026-01-21', B_S_MOVIES);
  addTx(txns, btx(), B, B_CHECKING, -148.2, 'Whole Foods Market', '2026-01-22', B_S_GROCERIES);
  addTx(txns, btx(), B, B_CHECKING, -145.0, 'ConEdison', '2026-01-26', B_S_UTILITIES);
  addTx(txns, btx(), B, B_CHECKING, -62.3, 'Chevron Gas', '2026-01-28', B_S_GAS);
  const bJanCcFromId = btx();
  const bJanCcToId = btx();
  addTransfer(txns, links, bJanCcFromId, bJanCcToId, B, B_CHECKING, B, B_DISCOVER, 800.0, 'Credit Card Payment', '2026-01-31', B_S_CC_PMT, B_C_TRANSFERS, 'payment');

  // February 2026 (to Feb 24)
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2026-02-01', B_S_SALARY);
  addTx(txns, btx(), B, B_CHECKING, -2150.0, 'Chase Mortgage Auto-Pay', '2026-02-01', B_S_MORTGAGE, false, true, 'February mortgage');
  addTx(txns, btx(), B, B_CHECKING, -25.0, 'Planet Fitness', '2026-02-01', B_S_GYM);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2026-02-01', B_S_CAR_INS);
  const bFebStudentTx = btx();
  addDebtPayment(txns, splits, bFebStudentTx, B, B_CHECKING, 363.0, 270.18, 92.82, 'Federal Student Aid', '2026-02-01', B_S_LOAN_PMT);
  addTx(txns, btx(), B, B_CHECKING, -11.25, 'Dunkin Donuts', '2026-02-03', B_S_COFFEE);
  addTx(txns, btx(), B, B_CHECKING, -162.45, 'Whole Foods Market', '2026-02-04', B_S_GROCERIES);
  addTx(txns, btx(), B, B_CHECKING, -59.8, 'Shell Gas Station', '2026-02-05', B_S_GAS);
  addTx(txns, btx(), B, B_CHECKING, 600.0, 'Freelance Project', '2026-02-07', B_S_FREELANCE);
  addTx(txns, btx(), B, B_CHECKING, -15.99, 'Netflix', '2026-02-08', B_S_STREAMING);
  addTx(txns, btx(), B, B_CHECKING, -10.99, 'Spotify', '2026-02-09', B_S_STREAMING);
  addTx(txns, btx(), B, B_CHECKING, -12.5, 'Starbucks', '2026-02-10', B_S_COFFEE);
  addTx(txns, btx(), B, B_CHECKING, -138.9, 'Trader Joe\'s', '2026-02-11', B_S_GROCERIES);
  addTx(txns, btx(), B, B_CHECKING, -67.1, 'Chevron Gas', '2026-02-13', B_S_GAS);
  addTx(txns, btx(), B, B_DISCOVER, -178.9, 'OpenTable Restaurant', '2026-02-14', B_S_RESTAURANTS, false, true, "Valentine's Day dinner");
  addTx(txns, btx(), B, B_CHECKING, 4800.0, 'Acme Corp - Direct Deposit', '2026-02-15', B_S_SALARY);
  addTx(txns, btx(), B, B_CHECKING, -90.0, 'Comcast Xfinity', '2026-02-15', B_S_INTERNET);
  addTx(txns, btx(), B, B_CHECKING, -195.0, 'GEICO Insurance', '2026-02-15', B_S_CAR_INS);
  addTx(txns, btx(), B, B_CHECKING, -182.3, 'Kroger', '2026-02-17', B_S_GROCERIES);
  addTx(txns, btx(), B, B_CHECKING, -72.4, 'Shell Gas Station', '2026-02-19', B_S_GAS);
  addTx(txns, btx(), B, B_CHECKING, -155.6, 'Whole Foods Market', '2026-02-22', B_S_GROCERIES);
  addTx(txns, btx(), B, B_CHECKING, -14.75, 'Dunkin Donuts', '2026-02-24', B_S_COFFEE);

  // ── Insert all transactions in batches ────────────────────────────────────
  console.log(
    `[dev_seed] Inserting ${txns.length} transactions, ${links.length} links, ${splits.length} splits...`,
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
  console.log(`  Transactions: ${txns.length} (${links.length} linked transfers, ${splits.length} debt splits)`);
  console.log('');
  console.log('  Test credentials:');
  console.log('    mike+alpha@thebutchers.ca / test123  (CAD · en-CA · Toronto)');
  console.log('    mike+beta@thebutchers.ca  / test123  (USD · en-US · New York)');
  console.log('');
}
