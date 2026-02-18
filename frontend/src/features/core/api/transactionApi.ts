import { apiClient } from '@lib/api/client';
import type {
  Transaction,
  PaginatedTransactions,
  TransactionFilters,
  TransferCandidate,
  CreateTransactionInput,
  UpdateTransactionInput,
  LinkType,
} from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
}

interface CreateTransactionResponseData {
  transaction: Transaction;
  transferCandidates: TransferCandidate[];
}

export const transactionApi = {
  list: (filters?: TransactionFilters) =>
    apiClient.get<ApiResponse<PaginatedTransactions>>('/transactions', { params: filters }),

  get: (id: string) =>
    apiClient.get<ApiResponse<{ transaction: Transaction }>>(`/transactions/${id}`),

  create: (data: CreateTransactionInput) =>
    apiClient.post<ApiResponse<CreateTransactionResponseData>>('/transactions', data),

  update: (id: string, data: UpdateTransactionInput) =>
    apiClient.patch<ApiResponse<{ transaction: Transaction }>>(`/transactions/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/transactions/${id}`),

  getCandidates: (id: string) =>
    apiClient.get<ApiResponse<{ candidates: TransferCandidate[] }>>(`/transactions/${id}/candidates`),

  link: (id: string, targetTransactionId: string, linkType?: LinkType) =>
    apiClient.post<ApiResponse<null>>(`/transactions/${id}/link`, {
      targetTransactionId,
      linkType,
    }),

  unlink: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/transactions/${id}/link`),
};
