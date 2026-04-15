import { apiClient } from '@lib/api/client';
import type {
  Account,
  CreateAccountInput,
  UpdateAccountInput,
} from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
}

export const accountApi = {
  list: () =>
    apiClient.get<ApiResponse<{ accounts: Account[] }>>('/accounts'),

  get: (id: string) =>
    apiClient.get<ApiResponse<{ account: Account }>>(`/accounts/${id}`),

  create: (data: CreateAccountInput) =>
    apiClient.post<ApiResponse<{ account: Account }>>('/accounts', data),

  update: (id: string, data: UpdateAccountInput) =>
    apiClient.patch<ApiResponse<{ account: Account }>>(`/accounts/${id}`, data),

  archive: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/accounts/${id}`),

  transactionCount: (id: string) =>
    apiClient.get<ApiResponse<{ count: number }>>(`/accounts/${id}/transaction-count`),

  destroy: (id: string) =>
    apiClient.post<ApiResponse<null>>(`/accounts/${id}/delete`),
};
