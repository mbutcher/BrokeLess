import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { ShieldAlert, Copy, Check, KeyRound, AlertTriangle } from 'lucide-react';
import { setupApi } from '../api/authApi';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Checkbox } from '@components/ui/checkbox';

// ── Copy button ────────────────────────────────────────────────────────────────

function CopyButton({ value, className = '' }: { value: string; className?: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title="Copy to clipboard"
      className={`flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors ${
        copied
          ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
          : 'bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      } ${className}`}
    >
      {copied ? (
        <>
          <Check className="h-3.5 w-3.5" />
          Copied
        </>
      ) : (
        <>
          <Copy className="h-3.5 w-3.5" />
          Copy
        </>
      )}
    </button>
  );
}

// ── Modal ──────────────────────────────────────────────────────────────────────

interface InitialSecretsModalProps {
  open: boolean;
  onAcknowledged: () => void;
}

export function InitialSecretsModal({ open, onAcknowledged }: InitialSecretsModalProps) {
  const { t } = useTranslation();
  const [confirmed, setConfirmed] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ['setup', 'initial-secrets'],
    queryFn: async () => {
      const res = await setupApi.getInitialSecrets();
      return res.data.data;
    },
    enabled: open,
    staleTime: Infinity,
    retry: false,
  });

  const hasMaster = Boolean(data?.masterSecret);

  return (
    <Dialog open={open} onOpenChange={() => undefined}>
      <DialogContent className="max-h-[90vh] max-w-xl overflow-y-auto">
        {/* ── Header ── */}
        <DialogHeader>
          <div className="mb-3 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-destructive/10 mt-0.5">
              <ShieldAlert className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold leading-snug">
                {t('setup.secretsModal.title')}
              </DialogTitle>
              <DialogDescription className="mt-0.5 text-sm">
                {t('setup.secretsModal.subtitle')}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-3 dark:border-amber-800 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <p className="text-sm leading-snug text-amber-800 dark:text-amber-300">
              {t('setup.secretsModal.warning')}
            </p>
          </div>
        </DialogHeader>

        {/* ── Loading state ── */}
        {isLoading && (
          <div className="flex items-center justify-center py-10">
            <KeyRound className="h-5 w-5 animate-pulse text-muted-foreground" />
            <span className="ml-2 text-sm text-muted-foreground">{t('common.loading')}</span>
          </div>
        )}

        {data && (
          <div className="mt-1 space-y-4">
            {/* ── Master secret (primary) ── */}
            {hasMaster && (
              <div className="rounded-xl border-2 border-primary/30 bg-primary/5 p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-foreground">
                      {t('setup.secretsModal.masterSecretLabel')}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {t('setup.secretsModal.masterSecretDesc')}
                    </p>
                  </div>
                  <CopyButton value={data.masterSecret!} className="shrink-0" />
                </div>
                <code className="mt-1 block break-all rounded-lg bg-background px-3 py-2.5 font-mono text-sm font-semibold tracking-wide text-foreground ring-2 ring-primary/20">
                  {data.masterSecret}
                </code>
              </div>
            )}

            {/* ── Confirm + continue ── */}
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">{t('setup.secretsModal.whereToStore')}</p>

              <label className="flex cursor-pointer items-start gap-2.5">
                <Checkbox
                  checked={confirmed}
                  onCheckedChange={(v) => setConfirmed(Boolean(v))}
                  className="mt-0.5"
                />
                <span className="text-sm font-medium leading-snug">
                  {t('setup.secretsModal.confirmLabel')}
                </span>
              </label>

              <Button
                className="w-full"
                disabled={!confirmed || isLoading}
                onClick={onAcknowledged}
              >
                {t('setup.secretsModal.continueBtn')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
