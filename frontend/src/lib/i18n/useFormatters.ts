import { useMemo } from 'react';
import { useAuthStore } from '@features/auth/stores/authStore';

type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';

/** Format an ISO date-only string or Date using the given format and timezone. */
function formatDate(v: string | Date, dateFormat: DateFormat, timezone: string): string {
  let year: string, month: string, day: string;

  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)) {
    // ISO date-only string: split directly to avoid timezone shift artifacts
    [year, month, day] = v.split('-') as [string, string, string];
  } else {
    const d = typeof v === 'string' ? new Date(v) : v;
    const parts = new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: timezone,
    }).formatToParts(d);
    year = parts.find((p) => p.type === 'year')?.value ?? '';
    month = parts.find((p) => p.type === 'month')?.value ?? '';
    day = parts.find((p) => p.type === 'day')?.value ?? '';
  }

  switch (dateFormat) {
    case 'MM/DD/YYYY':
      return `${month}/${day}/${year}`;
    case 'YYYY-MM-DD':
      return `${year}-${month}-${day}`;
    case 'DD/MM/YYYY':
    default:
      return `${day}/${month}/${year}`;
  }
}

/** Format a Date or datetime string as a time value using the user's preferred clock format. */
function formatTime(v: string | Date, timeFormat: '12h' | '24h', timezone: string): string {
  const d = typeof v === 'string' ? new Date(v) : v;
  return new Intl.DateTimeFormat('en-CA', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: timeFormat === '12h',
    timeZone: timezone,
  }).format(d);
}

/**
 * Returns locale-aware formatting functions derived from the authenticated user's preferences.
 *
 * - `currency(n, currencyOverride?)` — format `n` as currency in the user's locale.
 *   Pass an ISO 4217 code to override the user's default currency (e.g. for per-account display).
 * - `date(v)` / `time(v)` / `dateTime(v)` — format date/time values using the user's
 *   preferred format, clock type, and timezone.
 */
export function useFormatters() {
  const user = useAuthStore((s) => s.user);
  const locale = user?.locale ?? 'en-CA';
  const currency = user?.defaultCurrency ?? 'CAD';
  const dateFormat = (user?.dateFormat ?? 'DD/MM/YYYY') as DateFormat;
  const timeFormat = user?.timeFormat ?? '12h';
  const timezone = user?.timezone ?? 'America/Toronto';

  return useMemo(
    () => ({
      currency: (n: number, currencyOverride?: string) =>
        new Intl.NumberFormat(locale, {
          style: 'currency',
          currency: currencyOverride ?? currency,
        }).format(n),

      date: (v: string | Date) => formatDate(v, dateFormat, timezone),

      time: (v: string | Date) => formatTime(v, timeFormat, timezone),

      dateTime: (v: string | Date) =>
        `${formatDate(v, dateFormat, timezone)} ${formatTime(v, timeFormat, timezone)}`,
    }),
    [locale, currency, dateFormat, timeFormat, timezone]
  );
}
