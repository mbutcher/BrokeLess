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

class BudgetLineRepository {
  private get db() {
    return getDatabase();
  }

  /** Wraps a callback in a Knex transaction; pass the `trx` to other repository methods for atomicity. */
  async transaction<T>(fn: (trx: Knex.Transaction) => Promise<T>): Promise<T> {
    return this.db.transaction(fn);
  }

  async findById(id: string, userId: string): Promise<BudgetLine | null> {
    const row: unknown = await this.db('budget_lines').where({ id, user_id: userId }).first();
    return row ? rowToBudgetLine(row as Record<string, unknown>) : null;
  }

  async findAllForUser(userId: string): Promise<BudgetLine[]> {
    const rows = await this.db('budget_lines')
      .where({ user_id: userId, is_active: true })
      .orderBy('classification', 'asc')
      .orderBy('name', 'asc');
    return rows.map(rowToBudgetLine);
  }

  async findPayPeriodAnchor(userId: string): Promise<BudgetLine | null> {
    const row: unknown = await this.db('budget_lines')
      .where({ user_id: userId, is_pay_period_anchor: true, is_active: true })
      .first();
    return row ? rowToBudgetLine(row as Record<string, unknown>) : null;
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
    const row: unknown = await q('budget_lines').where({ id }).first();
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

  /** Count active budget lines referencing a category (either as category_id or subcategory_id). */
  async countByCategoryId(userId: string, categoryId: string): Promise<number> {
    const result = await this.db('budget_lines')
      .where('user_id', userId)
      .where('is_active', true)
      .where(this.db.raw('(category_id = ? OR subcategory_id = ?)', [categoryId, categoryId]))
      .count('id as count')
      .first();
    return Number(result?.['count'] ?? 0);
  }

  /** Count transactions referencing a category. */
  async countTransactionsByCategoryId(userId: string, categoryId: string): Promise<number> {
    const result = await this.db('transactions')
      .where({ user_id: userId, category_id: categoryId })
      .count('id as count')
      .first();
    return Number(result?.['count'] ?? 0);
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
   * Returns the actual amount for a single budget line, matched by budget_line_id.
   * Income lines use positive amounts; expense lines use absolute negative amounts.
   */
  async getActualsForLine(
    userId: string,
    budgetLineId: string,
    start: string,
    end: string,
    isIncome: boolean
  ): Promise<number> {
    const db = this.db;
    const rows = await db('transactions')
      .where('user_id', userId)
      .where('is_transfer', false)
      .where('amount', isIncome ? '>' : '<', 0)
      .whereBetween('date', [start, end])
      .where('budget_line_id', budgetLineId)
      .select(db.raw(isIncome ? 'SUM(amount) as total' : 'SUM(ABS(amount)) as total'));

    return Number((rows[0] as Record<string, unknown> | undefined)?.['total'] ?? 0);
  }
}

export const budgetLineRepository = new BudgetLineRepository();
