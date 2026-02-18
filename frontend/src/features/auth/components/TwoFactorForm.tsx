import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Fingerprint } from 'lucide-react';
import { totpSchema, backupCodeSchema, type TotpFormData, type BackupCodeFormData } from '../schemas';
import { useTwoFactor } from '../hooks/useTwoFactor';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { FormField } from '@components/ui/form-field';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@components/ui/tabs';
import { getApiErrorMessage } from '@lib/api/errors';


type Tab = 'totp' | 'backup' | 'webauthn';

function TotpTab() {
  const { verifyTotp, isVerifyingTotp, totpError } = useTwoFactor();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<TotpFormData>({ resolver: zodResolver(totpSchema) });

  return (
    <form onSubmit={handleSubmit((d) => verifyTotp(d.token))} className="space-y-4">
      {totpError && (
        <Alert variant="destructive">
          <AlertDescription>{getApiErrorMessage(totpError)}</AlertDescription>
        </Alert>
      )}
      <FormField label="6-digit code" htmlFor="token" error={errors.token?.message}>
        <Input
          id="token"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="000000"
          maxLength={6}
          className="text-center text-2xl tracking-widest"
          {...register('token')}
        />
      </FormField>
      <Button type="submit" className="w-full" isLoading={isVerifyingTotp}>
        Verify
      </Button>
    </form>
  );
}

function BackupTab() {
  const { verifyBackupCode, isVerifyingBackup, backupError } = useTwoFactor();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<BackupCodeFormData>({ resolver: zodResolver(backupCodeSchema) });

  return (
    <form onSubmit={handleSubmit((d) => verifyBackupCode(d.code))} className="space-y-4">
      {backupError && (
        <Alert variant="destructive">
          <AlertDescription>{getApiErrorMessage(backupError)}</AlertDescription>
        </Alert>
      )}
      <FormField label="Backup code" htmlFor="code" error={errors.code?.message}>
        <Input
          id="code"
          type="text"
          autoComplete="off"
          placeholder="XXXXXXXXXX"
          className="font-mono uppercase tracking-widest"
          {...register('code')}
        />
      </FormField>
      <Button type="submit" className="w-full" isLoading={isVerifyingBackup}>
        Use backup code
      </Button>
    </form>
  );
}

function WebAuthnTab() {
  const { verifyWebAuthn, isVerifyingWebAuthn, webAuthnError } = useTwoFactor();

  return (
    <div className="space-y-4">
      {webAuthnError && (
        <Alert variant="destructive">
          <AlertDescription>{getApiErrorMessage(webAuthnError)}</AlertDescription>
        </Alert>
      )}
      <p className="text-sm text-muted-foreground text-center">
        Use your registered passkey or security key to verify your identity.
      </p>
      <Button
        type="button"
        className="w-full gap-2"
        isLoading={isVerifyingWebAuthn}
        onClick={verifyWebAuthn}
      >
        <Fingerprint className="h-4 w-4" />
        Use Passkey
      </Button>
    </div>
  );
}

export function TwoFactorForm() {
  const { methods, cancel } = useTwoFactor();
  const hasTotpOrBackup = methods.includes('totp');
  const hasWebAuthn = methods.includes('webauthn');

  const defaultTab: Tab = hasWebAuthn && !hasTotpOrBackup ? 'webauthn' : 'totp';
  const [tab, setTab] = useState<Tab>(defaultTab);

  const tabList = [
    ...(hasTotpOrBackup ? [{ value: 'totp' as Tab, label: 'Authenticator' }] : []),
    ...(hasTotpOrBackup ? [{ value: 'backup' as Tab, label: 'Backup code' }] : []),
    ...(hasWebAuthn ? [{ value: 'webauthn' as Tab, label: 'Passkey' }] : []),
  ];

  return (
    <div className="space-y-4">
      {tabList.length > 1 && (
        <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
          <TabsList className="w-full">
            {tabList.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="flex-1">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="totp">
            <TotpTab />
          </TabsContent>
          <TabsContent value="backup">
            <BackupTab />
          </TabsContent>
          <TabsContent value="webauthn">
            <WebAuthnTab />
          </TabsContent>
        </Tabs>
      )}

      {tabList.length === 1 && (
        <>
          {tab === 'totp' && <TotpTab />}
          {tab === 'backup' && <BackupTab />}
          {tab === 'webauthn' && <WebAuthnTab />}
        </>
      )}

      <Button variant="ghost" className="w-full text-sm" onClick={cancel}>
        Cancel — back to login
      </Button>
    </div>
  );
}
