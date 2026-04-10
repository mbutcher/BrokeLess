import { randomUUID } from 'crypto';
import { dialectHelper } from '@utils/db/dialectHelper';
import { getDatabase } from '@config/database';
import type {
  Budget,
  BudgetCategory,
  BudgetCategoryEntry,
  BudgetCategoryProgress,
  CreateBudgetData,
  UpdateBudgetData,
} from '@typings/core.types';

function rowToBudget(row: Record<string, unknown>): Budget {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    name: row['name'] as string,
    startDate: new Date(row['start_date'] as string),
    endDate: new Date(row['end_date'] as string),
    isActive: Boolean(row['is_active']),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

function rowToBudgetCategory(row: Record<string, unknown>): BudgetCategory {
  return {
    id: row['id'] as string,
    budgetId: row['budget_id'] as string,
    categoryId: row['category_id'] as string,
    allocatedAmount: Number(row['allocated_amount']),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class BudgetRepository {
  private get db() {
    return getDatabase();
  }

  async findById(id: string, userId: string): Promise<Budget | null> {
    const row: unknown = await this.db('budgets').where({ id, user_id: userId }).first();
    return row ? rowToBudget(row as Record<string, unknown>) : null;
  }

  async findAllForUser(userId: string): Promise<Budget[]> {
    const rows = await this.db('budgets').where({ user_id: userId }).orderBy('start_date', 'desc');
    return rows.map(rowToBudget);
  }

  async create(data: CreateBudgetData): Promise<Budget> {
    const id = randomUUID();
    await this.db('budgets').insert({
      id,
      user_id: data.userId,
      name: data.name,
      start_date: data.startDate,
      end_date: data.endDate,
    });
    const row: unknown = await this.db('budgets').where({ id }).first();
    return rowToBudget(row as Record<string, unknown>);
  }

  async update(id: string, userId: string, data: UpdateBudgetData): Promise<Budget | null> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates['name'] = data.name;
    if (data.startDate !== undefined) updates['start_date'] = data.startDate;
    if (data.endDate !== undefined) updates['end_date'] = data.endDate;
    if (data.isActive !== undefined) updates['is_active'] = data.isActive;

    if (Object.keys(updates).length > 0) {
      await this.db('budgets').where({ id, user_id: userId }).update(updates);
    }
    return this.findById(id, userId);
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.db('budgets').where({ id, user_id: userId }).delete();
  }

  async getBudgetCategories(budgetId: string): Promise<BudgetCategory[]> {
    const rows = await this.db('budget_categories').where({ budget_id: budgetId });
    return rows.map(rowToBudgetCategory);
  }

  /**
   * Bulk upsert category allocations for a budget.
   * Uses INSERT ... ON DUPLICATE KEY UPDATE for efficiency.
   */
  async upsertCategories(budgetId: string, entries: BudgetCategoryEntry[]): Promise<void> {
    if (entries.length === 0) return;
    const rows = entries.map((e) => ({
      budget_id: budgetId,
      category_id: e.categoryId,
      allocated_amount: e.allocatedAmount,
    }));
    await dialectHelper.upsertBudgetCategories(this.db, rows);
  }

  /**
   * Get spending per category for a budget's date range.
   * Excludes is_transfer=true transactions to prevent double-counting.
   * Returns rows with category_id and the sum of spending (negative amounts summed as positive).
   */
  async getBudgetProgress(budgetId: string, userId: string): Promise<BudgetCategoryProgress[]> {
    const budget = await this.findById(budgetId, userId);
    if (!budget) return [];

    const db = this.db;
    const startDate = budget.startDate.toISOString().substring(0, 10);
    const endDate = budget.endDate.toISOString().substring(0, 10);

    // Correlated subquery for spending avoids Knex JOIN-ON raw filter typing issues
    // and correctly returns 0 for categories with no matching transactions.
    const rows = await db('budget_categories as bc')
      .join('categories as c', 'bc.category_id', 'c.id')
      .where('bc.budget_id', budgetId)
      .select(
        'bc.category_id',
        'bc.allocated_amount',
        'c.id as c_id',
        'c.household_id as c_household_id',
        'c.name as c_name',
        'c.color as c_color',
        'c.icon as c_icon',
        'c.is_income as c_is_income',
        'c.parent_id as c_parent_id',
        'c.is_active as c_is_active',
        'c.created_at as c_created_at',
        'c.updated_at as c_updated_at',
        db.raw(
          `COALESCE((
            SELECT SUM(ABS(t.amount))
            FROM transactions t
            WHERE t.category_id = bc.category_id
              AND t.user_id = ?
              AND t.is_transfer = false
              AND t.amount < 0
              AND t.date BETWEEN ? AND ?
          ), 0) as spent`,
          [userId, startDate, endDate]
        )
      );

    return rows.map((row: Record<string, unknown>) => {
      const allocated = Number(row['allocated_amount']);
      const spent = Number(row['spent']);
      return {
        category: {
          id: row['c_id'] as string,
          householdId: row['c_household_id'] as string,
          name: row['c_name'] as string,
          color: (row['c_color'] as string | null) ?? null,
          icon: (row['c_icon'] as string | null) ?? null,
          isIncome: Boolean(row['c_is_income']),
          parentId: (row['c_parent_id'] as string | null) ?? null,
          isActive: Boolean(row['c_is_active']),
          createdAt: new Date(row['c_created_at'] as string),
          updatedAt: new Date(row['c_updated_at'] as string),
        },
        allocated,
        spent,
        remaining: allocated - spent,
      };
    });
  }
}

export const budgetRepository = new BudgetRepository();
