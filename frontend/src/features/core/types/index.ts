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
  createdAt: string;
  updatedAt: string;
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  isAsset: boolean;
  startingBalance: number;
  currency: string;
  color?: string;
  institution?: string;
  annualRate?: number | null;
}

export interface UpdateAccountInput {
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
  createdAt: string;
  updatedAt: string;
}

export interface CreateCategoryInput {
  name: string;
  color?: string;
  icon?: string;
  isIncome?: boolean;
  parentId?: string;
}

export interface UpdateCategoryInput {
  name?: string;
  color?: string | null;
  icon?: string | null;
}

// ─── Transactions ─────────────────────────────────────────────────────────────

export interface Transaction {
  id: string;
  userId: string;
  accountId: string;
  amount: number;
  description: string | null;
  payee: string | null;
  notes: string | null;
  date: string;
  categoryId: string | null;
  isTransfer: boolean;
  isCleared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateTransactionInput {
  accountId: string;
  amount: number;
  description?: string;
  payee?: string;
  notes?: string;
  date: string;
  categoryId?: string;
}

export interface UpdateTransactionInput {
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
  page?: number;
  limit?: number;
}

export interface PaginatedTransactions {
  data: Transaction[];
  total: number;
  page: number;
  limit: number;
}

export interface TransferCandidate {
  transaction: Transaction;
  account: Account;
}

export type LinkType = 'transfer' | 'payment' | 'refund';

// ─── Budgets ─────────────────────────────────────────────────────────────────

export interface Budget {
  id: string;
  userId: string;
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
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

export interface CreateBudgetInput {
  name: string;
  startDate: string;
  endDate: string;
}

export interface UpdateBudgetInput {
  name?: string;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
}

export interface BudgetCategory {
  id: string;
  budgetId: string;
  categoryId: string;
  allocatedAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface BudgetCategoryEntry {
  categoryId: string;
  allocatedAmount: number;
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
  frequencyInterval: number | null;
  anchorDate: string;
  isPayPeriodAnchor: boolean;
  isActive: boolean;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBudgetLineInput {
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

export interface UpdateBudgetLineInput {
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

export interface Occurrence {
  budgetLineId: string;
  dueDate: string;
  expectedAmount: number;
  status: 'upcoming' | 'missed';
}

export interface BudgetViewLine {
  budgetLine: BudgetLine;
  proratedAmount: number;
  actualAmount: number;
  variance: number;
  occurrences: Occurrence[];
}

export interface BudgetView {
  start: string;
  end: string;
  lines: BudgetViewLine[];
  totalProratedIncome: number;
  totalProratedExpenses: number;
  totalActualIncome: number;
  totalActualExpenses: number;
}

export interface PayPeriod {
  start: string;
  end: string;
  budgetLineId: string;
  frequency: BudgetLineFrequency;
}

// ─── Debt Schedules ───────────────────────────────────────────────────────────

export interface DebtSchedule {
  id: string;
  userId: string;
  accountId: string;
  principal: number;
  /** Decimal fraction: 0.065 = 6.5% APR */
  annualRate: number;
  termMonths: number;
  originationDate: string; // YYYY-MM-DD
  paymentAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertDebtScheduleInput {
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
  payoffDate: string;
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
  createdAt: string;
}

// ─── Savings Goals ────────────────────────────────────────────────────────────

export interface SavingsGoal {
  id: string;
  userId: string;
  accountId: string;
  name: string;
  targetAmount: number;
  targetDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSavingsGoalInput {
  accountId: string;
  name: string;
  targetAmount: number;
  targetDate?: string;
}

export interface UpdateSavingsGoalInput {
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
  projectedDate: string | null;
}

// ─── Offline Sync ─────────────────────────────────────────────────────────────

/** Full or delta snapshot returned by GET /api/v1/sync */
export interface SyncPayload {
  accounts: Account[];
  categories: Category[];
  transactions: Transaction[];
  budgets: Budget[];
  budgetCategories: BudgetCategory[];
  savingsGoals: SavingsGoal[];
  syncedAt: string;
}

// ─── Forecast ─────────────────────────────────────────────────────────────────

export interface ForecastMonth {
  month: string; // YYYY-MM
  income: number;
  expenses: number;
  isForecast: true;
}
