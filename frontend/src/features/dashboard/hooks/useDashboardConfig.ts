import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  fetchDashboardConfig,
  putDashboardConfig,
  fetchDashboardHints,
  acknowledgeRollover,
  markBudgetReviewComplete,
} from '../api/dashboardApi';
import { buildDefaultConfig } from '../widgetRegistry';
import { isOfflineError } from '@lib/db/offlineHelpers';
import { db } from '@lib/db';
import { useAuthStore } from '@features/auth/stores/authStore';
import type { DashboardConfig, DashboardHint } from '../types/dashboard';

const QUERY_KEY = ['dashboard', 'config'];

export function useDashboardConfig() {
  const userId = useAuthStore((s) => s.user?.id ?? '');

  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: async (): Promise<DashboardConfig> => {
      try {
        const config = await fetchDashboardConfig();
        // Persist to Dexie for offline use
        void db.dashboardConfig.put({ ...config, id: 'singleton' }).catch(() => undefined);
        return config;
      } catch (err) {
        if (isOfflineError(err)) {
          const local = await db.dashboardConfig.get('singleton');
          if (local) {
            const { id: _id, ...rest } = local;
            return rest as DashboardConfig;
          }
          return buildDefaultConfig(userId);
        }
        throw err;
      }
    },
    networkMode: 'always',
    staleTime: 60 * 1000,
  });
}

export function useSaveDashboardConfig() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: putDashboardConfig,
    onSuccess: (saved) => {
      queryClient.setQueryData<DashboardConfig>(QUERY_KEY, saved);
      void db.dashboardConfig.put({ ...saved, id: 'singleton' }).catch(() => undefined);
    },
  });
}

const HINTS_QUERY_KEY = ['dashboard', 'hints'] as const;

export function useDashboardHints() {
  return useQuery({
    queryKey: HINTS_QUERY_KEY,
    queryFn: fetchDashboardHints,
    staleTime: 15 * 60 * 1000,
  });
}

export function useAcknowledgeRollover() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ previousStart, previousEnd }: { previousStart: string; previousEnd: string }) =>
      acknowledgeRollover(previousStart, previousEnd),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HINTS_QUERY_KEY });
    },
  });
}

export function useMarkBudgetReviewComplete() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markBudgetReviewComplete,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: HINTS_QUERY_KEY });
    },
  });
}

// Re-export DashboardHint so callers don't need to import from types separately
export type { DashboardHint };
