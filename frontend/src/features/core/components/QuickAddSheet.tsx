import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { Button } from '@components/ui/button';
import { Input } from '@components/ui/input';
import { Label } from '@components/ui/label';
import { useAccounts } from '../hooks/useAccounts';
import { useCreateTransaction } from '../hooks/useTransactions';
import type { CreateTransactionInput } from '../types';

interface Props {
  open: boolean;
  onClose: () => void;
}

export function QuickAddSheet({ open, onClose }: Props) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const { mutate: createTx, isPending } = useCreateTransaction();

  const activeAccounts = accounts.filter((a) => a.isActive);

  const today = new Date().toISOString().slice(0, 10);

  const [amount, setAmount] = useState('');
  const [payee, setPayee] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(today);

  // Sync accountId once accounts load (avoids stale empty string on initial render)
  useEffect(() => {
    if (accountId === '' && activeAccounts.length > 0) {
      setAccountId(activeAccounts[0]!.id);
    }
  }, [activeAccounts, accountId]);

  function reset() {
    setAmount('');
    setPayee('');
    setAccountId(activeAccounts[0]?.id ?? '');
    setDate(today);
  }

  function handleClose() {
    reset();
    onClose();
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || !accountId) return;

    const input: CreateTransactionInput = {
      accountId,
      amount: -Math.abs(parsed), // expenses are negative
      payee: payee.trim() || undefined,
      date,
    };

    createTx(input, {
      onSuccess: () => {
        handleClose();
      },
    });
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{t('quickAdd.title')}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Amount */}
          <div className="space-y-1">
            <Label htmlFor="qa-amount">{t('quickAdd.amount')}</Label>
            <Input
              id="qa-amount"
              type="number"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
              autoFocus
            />
          </div>

          {/* Payee */}
          <div className="space-y-1">
            <Label htmlFor="qa-payee">{t('quickAdd.payee')}</Label>
            <Input
              id="qa-payee"
              type="text"
              placeholder={t('quickAdd.payeePlaceholder')}
              value={payee}
              onChange={(e) => setPayee(e.target.value)}
            />
          </div>

          {/* Account */}
          <div className="space-y-1">
            <Label htmlFor="qa-account">{t('quickAdd.account')}</Label>
            <select
              id="qa-account"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
              className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {activeAccounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>

          {/* Date */}
          <div className="space-y-1">
            <Label htmlFor="qa-date">{t('quickAdd.date')}</Label>
            <Input
              id="qa-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div className="flex justify-end gap-3 pt-1">
            <Button type="button" variant="outline" onClick={handleClose}>
              {t('common.cancel')}
            </Button>
            <Button type="submit" disabled={isPending || !amount || !accountId}>
              {isPending ? t('common.saving') : t('quickAdd.add')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
