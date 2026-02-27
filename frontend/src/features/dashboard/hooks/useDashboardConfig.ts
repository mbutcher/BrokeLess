import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchDashboardConfig, putDashboardConfig } from '../api/dashboardApi';
import { buildDefaultConfig } from '../widgetRegistry';
import { isOfflineError } from '@lib/db/offlineHelpers';
import { db } from '@lib/db';
import { useAuthStore } from '@features/auth/stores/authStore';
import type { DashboardConfig } from '../types/dashboard';

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
