import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Account, CreateAccountInput } from '../types';
import { useCreateAccount, useUpdateAccount } from '../hooks/useAccounts';
import { useAuthStore } from '@features/auth/stores/authStore';
import { ACCOUNT_TYPES, inferIsAsset } from '../constants';

// 31-colour palette + 1 "none" (white) slot = 32 swatches, 4 rows of 8
const PALETTE = [
  '#fca5a5', '#ef4444', '#b91c1c', '#7f1d1d',
  '#fdba74', '#f97316', '#c2410c',
  '#fde047', '#eab308', '#a16207', '#713f12',
  '#86efac', '#22c55e', '#15803d', '#14532d',
  '#5eead4', '#14b8a6', '#0f766e', '#134e4a',
  '#93c5fd', '#3b82f6', '#1d4ed8', '#1e3a8a',
  '#c4b5fd', '#8b5cf6', '#6d28d9', '#4c1d95',
  '#d1d5db', '#6b7280', '#374151', '#111827',
];

const accountSchema = z.object({
  name: z.string().min(1, 'required').max(255),
  type: z.enum(['checking', 'savings', 'credit_card', 'loan', 'line_of_credit', 'mortgage', 'investment', 'other']),
  startingBalance: z.number().default(0),
  currency: z.string().length(3, 'Must be a 3-letter code (e.g. USD)').default('USD'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal('')),
  institution: z.string().max(255).optional(),
  annualRatePct: z.number().min(0).max(999.99).nullable().optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountFormProps {
  account?: Account;
  onSuccess: () => void;
  onCancel: () => void;
}

const inputClass =
  'w-full border border-border rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring';

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const { t } = useTranslation();
  const isEditing = Boolean(account);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const { user } = useAuthStore();
  const defaultCurrency = user?.defaultCurrency ?? 'CAD';

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          startingBalance: account.startingBalance,
          currency: account.currency,
          color: account.color ?? '',
          institution: account.institution ?? '',
          annualRatePct: account.annualRate != null ? account.annualRate * 100 : null,
        }
      : {
          type: 'checking',
          startingBalance: 0,
          currency: defaultCurrency,
          annualRatePct: null,
        },
  });

  const watchedType = watch('type');
  const watchedStartingBalance = watch('startingBalance');
  const watchedColor = watch('color') ?? '';
  const isAsset = inferIsAsset(watchedType);
  const startingBalanceChanged =
    isEditing && account && watchedStartingBalance !== account.startingBalance;

  async function onSubmit(data: AccountFormData) {
    const annualRate = data.annualRatePct != null ? data.annualRatePct / 100 : null;
    const computedIsAsset = inferIsAsset(data.type);

    if (isEditing && account) {
      await updateAccount.mutateAsync({
        id: account.id,
        data: {
          name: data.name,
          type: data.type,
          isAsset: computedIsAsset,
          startingBalance: data.startingBalance,
          currency: data.currency.toUpperCase(),
          color: data.color || null,
          institution: data.institution || null,
          annualRate,
        },
      });
    } else {
      const input: CreateAccountInput = {
        name: data.name,
        type: data.type,
        isAsset: computedIsAsset,
        startingBalance: data.startingBalance,
        currency: data.currency.toUpperCase(),
        color: data.color || undefined,
        institution: data.institution || undefined,
        annualRate: annualRate ?? undefined,
      };
      await createAccount.mutateAsync(input);
    }
    onSuccess();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

      {/* Account Name */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {t('accounts.form.name')}
        </label>
        <input
          {...register('name')}
          className={inputClass}
          placeholder={t('accounts.form.namePlaceholder')}
          autoFocus
        />
        {errors.name && <p className="text-destructive text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Institution */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-1">
          {t('accounts.form.institution')}{' '}
          <span className="font-normal text-muted-foreground">{t('accounts.form.optional')}</span>
        </label>
        <input
          {...register('institution')}
          className={inputClass}
          placeholder={t('accounts.form.institutionPlaceholder')}
        />
      </div>

      {/* Currency + Interest Rate */}
      <div className="flex gap-3">
        <div className="w-24 flex-shrink-0">
          <label className="block text-sm font-medium text-foreground mb-1">
            {t('accounts.form.currency')}
          </label>
          <input
            {...register('currency')}
            className={inputClass}
            placeholder="USD"
            maxLength={3}
            style={{ textTransform: 'uppercase' }}
          />
          {errors.currency && <p className="text-destructive text-xs mt-1">{errors.currency.message}</p>}
        </div>

        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-1 truncate">
            {isAsset ? t('accounts.form.interestRateAsset') : t('accounts.form.interestRateDebt')}
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            max="999.99"
            {...register('annualRatePct', {
              valueAsNumber: true,
              setValueAs: (v) => (v === '' ? null : Number(v)),
            })}
            className={inputClass}
            placeholder="e.g. 5.25"
          />
          {errors.annualRatePct && (
            <p className="text-destructive text-xs mt-1">{errors.annualRatePct.message}</p>
          )}
        </div>
      </div>
      {!isAsset && (
        <div className="rounded-lg bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-foreground">
          {t('accounts.form.interestInfoDebt')}
        </div>
      )}
      <p className="text-muted-foreground text-xs -mt-2">
        {isAsset ? t('accounts.form.aprHintAsset') : t('accounts.form.aprHintDebt')}
      </p>

      {/* Colour palette */}
      <div>
        <label className="block text-sm font-medium text-foreground mb-2">
          {t('accounts.form.color')}{' '}
          <span className="font-normal text-muted-foreground">{t('accounts.form.optional')}</span>
        </label>
        <div className="grid grid-cols-8 gap-1.5">
          {/* "None" swatch */}
          <button
            type="button"
            onClick={() => setValue('color', '', { shouldValidate: true })}
            className={`h-7 w-full rounded-md border-2 transition-all ${
              !watchedColor
                ? 'border-foreground/50 ring-2 ring-foreground/20 scale-110'
                : 'border-border hover:scale-110 hover:border-foreground/20'
            }`}
            style={{ backgroundColor: '#ffffff' }}
            title="No colour"
          />
          {PALETTE.map((hex) => (
            <button
              key={hex}
              type="button"
              onClick={() => setValue('color', hex, { shouldValidate: true })}
              className={`h-7 w-full rounded-md border-2 transition-all ${
                watchedColor === hex
                  ? 'border-foreground/60 ring-2 ring-foreground/20 scale-110'
                  : 'border-transparent hover:scale-110 hover:border-foreground/20'
              }`}
              style={{ backgroundColor: hex }}
              title={hex}
            />
          ))}
        </div>
      </div>

      {/* Advanced options toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAdvanced((v) => !v)}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          {showAdvanced ? t('accounts.form.hideAdvanced') : t('accounts.form.showAdvanced')}
        </button>

        {showAdvanced && (
          <div className="mt-3 space-y-4 pl-4 border-l border-border">
            {/* Account Type */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('accounts.form.type')}
              </label>
              <select {...register('type')} className={inputClass}>
                {ACCOUNT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {t(`accounts.types.${type}`)}
                  </option>
                ))}
              </select>
              {errors.type && <p className="text-destructive text-xs mt-1">{errors.type.message}</p>}
            </div>

            {/* Starting Balance */}
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">
                {t('accounts.form.startingBalance')}
              </label>
              <input
                type="number"
                step="0.01"
                {...register('startingBalance', { valueAsNumber: true })}
                className={inputClass}
              />
              {isEditing && startingBalanceChanged && (
                <p className="text-primary text-xs mt-1">
                  {t('accounts.form.startingBalanceChanged')}
                </p>
              )}
              {errors.startingBalance && (
                <p className="text-destructive text-xs mt-1">{errors.startingBalance.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-border rounded-lg px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-primary text-primary-foreground rounded-lg px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
        >
          {isSubmitting
            ? t('accounts.form.saving')
            : isEditing
            ? t('accounts.form.updateAccount')
            : t('accounts.form.createAccount')}
        </button>
      </div>
    </form>
  );
}
