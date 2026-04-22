/**
 * Shared fixture data for Storybook stories.
 * All data is static and matches the production type shapes exactly.
 */

import type {
  Account,
  PaginatedTransactions,
  Transaction,
  BudgetView,
  BudgetLine,
  SavingsGoal,
  SavingsGoalProgress,
  PayPeriod,
  UpcomingExpensesResponse,
  NetWorthSnapshot,
  SpendingByCategoryResponse,
  DebtSchedule,
  AmortizationSchedule,
} from '@features/core/types';
import type { MonthlySummaryEntry } from '@features/core/api/reportApi';

// ─── Auth ─────────────────────────────────────────────────────────────────────

export const mockUser = {
  id: 'u1',
  email: 'jane@example.com',
  displayName: 'Jane Smith',
  locale: 'en-CA' as const,
  defaultCurrency: 'CAD',
  dateFormat: 'MMM d, yyyy',
  timeFormat: 'h:mm a',
  timezone: 'America/Toronto',
  twoFactorEnabled: false,
};

// ─── Accounts ─────────────────────────────────────────────────────────────────

export const mockAccounts: Account[] = [
  {
    id: 'acct-1',
    userId: 'u1',
    name: 'TD Chequing',
    type: 'checking',
    isAsset: true,
    startingBalance: 5000,
    currentBalance: 3421.5,
    currency: 'CAD',
    color: '#3b82f6',
    institution: 'TD Bank',
    annualRate: null,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'acct-2',
    userId: 'u1',
    name: 'TFSA Savings',
    type: 'savings',
    isAsset: true,
    startingBalance: 10000,
    currentBalance: 12500,
    currency: 'CAD',
    color: '#22c55e',
    institution: 'TD Bank',
    annualRate: 0.035,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'acct-3',
    userId: 'u1',
    name: 'Visa Credit Card',
    type: 'credit_card',
    isAsset: false,
    startingBalance: 0,
    currentBalance: -1842.3,
    currency: 'CAD',
    color: '#f43f5e',
    institution: 'TD Bank',
    annualRate: 0.1999,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'acct-4',
    userId: 'u1',
    name: 'Car Loan',
    type: 'loan',
    isAsset: false,
    startingBalance: 25000,
    currentBalance: -18350,
    currency: 'CAD',
    color: '#f97316',
    institution: 'Scotia',
    annualRate: 0.0699,
    isActive: true,
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];

/** Account with a negative balance on an asset — triggers a WarningsWidget warning. */
export const mockNegativeAssetAccount: Account = {
  id: 'acct-neg',
  userId: 'u1',
  name: 'Overdrawn Chequing',
  type: 'checking',
  isAsset: true,
  startingBalance: 500,
  currentBalance: -124.5,
  currency: 'CAD',
  color: '#ef4444',
  institution: 'TD Bank',
  annualRate: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-02-27T00:00:00Z',
};

// ─── Transactions ──────────────────────────────────────────────────────────────

const baseTransaction: Transaction = {
  id: '',
  userId: 'u1',
  accountId: 'acct-1',
  amount: 0,
  description: null,
  payee: null,
  notes: null,
  date: '2026-02-20',
  categoryId: 'cat-1',
  budgetLineId: null,
  isTransfer: false,
  isCleared: true,
  createdAt: '2026-02-20T10:00:00Z',
  updatedAt: '2026-02-20T10:00:00Z',
  tags: [],
};

export const mockTransactionList: Transaction[] = [
  { ...baseTransaction, id: 'tx-1', payee: 'Metro Grocery', amount: -85.2, date: '2026-02-20' },
  { ...baseTransaction, id: 'tx-2', payee: 'Netflix', amount: -17.99, date: '2026-02-19' },
  {
    ...baseTransaction,
    id: 'tx-3',
    payee: 'Employer Ltd.',
    amount: 2500,
    date: '2026-02-15',
    categoryId: 'cat-income',
  },
  { ...baseTransaction, id: 'tx-4', payee: 'Tim Hortons', amount: -6.45, date: '2026-02-14' },
  { ...baseTransaction, id: 'tx-5', payee: 'Shell Gas', amount: -78.0, date: '2026-02-13' },
];

export const mockPaginatedTransactions: PaginatedTransactions = {
  data: mockTransactionList,
  total: 5,
  page: 1,
  limit: 10,
};

// ─── Budget View ───────────────────────────────────────────────────────────────

const mockBudgetLine: BudgetLine = {
  id: 'bl-1',
  userId: 'u1',
  name: 'Groceries',
  classification: 'expense',
  flexibility: 'flexible',
  categoryId: 'cat-1',
  subcategoryId: null,
  accountId: 'acct-1',
  amount: 600,
  frequency: 'monthly',
  frequencyInterval: null,
  dayOfMonth1: 1,
  dayOfMonth2: null,
  anchorDate: '2026-01-01',
  isPayPeriodAnchor: false,
  isActive: true,
  notes: null,
  createdAt: '2026-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const mockBudgetView: BudgetView = {
  start: '2026-02-01',
  end: '2026-02-28',
  lines: [
    {
      budgetLine: mockBudgetLine,
      proratedAmount: 600,
      actualAmount: 423.5,
      variance: 176.5,
      occurrences: [],
    },
    {
      budgetLine: { ...mockBudgetLine, id: 'bl-2', name: 'Dining Out', amount: 200 },
      proratedAmount: 200,
      actualAmount: 287.4,
      variance: -87.4,
      occurrences: [],
    },
    {
      budgetLine: {
        ...mockBudgetLine,
        id: 'bl-3',
        name: 'Entertainment',
        amount: 100,
        flexibility: 'fixed',
      },
      proratedAmount: 100,
      actualAmount: 95.0,
      variance: 5.0,
      occurrences: [],
    },
    {
      budgetLine: {
        ...mockBudgetLine,
        id: 'bl-income',
        name: 'Salary',
        classification: 'income',
        amount: 5000,
        flexibility: 'fixed',
      },
      proratedAmount: 5000,
      actualAmount: 5000,
      variance: 0,
      occurrences: [],
    },
  ],
  totalProratedIncome: 5000,
  totalProratedExpenses: 3200,
  totalActualIncome: 5000,
  totalActualExpenses: 2105.9,
};

// ─── Monthly Summary ───────────────────────────────────────────────────────────

export const mockMonthlySummary: MonthlySummaryEntry[] = [
  { month: '2025-09', income: 5000, expenses: 3800 },
  { month: '2025-10', income: 5000, expenses: 4200 },
  { month: '2025-11', income: 5200, expenses: 3600 },
  { month: '2025-12', income: 5000, expenses: 4800 },
  { month: '2026-01', income: 5000, expenses: 3500 },
  { month: '2026-02', income: 5000, expenses: 2106, isForecast: false },
];

export const mockForecast: MonthlySummaryEntry[] = [
  { month: '2026-03', income: 5000, expenses: 3200, isForecast: true },
  { month: '2026-04', income: 5000, expenses: 3200, isForecast: true },
  { month: '2026-05', income: 5000, expenses: 3200, isForecast: true },
];

// ─── Net Worth ─────────────────────────────────────────────────────────────────

const netWorthSnapshotBase: NetWorthSnapshot = {
  id: '',
  userId: 'u1',
  snapshotDate: '',
  totalAssets: 0,
  totalLiabilities: 0,
  netWorth: 0,
  createdAt: '2026-01-01T00:00:00Z',
};

export const mockNetWorthHistory = {
  snapshots: [
    {
      ...netWorthSnapshotBase,
      id: 'nw-1',
      snapshotDate: '2026-01-01',
      totalAssets: 14800,
      totalLiabilities: 18000,
      netWorth: -3200,
    },
    {
      ...netWorthSnapshotBase,
      id: 'nw-2',
      snapshotDate: '2026-02-01',
      totalAssets: 15921.5,
      totalLiabilities: 20192.3,
      netWorth: -4270.8,
    },
  ] as NetWorthSnapshot[],
  latest: {
    ...netWorthSnapshotBase,
    id: 'nw-2',
    snapshotDate: '2026-02-01',
    totalAssets: 15921.5,
    totalLiabilities: 20192.3,
    netWorth: -4270.8,
  } as NetWorthSnapshot,
};

// ─── Savings Goals ─────────────────────────────────────────────────────────────

export const mockSavingsGoals: SavingsGoal[] = [
  {
    id: 'goal-1',
    userId: 'u1',
    accountId: 'acct-2',
    budgetLineId: null,
    name: 'Emergency Fund',
    targetAmount: 15000,
    targetDate: '2027-06-01',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
  {
    id: 'goal-2',
    userId: 'u1',
    accountId: 'acct-2',
    budgetLineId: null,
    name: 'Vacation Fund',
    targetAmount: 3000,
    targetDate: '2026-07-01',
    createdAt: '2026-01-01T00:00:00Z',
    updatedAt: '2026-02-01T00:00:00Z',
  },
];

export const mockSavingsGoalProgress: Record<string, SavingsGoalProgress> = {
  'goal-1': {
    goalId: 'goal-1',
    name: 'Emergency Fund',
    currentAmount: 12500,
    targetAmount: 15000,
    percentComplete: 83,
    daysToGoal: 460,
    projectedDate: '2027-06-01',
  },
  'goal-2': {
    goalId: 'goal-2',
    name: 'Vacation Fund',
    currentAmount: 1200,
    targetAmount: 3000,
    percentComplete: 40,
    daysToGoal: 124,
    projectedDate: '2026-07-01',
  },
};

// ─── Pay Period ────────────────────────────────────────────────────────────────

export const mockPayPeriod: PayPeriod = {
  start: '2026-02-01',
  end: '2026-02-28',
  budgetLineId: 'bl-income',
  frequency: 'monthly',
};

// ─── Upcoming Expenses ─────────────────────────────────────────────────────────

export const mockUpcomingExpenses: UpcomingExpensesResponse = {
  start: '2026-02-27',
  end: '2026-03-28',
  fixedItems: [
    {
      budgetLineId: 'bl-rent',
      name: 'Rent',
      amount: 1800,
      date: '2026-03-01',
      categoryId: 'cat-housing',
      subcategoryId: null,
      accountId: 'acct-1',
      accountName: 'TD Chequing',
    },
    {
      budgetLineId: 'bl-insurance',
      name: 'Car Insurance',
      amount: 135,
      date: '2026-03-15',
      categoryId: 'cat-auto',
      subcategoryId: null,
      accountId: 'acct-1',
      accountName: 'TD Chequing',
    },
  ],
  flexibleItems: [
    {
      budgetLineId: 'bl-groceries',
      name: 'Groceries',
      fullPeriodAmount: 600,
      proratedAmount: 600,
      frequency: 'monthly',
      categoryId: 'cat-food',
    },
  ],
};

// ─── Spending By Category ──────────────────────────────────────────────────────

export const mockSpendingByCategory: SpendingByCategoryResponse = {
  start: '2026-02-01',
  end: '2026-02-28',
  type: 'expense',
  total: 2106,
  categories: [
    { categoryId: 'cat-1', categoryName: 'Groceries', parentId: null, color: '#22c55e', totalAmount: 423.5, percentage: 20.1 },
    { categoryId: 'cat-2', categoryName: 'Dining Out', parentId: null, color: '#f97316', totalAmount: 287.4, percentage: 13.6 },
    { categoryId: 'cat-3', categoryName: 'Housing', parentId: null, color: '#3b82f6', totalAmount: 1800, percentage: 85.5 },
    { categoryId: 'cat-4', categoryName: 'Transport', parentId: null, color: '#a855f7', totalAmount: 135, percentage: 6.4 },
    { categoryId: 'cat-5', categoryName: 'Entertainment', parentId: null, color: '#ec4899', totalAmount: 95, percentage: 4.5 },
  ],
};

// ─── Debt Schedule + Amortization ─────────────────────────────────────────────

export const mockDebtSchedule: DebtSchedule = {
  id: 'ds-1',
  userId: 'u1',
  accountId: 'acct-4',
  principal: 25000,
  annualRate: 0.0699,
  termMonths: 60,
  originationDate: '2023-01-01',
  paymentAmount: 495.42,
  paymentFrequency: 'monthly',
  isSimplified: false,
  asOfDate: null,
  cashAdvanceRate: null,
  minimumPaymentType: null,
  minimumPaymentAmount: null,
  minimumPaymentPercent: null,
  creditLimit: null,
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2026-01-01T00:00:00Z',
};

export const mockAmortizationSchedule: AmortizationSchedule = {
  schedule: [],
  totalInterest: 4725.2,
  payoffDate: '2028-01-01',
};

// ─── Dashboard Hints ──────────────────────────────────────────────────────────

export const mockHints: { id: string; message: string; type: string }[] = [
  { id: 'h-1', message: 'You spent 15% more on dining this month vs. last month.', type: 'info' },
  {
    id: 'h-2',
    message: 'Emergency Fund is on track to reach the target by June 2027.',
    type: 'positive',
  },
];
