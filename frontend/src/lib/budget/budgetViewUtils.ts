import type { BudgetLineFrequency } from '@features/core/types';

/** Convert a Budget Line amount to its annual equivalent. */
export function toAnnual(amount: number, frequency: BudgetLineFrequency, interval?: number): number {
  switch (frequency) {
    case 'weekly':        return amount * 52;
    case 'biweekly':      return amount * 26;
    case 'semi_monthly':  return amount * 24;
    case 'twice_monthly': return amount * 24;
    case 'monthly':       return amount * 12;
    case 'annually':      return amount;
    case 'every_n_days':  return interval && interval > 0 ? amount * (365 / interval) : amount * 12;
    case 'one_time':      return amount;
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

/** Returns the current calendar month as a start/end date pair (YYYY-MM-DD). */
export function getDefaultPeriod(): { start: string; end: string } {
  const today = new Date();
  const { start, end } = monthWindow(today.getFullYear(), today.getMonth() + 1);
  return { start: toISODate(start), end: toISODate(end) };
}

/** Format a Date as YYYY-MM-DD using local date parts (avoids UTC offset shifting). */
export function toLocalISO(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Format a Date as YYYY-MM-DD (UTC). */
export function toISODate(d: Date): string {
  return d.toISOString().substring(0, 10);
}

