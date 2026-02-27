import { randomUUID } from 'crypto';
import { getDatabase } from '@config/database';
import type { Category, CreateCategoryData, UpdateCategoryData } from '@typings/core.types';

function rowToCategory(row: Record<string, unknown>): Category {
  return {
    id: row['id'] as string,
    userId: row['user_id'] as string,
    name: row['name'] as string,
    color: (row['color'] as string | null) ?? null,
    icon: (row['icon'] as string | null) ?? null,
    isIncome: Boolean(row['is_income']),
    parentId: (row['parent_id'] as string | null) ?? null,
    isActive: Boolean(row['is_active']),
    createdAt: new Date(row['created_at'] as string),
    updatedAt: new Date(row['updated_at'] as string),
  };
}

class CategoryRepository {
  private get db() {
    return getDatabase();
  }

  async findById(id: string, userId: string): Promise<Category | null> {
    const row: unknown = await this.db('categories').where({ id, user_id: userId }).first();
    return row ? rowToCategory(row as Record<string, unknown>) : null;
  }

  async findAllForUser(userId: string): Promise<Category[]> {
    const rows = await this.db('categories').where({ user_id: userId }).orderBy('name', 'asc');
    return rows.map(rowToCategory);
  }

  async createBatch(rows: CreateCategoryData[]): Promise<void> {
    if (rows.length === 0) return;
    await this.db('categories').insert(
      rows.map((r) => ({
        id: randomUUID(),
        user_id: r.userId,
        name: r.name,
        color: r.color ?? null,
        icon: r.icon ?? null,
        is_income: r.isIncome,
        parent_id: r.parentId ?? null,
      }))
    );
  }

  async create(data: CreateCategoryData): Promise<Category> {
    const id = randomUUID();
    await this.db('categories').insert({
      id,
      user_id: data.userId,
      name: data.name,
      color: data.color ?? null,
      icon: data.icon ?? null,
      is_income: data.isIncome,
      parent_id: data.parentId ?? null,
    });
    const row: unknown = await this.db('categories').where({ id }).first();
    return rowToCategory(row as Record<string, unknown>);
  }

  async update(id: string, userId: string, data: UpdateCategoryData): Promise<Category | null> {
    const updates: Record<string, unknown> = {};
    if (data.name !== undefined) updates['name'] = data.name;
    if (data.color !== undefined) updates['color'] = data.color;
    if (data.icon !== undefined) updates['icon'] = data.icon;
    if (data.isActive !== undefined) updates['is_active'] = data.isActive;

    if (Object.keys(updates).length === 0) return this.findById(id, userId);

    await this.db('categories').where({ id, user_id: userId }).update(updates);
    return this.findById(id, userId);
  }

  async softDelete(id: string, userId: string): Promise<void> {
    await this.db('categories').where({ id, user_id: userId }).update({ is_active: false });
  }
}

export const categoryRepository = new CategoryRepository();
