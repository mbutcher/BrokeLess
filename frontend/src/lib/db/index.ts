import Dexie, { type Table } from 'dexie';
import type {
  LocalAccount,
  LocalCategory,
  LocalTransaction,
  LocalBudget,
  LocalBudgetCategory,
  LocalBudgetLine,
  LocalSavingsGoal,
  LocalRecurringTransaction,
  LocalDashboardConfig,
  PendingMutation,
  SyncMeta,
} from './schema';

class BudgetDB extends Dexie {
  accounts!: Table<LocalAccount, string>;
  categories!: Table<LocalCategory, string>;
  transactions!: Table<LocalTransaction, string>;
  budgets!: Table<LocalBudget, string>;
  budgetCategories!: Table<LocalBudgetCategory, string>;
  budgetLines!: Table<LocalBudgetLine, string>;
  savingsGoals!: Table<LocalSavingsGoal, string>;
  recurringTransactions!: Table<LocalRecurringTransaction, string>;
  dashboardConfig!: Table<LocalDashboardConfig, string>;
  pendingMutations!: Table<PendingMutation, string>;
  syncMeta!: Table<SyncMeta, string>;

  constructor() {
    super('BudgetApp');

    this.version(1).stores({
      // Primary key first, then indexed fields for common queries
      accounts:         'id, userId, updatedAt, isActive',
      categories:       'id, userId, updatedAt, isActive',
      transactions:     'id, userId, accountId, date, updatedAt',
      budgets:          'id, userId, updatedAt, isActive',
      budgetCategories: 'id, budgetId, categoryId, updatedAt',
      savingsGoals:     'id, userId, updatedAt',
      pendingMutations: 'id, status, createdAt',
      syncMeta:         'id',
    });

    this.version(2).stores({
      budgetLines: 'id, userId, updatedAt, isActive',
    });

    this.version(3).stores({
      recurringTransactions: 'id, userId, nextDueDate, isActive',
    });

    this.version(4).stores({
      dashboardConfig: 'id',
    });
  }
}

export const db = new BudgetDB();
export type {
  LocalAccount,
  LocalCategory,
  LocalTransaction,
  LocalBudget,
  LocalBudgetCategory,
  LocalBudgetLine,
  LocalSavingsGoal,
  LocalRecurringTransaction,
  LocalDashboardConfig,
  PendingMutation,
  SyncMeta,
};
