import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { savingsGoalApi } from '../api/savingsGoalApi';
import { useAuthStore } from '@features/auth/stores/authStore';
import { db } from '@lib/db';
import {
  isOfflineError,
  getDecryptedSavingsGoals,
  queueMutation,
  OfflineWriteNotAvailableError,
} from '@lib/db/offlineHelpers';
import { hasIndexedDbKey } from '@lib/db/crypto';
import { useNetworkStore } from '@stores/networkStore';
import type { CreateSavingsGoalInput, UpdateSavingsGoalInput } from '../types';

const SAVINGS_GOALS_KEY = ['savings-goals'] as const;

export function useSavingsGoals() {
  return useQuery({
    queryKey: SAVINGS_GOALS_KEY,
    queryFn: async () => {
      try {
        const res = await savingsGoalApi.list();
        const goals = res.data.data.goals;
        void db.savingsGoals.bulkPut(goals);
        return goals;
      } catch (err) {
        if (isOfflineError(err)) {
          const userId = useAuthStore.getState().user?.id ?? '';
          return getDecryptedSavingsGoals(userId);
        }
        throw err;
      }
    },
    networkMode: 'always',
  });
}

export function useSavingsGoal(id: string) {
  return useQuery({
    queryKey: [...SAVINGS_GOALS_KEY, id],
    queryFn: async () => {
      try {
        const res = await savingsGoalApi.get(id);
        return res.data.data.goal;
      } catch (err) {
        if (isOfflineError(err)) {
          return (await db.savingsGoals.get(id)) ?? null;
        }
        throw err;
      }
    },
    enabled: !!id,
    networkMode: 'always',
  });
}

export function useSavingsGoalProgress(id: string) {
  return useQuery({
    queryKey: [...SAVINGS_GOALS_KEY, id, 'progress'],
    queryFn: async () => {
      const res = await savingsGoalApi.getProgress(id);
      return res.data.data.progress;
    },
    enabled: !!id,
    networkMode: 'always',
  });
}

export function useCreateSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: CreateSavingsGoalInput) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const localId = crypto.randomUUID();
        const userId = useAuthStore.getState().user?.id ?? '';
        const now = new Date().toISOString();
        await db.savingsGoals.put({
          id: localId,
          userId,
          accountId: data.accountId,
          name: data.name,
          targetAmount: data.targetAmount,
          targetDate: data.targetDate ?? null,
          createdAt: now,
          updatedAt: now,
        });
        await queueMutation({
          method: 'POST',
          url: '/savings-goals',
          body: JSON.stringify(data),
          entityType: 'savingsGoal',
          localId,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof savingsGoalApi.create>>;
      }
      return savingsGoalApi.create(data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SAVINGS_GOALS_KEY });
    },
  });
}

export function useUpdateSavingsGoal(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateSavingsGoalInput) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        const existing = await db.savingsGoals.get(id);
        if (existing) {
          await db.savingsGoals.put({
            ...existing,
            ...data,
            updatedAt: new Date().toISOString(),
          });
        }
        await queueMutation({
          method: 'PATCH',
          url: `/savings-goals/${id}`,
          body: JSON.stringify(data),
          entityType: 'savingsGoal',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof savingsGoalApi.update>>;
      }
      return savingsGoalApi.update(id, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SAVINGS_GOALS_KEY });
      void queryClient.invalidateQueries({ queryKey: [...SAVINGS_GOALS_KEY, id] });
    },
  });
}

export function useDeleteSavingsGoal() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!navigator.onLine) {
        if (!hasIndexedDbKey()) throw new OfflineWriteNotAvailableError();
        await db.savingsGoals.delete(id);
        await queueMutation({
          method: 'DELETE',
          url: `/savings-goals/${id}`,
          body: null,
          entityType: 'savingsGoal',
          localId: id,
        });
        useNetworkStore.getState().incrementPending();
        return null as unknown as Awaited<ReturnType<typeof savingsGoalApi.delete>>;
      }
      return savingsGoalApi.delete(id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: SAVINGS_GOALS_KEY });
    },
  });
}
