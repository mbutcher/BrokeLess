import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, AlertCircle, Loader2, RefreshCw, Unplug, Server, Copy, Check, Key, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Badge } from '@components/ui/badge';
import { Alert, AlertDescription } from '@components/ui/alert';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@components/ui/dialog';
import { SetupInstructionsCard } from '@features/integrations/components/SetupInstructionsCard';
import {
  useSimplefinStatus,
  useSimplefinSchedule,
  useConnectSimplefin,
  useDisconnectSimplefin,
  useSyncNow,
  useUpdateSchedule,
} from '@features/integrations/hooks/useSimplefin';
import type { UpdateScheduleInput } from '@features/integrations/types';
import { authApi } from '@features/auth/api/authApi';
import type { ApiKey, CreateApiKeyResult } from '@features/auth/types';
import { getApiErrorMessage } from '@lib/api/errors';

const INTERVAL_OPTIONS = [1, 2, 4, 6, 8, 12, 24] as const;

const VALID_SCOPES: Array<{ value: string; label: string }> = [
  { value: 'accounts:read', label: 'accounts:read' },
  { value: 'transactions:read', label: 'transactions:read' },
  { value: 'transactions:write', label: 'transactions:write' },
  { value: 'budget:read', label: 'budget:read' },
  { value: 'reports:read', label: 'reports:read' },
  { value: 'simplefin:read', label: 'simplefin:read' },
  { value: 'simplefin:write', label: 'simplefin:write' },
];
const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i);

function formatHour(h: number): string {
  if (h === 0) return '12:00 AM';
  if (h < 12) return `${h}:00 AM`;
  if (h === 12) return '12:00 PM';
  return `${h - 12}:00 PM`;
}

// ─── SimpleFIN Section ────────────────────────────────────────────────────────

function SimplefinSection() {
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
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-32 bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  const selectClass =
    'block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500';

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900">{t('simplefin.title')}</h2>
        <p className="text-sm text-gray-500 mt-0.5">{t('simplefin.subtitle')}</p>
      </div>

      <SetupInstructionsCard defaultCollapsed={isConnected} />

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
                      Last synced: {new Date(connection.lastSyncAt).toLocaleString()}
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
                <Button variant="default" onClick={handleSync} disabled={syncMutation.isPending}>
                  {syncMutation.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RefreshCw className="mr-2 h-4 w-4" />
                  )}
                  {t('simplefin.syncNow')}
                </Button>

                {!confirmDisconnect ? (
                  <Button variant="outline" onClick={() => setConfirmDisconnect(true)}>
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

      {isConnected && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t('simplefin.syncSchedule')}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSaveSchedule} className="space-y-5">
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
                  <div className="space-y-1">
                    <Label htmlFor="sync-interval">{t('simplefin.syncEvery')}</Label>
                    <select
                      id="sync-interval"
                      className={selectClass}
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

// ─── MCP Server Section ───────────────────────────────────────────────────────

function McpServerSection() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  // ─── API key create dialog state ────────────────────────────────────────────
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState('');
  const [createdKeyResult, setCreatedKeyResult] = useState<CreateApiKeyResult | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [copiedConnId, setCopiedConnId] = useState<string | null>(null);

  const { data: apiKeysData, isLoading } = useQuery({
    queryKey: ['auth-api-keys'],
    queryFn: () => authApi.listApiKeys().then((r) => r.data.data.apiKeys),
  });

  const createApiKeyMutation = useMutation({
    mutationFn: (data: { label: string; scopes: string[]; expiresAt?: string }) =>
      authApi.createApiKey(data).then((r) => r.data.data),
    onSuccess: (result) => {
      setCreatedKeyResult(result);
      void queryClient.invalidateQueries({ queryKey: ['auth-api-keys'] });
    },
  });

  const deleteApiKeyMutation = useMutation({
    mutationFn: (id: string) => authApi.deleteApiKey(id),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: ['auth-api-keys'] }),
  });

  function handleScopeToggle(scope: string) {
    setNewKeyScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  }

  function handleCreate() {
    if (!newKeyLabel || newKeyScopes.length === 0) return;
    createApiKeyMutation.mutate({
      label: newKeyLabel,
      scopes: newKeyScopes,
      expiresAt: newKeyExpiresAt || undefined,
    });
  }

  function handleDialogClose() {
    setDialogOpen(false);
    setNewKeyLabel('');
    setNewKeyScopes([]);
    setNewKeyExpiresAt('');
    setCreatedKeyResult(null);
    setCopiedKeyId(null);
  }

  async function handleCopyRawKey(rawKey: string) {
    await navigator.clipboard.writeText(rawKey);
    setCopiedKeyId('raw');
    setTimeout(() => setCopiedKeyId(null), 2000);
  }

  async function handleCopyConn(text: string, id: string) {
    await navigator.clipboard.writeText(text);
    setCopiedConnId(id);
    setTimeout(() => setCopiedConnId(null), 2000);
  }

  const apiKeys: ApiKey[] = apiKeysData ?? [];
  const baseUrl = window.location.origin;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">{t('settings.mcp.title')}</CardTitle>
            <Badge variant="secondary" className="ml-1 text-xs">
              {t('settings.mcp.beta')}
            </Badge>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); else setDialogOpen(true); }}>
            <DialogTrigger>
              <Button size="sm" variant="outline">
                <Plus className="mr-2 h-4 w-4" />
                {t('security.apiKeys.create')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              {createdKeyResult ? (
                <>
                  <DialogHeader>
                    <DialogTitle>{t('security.apiKeys.createSuccess')}</DialogTitle>
                    <DialogDescription>{t('security.apiKeys.oneTimeWarning')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                      <code className="flex-1 text-xs break-all">{createdKeyResult.rawKey}</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => void handleCopyRawKey(createdKeyResult.rawKey)}
                      >
                        {copiedKeyId === 'raw' ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <Button onClick={handleDialogClose}>Done</Button>
                  </div>
                </>
              ) : (
                <>
                  <DialogHeader>
                    <DialogTitle>{t('security.apiKeys.create')}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="mcp-key-label">{t('security.apiKeys.label')}</Label>
                      <Input
                        id="mcp-key-label"
                        placeholder={t('security.apiKeys.labelPlaceholder')}
                        value={newKeyLabel}
                        onChange={(e) => setNewKeyLabel(e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>{t('security.apiKeys.scopes')}</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {VALID_SCOPES.map((scope) => (
                          <label key={scope.value} className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-input accent-primary"
                              checked={newKeyScopes.includes(scope.value)}
                              onChange={() => handleScopeToggle(scope.value)}
                            />
                            <span className="text-sm font-mono">{scope.label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="mcp-key-expires">{t('security.apiKeys.expiresAt')}</Label>
                      <Input
                        id="mcp-key-expires"
                        type="date"
                        value={newKeyExpiresAt}
                        onChange={(e) => setNewKeyExpiresAt(e.target.value)}
                      />
                    </div>
                    {createApiKeyMutation.isError && (
                      <Alert variant="destructive">
                        <AlertDescription>
                          {getApiErrorMessage(createApiKeyMutation.error)}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={handleDialogClose}>
                      Cancel
                    </Button>
                    <Button
                      onClick={handleCreate}
                      disabled={!newKeyLabel || newKeyScopes.length === 0}
                      isLoading={createApiKeyMutation.isPending}
                    >
                      {t('security.apiKeys.create')}
                    </Button>
                  </div>
                </>
              )}
            </DialogContent>
          </Dialog>
        </div>
        <CardDescription>{t('settings.mcp.desc')}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
            ))}
          </div>
        ) : apiKeys.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('settings.mcp.noKeys')}</p>
        ) : (
          <div className="space-y-4">
            {apiKeys.map((key) => {
              const connString = `claude mcp add budget-app ${baseUrl}/api/v1/mcp --header "Authorization: Bearer <your-key>" # ${key.label}`;
              return (
                <div key={key.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium truncate">{key.label}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {key.scopes.map((scope) => (
                          <Badge key={scope} variant="secondary" className="text-xs">
                            {scope}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {key.lastUsedAt
                          ? `${t('security.apiKeys.lastUsed')} ${new Date(key.lastUsedAt).toLocaleDateString()}`
                          : t('security.apiKeys.neverUsed')}
                        {key.expiresAt && (
                          <> · {t('security.apiKeys.expires')} {new Date(key.expiresAt).toLocaleDateString()}</>
                        )}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive flex-shrink-0"
                      isLoading={deleteApiKeyMutation.isPending}
                      onClick={() => deleteApiKeyMutation.mutate(key.id)}
                    >
                      {t('security.apiKeys.revoke')}
                    </Button>
                  </div>
                  <div className="flex items-center gap-2 rounded-md border bg-muted px-3 py-2">
                    <Key className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                    <code className="flex-1 text-xs break-all font-mono text-gray-600">
                      {connString}
                    </code>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => void handleCopyConn(connString, key.id)}
                    >
                      {copiedConnId === key.id ? (
                        <Check className="h-4 w-4 text-green-600" />
                      ) : (
                        <Copy className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export function IntegrationsSettingsPage() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-2xl space-y-8">
        <div>
          <h1 className="text-2xl font-bold">{t('settings.integrations')}</h1>
          <p className="text-sm text-muted-foreground">{t('settings.integrationsSubtitle')}</p>
        </div>

        <SimplefinSection />

        <div className="border-t border-gray-200 pt-8">
          <McpServerSection />
        </div>
      </div>
    </div>
  );
}
