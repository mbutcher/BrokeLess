import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetApi } from '../api/budgetApi';
import { useAuthStore } from '@features/auth/stores/authStore';
import { db } from '@lib/db';
import {
  isOfflineError,
  getDecryptedBudgets,
  queueMutation,
  OfflineWriteNotAvailableError,
} from '@lib/db/offlineHelpers';
import { hasIndexedDbKey } from '@lib/db/crypto';
import { useNetworkStore } from '@stores/networkStore';
import type { BudgetCategoryEntry, CreateBudgetInput, UpdateBudgetInput } from '../types';

export const BUDGETS_KEY = ['budgets'] as const;

export function useBudgets() {
  return useQuery({
    queryKey: BUDGETS_KEY,
    queryFn: async () => {
      try {
        const res = await budgetApi.list();
        const budgets = res.data.data.budgets;
        void db.budgets.bulkPut(budgets);
        return budgets;
      } catch (err) {
        if (isOfflineError(err)) {
          const userId = useAuthStore.getState().user?.id ?? '';
          return getDecryptedBudgets(userId);
        }
        throw err;
      }
    },
    networkMode: 'always',
  });
}

export function useBudgetProgress(id: string) {
  return useQuery({
    queryKey: [...BUDGETS_KEY, id],
    queryFn: async () => {
      const res = await budgetApi.get(id);
      return res.data.data.budget;
    },
    enabled: Boolean(id),
    networkMode: 'always',
  });
}

export function useCreateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBudgetInput) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const localId = crypto.randomUUID();
        const userId = useAuthStore.getState().user?.id ?? '';
        const now = new Date().toISOString();
        await db.budgets.put({
          id: localId,
          userId,
          name: data.name,
          startDate: data.startDate,
          endDate: data.endDate,
          isActive: true,
          createdAt: now,
          updatedAt: now,
        });
        await queueMutation({
          method: 'POST',
          url: '/budgets',
          body: JSON.stringify(data),
          entityType: 'budget',
          localId,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof budgetApi.create>>;
      }
      return budgetApi.create(data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BUDGETS_KEY }),
  });
}

export function useUpdateBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBudgetInput }) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const existing = await db.budgets.get(id);
        if (existing) {
          await db.budgets.put({
            ...existing,
            ...data,
            updatedAt: new Date().toISOString(),
          });
        }
        await queueMutation({
          method: 'PATCH',
          url: `/budgets/${id}`,
          body: JSON.stringify(data),
          entityType: 'budget',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof budgetApi.update>>;
      }
      return budgetApi.update(id, data);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BUDGETS_KEY }),
  });
}

export function useDeleteBudget() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const existing = await db.budgets.get(id);
        if (existing) {
          await db.budgets.put({
            ...existing,
            isActive: false,
            updatedAt: new Date().toISOString(),
          });
        }
        await queueMutation({
          method: 'DELETE',
          url: `/budgets/${id}`,
          body: null,
          entityType: 'budget',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof budgetApi.delete>>;
      }
      return budgetApi.delete(id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: BUDGETS_KEY }),
  });
}

export function useUpsertBudgetCategories() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, categories }: { id: string; categories: BudgetCategoryEntry[] }) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        // Optimistically update local budgetCategories rows
        const now = new Date().toISOString();
        const rows = categories.map((c) => ({
          id: crypto.randomUUID(),
          budgetId: id,
          categoryId: c.categoryId,
          allocatedAmount: c.allocatedAmount,
          createdAt: now,
          updatedAt: now,
        }));
        await db.budgetCategories.bulkPut(rows);
        await queueMutation({
          method: 'POST',
          url: `/budgets/${id}/categories`,
          body: JSON.stringify({ categories }),
          entityType: 'budgetCategory',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof budgetApi.upsertCategories>>;
      }
      return budgetApi.upsertCategories(id, categories);
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: [...BUDGETS_KEY, variables.id] });
    },
  });
}
