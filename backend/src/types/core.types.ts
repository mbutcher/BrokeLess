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
  householdId: string;
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
  householdId: string;
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
  /** Optional link to a budget line — set when this transaction was used to create one. */
  budgetLineId: string | null;
  isTransfer: boolean;
  isCleared: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/** Decrypted shape returned in API responses */
export interface PublicTransaction extends Omit<Transaction, 'description' | 'payee' | 'notes'> {
  description: string | null;
  payee: string | null;
  notes: string | null;
  /** Plaintext freeform tags — enriched post-fetch by the service layer */
  tags: string[];
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
  tags?: string[];
}

export interface UpdateTransactionData {
  accountId?: string;
  amount?: number;
  description?: string | null;
  payee?: string | null;
  notes?: string | null;
  date?: string;
  categoryId?: string | null;
  budgetLineId?: string | null;
  isCleared?: boolean;
  tags?: string[];
}

export interface TransactionFilters {
  accountId?: string;
  categoryId?: string;
  budgetLineId?: string;
  startDate?: string;
  endDate?: string;
  isTransfer?: boolean;
  /** Plaintext full-text search query. Matched against payee and description via HMAC token index. */
  q?: string;
  /** Filter by a single tag (exact match, lowercase) */
  tag?: string;
  page: number;
  limit: number;
}

// ─── Categorization Rules ─────────────────────────────────────────────────────

export interface CategorizationRule {
  id: string;
  userId: string;
  /** Plaintext payee — decrypted in API responses */
  payee: string;
  categoryId: string | null;
  budgetLineId: string | null;
  createdAt: Date;
  updatedAt: Date;
}

/** Raw DB row before decryption */
export interface CategorizationRuleRow {
  id: string;
  user_id: string;
  payee_encrypted: string;
  token_hashes: string; // JSON
  category_id: string | null;
  budget_line_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateCategorizationRuleData {
  userId: string;
  payee: string;
  categoryId?: string | null;
  budgetLineId?: string | null;
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

export type MinimumPaymentType = 'fixed' | 'percentage' | 'greater_of' | 'lesser_of';

export type PaymentFrequency = 'weekly' | 'biweekly' | 'semimonthly' | 'monthly';

export interface DebtSchedule {
  id: string;
  userId: string;
  accountId: string;

  // ── Loan / Mortgage — full mode ─────────────────────────────────────────
  /** Original loan amount (null for CC/LOC; for simplified mode this is the current balance) */
  principal: number | null;
  /** Purchase APR as a decimal fraction: 0.065 = 6.5% (required for all types) */
  annualRate: number;
  /** Loan term in months (null for CC/LOC) */
  termMonths: number | null;
  /** Loan start date (null for CC/LOC and simplified mode) */
  originationDate: string | null; // YYYY-MM-DD
  /** Fixed per-period payment (null for CC/LOC) */
  paymentAmount: number | null;
  /** Payment frequency for loan amortization (null treated as monthly) */
  paymentFrequency: PaymentFrequency | null;

  // ── Loan / Mortgage — simplified mode ───────────────────────────────────
  /** true = principal holds current balance as of asOfDate, not original loan amount */
  isSimplified: boolean;
  /** Snapshot date for simplified balance entry */
  asOfDate: string | null; // YYYY-MM-DD

  // ── Credit Card / Line of Credit ─────────────────────────────────────────
  /** Cash-advance APR (null for loans) */
  cashAdvanceRate: number | null;
  minimumPaymentType: MinimumPaymentType | null;
  minimumPaymentAmount: number | null;
  minimumPaymentPercent: number | null;
  creditLimit: number | null;

  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertDebtScheduleData {
  accountId: string;
  annualRate: number;
  // Loan / Mortgage
  principal?: number | null;
  termMonths?: number | null;
  originationDate?: string | null;
  paymentAmount?: number | null;
  paymentFrequency?: PaymentFrequency | null;
  isSimplified?: boolean;
  asOfDate?: string | null;
  // CC / LOC
  cashAdvanceRate?: number | null;
  minimumPaymentType?: MinimumPaymentType | null;
  minimumPaymentAmount?: number | null;
  minimumPaymentPercent?: number | null;
  creditLimit?: number | null;
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
  /** Optional link to a budget line — used to derive projected completion rate. */
  budgetLineId: string | null;
  name: string;
  targetAmount: number;
  targetDate: string | null; // YYYY-MM-DD
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateSavingsGoalData {
  userId: string;
  accountId: string;
  budgetLineId?: string | null;
  name: string;
  targetAmount: number;
  targetDate?: string;
}

export interface UpdateSavingsGoalData {
  name?: string;
  targetAmount?: number;
  targetDate?: string | null;
  budgetLineId?: string | null;
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
  | 'twice_monthly'
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
  /** Optional account this expense is drawn from (used for overdraft projections). */
  accountId: string | null;
  amount: number;
  frequency: BudgetLineFrequency;
  /** Only set when frequency = 'every_n_days'. Number of days between occurrences. */
  frequencyInterval: number | null;
  /** First day-of-month for 'twice_monthly' frequency (1–28, or 31 = last day). */
  dayOfMonth1: number | null;
  /** Second day-of-month for 'twice_monthly' frequency (must be > dayOfMonth1; 31 = last day). */
  dayOfMonth2: number | null;
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
  accountId?: string | null;
  amount: number;
  frequency: BudgetLineFrequency;
  frequencyInterval?: number | null;
  dayOfMonth1?: number | null;
  dayOfMonth2?: number | null;
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
  accountId?: string | null;
  amount?: number;
  frequency?: BudgetLineFrequency;
  frequencyInterval?: number | null;
  dayOfMonth1?: number | null;
  dayOfMonth2?: number | null;
  anchorDate?: string;
  isPayPeriodAnchor?: boolean;
  notes?: string | null;
  isActive?: boolean;
}

// ─── Upcoming Expenses ────────────────────────────────────────────────────────

export interface UpcomingFixedItem {
  budgetLineId: string;
  name: string;
  amount: number;
  date: string; // YYYY-MM-DD occurrence date
  categoryId: string;
  subcategoryId: string | null;
  accountId: string | null;
  accountName: string | null;
}

export interface UpcomingFlexibleItem {
  budgetLineId: string;
  name: string;
  fullPeriodAmount: number;
  proratedAmount: number;
  frequency: string;
  categoryId: string;
}

export interface UpcomingExpensesResponse {
  start: string;
  end: string;
  fixedItems: UpcomingFixedItem[];
  flexibleItems: UpcomingFlexibleItem[];
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
  end: string; // YYYY-MM-DD
  lines: BudgetViewLine[];
  totalProratedIncome: number;
  totalProratedExpenses: number;
  totalActualIncome: number;
  totalActualExpenses: number;
}

/** The current pay period boundaries, derived from the anchor income Budget Line. */
export interface PayPeriod {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
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

// ─── Top Payees ───────────────────────────────────────────────────────────────

export interface TopPayeeItem {
  payee: string;
  totalAmount: number;
  percentage: number;
}

export interface TopPayeesResponse {
  start: string;
  end: string;
  type: 'expense' | 'income';
  total: number;
  payees: TopPayeeItem[];
}

// ─── Tag Summary ──────────────────────────────────────────────────────────────

export interface TagSummaryItem {
  tag: string;
  totalAmount: number;
  percentage: number;
  count: number;
}

export interface TagSummaryResponse {
  start: string;
  end: string;
  type: 'expense' | 'income';
  total: number;
  tags: TagSummaryItem[];
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
  autoSyncWindowEnd: number; // Hour 0–23
  createdAt: Date;
  updatedAt: Date;
  // NOTE: accessUrlEncrypted is stored in DB but NEVER included in this interface
}

export interface SimplefinAccountMapping {
  id: string;
  userId: string;
  simplefinAccountId: string;
  simplefinOrgName: string; // Bank name for display
  simplefinAccountName: string;
  simplefinAccountType: string;
  localAccountId: string | null; // null = not yet mapped by user
  ignored: boolean;
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
  /** Total transactions returned by SimpleFIN (across all accounts) */
  total: number;
}

export interface MapAccountData {
  action: 'create' | 'link';
  localAccountId?: string; // for 'link'
  newAccount?: {
    name: string;
    type: AccountType;
    isAsset: boolean;
    currency: string;
    color?: string;
  }; // for 'create'
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
  budgetLines: BudgetLine[];
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

// ─── Dashboard Config ─────────────────────────────────────────────────────────

export type WidgetId =
  | 'warnings'
  | 'net-worth'
  | 'account-balances'
  | 'budget-snapshot'
  | 'upcoming-expenses'
  | 'monthly-chart'
  | 'savings-goals'
  | 'recent-transactions'
  | 'hints'
  | 'spending-by-category'
  | 'debt-payoff'
  | 'tag-summary';

export interface GridLayoutItem {
  i: WidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardLayouts {
  xs: GridLayoutItem[];
  sm: GridLayoutItem[];
  lg: GridLayoutItem[];
  xl: GridLayoutItem[];
}

export interface DashboardConfig {
  userId: string;
  widgetVisibility: Record<WidgetId, boolean>;
  excludedAccountIds: string[];
  layouts: DashboardLayouts;
  updatedAt: Date;
  /** Keys: "YYYY-MM-DD_YYYY-MM-DD" (previousStart_previousEnd). Values: ISO ack timestamp. */
  acknowledgedRollovers: Record<string, string>;
  /** ISO timestamp of last annual budget line review. Null = never reviewed. */
  budgetLinesLastReviewedAt: Date | null;
}

export interface DashboardHint {
  id: string;
  type: string;
  message: string;
  linkTo?: string;
  /** Optional extra structured data (e.g. period dates for rollover hint). */
  meta?: Record<string, string>;
}

// ─── Rollover Summary ─────────────────────────────────────────────────────────

export interface RolloverLine {
  budgetLineId: string;
  name: string;
  categoryId: string;
  /** Prorated planned amount for the prior period. */
  proratedAmount: number;
  /** Actual amount spent in the prior period. */
  actualAmount: number;
  /** proratedAmount − actualAmount. Positive = underspent; negative = overspent. */
  variance: number;
}

export interface RolloverSummary {
  previousPeriod: { start: string; end: string };
  flexibleLines: RolloverLine[];
  totalProratedFlexible: number;
  totalActualFlexible: number;
}

// ─── Push Notifications ───────────────────────────────────────────────────────

export interface PushSubscription {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceName: string | null;
  createdAt: Date;
}

export interface CreatePushSubscriptionData {
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  deviceName: string | null;
}

export interface NotificationPayload {
  title: string;
  body: string;
  /** Optional badge text or tag for deduplication */
  tag?: string;
  /** URL to open when notification is clicked */
  url?: string;
}

// ─── Household ────────────────────────────────────────────────────────────────

export interface Household {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
}

export type HouseholdRole = 'owner' | 'member';

export interface HouseholdMember {
  id: string;
  householdId: string;
  userId: string;
  role: HouseholdRole;
  joinedAt: Date;
}

/** Enriched member shape for API responses — includes decrypted email + displayName */
export interface HouseholdMemberPublic {
  userId: string;
  displayName: string | null;
  email: string;
  role: HouseholdRole;
  joinedAt: Date;
}

export interface HouseholdWithMembers extends Household {
  members: HouseholdMemberPublic[];
}

export interface CreateHouseholdData {
  name: string;
  ownerUserId: string;
}

export interface CreateMemberData {
  email: string;
  password: string;
  displayName?: string | null;
}

// ─── Account Shares ───────────────────────────────────────────────────────────

export type AccountShareAccessLevel = 'view' | 'write';

export interface AccountShare {
  id: string;
  accountId: string;
  sharedWithUserId: string;
  accessLevel: AccountShareAccessLevel;
  createdAt: Date;
}

export interface UpsertAccountShareData {
  userId: string;
  accessLevel: AccountShareAccessLevel;
}
