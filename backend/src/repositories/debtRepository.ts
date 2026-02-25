import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import type { DebtSchedule, TransactionSplit, UpsertDebtScheduleData } from '@typings/core.types';

function rowToSchedule(row: Record<string, unknown>): DebtSchedule {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    accountId: row['account_id'] as string,
    principal: Number(row['principal']),
    annualRate: Number(row['annual_rate']),
    termMonths: Number(row['term_months']),
    originationDate: row['origination_date'] as string,
    paymentAmount: Number(row['payment_amount']),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

function rowToSplit(row: Record<string, unknown>): TransactionSplit {
  return {
    id: row['id'] as string,
    transactionId: row['transaction_id'] as string,
    principalAmount: Number(row['principal_amount']),
    interestAmount: Number(row['interest_amount']),
    createdAt: new Date(row['created_at'] as string),
  };
}

class DebtRepository {
  private get db() {
    return getDatabase();
  }

  async findByUserAndAccount(userId: string, accountId: string): Promise<DebtSchedule | null> {
    const row = await this.db('debt_schedules')
      .where({ user_id: userId, account_id: accountId })
      .first();
    return row ? rowToSchedule(row) : null;
  }

  async findAllByUser(userId: string): Promise<DebtSchedule[]> {
    const rows = await this.db('debt_schedules')
      .where({ user_id: userId })
      .orderBy('created_at', 'asc');
    return rows.map(rowToSchedule);
  }

  async upsert(userId: string, data: UpsertDebtScheduleData): Promise<DebtSchedule> {
    const existing = await this.findByUserAndAccount(userId, data.accountId);

    if (existing) {
      await this.db('debt_schedules')
        .where({ user_id: userId, account_id: data.accountId })
        .update({
          principal: data.principal,
          annual_rate: data.annualRate,
          term_months: data.termMonths,
          origination_date: data.originationDate,
          payment_amount: data.paymentAmount,
        });
      const updated = await this.findByUserAndAccount(userId, data.accountId);
      return updated!;
    }

    const id = randomUUID();
    await this.db('debt_schedules').insert({
      id,
      user_id: userId,
      account_id: data.accountId,
      principal: data.principal,
      annual_rate: data.annualRate,
      term_months: data.termMonths,
      origination_date: data.originationDate,
      payment_amount: data.paymentAmount,
    });
    const created = await this.db('debt_schedules').where({ id }).first();
    return rowToSchedule(created as Record<string, unknown>);
  }

  async delete(userId: string, accountId: string): Promise<void> {
    await this.db('debt_schedules').where({ user_id: userId, account_id: accountId }).delete();
  }

  async createSplit(data: {
    transactionId: string;
    principalAmount: number;
    interestAmount: number;
  }): Promise<TransactionSplit> {
    const id = randomUUID();
    await this.db('transaction_splits').insert({
      id,
      transaction_id: data.transactionId,
      principal_amount: data.principalAmount,
      interest_amount: data.interestAmount,
    });
    const row = await this.db('transaction_splits').where({ id }).first();
    return rowToSplit(row as Record<string, unknown>);
  }

  async findSplitByTransaction(transactionId: string): Promise<TransactionSplit | null> {
    const row = await this.db('transaction_splits')
      .where({ transaction_id: transactionId })
      .first();
    return row ? rowToSplit(row) : null;
  }
}

export const debtRepository = new DebtRepository();
