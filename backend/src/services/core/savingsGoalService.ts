import { savingsGoalRepository } from '@repositories/savingsGoalRepository';
import { accountRepository } from '@repositories/accountRepository';
import { budgetLineRepository } from '@repositories/budgetLineRepository';
import { AppError } from '@middleware/errorHandler';
import type {
  SavingsGoal,
  BudgetLineFrequency,
  CreateSavingsGoalData,
  UpdateSavingsGoalData,
  SavingsGoalProgress,
} from '@typings/core.types';

/** Convert a BudgetLine frequency + amount to a monthly contribution in dollars. */
function toMonthlyAmount(
  amount: number,
  frequency: BudgetLineFrequency,
  frequencyInterval: number | null
): number {
  switch (frequency) {
    case 'weekly':
      return amount * (52 / 12);
    case 'biweekly':
      return amount * (26 / 12);
    case 'semi_monthly':
      return amount * 2;
    case 'twice_monthly':
      return amount * 2;
    case 'monthly':
      return amount;
    case 'annually':
      return amount / 12;
    case 'every_n_days': {
      const interval = frequencyInterval ?? 30;
      return amount * (365 / interval / 12);
    }
    case 'one_time':
      return 0;
  }
}

class SavingsGoalService {
  async listGoals(userId: string): Promise<SavingsGoal[]> {
    return savingsGoalRepository.findAllByUser(userId);
  }

  async getGoal(userId: string, goalId: string): Promise<SavingsGoal> {
    const goal = await savingsGoalRepository.findById(userId, goalId);
    if (!goal) throw new AppError('Savings goal not found', 404);
    return goal;
  }

  async createGoal(
    userId: string,
    input: Omit<CreateSavingsGoalData, 'userId'>
  ): Promise<SavingsGoal> {
    const account = await accountRepository.findById(input.accountId, userId);
    if (!account) throw new AppError('Account not found', 404);
    if (input.budgetLineId) {
      const bl = await budgetLineRepository.findById(input.budgetLineId, userId);
      if (!bl) throw new AppError('Budget line not found', 404);
    }
    return savingsGoalRepository.create({ ...input, userId });
  }

  async updateGoal(
    userId: string,
    goalId: string,
    input: UpdateSavingsGoalData
  ): Promise<SavingsGoal> {
    const existing = await savingsGoalRepository.findById(userId, goalId);
    if (!existing) throw new AppError('Savings goal not found', 404);
    if (input.budgetLineId) {
      const bl = await budgetLineRepository.findById(input.budgetLineId, userId);
      if (!bl) throw new AppError('Budget line not found', 404);
    }
    const updated = await savingsGoalRepository.update(userId, goalId, input);
    return updated!;
  }

  async deleteGoal(userId: string, goalId: string): Promise<void> {
    const existing = await savingsGoalRepository.findById(userId, goalId);
    if (!existing) throw new AppError('Savings goal not found', 404);
    await savingsGoalRepository.delete(userId, goalId);
  }

  async getProgress(userId: string, goalId: string): Promise<SavingsGoalProgress> {
    const goal = await savingsGoalRepository.findById(userId, goalId);
    if (!goal) throw new AppError('Savings goal not found', 404);

    const account = await accountRepository.findById(goal.accountId, userId);
    if (!account) throw new AppError('Associated account not found', 404);

    const currentAmount = Math.max(account.currentBalance, 0);
    const percentComplete =
      goal.targetAmount > 0
        ? Math.min(Math.round((currentAmount / goal.targetAmount) * 10000) / 100, 100)
        : 0;

    let daysToGoal: number | null = null;
    let projectedDate: string | null = null;

    if (goal.targetDate) {
      const today = new Date();
      const target = new Date(goal.targetDate + 'T00:00:00Z');
      daysToGoal = Math.max(
        Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)),
        0
      );
    }

    // If a budget line is linked, use its monthly contribution to project completion.
    if (goal.budgetLineId && currentAmount < goal.targetAmount) {
      const bl = await budgetLineRepository.findById(goal.budgetLineId, userId);
      if (bl && bl.amount > 0) {
        const monthlyContribution = toMonthlyAmount(bl.amount, bl.frequency, bl.frequencyInterval);
        if (monthlyContribution > 0) {
          const remaining = goal.targetAmount - currentAmount;
          const monthsNeeded = Math.ceil(remaining / monthlyContribution);
          const projected = new Date();
          projected.setMonth(projected.getMonth() + monthsNeeded);
          projectedDate = projected.toISOString().slice(0, 10);
          // daysToGoal not meaningful when derived from contribution rate rather than target date
          if (!goal.targetDate) daysToGoal = monthsNeeded * 30;
        }
      }
    } else if (daysToGoal !== null && daysToGoal > 0 && currentAmount < goal.targetAmount) {
      const remaining = goal.targetAmount - currentAmount;
      const dailyRate = remaining / daysToGoal;
      if (dailyRate > 0) {
        const daysNeeded = Math.ceil(remaining / dailyRate);
        const projected = new Date();
        projected.setDate(projected.getDate() + daysNeeded);
        projectedDate = projected.toISOString().slice(0, 10);
      }
    }

    return {
      goalId: goal.id,
      name: goal.name,
      currentAmount,
      targetAmount: goal.targetAmount,
      percentComplete,
      daysToGoal,
      projectedDate,
    };
  }
}

export const savingsGoalService = new SavingsGoalService();
