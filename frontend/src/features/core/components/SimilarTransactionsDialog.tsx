import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Sparkles } from 'lucide-react';
import { Button } from '@components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { useFormatters } from '@lib/i18n/useFormatters';
import {
  useSimilarTransactions,
  useBulkCategorizeTx,
  useCreateCategorizationRule,
} from '../hooks/useTransactions';
import type { Transaction } from '../types';

interface SimilarTransactionsDialogProps {
  /** The transaction that was just categorized */
  sourceTransaction: Transaction;
  /** Category that was applied */
  categoryId: string | null;
  /** Budget line that was applied */
  budgetLineId: string | null;
  /** Human-readable label for the category / budget line applied */
  appliedLabel: string;
  onClose: () => void;
}

export function SimilarTransactionsDialog({
  sourceTransaction,
  categoryId,
  budgetLineId,
  appliedLabel,
  onClose,
}: SimilarTransactionsDialogProps) {
  const { t } = useTranslation();
  const { currency: formatCurrency, date: formatDate } = useFormatters();
  const { data: similar = [], isLoading } = useSimilarTransactions(sourceTransaction.id);
  const bulkCategorize = useBulkCategorizeTx();
  const createRule = useCreateCategorizationRule();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saveAsRule, setSaveAsRule] = useState(false);
  const [done, setDone] = useState(false);

  // Pre-select uncategorized transactions
  useState(() => {
    if (similar.length > 0) {
      setSelected(
        new Set(
          similar
            .filter((tx) => !tx.categoryId && !tx.budgetLineId)
            .map((tx) => tx.id)
        )
      );
    }
  });

  function toggleAll(checked: boolean) {
    setSelected(checked ? new Set(similar.map((tx) => tx.id)) : new Set());
  }

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApply() {
    const ids = Array.from(selected);
    if (ids.length > 0) {
      await bulkCategorize.mutateAsync({ transactionIds: ids, categoryId, budgetLineId });
    }
    if (saveAsRule) {
      const payee = sourceTransaction.payee ?? sourceTransaction.description;
      if (payee) {
        await createRule.mutateAsync({ payee, categoryId, budgetLineId });
      }
    }
    setDone(true);
  }

  const isPending = bulkCategorize.isPending || createRule.isPending;

  // If no similar transactions found after loading, just confirm the rule save
  if (!isLoading && similar.length === 0 && !saveAsRule) {
    return (
      <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" />
              {t('similar.title')}
            </DialogTitle>
            <DialogDescription>
              {t('similar.noOthersFound', { label: appliedLabel })}
            </DialogDescription>
          </DialogHeader>
          <div className="pt-2 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer text-sm">
              <input
                type="checkbox"
                checked={saveAsRule}
                onChange={(e) => setSaveAsRule(e.target.checked)}
                className="h-4 w-4"
              />
              {t('similar.saveRule')}
            </label>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>{t('common.cancel')}</Button>
              {saveAsRule ? (
                <Button
                  isLoading={isPending}
                  onClick={() => void handleApply().then(onClose)}
                >
                  {t('similar.saveRuleBtn')}
                </Button>
              ) : (
                <Button onClick={onClose}>{t('common.close')}</Button>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (done) {
    onClose();
    return null;
  }

  return (
    <Dialog open onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {t('similar.title')}
          </DialogTitle>
          <DialogDescription>
            {t('similar.description', {
              payee: sourceTransaction.payee ?? sourceTransaction.description ?? '?',
              label: appliedLabel,
            })}
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-3 pt-1">
            {/* Select all */}
            <div className="flex items-center justify-between text-sm text-muted-foreground border-b border-border pb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selected.size === similar.length && similar.length > 0}
                  onChange={(e) => toggleAll(e.target.checked)}
                  className="h-4 w-4"
                />
                {t('similar.selectAll', { count: similar.length })}
              </label>
              <span className="text-xs">{t('similar.selectedCount', { count: selected.size })}</span>
            </div>

            {/* Transaction list */}
            <div className="max-h-64 overflow-y-auto space-y-1">
              {similar.map((tx) => (
                <label
                  key={tx.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-muted/50 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selected.has(tx.id)}
                    onChange={() => toggle(tx.id)}
                    className="h-4 w-4 shrink-0"
                  />
                  <span className="flex-1 text-sm text-foreground truncate">
                    {tx.payee ?? tx.description ?? t('transactions.noDescription')}
                  </span>
                  <span className="text-xs text-muted-foreground shrink-0">{formatDate(tx.date)}</span>
                  <span
                    className={`text-sm font-medium tabular-nums shrink-0 ${tx.amount < 0 ? 'text-destructive' : 'text-green-600'}`}
                  >
                    {tx.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(tx.amount))}
                  </span>
                </label>
              ))}
            </div>

            {/* Save as rule */}
            <label className="flex items-center gap-2 cursor-pointer text-sm pt-1 border-t border-border">
              <input
                type="checkbox"
                checked={saveAsRule}
                onChange={(e) => setSaveAsRule(e.target.checked)}
                className="h-4 w-4"
              />
              {t('similar.saveRule')}
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <Button variant="outline" onClick={onClose} disabled={isPending}>
                {t('common.cancel')}
              </Button>
              <Button
                isLoading={isPending}
                disabled={selected.size === 0 && !saveAsRule}
                onClick={() => void handleApply()}
              >
                {selected.size > 0
                  ? t('similar.applyToCount', { count: selected.size })
                  : t('similar.saveRuleBtn')}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
