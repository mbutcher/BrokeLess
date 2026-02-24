import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { MoreHorizontal, Star, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@components/ui/button';
import { FrequencyBadge } from './FrequencyBadge';
import { FlexibilityBadge } from './FlexibilityBadge';
import { useUpdateBudgetLine, useDeleteBudgetLine } from '../hooks/useBudgetLines';
import { useFormatters } from '@lib/i18n/useFormatters';
import type { BudgetViewLine, BudgetLineFrequency, BudgetLineFlexibility } from '../types';

interface BudgetLineRowProps {
  viewLine: BudgetViewLine;
  subcategoryName?: string;
}

const FREQUENCIES: BudgetLineFrequency[] = [
  'weekly', 'biweekly', 'semi_monthly', 'monthly', 'every_n_days', 'annually', 'one_time',
];

const editSchema = z.object({
  name: z.string().min(1).max(100),
  amount: z.number().positive(),
  flexibility: z.enum(['fixed', 'flexible']),
  frequency: z.enum(['weekly', 'biweekly', 'semi_monthly', 'monthly', 'every_n_days', 'annually', 'one_time']),
  frequencyInterval: z.number().int().min(1).optional().nullable(),
  anchorDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().max(255).optional().nullable(),
});

type EditFormValues = z.infer<typeof editSchema>;

export function BudgetLineRow({ viewLine, subcategoryName }: BudgetLineRowProps) {
  const { budgetLine: line, proratedAmount, actualAmount, variance } = viewLine;
  const [expanded, setExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpen]);
  const { currency: formatCurrency } = useFormatters();
  const updateLine = useUpdateBudgetLine();
  const deleteLine = useDeleteBudgetLine();

  const { register, handleSubmit, watch, formState: { errors, isDirty } } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      name: line.name,
      amount: line.amount,
      flexibility: line.flexibility,
      frequency: line.frequency,
      frequencyInterval: line.frequencyInterval,
      anchorDate: line.anchorDate,
      notes: line.notes ?? '',
    },
  });

  const watchedFrequency = watch('frequency');

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
          anchorDate: values.anchorDate,
          notes: values.notes ?? null,
        },
      },
      { onSuccess: () => setExpanded(false) }
    );
  };

  const handleDelete = () => {
    if (confirm(`Delete "${line.name}"? This cannot be undone.`)) {
      deleteLine.mutate(line.id);
    }
    setMenuOpen(false);
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
            <FrequencyBadge frequency={line.frequency} interval={line.frequencyInterval} />
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

        {/* Actions */}
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setMenuOpen(!menuOpen);
            }}
            className="p-1 rounded text-gray-400 hover:text-gray-600 hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="More options"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {expanded ? (
            <ChevronUp className="h-4 w-4 text-gray-400 shrink-0" />
          ) : (
            <ChevronDown className="h-4 w-4 text-gray-400 shrink-0" />
          )}
        </div>

        {/* Dropdown menu */}
        {menuOpen && (
          <div
            ref={menuRef}
            className="absolute right-4 top-10 w-40 rounded-md shadow-lg bg-white ring-1 ring-black/5 z-10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-1">
              <button
                onClick={handleDelete}
                className="block w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50"
              >
                Delete
              </button>
            </div>
          </div>
        )}
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

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Anchor Date</label>
              <input
                type="date"
                {...register('anchorDate')}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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
          </div>
        </form>
      )}
    </div>
  );
}
