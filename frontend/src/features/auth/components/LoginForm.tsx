import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Fingerprint } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { loginSchema, type LoginFormData } from '../schemas';
import { useLogin } from '../hooks/useLogin';
import { useWebAuthnAuthenticate } from '../hooks/useWebAuthn';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { FormField } from '@components/ui/form-field';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Separator } from '@components/ui/separator';
import { getApiErrorMessage } from '@lib/api/errors';

export function LoginForm() {
  const { t } = useTranslation();
  const login = useLogin();
  const webAuthn = useWebAuthnAuthenticate();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = (data: LoginFormData) => {
    login.mutate(data);
  };

  const loginError = login.error ? getApiErrorMessage(login.error) : null;
  const webAuthnError = webAuthn.error ? getApiErrorMessage(webAuthn.error) : null;

  return (
    <div className="space-y-6">
      {(loginError || webAuthnError) && (
        <Alert variant="destructive">
          <AlertDescription>{loginError ?? webAuthnError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        <FormField label={t('auth.email')} htmlFor="email" error={errors.email?.message}>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@example.com"
            {...register('email')}
          />
        </FormField>

        <FormField label={t('auth.password')} htmlFor="password" error={errors.password?.message}>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            placeholder="••••••••••••"
            {...register('password')}
          />
        </FormField>

        <Button type="submit" className="w-full" isLoading={login.isPending}>
          {t('auth.signIn')}
        </Button>
      </form>

      <div className="relative">
        <Separator />
        <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-background px-2 text-xs text-muted-foreground">
          or
        </span>
      </div>

      <Button
        type="button"
        variant="outline"
        className="w-full gap-2"
        isLoading={webAuthn.isAuthenticating}
        onClick={webAuthn.authenticate}
      >
        <Fingerprint className="h-4 w-4" />
        {t('auth.signInWithPasskey')}
      </Button>

    </div>
  );
}
