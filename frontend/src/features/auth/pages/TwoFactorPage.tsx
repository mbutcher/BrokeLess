import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { TwoFactorForm } from '../components/TwoFactorForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@components/ui/card';

export function TwoFactorPage() {
  const navigate = useNavigate();
  const { twoFactorState } = useAuthStore();

  // If no pending 2FA state, redirect to login
  useEffect(() => {
    if (!twoFactorState) {
      navigate('/login', { replace: true });
    }
  }, [twoFactorState, navigate]);

  if (!twoFactorState) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Budget App</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Two-factor verification</CardTitle>
            <CardDescription>Enter your verification code to continue.</CardDescription>
          </CardHeader>
          <CardContent>
            <TwoFactorForm />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
