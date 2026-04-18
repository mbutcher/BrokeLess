import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@components/ui/dialog';
import { useAccounts } from '../hooks/useAccounts';
import {
  useDebtSchedule,
  useAmortizationSchedule,
  useWhatIf,
  useUpsertDebtSchedule,
  useDeleteDebtSchedule,
} from '../hooks/useDebt';
import type { MinimumPaymentType, PaymentFrequency } from '../types';

// ─── Zod schemas ──────────────────────────────────────────────────────────────

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const loanFullSchema = z.object({
  mode: z.literal('full'),
  principal: z.number().positive('Principal must be positive'),
  annualRatePct: z.number().min(0).max(100, 'Rate must be 0–100'),
  termMonths: z.number().int().min(1).max(600),
  originationDate: z.string().regex(ISO_DATE, 'Use YYYY-MM-DD'),
  paymentAmount: z.number().positive('Payment must be positive'),
  paymentFrequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']),
});

const loanSimplifiedSchema = z.object({
  mode: z.literal('simplified'),
  principal: z.number().positive('Current balance must be positive'),
  annualRatePct: z.number().min(0).max(100, 'Rate must be 0–100'),
  termMonths: z.number().int().min(1).max(600),
  asOfDate: z.string().regex(ISO_DATE, 'Use YYYY-MM-DD'),
  paymentAmount: z.number().positive('Payment must be positive'),
  paymentFrequency: z.enum(['weekly', 'biweekly', 'semimonthly', 'monthly']),
});

const ccSchema = z.object({
  annualRatePct: z.number().min(0).max(100, 'Rate must be 0–100'),
  cashAdvanceRatePct: z.number().min(0).max(100).nullable().optional(),
  minimumPaymentType: z.enum(['fixed', 'percentage', 'greater_of', 'lesser_of']),
  minimumPaymentAmount: z.number().positive().nullable().optional(),
  minimumPaymentPercent: z.number().min(0).max(100).nullable().optional(),
  creditLimit: z.number().positive().nullable().optional(),
});

type LoanFullValues = z.infer<typeof loanFullSchema>;
type LoanSimplifiedValues = z.infer<typeof loanSimplifiedSchema>;
type CCValues = z.infer<typeof ccSchema>;

/** Common shape for pre-filling loan forms regardless of mode. */
interface LoanDefaults {
  principal?: number;
  annualRatePct?: number;
  termMonths?: number;
  originationDate?: string;
  asOfDate?: string;
  paymentAmount?: number;
  paymentFrequency?: PaymentFrequency;
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';
const labelClass = 'block text-sm font-medium text-foreground mb-1';
const errorClass = 'mt-1 text-xs text-destructive';
const selectClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className={errorClass}>{message}</p>;
}

/** Parse a form input value to a number or null (for optional numeric fields). */
function parseOptionalNum(v: unknown): number | null {
  if (v === '' || v === null || v === undefined) return null;
  const n = parseFloat(String(v));
  return isNaN(n) ? null : n;
}

const FREQUENCY_OPTIONS: { value: PaymentFrequency; labelKey: string }[] = [
  { value: 'monthly', labelKey: 'debt.freqMonthly' },
  { value: 'semimonthly', labelKey: 'debt.freqSemimonthly' },
  { value: 'biweekly', labelKey: 'debt.freqBiweekly' },
  { value: 'weekly', labelKey: 'debt.freqWeekly' },
];

// ─── Loan form (full or simplified mode) ─────────────────────────────────────

function LoanScheduleForm({
  accountId,
  initialMode,
  defaultValues,
  onSuccess,
}: {
  accountId: string;
  initialMode: 'full' | 'simplified';
  defaultValues?: LoanDefaults;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'full' | 'simplified'>(initialMode);
  const upsert = useUpsertDebtSchedule(accountId);

  const fullForm = useForm<LoanFullValues>({
    resolver: zodResolver(loanFullSchema),
    defaultValues: {
      mode: 'full',
      principal: defaultValues?.principal ?? undefined,
      annualRatePct: defaultValues?.annualRatePct ?? 0,
      termMonths: defaultValues?.termMonths ?? 60,
      originationDate: defaultValues?.originationDate ?? new Date().toISOString().slice(0, 10),
      paymentAmount: defaultValues?.paymentAmount ?? undefined,
      paymentFrequency: defaultValues?.paymentFrequency ?? 'monthly',
    },
  });

  const simplifiedForm = useForm<LoanSimplifiedValues>({
    resolver: zodResolver(loanSimplifiedSchema),
    defaultValues: {
      mode: 'simplified',
      principal: defaultValues?.principal ?? undefined,
      annualRatePct: defaultValues?.annualRatePct ?? 0,
      termMonths: defaultValues?.termMonths ?? 60,
      asOfDate: defaultValues?.asOfDate ?? new Date().toISOString().slice(0, 10),
      paymentAmount: defaultValues?.paymentAmount ?? undefined,
      paymentFrequency: defaultValues?.paymentFrequency ?? 'monthly',
    },
  });

  const submitFull = (values: LoanFullValues) => {
    upsert.mutate(
      {
        principal: values.principal,
        annualRate: values.annualRatePct / 100,
        termMonths: values.termMonths,
        originationDate: values.originationDate,
        paymentAmount: values.paymentAmount,
        paymentFrequency: values.paymentFrequency,
        isSimplified: false,
        asOfDate: null,
      },
      { onSuccess }
    );
  };

  const submitSimplified = (values: LoanSimplifiedValues) => {
    upsert.mutate(
      {
        principal: values.principal,
        annualRate: values.annualRatePct / 100,
        termMonths: values.termMonths,
        asOfDate: values.asOfDate,
        paymentAmount: values.paymentAmount,
        paymentFrequency: values.paymentFrequency,
        isSimplified: true,
        originationDate: null,
      },
      { onSuccess }
    );
  };

  return (
    <div className="space-y-5">
      {/* Mode toggle */}
      <div className="flex gap-2 p-1 bg-muted rounded-lg w-fit">
        <button
          type="button"
          onClick={() => setMode('full')}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
            mode === 'full'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('debt.fullMode')}
        </button>
        <button
          type="button"
          onClick={() => setMode('simplified')}
          className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${
            mode === 'simplified'
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          {t('debt.simplifiedMode')}
        </button>
      </div>

      {mode === 'full' ? (
        <form onSubmit={fullForm.handleSubmit(submitFull)} className="space-y-4">
          <p className="text-xs text-muted-foreground">{t('debt.fullModeNote')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('debt.originalPrincipal')}</label>
              <input
                {...fullForm.register('principal', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className={inputClass}
              />
              <FieldError message={fullForm.formState.errors.principal?.message} />
            </div>
            <div>
              <label className={labelClass}>{t('debt.annualRateField')}</label>
              <input
                {...fullForm.register('annualRatePct', { valueAsNumber: true })}
                type="number"
                step="0.001"
                min="0"
                max="100"
                className={inputClass}
              />
              <FieldError message={fullForm.formState.errors.annualRatePct?.message} />
            </div>
            <div>
              <label className={labelClass}>{t('debt.termMonths')}</label>
              <input
                {...fullForm.register('termMonths', { valueAsNumber: true })}
                type="number"
                step="1"
                min="1"
                className={inputClass}
              />
              <FieldError message={fullForm.formState.errors.termMonths?.message} />
            </div>
            <div>
              <label className={labelClass}>{t('debt.originationDate')}</label>
              <input {...fullForm.register('originationDate')} type="date" className={inputClass} />
              <FieldError message={fullForm.formState.errors.originationDate?.message} />
            </div>
            <div>
              <label className={labelClass}>{t('debt.paymentFrequency')}</label>
              <Controller
                name="paymentFrequency"
                control={fullForm.control}
                render={({ field }) => (
                  <select {...field} className={selectClass}>
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            <div>
              <label className={labelClass}>{t('debt.paymentAmountField')}</label>
              <input
                {...fullForm.register('paymentAmount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0.01"
                className={inputClass}
              />
              <FieldError message={fullForm.formState.errors.paymentAmount?.message} />
            </div>
          </div>
          <button
            type="submit"
            disabled={upsert.isPending}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {upsert.isPending ? t('debt.saving') : t('debt.saveSchedule')}
          </button>
        </form>
      ) : (
        <form onSubmit={simplifiedForm.handleSubmit(submitSimplified)} className="space-y-4">
          <p className="text-xs text-muted-foreground">{t('debt.simplifiedModeNote')}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>{t('debt.currentBalance')}</label>
              <input
                {...simplifiedForm.register('principal', { valueAsNumber: true })}
                type="number"
                step="0.01"
                className={inputClass}
              />
              <FieldError message={simplifiedForm.formState.errors.principal?.message} />
            </div>
            <div>
              <label className={labelClass}>{t('debt.asOfDate')}</label>
              <input
                {...simplifiedForm.register('asOfDate')}
                type="date"
                className={inputClass}
              />
              <FieldError message={simplifiedForm.formState.errors.asOfDate?.message} />
            </div>
            <div>
              <label className={labelClass}>{t('debt.annualRateField')}</label>
              <input
                {...simplifiedForm.register('annualRatePct', { valueAsNumber: true })}
                type="number"
                step="0.001"
                min="0"
                max="100"
                className={inputClass}
              />
              <FieldError message={simplifiedForm.formState.errors.annualRatePct?.message} />
            </div>
            <div>
              <label className={labelClass}>{t('debt.remainingTerm')}</label>
              <input
                {...simplifiedForm.register('termMonths', { valueAsNumber: true })}
                type="number"
                step="1"
                min="1"
                className={inputClass}
              />
              <FieldError message={simplifiedForm.formState.errors.termMonths?.message} />
            </div>
            <div>
              <label className={labelClass}>{t('debt.paymentFrequency')}</label>
              <Controller
                name="paymentFrequency"
                control={simplifiedForm.control}
                render={({ field }) => (
                  <select {...field} className={selectClass}>
                    {FREQUENCY_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {t(opt.labelKey)}
                      </option>
                    ))}
                  </select>
                )}
              />
            </div>
            <div>
              <label className={labelClass}>{t('debt.paymentAmountField')}</label>
              <input
                {...simplifiedForm.register('paymentAmount', { valueAsNumber: true })}
                type="number"
                step="0.01"
                min="0.01"
                className={inputClass}
              />
              <FieldError message={simplifiedForm.formState.errors.paymentAmount?.message} />
            </div>
          </div>
          <button
            type="submit"
            disabled={upsert.isPending}
            className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
          >
            {upsert.isPending ? t('debt.saving') : t('debt.saveSchedule')}
          </button>
        </form>
      )}
    </div>
  );
}

// ─── CC / LOC form ────────────────────────────────────────────────────────────

const MIN_PAYMENT_TYPES: { value: MinimumPaymentType; labelKey: string }[] = [
  { value: 'fixed', labelKey: 'debt.minPayFixed' },
  { value: 'percentage', labelKey: 'debt.minPayPercentage' },
  { value: 'greater_of', labelKey: 'debt.minPayGreaterOf' },
  { value: 'lesser_of', labelKey: 'debt.minPayLesserOf' },
];

function CCScheduleForm({
  accountId,
  defaultValues,
  onSuccess,
}: {
  accountId: string;
  defaultValues?: Partial<CCValues>;
  onSuccess: () => void;
}) {
  const { t } = useTranslation();
  const upsert = useUpsertDebtSchedule(accountId);

  const {
    register,
    control,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<CCValues>({
    resolver: zodResolver(ccSchema),
    defaultValues: {
      annualRatePct: defaultValues?.annualRatePct ?? 0,
      cashAdvanceRatePct: defaultValues?.cashAdvanceRatePct ?? null,
      minimumPaymentType: defaultValues?.minimumPaymentType ?? 'greater_of',
      minimumPaymentAmount: defaultValues?.minimumPaymentAmount ?? null,
      minimumPaymentPercent: defaultValues?.minimumPaymentPercent ?? null,
      creditLimit: defaultValues?.creditLimit ?? null,
    },
  });

  const paymentType = watch('minimumPaymentType');
  const showAmount =
    paymentType === 'fixed' || paymentType === 'greater_of' || paymentType === 'lesser_of';
  const showPercent =
    paymentType === 'percentage' || paymentType === 'greater_of' || paymentType === 'lesser_of';

  const onSubmit = (values: CCValues) => {
    upsert.mutate(
      {
        annualRate: values.annualRatePct / 100,
        cashAdvanceRate:
          values.cashAdvanceRatePct != null ? values.cashAdvanceRatePct / 100 : null,
        minimumPaymentType: values.minimumPaymentType,
        minimumPaymentAmount: values.minimumPaymentAmount ?? null,
        minimumPaymentPercent:
          values.minimumPaymentPercent != null ? values.minimumPaymentPercent / 100 : null,
        creditLimit: values.creditLimit ?? null,
        principal: null,
        termMonths: null,
        originationDate: null,
        paymentAmount: null,
        isSimplified: false,
        asOfDate: null,
      },
      { onSuccess }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>{t('debt.purchaseRate')}</label>
          <input
            {...register('annualRatePct', { valueAsNumber: true })}
            type="number"
            step="0.001"
            min="0"
            max="100"
            className={inputClass}
          />
          <FieldError message={errors.annualRatePct?.message} />
        </div>
        <div>
          <label className={labelClass}>{t('debt.cashAdvanceRate')}</label>
          <input
            {...register('cashAdvanceRatePct', { setValueAs: parseOptionalNum })}
            type="number"
            step="0.001"
            min="0"
            max="100"
            placeholder={t('debt.optional')}
            className={inputClass}
          />
          <FieldError message={errors.cashAdvanceRatePct?.message} />
        </div>
        <div>
          <label className={labelClass}>{t('debt.minimumPaymentType')}</label>
          <Controller
            name="minimumPaymentType"
            control={control}
            render={({ field }) => (
              <select {...field} className={selectClass}>
                {MIN_PAYMENT_TYPES.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </select>
            )}
          />
        </div>
        {showAmount && (
          <div>
            <label className={labelClass}>{t('debt.minimumPaymentAmount')}</label>
            <input
              {...register('minimumPaymentAmount', { setValueAs: parseOptionalNum })}
              type="number"
              step="0.01"
              min="0.01"
              className={inputClass}
            />
            <FieldError message={errors.minimumPaymentAmount?.message} />
          </div>
        )}
        {showPercent && (
          <div>
            <label className={labelClass}>{t('debt.minimumPaymentPercent')}</label>
            <input
              {...register('minimumPaymentPercent', { setValueAs: parseOptionalNum })}
              type="number"
              step="0.1"
              min="0"
              max="100"
              placeholder="e.g. 2"
              className={inputClass}
            />
            <FieldError message={errors.minimumPaymentPercent?.message} />
          </div>
        )}
        <div>
          <label className={labelClass}>{t('debt.creditLimit')}</label>
          <input
            {...register('creditLimit', { setValueAs: parseOptionalNum })}
            type="number"
            step="0.01"
            min="0"
            placeholder={t('debt.optional')}
            className={inputClass}
          />
          <FieldError message={errors.creditLimit?.message} />
        </div>
      </div>
      <button
        type="submit"
        disabled={upsert.isPending}
        className="bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50"
      >
        {upsert.isPending ? t('debt.saving') : t('debt.saveSchedule')}
      </button>
    </form>
  );
}

// ─── AmortizationTable ────────────────────────────────────────────────────────

function AmortizationTable({
  accountId,
  isRevolving,
}: {
  accountId: string;
  isRevolving: boolean;
}) {
  // Always enabled — parent only renders this component when hasSchedule is true
  const { data: amortData, isLoading } = useAmortizationSchedule(accountId, true);
  const [showAll, setShowAll] = useState(false);
  const { t } = useTranslation();

  if (isLoading) {
    return <div className="h-48 bg-muted animate-pulse rounded-lg" />;
  }
  if (!amortData) return null;

  const rows = showAll ? amortData.schedule : amortData.schedule.slice(0, 24);

  const fmt = (n: number) =>
    `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <div className="text-sm text-muted-foreground space-x-4">
          <span>
            <span className="font-medium text-foreground">{t('debt.estimatedPayoff')}:</span>{' '}
            {amortData.payoffDate}
          </span>
          <span>
            <span className="font-medium text-foreground">{t('debt.totalInterest')}:</span>{' '}
            {fmt(amortData.totalInterest)}
          </span>
        </div>
      </div>
      {isRevolving && (
        <p className="text-xs text-muted-foreground mb-3">{t('debt.revolvingSimNote')}</p>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-muted-foreground border-b border-border">
              <th className="pb-2 pr-4">{t('debt.tablePeriod')}</th>
              <th className="pb-2 pr-4 text-right">{t('debt.tablePayment')}</th>
              <th className="pb-2 pr-4 text-right">{t('debt.tablePrincipal')}</th>
              <th className="pb-2 pr-4 text-right">{t('debt.tableInterest')}</th>
              <th className="pb-2 text-right">{t('debt.tableBalance')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.month} className="border-b border-border/40">
                <td className="py-1.5 pr-4 text-muted-foreground">{row.month}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums">{fmt(row.payment)}</td>
                <td className="py-1.5 pr-4 text-right tabular-nums text-success">
                  {fmt(row.principal)}
                </td>
                <td className="py-1.5 pr-4 text-right tabular-nums text-destructive">
                  {fmt(row.interest)}
                </td>
                <td className="py-1.5 text-right tabular-nums">{fmt(row.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {amortData.schedule.length > 24 && (
        <button
          onClick={() => setShowAll((v) => !v)}
          className="mt-3 text-sm text-primary hover:underline"
        >
          {showAll
            ? t('debt.showFewer')
            : t('debt.showAll', { count: amortData.schedule.length })}
        </button>
      )}
    </div>
  );
}

// ─── ExtraPaymentCalculator ────────────────────────────────────────────────────

function ExtraPaymentCalculator({ accountId }: { accountId: string }) {
  const { t } = useTranslation();
  const [extra, setExtra] = useState('');
  const extraNum = parseFloat(extra);
  const { data: whatIf } = useWhatIf(accountId, isNaN(extraNum) ? null : extraNum);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="relative">
        <span className="absolute left-3 top-2 text-muted-foreground text-sm">$</span>
        <input
          type="number"
          value={extra}
          onChange={(e) => setExtra(e.target.value)}
          min="0.01"
          step="0.01"
          placeholder={t('debt.extraMonthlyPlaceholder')}
          className="pl-7 border border-border rounded-lg px-3 py-2 text-sm w-52 bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>
      {whatIf && (
        <p className="text-sm text-foreground">
          {t('debt.whatIfResult', {
            months: whatIf.monthsSaved,
            interest: whatIf.interestSaved.toFixed(2),
            date: whatIf.newPayoffDate,
          })}
        </p>
      )}
    </div>
  );
}

// ─── DebtDetailContent ────────────────────────────────────────────────────────

function DebtDetailContent({ accountId }: { accountId: string }) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const { data: schedule, isLoading, isError, error } = useDebtSchedule(accountId);
  const deleteSchedule = useDeleteDebtSchedule(accountId);

  const account = accounts.find((a) => a.id === accountId);
  const [editing, setEditing] = useState(false);

  const hasSchedule = !!schedule;
  const scheduleNotFound =
    isError && (error as { response?: { status: number } })?.response?.status === 404;

  const isCC = account?.type === 'credit_card' || account?.type === 'line_of_credit';

  const fmt = (n: number | null) =>
    n != null
      ? `$${n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      : '—';
  const pct = (n: number | null) => (n != null ? `${(n * 100).toFixed(3)}%` : '—');

  const freqLabel = (f: string | null) => {
    switch (f) {
      case 'weekly': return t('debt.freqWeekly');
      case 'biweekly': return t('debt.freqBiweekly');
      case 'semimonthly': return t('debt.freqSemimonthly');
      default: return t('debt.freqMonthly');
    }
  };

  const loanDefaults: LoanDefaults | undefined =
    schedule && !isCC
      ? {
          principal: schedule.principal ?? undefined,
          annualRatePct: schedule.annualRate * 100,
          termMonths: schedule.termMonths ?? undefined,
          originationDate: schedule.originationDate ?? undefined,
          asOfDate: schedule.asOfDate ?? undefined,
          paymentAmount: schedule.paymentAmount ?? undefined,
          paymentFrequency: schedule.paymentFrequency ?? 'monthly',
        }
      : undefined;

  const ccDefaults: Partial<CCValues> | undefined =
    schedule && isCC
      ? {
          annualRatePct: schedule.annualRate * 100,
          cashAdvanceRatePct:
            schedule.cashAdvanceRate != null ? schedule.cashAdvanceRate * 100 : null,
          minimumPaymentType: schedule.minimumPaymentType ?? undefined,
          minimumPaymentAmount: schedule.minimumPaymentAmount ?? null,
          minimumPaymentPercent:
            schedule.minimumPaymentPercent != null
              ? schedule.minimumPaymentPercent * 100
              : null,
          creditLimit: schedule.creditLimit ?? null,
        }
      : undefined;

  const minPayLabel = (type: string | null) => {
    switch (type) {
      case 'fixed': return t('debt.minPayFixed');
      case 'percentage': return t('debt.minPayPercentage');
      case 'greater_of': return t('debt.minPayGreaterOf');
      case 'lesser_of': return t('debt.minPayLesserOf');
      default: return '—';
    }
  };

  const showForm = scheduleNotFound || editing;

  return (
    <div className="space-y-6">
      {/* Schedule section */}
      <section className="bg-muted/30 rounded-xl border border-border p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground">
            {isCC ? t('debt.ccLOCDetails') : t('debt.loanSchedule')}
          </h3>
          {hasSchedule && !editing && (
            <div className="flex gap-3">
              <button
                onClick={() => setEditing(true)}
                className="text-sm text-primary hover:underline"
              >
                {t('debt.edit')}
              </button>
              <button
                onClick={() => deleteSchedule.mutate()}
                className="text-sm text-destructive hover:underline"
              >
                {t('debt.remove')}
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="h-28 bg-muted animate-pulse rounded-lg" />
        ) : hasSchedule && !editing ? (
          // Read-only summary
          isCC ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">{t('debt.purchaseRate')}</p>
                <p className="font-medium">{pct(schedule.annualRate)}</p>
              </div>
              {schedule.cashAdvanceRate != null && (
                <div>
                  <p className="text-muted-foreground">{t('debt.cashAdvanceRate')}</p>
                  <p className="font-medium">{pct(schedule.cashAdvanceRate)}</p>
                </div>
              )}
              <div>
                <p className="text-muted-foreground">{t('debt.minimumPaymentType')}</p>
                <p className="font-medium">{minPayLabel(schedule.minimumPaymentType)}</p>
              </div>
              {schedule.minimumPaymentAmount != null && (
                <div>
                  <p className="text-muted-foreground">{t('debt.minimumPaymentAmount')}</p>
                  <p className="font-medium">{fmt(schedule.minimumPaymentAmount)}</p>
                </div>
              )}
              {schedule.minimumPaymentPercent != null && (
                <div>
                  <p className="text-muted-foreground">{t('debt.minimumPaymentPercent')}</p>
                  <p className="font-medium">
                    {(schedule.minimumPaymentPercent * 100).toFixed(2)}%
                  </p>
                </div>
              )}
              {schedule.creditLimit != null && (
                <div>
                  <p className="text-muted-foreground">{t('debt.creditLimit')}</p>
                  <p className="font-medium">{fmt(schedule.creditLimit)}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">
                  {schedule.isSimplified ? t('debt.currentBalance') : t('debt.principal')}
                </p>
                <p className="font-medium">{fmt(schedule.principal)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('debt.annualRate')}</p>
                <p className="font-medium">{pct(schedule.annualRate)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('debt.term')}</p>
                <p className="font-medium">
                  {schedule.termMonths != null ? `${schedule.termMonths} months` : '—'}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('debt.paymentFrequency')}</p>
                <p className="font-medium">{freqLabel(schedule.paymentFrequency)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{t('debt.paymentAmount')}</p>
                <p className="font-medium">{fmt(schedule.paymentAmount)}</p>
              </div>
              <div>
                <p className="text-muted-foreground">
                  {schedule.isSimplified ? t('debt.asOfDate') : t('debt.origination')}
                </p>
                <p className="font-medium">
                  {schedule.isSimplified
                    ? (schedule.asOfDate ?? '—')
                    : (schedule.originationDate ?? '—')}
                </p>
              </div>
            </div>
          )
        ) : showForm ? (
          // Form (create or edit)
          <>
            {scheduleNotFound && !editing && (
              <p className="text-sm text-muted-foreground mb-4">{t('debt.noSchedule')}</p>
            )}
            {isCC ? (
              <CCScheduleForm
                accountId={accountId}
                defaultValues={ccDefaults}
                onSuccess={() => setEditing(false)}
              />
            ) : (
              <LoanScheduleForm
                accountId={accountId}
                initialMode={schedule?.isSimplified ? 'simplified' : 'full'}
                defaultValues={loanDefaults}
                onSuccess={() => setEditing(false)}
              />
            )}
          </>
        ) : null}
      </section>

      {/* Payoff simulation / amortization table */}
      {hasSchedule && !editing && (
        <section className="bg-muted/30 rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            {isCC ? t('debt.payoffSimulation') : t('debt.amortization')}
          </h3>
          <AmortizationTable accountId={accountId} isRevolving={isCC} />
        </section>
      )}

      {/* What-if calculator */}
      {hasSchedule && !editing && (
        <section className="bg-muted/30 rounded-xl border border-border p-5">
          <h3 className="text-sm font-semibold text-foreground mb-1">{t('debt.whatIf')}</h3>
          <p className="text-sm text-muted-foreground mb-4">
            {isCC ? t('debt.whatIfDescCC') : t('debt.whatIfDesc')}
          </p>
          <ExtraPaymentCalculator accountId={accountId} />
        </section>
      )}
    </div>
  );
}

// ─── DebtDetailModal ──────────────────────────────────────────────────────────

export function DebtDetailModal({
  accountId,
  open,
  onClose,
}: {
  accountId: string | null;
  open: boolean;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const { data: accounts = [] } = useAccounts();
  const account = accountId ? accounts.find((a) => a.id === accountId) : null;

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {account
              ? t('debt.titleWithAccount', { name: account.name })
              : t('debt.title')}
          </DialogTitle>
          {account && (
            <p className="text-sm text-muted-foreground">
              {t(`accounts.types.${account.type}`)}
            </p>
          )}
        </DialogHeader>
        {accountId && <DebtDetailContent accountId={accountId} />}
      </DialogContent>
    </Dialog>
  );
}

// Keep a named page export so the existing route still works as a fallback.
export { DebtDetailModal as DebtDetailPage };
