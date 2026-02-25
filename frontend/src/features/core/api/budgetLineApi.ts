import { apiClient } from '@lib/api/client';
import type {
  BudgetLine,
  BudgetView,
  PayPeriod,
  CreateBudgetLineInput,
  UpdateBudgetLineInput,
  UpcomingExpensesResponse,
} from '../types';

interface ApiResponse<T> {
  status: string;
  data: T;
}

export const budgetLineApi = {
  list: () =>
    apiClient.get<ApiResponse<{ budgetLines: BudgetLine[] }>>('/budget-lines'),

  get: (id: string) =>
    apiClient.get<ApiResponse<{ budgetLine: BudgetLine }>>(`/budget-lines/${id}`),

  create: (data: CreateBudgetLineInput) =>
    apiClient.post<ApiResponse<{ budgetLine: BudgetLine }>>('/budget-lines', data),

  update: (id: string, data: UpdateBudgetLineInput) =>
    apiClient.patch<ApiResponse<{ budgetLine: BudgetLine }>>(`/budget-lines/${id}`, data),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/budget-lines/${id}`),

  getBudgetView: (start: string, end: string) =>
    apiClient.get<ApiResponse<{ budgetView: BudgetView }>>(`/budget-view?start=${start}&end=${end}`),

  getPayPeriod: () =>
    apiClient.get<ApiResponse<{ payPeriod: PayPeriod | null }>>('/budget-view/pay-period'),

  getUpcoming: (start: string, end: string, includeFlexible = false) =>
    apiClient.get<ApiResponse<{ upcoming: UpcomingExpensesResponse }>>(
      `/budget-view/upcoming?start=${start}&end=${end}&includeFlexible=${includeFlexible}`,
    ),
};
