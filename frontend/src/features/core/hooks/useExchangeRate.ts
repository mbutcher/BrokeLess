import { useQuery, useQueries } from '@tanstack/react-query';
import { exchangeRateApi, type ExchangeRate } from '../api/exchangeRateApi';

/** Fetch a single exchange rate pair. Returns 1 immediately when from === to. */
export function useExchangeRate(from: string, to: string) {
  const isSame = from.toUpperCase() === to.toUpperCase();
  return useQuery({
    queryKey: ['exchange-rate', from.toUpperCase(), to.toUpperCase()],
    queryFn: async () => {
      const res = await exchangeRateApi.getRate(from, to);
      return res.data.data.rate;
    },
    enabled: !isSame,
    staleTime: 60 * 60 * 1000, // 1h — server handles daily refresh
    // Return a synthetic 1:1 rate object when same currency
    placeholderData: isSame
      ? ({
          fromCurrency: from.toUpperCase(),
          toCurrency: to.toUpperCase(),
          rate: 1,
          fetchedDate: new Date().toISOString().slice(0, 10),
          isStale: false,
        } as ExchangeRate)
      : undefined,
  });
}

/**
 * Fetch multiple exchange rate pairs in parallel.
 * Pairs should be unique; returns a map from "FROM/TO" → ExchangeRate.
 */
export function useExchangeRates(
  pairs: Array<{ from: string; to: string }>
): { rates: Map<string, ExchangeRate>; isLoading: boolean; hasStale: boolean } {
  const results = useQueries({
    queries: pairs.map(({ from, to }) => ({
      queryKey: ['exchange-rate', from.toUpperCase(), to.toUpperCase()],
      queryFn: async () => {
        const res = await exchangeRateApi.getRate(from, to);
        return res.data.data.rate;
      },
      enabled: from.toUpperCase() !== to.toUpperCase(),
      staleTime: 60 * 60 * 1000,
    })),
  });

  const rates = new Map<string, ExchangeRate>();
  let isLoading = false;
  let hasStale = false;

  pairs.forEach(({ from, to }, i) => {
    const fromU = from.toUpperCase();
    const toU = to.toUpperCase();
    const key = `${fromU}/${toU}`;

    if (fromU === toU) {
      rates.set(key, {
        fromCurrency: fromU,
        toCurrency: toU,
        rate: 1,
        fetchedDate: new Date().toISOString().slice(0, 10),
        isStale: false,
      });
      return;
    }

    const result = results[i];
    if (result?.isLoading) isLoading = true;
    if (result?.data) {
      rates.set(key, result.data);
      if (result.data.isStale) hasStale = true;
    }
  });

  return { rates, isLoading, hasStale };
}
