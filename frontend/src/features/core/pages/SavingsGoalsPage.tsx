import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@components/ui/dialog';
import { useAccounts } from '../hooks/useAccounts';
import { useBudgetLines } from '../hooks/useBudgetLines';
import {
  useSavingsGoals,
  useSavingsGoalProgress,
  useCreateSavingsGoal,
  useUpdateSavingsGoal,
  useDeleteSavingsGoal,
} from '../hooks/useSavingsGoals';
import type { SavingsGoal } from '../types';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const goalSchema = z.object({
  accountId: z.string().uuid('Select an account'),
  budgetLineId: z.string().optional(),
  name: z.string().min(1, 'Name is required').max(255),
  targetAmount: z.number().positive('Target must be positive'),
  targetDate: z.string().optional(),
});

type GoalFormValues = z.infer<typeof goalSchema>;

// ─── GoalForm ─────────────────────────────────────────────────────────────────

function GoalForm({
  goal,
  onSuccess,
  onCancel,
}: {
  goal?: SavingsGoal;
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const { data: budgetLines = [] } = useBudgetLines();
  const createGoal = useCreateSavingsGoal();
  const updateGoal = useUpdateSavingsGoal(goal?.id ?? '');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<GoalFormValues>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      accountId: goal?.accountId ?? '',
      budgetLineId: goal?.budgetLineId ?? '',
      name: goal?.name ?? '',
      targetAmount: goal?.targetAmount ?? 0,
      targetDate: goal?.targetDate ?? '',
    },
  });

  const onSubmit = (values: GoalFormValues) => {
    const budgetLineId = values.budgetLineId || null;

    if (goal) {
      updateGoal.mutate(
        {
          name: values.name,
          targetAmount: values.targetAmount,
          targetDate: values.targetDate || null,
          budgetLineId,
        },
        { onSuccess }
      );
    } else {
      createGoal.mutate(
        {
          accountId: values.accountId,
          budgetLineId,
          name: values.name,
          targetAmount: values.targetAmount,
          targetDate: values.targetDate || undefined,
        },
        { onSuccess }
      );
    }
  };

  const isPending = createGoal.isPending || updateGoal.isPending;
  const incomeBudgetLines = budgetLines.filter((bl) => bl.isActive && bl.classification === 'income');

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {!goal && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('savingsGoals.account')}
          </label>
          <select
            {...register('accountId')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">{t('savingsGoals.accountPlaceholder')}</option>
            {accounts
              .filter((a) => a.isActive && a.isAsset)
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name} (${a.currentBalance.toFixed(2)})
                </option>
              ))}
          </select>
          {errors.accountId && <p className="mt-1 text-xs text-red-500">{errors.accountId.message}</p>}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {t('savingsGoals.goalName')}
        </label>
        <input
          {...register('name')}
          type="text"
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          placeholder={t('savingsGoals.goalNamePlaceholder')}
        />
        {errors.name && <p className="mt-1 text-xs text-red-500">{errors.name.message}</p>}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('savingsGoals.targetAmount')}
          </label>
          <input
            {...register('targetAmount', { valueAsNumber: true })}
            type="number"
            step="0.01"
            min="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {errors.targetAmount && <p className="mt-1 text-xs text-red-500">{errors.targetAmount.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('savingsGoals.targetDate')}
          </label>
          <input
            {...register('targetDate')}
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
        </div>
      </div>

      {incomeBudgetLines.length > 0 && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('savingsGoals.budgetLine')}
          </label>
          <select
            {...register('budgetLineId')}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          >
            <option value="">{t('savingsGoals.budgetLinePlaceholder')}</option>
            {incomeBudgetLines.map((bl) => (
              <option key={bl.id} value={bl.id}>
                {bl.name} (${bl.amount.toFixed(2)} / {bl.frequency})
              </option>
            ))}
          </select>
        </div>
      )}

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isPending
            ? t('savingsGoals.saving')
            : goal
            ? t('savingsGoals.saveChanges')
            : t('savingsGoals.create')}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          {t('savingsGoals.cancel')}
        </button>
      </div>
    </form>
  );
}

// ─── GoalCard ─────────────────────────────────────────────────────────────────

function GoalCard({ goal, onEdit }: { goal: SavingsGoal; onEdit: (goal: SavingsGoal) => void }) {
  const { t } = useTranslation();
  const { data: progress } = useSavingsGoalProgress(goal.id);
  const { data: budgetLines = [] } = useBudgetLines();
  const deleteGoal = useDeleteSavingsGoal();

  const linkedBudgetLine = goal.budgetLineId
    ? budgetLines.find((bl) => bl.id === goal.budgetLineId)
    : null;

  const pct = progress?.percentComplete ?? 0;
  const current = progress?.currentAmount ?? 0;

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">{goal.name}</h3>
          {goal.targetDate && (
            <p className="text-xs text-gray-400 mt-0.5">Target: {goal.targetDate}</p>
          )}
          {linkedBudgetLine && (
            <p className="text-xs text-blue-500 mt-0.5">
              {t('savingsGoals.linkedBudgetLine', { name: linkedBudgetLine.name })}
            </p>
          )}
        </div>
        <div className="flex gap-2 text-xs">
          <button onClick={() => onEdit(goal)} className="text-blue-600 hover:underline">
            {t('savingsGoals.editBtn')}
          </button>
          <button
            onClick={() => deleteGoal.mutate(goal.id)}
            className="text-red-500 hover:underline"
          >
            {t('savingsGoals.deleteBtn')}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-2">
        <div
          className="h-full bg-green-500 rounded-full transition-all"
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>{fmt(current)} saved</span>
        <span>{pct.toFixed(1)}% of {fmt(goal.targetAmount)}</span>
      </div>

      {progress?.projectedDate && pct < 100 && (
        <p className="mt-1 text-xs text-gray-400">
          {t('savingsGoals.projectedCompletion')} {progress.projectedDate}
        </p>
      )}
      {progress?.daysToGoal !== null && progress?.daysToGoal !== undefined && progress.daysToGoal >= 0 && (
        <p className="mt-0.5 text-xs text-gray-400">
          {progress.daysToGoal === 0
            ? t('savingsGoals.dueToday')
            : t('savingsGoals.daysRemaining', { count: progress.daysToGoal })}
        </p>
      )}
    </div>
  );
}

// ─── SavingsGoalsPage ─────────────────────────────────────────────────────────

export function SavingsGoalsPage() {
  const { t } = useTranslation();
  const { data: goals = [], isLoading } = useSavingsGoals();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SavingsGoal | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(goal: SavingsGoal) {
    setEditing(goal);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditing(null);
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{t('savingsGoals.title')}</h1>
        <button
          onClick={openCreate}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700"
        >
          {t('savingsGoals.add')}
        </button>
      </div>

      <Dialog open={modalOpen} onOpenChange={(open) => { if (!open) closeModal(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editing ? t('savingsGoals.edit') : t('savingsGoals.new')}
            </DialogTitle>
          </DialogHeader>
          <GoalForm
            goal={editing ?? undefined}
            onSuccess={closeModal}
            onCancel={closeModal}
          />
        </DialogContent>
      </Dialog>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 animate-pulse rounded-xl" />
          ))}
        </div>
      ) : goals.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">{t('savingsGoals.empty')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {goals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onEdit={openEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
