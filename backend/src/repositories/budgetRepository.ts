import { getDatabase } from '@config/database';
import type {
  Budget,
  BudgetCategory,
  BudgetCategoryEntry,
  BudgetCategoryProgress,
  CreateBudgetData,
  UpdateBudgetData,
} from '@types/core.types';

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
    const row = await this.db('budgets').where({ id, user_id: userId }).first();
    return row ? rowToBudget(row) : null;
  }

  async findAllForUser(userId: string): Promise<Budget[]> {
    const rows = await this.db('budgets')
      .where({ user_id: userId })
      .orderBy('start_date', 'desc');
    return rows.map(rowToBudget);
  }

  async create(data: CreateBudgetData): Promise<Budget> {
    const [id] = await this.db('budgets').insert({
      user_id: data.userId,
      name: data.name,
      start_date: data.startDate,
      end_date: data.endDate,
    });
    const row = await this.db('budgets').where({ id }).first();
    return rowToBudget(row);
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
    await this.db.raw(
      `INSERT INTO budget_categories (budget_id, category_id, allocated_amount)
       VALUES ${rows.map(() => '(?, ?, ?)').join(', ')}
       ON DUPLICATE KEY UPDATE allocated_amount = VALUES(allocated_amount), updated_at = NOW()`,
      rows.flatMap((r) => [r.budget_id, r.category_id, r.allocated_amount])
    );
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
    const startDate = budget.startDate.toISOString().split('T')[0];
    const endDate = budget.endDate.toISOString().split('T')[0];

    const rows = await db('budget_categories as bc')
      .join('categories as c', 'bc.category_id', 'c.id')
      .leftJoin('transactions as t', function () {
        this.on('t.category_id', 'bc.category_id')
          .andOnRaw('t.user_id = ?', [userId])
          .andOnRaw('t.is_transfer = 0')
          .andOnRaw('t.date BETWEEN ? AND ?', [startDate, endDate]);
      })
      .where('bc.budget_id', budgetId)
      .groupBy('bc.id', 'bc.category_id', 'bc.allocated_amount', 'c.id', 'c.name', 'c.color', 'c.icon', 'c.is_income', 'c.parent_id', 'c.is_active', 'c.user_id', 'c.created_at', 'c.updated_at')
      .select(
        'bc.category_id',
        'bc.allocated_amount',
        'c.id as c_id',
        'c.user_id as c_user_id',
        'c.name as c_name',
        'c.color as c_color',
        'c.icon as c_icon',
        'c.is_income as c_is_income',
        'c.parent_id as c_parent_id',
        'c.is_active as c_is_active',
        'c.created_at as c_created_at',
        'c.updated_at as c_updated_at',
        db.raw('COALESCE(SUM(CASE WHEN t.amount < 0 THEN ABS(t.amount) ELSE 0 END), 0) as spent')
      );

    return rows.map((row: Record<string, unknown>) => {
      const allocated = Number(row['allocated_amount']);
      const spent = Number(row['spent']);
      return {
        category: {
          id: row['c_id'] as string,
          userId: row['c_user_id'] as string,
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
