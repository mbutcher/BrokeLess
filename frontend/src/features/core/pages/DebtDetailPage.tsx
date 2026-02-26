import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useAccounts } from '../hooks/useAccounts';
import {
  useDebtSchedule,
  useAmortizationSchedule,
  useWhatIf,
  useUpsertDebtSchedule,
  useDeleteDebtSchedule,
} from '../hooks/useDebt';

// ─── Zod schema ───────────────────────────────────────────────────────────────

const scheduleSchema = z.object({
  principal: z.number().positive('Principal must be positive'),
  annualRatePct: z.number().min(0).max(100, 'Rate must be between 0 and 100'),
  termMonths: z.number().int().min(1).max(600),
  originationDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Use YYYY-MM-DD format'),
  paymentAmount: z.number().positive('Payment amount must be positive'),
});

type ScheduleFormValues = z.infer<typeof scheduleSchema>;

// ─── DebtScheduleForm ─────────────────────────────────────────────────────────

function DebtScheduleForm({
  accountId,
  defaultValues,
  onSuccess,
}: {
  accountId: string;
  defaultValues?: Partial<ScheduleFormValues>;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const upsert = useUpsertDebtSchedule(accountId);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ScheduleFormValues>({
    resolver: zodResolver(scheduleSchema),
    defaultValues: defaultValues ?? {
      principal: 0,
      annualRatePct: 0,
      termMonths: 60,
      originationDate: new Date().toISOString().slice(0, 10),
      paymentAmount: 0,
    },
  });

  const onSubmit = (values: ScheduleFormValues) => {
    upsert.mutate(
      {
        principal: values.principal,
        annualRate: values.annualRatePct / 100,
        termMonths: values.termMonths,
        originationDate: values.originationDate,
        paymentAmount: values.paymentAmount,
      },
      { onSuccess }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('debt.originalPrincipal')}
          </label>
          <input
            {...register('principal', { valueAsNumber: true })}
            type="number"
            step="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {errors.principal && <p className="mt-1 text-xs text-red-500">{errors.principal.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('debt.annualRateField')}
          </label>
          <input
            {...register('annualRatePct', { valueAsNumber: true })}
            type="number"
            step="0.001"
            min="0"
            max="100"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {errors.annualRatePct && <p className="mt-1 text-xs text-red-500">{errors.annualRatePct.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('debt.termMonths')}
          </label>
          <input
            {...register('termMonths', { valueAsNumber: true })}
            type="number"
            step="1"
            min="1"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {errors.termMonths && <p className="mt-1 text-xs text-red-500">{errors.termMonths.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('debt.monthlyPaymentField')}
          </label>
          <input
            {...register('paymentAmount', { valueAsNumber: true })}
            type="number"
            step="0.01"
            min="0.01"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {errors.paymentAmount && <p className="mt-1 text-xs text-red-500">{errors.paymentAmount.message}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            {t('debt.originationDate')}
          </label>
          <input
            {...register('originationDate')}
            type="date"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
          />
          {errors.originationDate && <p className="mt-1 text-xs text-red-500">{errors.originationDate.message}</p>}
        </div>
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={upsert.isPending}
          className="bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {upsert.isPending ? t('debt.saving') : t('debt.saveSchedule')}
        </button>
      </div>
    </form>
  );
}

// ─── AmortizationTable ────────────────────────────────────────────────────────

function AmortizationTable({ accountId }: { accountId: string }) {
  const { data: scheduleData } = useDebtSchedule(accountId);
  const { data: amortData, isLoading } = useAmortizationSchedule(accountId, !!scheduleData);
  const [showAll, setShowAll] = useState(false);

  if (isLoading) {
    return <div className="h-48 bg-gray-100 animate-pulse rounded-lg" />;
  }
  if (!amortData) return null;

  const rows = showAll ? amortData.schedule : amortData.schedule.slice(0, 24);

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-gray-600">
          <span className="font-medium">Payoff date:</span> {amortData.payoffDate}
          {'  '}
          <span className="font-medium ml-4">Total interest:</span> {fmt(amortData.totalInterest)}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-gray-500 border-b border-gray-200">
              <th className="pb-2 pr-4">Month</th>
              <th className="pb-2 pr-4 text-right">Payment</th>
              <th className="pb-2 pr-4 text-right">Principal</th>
              <th className="pb-2 pr-4 text-right">Interest</th>
              <th className="pb-2 text-right">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-b border-gray-50">
                <td className="py-1.5 pr-4 text-gray-600">{row.month}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(row.payment)}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums text-green-600">{fmt(row.principal)}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums text-red-500">{fmt(row.interest)}</td>
                <td className="py-1.5 text-right tabular-nums">{fmt(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {amortData.schedule.length > 24 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-sm text-blue-600 hover:underline"
        >
          {showAll ? 'Show fewer rows' : `Show all ${amortData.schedule.length} months`}
        </button>
      )}
    </div>
  );
}

// ─── ExtraPaymentCalculator ────────────────────────────────────────────────────

function ExtraPaymentCalculator({ accountId }: { accountId: string }) {
  const [extra, setExtra] = useState('');
  const extraNum = parseFloat(extra);
  const { data: whatIf } = useWhatIf(accountId, isNaN(extraNum) ? null : extraNum);

  return (
    <div>
      <div className="flex items-center gap-3">
        <div className="relative">
          <span className="absolute left-3 top-2 text-gray-400 text-sm">$</span>
          <input
            type="number"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
            min="0.01"
            step="0.01"
            placeholder="Extra monthly payment"
            className="pl-7 border border-gray-300 rounded-lg px-3 py-2 text-sm w-52"
          />
        </div>
        {whatIf && (
          <p className="text-sm text-gray-700">
            Save{' '}
            <span className="font-semibold text-green-600">{whatIf.monthsSaved} months</span> and{' '}
            <span className="font-semibold text-green-600">
              ${whatIf.interestSaved.toFixed(2)}
            </span>{' '}
            in interest. Payoff: <span className="font-medium">{whatIf.newPayoffDate}</span>
          </p>
        )}
      </div>
    </div>
  );
}

// ─── DebtDetailPage ───────────────────────────────────────────────────────────

export function DebtDetailPage() {
  const { t } = useTranslation();
  const { accountId } = useParams<{ accountId: string }>();
  const { data: accounts = [] } = useAccounts();
  const { data: schedule, isLoading, isError, error } = useDebtSchedule(accountId!);
  const deleteSchedule = useDeleteDebtSchedule(accountId!);

  const account = accounts.find((a) => a.id === accountId);

  const [editing, setEditing] = useState(false);

  const hasSchedule = !!schedule;
  const scheduleNotFound =
    isError && (error as { response?: { status: number } })?.response?.status === 404;

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
      <div>
        <Link to="/accounts" className="text-sm text-blue-600 hover:underline">
          {t('debt.backToAccounts')}
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-gray-900">
          {account
            ? t('debt.titleWithAccount', { name: account.name })
            : t('debt.title')}
        </h1>
      </div>

      {/* Schedule form */}
      <section className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-gray-900">{t('debt.loanSchedule')}</h2>
          {hasSchedule && !editing && (
            <div className="flex gap-2">
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-blue-600 hover:underline"
              >
                {t('debt.edit')}
              </button>
              <button
                onClick={() => deleteSchedule.mutate()}
                className="text-sm text-red-500 hover:underline"
              >
                {t('debt.remove')}
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="h-32 bg-gray-100 animate-pulse rounded-lg" />
        ) : hasSchedule && !editing ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-gray-500">{t('debt.principal')}</p>
              <p className="font-medium">${schedule.principal.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">{t('debt.annualRate')}</p>
              <p className="font-medium">{(schedule.annualRate * 100).toFixed(3)}%</p>
            </div>
            <div>
              <p className="text-gray-500">{t('debt.term')}</p>
              <p className="font-medium">{schedule.termMonths} months</p>
            </div>
            <div>
              <p className="text-gray-500">{t('debt.monthlyPayment')}</p>
              <p className="font-medium">${schedule.paymentAmount.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-gray-500">{t('debt.origination')}</p>
              <p className="font-medium">{schedule.originationDate}</p>
            </div>
          </div>
        ) : (
          <DebtScheduleForm
            accountId={accountId!}
            defaultValues={
              schedule
                ? {
                    principal: schedule.principal,
                    annualRatePct: schedule.annualRate * 100,
                    termMonths: schedule.termMonths,
                    originationDate: schedule.originationDate,
                    paymentAmount: schedule.paymentAmount,
                  }
                : undefined
            }
            onSuccess={() => {
              setEditing(false);
            }}
          />
        )}
        {scheduleNotFound && !editing && (
          <div>
            <p className="text-sm text-gray-400 mb-4">{t('debt.noSchedule')}</p>
            <DebtScheduleForm accountId={accountId!} onSuccess={() => setEditing(false)} />
          </div>
        )}
      </section>

      {/* Amortization table */}
      {hasSchedule && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-4">{t('debt.amortization')}</h2>
          <AmortizationTable accountId={accountId!} />
        </section>
      )}

      {/* What-if calculator */}
      {hasSchedule && (
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-900 mb-2">{t('debt.whatIf')}</h2>
          <p className="text-sm text-gray-500 mb-4">{t('debt.whatIfDesc')}</p>
          <ExtraPaymentCalculator accountId={accountId!} />
        </section>
      )}
    </div>
  );
}
