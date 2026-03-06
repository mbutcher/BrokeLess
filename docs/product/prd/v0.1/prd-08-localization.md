# PRD: Localization, User Preferences & i18n Infrastructure

**Version:** 1.0
**Status:** Shipped — Phase 9 (2026-02-25)
**Last updated:** 2026-02-25

---

## Problem Statement

Prior to Phase 9, the application had a single stored user preference (`defaultCurrency`) and hardcoded display logic throughout:

- `formatCurrency()` in `budgetViewUtils.ts` defaulted to `en-US` / USD regardless of the user's currency setting
- Date display used raw ISO strings (`"2026-02-24"`) with no formatting
- Time display was absent or inconsistent
- Timezone was effectively UTC everywhere
- No UI language infrastructure existed — all strings were inline English literals

Users outside the US/UTC context saw incorrect currency symbols, garbled date ordering, and had no path to change any of this. There was no foundation for shipping translated UI strings.

---

## Goals

- Store all regional formatting preferences on the user account (locale, date format, time format, timezone, start of week)
- Expose all preferences in a unified Settings → Preferences page
- Build a single `useFormatters()` hook as the sole runtime formatting surface for all components
- Preference changes take effect immediately across the entire app without a reload
- Lay the i18next translation pipeline groundwork with `en-CA` as the initial locale
- Remove all hardcoded currency/date formatting from component code

## Non-Goals

- `fr-CA` translation file (infrastructure in place; strings deferred)
- Exchange rate conversion or multi-currency account balances
- Date input field localization (`<input type="date">` always uses ISO format — browser limitation)
- Offline preference change reflection (queued, but formatter uses old values until mutation is flushed)
- Server-side IANA timezone validation (client constrains valid values via `Intl.supportedValuesOf`)
- Calendar grid / week-start UI (stored and returned; no calendar component yet reads it)

---

## Functional Requirements

### User Preferences

Six preference fields are stored per user and editable via `PATCH /api/v1/auth/me`:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultCurrency` | `string` (3-char ISO) | `'CAD'` | Currency for formatting; pre-existing field |
| `locale` | `string` (max 10) | `'en-CA'` | BCP 47 locale tag; drives all `Intl.*` API calls |
| `dateFormat` | `'DD/MM/YYYY' \| 'MM/DD/YYYY' \| 'YYYY-MM-DD'` | `'DD/MM/YYYY'` | Date display format |
| `timeFormat` | `'12h' \| '24h'` | `'12h'` | Clock display format |
| `timezone` | `string` (max 100) | `'America/Toronto'` | IANA timezone identifier |
| `weekStart` | `'sunday' \| 'monday' \| 'saturday'` | `'sunday'` | First day of the week |

All fields are optional on update; at least one must be provided.

### `useFormatters()` Hook

The single runtime formatting surface. Returns four memoized formatters driven by the authenticated user's stored preferences:

- `currency(n: number, currencyOverride?: string): string` — formats via `Intl.NumberFormat` with locale + currency; optional override for per-account display
- `date(v: string | Date): string` — formats using the user's `dateFormat` and `timezone`; ISO date-only strings are split directly to avoid UTC midnight shift
- `time(v: string | Date): string` — formats using the user's `timeFormat` and `timezone`
- `dateTime(v: string | Date): string` — `date` + `time` combined

All four formatters are recomputed via `useMemo` only when the relevant preference values change.

### i18next Infrastructure

- `i18next` + `react-i18next` initialized at app entry point via `import '@lib/i18n'`
- Initial locale: `en-CA`; fallback locale: `en-CA`
- Translation file: `frontend/src/lib/i18n/locales/en-CA.json` — all UI strings organized by feature section: `nav`, `common`, `budget`, `budgetLine`, `periodSelector`, `accounts`, `dashboard`, `preferences`, `transactions`
- `i18n.changeLanguage(locale)` called in `AuthInitializer` via `useEffect` watching `user?.locale` — locale change takes effect immediately on save

### Preferences Page

Full rewrite of `PreferencesPage.tsx` with six sections:

1. **Language** — `<select>` with `en-CA` (English — Canada); `fr-CA` shown as "Coming soon" (disabled)
2. **Currency** — 3-letter ISO text input
3. **Date Format** — `<select>`: DD/MM/YYYY · MM/DD/YYYY · YYYY-MM-DD
4. **Time Format** — `<select>`: 12-hour · 24-hour
5. **Timezone** — `<select>` built from `Intl.supportedValuesOf('timeZone')`, grouped by region prefix (`America`, `Europe`, `Asia`, `Pacific`, etc.) as `<optgroup>` elements
6. **Start of Week** — `<select>`: Sunday · Monday · Saturday

Single **Save** button sends all changed fields in one `PATCH /auth/me` request. Response updates the Zustand auth store; `useFormatters()` re-memos immediately.

---

## Data Model

### Migration: `20260225001_add_preferences_to_users`

Five columns added to the `users` table:

| Column | Type | Default |
|--------|------|---------|
| `locale` | `VARCHAR(10) NOT NULL` | `'en-CA'` |
| `date_format` | `ENUM('DD/MM/YYYY','MM/DD/YYYY','YYYY-MM-DD') NOT NULL` | `'DD/MM/YYYY'` |
| `time_format` | `ENUM('12h','24h') NOT NULL` | `'12h'` |
| `timezone` | `VARCHAR(100) NOT NULL` | `'America/Toronto'` |
| `week_start` | `ENUM('sunday','monday','saturday') NOT NULL` | `'sunday'` |

See also: [`users`](../planning/database-schema.md#users)

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| PATCH | `/api/v1/auth/me` | Required | Update any combination of the 6 preference fields (extended from existing endpoint) |
| GET | `/api/v1/auth/me` | Required | Returns full `PublicUser` including all 6 preference fields |

### `PATCH /api/v1/auth/me` — Request Body

```typescript
{
  defaultCurrency?: string;        // 3-letter ISO code (e.g. "CAD")
  locale?: string;                 // max 10 chars (e.g. "en-CA")
  dateFormat?: 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD';
  timeFormat?: '12h' | '24h';
  timezone?: string;               // max 100 chars (IANA tz, e.g. "America/Toronto")
  weekStart?: 'sunday' | 'monday' | 'saturday';
}
```

At least one field required. Returns updated `PublicUser`.

---

## Security Requirements

- `PATCH /auth/me` behind `authenticate` middleware; scoped to `req.user.id`
- All preference fields validated by `updateProfileSchema` before reaching the service layer
- `locale` validated as max-10-char string (no injection surface)
- `timezone` validated as max-100-char string; IANA validity not enforced server-side (client sends only from `Intl.supportedValuesOf`; invalid value falls back gracefully in `Intl.DateTimeFormat`)
- No PII in preference fields — all are display configuration only

---

## Acceptance Criteria

- [x] Saving a new timezone in PreferencesPage updates date/time display across Dashboard and Budget pages immediately without a reload
- [x] Saving `dateFormat: 'MM/DD/YYYY'` causes all date displays to switch to US ordering
- [x] `useFormatters().currency` respects `defaultCurrency` and `locale` (e.g. `CAD` + `en-CA` → `CA$1,234.56`)
- [x] `useFormatters().currency(n, 'USD')` formats in USD regardless of user default (for per-account display)
- [x] ISO date-only strings (`"2026-02-24"`) displayed correctly without UTC-midnight shift in negative-offset timezones
- [x] Nav labels rendered via `t('nav.xxx')` keys from `en-CA.json`
- [x] `fr-CA` locale option visible in PreferencesPage but disabled ("Coming soon")
- [x] `PATCH /auth/me` rejects requests with zero preference fields

---

## Known Limitations / Future Work

- **`fr-CA` not yet translated:** `en-CA.json` has all keys; `fr-CA.json` not yet created. Option disabled in UI.
- **Offline preference changes:** Preference fields not in Dexie schema. If preferences are changed while offline, the `PATCH /auth/me` mutation is queued but the formatter still uses stale values until the mutation flushes. Acceptable for MVP.
- **Timezone server-side validation:** Backend stores any string up to 100 chars as `timezone`. An invalid IANA name would not crash the server but would cause `Intl.DateTimeFormat` to throw in the browser. The frontend's `Intl.supportedValuesOf` source limits valid values; server-side IANA validation is a potential future hardening.
- **Date inputs always ISO format:** Native `<input type="date">` uses `YYYY-MM-DD` regardless of `dateFormat` preference. Date display (read-only) respects the preference; date entry does not.
- **Week start not yet consumed:** `weekStart` is stored and returned but no calendar/grid component reads it yet. Will be used when a calendar view is added.
- **TypeScript ES2021 cast:** `Intl.supportedValuesOf` is ES2021; the frontend targets ES2020. Resolved with `Intl as unknown as { supportedValuesOf: (key: string) => string[] }` rather than bumping the lib target.
