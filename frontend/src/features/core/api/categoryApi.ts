import { apiClient } from '@lib/api/client';
import type { Category, CreateCategoryInput, UpdateCategoryInput } from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
}

export interface CategoryUsage {
  transactionCount: number;
  budgetLineCount: number;
}

export const categoryApi = {
  list: () => apiClient.get<ApiResponse<{ categories: Category[] }>>('/categories'),

  create: (data: CreateCategoryInput) =>
    apiClient.post<ApiResponse<{ category: Category }>>('/categories', data),

  update: (id: string, data: UpdateCategoryInput) =>
    apiClient.patch<ApiResponse<{ category: Category }>>(`/categories/${id}`, data),

  archive: (id: string) => apiClient.delete<ApiResponse<null>>(`/categories/${id}`),

  getUsage: (id: string) =>
    apiClient.get<ApiResponse<{ usage: CategoryUsage }>>(`/categories/${id}/usage`),

  reassignAndArchive: (id: string, targetCategoryId: string | null) =>
    apiClient.post<ApiResponse<{ reassigned: number }>>(`/categories/${id}/reassign`, {
      targetCategoryId,
    }),
};
