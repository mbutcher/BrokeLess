// ─── Accounts ────────────────────────────────────────────────────────────────

export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'loan'
  | 'line_of_credit'
  | 'mortgage'
  | 'investment'
  | 'other';

export interface Account {
  id: string;
  userId: string;
  name: string;
  type: AccountType;
  isAsset: boolean;
  startingBalance: number;
  currentBalance: number;
  currency: string;
  color: string | null;
  institution: string | null;
  /** Decimal fraction: 0.0525 = 5.25% APR/APY. Null if not set. */
  annualRate: number | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAccountData {
  userId: string;
  name: string;
  type: AccountType;
  isAsset: boolean;
  startingBalance: number;
  currency: string;
  color?: string;
  institution?: string;
  annualRate?: number;
}

export interface UpdateAccountData {
  name?: string;
  type?: AccountType;
  isAsset?: boolean;
  startingBalance?: number;
  currency?: string;
  color?: string | null;
  institution?: string | null;
  isActive?: boolean;
  annualRate?: number | null;
}

// ─── Categories ───────────────────────────────────────────────────────────────

export interface Category {
  id: string;
  userId: string;
  name: string;
  color: string | null;
  icon: string | null;
  isIncome: boolean;
  parentId: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateCategoryData {
  userId: string;
  name: string;
  color?: string;
  icon?: string;
  isIncome: boolean;
  parentId?: string;
}

export interface UpdateCategoryData {
  name?: string;
  color?: string | null;
  icon?: string | null;
  isActive?: boolean;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  /** AES-256-GCM encrypted at rest */
  description: string | null;
  /** AES-256-GCM encrypted at rest */
  payee: string | null;
  /** AES-256-GCM encrypted at rest */
  notes: string | null;
  date: Date;
  categoryId: string | null;
  isTransfer: boolean;
  isCleared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Decrypted shape returned in API responses */
export interface PublicTransaction
  extends Omit<Transaction, 'description' | 'payee' | 'notes'> {
  description: string | null;
  payee: string | null;
  notes: string | null;
}

export interface CreateTransactionData {
  userId: string;
  accountId: string;
  amount: number;
  description?: string;
  payee?: string;
  notes?: string;
  date: string; // ISO date string 'YYYY-MM-DD'
  categoryId?: string;
  /** Set when importing from SimpleFIN — used for deduplication on subsequent syncs */
  simplefinTransactionId?: string;
}

export interface UpdateTransactionData {
  accountId?: string;
  amount?: number;
  description?: string | null;
  payee?: string | null;
  notes?: string | null;
  date?: string;
  categoryId?: string | null;
  isCleared?: boolean;
}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  isTransfer?: boolean;
  page: number;
  limit: number;
}

// ─── Transaction Links ────────────────────────────────────────────────────────

export type LinkType = 'transfer' | 'payment' | 'refund';

export interface TransactionLink {
  id: string;
  fromTransactionId: string;
  toTransactionId: string;
  linkType: LinkType;
  createdAt: Date;
}

/** Auto-detected transfer candidate (computed, not a DB row) */
export interface TransferCandidate {
  transaction: PublicTransaction;
  account: Account;
}

// ─── Budgets ─────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  userId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetCategory {
  id: string;
  budgetId: string;
  categoryId: string;
  allocatedAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetCategoryProgress {
  category: Category;
  allocated: number;
  spent: number;
  remaining: number;
}

export interface BudgetProgress {
  budget: Budget;
  categories: BudgetCategoryProgress[];
  totalAllocated: number;
  totalSpent: number;
  totalRemaining: number;
}

export interface CreateBudgetData {
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdateBudgetData {
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface BudgetCategoryEntry {
  categoryId: string;
  allocatedAmount: number;
}

// ─── Debt Schedules ───────────────────────────────────────────────────────────

export interface DebtSchedule {
  id: string;
  userId: string;
  accountId: string;
  /** Original loan amount */
  principal: number;
  /** Decimal fraction: 0.065 = 6.5% APR */
  annualRate: number;
  termMonths: number;
  originationDate: string; // YYYY-MM-DD
  paymentAmount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertDebtScheduleData {
  accountId: string;
  principal: number;
  annualRate: number;
  termMonths: number;
  originationDate: string;
  paymentAmount: number;
}

export interface AmortizationRow {
  month: number;
  payment: number;
  principal: number;
  interest: number;
  balance: number;
}

export interface AmortizationSchedule {
  schedule: AmortizationRow[];
  totalInterest: number;
  payoffDate: string; // YYYY-MM-DD
}

export interface WhatIfResult {
  originalPayoffDate: string;
  newPayoffDate: string;
  monthsSaved: number;
  interestSaved: number;
}

// ─── Transaction Splits ───────────────────────────────────────────────────────

export interface TransactionSplit {
  id: string;
  transactionId: string;
  principalAmount: number;
  interestAmount: number;
  createdAt: Date;
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string;
  userId: string;
  accountId: string;
  name: string;
  targetAmount: number;
  targetDate: string | null; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSavingsGoalData {
  userId: string;
  accountId: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
}

export interface UpdateSavingsGoalData {
  name?: string;
  targetAmount?: number;
  targetDate?: string | null;
}

export interface SavingsGoalProgress {
  goalId: string;
  name: string;
  currentAmount: number;
  targetAmount: number;
  percentComplete: number;
  daysToGoal: number | null;
  projectedDate: string | null; // YYYY-MM-DD
}

// ─── Budget Lines ─────────────────────────────────────────────────────────────

export type BudgetLineFrequency =
  | 'weekly'
  | 'biweekly'
  | 'semi_monthly'
  | 'monthly'
  | 'every_n_days'
  | 'annually'
  | 'one_time';

export type BudgetLineClassification = 'income' | 'expense';
export type BudgetLineFlexibility = 'fixed' | 'flexible';

export interface BudgetLine {
  id: string;
  userId: string;
  name: string;
  classification: BudgetLineClassification;
  flexibility: BudgetLineFlexibility;
  categoryId: string;
  subcategoryId: string | null;
  amount: number;
  frequency: BudgetLineFrequency;
  /** Only set when frequency = 'every_n_days'. Number of days between occurrences. */
  frequencyInterval: number | null;
  /** First/next known occurrence date — establishes the recurrence cycle. YYYY-MM-DD */
  anchorDate: string;
  /** True on at most one income Budget Line — drives "This Pay Period" view. */
  isPayPeriodAnchor: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateBudgetLineData {
  userId: string;
  name: string;
  classification: BudgetLineClassification;
  flexibility: BudgetLineFlexibility;
  categoryId: string;
  subcategoryId?: string | null;
  amount: number;
  frequency: BudgetLineFrequency;
  frequencyInterval?: number | null;
  anchorDate: string;
  isPayPeriodAnchor?: boolean;
  notes?: string | null;
}

export interface UpdateBudgetLineData {
  name?: string;
  classification?: BudgetLineClassification;
  flexibility?: BudgetLineFlexibility;
  categoryId?: string;
  subcategoryId?: string | null;
  amount?: number;
  frequency?: BudgetLineFrequency;
  frequencyInterval?: number | null;
  anchorDate?: string;
  isPayPeriodAnchor?: boolean;
  notes?: string | null;
  isActive?: boolean;
}

/**
 * A specific dated instance of a Budget Line, computed from its Schedule.
 * MVP: computed on the fly; not persisted.
 */
export interface Occurrence {
  budgetLineId: string;
  dueDate: string; // YYYY-MM-DD
  expectedAmount: number;
  /** upcoming: in the future; missed: due date passed with no matching transaction */
  status: 'upcoming' | 'missed';
}

/**
 * A single row in a Budget View: the prorated plan + actual spend + variance
 * for one Budget Line within the view window.
 */
export interface BudgetViewLine {
  budgetLine: BudgetLine;
  /** Budget Line amount normalized to the view window via annual proration. */
  proratedAmount: number;
  /** Sum of matching transactions in the category (and subcategory if set) within the window. */
  actualAmount: number;
  /** proratedAmount − actualAmount. Negative = overspent (expenses) or under-received (income). */
  variance: number;
  /** Occurrences of this Budget Line that fall within the view window. */
  occurrences: Occurrence[];
}

/** Computed Budget View — not stored. */
export interface BudgetView {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  lines: BudgetViewLine[];
  totalProratedIncome: number;
  totalProratedExpenses: number;
  totalActualIncome: number;
  totalActualExpenses: number;
}

/** The current pay period boundaries, derived from the anchor income Budget Line. */
export interface PayPeriod {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD
  budgetLineId: string;
  frequency: BudgetLineFrequency;
}

// ─── Recurring Transactions ───────────────────────────────────────────────────

export type RecurringFrequency =
  | 'weekly'
  | 'biweekly'
  | 'semi_monthly'
  | 'monthly'
  | 'every_n_days'
  | 'annually';

export interface RecurringTransaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  /** AES-256-GCM encrypted at rest */
  description: string | null;
  /** AES-256-GCM encrypted at rest */
  payee: string | null;
  /** AES-256-GCM encrypted at rest */
  notes: string | null;
  categoryId: string | null;
  frequency: RecurringFrequency;
  /** Only set when frequency = 'every_n_days'. */
  frequencyInterval: number | null;
  /** First/next known occurrence date — YYYY-MM-DD */
  anchorDate: string;
  /** Next computed occurrence date — YYYY-MM-DD */
  nextDueDate: string;
  /** Optional end date — null = indefinite. YYYY-MM-DD */
  endDate: string | null;
  isActive: boolean;
  lastGeneratedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateRecurringTransactionData {
  userId: string;
  accountId: string;
  amount: number;
  description?: string;
  payee?: string;
  notes?: string;
  categoryId?: string;
  frequency: RecurringFrequency;
  frequencyInterval?: number;
  anchorDate: string;
  endDate?: string;
}

export interface UpdateRecurringTransactionData {
  accountId?: string;
  amount?: number;
  description?: string | null;
  payee?: string | null;
  notes?: string | null;
  categoryId?: string | null;
  frequency?: RecurringFrequency;
  frequencyInterval?: number | null;
  anchorDate?: string;
  nextDueDate?: string;
  endDate?: string | null;
  isActive?: boolean;
}

// ─── Net Worth Snapshots ──────────────────────────────────────────────────────

export interface NetWorthSnapshot {
  id: string;
  userId: string;
  snapshotDate: string; // YYYY-MM-DD
  totalAssets: number;
  totalLiabilities: number;
  netWorth: number;
  createdAt: Date;
}

// ─── Spending by Category ─────────────────────────────────────────────────────

export interface SpendingByCategoryItem {
  categoryId: string;
  categoryName: string;
  parentId: string | null;
  color: string | null;
  totalAmount: number;
  percentage: number;
}

export interface SpendingByCategoryResponse {
  start: string;
  end: string;
  type: 'expense' | 'income';
  total: number;
  categories: SpendingByCategoryItem[];
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

export interface ForecastMonth {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  isForecast: true;
}

// ─── SimpleFIN Integration ────────────────────────────────────────────────────

export interface SimplefinConnection {
  id: string;
  userId: string;
  lastSyncAt: string | null;
  lastSyncStatus: 'success' | 'error' | 'pending' | null;
  lastSyncError: string | null;
  autoSyncEnabled: boolean;
  autoSyncIntervalHours: number;
  autoSyncWindowStart: number; // Hour 0–23
  autoSyncWindowEnd: number;   // Hour 0–23
  /** JSON array of SimpleFIN tx IDs the user discarded (stored as string, parsed in service) */
  discardedIdsJson: string | null;
  createdAt: Date;
  updatedAt: Date;
  // NOTE: accessUrlEncrypted is stored in DB but NEVER included in this interface
}

export interface SimplefinAccountMapping {
  id: string;
  userId: string;
  simplefinAccountId: string;
  simplefinOrgName: string;    // Bank name for display
  simplefinAccountName: string;
  simplefinAccountType: string;
  localAccountId: string | null; // null = not yet mapped by user
  createdAt: Date;
  updatedAt: Date;
}

export interface SimplefinPendingReview {
  id: string;
  userId: string;
  simplefinTransactionId: string;
  /** Decrypted SimpleFIN transaction JSON — populated by repository before returning to service */
  rawData: import('./simplefin.types').SimplefinTransaction;
  candidateTransactionId: string | null;
  /** Local BudgetApp account this transaction belongs to — set when review is created during sync */
  localAccountId: string | null;
  similarityScore: number; // 0.0–1.0
  createdAt: Date;
}

export interface SyncResult {
  imported: number;
  skipped: number;
  pendingReviews: number;
  unmappedAccounts: number;
}

export interface MapAccountData {
  action: 'create' | 'link';
  localAccountId?: string;  // for 'link'
  newAccount?: {
    name: string;
    type: AccountType;
    isAsset: boolean;
    currency: string;
    color?: string;
  };  // for 'create'
}

export interface UpdateSimplefinScheduleData {
  autoSyncEnabled: boolean;
  autoSyncIntervalHours: number;
  autoSyncWindowStart: number;
  autoSyncWindowEnd: number;
}

// ─── Offline Sync ─────────────────────────────────────────────────────────────

/** Payload returned by GET /api/v1/sync — full or delta snapshot of all user data. */
export interface SyncPayload {
  accounts: Account[];
  categories: Category[];
  /** Transactions with sensitive fields (payee/description/notes) decrypted */
  transactions: PublicTransaction[];
  budgets: Budget[];
  budgetCategories: BudgetCategory[];
  savingsGoals: SavingsGoal[];
  /** ISO 8601 timestamp — client stores this as the cursor for the next delta sync */
  syncedAt: string;
}

// ─── Exchange Rates ───────────────────────────────────────────────────────────

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  fetchedDate: string; // YYYY-MM-DD
  /** True when rate is older than 24 hours */
  isStale: boolean;
}
