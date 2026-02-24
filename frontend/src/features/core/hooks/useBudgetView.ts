import { useQuery } from '@tanstack/react-query';
import { budgetLineApi } from '../api/budgetLineApi';

export const BUDGET_VIEW_KEY = ['budget-view'] as const;
export const PAY_PERIOD_KEY = ['pay-period'] as const;

/**
 * Fetches the computed Budget View for a given date range.
 * Budget View is always computed server-side and is not served offline.
 */
export function useBudgetView(start: string, end: string) {
  return useQuery({
    queryKey: [...BUDGET_VIEW_KEY, start, end],
    queryFn: async () => {
      const res = await budgetLineApi.getBudgetView(start, end);
      return res.data.data.budgetView;
    },
    enabled: Boolean(start) && Boolean(end),
    networkMode: 'always',
    retry: false,
  });
}

/**
 * Fetches the current pay period derived from the pay-period-anchor Budget Line.
 * Returns null if no anchor is set.
 */
export function usePayPeriod() {
  return useQuery({
    queryKey: PAY_PERIOD_KEY,
    queryFn: async () => {
      const res = await budgetLineApi.getPayPeriod();
      return res.data.data.payPeriod;
    },
    networkMode: 'always',
    retry: false,
  });
}
