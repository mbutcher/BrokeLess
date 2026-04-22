import { useState, useRef, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '../hooks/useAccounts';
import { useCreateTransaction, useUpdateTransaction, useAllTags } from '../hooks/useTransactions';
import type { Transaction } from '../types';

const transactionSchema = z.object({
  accountId: z.string().uuid('Select an account'),
  amount: z.number().refine((n) => n !== 0, { message: 'Amount cannot be zero' }),
  description: z.string().max(1000).optional(),
  payee: z.string().max(512).optional(),
  notes: z.string().max(5000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  isCleared: z.boolean().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  transaction?: Transaction;
  defaultAccountId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export function TransactionForm({
  transaction,
  defaultAccountId,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(transaction);
  const { data: accounts = [] } = useAccounts();
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();
  const { data: allTags = [] } = useAllTags();

  const [tags, setTags] = useState<string[]>(transaction?.tags ?? []);
  const [tagInput, setTagInput] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const tagInputRef = useRef<HTMLInputElement>(null);

  const todayStr = new Date().toISOString().split('T')[0];

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<TransactionFormData>({
    resolver: zodResolver(transactionSchema),
    defaultValues: transaction
      ? {
          accountId: transaction.accountId,
          amount: transaction.amount,
          description: transaction.description ?? '',
          payee: transaction.payee ?? '',
          notes: transaction.notes ?? '',
          date: transaction.date.split('T')[0] ?? '',
          isCleared: transaction.isCleared,
        }
      : {
          accountId: defaultAccountId ?? '',
          date: todayStr,
          isCleared: false,
        },
  });

  const suggestions = useMemo(
    () =>
      tagInput.trim()
        ? allTags.filter(
            (tag) => tag.startsWith(tagInput.trim().toLowerCase()) && !tags.includes(tag)
          )
        : [],
    [tagInput, allTags, tags]
  );

  function addTag(raw: string) {
    const normalized = raw.trim().toLowerCase();
    if (normalized && !tags.includes(normalized)) {
      setTags((prev) => [...prev, normalized]);
    }
    setTagInput('');
    setShowSuggestions(false);
  }

  function removeTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleTagKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(tagInput);
    } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
      removeTag(tags[tags.length - 1]!);
    }
  }

  // Close suggestions on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (tagInputRef.current && !tagInputRef.current.closest('.tag-input-wrapper')?.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  async function onSubmit(data: TransactionFormData) {
    const payload = {
      accountId: data.accountId,
      amount: data.amount,
      description: data.description || undefined,
      payee: data.payee || undefined,
      notes: data.notes || undefined,
      date: data.date,
      tags,
    };

    if (isEditing && transaction) {
      await updateTx.mutateAsync({ id: transaction.id, data: { ...payload, isCleared: data.isCleared } });
    } else {
      await createTx.mutateAsync(payload);
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Account</label>
          <select {...register('accountId')} className={inputClass}>
            <option value="">{t('transactions.selectAccount')}</option>
            {accounts.filter((a) => a.isActive).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {errors.accountId && <p className="text-destructive text-xs mt-1">{errors.accountId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Date</label>
          <input type="date" {...register('date')} className={inputClass} />
          {errors.date && <p className="text-destructive text-xs mt-1">{errors.date.message}</p>}
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Amount <span className="text-muted-foreground text-xs">(negative = expense)</span>
        </label>
        <input
          type="number"
          step="0.01"
          {...register('amount', { valueAsNumber: true })}
          className={inputClass}
          placeholder="-45.00"
        />
        {errors.amount && <p className="text-destructive text-xs mt-1">{errors.amount.message}</p>}
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Payee (optional)</label>
        <input {...register('payee')} className={inputClass} placeholder="e.g. Whole Foods" />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Description (optional)</label>
        <input {...register('description')} className={inputClass} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">Notes (optional)</label>
        <textarea {...register('notes')} rows={2} className={`${inputClass} resize-none`} />
      </div>

      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          Tags <span className="text-muted-foreground text-xs">(optional — press Enter or comma to add)</span>
        </label>
        <div className="tag-input-wrapper relative">
          <div className="flex flex-wrap gap-1.5 items-center min-h-[38px] border border-border rounded-lg px-2 py-1.5 focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent bg-background">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 text-xs bg-primary/10 text-primary rounded px-1.5 py-0.5"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="text-primary/70 hover:text-primary leading-none"
                  aria-label={`Remove tag ${tag}`}
                >
                  ×
                </button>
              </span>
            ))}
            <input
              ref={tagInputRef}
              type="text"
              value={tagInput}
              onChange={(e) => {
                setTagInput(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={handleTagKeyDown}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => {
                // Delay so suggestion clicks register first
                setTimeout(() => setShowSuggestions(false), 150);
              }}
              className="flex-1 min-w-[80px] text-sm outline-none bg-transparent text-foreground placeholder:text-muted-foreground"
              placeholder={tags.length === 0 ? t('transactions.tagPlaceholder') : ''}
            />
          </div>
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 w-full mt-1 bg-card border border-border rounded-lg shadow-md max-h-40 overflow-y-auto">
              {suggestions.map((s) => (
                <li key={s}>
                  <button
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted text-foreground"
                    onMouseDown={(e) => {
                      e.preventDefault();
                      addTag(s);
                    }}
                  >
                    #{s}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {isEditing && (
        <label className="flex items-center gap-2 text-sm text-foreground">
          <input type="checkbox" {...register('isCleared')} className="rounded" />
          {t('transactions.markCleared')}
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-border rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-muted">
          {t('common.cancel')}
        </button>
        <button type="submit" disabled={isSubmitting} className="flex-1 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50">
          {isSubmitting ? t('common.saving') : isEditing ? t('transactions.updateTransaction') : t('transactions.addTransaction')}
        </button>
      </div>
    </form>
  );
}
