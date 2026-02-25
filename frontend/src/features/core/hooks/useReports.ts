import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { reportApi } from '../api/reportApi';

export function useMonthlySummary(months = 6) {
  return useQuery({
    queryKey: ['reports', 'monthly-summary', months],
    queryFn: async () => {
      const res = await reportApi.monthlySummary(months);
      return res.data.data.summary;
    },
  });
}

export function useForecast(months = 3) {
  return useQuery({
    queryKey: ['reports', 'forecast', months],
    queryFn: async () => {
      const res = await reportApi.forecast(months);
      return res.data.data.forecast;
    },
  });
}

export function useSpendingByCategory(
  start: string,
  end: string,
  type: 'expense' | 'income' = 'expense',
) {
  return useQuery({
    queryKey: ['reports', 'spending-by-category', start, end, type],
    queryFn: async () => {
      const res = await reportApi.spendingByCategory(start, end, type);
      return res.data.data;
    },
    enabled: Boolean(start && end),
  });
}

export function useNetWorthHistory(months = 12) {
  return useQuery({
    queryKey: ['reports', 'net-worth', months],
    queryFn: async () => {
      const res = await reportApi.netWorthHistory(months);
      return res.data.data;
    },
  });
}

export function useTakeNetWorthSnapshot() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await reportApi.takeNetWorthSnapshot();
      return res.data.data.snapshot;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['reports', 'net-worth'] });
    },
  });
}
