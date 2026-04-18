import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { X } from 'lucide-react';
import { Button } from '@components/ui/button';
import { useCreateBudgetLine } from '../hooks/useBudgetLines';
import { useCategories } from '../hooks/useCategories';
import { useAccounts } from '../hooks/useAccounts';
import type {
  BudgetLineFrequency,
  BudgetLineClassification,
  BudgetLineFlexibility,
} from '../types';

const FREQUENCIES: { value: BudgetLineFrequency; label: string }[] = [
  { value: 'weekly', label: 'Weekly' },
  { value: 'biweekly', label: 'Biweekly' },
  { value: 'semi_monthly', label: '1st & 15th (semi-monthly)' },
  { value: 'twice_monthly', label: 'Twice monthly (custom days)' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'every_n_days', label: 'Every N days' },
  { value: 'annually', label: 'Annually' },
  { value: 'one_time', label: 'One time' },
];

/** Day-of-month picker options. 31 = "last day of month" */
const DAY_OPTIONS = [
  ...Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
  { value: 29, label: '29' },
  { value: 30, label: '30' },
  { value: 31, label: 'Last day of month' },
];

const schema = z
  .object({
    name: z.string().min(1, 'Name is required').max(100),
    classification: z.enum(['income', 'expense']),
    flexibility: z.enum(['fixed', 'flexible']),
    categoryId: z.string().uuid('Category is required'),
    subcategoryId: z.preprocess((v) => (v === '' ? null : v), z.string().uuid().optional().nullable()),
    accountId: z.preprocess((v) => (v === '' ? null : v), z.string().uuid().optional().nullable()),
    amount: z.number().positive('Amount must be positive').finite(),
    frequency: z.enum([
      'weekly', 'biweekly', 'semi_monthly', 'twice_monthly', 'monthly', 'every_n_days', 'annually', 'one_time',
    ]),
    frequencyInterval: z.number().int().min(1).optional().nullable(),
    dayOfMonth1: z.number().int().min(1).max(31).optional().nullable(),
    dayOfMonth2: z.number().int().min(1).max(31).optional().nullable(),
    anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date required'),
    isPayPeriodAnchor: z.boolean().default(false),
    notes: z.string().max(255).optional().nullable(),
  })
  .refine(
    (v) => v.frequency !== 'every_n_days' || (v.frequencyInterval != null && v.frequencyInterval >= 1),
    { message: 'Interval required for "every N days"', path: ['frequencyInterval'] }
  )
  .refine(
    (v) => v.frequency !== 'twice_monthly' || v.dayOfMonth1 != null,
    { message: 'First day of month is required', path: ['dayOfMonth1'] }
  )
  .refine(
    (v) => v.frequency !== 'twice_monthly' || v.dayOfMonth2 != null,
    { message: 'Second day of month is required', path: ['dayOfMonth2'] }
  )
  .refine(
    (v) =>
      v.frequency !== 'twice_monthly' ||
      v.dayOfMonth1 == null ||
      v.dayOfMonth2 == null ||
      v.dayOfMonth1 < v.dayOfMonth2,
    { message: 'First day must be before second day', path: ['dayOfMonth2'] }
  );

type FormValues = z.infer<typeof schema>;

interface AddBudgetLineDialogProps {
  open: boolean;
  defaultCategoryId?: string;
  defaultClassification?: BudgetLineClassification;
  defaultName?: string;
  defaultAmount?: number;
  defaultAnchorDate?: string;
  defaultAccountId?: string;
  defaultNotes?: string;
  onClose: () => void;
}

export function AddBudgetLineDialog({
  open,
  defaultCategoryId,
  defaultClassification,
  defaultName,
  defaultAmount,
  defaultAnchorDate,
  defaultAccountId,
  defaultNotes,
  onClose,
}: AddBudgetLineDialogProps) {
  const createLine = useCreateBudgetLine();
  const { data: allCategories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();

  const topLevel = allCategories.filter((c) => c.parentId === null && c.isActive);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: defaultName ?? '',
      classification: defaultClassification ?? 'expense',
      flexibility: 'fixed',
      categoryId: defaultCategoryId ?? '',
      subcategoryId: null,
      accountId: defaultAccountId ?? null,
      amount: defaultAmount ?? 0,
      frequency: 'monthly',
      frequencyInterval: null,
      dayOfMonth1: null,
      dayOfMonth2: null,
      anchorDate: defaultAnchorDate ?? new Date().toISOString().substring(0, 10),
      isPayPeriodAnchor: false,
      notes: defaultNotes ?? null,
    },
  });

  // Re-seed the form each time the dialog opens so that pre-fill props are applied.
  useEffect(() => {
    if (open) {
      reset({
        name: defaultName ?? '',
        classification: defaultClassification ?? 'expense',
        flexibility: 'fixed',
        categoryId: defaultCategoryId ?? '',
        subcategoryId: null,
        accountId: defaultAccountId ?? null,
        amount: defaultAmount ?? 0,
        frequency: 'monthly',
        frequencyInterval: null,
        dayOfMonth1: null,
        dayOfMonth2: null,
        anchorDate: defaultAnchorDate ?? new Date().toISOString().substring(0, 10),
        isPayPeriodAnchor: false,
        notes: defaultNotes ?? null,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const watchedCategoryId = watch('categoryId');
  const watchedClassification = watch('classification');
  const watchedFlexibility = watch('flexibility');
  const watchedFrequency = watch('frequency');

  const subcategories = allCategories.filter(
    (c) => c.parentId === watchedCategoryId && c.isActive
  );

  // Reset subcategoryId when category changes
  useEffect(() => {
    setValue('subcategoryId', null);
  }, [watchedCategoryId, setValue]);

  // Reset frequency-specific fields when frequency changes
  useEffect(() => {
    if (watchedFrequency !== 'every_n_days') setValue('frequencyInterval', null);
    if (watchedFrequency !== 'twice_monthly') {
      setValue('dayOfMonth1', null);
      setValue('dayOfMonth2', null);
    }
  }, [watchedFrequency, setValue]);

  const onSubmit = (values: FormValues) => {
    createLine.mutate(
      {
        name: values.name,
        classification: values.classification as BudgetLineClassification,
        flexibility: values.flexibility as BudgetLineFlexibility,
        categoryId: values.categoryId,
        subcategoryId: values.subcategoryId ?? null,
        accountId: values.accountId ?? null,
        amount: values.amount,
        frequency: values.frequency as BudgetLineFrequency,
        frequencyInterval: values.frequency === 'every_n_days' ? (values.frequencyInterval ?? null) : null,
        dayOfMonth1: values.frequency === 'twice_monthly' ? (values.dayOfMonth1 ?? null) : null,
        dayOfMonth2: values.frequency === 'twice_monthly' ? (values.dayOfMonth2 ?? null) : null,
        anchorDate: values.anchorDate,
        isPayPeriodAnchor: values.isPayPeriodAnchor,
        notes: values.notes ?? null,
      },
      {
        onSuccess: () => {
          reset();
          onClose();
        },
      }
    );
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Add Budget Line</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="px-6 py-4 space-y-4">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
            <input
              {...register('name')}
              placeholder="e.g. Rent, Groceries, My Salary"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {errors.name && <p className="text-xs text-red-600 mt-1">{errors.name.message}</p>}
          </div>

          {/* Classification + Flexibility */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                {...register('classification')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="expense">Expense</option>
                <option value="income">Income</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Flexibility</label>
              <select
                {...register('flexibility')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fixed">Fixed</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>
          </div>

          {/* Category + Subcategory */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                {...register('categoryId')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select category</option>
                {topLevel.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              {errors.categoryId && (
                <p className="text-xs text-red-600 mt-1">{errors.categoryId.message}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Subcategory <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                {...register('subcategoryId')}
                disabled={subcategories.length === 0}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">None</option>
                {subcategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Account (expense + fixed only) */}
          {watchedClassification === 'expense' && watchedFlexibility === 'fixed' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                {...register('accountId')}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {accounts.filter((a) => a.isActive).map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                Which account this expense is drawn from. Used for overdraft warnings.
              </p>
            </div>
          )}

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Amount per occurrence</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                {...register('amount', { valueAsNumber: true })}
                className="w-full pl-7 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            {errors.amount && <p className="text-xs text-red-600 mt-1">{errors.amount.message}</p>}
          </div>

          {/* Frequency */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Frequency</label>
            <select
              {...register('frequency')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {FREQUENCIES.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>

          {/* Every N days interval */}
          {watchedFrequency === 'every_n_days' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Every N days</label>
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

          {/* Twice-monthly day pickers */}
          {watchedFrequency === 'twice_monthly' && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">First day of month</label>
                <select
                  {...register('dayOfMonth1', { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select day</option>
                  {DAY_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {errors.dayOfMonth1 && (
                  <p className="text-xs text-red-600 mt-1">{errors.dayOfMonth1.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Second day of month</label>
                <select
                  {...register('dayOfMonth2', { valueAsNumber: true })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select day</option>
                  {DAY_OPTIONS.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                {errors.dayOfMonth2 && (
                  <p className="text-xs text-red-600 mt-1">{errors.dayOfMonth2.message}</p>
                )}
              </div>
            </div>
          )}

          {/* Anchor date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              {watchedFrequency === 'twice_monthly' ? 'Starting from (anchor date)' : 'Anchor date'}
            </label>
            <input
              type="date"
              {...register('anchorDate')}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              {watchedFrequency === 'twice_monthly'
                ? 'The first occurrence on or after this date will be used as the starting point.'
                : 'The date of the first/next known occurrence. Occurrences are computed from this date.'}
            </p>
            {errors.anchorDate && (
              <p className="text-xs text-red-600 mt-1">{errors.anchorDate.message}</p>
            )}
          </div>

          {/* Pay period anchor (income only) */}
          {watchedClassification === 'income' && (
            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                {...register('isPayPeriodAnchor')}
                className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              />
              Use this income line to define my pay period
            </label>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              {...register('notes')}
              placeholder="Any notes about this budget line"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Submit */}
          <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
            <Button type="submit" isLoading={createLine.isPending} className="flex-1">
              Add Budget Line
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>

          {createLine.isError && (
            <p className="text-xs text-red-600">
              Failed to save. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}
