import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { transactionApi } from '../api/transactionApi';
import { useAuthStore } from '@features/auth/stores/authStore';
import { db } from '@lib/db';
import {
  isOfflineError,
  getDecryptedTransactions,
  queueMutation,
  OfflineWriteNotAvailableError,
  buildLocalTransaction,
} from '@lib/db/offlineHelpers';
import { hasIndexedDbKey, encryptFields, decryptFields, TX_ENCRYPTED_FIELDS } from '@lib/db/crypto';
import { useNetworkStore } from '@stores/networkStore';
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
      try {
        const res = await transactionApi.list(filters);
        const { data: txData } = res.data;
        // Background-populate Dexie (encrypt sensitive fields before storing)
        void (async () => {
          const encrypted = await Promise.all(
            txData.data.map((tx) => encryptFields(tx as unknown as Record<string, unknown>, TX_ENCRYPTED_FIELDS))
          );
          void db.transactions.bulkPut(encrypted as unknown as typeof txData.data);
        })();
        return txData;
      } catch (err) {
        if (isOfflineError(err)) {
          const userId = useAuthStore.getState().user?.id ?? '';
          const txs = await getDecryptedTransactions(userId, filters);
          return { data: txs, total: txs.length, page: 1, limit: txs.length };
        }
        throw err;
      }
    },
    networkMode: 'always',
  });
}

export function useTransaction(id: string) {
  return useQuery({
    queryKey: [...TRANSACTIONS_KEY, id],
    queryFn: async () => {
      try {
        const res = await transactionApi.get(id);
        return res.data.data.transaction;
      } catch (err) {
        if (isOfflineError(err)) {
          const stored = await db.transactions.get(id);
          if (stored) {
            const decrypted = await decryptFields(
              stored as unknown as Record<string, unknown>,
              TX_ENCRYPTED_FIELDS
            );
            return decrypted as unknown as typeof stored;
          }
        }
        throw err;
      }
    },
    enabled: Boolean(id),
    networkMode: 'always',
  });
}

export function useCreateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateTransactionInput) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const localId = crypto.randomUUID();
        const userId = useAuthStore.getState().user?.id ?? '';
        const localTx = buildLocalTransaction(data, localId, userId);
        // Encrypt sensitive fields before storing
        const encrypted = await encryptFields(
          localTx as unknown as Record<string, unknown>,
          TX_ENCRYPTED_FIELDS
        );
        await db.transactions.put(encrypted as unknown as typeof localTx);
        await queueMutation({
          method: 'POST',
          url: '/transactions',
          body: JSON.stringify(data),
          entityType: 'transaction',
          localId,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof transactionApi.create>>;
      }
      return transactionApi.create(data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      qc.invalidateQueries({ queryKey: ['accounts'] }); // balance changed
    },
  });
}

export function useUpdateTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTransactionInput }) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const existing = await db.transactions.get(id);
        if (existing) {
          const updated = {
            ...existing,
            ...data,
            updatedAt: new Date().toISOString(),
          } as typeof existing;
          // Re-encrypt sensitive fields if they were changed
          const fieldsToEncrypt = TX_ENCRYPTED_FIELDS.filter((f) => f in data);
          const encrypted = fieldsToEncrypt.length > 0
            ? await encryptFields(updated as unknown as Record<string, unknown>, fieldsToEncrypt)
            : updated as unknown as Record<string, unknown>;
          await db.transactions.put(encrypted as unknown as typeof existing);
        }
        await queueMutation({
          method: 'PATCH',
          url: `/transactions/${id}`,
          body: JSON.stringify(data),
          entityType: 'transaction',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof transactionApi.update>>;
      }
      return transactionApi.update(id, data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: TRANSACTIONS_KEY });
      qc.invalidateQueries({ queryKey: ['accounts'] });
    },
  });
}

export function useDeleteTransaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        await db.transactions.delete(id);
        await queueMutation({
          method: 'DELETE',
          url: `/transactions/${id}`,
          body: null,
          entityType: 'transaction',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof transactionApi.delete>>;
      }
      return transactionApi.delete(id);
    },
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
