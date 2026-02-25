import { randomUUID } from 'crypto';
import type { Knex } from 'knex';
import { getDatabase } from '@config/database';
import type { Account, CreateAccountData, UpdateAccountData } from '@typings/core.types';

function rowToAccount(row: Record<string, unknown>): Account {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    name: row['name'] as string,
    type: row['type'] as Account['type'],
    isAsset: Boolean(row['is_asset']),
    startingBalance: Number(row['starting_balance']),
    currentBalance: Number(row['current_balance']),
    currency: row['currency'] as string,
    color: (row['color'] as string | null) ?? null,
    institution: (row['institution'] as string | null) ?? null,
    annualRate: row['annual_rate'] != null ? Number(row['annual_rate']) : null,
    isActive: Boolean(row['is_active']),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class AccountRepository {
  private get db() {
    return getDatabase();
  }

  async findById(id: string, userId: string): Promise<Account | null> {
    const row = await this.db('accounts').where({ id, user_id: userId }).first();
    return row ? rowToAccount(row) : null;
  }

  async findAllForUser(userId: string, activeOnly = true): Promise<Account[]> {
    let query = this.db('accounts').where({ user_id: userId });
    if (activeOnly) query = query.where({ is_active: true });
    const rows = await query.orderBy('name', 'asc');
    return rows.map(rowToAccount);
  }

  async create(data: CreateAccountData): Promise<Account> {
    const id = randomUUID();
    await this.db('accounts').insert({
      id,
      user_id: data.userId,
      name: data.name,
      type: data.type,
      is_asset: data.isAsset,
      starting_balance: data.startingBalance,
      current_balance: data.startingBalance, // starts equal to starting balance
      currency: data.currency,
      color: data.color ?? null,
      institution: data.institution ?? null,
      annual_rate: data.annualRate ?? null,
    });
    const row = await this.db('accounts').where({ id }).first();
    return rowToAccount(row as Record<string, unknown>);
  }

  async update(id: string, userId: string, data: UpdateAccountData): Promise<Account | null> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates['name'] = data.name;
    if (data.type !== undefined) updates['type'] = data.type;
    if (data.isAsset !== undefined) updates['is_asset'] = data.isAsset;
    if (data.currency !== undefined) updates['currency'] = data.currency;
    if (data.color !== undefined) updates['color'] = data.color;
    if (data.institution !== undefined) updates['institution'] = data.institution;
    if (data.isActive !== undefined) updates['is_active'] = data.isActive;
    if (data.annualRate !== undefined) updates['annual_rate'] = data.annualRate;

    if (data.startingBalance !== undefined) {
      const current = await this.findById(id, userId);
      if (current) {
        const delta = data.startingBalance - current.startingBalance;
        updates['starting_balance'] = data.startingBalance;
        updates['current_balance'] = this.db.raw('current_balance + ?', [delta]);
      }
    }

    if (Object.keys(updates).length === 0) return this.findById(id, userId);

    await this.db('accounts').where({ id, user_id: userId }).update(updates);
    return this.findById(id, userId);
  }

  /**
   * Atomically update the current balance by delta.
   * Must be called inside a knex transaction when modifying alongside a transaction row.
   */
  async updateBalance(id: string, delta: number, trx?: Knex.Transaction): Promise<void> {
    const query = trx ? trx('accounts') : this.db('accounts');
    await query.where({ id }).increment('current_balance', delta);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.db('accounts').where({ id, user_id: userId }).update({ is_active: false });
  }

  async setSimplefinAccountId(
    id: string,
    userId: string,
    simplefinAccountId: string
  ): Promise<void> {
    await this.db('accounts')
      .where({ id, user_id: userId })
      .update({ simplefin_account_id: simplefinAccountId });
  }

  async setCurrentBalance(id: string, userId: string, balance: number): Promise<void> {
    await this.db('accounts').where({ id, user_id: userId }).update({ current_balance: balance });
  }
}

export const accountRepository = new AccountRepository();
