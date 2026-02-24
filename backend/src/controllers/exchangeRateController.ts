import type { Request, Response } from 'express';
import { asyncHandler, AppError } from '@middleware/errorHandler';
import { exchangeRateService } from '@services/core/exchangeRateService';

const ISO_CURRENCY_RE = /^[A-Z]{3}$/;

class ExchangeRateController {
  /**
   * GET /api/v1/exchange-rates?from=USD&to=CAD
   *
   * Returns the current exchange rate between two currencies.
   * Rate is cached in DB; stale (>24h) rates are flagged with isStale=true.
   */
  getRate = asyncHandler(async (req: Request, res: Response) => {
    const { from, to } = req.query as Record<string, string | undefined>;

    if (!from || !to) {
      throw new AppError('Query params "from" and "to" are required', 400);
    }
    const fromUpper = from.toUpperCase();
    const toUpper = to.toUpperCase();
    if (!ISO_CURRENCY_RE.test(fromUpper) || !ISO_CURRENCY_RE.test(toUpper)) {
      throw new AppError('Currency codes must be 3 uppercase letters (ISO 4217)', 400);
    }

    const rate = await exchangeRateService.getRate(fromUpper, toUpper);
    res.json({ status: 'success', data: { rate } });
  });
}

export const exchangeRateController = new ExchangeRateController();
