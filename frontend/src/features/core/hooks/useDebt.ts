import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { debtApi } from '../api/debtApi';
import type { UpsertDebtScheduleInput } from '../types';

interface ApiError {
  response?: { status: number };
}

export function useDebtSchedule(accountId: string) {
  return useQuery({
    queryKey: ['debt', 'schedule', accountId],
    queryFn: async () => {
      const res = await debtApi.getSchedule(accountId);
      return res.data.data.schedule;
    },
    // 404 means no schedule configured yet — not an error
    retry: (_, err: ApiError) => err.response?.status !== 404,
    enabled: !!accountId,
  });
}

/**
 * Prefetch debt schedule presence for multiple accounts in parallel.
 * Shares the same query cache as `useDebtSchedule` (same queryKey shape).
 *
 * Returns a Map<accountId, boolean>:
 *   true  → schedule exists
 *   false → confirmed no schedule (404)
 *   absent key → still loading
 *
 * staleTime of 15 s: enough for a user to navigate to DebtDetailPage, add a
 * schedule, and return to see the What-if calculator without waiting.
 */
export function useDebtSchedules(accountIds: string[]): Map<string, boolean> {
  const results = useQueries({
    queries: accountIds.map((id) => ({
      queryKey: ['debt', 'schedule', id],
      queryFn: async () => {
        const res = await debtApi.getSchedule(id);
        return res.data.data.schedule;
      },
      retry: (_: number, err: ApiError) => err.response?.status !== 404,
      staleTime: 15 * 1000,
      enabled: !!id,
    })),
  });

  const map = new Map<string, boolean>();
  accountIds.forEach((id, i) => {
    const result = results[i];
    if (!result) return;
    if (result.isError) {
      const apiErr = result.error as ApiError;
      // 404 = confirmed no schedule; any other error = leave absent (unknown)
      if (apiErr.response?.status === 404) {
        map.set(id, false);
      }
    } else if (result.data !== undefined) {
      map.set(id, true);
    }
  });
  return map;
}

export function useAmortizationSchedule(accountId: string, enabled: boolean) {
  return useQuery({
    queryKey: ['debt', 'amortization', accountId],
    queryFn: async () => {
      const res = await debtApi.getAmortizationSchedule(accountId);
      return res.data.data;
    },
    enabled: !!accountId && enabled,
  });
}

export function useWhatIf(accountId: string, extraMonthly: number | null) {
  return useQuery({
    queryKey: ['debt', 'what-if', accountId, extraMonthly],
    queryFn: async () => {
      const res = await debtApi.whatIfExtraPayment(accountId, extraMonthly!);
      return res.data.data;
    },
    enabled: !!accountId && extraMonthly !== null && extraMonthly > 0,
  });
}

export function useTransactionSplit(transactionId: string | null) {
  return useQuery({
    queryKey: ['debt', 'split', transactionId],
    queryFn: async () => {
      const res = await debtApi.getSplit(transactionId!);
      return res.data.data.split;
    },
    enabled: !!transactionId,
  });
}

export function useUpsertDebtSchedule(accountId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpsertDebtScheduleInput) => debtApi.upsertSchedule(accountId, data),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['debt', 'schedule', accountId] });
      void queryClient.invalidateQueries({ queryKey: ['debt', 'amortization', accountId] });
    },
  });
}

export function useDeleteDebtSchedule(accountId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => debtApi.deleteSchedule(accountId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['debt', 'schedule', accountId] });
      void queryClient.invalidateQueries({ queryKey: ['debt', 'amortization', accountId] });
    },
  });
}
