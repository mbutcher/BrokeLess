import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import type {
  RecurringTransaction,
  CreateRecurringTransactionData,
  UpdateRecurringTransactionData,
} from '@typings/core.types';

function rowToRecurring(row: Record<string, unknown>): RecurringTransaction {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    accountId: row['account_id'] as string,
    amount: Number(row['amount']),
    description: (row['description'] as string | null) ?? null,
    payee: (row['payee'] as string | null) ?? null,
    notes: (row['notes'] as string | null) ?? null,
    categoryId: (row['category_id'] as string | null) ?? null,
    frequency: row['frequency'] as RecurringTransaction['frequency'],
    frequencyInterval: row['frequency_interval'] != null ? Number(row['frequency_interval']) : null,
    anchorDate:
      row['anchor_date'] instanceof Date
        ? row['anchor_date'].toISOString().slice(0, 10)
        : String(row['anchor_date']).slice(0, 10),
    nextDueDate:
      row['next_due_date'] instanceof Date
        ? row['next_due_date'].toISOString().slice(0, 10)
        : String(row['next_due_date']).slice(0, 10),
    endDate:
      row['end_date'] != null
        ? row['end_date'] instanceof Date
          ? row['end_date'].toISOString().slice(0, 10)
          : String(row['end_date']).slice(0, 10)
        : null,
    isActive: Boolean(row['is_active']),
    lastGeneratedAt: row['last_generated_at'] ? new Date(row['last_generated_at'] as string) : null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class RecurringTransactionRepository {
  private get db() {
    return getDatabase();
  }

  async findAllForUser(userId: string): Promise<RecurringTransaction[]> {
    const rows = await this.db('recurring_transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'asc');
    return rows.map(rowToRecurring);
  }

  async findById(id: string, userId: string): Promise<RecurringTransaction | null> {
    const row = await this.db('recurring_transactions').where({ id, user_id: userId }).first();
    return row ? rowToRecurring(row as Record<string, unknown>) : null;
  }

  /**
   * Find all active recurring transactions whose next_due_date is on or before the cutoff.
   * Includes records whose end_date is null OR end_date >= next_due_date.
   * Does NOT filter by user — used by cron to process all users.
   */
  async findDue(cutoffDate: string): Promise<RecurringTransaction[]> {
    const rows = await this.db('recurring_transactions')
      .where({ is_active: true })
      .where('next_due_date', '<=', cutoffDate)
      .where(function () {
        this.whereNull('end_date').orWhere('end_date', '>=', this.client.raw('next_due_date'));
      });
    return rows.map(rowToRecurring);
  }

  async create(data: CreateRecurringTransactionData & { nextDueDate: string }): Promise<RecurringTransaction> {
    const id = randomUUID();
    await this.db('recurring_transactions').insert({
      id,
      user_id: data.userId,
      account_id: data.accountId,
      amount: data.amount,
      description: data.description ?? null,
      payee: data.payee ?? null,
      notes: data.notes ?? null,
      category_id: data.categoryId ?? null,
      frequency: data.frequency,
      frequency_interval: data.frequencyInterval ?? null,
      anchor_date: data.anchorDate,
      next_due_date: data.nextDueDate,
      end_date: data.endDate ?? null,
    });
    const row = await this.db('recurring_transactions').where({ id }).first();
    return rowToRecurring(row as Record<string, unknown>);
  }

  async update(
    id: string,
    userId: string,
    data: UpdateRecurringTransactionData,
  ): Promise<RecurringTransaction | null> {
    const updates: Record<string, unknown> = {};
    if (data.accountId !== undefined) updates['account_id'] = data.accountId;
    if (data.amount !== undefined) updates['amount'] = data.amount;
    if (data.description !== undefined) updates['description'] = data.description;
    if (data.payee !== undefined) updates['payee'] = data.payee;
    if (data.notes !== undefined) updates['notes'] = data.notes;
    if (data.categoryId !== undefined) updates['category_id'] = data.categoryId;
    if (data.frequency !== undefined) updates['frequency'] = data.frequency;
    if (data.frequencyInterval !== undefined) updates['frequency_interval'] = data.frequencyInterval;
    if (data.anchorDate !== undefined) updates['anchor_date'] = data.anchorDate;
    if (data.nextDueDate !== undefined) updates['next_due_date'] = data.nextDueDate;
    if (data.endDate !== undefined) updates['end_date'] = data.endDate;
    if (data.isActive !== undefined) updates['is_active'] = data.isActive;

    if (Object.keys(updates).length > 0) {
      await this.db('recurring_transactions').where({ id, user_id: userId }).update(updates);
    }

    return this.findById(id, userId);
  }

  /** Soft-delete: set is_active = false. */
  async softDelete(id: string, userId: string): Promise<void> {
    await this.db('recurring_transactions')
      .where({ id, user_id: userId })
      .update({ is_active: false });
  }

  /** Advance next_due_date and record when generation happened. */
  async advanceNextDue(id: string, nextDate: string): Promise<void> {
    await this.db('recurring_transactions').where({ id }).update({
      next_due_date: nextDate,
      last_generated_at: this.db.fn.now(),
    });
  }
}

export const recurringTransactionRepository = new RecurringTransactionRepository();
