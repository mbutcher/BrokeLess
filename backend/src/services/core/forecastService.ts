import { getDatabase } from '@config/database';
import { dialectHelper } from '@utils/db/dialectHelper';
import type { ForecastMonth } from '@typings/core.types';

interface HistoricalRow {
  month: string;
  income: string | number;
  expenses: string | number;
}

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? (sorted[mid] as number)
    : ((sorted[mid - 1] as number) + (sorted[mid] as number)) / 2;
}

function nextMonthLabel(offsetFromNow: number): string {
  const d = new Date();
  d.setUTCDate(1);
  d.setUTCMonth(d.getUTCMonth() + offsetFromNow);
  const year = d.getUTCFullYear();
  const month = String(d.getUTCMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

class ForecastService {
  async getForecast(userId: string, months = 3): Promise<ForecastMonth[]> {
    const db = getDatabase();

    const rows = (await db('transactions')
      .where({ user_id: userId, is_transfer: false })
      .where('date', '>=', dialectHelper.nowMinusInterval(db, 6, 'MONTH'))
      .select(db.raw(`${dialectHelper.formatMonthSQL('date')} as month`))
      .sum({ income: db.raw('CASE WHEN amount > 0 THEN amount ELSE 0 END') })
      .sum({ expenses: db.raw('CASE WHEN amount < 0 THEN ABS(amount) ELSE 0 END') })
      .groupBy('month')
      .orderBy('month', 'asc')) as HistoricalRow[];

    const incomeValues = rows.map((r) => Number(r.income));
    const expenseValues = rows.map((r) => Number(r.expenses));

    const medianIncome = median(incomeValues);
    const medianExpenses = median(expenseValues);

    const cappedMonths = Math.min(Math.max(months, 1), 12);
    const forecast: ForecastMonth[] = [];

    for (let i = 1; i <= cappedMonths; i++) {
      forecast.push({
        month: nextMonthLabel(i),
        income: Math.round(medianIncome * 100) / 100,
        expenses: Math.round(medianExpenses * 100) / 100,
        isForecast: true,
      });
    }

    return forecast;
  }
}

export const forecastService = new ForecastService();
