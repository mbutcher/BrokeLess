import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAccounts } from '../hooks/useAccounts';
import { useCategories } from '../hooks/useCategories';
import { useCreateTransaction, useUpdateTransaction } from '../hooks/useTransactions';
import { getApiErrorMessage } from '@lib/api/errors';
import type { Transaction } from '../types';

const transactionSchema = z.object({
  accountId: z.string().uuid('Select an account'),
  amount: z.number().refine((n) => n !== 0, { message: 'Amount cannot be zero' }),
  description: z.string().max(1000).optional(),
  payee: z.string().max(512).optional(),
  notes: z.string().max(5000).optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'),
  categoryId: z.string().uuid().optional().or(z.literal('')),
  isCleared: z.boolean().optional(),
});

type TransactionFormData = z.infer<typeof transactionSchema>;

interface TransactionFormProps {
  transaction?: Transaction;
  defaultAccountId?: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function TransactionForm({
  transaction,
  defaultAccountId,
  onSuccess,
  onCancel,
}: TransactionFormProps) {
  const isEditing = Boolean(transaction);
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const createTx = useCreateTransaction();
  const updateTx = useUpdateTransaction();

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
          date: transaction.date.split('T')[0],
          categoryId: transaction.categoryId ?? '',
          isCleared: transaction.isCleared,
        }
      : {
          accountId: defaultAccountId ?? '',
          date: todayStr,
          isCleared: false,
        },
  });

  const error = createTx.error ?? updateTx.error;

  async function onSubmit(data: TransactionFormData) {
    const payload = {
      accountId: data.accountId,
      amount: data.amount,
      description: data.description || undefined,
      payee: data.payee || undefined,
      notes: data.notes || undefined,
      date: data.date,
      categoryId: data.categoryId || undefined,
    };

    if (isEditing && transaction) {
      await updateTx.mutateAsync({ id: transaction.id, data: { ...payload, isCleared: data.isCleared } });
    } else {
      await createTx.mutateAsync(payload);
    }
    onSuccess();
  }

  const activeCategories = categories.filter((c) => c.isActive);
  const topLevelIncome = activeCategories.filter((c) => c.isIncome && c.parentId === null);
  const topLevelExpense = activeCategories.filter((c) => !c.isIncome && c.parentId === null);
  const subcategoryMap = new Map<string, typeof categories>(
    activeCategories
      .filter((c) => c.parentId !== null)
      .reduce<[string, typeof categories][]>((acc, c) => {
        const key = c.parentId!;
        const existing = acc.find(([k]) => k === key);
        if (existing) existing[1].push(c);
        else acc.push([key, [c]]);
        return acc;
      }, [])
  );

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {getApiErrorMessage(error)}
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Account</label>
          <select {...register('accountId')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Select account</option>
            {accounts.filter((a) => a.isActive).map((a) => (
              <option key={a.id} value={a.id}>{a.name}</option>
            ))}
          </select>
          {errors.accountId && <p className="text-red-500 text-xs mt-1">{errors.accountId.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input type="date" {...register('date')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          {errors.date && <p className="text-red-500 text-xs mt-1">{errors.date.message}</p>}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount <span className="text-gray-400 text-xs">(negative = expense)</span>
          </label>
          <input
            type="number"
            step="0.01"
            {...register('amount', { valueAsNumber: true })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="-45.00"
          />
          {errors.amount && <p className="text-red-500 text-xs mt-1">{errors.amount.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select {...register('categoryId')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">Uncategorised</option>
            {topLevelIncome.length > 0 && (
              <>
                <option disabled>── Income ──</option>
                {topLevelIncome.map((parent) => {
                  const subs = subcategoryMap.get(parent.id) ?? [];
                  return subs.length > 0 ? (
                    <optgroup key={parent.id} label={parent.name}>
                      <option value={parent.id}>{parent.name} (general)</option>
                      {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </optgroup>
                  ) : (
                    <option key={parent.id} value={parent.id}>{parent.name}</option>
                  );
                })}
              </>
            )}
            {topLevelExpense.length > 0 && (
              <>
                <option disabled>── Expenses ──</option>
                {topLevelExpense.map((parent) => {
                  const subs = subcategoryMap.get(parent.id) ?? [];
                  return subs.length > 0 ? (
                    <optgroup key={parent.id} label={parent.name}>
                      <option value={parent.id}>{parent.name} (general)</option>
                      {subs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </optgroup>
                  ) : (
                    <option key={parent.id} value={parent.id}>{parent.name}</option>
                  );
                })}
              </>
            )}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Payee (optional)</label>
        <input {...register('payee')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Whole Foods" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Description (optional)</label>
        <input {...register('description')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea {...register('notes')} rows={2} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
      </div>

      {isEditing && (
        <label className="flex items-center gap-2 text-sm text-gray-700">
          <input type="checkbox" {...register('isCleared')} className="rounded" />
          Mark as cleared
        </label>
      )}

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Saving...' : isEditing ? 'Update' : 'Add Transaction'}
        </button>
      </div>
    </form>
  );
}
