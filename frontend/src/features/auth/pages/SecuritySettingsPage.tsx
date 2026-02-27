import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { LogOut, LogOutIcon, Shield, Fingerprint, Monitor, Key, Copy, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { authApi } from '../api/authApi';
import type { ApiKey, CreateApiKeyResult } from '../types';
import { useAuthStore } from '../stores/authStore';
import { useTotpSetup } from '../hooks/useTotpSetup';
import { TotpSetup } from '../components/TotpSetup';
import { PasskeySetup } from '../components/PasskeySetup';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Separator } from '@components/ui/separator';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@components/ui/dialog';
import { getApiErrorMessage } from '@lib/api/errors';

const VALID_SCOPES: Array<{ value: string; label: string }> = [
  { value: 'accounts:read', label: 'accounts:read' },
  { value: 'transactions:read', label: 'transactions:read' },
  { value: 'transactions:write', label: 'transactions:write' },
  { value: 'budget:read', label: 'budget:read' },
  { value: 'reports:read', label: 'reports:read' },
  { value: 'simplefin:read', label: 'simplefin:read' },
  { value: 'simplefin:write', label: 'simplefin:write' },
];


export function SecuritySettingsPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const { disable: disableTotp, isDisabling, disableError } = useTotpSetup();

  // ─── API Key state ────────────────────────────────────────────────────────
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [newKeyLabel, setNewKeyLabel] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>([]);
  const [newKeyExpiresAt, setNewKeyExpiresAt] = useState('');
  const [createdKeyResult, setCreatedKeyResult] = useState<CreateApiKeyResult | null>(null);
  const [copied, setCopied] = useState(false);

  const logoutMutation = useMutation({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  const logoutAllMutation = useMutation({
    mutationFn: () => authApi.logoutAll(),
    onSuccess: () => {
      clearAuth();
      queryClient.clear();
      navigate('/login', { replace: true });
    },
  });

  const { data: sessionsData, isLoading: sessionsLoading } = useQuery({
    queryKey: ['auth-sessions'],
    queryFn: () => authApi.listSessions().then((r) => r.data.data.sessions),
  });

  const { data: apiKeysData, isLoading: apiKeysLoading } = useQuery({
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

  function handleCreateApiKey() {
    if (!newKeyLabel || newKeyScopes.length === 0) return;
    createApiKeyMutation.mutate({
      label: newKeyLabel,
      scopes: newKeyScopes,
      expiresAt: newKeyExpiresAt || undefined,
    });
  }

  function handleDialogClose() {
    setApiKeyDialogOpen(false);
    setNewKeyLabel('');
    setNewKeyScopes([]);
    setNewKeyExpiresAt('');
    setCreatedKeyResult(null);
    setCopied(false);
  }

  async function handleCopyKey(rawKey: string) {
    await navigator.clipboard.writeText(rawKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const apiKeys: ApiKey[] = apiKeysData ?? [];

  const revokeSessionMutation = useMutation({
    mutationFn: (sessionId: string) => authApi.revokeSession(sessionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['auth-sessions'] }),
  });

  const sessions = sessionsData ?? [];

  return (
    <div className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{t('security.title')}</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="gap-2"
            isLoading={logoutMutation.isPending}
            onClick={() => logoutMutation.mutate()}
          >
            <LogOut className="h-4 w-4" />
            {t('security.signOut')}
          </Button>
        </div>

        {/* TOTP Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{t('security.totp')}</CardTitle>
              </div>
              <Badge variant={user?.totpEnabled ? 'default' : 'secondary'}>
                {user?.totpEnabled ? t('security.enabled') : t('security.disabled')}
              </Badge>
            </div>
            <CardDescription>{t('security.totpDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {disableError && (
              <Alert variant="destructive">
                <AlertDescription>{getApiErrorMessage(disableError)}</AlertDescription>
              </Alert>
            )}

            {user?.totpEnabled ? (
              <div className="space-y-2">
                {!showTotpSetup ? (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowTotpSetup(true)}
                    >
                      {t('security.reconfigure')}
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      isLoading={isDisabling}
                      onClick={disableTotp}
                    >
                      {t('security.disable')}
                    </Button>
                  </div>
                ) : (
                  <TotpSetup onComplete={() => setShowTotpSetup(false)} />
                )}
              </div>
            ) : (
              <TotpSetup onComplete={() => {}} />
            )}
          </CardContent>
        </Card>

        {/* Passkeys Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Fingerprint className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{t('security.passkeys')}</CardTitle>
            </div>
            <CardDescription>{t('security.passkeysDesc')}</CardDescription>
          </CardHeader>
          <CardContent>
            <PasskeySetup />
          </CardContent>
        </Card>

        {/* API Keys */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">{t('security.apiKeys.title')}</CardTitle>
              </div>
              <Dialog open={apiKeyDialogOpen} onOpenChange={(open) => { if (!open) handleDialogClose(); else setApiKeyDialogOpen(true); }}>
                <DialogTrigger>
                  <Button size="sm" variant="outline">{t('security.apiKeys.create')}</Button>
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
                            onClick={() => void handleCopyKey(createdKeyResult.rawKey)}
                          >
                            {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="flex justify-end gap-2">
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
                          <Label htmlFor="api-key-label">{t('security.apiKeys.label')}</Label>
                          <Input
                            id="api-key-label"
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
                          <Label htmlFor="api-key-expires">{t('security.apiKeys.expiresAt')}</Label>
                          <Input
                            id="api-key-expires"
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
                        <Button variant="outline" onClick={handleDialogClose}>Cancel</Button>
                        <Button
                          onClick={handleCreateApiKey}
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
            <CardDescription>{t('security.apiKeys.description')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {apiKeysLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : apiKeys.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('security.apiKeys.empty')}</p>
            ) : (
              apiKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border px-3 py-2"
                >
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
                    className="text-destructive hover:text-destructive flex-shrink-0 ml-2"
                    isLoading={deleteApiKeyMutation.isPending}
                    onClick={() => deleteApiKeyMutation.mutate(key.id)}
                  >
                    {t('security.apiKeys.revoke')}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LogOutIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">{t('security.sessions')}</CardTitle>
            </div>
            <CardDescription>{t('security.sessionsDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Session list */}
            {sessionsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 2 }).map((_, i) => (
                  <div key={i} className="h-12 bg-muted animate-pulse rounded-md" />
                ))}
              </div>
            ) : sessions.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t('security.sessionsEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border px-3 py-2"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <Monitor className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-medium truncate">
                            {session.deviceName ?? 'Unknown device'}
                          </p>
                          {session.isCurrent && (
                            <Badge variant="outline" className="text-xs flex-shrink-0">
                              {t('security.sessionsThisDevice')}
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {session.ipAddress ?? '—'} · {t('security.sessionsSignedIn')}{' '}
                          {new Date(session.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {!session.isCurrent && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive hover:text-destructive flex-shrink-0"
                        isLoading={revokeSessionMutation.isPending}
                        onClick={() => revokeSessionMutation.mutate(session.id)}
                      >
                        {t('security.sessionsSignOut')}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{t('security.signOutEverywhere')}</p>
                <p className="text-xs text-muted-foreground">{t('security.signOutEverywhereDesc')}</p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                isLoading={logoutAllMutation.isPending}
                onClick={() => logoutAllMutation.mutate()}
              >
                {t('security.signOutAll')}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
