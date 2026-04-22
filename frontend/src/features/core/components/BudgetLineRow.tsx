import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Star, ChevronDown, ChevronUp, Trash2 } from 'lucide-react';
import { Button } from '@components/ui/button';
import { FrequencyBadge } from './FrequencyBadge';
import { FlexibilityBadge } from './FlexibilityBadge';
import { useUpdateBudgetLine, useDeleteBudgetLine } from '../hooks/useBudgetLines';
import { useFormatters } from '@lib/i18n/useFormatters';
import type { BudgetViewLine, BudgetLineFrequency, BudgetLineFlexibility, Category } from '../types';

interface BudgetLineRowProps {
  viewLine: BudgetViewLine;
  subcategoryName?: string;
  allCategories: Category[];
}

const FREQUENCIES: BudgetLineFrequency[] = [
  'weekly', 'biweekly', 'semi_monthly', 'twice_monthly', 'monthly', 'every_n_days', 'annually', 'one_time',
];

/** Day-of-month picker options. 31 = "last day of month" */
const DAY_OPTIONS = [
  ...Array.from({ length: 28 }, (_, i) => ({ value: i + 1, label: String(i + 1) })),
  { value: 29, label: '29' },
  { value: 30, label: '30' },
  { value: 31, label: 'Last day of month' },
];

const editSchema = z
  .object({
    name: z.string().min(1).max(100),
    amount: z.number().positive(),
    flexibility: z.enum(['fixed', 'flexible']),
    frequency: z.enum(['weekly', 'biweekly', 'semi_monthly', 'twice_monthly', 'monthly', 'every_n_days', 'annually', 'one_time']),
    frequencyInterval: z.number().int().min(1).optional().nullable(),
    dayOfMonth1: z.number().int().min(1).max(31).optional().nullable(),
    dayOfMonth2: z.number().int().min(1).max(31).optional().nullable(),
    anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    notes: z.string().max(255).optional().nullable(),
  })
  .refine(
    (v) => v.frequency !== 'twice_monthly' || v.dayOfMonth1 != null,
    { message: 'First day required', path: ['dayOfMonth1'] }
  )
  .refine(
    (v) => v.frequency !== 'twice_monthly' || v.dayOfMonth2 != null,
    { message: 'Second day required', path: ['dayOfMonth2'] }
  )
  .refine(
    (v) =>
      v.frequency !== 'twice_monthly' ||
      v.dayOfMonth1 == null ||
      v.dayOfMonth2 == null ||
      v.dayOfMonth1 < v.dayOfMonth2,
    { message: 'First day must be before second day', path: ['dayOfMonth2'] }
  );

type EditFormValues = z.infer<typeof editSchema>;

export function BudgetLineRow({ viewLine, subcategoryName, allCategories }: BudgetLineRowProps) {
  const { budgetLine: line, proratedAmount, actualAmount, variance } = viewLine;
  const [expanded, setExpanded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editCategoryId, setEditCategoryId] = useState(line.categoryId);
  const [editSubcategoryId, setEditSubcategoryId] = useState<string | null>(line.subcategoryId ?? null);
  const { currency: formatCurrency } = useFormatters();
  const navigate = useNavigate();
  const updateLine = useUpdateBudgetLine();
  const deleteLine = useDeleteBudgetLine();

  const isIncomeCategory = line.classification === 'income';
  const topCategories = allCategories.filter(
    (c) => c.isActive && c.parentId === null && c.isIncome === isIncomeCategory
  );
  const subCategories = allCategories.filter(
    (c) => c.isActive && c.parentId === editCategoryId
  );

  const { register, handleSubmit, watch, setValue, formState: { errors, isDirty } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: line.name,
      amount: line.amount,
      flexibility: line.flexibility,
      frequency: line.frequency,
      frequencyInterval: line.frequencyInterval,
      dayOfMonth1: line.dayOfMonth1,
      dayOfMonth2: line.dayOfMonth2,
      anchorDate: line.anchorDate,
      notes: line.notes ?? '',
    },
  });

  const watchedFrequency = watch('frequency');

  // Reset frequency-specific fields when frequency changes
  useEffect(() => {
    if (watchedFrequency !== 'every_n_days') setValue('frequencyInterval', null);
    if (watchedFrequency !== 'twice_monthly') {
      setValue('dayOfMonth1', null);
      setValue('dayOfMonth2', null);
    }
  }, [watchedFrequency, setValue]);

  const onSave = (values: EditFormValues) => {
    updateLine.mutate(
      {
        id: line.id,
        data: {
          name: values.name,
          amount: values.amount,
          flexibility: values.flexibility as BudgetLineFlexibility,
          frequency: values.frequency as BudgetLineFrequency,
          frequencyInterval: values.frequency === 'every_n_days' ? (values.frequencyInterval ?? null) : null,
          dayOfMonth1: values.frequency === 'twice_monthly' ? (values.dayOfMonth1 ?? null) : null,
          dayOfMonth2: values.frequency === 'twice_monthly' ? (values.dayOfMonth2 ?? null) : null,
          anchorDate: values.anchorDate,
          notes: values.notes ?? null,
          categoryId: editCategoryId,
          subcategoryId: editSubcategoryId,
        },
      },
      { onSuccess: () => setExpanded(false) }
    );
  };

  const handleDelete = () => {
    deleteLine.mutate(line.id, { onSuccess: () => setExpanded(false) });
  };

  // Progress bar: actual vs prorated (capped at 100% for display)
  const progress = proratedAmount > 0 ? Math.min((actualAmount / proratedAmount) * 100, 100) : 0;
  const isOverBudget = variance < 0;
  const isIncome = line.classification === 'income';

  return (
    <div className="relative border-b border-gray-100 last:border-0">
      {/* Main row */}
      <div
        className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 cursor-pointer group"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Name + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-medium text-gray-900 truncate">{line.name}</span>
            {line.isPayPeriodAnchor && (
              <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
            )}
            {subcategoryName && (
              <span className="text-xs text-gray-400">({subcategoryName})</span>
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <FlexibilityBadge flexibility={line.flexibility} />
            <FrequencyBadge frequency={line.frequency} interval={line.frequencyInterval} dayOfMonth1={line.dayOfMonth1} dayOfMonth2={line.dayOfMonth2} />
          </div>
        </div>

        {/* Amounts */}
        <div className="hidden sm:flex items-center gap-6 text-sm shrink-0">
          {/* Progress bar (expense lines only) */}
          {!isIncome && (
            <div className="w-24">
              <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${isOverBudget ? 'bg-red-500' : 'bg-blue-500'}`}
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5 text-right">
                {Math.round(progress)}%
              </div>
            </div>
          )}

          <div className="text-right min-w-[80px]">
            <div className="text-gray-500 text-xs">Actual</div>
            <div className="font-medium text-gray-900">{formatCurrency(actualAmount)}</div>
          </div>
          <div className="text-right min-w-[80px]">
            <div className="text-gray-500 text-xs">Planned</div>
            <div className="font-medium text-gray-700">
              {formatCurrency(proratedAmount)}
            </div>
          </div>
          {!isIncome && (
            <div className="text-right min-w-[70px]">
              <div className="text-gray-500 text-xs">Variance</div>
              <div className={`font-semibold ${isOverBudget ? 'text-red-600' : 'text-emerald-600'}`}>
                {variance >= 0 ? '+' : ''}{formatCurrency(variance)}
              </div>
            </div>
          )}
        </div>

        {/* Expand/collapse indicator */}
        <div className="shrink-0">
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          )}
        </div>
      </div>

      {/* Inline edit form */}
      {expanded && (
        <form
          onSubmit={handleSubmit(onSave)}
          onClick={(e) => e.stopPropagation()}
          className="px-4 py-3 bg-gray-50 border-t border-gray-100"
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input
                {...register('name')}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.name && <p className="text-xs text-red-600 mt-0.5">{errors.name.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
              <input
                type="number"
                step="0.01"
                {...register('amount', { valueAsNumber: true })}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.amount && <p className="text-xs text-red-600 mt-0.5">{errors.amount.message}</p>}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Flexibility</label>
              <select
                {...register('flexibility')}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="fixed">Fixed</option>
                <option value="flexible">Flexible</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
              <select
                {...register('frequency')}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>{f.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            {watchedFrequency === 'every_n_days' && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Every N days</label>
                <input
                  type="number"
                  min={1}
                  {...register('frequencyInterval', { valueAsNumber: true })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {watchedFrequency === 'twice_monthly' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">First day of month</label>
                  <select
                    {...register('dayOfMonth1', { valueAsNumber: true })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select day</option>
                    {DAY_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {errors.dayOfMonth1 && <p className="text-xs text-red-600 mt-0.5">{errors.dayOfMonth1.message}</p>}
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Second day of month</label>
                  <select
                    {...register('dayOfMonth2', { valueAsNumber: true })}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select day</option>
                    {DAY_OPTIONS.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                  {errors.dayOfMonth2 && <p className="text-xs text-red-600 mt-0.5">{errors.dayOfMonth2.message}</p>}
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Anchor Date</label>
              <input
                type="date"
                {...register('anchorDate')}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
              <select
                value={editCategoryId}
                onChange={(e) => {
                  setEditCategoryId(e.target.value);
                  setEditSubcategoryId(null);
                }}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {topCategories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {subCategories.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Subcategory</label>
                <select
                  value={editSubcategoryId ?? ''}
                  onChange={(e) => setEditSubcategoryId(e.target.value || null)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">— none —</option>
                  {subCategories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <input
                {...register('notes')}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Optional notes"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 mt-3">
            <Button
              type="submit"
              size="sm"
              disabled={!isDirty}
              isLoading={updateLine.isPending}
            >
              Save
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setExpanded(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => navigate(`/transactions?budgetLineId=${line.id}`)}
            >
              View Transactions
            </Button>
            <div className="ml-auto">
              {confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600">Delete this item?</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={handleDelete}
                    isLoading={deleteLine.isPending}
                  >
                    Confirm
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setConfirmDelete(false)}
                  >
                    No
                  </Button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:bg-red-50 hover:text-red-700"
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                  Delete
                </Button>
              )}
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
