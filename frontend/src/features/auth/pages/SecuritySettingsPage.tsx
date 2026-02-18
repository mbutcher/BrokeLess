import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { LogOut, LogOutIcon, Shield, Fingerprint } from 'lucide-react';
import { authApi } from '../api/authApi';
import { useAuthStore } from '../stores/authStore';
import { useTotpSetup } from '../hooks/useTotpSetup';
import { TotpSetup } from '../components/TotpSetup';
import { PasskeySetup } from '../components/PasskeySetup';
import { Button } from '@components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';
import { Badge } from '@components/ui/badge';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Separator } from '@components/ui/separator';
import { getApiErrorMessage } from '@lib/api/errors';


export function SecuritySettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, clearAuth } = useAuthStore();
  const [showTotpSetup, setShowTotpSetup] = useState(false);
  const { disable: disableTotp, isDisabling, disableError } = useTotpSetup();

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

  return (
    <div className="min-h-screen bg-muted/40 p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Security Settings</h1>
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
            Sign out
          </Button>
        </div>

        {/* TOTP Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-muted-foreground" />
                <CardTitle className="text-base">Authenticator App</CardTitle>
              </div>
              <Badge variant={user?.totpEnabled ? 'default' : 'secondary'}>
                {user?.totpEnabled ? 'Enabled' : 'Disabled'}
              </Badge>
            </div>
            <CardDescription>
              Use a time-based one-time password (TOTP) app for two-factor authentication.
            </CardDescription>
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
                      Reconfigure
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      isLoading={isDisabling}
                      onClick={disableTotp}
                    >
                      Disable
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
              <CardTitle className="text-base">Passkeys</CardTitle>
            </div>
            <CardDescription>
              Passkeys let you sign in with your fingerprint, face ID, or security key — no password
              needed.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PasskeySetup />
          </CardContent>
        </Card>

        {/* Session Management */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <LogOutIcon className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-base">Sessions</CardTitle>
            </div>
            <CardDescription>Manage your active login sessions.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Separator />
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Sign out everywhere</p>
                <p className="text-xs text-muted-foreground">
                  Revokes all refresh tokens across all devices.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                isLoading={logoutAllMutation.isPending}
                onClick={() => logoutAllMutation.mutate()}
              >
                Sign out all
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
