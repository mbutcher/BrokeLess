import axios from 'axios';
import { getDatabase } from '@config/database';
import { AppError } from '@middleware/errorHandler';
import logger from '@utils/logger';
import type { ExchangeRate } from '@typings/core.types';

/** Exchange rates are considered stale after this many hours */
const STALE_HOURS = 24;

/** How many milliseconds in STALE_HOURS */
const STALE_MS = STALE_HOURS * 60 * 60 * 1000;

interface FrankfurterResponse {
  base: string;
  date: string;
  rates: Record<string, number>;
}

interface ExchangeRateRow {
  from_currency: string;
  to_currency: string;
  rate: string | number;
  fetched_date: string;
  updated_at: Date;
}

function rowToExchangeRate(row: ExchangeRateRow): ExchangeRate {
  const fetchedAt = new Date(row.fetched_date + 'T00:00:00Z');
  const isStale = Date.now() - fetchedAt.getTime() > STALE_MS;
  return {
    fromCurrency: row.from_currency,
    toCurrency: row.to_currency,
    rate: Number(row.rate),
    fetchedDate: row.fetched_date,
    isStale,
  };
}

class ExchangeRateService {
  /**
   * Returns the exchange rate from `from` to `to`.
   * Uses cached value if fetched today; otherwise fetches from Frankfurter API.
   *
   * - Same currency (from === to): returns { rate: 1, isStale: false }
   * - Unsupported pair: propagates the Frankfurter 404 as a 400 AppError
   */
  async getRate(from: string, to: string): Promise<ExchangeRate> {
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    const db = getDatabase();

    if (fromUpper === toUpper) {
      return {
        fromCurrency: fromUpper,
        toCurrency: toUpper,
        rate: 1,
        fetchedDate: new Date().toISOString().slice(0, 10),
        isStale: false,
      };
    }

    const today = new Date().toISOString().slice(0, 10);

    // Check DB cache
    const cached = await db<ExchangeRateRow>('exchange_rates')
      .where({ from_currency: fromUpper, to_currency: toUpper })
      .first();

    if (cached && cached.fetched_date === today) {
      return rowToExchangeRate(cached);
    }

    // Fetch fresh rate from Frankfurter (ECB-sourced)
    const freshRate = await this.fetchFromFrankfurter(db, fromUpper, toUpper);

    // Upsert into DB
    if (cached) {
      await db('exchange_rates')
        .where({ from_currency: fromUpper, to_currency: toUpper })
        .update({ rate: freshRate, fetched_date: today, updated_at: db.fn.now() });
    } else {
      await db('exchange_rates').insert({
        from_currency: fromUpper,
        to_currency: toUpper,
        rate: freshRate,
        fetched_date: today,
      });
    }

    return {
      fromCurrency: fromUpper,
      toCurrency: toUpper,
      rate: freshRate,
      fetchedDate: today,
      isStale: false,
    };
  }

  private async fetchFromFrankfurter(
    db: ReturnType<typeof getDatabase>,
    from: string,
    to: string
  ): Promise<number> {
    try {
      const url = `https://api.frankfurter.app/latest?from=${from}&to=${to}`;
      const response = await axios.get<FrankfurterResponse>(url, { timeout: 10000 });
      const rate = response.data.rates[to];
      if (rate == null) {
        throw new AppError(`No exchange rate available for ${from} → ${to}`, 400);
      }
      return rate;
    } catch (err) {
      if (err instanceof AppError) throw err;
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 404 || err.response?.status === 422) {
          throw new AppError(`Currency pair ${from}/${to} is not supported`, 400);
        }
        // On upstream failure, try to serve stale data if available
        logger.warn('Frankfurter API unavailable, attempting to serve stale exchange rate', {
          from,
          to,
          error: err.message,
        });
        const stale = await db<ExchangeRateRow>('exchange_rates')
          .where({ from_currency: from, to_currency: to })
          .first();
        if (stale) {
          logger.warn('Serving stale exchange rate', { from, to, fetchedDate: stale.fetched_date });
          return Number(stale.rate);
        }
        throw new AppError(
          `Exchange rate service unavailable for ${from}/${to} and no cached rate exists`,
          503
        );
      }
      throw new AppError(`Failed to fetch exchange rate for ${from}/${to}`, 502);
    }
  }
}

export const exchangeRateService = new ExchangeRateService();
