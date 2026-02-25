import { categoryRepository } from '@repositories/categoryRepository';
import { AppError } from '@middleware/errorHandler';
import type { Category, CreateCategoryData, UpdateCategoryData } from '@typings/core.types';

/** Default categories seeded for each new user at registration. */
const DEFAULT_CATEGORIES: Array<Omit<CreateCategoryData, 'userId'>> = [
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

class CategoryService {
  /**
   * Called at user registration to populate their category list with sensible defaults.
   */
  async seedDefaultsForUser(userId: string): Promise<void> {
    await categoryRepository.createBatch(DEFAULT_CATEGORIES.map((c) => ({ ...c, userId })));
  }

  async listCategories(userId: string): Promise<Category[]> {
    return categoryRepository.findAllForUser(userId);
  }

  async getCategory(userId: string, id: string): Promise<Category> {
    const category = await categoryRepository.findById(id, userId);
    if (!category) throw new AppError('Category not found', 404);
    return category;
  }

  async createCategory(
    userId: string,
    input: Omit<CreateCategoryData, 'userId'>
  ): Promise<Category> {
    return categoryRepository.create({ ...input, userId });
  }

  async updateCategory(userId: string, id: string, input: UpdateCategoryData): Promise<Category> {
    const existing = await categoryRepository.findById(id, userId);
    if (!existing) throw new AppError('Category not found', 404);

    const updated = await categoryRepository.update(id, userId, input);
    return updated!;
  }

  async archiveCategory(userId: string, id: string): Promise<void> {
    const existing = await categoryRepository.findById(id, userId);
    if (!existing) throw new AppError('Category not found', 404);
    if (!existing.isActive) throw new AppError('Category is already archived', 409);

    await categoryRepository.softDelete(id, userId);
  }
}

export const categoryService = new CategoryService();
