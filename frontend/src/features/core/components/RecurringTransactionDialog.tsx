import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import {
  useCreateRecurringTransaction,
  useUpdateRecurringTransaction,
} from '../hooks/useRecurringTransactions';
import type { RecurringFrequency, RecurringTransaction } from '../types';

const FREQUENCIES: { value: RecurringFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'semi_monthly', label: 'Twice monthly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'every_n_days', label: 'Every N days' },
  { value: 'annually', label: 'Annually' },
];

const schema = z
  .object({
    accountId: z.string().uuid('Select an account'),
    amount: z.number().finite('Amount is required'),
    payee: z.string().max(100).optional(),
    description: z.string().max(255).optional(),
    notes: z.string().max(500).optional(),
    categoryId: z.preprocess((v) => (v === '' ? null : v), z.string().uuid().optional().nullable()),
    frequency: z.enum(['weekly', 'biweekly', 'semi_monthly', 'monthly', 'every_n_days', 'annually']),
    frequencyInterval: z.number().int().min(1).optional().nullable(),
    anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date required'),
    endDate: z.preprocess(
      (v) => (v === '' ? null : v),
      z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().nullable(),
    ),
  })
  .refine(
    (v) =>
      v.frequency !== 'every_n_days' || (v.frequencyInterval != null && v.frequencyInterval >= 1),
    { message: 'Interval required for "every N days"', path: ['frequencyInterval'] },
  );

type FormValues = z.infer<typeof schema>;

interface RecurringTransactionDialogProps {
  open: boolean;
  recurring?: RecurringTransaction;
  onClose: () => void;
}

export function RecurringTransactionDialog({
  open,
  recurring,
  onClose,
}: RecurringTransactionDialogProps) {
  const { data: accounts = [] } = useAccounts();
  const { data: allCategories = [] } = useCategories();
  const createRecurring = useCreateRecurringTransaction();
  const updateRecurring = useUpdateRecurringTransaction();

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      accountId: recurring?.accountId ?? '',
      amount: recurring?.amount ?? 0,
      payee: recurring?.payee ?? '',
      description: recurring?.description ?? '',
      notes: recurring?.notes ?? '',
      categoryId: recurring?.categoryId ?? null,
      frequency: (recurring?.frequency as RecurringFrequency) ?? 'monthly',
      frequencyInterval: recurring?.frequencyInterval ?? null,
      anchorDate: recurring?.anchorDate ?? new Date().toISOString().substring(0, 10),
      endDate: recurring?.endDate ?? null,
    },
  });

  const watchedFrequency = watch('frequency');

  useEffect(() => {
    if (open) {
      reset({
        accountId: recurring?.accountId ?? '',
        amount: recurring?.amount ?? 0,
        payee: recurring?.payee ?? '',
        description: recurring?.description ?? '',
        notes: recurring?.notes ?? '',
        categoryId: recurring?.categoryId ?? null,
        frequency: (recurring?.frequency as RecurringFrequency) ?? 'monthly',
        frequencyInterval: recurring?.frequencyInterval ?? null,
        anchorDate: recurring?.anchorDate ?? new Date().toISOString().substring(0, 10),
        endDate: recurring?.endDate ?? null,
      });
    }
  }, [open, recurring, reset]);

  const onSubmit = (values: FormValues) => {
    const data = {
      accountId: values.accountId,
      amount: values.amount,
      payee: values.payee || undefined,
      description: values.description || undefined,
      notes: values.notes || undefined,
      categoryId: values.categoryId ?? undefined,
      frequency: values.frequency,
      frequencyInterval:
        values.frequency === 'every_n_days' ? (values.frequencyInterval ?? undefined) : undefined,
      anchorDate: values.anchorDate,
      endDate: values.endDate ?? undefined,
    };

    if (recurring) {
      updateRecurring.mutate(
        { id: recurring.id, data },
        { onSuccess: () => { reset(); onClose(); } },
      );
    } else {
      createRecurring.mutate(data, {
        onSuccess: () => { reset(); onClose(); },
      });
    }
  };

  const isPending = createRecurring.isPending || updateRecurring.isPending;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">
            {recurring ? 'Edit Recurring Transaction' : 'New Recurring Transaction'}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Account */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
            <select
              {...register('accountId')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
            {errors.accountId && (
              <p className="text-xs text-red-600 mt-1">{errors.accountId.message}</p>
            )}
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Amount{' '}
              <span className="text-gray-400 font-normal">(negative = expense)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">
                $
              </span>
              <input
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {errors.amount && (
              <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>
            )}
          </div>

          {/* Payee + Description */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payee <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                {...register('payee')}
                placeholder="e.g. Grocery Store"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                {...register('description')}
                placeholder="e.g. Weekly groceries"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Category <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <select
              {...register('categoryId')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">No category</option>
              {allCategories
                .filter((c) => c.isActive)
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
            </select>
          </div>

          {/* Frequency + Interval */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
              <select
                {...register('frequency')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FREQUENCIES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {watchedFrequency === 'every_n_days' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Every N days
                </label>
                <input
                  type="number"
                  min={1}
                  {...register('frequencyInterval', { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.frequencyInterval && (
                  <p className="text-xs text-red-600 mt-1">{errors.frequencyInterval.message}</p>
                )}
              </div>
            )}
          </div>

          {/* Anchor Date + End Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Anchor date</label>
              <input
                type="date"
                {...register('anchorDate')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400 mt-1">Date of first/next known occurrence.</p>
              {errors.anchorDate && (
                <p className="text-xs text-red-600 mt-1">{errors.anchorDate.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                End date <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="date"
                {...register('endDate')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              {...register('notes')}
              rows={2}
              placeholder="Any notes about this recurring transaction"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <Button type="submit" isLoading={isPending} className="flex-1">
              {recurring ? 'Save Changes' : 'Create'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>

          {(createRecurring.isError || updateRecurring.isError) && (
            <p className="text-xs text-red-600">Failed to save. Please try again.</p>
          )}
        </form>
      </div>
    </div>
  );
}
