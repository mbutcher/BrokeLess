import type { BudgetLineFrequency } from '@features/core/types';

/** Convert a Budget Line amount to its annual equivalent. */
export function toAnnual(amount: number, frequency: BudgetLineFrequency, interval?: number): number {
  switch (frequency) {
    case 'weekly':       return amount * 52;
    case 'biweekly':     return amount * 26;
    case 'semi_monthly': return amount * 24;
    case 'monthly':      return amount * 12;
    case 'annually':     return amount;
    case 'every_n_days': return interval && interval > 0 ? amount * (365 / interval) : amount * 12;
    case 'one_time':     return amount;
  }
}

/**
 * Prorated amount for an arbitrary window [start, end].
 * For one_time: full amount only if anchorDate falls within the window.
 */
export function proratedAmount(
  amount: number,
  frequency: BudgetLineFrequency,
  anchorDate: Date,
  start: Date,
  end: Date,
  interval?: number
): number {
  if (frequency === 'one_time') {
    const ts = anchorDate.getTime();
    return ts >= start.getTime() && ts <= end.getTime() ? amount : 0;
  }
  const days = (end.getTime() - start.getTime()) / 86_400_000 + 1;
  const annual = toAnnual(amount, frequency, interval);
  return Math.round((annual * (days / 365)) * 100) / 100;
}

/**
 * Given anchor + frequency, compute the pay period that contains `date` (defaults to today).
 */
export function currentPayPeriod(
  anchorDate: Date,
  frequency: BudgetLineFrequency,
  interval?: number,
  date: Date = new Date()
): { start: Date; end: Date } {
  if (frequency === 'one_time') return { start: anchorDate, end: anchorDate };

  const stepMs = (() => {
    switch (frequency) {
      case 'weekly':       return 7 * 86_400_000;
      case 'biweekly':     return 14 * 86_400_000;
      case 'every_n_days': return (interval ?? 30) * 86_400_000;
      default:             return 0;
    }
  })();

  if (stepMs > 0) {
    let start = new Date(anchorDate);
    while (start.getTime() + stepMs <= date.getTime()) start = new Date(start.getTime() + stepMs);
    while (start > date) start = new Date(start.getTime() - stepMs);
    const end = new Date(start.getTime() + stepMs - 86_400_000);
    return { start, end };
  }

  // Month-based frequencies
  let current = new Date(anchorDate);
  while (current > date) {
    switch (frequency) {
      case 'monthly':
        current.setUTCMonth(current.getUTCMonth() - 1);
        break;
      case 'semi_monthly': {
        const d = current.getUTCDate();
        if (d >= 15) current.setUTCDate(1);
        else { current.setUTCMonth(current.getUTCMonth() - 1); current.setUTCDate(15); }
        break;
      }
      case 'annually':
        current.setUTCFullYear(current.getUTCFullYear() - 1);
        break;
      default: break;
    }
  }
  while (true) {
    const next = new Date(current);
    switch (frequency) {
      case 'monthly':
        next.setUTCMonth(next.getUTCMonth() + 1);
        break;
      case 'semi_monthly': {
        const d = next.getUTCDate();
        if (d < 15) next.setUTCDate(15);
        else { next.setUTCMonth(next.getUTCMonth() + 1); next.setUTCDate(1); }
        break;
      }
      case 'annually':
        next.setUTCFullYear(next.getUTCFullYear() + 1);
        break;
      default: break;
    }
    if (next > date) return { start: current, end: new Date(next.getTime() - 86_400_000) };
    current = next;
  }
}

/** Returns start/end of a calendar month (month is 1-indexed). */
export function monthWindow(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(Date.UTC(year, month - 1, 1));
  const end = new Date(Date.UTC(year, month, 0)); // day 0 = last day of prior month
  return { start, end };
}

/** Returns start (Monday) and end (Sunday) of the ISO week containing `date`. */
export function weekWindow(date: Date = new Date()): { start: Date; end: Date } {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  const day = d.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day; // adjust to Monday
  const start = new Date(d.getTime() + diff * 86_400_000);
  const end = new Date(start.getTime() + 6 * 86_400_000);
  return { start, end };
}

/** Format a Date as YYYY-MM-DD (UTC). */
export function toISODate(d: Date): string {
  return d.toISOString().substring(0, 10);
}

/** Human-readable label for a frequency. */
export function frequencyLabel(frequency: BudgetLineFrequency, interval?: number | null): string {
  switch (frequency) {
    case 'weekly':       return 'Weekly';
    case 'biweekly':     return 'Biweekly';
    case 'semi_monthly': return 'Twice monthly';
    case 'monthly':      return 'Monthly';
    case 'annually':     return 'Annually';
    case 'every_n_days': return interval ? `Every ${interval} days` : 'Every N days';
    case 'one_time':     return 'One time';
  }
}
