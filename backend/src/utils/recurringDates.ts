import type { RecurringFrequency } from '@typings/core.types';

/** All frequencies that produce repeating occurrences (excludes one_time). */
export type ScheduleFrequency = RecurringFrequency | 'twice_monthly';

/**
 * Advance a recurring date by one occurrence based on the given frequency.
 * Pure function — no side effects, no external dependencies.
 *
 * @param current - The current (most recent) occurrence date.
 * @param frequency - The recurrence frequency.
 * @param interval - Required when frequency is 'every_n_days'.
 * @param dayOfMonth1 - Required when frequency is 'twice_monthly' (1–31; 31 = last day).
 * @param dayOfMonth2 - Required when frequency is 'twice_monthly' (must be > dayOfMonth1).
 * @returns The date of the next occurrence.
 */
export function computeNextDueDate(
  current: Date,
  frequency: ScheduleFrequency,
  interval?: number | null,
  dayOfMonth1?: number | null,
  dayOfMonth2?: number | null
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
      // Hardcoded 1st and 15th of each month.
      const day = d.getDate();
      if (day < 15) {
        d.setDate(15);
      } else {
        d.setMonth(d.getMonth() + 1, 1);
      }
      break;
    }

    case 'twice_monthly': {
      // User-defined pair of days each month.
      // dayOfMonth1 < dayOfMonth2; 31 means "last day of the month".
      const d1 = dayOfMonth1 ?? 1;
      const d2 = dayOfMonth2 ?? 15;
      const currentDay = d.getDate();
      const lastDayThisMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();

      const resolvedD2 = d2 === 31 ? lastDayThisMonth : Math.min(d2, lastDayThisMonth);

      if (currentDay < resolvedD2) {
        // Advance to d2 this month
        d.setDate(resolvedD2);
      } else {
        // Advance to d1 next month
        d.setMonth(d.getMonth() + 1, 1);
        const lastDayNextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
        d.setDate(d1 === 31 ? lastDayNextMonth : Math.min(d1, lastDayNextMonth));
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
  frequency: ScheduleFrequency,
  interval?: number | null,
  dayOfMonth1?: number | null,
  dayOfMonth2?: number | null
): string {
  const today = toDateOnly(new Date());
  let d = new Date(anchorDate + 'T00:00:00');

  // If anchor is already today or future, use it directly
  if (toDateOnly(d) >= today) {
    return anchorDate;
  }

  // Advance until we reach today or beyond
  while (toDateOnly(d) < today) {
    d = computeNextDueDate(d, frequency, interval, dayOfMonth1, dayOfMonth2);
  }

  return toISODate(d);
}

/**
 * Compute all occurrence dates for a budget line within [windowStart, windowEnd].
 * Walks forward from anchorDate using the frequency rule.
 * For 'one_time': returns [anchorDate] if it falls within the window, else [].
 *
 * All Date arguments should use local midnight (new Date(dateStr + 'T00:00:00'))
 * for consistent local-date arithmetic.
 */
export function computeOccurrences(
  anchorDate: Date,
  frequency: ScheduleFrequency | 'one_time',
  interval: number | null | undefined,
  windowStart: Date,
  windowEnd: Date,
  dayOfMonth1?: number | null,
  dayOfMonth2?: number | null
): Date[] {
  if (frequency === 'one_time') {
    return anchorDate >= windowStart && anchorDate <= windowEnd ? [new Date(anchorDate)] : [];
  }

  const occurrences: Date[] = [];
  let cursor = new Date(anchorDate);
  if (cursor > windowEnd) return [];

  while (cursor <= windowEnd) {
    if (cursor >= windowStart) {
      occurrences.push(new Date(cursor));
    }
    cursor = computeNextDueDate(cursor, frequency, interval, dayOfMonth1, dayOfMonth2);
  }

  return occurrences;
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
