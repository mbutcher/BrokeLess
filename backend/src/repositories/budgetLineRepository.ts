import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import { getDatabase } from '@config/database';
import type {
  BudgetLine,
  BudgetLineFrequency,
  CreateBudgetLineData,
  UpdateBudgetLineData,
} from '@typings/core.types';

function rowToBudgetLine(row: Record<string, unknown>): BudgetLine {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    name: row['name'] as string,
    classification: row['classification'] as BudgetLine['classification'],
    flexibility: row['flexibility'] as BudgetLine['flexibility'],
    categoryId: row['category_id'] as string,
    subcategoryId: (row['subcategory_id'] as string | null) ?? null,
    accountId: (row['account_id'] as string | null) ?? null,
    amount: Number(row['amount']),
    frequency: row['frequency'] as BudgetLineFrequency,
    frequencyInterval: row['frequency_interval'] != null ? Number(row['frequency_interval']) : null,
    dayOfMonth1: row['day_of_month_1'] != null ? Number(row['day_of_month_1']) : null,
    dayOfMonth2: row['day_of_month_2'] != null ? Number(row['day_of_month_2']) : null,
    anchorDate:
      row['anchor_date'] instanceof Date
        ? row['anchor_date'].toISOString().slice(0, 10)
        : String(row['anchor_date']).slice(0, 10),
    isPayPeriodAnchor: Boolean(row['is_pay_period_anchor']),
    isActive: Boolean(row['is_active']),
    notes: (row['notes'] as string | null) ?? null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

/**
 * Spending actuals for a set of category IDs within a date window.
 * Excludes transfers. Used by budgetLineService to compute BudgetViewLine.actualAmount.
 */
export interface CategoryActuals {
  categoryId: string;
  actualAmount: number; // always positive
}

class BudgetLineRepository {
  private get db() {
    return getDatabase();
  }

  /** Wraps a callback in a Knex transaction; pass the `trx` to other repository methods for atomicity. */
  async transaction<T>(fn: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async findById(id: string, userId: string): Promise<BudgetLine | null> {
    const row = await this.db('budget_lines').where({ id, user_id: userId }).first();
    return row ? rowToBudgetLine(row) : null;
  }

  async findAllForUser(userId: string): Promise<BudgetLine[]> {
    const rows = await this.db('budget_lines')
      .where({ user_id: userId, is_active: true })
      .orderBy('classification', 'asc')
      .orderBy('name', 'asc');
    return rows.map(rowToBudgetLine);
  }

  async findPayPeriodAnchor(userId: string): Promise<BudgetLine | null> {
    const row = await this.db('budget_lines')
      .where({ user_id: userId, is_pay_period_anchor: true, is_active: true })
      .first();
    return row ? rowToBudgetLine(row) : null;
  }

  async create(data: CreateBudgetLineData, trx?: Knex.Transaction): Promise<BudgetLine> {
    const q = trx ?? this.db;
    const id = randomUUID();
    await q('budget_lines').insert({
      id,
      user_id: data.userId,
      name: data.name,
      classification: data.classification,
      flexibility: data.flexibility,
      category_id: data.categoryId,
      subcategory_id: data.subcategoryId ?? null,
      account_id: data.accountId ?? null,
      amount: data.amount,
      frequency: data.frequency,
      frequency_interval: data.frequencyInterval ?? null,
      day_of_month_1: data.dayOfMonth1 ?? null,
      day_of_month_2: data.dayOfMonth2 ?? null,
      anchor_date: data.anchorDate,
      is_pay_period_anchor: data.isPayPeriodAnchor ?? false,
      notes: data.notes ?? null,
    });
    const row = await q('budget_lines').where({ id }).first();
    return rowToBudgetLine(row as Record<string, unknown>);
  }

  async update(
    id: string,
    userId: string,
    data: UpdateBudgetLineData,
    trx?: Knex.Transaction
  ): Promise<BudgetLine | null> {
    const q = trx ?? this.db;
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates['name'] = data.name;
    if (data.classification !== undefined) updates['classification'] = data.classification;
    if (data.flexibility !== undefined) updates['flexibility'] = data.flexibility;
    if (data.categoryId !== undefined) updates['category_id'] = data.categoryId;
    if (data.subcategoryId !== undefined) updates['subcategory_id'] = data.subcategoryId;
    if (data.accountId !== undefined) updates['account_id'] = data.accountId;
    if (data.amount !== undefined) updates['amount'] = data.amount;
    if (data.frequency !== undefined) updates['frequency'] = data.frequency;
    if (data.frequencyInterval !== undefined)
      updates['frequency_interval'] = data.frequencyInterval;
    if (data.dayOfMonth1 !== undefined) updates['day_of_month_1'] = data.dayOfMonth1;
    if (data.dayOfMonth2 !== undefined) updates['day_of_month_2'] = data.dayOfMonth2;
    if (data.anchorDate !== undefined) updates['anchor_date'] = data.anchorDate;
    if (data.isPayPeriodAnchor !== undefined)
      updates['is_pay_period_anchor'] = data.isPayPeriodAnchor;
    if (data.notes !== undefined) updates['notes'] = data.notes;
    if (data.isActive !== undefined) updates['is_active'] = data.isActive;

    if (Object.keys(updates).length > 0) {
      await q('budget_lines').where({ id, user_id: userId }).update(updates);
    }
    return this.findById(id, userId);
  }

  /** Soft-delete: sets is_active = false. */
  async softDelete(id: string, userId: string): Promise<void> {
    await this.db('budget_lines').where({ id, user_id: userId }).update({ is_active: false });
  }

  /**
   * Clears is_pay_period_anchor on all income Budget Lines for the user.
   * Pass a `trx` to run this atomically alongside a create or update.
   */
  async clearPayPeriodAnchors(userId: string, trx?: Knex.Transaction): Promise<void> {
    const q = trx ?? this.db;
    await q('budget_lines')
      .where({ user_id: userId, classification: 'income' })
      .update({ is_pay_period_anchor: false });
  }

  /**
   * Returns spending actuals for a list of category IDs (and their subcategory IDs)
   * within a date window. Excludes transfers and income transactions.
   *
   * Adapts the aggregation logic from budgetRepository.getBudgetProgress().
   */
  async getActuals(
    userId: string,
    categoryIds: string[],
    start: string,
    end: string
  ): Promise<CategoryActuals[]> {
    if (categoryIds.length === 0) return [];

    const rows = await this.db('transactions')
      .whereIn('category_id', categoryIds)
      .andWhere('user_id', userId)
      .andWhere('is_transfer', false)
      .andWhere('amount', '<', 0)
      .andWhereBetween('date', [start, end])
      .groupBy('category_id')
      .select('category_id', this.db.raw('SUM(ABS(amount)) as actual_amount'));

    return rows.map((row: Record<string, unknown>) => ({
      categoryId: row['category_id'] as string,
      actualAmount: Number(row['actual_amount']),
    }));
  }

  /**
   * Returns income actuals for a list of category IDs within a date window.
   * Excludes transfers; sums positive amounts.
   */
  async getIncomeActuals(
    userId: string,
    categoryIds: string[],
    start: string,
    end: string
  ): Promise<CategoryActuals[]> {
    if (categoryIds.length === 0) return [];

    const rows = await this.db('transactions')
      .whereIn('category_id', categoryIds)
      .andWhere('user_id', userId)
      .andWhere('is_transfer', false)
      .andWhere('amount', '>', 0)
      .andWhereBetween('date', [start, end])
      .groupBy('category_id')
      .select('category_id', this.db.raw('SUM(amount) as actual_amount'));

    return rows.map((row: Record<string, unknown>) => ({
      categoryId: row['category_id'] as string,
      actualAmount: Number(row['actual_amount']),
    }));
  }
}

export const budgetLineRepository = new BudgetLineRepository();
