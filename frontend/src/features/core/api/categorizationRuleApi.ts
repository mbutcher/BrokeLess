import { apiClient } from '@lib/api/client';
import type { CategorizationRule } from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
}

export const categorizationRuleApi = {
  list: () =>
    apiClient.get<ApiResponse<{ rules: CategorizationRule[] }>>('/categorization-rules'),

  create: (data: { payee: string; budgetLineId?: string | null }) =>
    apiClient.post<ApiResponse<{ rule: CategorizationRule }>>('/categorization-rules', data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/categorization-rules/${id}`),
};
