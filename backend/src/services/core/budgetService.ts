import { budgetRepository } from '@repositories/budgetRepository';
import { AppError } from '@middleware/errorHandler';
import type {
  Budget,
  BudgetProgress,
  BudgetCategoryEntry,
  CreateBudgetData,
  UpdateBudgetData,
} from '@typings/core.types';

class BudgetService {
  async listBudgets(userId: string): Promise<Budget[]> {
    return budgetRepository.findAllForUser(userId);
  }

  async getBudget(userId: string, id: string): Promise<Budget> {
    const budget = await budgetRepository.findById(id, userId);
    if (!budget) throw new AppError('Budget not found', 404);
    return budget;
  }

  async createBudget(userId: string, input: Omit<CreateBudgetData, 'userId'>): Promise<Budget> {
    if (input.startDate >= input.endDate) {
      throw new AppError('start_date must be before end_date', 422);
    }
    return budgetRepository.create({ ...input, userId });
  }

  async updateBudget(userId: string, id: string, input: UpdateBudgetData): Promise<Budget> {
    const existing = await budgetRepository.findById(id, userId);
    if (!existing) throw new AppError('Budget not found', 404);

    const startDate = input.startDate ?? existing.startDate.toISOString().substring(0, 10);
    const endDate = input.endDate ?? existing.endDate.toISOString().substring(0, 10);
    if (startDate >= endDate) {
      throw new AppError('start_date must be before end_date', 422);
    }

    const updated = await budgetRepository.update(id, userId, input);
    return updated!;
  }

  async deleteBudget(userId: string, id: string): Promise<void> {
    const existing = await budgetRepository.findById(id, userId);
    if (!existing) throw new AppError('Budget not found', 404);
    await budgetRepository.delete(id, userId);
  }

  async getBudgetProgress(userId: string, id: string): Promise<BudgetProgress> {
    const budget = await budgetRepository.findById(id, userId);
    if (!budget) throw new AppError('Budget not found', 404);

    const categories = await budgetRepository.getBudgetProgress(id, userId);

    const totalAllocated = categories.reduce((sum, c) => sum + c.allocated, 0);
    const totalSpent = categories.reduce((sum, c) => sum + c.spent, 0);

    return {
      budget,
      categories,
      totalAllocated,
      totalSpent,
      totalRemaining: totalAllocated - totalSpent,
    };
  }

  async upsertBudgetCategories(
    userId: string,
    budgetId: string,
    entries: BudgetCategoryEntry[]
  ): Promise<void> {
    const budget = await budgetRepository.findById(budgetId, userId);
    if (!budget) throw new AppError('Budget not found', 404);
    await budgetRepository.upsertCategories(budgetId, entries);
  }
}

export const budgetService = new BudgetService();
