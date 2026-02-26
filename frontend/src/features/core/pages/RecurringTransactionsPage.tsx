import { useState } from 'react';
import { Plus, Pencil, SkipForward, Pause, Play, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@components/ui/button';
import { useFormatters } from '@lib/i18n/useFormatters';
import { useAccounts } from '../hooks/useAccounts';
import {
  useRecurringTransactions,
  useUpdateRecurringTransaction,
  useDeleteRecurringTransaction,
  useSkipRecurringTransaction,
} from '../hooks/useRecurringTransactions';
import { RecurringTransactionDialog } from '../components/RecurringTransactionDialog';
import type { RecurringTransaction, RecurringFrequency } from '../types';

// ─── RecurringTransactionsPage ────────────────────────────────────────────────

export function RecurringTransactionsPage() {
  const { t } = useTranslation();
  const fmt = useFormatters();
  const { data: records = [], isLoading } = useRecurringTransactions();
  const { data: accounts = [] } = useAccounts();
  const updateRecurring = useUpdateRecurringTransaction();
  const deleteRecurring = useDeleteRecurringTransaction();
  const skipRecurring = useSkipRecurringTransaction();

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<RecurringTransaction | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [confirmSkip, setConfirmSkip] = useState<string | null>(null);

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? '—';

  const active = records.filter((r) => r.isActive);
  const paused = records.filter((r) => !r.isActive);

  function openCreate() {
    setEditing(undefined);
    setDialogOpen(true);
  }

  function openEdit(r: RecurringTransaction) {
    setEditing(r);
    setDialogOpen(true);
  }

  function handleToggleActive(r: RecurringTransaction) {
    updateRecurring.mutate({ id: r.id, data: { isActive: !r.isActive } });
  }

  function handleDelete(id: string) {
    deleteRecurring.mutate(id);
    setConfirmDelete(null);
  }

  function handleSkip(id: string) {
    skipRecurring.mutate(id);
    setConfirmSkip(null);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{t('recurring.title')}</h1>
          <p className="text-sm text-gray-500 mt-0.5">{t('recurring.subtitle')}</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          {t('recurring.add')}
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : records.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl">
          <p className="text-gray-400 text-sm">{t('recurring.empty')}</p>
          <button
            onClick={openCreate}
            className="mt-2 text-sm text-blue-600 hover:underline"
          >
            {t('recurring.createFirst')}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active */}
          {active.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {t('recurring.active')} ({active.length})
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t('recurring.payee')}
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden sm:table-cell">
                        {t('recurring.account')}
                      </th>
                      <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        {t('recurring.amount')}
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                        {t('recurring.frequency')}
                      </th>
                      <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide hidden md:table-cell">
                        {t('recurring.nextDue')}
                      </th>
                      <th className="px-4 py-3" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {active.map((r) => (
                      <RecurringRow
                        key={r.id}
                        record={r}
                        accountName={accountName(r.accountId)}
                        fmt={fmt}
                        onEdit={() => openEdit(r)}
                        onToggle={() => handleToggleActive(r)}
                        onSkip={() => setConfirmSkip(r.id)}
                        onDelete={() => setConfirmDelete(r.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {/* Paused */}
          {paused.length > 0 && (
            <section>
              <h2 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                {t('recurring.paused')} ({paused.length})
              </h2>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden opacity-70">
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {paused.map((r) => (
                      <RecurringRow
                        key={r.id}
                        record={r}
                        accountName={accountName(r.accountId)}
                        fmt={fmt}
                        onEdit={() => openEdit(r)}
                        onToggle={() => handleToggleActive(r)}
                        onSkip={() => setConfirmSkip(r.id)}
                        onDelete={() => setConfirmDelete(r.id)}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      )}

      {/* Create / Edit dialog */}
      <RecurringTransactionDialog
        open={dialogOpen}
        recurring={editing}
        onClose={() => setDialogOpen(false)}
      />

      {/* Skip confirmation */}
      {confirmSkip && (
        <ConfirmModal
          title={t('recurring.skipTitle')}
          message={t('recurring.skipDesc')}
          confirmLabel={t('recurring.skip')}
          onConfirm={() => handleSkip(confirmSkip)}
          onCancel={() => setConfirmSkip(null)}
          isPending={skipRecurring.isPending}
        />
      )}

      {/* Delete confirmation */}
      {confirmDelete && (
        <ConfirmModal
          title={t('recurring.deleteTitle')}
          message={t('recurring.deleteDesc')}
          confirmLabel={t('recurring.delete')}
          confirmVariant="destructive"
          onConfirm={() => handleDelete(confirmDelete)}
          onCancel={() => setConfirmDelete(null)}
          isPending={deleteRecurring.isPending}
        />
      )}
    </div>
  );
}

// ─── RecurringRow ─────────────────────────────────────────────────────────────

interface RecurringRowProps {
  record: RecurringTransaction;
  accountName: string;
  fmt: ReturnType<typeof useFormatters>;
  onEdit: () => void;
  onToggle: () => void;
  onSkip: () => void;
  onDelete: () => void;
}

function RecurringRow({
  record,
  accountName,
  fmt,
  onEdit,
  onToggle,
  onSkip,
  onDelete,
}: RecurringRowProps) {
  const { t } = useTranslation();
  const isExpense = record.amount < 0;

  function frequencyLabel(freq: RecurringFrequency, interval: number | null): string {
    switch (freq) {
      case 'weekly': return t('recurring.weekly');
      case 'biweekly': return t('recurring.biweekly');
      case 'semi_monthly': return t('recurring.twiceMonthly');
      case 'monthly': return t('recurring.monthly');
      case 'annually': return t('recurring.annually');
      case 'every_n_days':
        return interval
          ? t('recurring.everyNDays', { count: interval })
          : t('recurring.everyNDaysDefault');
    }
  }

  return (
    <tr className="hover:bg-gray-50/50 transition-colors">
      <td className="px-4 py-3">
        <p className="font-medium text-gray-900 truncate max-w-[200px]">
          {record.payee ?? record.description ?? <span className="text-gray-400 italic">—</span>}
        </p>
        {record.payee && record.description && (
          <p className="text-xs text-gray-400 truncate max-w-[200px]">{record.description}</p>
        )}
      </td>
      <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">{accountName}</td>
      <td className="px-4 py-3 text-right">
        <span className={isExpense ? 'text-red-600 font-medium' : 'text-green-600 font-medium'}>
          {isExpense ? '−' : '+'}{fmt.currency(Math.abs(record.amount))}
        </span>
      </td>
      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
        {frequencyLabel(record.frequency, record.frequencyInterval)}
      </td>
      <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
        {fmt.date(record.nextDueDate)}
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center justify-end gap-1">
          <ActionButton
            title={t('recurring.edit')}
            onClick={onEdit}
            icon={<Pencil className="h-3.5 w-3.5" />}
          />
          {record.isActive && (
            <ActionButton
              title={t('recurring.skip')}
              onClick={onSkip}
              icon={<SkipForward className="h-3.5 w-3.5" />}
            />
          )}
          <ActionButton
            title={record.isActive ? t('recurring.pause') : t('recurring.resume')}
            onClick={onToggle}
            icon={record.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          />
          <ActionButton
            title={t('recurring.delete')}
            onClick={onDelete}
            icon={<Trash2 className="h-3.5 w-3.5" />}
            className="text-red-400 hover:text-red-600 hover:bg-red-50"
          />
        </div>
      </td>
    </tr>
  );
}

function ActionButton({
  title,
  onClick,
  icon,
  className = 'text-gray-400 hover:text-gray-700 hover:bg-gray-100',
}: {
  title: string;
  onClick: () => void;
  icon: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`p-1.5 rounded-md transition-colors ${className}`}
    >
      {icon}
    </button>
  );
}

// ─── ConfirmModal ─────────────────────────────────────────────────────────────

function ConfirmModal({
  title,
  message,
  confirmLabel,
  confirmVariant = 'default',
  onConfirm,
  onCancel,
  isPending,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  confirmVariant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onCancel} />
      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 space-y-4">
        <h3 className="text-base font-semibold text-gray-900">{title}</h3>
        <p className="text-sm text-gray-600">{message}</p>
        <div className="flex gap-3 pt-1">
          <Button
            onClick={onConfirm}
            isLoading={isPending}
            variant={confirmVariant === 'destructive' ? 'destructive' : 'default'}
            className="flex-1"
          >
            {confirmLabel}
          </Button>
          <Button variant="outline" onClick={onCancel} className="flex-1">
            {t('recurring.cancel')}
          </Button>
        </div>
      </div>
    </div>
  );
}
