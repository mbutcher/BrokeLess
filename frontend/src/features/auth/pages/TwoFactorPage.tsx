import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { TwoFactorForm } from '../components/TwoFactorForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';

export function TwoFactorPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { twoFactorState, isAuthenticated } = useAuthStore();

  // If no pending 2FA state and not already authenticated (e.g. after successful
  // WebAuthn flow clears twoFactorState before the route change lands), redirect to login.
  useEffect(() => {
    if (!twoFactorState && !isAuthenticated) {
      navigate('/login', { replace: true });
    }
  }, [twoFactorState, isAuthenticated, navigate]);

  if (!twoFactorState) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">{t('auth.appName')}</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{t('auth.twoFactor')}</CardTitle>
            <CardDescription>{t('auth.twoFactorSubtitle')}</CardDescription>
          </CardHeader>
          <CardContent>
            <TwoFactorForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
