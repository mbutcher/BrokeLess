import { useState, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Loader2, RefreshCw, Unplug } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Badge } from '@components/ui/badge';
import { Alert, AlertDescription } from '@components/ui/alert';
import { SetupInstructionsCard } from '../components/SetupInstructionsCard';
import { AccountMappingSection } from '../components/AccountMappingSection';
import {
  useSimplefinStatus,
  useSimplefinSchedule,
  useConnectSimplefin,
  useDisconnectSimplefin,
  useSyncNow,
  useUpdateSchedule,
} from '../hooks/useSimplefin';
import type { UpdateScheduleInput } from '../types';

const INTERVAL_OPTIONS = [1, 2, 4, 6, 8, 12, 24] as const;
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (h === 0) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

export function SimplefinSettingsPage() {
  const { t } = useTranslation();
  const { data: connection, isLoading } = useSimplefinStatus();
  const { data: schedule } = useSimplefinSchedule();
  const connectMutation = useConnectSimplefin();
  const disconnectMutation = useDisconnectSimplefin();
  const syncMutation = useSyncNow();
  const updateScheduleMutation = useUpdateSchedule();

  const [setupToken, setSetupToken] = useState('');
  const [connectError, setConnectError] = useState<string | null>(null);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [syncResult, setSyncResult] = useState<{
    imported: number;
    skipped: number;
    pendingReviews: number;
    unmappedAccounts: number;
  } | null>(null);

  // Schedule form state — initialised to defaults; synced from server once data loads
  const [scheduleForm, setScheduleForm] = useState<UpdateScheduleInput>({
    autoSyncEnabled: false,
    autoSyncIntervalHours: 24,
    autoSyncWindowStart: 0,
    autoSyncWindowEnd: 23,
  });

  useEffect(() => {
    if (schedule) {
      setScheduleForm({
        autoSyncEnabled: schedule.autoSyncEnabled,
        autoSyncIntervalHours: schedule.autoSyncIntervalHours,
        autoSyncWindowStart: schedule.autoSyncWindowStart,
        autoSyncWindowEnd: schedule.autoSyncWindowEnd,
      });
    }
  }, [schedule]);

  const isConnected = Boolean(connection);

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault();
    setConnectError(null);
    try {
      await connectMutation.mutateAsync(setupToken.trim());
      setSetupToken('');
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : t('simplefin.connectionFailed'));
    }
  }

  async function handleSync() {
    setSyncResult(null);
    const res = await syncMutation.mutateAsync();
    setSyncResult(res.data.data.result);
  }

  async function handleSaveSchedule(e: React.FormEvent) {
    e.preventDefault();
    await updateScheduleMutation.mutateAsync(scheduleForm);
  }

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">{t('simplefin.title')}</h1>
        <p className="text-sm text-gray-500 mt-1">{t('simplefin.subtitle')}</p>
      </div>

      {/* ─── Setup Instructions ─────────────────────────────────────────────── */}
      <SetupInstructionsCard defaultCollapsed={isConnected} />

      {/* ─── Connection Status ───────────────────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t('simplefin.connection')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!isConnected ? (
            <form onSubmit={handleConnect} className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="setup-token">{t('simplefin.setupToken')}</Label>
                <Input
                  id="setup-token"
                  type="password"
                  placeholder={t('simplefin.tokenPlaceholder')}
                  value={setupToken}
                  onChange={(e) => setSetupToken(e.target.value)}
                  required
                />
                <p className="text-xs text-gray-500">{t('simplefin.tokenHelp')}</p>
              </div>
              {connectError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{connectError}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={connectMutation.isPending || !setupToken.trim()}>
                {connectMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('simplefin.connect')}
              </Button>
            </form>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <div>
                  <p className="font-medium text-sm text-gray-900">{t('simplefin.connected')}</p>
                  {connection?.lastSyncAt && (
                    <p className="text-xs text-gray-500">
                      Last synced:{' '}
                      {new Date(connection.lastSyncAt).toLocaleString()}
                    </p>
                  )}
                </div>
                {connection?.lastSyncStatus && (
                  <Badge
                    variant={connection.lastSyncStatus === 'success' ? 'default' : 'destructive'}
                    className="ml-auto"
                  >
                    {connection.lastSyncStatus}
                  </Badge>
                )}
              </div>

              {connection?.lastSyncStatus === 'error' && connection.lastSyncError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs">{connection.lastSyncError}</AlertDescription>
                </Alert>
              )}

              {syncResult && (
                <Alert className="border-green-200 bg-green-50">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-sm">
                    Sync complete — {syncResult.imported} imported, {syncResult.skipped} skipped
                    {syncResult.pendingReviews > 0 &&
                      `, ${syncResult.pendingReviews} pending review(s)`}
                    {syncResult.unmappedAccounts > 0 &&
                      `, ${syncResult.unmappedAccounts} unmapped account(s)`}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  variant="default"
                  onClick={handleSync}
                  disabled={syncMutation.isPending}
                >
                  {syncMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {t('simplefin.syncNow')}
                </Button>

                {!confirmDisconnect ? (
                  <Button
                    variant="outline"
                    onClick={() => setConfirmDisconnect(true)}
                  >
                    <Unplug className="mr-2 h-4 w-4" />
                    {t('simplefin.disconnect')}
                  </Button>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-600">{t('simplefin.disconnectConfirm')}</span>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        void disconnectMutation.mutateAsync();
                        setConfirmDisconnect(false);
                      }}
                      disabled={disconnectMutation.isPending}
                    >
                      {t('simplefin.disconnectYes')}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setConfirmDisconnect(false)}
                    >
                      {t('simplefin.cancel')}
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Account Mapping ─────────────────────────────────────────────────── */}
      {isConnected && <AccountMappingSection />}

      {/* ─── Sync Schedule ───────────────────────────────────────────────────── */}
      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('simplefin.syncSchedule')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSchedule} className="space-y-5">
              {/* Enable toggle */}
              <div className="flex items-center gap-3">
                <input
                  id="auto-sync-enabled"
                  type="checkbox"
                  className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  checked={scheduleForm.autoSyncEnabled}
                  onChange={(e) =>
                    setScheduleForm((s) => ({ ...s, autoSyncEnabled: e.target.checked }))
                  }
                />
                <Label htmlFor="auto-sync-enabled" className="font-medium">
                  {t('simplefin.enableAutoSync')}
                </Label>
              </div>

              {scheduleForm.autoSyncEnabled && (
                <>
                  {/* Interval */}
                  <div className="space-y-1">
                    <Label htmlFor="sync-interval">{t('simplefin.syncEvery')}</Label>
                    <select
                      id="sync-interval"
                      className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                      value={scheduleForm.autoSyncIntervalHours}
                      onChange={(e) =>
                        setScheduleForm((s) => ({
                          ...s,
                          autoSyncIntervalHours: Number(e.target.value),
                        }))
                      }
                    >
                      {INTERVAL_OPTIONS.map((h) => (
                        <option key={h} value={h}>
                          {h === 1 ? t('simplefin.hour1') : t('simplefin.hoursN', { count: h })}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Time window */}
                  <div className="space-y-1">
                    <Label>{t('simplefin.onlySyncBetween')}</Label>
                    <div className="flex items-center gap-2">
                      <select
                        className="block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={scheduleForm.autoSyncWindowStart}
                        onChange={(e) =>
                          setScheduleForm((s) => ({
                            ...s,
                            autoSyncWindowStart: Number(e.target.value),
                          }))
                        }
                      >
                        {HOUR_OPTIONS.map((h) => (
                          <option key={h} value={h}>
                            {formatHour(h)}
                          </option>
                        ))}
                      </select>
                      <span className="text-sm text-gray-500">{t('simplefin.and')}</span>
                      <select
                        className="block rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        value={scheduleForm.autoSyncWindowEnd}
                        onChange={(e) =>
                          setScheduleForm((s) => ({
                            ...s,
                            autoSyncWindowEnd: Number(e.target.value),
                          }))
                        }
                      >
                        {HOUR_OPTIONS.map((h) => (
                          <option key={h} value={h}>
                            {formatHour(h)}
                          </option>
                        ))}
                      </select>
                    </div>
                    <p className="text-xs text-gray-500">{t('simplefin.syncWindowNote')}</p>
                  </div>
                </>
              )}

              <Button type="submit" disabled={updateScheduleMutation.isPending}>
                {updateScheduleMutation.isPending && (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                )}
                {t('simplefin.saveSchedule')}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
