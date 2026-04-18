import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { budgetLineApi } from '../api/budgetLineApi';
import { useAuthStore } from '@features/auth/stores/authStore';
import type { RolloverSummary } from '../types';
import { db } from '@lib/db';
import {
  isOfflineError,
  getDecryptedBudgetLines,
  queueMutation,
  OfflineWriteNotAvailableError,
} from '@lib/db/offlineHelpers';
import { hasIndexedDbKey } from '@lib/db/crypto';
import { useNetworkStore } from '@stores/networkStore';
import type { CreateBudgetLineInput, UpdateBudgetLineInput } from '../types';
import { BUDGET_VIEW_KEY } from './useBudgetView';

export const BUDGET_LINES_KEY = ['budget-lines'] as const;

export function useBudgetLines() {
  return useQuery({
    queryKey: BUDGET_LINES_KEY,
    queryFn: async () => {
      try {
        const res = await budgetLineApi.list();
        const lines = res.data.data.budgetLines;
        void db.budgetLines.bulkPut(lines);
        return lines;
      } catch (err) {
        if (isOfflineError(err)) {
          const userId = useAuthStore.getState().user?.id ?? '';
          return getDecryptedBudgetLines(userId);
        }
        throw err;
      }
    },
    networkMode: 'always',
  });
}

export function useCreateBudgetLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateBudgetLineInput) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const localId = crypto.randomUUID();
        const userId = useAuthStore.getState().user?.id ?? '';
        const now = new Date().toISOString();
        await db.budgetLines.put({
          id: localId,
          userId,
          name: data.name,
          classification: data.classification,
          flexibility: data.flexibility,
          categoryId: data.categoryId,
          subcategoryId: data.subcategoryId ?? null,
          accountId: data.accountId ?? null,
          amount: data.amount,
          frequency: data.frequency,
          frequencyInterval: data.frequencyInterval ?? null,
          dayOfMonth1: data.dayOfMonth1 ?? null,
          dayOfMonth2: data.dayOfMonth2 ?? null,
          anchorDate: data.anchorDate,
          isPayPeriodAnchor: data.isPayPeriodAnchor ?? false,
          isActive: true,
          notes: data.notes ?? null,
          createdAt: now,
          updatedAt: now,
        });
        await queueMutation({
          method: 'POST',
          url: '/budget-lines',
          body: JSON.stringify(data),
          entityType: 'budgetLine',
          localId,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof budgetLineApi.create>>;
      }
      return budgetLineApi.create(data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BUDGET_LINES_KEY });
      void qc.invalidateQueries({ queryKey: BUDGET_VIEW_KEY });
    },
  });
}

export function useUpdateBudgetLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateBudgetLineInput }) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const existing = await db.budgetLines.get(id);
        if (existing) {
          await db.budgetLines.put({
            ...existing,
            ...data,
            updatedAt: new Date().toISOString(),
          });
        }
        await queueMutation({
          method: 'PATCH',
          url: `/budget-lines/${id}`,
          body: JSON.stringify(data),
          entityType: 'budgetLine',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof budgetLineApi.update>>;
      }
      return budgetLineApi.update(id, data);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BUDGET_LINES_KEY });
      void qc.invalidateQueries({ queryKey: BUDGET_VIEW_KEY });
    },
  });
}

export function useDeleteBudgetLine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const existing = await db.budgetLines.get(id);
        if (existing) {
          await db.budgetLines.put({
            ...existing,
            isActive: false,
            updatedAt: new Date().toISOString(),
          });
        }
        await queueMutation({
          method: 'DELETE',
          url: `/budget-lines/${id}`,
          body: null,
          entityType: 'budgetLine',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof budgetLineApi.delete>>;
      }
      return budgetLineApi.delete(id);
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: BUDGET_LINES_KEY });
      void qc.invalidateQueries({ queryKey: BUDGET_VIEW_KEY });
    },
  });
}

export function useRolloverSummary(start: string | null, end: string | null) {
  return useQuery<RolloverSummary>({
    queryKey: ['budget-view', 'rollover', start, end],
    queryFn: async () => {
      const res = await budgetLineApi.getRollover(start!, end!);
      return res.data.data.rollover;
    },
    enabled: Boolean(start && end),
    staleTime: 5 * 60 * 1000,
  });
}
