import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import type {
  SavingsGoal,
  CreateSavingsGoalData,
  UpdateSavingsGoalData,
} from '@typings/core.types';

function rowToGoal(row: Record<string, unknown>): SavingsGoal {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    accountId: row['account_id'] as string,
    budgetLineId: (row['budget_line_id'] as string | null) ?? null,
    name: row['name'] as string,
    targetAmount: Number(row['target_amount']),
    targetDate: (row['target_date'] as string | null) ?? null,
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class SavingsGoalRepository {
  private get db() {
    return getDatabase();
  }

  async findAllByUser(userId: string): Promise<SavingsGoal[]> {
    const rows = await this.db('savings_goals')
      .where({ user_id: userId })
      .orderBy('created_at', 'asc');
    return rows.map(rowToGoal);
  }

  async findById(userId: string, goalId: string): Promise<SavingsGoal | null> {
    const row: unknown = await this.db('savings_goals')
      .where({ id: goalId, user_id: userId })
      .first();
    return row ? rowToGoal(row as Record<string, unknown>) : null;
  }

  async create(data: CreateSavingsGoalData): Promise<SavingsGoal> {
    const id = randomUUID();
    await this.db('savings_goals').insert({
      id,
      user_id: data.userId,
      account_id: data.accountId,
      budget_line_id: data.budgetLineId ?? null,
      name: data.name,
      target_amount: data.targetAmount,
      target_date: data.targetDate ?? null,
    });
    const row: unknown = await this.db('savings_goals').where({ id }).first();
    return rowToGoal(row as Record<string, unknown>);
  }

  async update(
    userId: string,
    goalId: string,
    data: UpdateSavingsGoalData
  ): Promise<SavingsGoal | null> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates['name'] = data.name;
    if (data.targetAmount !== undefined) updates['target_amount'] = data.targetAmount;
    if (data.targetDate !== undefined) updates['target_date'] = data.targetDate;
    if (data.budgetLineId !== undefined) updates['budget_line_id'] = data.budgetLineId;

    if (Object.keys(updates).length === 0) return this.findById(userId, goalId);

    await this.db('savings_goals').where({ id: goalId, user_id: userId }).update(updates);
    return this.findById(userId, goalId);
  }

  async delete(userId: string, goalId: string): Promise<void> {
    await this.db('savings_goals').where({ id: goalId, user_id: userId }).delete();
  }
}

export const savingsGoalRepository = new SavingsGoalRepository();
