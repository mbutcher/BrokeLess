import { useState, useEffect } from 'react';
import { RefreshCw, Loader2, CheckCircle2, AlertCircle, Building2, ArrowLeftRight } from 'lucide-react';
import { Card, CardContent } from '@components/ui/card';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { Badge } from '@components/ui/badge';
import { Alert, AlertDescription } from '@components/ui/alert';
import { useAccounts } from '@features/core/hooks/useAccounts';
import {
  useUnmappedAccounts,
  usePendingReviews,
  useSimplefinStatus,
  useMapAccount,
  useResolveReview,
  useSyncNow,
} from '../hooks/useSimplefin';
import type { SimplefinAccountMapping, SimplefinPendingReview, MapAccountAction } from '../types';
import { useTranslation } from 'react-i18next';
import type { AccountType } from '@features/core/types';
import { detectAccountType } from '../utils/detectAccountType';

// ─── Account Mapping Section ──────────────────────────────────────────────────

function AccountMappingCard({ mapping }: { mapping: SimplefinAccountMapping }) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const mapAccount = useMapAccount();

  const detected = detectAccountType(mapping.simplefinAccountName, mapping.simplefinAccountType);

  const [action, setAction] = useState<'link' | 'create'>('link');
  const [localAccountId, setLocalAccountId] = useState('');
  const [newName, setNewName] = useState(mapping.simplefinAccountName);
  const [newType, setNewType] = useState<AccountType>(detected.type);
  const [isAsset, setIsAsset] = useState(detected.isAsset);
  const [currency, setCurrency] = useState('CAD');
  const [saving, setSaving] = useState(false);

  // Re-detect if the mapping changes (e.g. list is refreshed)
  useEffect(() => {
    const d = detectAccountType(mapping.simplefinAccountName, mapping.simplefinAccountType);
    setNewType(d.type);
    setIsAsset(d.isAsset);
  }, [mapping.simplefinAccountName, mapping.simplefinAccountType]);

  const ACCOUNT_TYPES: AccountType[] = [
    'checking',
    'savings',
    'credit_card',
    'loan',
    'line_of_credit',
    'mortgage',
    'investment',
    'other',
  ];

  async function handleSave() {
    setSaving(true);
    try {
      const data: MapAccountAction =
        action === 'link'
          ? { action: 'link', localAccountId }
          : { action: 'create', newAccount: { name: newName, type: newType, isAsset, currency } };
      await mapAccount.mutateAsync({ simplefinAccountId: mapping.simplefinAccountId, data });
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardContent className="pt-4 space-y-4">
        <div className="flex items-start gap-3">
          <Building2 className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium text-sm text-gray-900">{mapping.simplefinAccountName}</p>
            <p className="text-xs text-gray-500">
              {mapping.simplefinOrgName} · {mapping.simplefinAccountType}
            </p>
          </div>
        </div>

        <div className="flex gap-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`action-${mapping.id}`}
              value="link"
              checked={action === 'link'}
              onChange={() => setAction('link')}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-sm font-medium">Link to existing account</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name={`action-${mapping.id}`}
              value="create"
              checked={action === 'create'}
              onChange={() => setAction('create')}
              className="h-4 w-4 text-blue-600"
            />
            <span className="text-sm font-medium">Create new account</span>
          </label>
        </div>

        {action === 'link' ? (
          <div className="space-y-1">
            <Label htmlFor={`local-${mapping.id}`}>BudgetApp account</Label>
            <select
              id={`local-${mapping.id}`}
              className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
              value={localAccountId}
              onChange={(e) => setLocalAccountId(e.target.value)}
            >
              <option value="">Select account…</option>
              {accounts
                .filter((a) => a.isActive)
                .map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
            </select>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor={`name-${mapping.id}`}>Account name</Label>
              <Input
                id={`name-${mapping.id}`}
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-gray-300 text-blue-600"
                checked={isAsset}
                onChange={(e) => setIsAsset(e.target.checked)}
              />
              <span className="text-sm">This is an asset (chequing, savings, investment)</span>
            </label>
            <div className="flex gap-3">
              <div className="flex-1 space-y-1">
                <Label htmlFor={`type-${mapping.id}`}>Type</Label>
                <select
                  id={`type-${mapping.id}`}
                  className="block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm shadow-sm"
                  value={newType}
                  onChange={(e) => setNewType(e.target.value as AccountType)}
                >
                  {ACCOUNT_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {t(`accounts.types.${type}`)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="w-28 space-y-1">
                <Label htmlFor={`currency-${mapping.id}`}>Currency</Label>
                <Input
                  id={`currency-${mapping.id}`}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                  maxLength={3}
                />
              </div>
            </div>
          </div>
        )}

        <Button
          size="sm"
          onClick={handleSave}
          disabled={
            saving ||
            (action === 'link' && !localAccountId) ||
            (action === 'create' && !newName.trim())
          }
        >
          {saving && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
          Save mapping
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Pending Review Card ──────────────────────────────────────────────────────

function ReviewCard({ review }: { review: SimplefinPendingReview }) {
  const resolveReview = useResolveReview();
  const [resolving, setResolving] = useState<string | null>(null);

  const sfDate = new Date(review.rawData.posted * 1000).toLocaleDateString();
  const sfAmount = parseFloat(review.rawData.amount);

  async function handle(action: 'accept' | 'merge' | 'discard') {
    setResolving(action);
    try {
      if (action === 'merge') {
        if (!review.candidateTransactionId) return;
        await resolveReview.mutateAsync({
          reviewId: review.id,
          data: { action: 'merge', targetTransactionId: review.candidateTransactionId },
        });
      } else if (action === 'accept') {
        await resolveReview.mutateAsync({ reviewId: review.id, data: { action: 'accept' } });
      } else {
        await resolveReview.mutateAsync({ reviewId: review.id, data: { action: 'discard' } });
      }
    } finally {
      setResolving(null);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex gap-4">
          {/* SimpleFIN side */}
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              From bank
            </p>
            <p className="text-sm font-medium text-gray-900">{review.rawData.description}</p>
            <p className="text-sm text-gray-600">{sfDate}</p>
            <p className={`text-sm font-semibold ${sfAmount < 0 ? 'text-red-600' : 'text-green-600'}`}>
              {sfAmount < 0 ? '-' : '+'}${Math.abs(sfAmount).toFixed(2)}
            </p>
          </div>

          {/* Similarity divider */}
          <div className="flex flex-col items-center justify-center gap-1 px-2">
            <ArrowLeftRight className="h-4 w-4 text-gray-300" />
            <span className="text-xs text-gray-400">
              {Math.round(review.similarityScore * 100)}% match
            </span>
          </div>

          {/* Candidate side */}
          <div className="flex-1 space-y-1">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Existing entry
            </p>
            {review.candidateTransactionId ? (
              <p className="text-xs text-gray-500">Transaction #{review.candidateTransactionId.slice(-8)}</p>
            ) : (
              <p className="text-xs text-gray-400 italic">No candidate</p>
            )}
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            size="sm"
            variant="default"
            onClick={() => handle('accept')}
            disabled={resolving !== null}
          >
            {resolving === 'accept' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Import as new
          </Button>
          {review.candidateTransactionId && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => handle('merge')}
              disabled={resolving !== null}
            >
              {resolving === 'merge' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
              Mark as duplicate
            </Button>
          )}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => handle('discard')}
            disabled={resolving !== null}
          >
            {resolving === 'discard' && <Loader2 className="mr-1 h-3 w-3 animate-spin" />}
            Discard
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export function ImportsPage() {
  const { data: connection } = useSimplefinStatus();
  const { data: unmapped = [], isLoading: loadingUnmapped } = useUnmappedAccounts();
  const { data: reviews = [], isLoading: loadingReviews } = usePendingReviews();
  const syncMutation = useSyncNow();
  const [syncResult, setSyncResult] = useState<{
    imported: number;
    skipped: number;
    pendingReviews: number;
    unmappedAccounts: number;
  } | null>(null);

  async function handleSync() {
    setSyncResult(null);
    const res = await syncMutation.mutateAsync();
    setSyncResult(res.data.data.result);
  }

  const isLoading = loadingUnmapped || loadingReviews;

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 space-y-4">
        {[1, 2].map((i) => (
          <div key={i} className="h-40 bg-gray-100 animate-pulse rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Imports</h1>
          <p className="text-sm text-gray-500 mt-1">
            Map bank accounts and review flagged transactions.
          </p>
        </div>
        {connection && (
          <Button
            variant="outline"
            onClick={handleSync}
            disabled={syncMutation.isPending}
          >
            {syncMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync Now
          </Button>
        )}
      </div>

      {syncResult && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            Sync complete — {syncResult.imported} imported, {syncResult.skipped} skipped
            {syncResult.pendingReviews > 0 && `, ${syncResult.pendingReviews} pending review(s)`}
            {syncResult.unmappedAccounts > 0 && `, ${syncResult.unmappedAccounts} unmapped account(s)`}
          </AlertDescription>
        </Alert>
      )}

      {/* ─── Account Mapping Required ───────────────────────────────────────── */}
      {unmapped.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Account Mapping Required</h2>
            <p className="text-sm text-gray-500">
              The following bank accounts were discovered. Choose how to handle each one before
              transactions can be imported.
            </p>
          </div>
          {unmapped.map((m) => (
            <AccountMappingCard key={m.id} mapping={m} />
          ))}
        </section>
      )}

      {/* ─── Pending Reviews ─────────────────────────────────────────────────── */}
      {reviews.length > 0 && (
        <section className="space-y-3">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Pending Reviews</h2>
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                These imported transactions closely match existing entries. Review each one to
                decide whether to import, mark as duplicate, or discard.
              </AlertDescription>
            </Alert>
          </div>
          {reviews.map((r) => (
            <ReviewCard key={r.id} review={r} />
          ))}
        </section>
      )}

      {/* ─── Nothing to do ───────────────────────────────────────────────────── */}
      {unmapped.length === 0 && reviews.length === 0 && (
        <div className="text-center py-16">
          <CheckCircle2 className="mx-auto h-12 w-12 text-green-400 mb-4" />
          <h3 className="text-lg font-semibold text-gray-900">All caught up</h3>
          <p className="text-sm text-gray-500 mt-1">
            {connection
              ? 'No pending account mappings or transaction reviews.'
              : 'Connect SimpleFIN in Settings → Integrations to start importing transactions.'}
          </p>
        </div>
      )}

      {/* ─── Sync History ─────────────────────────────────────────────────────── */}
      {connection && (
        <section className="space-y-2">
          <h2 className="text-lg font-semibold text-gray-900">Last Sync</h2>
          <Card>
            <CardContent className="pt-4">
              <div className="flex items-center gap-3">
                {connection.lastSyncStatus === 'success' ? (
                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                ) : connection.lastSyncStatus === 'error' ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                )}
                <div>
                  {connection.lastSyncAt ? (
                    <p className="text-sm text-gray-700">
                      {new Date(connection.lastSyncAt).toLocaleString()}
                    </p>
                  ) : (
                    <p className="text-sm text-gray-400">Never synced</p>
                  )}
                  {connection.lastSyncError && (
                    <p className="text-xs text-red-600 mt-0.5">{connection.lastSyncError}</p>
                  )}
                </div>
                {connection.lastSyncStatus && (
                  <Badge
                    variant={connection.lastSyncStatus === 'success' ? 'default' : 'destructive'}
                    className="ml-auto"
                  >
                    {connection.lastSyncStatus}
                  </Badge>
                )}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
