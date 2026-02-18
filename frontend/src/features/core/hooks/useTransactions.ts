import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionApi } from '../api/transactionApi';
import type {
  CreateTransactionInput,
  UpdateTransactionInput,
  TransactionFilters,
  LinkType,
} from '../types';

export const TRANSACTIONS_KEY = ['transactions'] as const;

export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, filters],
    queryFn: async () => {
      const res = await transactionApi.list(filters);
      return res.data.data;
    },
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, id],
    queryFn: async () => {
      const res = await transactionApi.get(id);
      return res.data.data.transaction;
    },
    enabled: Boolean(id),
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTransactionInput) => transactionApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      qc.invalidateQueries({ queryKey: ['accounts'] }); // balance changed
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateTransactionInput }) =>
      transactionApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionApi.delete(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useLinkTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      targetTransactionId,
      linkType,
    }: {
      id: string;
      targetTransactionId: string;
      linkType?: LinkType;
    }) => transactionApi.link(id, targetTransactionId, linkType),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY }),
  });
}

export function useUnlinkTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => transactionApi.unlink(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY }),
  });
}
