import { useMemo, useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Globe, Clock, Calendar, MapPin, AlignLeft } from 'lucide-react';
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
          <h1 className="text-2xl font-bold">Preferences</h1>
          <p className="text-sm text-muted-foreground">Manage your account preferences.</p>
        </div>

        {/* Status alerts */}
        {updateProfile.isError && (
          <Alert variant="destructive">
            <AlertDescription>{getApiErrorMessage(updateProfile.error)}</AlertDescription>
          </Alert>
        )}
        {saved && (
          <Alert className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">Preferences saved.</AlertDescription>
          </Alert>
        )}

        {/* Language */}
        <PrefSection
          icon={Globe}
          title="Language"
          description="Choose your preferred display language."
        >
          <select
            value={locale}
            onChange={(e) => {
              setLocale(e.target.value);
              setSaved(false);
            }}
            className={inputClass}
          >
            <option value="en-CA">English (Canada)</option>
            <option value="fr-CA" disabled>
              Français (Canada) — Coming soon
            </option>
          </select>
        </PrefSection>

        {/* Currency */}
        <PrefSection
          icon={AlignLeft}
          title="Default Currency"
          description="Used as the default currency when creating new accounts."
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
              placeholder="CAD"
            />
            <span className="text-sm text-muted-foreground">
              3-letter ISO currency code (e.g. CAD, USD, EUR)
            </span>
          </div>
        </PrefSection>

        {/* Date Format */}
        <PrefSection
          icon={Calendar}
          title="Date Format"
          description="How dates are displayed throughout the app."
        >
          <select
            value={dateFormat}
            onChange={(e) => {
              setDateFormat(e.target.value as 'DD/MM/YYYY' | 'MM/DD/YYYY' | 'YYYY-MM-DD');
              setSaved(false);
            }}
            className={inputClass}
          >
            <option value="DD/MM/YYYY">DD/MM/YYYY</option>
            <option value="MM/DD/YYYY">MM/DD/YYYY</option>
            <option value="YYYY-MM-DD">YYYY-MM-DD</option>
          </select>
        </PrefSection>

        {/* Time Format */}
        <PrefSection
          icon={Clock}
          title="Time Format"
          description="Choose 12-hour or 24-hour clock display."
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
                {fmt === '12h' ? '12-hour' : '24-hour'}
              </label>
            ))}
          </div>
        </PrefSection>

        {/* Timezone */}
        <PrefSection
          icon={MapPin}
          title="Timezone"
          description="Dates and times will be displayed in this timezone."
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
          title="Start of Week"
          description="The first day of the week in calendar views."
        >
          <select
            value={weekStart}
            onChange={(e) => {
              setWeekStart(e.target.value as 'sunday' | 'monday' | 'saturday');
              setSaved(false);
            }}
            className={inputClass}
          >
            <option value="sunday">Sunday</option>
            <option value="monday">Monday</option>
            <option value="saturday">Saturday</option>
          </select>
        </PrefSection>

        {/* Save */}
        <Button
          onClick={handleSave}
          disabled={updateProfile.isPending || currency.trim().length !== 3}
          isLoading={updateProfile.isPending}
        >
          Save
        </Button>
      </div>
    </div>
  );
}
