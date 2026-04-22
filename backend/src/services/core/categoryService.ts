import { categoryRepository } from '@repositories/categoryRepository';
import { budgetLineRepository } from '@repositories/budgetLineRepository';
import { transactionRepository } from '@repositories/transactionRepository';
import { AppError } from '@middleware/errorHandler';
import type { Category, CreateCategoryData, UpdateCategoryData } from '@typings/core.types';

/** Default categories seeded for each new household at setup. */
const DEFAULT_CATEGORIES: Array<Omit<CreateCategoryData, 'householdId'>> = [
  // Income
  { name: 'Salary', icon: 'briefcase', color: '#22c55e', isIncome: true },
  { name: 'Freelance', icon: 'laptop', color: '#16a34a', isIncome: true },
  { name: 'Investment Returns', icon: 'trending-up', color: '#15803d', isIncome: true },
  { name: 'Rental Income', icon: 'home', color: '#166534', isIncome: true },
  { name: 'Other Income', icon: 'plus-circle', color: '#14532d', isIncome: true },
  // Expense
  { name: 'Housing', icon: 'house', color: '#3b82f6', isIncome: false },
  { name: 'Groceries', icon: 'shopping-cart', color: '#f59e0b', isIncome: false },
  { name: 'Dining Out', icon: 'utensils', color: '#ef4444', isIncome: false },
  { name: 'Transportation', icon: 'car', color: '#8b5cf6', isIncome: false },
  { name: 'Utilities', icon: 'zap', color: '#f97316', isIncome: false },
  { name: 'Healthcare', icon: 'heart-pulse', color: '#ec4899', isIncome: false },
  { name: 'Insurance', icon: 'shield', color: '#6366f1', isIncome: false },
  { name: 'Entertainment', icon: 'film', color: '#a855f7', isIncome: false },
  { name: 'Clothing', icon: 'shirt', color: '#d946ef', isIncome: false },
  { name: 'Personal Care', icon: 'sparkles', color: '#db2777', isIncome: false },
  { name: 'Education', icon: 'book-open', color: '#0284c7', isIncome: false },
  { name: 'Subscriptions', icon: 'repeat', color: '#0891b2', isIncome: false },
  { name: 'Travel', icon: 'plane', color: '#0e7490', isIncome: false },
  { name: 'Gifts & Donations', icon: 'gift', color: '#be185d', isIncome: false },
  { name: 'Other Expense', icon: 'more-horizontal', color: '#6b7280', isIncome: false },
];

export interface CategoryUsage {
  transactionCount: number;
  budgetLineCount: number;
}

class CategoryService {
  /**
   * Called at household setup to populate the category list with sensible defaults.
   */
  async seedDefaultsForHousehold(householdId: string): Promise<void> {
    await categoryRepository.createBatch(DEFAULT_CATEGORIES.map((c) => ({ ...c, householdId })));
  }

  async listCategories(householdId: string): Promise<Category[]> {
    return categoryRepository.findAllForHousehold(householdId);
  }

  async getCategory(householdId: string, id: string): Promise<Category> {
    const category = await categoryRepository.findById(id, householdId);
    if (!category) throw new AppError('Category not found', 404);
    return category;
  }

  async getCategoryUsage(householdId: string, id: string, userId: string): Promise<CategoryUsage> {
    const category = await categoryRepository.findById(id, householdId);
    if (!category) throw new AppError('Category not found', 404);
    const [transactionCount, budgetLineCount] = await Promise.all([
      budgetLineRepository.countTransactionsByCategoryId(userId, id),
      budgetLineRepository.countByCategoryId(userId, id),
    ]);
    return { transactionCount, budgetLineCount };
  }

  async createCategory(
    householdId: string,
    input: Omit<CreateCategoryData, 'householdId'>
  ): Promise<Category> {
    return categoryRepository.create({ ...input, householdId });
  }

  async updateCategory(
    householdId: string,
    id: string,
    input: UpdateCategoryData
  ): Promise<Category> {
    const existing = await categoryRepository.findById(id, householdId);
    if (!existing) throw new AppError('Category not found', 404);

    const updated = await categoryRepository.update(id, householdId, input);
    return updated!;
  }

  /**
   * Reassigns all transactions from one category to another, then archives the source.
   * `targetCategoryId` may be null to simply clear the category on those transactions.
   */
  async reassignAndArchive(
    householdId: string,
    id: string,
    userId: string,
    targetCategoryId: string | null
  ): Promise<{ reassigned: number }> {
    const existing = await categoryRepository.findById(id, householdId);
    if (!existing) throw new AppError('Category not found', 404);

    if (targetCategoryId) {
      const target = await categoryRepository.findById(targetCategoryId, householdId);
      if (!target) throw new AppError('Target category not found', 404);
    }

    const reassigned = await transactionRepository.reassignCategory(userId, id, targetCategoryId);
    await categoryRepository.softDelete(id, householdId);
    return { reassigned };
  }

  async archiveCategory(householdId: string, id: string): Promise<void> {
    const existing = await categoryRepository.findById(id, householdId);
    if (!existing) throw new AppError('Category not found', 404);
    if (!existing.isActive) throw new AppError('Category is already archived', 409);

    await categoryRepository.softDelete(id, householdId);
  }
}

export const categoryService = new CategoryService();
