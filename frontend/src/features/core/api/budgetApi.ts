import { apiClient } from '@lib/api/client';
import type {
  Budget,
  BudgetProgress,
  BudgetCategoryEntry,
  CreateBudgetInput,
  UpdateBudgetInput,
} from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
}

export const budgetApi = {
  list: () =>
    apiClient.get<ApiResponse<{ budgets: Budget[] }>>('/budgets'),

  get: (id: string) =>
    apiClient.get<ApiResponse<{ budget: BudgetProgress }>>(`/budgets/${id}`),

  create: (data: CreateBudgetInput) =>
    apiClient.post<ApiResponse<{ budget: Budget }>>('/budgets', data),

  update: (id: string, data: UpdateBudgetInput) =>
    apiClient.patch<ApiResponse<{ budget: Budget }>>(`/budgets/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/budgets/${id}`),

  upsertCategories: (id: string, categories: BudgetCategoryEntry[]) =>
    apiClient.put<ApiResponse<null>>(`/budgets/${id}/categories`, { categories }),
};
