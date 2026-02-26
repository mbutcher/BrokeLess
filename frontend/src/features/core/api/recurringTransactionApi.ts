import { apiClient } from '@lib/api/client';
import type {
  RecurringTransaction,
  CreateRecurringTransactionInput,
  UpdateRecurringTransactionInput,
} from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
}

export const recurringTransactionApi = {
  list: () =>
    apiClient.get<ApiResponse<{ recurringTransactions: RecurringTransaction[] }>>(
      '/recurring-transactions'
    ),

  create: (data: CreateRecurringTransactionInput) =>
    apiClient.post<ApiResponse<{ recurringTransaction: RecurringTransaction }>>(
      '/recurring-transactions',
      data
    ),

  update: (id: string, data: UpdateRecurringTransactionInput) =>
    apiClient.patch<ApiResponse<{ recurringTransaction: RecurringTransaction }>>(
      `/recurring-transactions/${id}`,
      data
    ),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/recurring-transactions/${id}`),

  generate: () =>
    apiClient.post<ApiResponse<{ generated: number }>>('/recurring-transactions/generate', {}),

  skip: (id: string) =>
    apiClient.post<ApiResponse<{ recurringTransaction: RecurringTransaction }>>(
      `/recurring-transactions/${id}/skip`,
      {}
    ),
};
