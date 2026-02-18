import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ShieldCheck, Copy, Check } from 'lucide-react';
import { useState } from 'react';
import { totpSchema, type TotpFormData } from '../schemas';
import { useTotpSetup } from '../hooks/useTotpSetup';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { FormField } from '@components/ui/form-field';
import { Alert, AlertDescription } from '@components/ui/alert';
import { Badge } from '@components/ui/badge';
import { getApiErrorMessage } from '@lib/api/errors';


function BackupCodesDisplay({ codes, onDone }: { codes: string[]; onDone: () => void }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(codes.join('\n'));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4">
      <Alert>
        <ShieldCheck className="h-4 w-4" />
        <AlertDescription>
          <strong>Save these backup codes now.</strong> They won&apos;t be shown again. Each code can
          only be used once.
        </AlertDescription>
      </Alert>

      <div className="grid grid-cols-2 gap-2 rounded-md border p-4 font-mono text-sm">
        {codes.map((code) => (
          <span key={code} className="tracking-widest">
            {code}
          </span>
        ))}
      </div>

      <Button variant="outline" className="w-full gap-2" onClick={handleCopy}>
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        {copied ? 'Copied!' : 'Copy all codes'}
      </Button>

      <Button className="w-full" onClick={onDone}>
        I&apos;ve saved my codes
      </Button>
    </div>
  );
}

interface TotpSetupProps {
  onComplete?: () => void;
}

export function TotpSetup({ onComplete }: TotpSetupProps) {
  const {
    step,
    qrCodeDataUrl,
    otpauthUrl,
    backupCodes,
    isStarting,
    isConfirming,
    setupError,
    confirmError,
    startSetup,
    confirmToken,
    reset,
  } = useTotpSetup();

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset: resetForm,
  } = useForm<TotpFormData>({ resolver: zodResolver(totpSchema) });

  if (step === 'idle') {
    return (
      <div className="space-y-4">
        {setupError && (
          <Alert variant="destructive">
            <AlertDescription>{getApiErrorMessage(setupError)}</AlertDescription>
          </Alert>
        )}
        <p className="text-sm text-muted-foreground">
          Use an authenticator app (Google Authenticator, Authy, 1Password, etc.) to add an extra layer
          of security to your account.
        </p>
        <Button className="w-full" isLoading={isStarting} onClick={startSetup}>
          Set up authenticator
        </Button>
      </div>
    );
  }

  if (step === 'display') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">
          Scan this QR code with your authenticator app, then enter the 6-digit code to confirm.
        </p>

        {qrCodeDataUrl && (
          <div className="flex justify-center">
            <img src={qrCodeDataUrl} alt="TOTP QR Code" className="h-48 w-48 rounded-md border p-2" />
          </div>
        )}

        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Can&apos;t scan? Enter code manually</summary>
          <p className="mt-1 break-all font-mono">{otpauthUrl}</p>
        </details>

        {confirmError && (
          <Alert variant="destructive">
            <AlertDescription>{getApiErrorMessage(confirmError)}</AlertDescription>
          </Alert>
        )}

        <form
          onSubmit={handleSubmit((d) => confirmToken(d.token))}
          className="space-y-4"
          noValidate
        >
          <FormField
            label="Verification code"
            htmlFor="totp-verify"
            error={errors.token?.message}
          >
            <Input
              id="totp-verify"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="000000"
              maxLength={6}
              className="text-center text-2xl tracking-widest"
              {...register('token')}
            />
          </FormField>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                reset();
                resetForm();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" className="flex-1" isLoading={isConfirming}>
              Confirm
            </Button>
          </div>
        </form>
      </div>
    );
  }

  if (step === 'backup-codes') {
    return (
      <BackupCodesDisplay
        codes={backupCodes}
        onDone={() => {
          reset();
          onComplete?.();
        }}
      />
    );
  }

  return null;
}
