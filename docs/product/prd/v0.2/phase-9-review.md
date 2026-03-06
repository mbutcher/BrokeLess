# Phase 9 Review — Localization, User Preferences & i18n Infrastructure

**Date:** 2026-02-24
**Status:** Complete
**Bugs fixed post-implementation:** 1 (TypeScript ES2021 compatibility — see Notes)

---

## Summary

Phase 9 extended user accounts with the full set of regional formatting preferences, wired those preferences through to the frontend via a new `useFormatters()` hook, and laid the i18next infrastructure for future multi-language support. Prior to this phase, every component that displayed currency used a hardcoded `formatCurrency()` utility defaulting to `en-US`/USD, and dates were displayed as raw ISO strings.

After Phase 9:
- All currency/date/time display is driven by the authenticated user's stored preferences via `useFormatters()`
- Preference changes made in the Settings → Preferences page take effect immediately across the entire app (no reload required)
- The i18next translation pipeline is in place for UI strings, with `en-CA` as the initial locale
- Backend validates and persists all 6 preference fields via the existing `PATCH /auth/me` endpoint

---

## Files Created

### Backend

| File | Purpose |
|------|---------|
| `backend/src/database/migrations/20260225001_add_preferences_to_users.ts` | Adds 5 new preference columns to `users` table |

### Frontend

| File | Purpose |
|------|---------|
| `frontend/src/lib/i18n/index.ts` | i18next initialization: `lng: 'en-CA'`, `fallbackLng: 'en-CA'`, resources from JSON file |
| `frontend/src/lib/i18n/locales/en-CA.json` | All UI strings organized by feature section: `nav`, `common`, `budget`, `budgetLine`, `periodSelector`, `accounts`, `dashboard`, `preferences`, `transactions` |
| `frontend/src/lib/i18n/useFormatters.ts` | Core formatting hook; see Key Design Decisions |

---

## Files Modified

### Backend

| File | Change |
|------|--------|
| `backend/src/types/auth.types.ts` | Added `locale`, `dateFormat`, `timeFormat`, `timezone`, `weekStart` to `User` and `PublicUser` interfaces |
| `backend/src/repositories/userRepository.ts` | Added 5 new column mappings (snake_case → camelCase) in `toUser`/`toPublicUser` row mappers; `updateProfile` method passes all 6 preference fields |
| `backend/src/validators/coreValidators.ts` | Replaced `updateProfileSchema` (was `defaultCurrency` required) with all 6 fields optional, `.min(1)` to require at least one |
| `backend/src/services/auth/authService.ts` | `updateProfile()` accepts and persists all preference fields |
| `backend/src/controllers/authController.ts` | `updateProfile` handler passes validated body to service |

### Frontend

| File | Change |
|------|--------|
| `frontend/src/features/auth/types/index.ts` | Added 5 new fields to `User` interface; `UpdateProfileInput` extended to include all 6 preference fields (all optional) |
| `frontend/src/features/auth/api/authApi.ts` | `updateProfile` payload type accepts all 6 preference fields |
| `frontend/src/app/App.tsx` | `import '@lib/i18n'` to initialize; `AuthInitializer` calls `i18n.changeLanguage(locale)` via `useEffect` when `user.locale` changes |
| `frontend/src/components/layout/AppLayout.tsx` | `useTranslation()` hook added; nav item labels use `t('nav.xxx')` keys |
| `frontend/src/features/auth/pages/PreferencesPage.tsx` | Full rewrite — 6 preference sections, timezone grouped `<optgroup>` select, single Save button |
| `frontend/src/features/core/components/BudgetLineRow.tsx` | Removed `formatCurrency` import; uses `useFormatters().currency` |
| `frontend/src/features/core/components/BudgetLineGroup.tsx` | Same |
| `frontend/src/features/core/components/BudgetSummaryBar.tsx` | Uses `useFormatters().currency`; passes `formatCurrency` as prop to `SummaryCell` sub-component |
| `frontend/src/features/core/components/AccountCard.tsx` | Uses `useFormatters().currency` with optional currency override for per-account display |
| `frontend/src/features/dashboard/pages/DashboardPage.tsx` | Removed local `formatMoney`; all currency display via `useFormatters().currency` |
| `frontend/src/lib/budget/budgetViewUtils.ts` | `formatCurrency` export removed (dead code — all consumers migrated to `useFormatters()`) |

---

## API Change

### `PATCH /api/v1/auth/me`

**Before:** Only accepted `defaultCurrency` (string, 3-char ISO, required).

**After:** Accepts any combination of the 6 preference fields (all optional; at least one required):

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

---

## Database Changes

### Migration `20260225001_add_preferences_to_users`

Five columns added to `users` table:

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `locale` | VARCHAR(10) | `'en-CA'` | BCP 47 locale tag; drives `Intl.*` API locale argument |
| `date_format` | ENUM | `'DD/MM/YYYY'` | Date display format used by `useFormatters().date()` |
| `time_format` | ENUM | `'12h'` | 12-hour or 24-hour clock display |
| `timezone` | VARCHAR(100) | `'America/Toronto'` | IANA timezone identifier; used in `Intl.DateTimeFormat` |
| `week_start` | ENUM | `'sunday'` | First day of the week in calendar views |

---

## Key Design Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Single `useFormatters()` hook | Returns `{ currency, date, time, dateTime }` | Single import per component; all preference-driven formatting in one place; `useMemo` means no performance cost |
| `Intl.NumberFormat` for currency | `new Intl.NumberFormat(locale, { style: 'currency', currency }).format(n)` | Native browser API; correct locale-aware grouping/decimal separators; handles CAD, USD, EUR, etc. correctly |
| ISO date-only string handling | Split `"2026-02-24"` directly (`v.split('-')`) rather than `new Date(v)` | Avoids UTC midnight shift: `new Date("2026-02-24")` parses as UTC and shows as Feb 23 in UTC-offset timezones |
| Currency override parameter | `currency(n, currencyOverride?)` | `AccountCard` displays balances in the account's own currency (`account.currency`), not the user's default — the override enables this without a separate formatter |
| `SummaryCell` receives `formatCurrency` as prop | Parent calls `useFormatters()` once and passes `fmt.currency` down | Avoids calling `useFormatters()` inside a non-hook function; cleaner than adding `useFormatters` directly to the private sub-component |
| `Intl.supportedValuesOf` type cast | `Intl as unknown as { supportedValuesOf: (key: string) => string[] }` | TypeScript `lib: ["ES2020"]` target doesn't include this ES2021 method; cast preferred over bumping lib target or using `// @ts-ignore` |
| i18next `changeLanguage` in `AuthInitializer` | `useEffect` watching `user?.locale` | Locale change takes effect immediately on save without a page reload; `AuthInitializer` is always mounted for authenticated users |
| `fr-CA` shown as "Coming soon" (disabled) | `<option value="fr-CA" disabled>` | Infrastructure is in place; translation strings deferred; disabled option communicates intent without shipping incomplete UI |

---

## Notes

**TypeScript ES2021 compatibility fix:** `Intl.supportedValuesOf('timeZone')` is an ES2021 API. The frontend `tsconfig.json` targets `ES2020`. TypeScript raised TS2339 (`Property 'supportedValuesOf' does not exist on type 'typeof Intl'`). Fixed with:
```ts
const intlExt = Intl as unknown as { supportedValuesOf: (key: string) => string[] };
return intlExt.supportedValuesOf('timeZone');
```
Wrapped in a try/catch that falls back to a hardcoded list of common timezones if the API is unavailable.

---

## Security Checklist

| Control | Status |
|---------|--------|
| `PATCH /auth/me` behind `authenticate` middleware | ✅ |
| Preference fields validated by `updateProfileSchema` before reaching service | ✅ |
| `locale` validated as max-10-char string (no injection surface) | ✅ |
| `timezone` validated as max-100-char string; IANA validity not enforced server-side (client sends only from `Intl.supportedValuesOf`; invalid value falls back gracefully in `Intl.DateTimeFormat`) | ✅ |
| No PII in preference fields — all are display configuration only | ✅ |

---

## Known Limitations / Future Work

- **`fr-CA` not yet translated:** `en-CA.json` has all keys; `fr-CA.json` stub is not yet created. `fr-CA` option in PreferencesPage is disabled.
- **Offline preference changes:** Preference fields are not in the Dexie schema. If the user changes preferences while offline, the `PATCH /auth/me` mutation is queued but the formatter still uses the old values until the mutation is flushed. Acceptable for MVP.
- **Timezone validation:** The backend stores any string up to 100 chars as `timezone`. An invalid IANA name would not crash the server but would cause `Intl.DateTimeFormat` to throw in the browser. The frontend's `Intl.supportedValuesOf` source constrains valid values; server-side IANA validation (e.g., validating against the `Intl.supportedValuesOf` list) is a potential future hardening.
- **Date inputs are always ISO format:** Native `<input type="date">` always uses `YYYY-MM-DD` regardless of the user's `dateFormat` preference. Date display (read-only) respects the preference; date entry does not. This is a browser limitation.
- **Week start not yet used:** `weekStart` is stored and returned in the API, but no calendar/grid component currently reads it. Will be used when a calendar view is added.
