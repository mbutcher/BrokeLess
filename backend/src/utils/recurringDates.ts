import type { RecurringFrequency } from '@typings/core.types';

/**
 * Advance a recurring date by one occurrence based on the given frequency.
 * Pure function — no side effects, no external dependencies.
 *
 * @param current - The current (most recent) occurrence date.
 * @param frequency - The recurrence frequency.
 * @param interval - Required when frequency is 'every_n_days'.
 * @returns The date of the next occurrence.
 */
export function computeNextDueDate(
  current: Date,
  frequency: RecurringFrequency,
  interval?: number | null,
): Date {
  const d = new Date(current);

  switch (frequency) {
    case 'weekly':
      d.setDate(d.getDate() + 7);
      break;

    case 'biweekly':
      d.setDate(d.getDate() + 14);
      break;

    case 'semi_monthly': {
      // Occurrences on the 1st and 15th of each month.
      // day < 15  → advance to the 15th of the same month
      // day >= 15 → advance to the 1st of the next month
      const day = d.getDate();
      if (day < 15) {
        d.setDate(15);
      } else {
        d.setMonth(d.getMonth() + 1, 1);
      }
      break;
    }

    case 'monthly': {
      const targetDay = d.getDate();
      d.setMonth(d.getMonth() + 1, 1); // go to 1st of next month to avoid overflow
      // Clamp to last day of the new month
      const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(targetDay, lastDay));
      break;
    }

    case 'every_n_days':
      if (!interval || interval < 1) {
        throw new Error('interval must be >= 1 for every_n_days frequency');
      }
      d.setDate(d.getDate() + interval);
      break;

    case 'annually': {
      const targetMonth = d.getMonth();
      const targetDay = d.getDate();
      d.setFullYear(d.getFullYear() + 1, targetMonth, 1);
      const lastDay = new Date(d.getFullYear(), targetMonth + 1, 0).getDate();
      d.setDate(Math.min(targetDay, lastDay));
      break;
    }
  }

  return d;
}

/**
 * Compute the initial next_due_date from an anchor date.
 * If anchor_date is today or in the future, next_due_date = anchor_date.
 * If anchor_date is in the past, advance until the first future-or-today occurrence.
 */
export function computeInitialNextDueDate(
  anchorDate: string,
  frequency: RecurringFrequency,
  interval?: number | null,
): string {
  const today = toDateOnly(new Date());
  let d = new Date(anchorDate + 'T00:00:00');

  // If anchor is already today or future, use it directly
  if (toDateOnly(d) >= today) {
    return anchorDate;
  }

  // Advance until we reach today or beyond
  while (toDateOnly(d) < today) {
    d = computeNextDueDate(d, frequency, interval);
  }

  return toISODate(d);
}

/** Format a Date as YYYY-MM-DD using local date parts (avoids UTC offset shifting). */
export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

/** Return a YYYY-MM-DD string from a Date for comparison (local date, no time). */
function toDateOnly(d: Date): string {
  return toISODate(d);
}
