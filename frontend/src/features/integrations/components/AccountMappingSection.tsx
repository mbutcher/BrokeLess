import { useState } from 'react';
import { Link2, Link2Off, Plus, X, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Badge } from '@components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@components/ui/dialog';
import { Label } from '@components/ui/label';
import { Input } from '@components/ui/input';
import { useAccounts } from '@features/core/hooks/useAccounts';
import { useSimplefinAccounts, useMapAccount, useIgnoreSimplefinAccount } from '../hooks/useSimplefin';
import type { SimplefinAccountMapping, MapAccountAction } from '../types';
import type { AccountType } from '@features/core/types';

// ─── Account type options ──────────────────────────────────────────────────────

const ACCOUNT_TYPE_OPTIONS: { value: AccountType; label: string; isAsset: boolean }[] = [
  { value: 'checking', label: 'Chequing', isAsset: true },
  { value: 'savings', label: 'Savings', isAsset: true },
  { value: 'credit_card', label: 'Credit Card', isAsset: false },
  { value: 'line_of_credit', label: 'Line of Credit', isAsset: false },
  { value: 'loan', label: 'Loan', isAsset: false },
  { value: 'mortgage', label: 'Mortgage', isAsset: false },
  { value: 'investment', label: 'Investment', isAsset: true },
  { value: 'other', label: 'Other', isAsset: true },
];

// ─── Link Account Dialog ───────────────────────────────────────────────────────

interface LinkAccountDialogProps {
  mapping: SimplefinAccountMapping;
  open: boolean;
  onClose: () => void;
}

function LinkAccountDialog({ mapping, open, onClose }: LinkAccountDialogProps) {
  const { t } = useTranslation();
  const { data: localAccounts = [] } = useAccounts();
  const mapAccount = useMapAccount();

  const [mode, setMode] = useState<'link' | 'create'>('link');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [newName, setNewName] = useState(mapping.simplefinAccountName);
  const [newType, setNewType] = useState<AccountType>('checking');
  const [newCurrency, setNewCurrency] = useState('CAD');

  const selectedTypeOption = ACCOUNT_TYPE_OPTIONS.find((o) => o.value === newType);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    let data: MapAccountAction;

    if (mode === 'link') {
      if (!selectedAccountId) return;
      data = { action: 'link', localAccountId: selectedAccountId };
    } else {
      data = {
        action: 'create',
        newAccount: {
          name: newName.trim(),
          type: newType,
          isAsset: selectedTypeOption?.isAsset ?? true,
          currency: newCurrency.trim().toUpperCase(),
        },
      };
    }

    await mapAccount.mutateAsync({ simplefinAccountId: mapping.simplefinAccountId, data });
    onClose();
  }

  const canSubmit =
    !mapAccount.isPending &&
    (mode === 'link' ? Boolean(selectedAccountId) : newName.trim().length > 0);

  // Accounts that aren't already linked to a SimpleFIN account
  const linkableAccounts = localAccounts.filter((a) => a.isActive);

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('simplefin.linkAccount')}</DialogTitle>
          <DialogDescription className="text-sm">
            <span className="font-medium text-foreground">{mapping.simplefinOrgName}</span>
            {' — '}
            {mapping.simplefinAccountName}
          </DialogDescription>
        </DialogHeader>

        {/* Mode toggle */}
        <div className="flex rounded-lg border border-border p-1 gap-1">
          <button
            type="button"
            onClick={() => setMode('link')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'link'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Link2 className="inline h-3.5 w-3.5 mr-1.5" />
            {t('simplefin.linkExisting')}
          </button>
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              mode === 'create'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Plus className="inline h-3.5 w-3.5 mr-1.5" />
            {t('simplefin.createNew')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === 'link' ? (
            <div className="space-y-1.5">
              <Label htmlFor="link-account">{t('simplefin.selectAccount')}</Label>
              {linkableAccounts.length === 0 ? (
                <p className="text-sm text-muted-foreground">{t('simplefin.noAccountsToLink')}</p>
              ) : (
                <select
                  id="link-account"
                  className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                >
                  <option value="">{t('simplefin.selectPlaceholder')}</option>
                  {linkableAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.type.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="new-name">{t('simplefin.accountName')}</Label>
                <Input
                  id="new-name"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder={t('simplefin.accountNamePlaceholder')}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-type">{t('simplefin.accountType')}</Label>
                <select
                  id="new-type"
                  className="block w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AccountType)}
                >
                  {ACCOUNT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="new-currency">{t('simplefin.currency')}</Label>
                <Input
                  id="new-currency"
                  value={newCurrency}
                  onChange={(e) => setNewCurrency(e.target.value)}
                  placeholder="CAD"
                  maxLength={3}
                  className="uppercase"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {mapAccount.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t('simplefin.confirmLink')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─── Account Row ───────────────────────────────────────────────────────────────

interface AccountRowProps {
  mapping: SimplefinAccountMapping;
  localAccountName: string | undefined;
  onLink: () => void;
}

function AccountRow({ mapping, localAccountName, onLink }: AccountRowProps) {
  const { t } = useTranslation();
  const ignoreAccount = useIgnoreSimplefinAccount();

  const isLinked = Boolean(mapping.localAccountId);

  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-border last:border-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground truncate">{mapping.simplefinAccountName}</p>
        <p className="text-xs text-muted-foreground truncate">{mapping.simplefinOrgName}</p>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {isLinked ? (
          <>
            <Badge variant="outline" className="border-green-500/40 text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-950/30 gap-1">
              <Link2 className="h-3 w-3" />
              {localAccountName ?? t('simplefin.linked')}
            </Badge>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onLink}>
              {t('simplefin.change')}
            </Button>
          </>
        ) : mapping.ignored ? (
          <Badge variant="outline" className="text-muted-foreground gap-1">
            <X className="h-3 w-3" />
            {t('simplefin.ignored')}
          </Badge>
        ) : (
          <>
            <Badge variant="outline" className="border-amber-500/40 text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30 gap-1">
              <Link2Off className="h-3 w-3" />
              {t('simplefin.unlinked')}
            </Badge>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={onLink}>
              {t('simplefin.link')}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              disabled={ignoreAccount.isPending}
              onClick={() => void ignoreAccount.mutateAsync(mapping.simplefinAccountId)}
            >
              {t('simplefin.ignore')}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Account Mapping Section ───────────────────────────────────────────────────

export function AccountMappingSection() {
  const { t } = useTranslation();
  const { data: mappings = [], isLoading } = useSimplefinAccounts();
  const { data: localAccounts = [] } = useAccounts();
  const [linkingId, setLinkingId] = useState<string | null>(null);
  const [showIgnored, setShowIgnored] = useState(false);

  const localAccountMap = new Map(localAccounts.map((a) => [a.id, a.name]));

  const active = mappings.filter((m) => !m.ignored);
  const ignored = mappings.filter((m) => m.ignored);
  const unlinkedCount = active.filter((m) => !m.localAccountId).length;

  const linkingMapping = mappings.find((m) => m.simplefinAccountId === linkingId);

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">{t('simplefin.accountsTitle')}</CardTitle>
            {unlinkedCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {unlinkedCount} {t('simplefin.needsAttention')}
              </Badge>
            )}
          </div>
          {mappings.length === 0 && !isLoading && (
            <p className="text-sm text-muted-foreground mt-1">{t('simplefin.noAccountsFound')}</p>
          )}
        </CardHeader>

        {(isLoading || active.length > 0) && (
          <CardContent className="pt-0">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2].map((i) => (
                  <div key={i} className="h-12 rounded-md bg-muted animate-pulse" />
                ))}
              </div>
            ) : (
              <div>
                {active.map((mapping) => (
                  <AccountRow
                    key={mapping.simplefinAccountId}
                    mapping={mapping}
                    localAccountName={
                      mapping.localAccountId
                        ? localAccountMap.get(mapping.localAccountId)
                        : undefined
                    }
                    onLink={() => setLinkingId(mapping.simplefinAccountId)}
                  />
                ))}

                {ignored.length > 0 && (
                  <div className="mt-3">
                    <button
                      type="button"
                      onClick={() => setShowIgnored((v) => !v)}
                      className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showIgnored ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                      {ignored.length} {t('simplefin.ignoredAccounts')}
                    </button>

                    {showIgnored && (
                      <div className="mt-2">
                        {ignored.map((mapping) => (
                          <AccountRow
                            key={mapping.simplefinAccountId}
                            mapping={mapping}
                            localAccountName={
                              mapping.localAccountId
                                ? localAccountMap.get(mapping.localAccountId)
                                : undefined
                            }
                            onLink={() => setLinkingId(mapping.simplefinAccountId)}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {linkingMapping && (
        <LinkAccountDialog
          mapping={linkingMapping}
          open={Boolean(linkingId)}
          onClose={() => setLinkingId(null)}
        />
      )}
    </>
  );
}
