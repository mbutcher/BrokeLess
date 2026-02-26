import { apiClient } from '@lib/api/client';
import type {
  ForecastMonth,
  NetWorthSnapshot,
  SpendingByCategoryResponse,
  TopPayeesResponse,
} from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
}

export interface MonthlySummaryEntry {
  month: string;   // 'YYYY-MM'
  income: number;
  expenses: number;
  isForecast?: boolean;
}

export const reportApi = {
  monthlySummary: (months = 6) =>
    apiClient.get<ApiResponse<{ summary: MonthlySummaryEntry[] }>>(
      `/reports/monthly-summary?months=${months}`
    ),

  forecast: (months = 3) =>
    apiClient.get<ApiResponse<{ forecast: ForecastMonth[] }>>(
      `/reports/forecast?months=${months}`
    ),

  spendingByCategory: (start: string, end: string, type: 'expense' | 'income' = 'expense') =>
    apiClient.get<ApiResponse<SpendingByCategoryResponse>>(
      `/reports/spending-by-category?start=${start}&end=${end}&type=${type}`
    ),

  netWorthHistory: (months = 12) =>
    apiClient.get<ApiResponse<{ snapshots: NetWorthSnapshot[]; latest: NetWorthSnapshot | null }>>(
      `/reports/net-worth?months=${months}`
    ),

  takeNetWorthSnapshot: () =>
    apiClient.post<ApiResponse<{ snapshot: NetWorthSnapshot }>>('/reports/net-worth/snapshot', {}),

  topPayees: (
    start: string,
    end: string,
    limit = 10,
    type: 'expense' | 'income' = 'expense'
  ) =>
    apiClient.get<ApiResponse<TopPayeesResponse>>(
      `/reports/top-payees?start=${start}&end=${end}&limit=${limit}&type=${type}`
    ),
};
