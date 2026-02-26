import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { recurringTransactionApi } from '../api/recurringTransactionApi';
import { useAuthStore } from '@features/auth/stores/authStore';
import { db } from '@lib/db';
import {
  isOfflineError,
  queueMutation,
  OfflineWriteNotAvailableError,
} from '@lib/db/offlineHelpers';
import { hasIndexedDbKey } from '@lib/db/crypto';
import { useNetworkStore } from '@stores/networkStore';
import type { CreateRecurringTransactionInput, UpdateRecurringTransactionInput } from '../types';

export const RECURRING_TRANSACTIONS_KEY = ['recurring-transactions'] as const;

export function useRecurringTransactions() {
  return useQuery({
    queryKey: RECURRING_TRANSACTIONS_KEY,
    queryFn: async () => {
      try {
        const res = await recurringTransactionApi.list();
        const records = res.data.data.recurringTransactions;
        void db.recurringTransactions.bulkPut(records);
        return records;
      } catch (err) {
        if (isOfflineError(err)) {
          const userId = useAuthStore.getState().user?.id ?? '';
          return db.recurringTransactions.where('userId').equals(userId).toArray();
        }
        throw err;
      }
    },
    networkMode: 'always',
  });
}

export function useCreateRecurringTransaction() {
  const qc = useQueryClient();
  const { incrementPending } = useNetworkStore.getState();
  return useMutation({
    mutationFn: async (data: CreateRecurringTransactionInput) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const localId = crypto.randomUUID();
        const userId = useAuthStore.getState().user?.id ?? '';
        const now = new Date().toISOString();
        await db.recurringTransactions.put({
          id: localId,
          userId,
          accountId: data.accountId,
          amount: data.amount,
          description: data.description ?? null,
          payee: data.payee ?? null,
          notes: data.notes ?? null,
          categoryId: data.categoryId ?? null,
          frequency: data.frequency,
          frequencyInterval: data.frequencyInterval ?? null,
          anchorDate: data.anchorDate,
          nextDueDate: data.anchorDate,
          endDate: data.endDate ?? null,
          isActive: true,
          lastGeneratedAt: null,
          createdAt: now,
          updatedAt: now,
        });
        await queueMutation({
          method: 'POST',
          url: '/recurring-transactions',
          body: JSON.stringify(data),
          entityType: 'recurringTransaction',
          localId,
        });
        incrementPending();
        return null;
      }
      const res = await recurringTransactionApi.create(data);
      return res.data.data.recurringTransaction;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RECURRING_TRANSACTIONS_KEY }),
  });
}

export function useUpdateRecurringTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateRecurringTransactionInput }) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const existing = await db.recurringTransactions.get(id);
        if (existing) {
          await db.recurringTransactions.put({ ...existing, ...data, updatedAt: new Date().toISOString() });
        }
        await queueMutation({
          method: 'PATCH',
          url: `/recurring-transactions/${id}`,
          body: JSON.stringify(data),
          entityType: 'recurringTransaction',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null;
      }
      const res = await recurringTransactionApi.update(id, data);
      return res.data.data.recurringTransaction;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RECURRING_TRANSACTIONS_KEY }),
  });
}

export function useDeleteRecurringTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        await db.recurringTransactions.update(id, { isActive: false });
        await queueMutation({
          method: 'DELETE',
          url: `/recurring-transactions/${id}`,
          body: null,
          entityType: 'recurringTransaction',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return;
      }
      await recurringTransactionApi.delete(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RECURRING_TRANSACTIONS_KEY }),
  });
}

export function useSkipRecurringTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) throw new Error('Skip requires an online connection.');
      const res = await recurringTransactionApi.skip(id);
      return res.data.data.recurringTransaction;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: RECURRING_TRANSACTIONS_KEY }),
  });
}
