import { apiClient } from '@lib/api/client';

interface ApiResponse<T> {
  status: string;
  data: T;
}

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  fetchedDate: string;
  isStale: boolean;
}

export const exchangeRateApi = {
  getRate: (from: string, to: string) =>
    apiClient.get<ApiResponse<{ rate: ExchangeRate }>>(`/exchange-rates?from=${from}&to=${to}`),
};
