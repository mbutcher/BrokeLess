import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Globe, Clock, Calendar, MapPin, AlignLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';
import type { UpdateProfileInput } from '../types';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Alert, AlertDescription } from '@components/ui/alert';
import { getApiErrorMessage } from '@lib/api/errors';

// ─── Timezone list (grouped by region) ───────────────────────────────────────

const TIMEZONES: string[] = (() => {
  try {
    // Intl.supportedValuesOf is ES2021 — cast for ES2020 target environments
    const intlExt = Intl as unknown as { supportedValuesOf: (key: string) => string[] };
    return intlExt.supportedValuesOf('timeZone');
  } catch {
    return ['America/Toronto', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'UTC'];
  }
})();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function groupTimezones(tzList: string[]): Record<string, string[]> {
  return tzList.reduce<Record<string, string[]>>((acc, tz) => {
    const region = tz.split('/')[0] ?? 'Other';
    (acc[region] ??= []).push(tz);
    return acc;
  }, {});
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function PrefSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Icon className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function PreferencesPage() {
  const { t } = useTranslation();
  const { user, updateUser } = useAuthStore();
  const [saved, setSaved] = useState(false);

  // ─── Local form state ──────────────────────────────────────────────────────
  const [currency, setCurrency] = useState(user?.defaultCurrency ?? 'CAD');
  const [locale, setLocale] = useState(user?.locale ?? 'en-CA');
  const [dateFormat, setDateFormat] = useState<'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD'>(
    user?.dateFormat ?? 'DD/MM/YYYY'
  );
  const [timeFormat, setTimeFormat] = useState<'12h' | '24h'>(user?.timeFormat ?? '12h');
  const [timezone, setTimezone] = useState(user?.timezone ?? 'America/Toronto');
  const [weekStart, setWeekStart] = useState<'sunday' | 'monday' | 'saturday'>(
    user?.weekStart ?? 'sunday'
  );

  const tzByRegion = useMemo(() => groupTimezones(TIMEZONES), []);
  const sortedRegions = useMemo(() => Object.keys(tzByRegion).sort(), [tzByRegion]);

  // ─── Mutation ──────────────────────────────────────────────────────────────
  const updateProfile = useMutation({
    mutationFn: (data: UpdateProfileInput) => authApi.updateProfile(data),
    onSuccess: (res) => {
      updateUser(res.data.data.user);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  function handleSave() {
    const trimmed = currency.trim().toUpperCase();
    if (trimmed.length !== 3) return;
    updateProfile.mutate({
      defaultCurrency: trimmed,
      locale,
      dateFormat,
      timeFormat,
      timezone,
      weekStart,
    });
  }

  const inputClass =
    'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white';

  return (
    <div className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{t('preferences.title')}</h1>
          <p className="text-sm text-muted-foreground">{t('preferences.subtitle')}</p>
        </div>

        {/* Status alerts */}
        {updateProfile.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getApiErrorMessage(updateProfile.error)}</AlertDescription>
          </Alert>
        )}
        {saved && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{t('preferences.saved')}</AlertDescription>
          </Alert>
        )}

        {/* Language */}
        <PrefSection
          icon={Globe}
          title={t('preferences.language')}
          description={t('preferences.languageDesc')}
        >
          <select
            value={locale}
            onChange={(e) => {
              setLocale(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
          >
            <option value="en-CA">{t('preferences.enCA')}</option>
            <option value="en-US">{t('preferences.enUS')}</option>
            <option value="fr-CA">{t('preferences.frCA')}</option>
          </select>
        </PrefSection>

        {/* Currency */}
        <PrefSection
          icon={AlignLeft}
          title={t('preferences.defaultCurrency')}
          description={t('preferences.defaultCurrencyDesc')}
        >
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={currency}
              onChange={(e) => {
                setCurrency(e.target.value.toUpperCase());
                setSaved(false);
              }}
              maxLength={3}
              style={{ textTransform: 'uppercase' }}
              className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder={t('preferences.currencyPlaceholder')}
            />
            <span className="text-sm text-muted-foreground">{t('preferences.currencyHelper')}</span>
          </div>
        </PrefSection>

        {/* Date Format */}
        <PrefSection
          icon={Calendar}
          title={t('preferences.dateFormat')}
          description={t('preferences.dateFormatDesc')}
        >
          <select
            value={dateFormat}
            onChange={(e) => {
              setDateFormat(e.target.value as 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD');
              setSaved(false);
            }}
            className={inputClass}
          >
            <option value="DD/MM/YYYY">{t('preferences.ddmmyyyy')}</option>
            <option value="MM/DD/YYYY">{t('preferences.mmddyyyy')}</option>
            <option value="YYYY-MM-DD">{t('preferences.yyyymmdd')}</option>
          </select>
        </PrefSection>

        {/* Time Format */}
        <PrefSection
          icon={Clock}
          title={t('preferences.timeFormat')}
          description={t('preferences.timeFormatDesc')}
        >
          <div className="flex items-center gap-4">
            {(['12h', '24h'] as const).map((fmt) => (
              <label key={fmt} className="flex items-center gap-2 cursor-pointer text-sm">
                <input
                  type="radio"
                  name="timeFormat"
                  value={fmt}
                  checked={timeFormat === fmt}
                  onChange={() => {
                    setTimeFormat(fmt);
                    setSaved(false);
                  }}
                  className="accent-blue-600"
                />
                {fmt === '12h' ? t('preferences.12h') : t('preferences.24h')}
              </label>
            ))}
          </div>
        </PrefSection>

        {/* Timezone */}
        <PrefSection
          icon={MapPin}
          title={t('preferences.timezone')}
          description={t('preferences.timezoneDesc')}
        >
          <select
            value={timezone}
            onChange={(e) => {
              setTimezone(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
          >
            {sortedRegions.map((region) => (
              <optgroup key={region} label={region}>
                {(tzByRegion[region] ?? []).map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </PrefSection>

        {/* Start of Week */}
        <PrefSection
          icon={Calendar}
          title={t('preferences.weekStart')}
          description={t('preferences.weekStartDesc')}
        >
          <select
            value={weekStart}
            onChange={(e) => {
              setWeekStart(e.target.value as 'sunday' | 'monday' | 'saturday');
              setSaved(false);
            }}
            className={inputClass}
          >
            <option value="sunday">{t('preferences.sunday')}</option>
            <option value="monday">{t('preferences.monday')}</option>
            <option value="saturday">{t('preferences.saturday')}</option>
          </select>
        </PrefSection>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={updateProfile.isPending || currency.trim().length !== 3}
          isLoading={updateProfile.isPending}
        >
          {t('preferences.save')}
        </Button>
      </div>
    </div>
  );
}
