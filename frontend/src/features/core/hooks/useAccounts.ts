import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountApi } from '../api/accountApi';
import { useAuthStore } from '@features/auth/stores/authStore';
import { db } from '@lib/db';
import {
  isOfflineError,
  getDecryptedAccounts,
  queueMutation,
  OfflineWriteNotAvailableError,
} from '@lib/db/offlineHelpers';
import { hasIndexedDbKey } from '@lib/db/crypto';
import { useNetworkStore } from '@stores/networkStore';
import type { Account, CreateAccountInput, UpdateAccountInput } from '../types';

export const ACCOUNTS_KEY = ['accounts'] as const;

export function useAccounts() {
  return useQuery({
    queryKey: ACCOUNTS_KEY,
    queryFn: async () => {
      try {
        const res = await accountApi.list();
        const accounts = res.data.data.accounts;
        // Background update to Dexie so offline reads are fresh
        void db.accounts.bulkPut(accounts);
        return accounts;
      } catch (err) {
        if (isOfflineError(err)) {
          const userId = useAuthStore.getState().user?.id ?? '';
          return getDecryptedAccounts(userId);
        }
        throw err;
      }
    },
    // Don't retry on network errors — we handle them via the offline fallback above
    networkMode: 'always',
  });
}

export function useAccount(id: string) {
  return useQuery({
    queryKey: [...ACCOUNTS_KEY, id],
    queryFn: async () => {
      try {
        const res = await accountApi.get(id);
        return res.data.data.account;
      } catch (err) {
        if (isOfflineError(err)) {
          return (await db.accounts.get(id)) as Account | undefined;
        }
        throw err;
      }
    },
    enabled: Boolean(id),
    networkMode: 'always',
  });
}

export function useCreateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateAccountInput) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const localId = crypto.randomUUID();
        const userId = useAuthStore.getState().user?.id ?? '';
        const now = new Date().toISOString();
        const localAccount: Account = {
          id: localId,
          userId,
          name: data.name,
          type: data.type,
          isAsset: data.isAsset,
          startingBalance: data.startingBalance,
          currentBalance: data.startingBalance,
          currency: data.currency,
          color: data.color ?? null,
          institution: data.institution ?? null,
          annualRate: data.annualRate ?? null,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        };
        await db.accounts.put(localAccount);
        await queueMutation({
          method: 'POST',
          url: '/accounts',
          body: JSON.stringify(data),
          entityType: 'account',
          localId,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof accountApi.create>>;
      }
      return accountApi.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });
}

export function useUpdateAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateAccountInput }) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const existing = await db.accounts.get(id);
        if (existing) {
          await db.accounts.put({
            ...existing,
            ...data,
            updatedAt: new Date().toISOString(),
          });
        }
        await queueMutation({
          method: 'PATCH',
          url: `/accounts/${id}`,
          body: JSON.stringify(data),
          entityType: 'account',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof accountApi.update>>;
      }
      return accountApi.update(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });
}

export function useArchiveAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const existing = await db.accounts.get(id);
        if (existing) {
          await db.accounts.put({
            ...existing,
            isActive: false,
            updatedAt: new Date().toISOString(),
          });
        }
        await queueMutation({
          method: 'DELETE',
          url: `/accounts/${id}`,
          body: null,
          entityType: 'account',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof accountApi.archive>>;
      }
      return accountApi.archive(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ACCOUNTS_KEY }),
  });
}
