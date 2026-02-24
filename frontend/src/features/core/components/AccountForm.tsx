import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Account, CreateAccountInput } from '../types';
import { useCreateAccount, useUpdateAccount } from '../hooks/useAccounts';
import { getApiErrorMessage } from '@lib/api/errors';
import { useAuthStore } from '@features/auth/stores/authStore';

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Chequing' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'loan', label: 'Loan' },
  { value: 'line_of_credit', label: 'Line of Credit' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
] as const;

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['checking', 'savings', 'credit_card', 'loan', 'line_of_credit', 'mortgage', 'investment', 'other']),
  isAsset: z.boolean(),
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
  'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500';

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const isEditing = Boolean(account);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();
  const { user } = useAuthStore();
  const defaultCurrency = user?.defaultCurrency ?? 'CAD';

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormData>({
    resolver: zodResolver(accountSchema),
    defaultValues: account
      ? {
          name: account.name,
          type: account.type,
          isAsset: account.isAsset,
          startingBalance: account.startingBalance,
          currency: account.currency,
          color: account.color ?? '',
          institution: account.institution ?? '',
          annualRatePct: account.annualRate != null ? account.annualRate * 100 : null,
        }
      : {
          type: 'checking',
          isAsset: true,
          startingBalance: 0,
          currency: defaultCurrency,
          annualRatePct: null,
        },
  });

  const error = createAccount.error ?? updateAccount.error;
  const [watchedStartingBalance, watchedIsAsset] = watch(['startingBalance', 'isAsset']);
  const startingBalanceChanged =
    isEditing && account && watchedStartingBalance !== account.startingBalance;

  async function onSubmit(data: AccountFormData) {
    const annualRate = data.annualRatePct != null ? data.annualRatePct / 100 : null;
    if (isEditing && account) {
      await updateAccount.mutateAsync({
        id: account.id,
        data: {
          name: data.name,
          type: data.type,
          isAsset: data.isAsset,
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
        isAsset: data.isAsset,
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
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
          {getApiErrorMessage(error)}
        </div>
      )}

      {/* Account Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
        <input
          {...register('name')}
          className={inputClass}
          placeholder="e.g. TD Chequing"
        />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {/* Account Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
        <select {...register('type')} className={inputClass}>
          {ACCOUNT_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        {errors.type && <p className="text-red-500 text-xs mt-1">{errors.type.message}</p>}
      </div>

      {/* Asset / Liability toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Account Role</label>
        <Controller
          name="isAsset"
          control={control}
          render={({ field }) => (
            <div className="flex rounded-lg border border-gray-300 overflow-hidden text-sm font-medium">
              <button
                type="button"
                onClick={() => field.onChange(true)}
                className={`flex-1 py-2 transition-colors ${
                  field.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Asset
                <span className="block text-xs font-normal opacity-80">Adds to net worth</span>
              </button>
              <button
                type="button"
                onClick={() => field.onChange(false)}
                className={`flex-1 py-2 border-l border-gray-300 transition-colors ${
                  !field.value
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-50'
                }`}
              >
                Liability
                <span className="block text-xs font-normal opacity-80">Subtracts from net worth</span>
              </button>
            </div>
          )}
        />
      </div>

      {/* Starting Balance */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Starting Balance</label>
        <input
          type="number"
          step="0.01"
          {...register('startingBalance', { valueAsNumber: true })}
          className={inputClass}
        />
        {isEditing && startingBalanceChanged && (
          <p className="text-blue-600 text-xs mt-1">
            Current balance will be adjusted by the same amount
          </p>
        )}
        {errors.startingBalance && (
          <p className="text-red-500 text-xs mt-1">{errors.startingBalance.message}</p>
        )}
      </div>

      {/* Currency */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Currency</label>
        <input
          {...register('currency')}
          className={inputClass}
          placeholder="USD"
          maxLength={3}
          style={{ textTransform: 'uppercase' }}
        />
        {errors.currency && <p className="text-red-500 text-xs mt-1">{errors.currency.message}</p>}
      </div>

      {/* Institution */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Institution <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          {...register('institution')}
          className={inputClass}
          placeholder="e.g. Chase Bank"
        />
      </div>

      {/* Interest Rate */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {watchedIsAsset ? (
            <>Interest Rate % <span className="font-normal text-gray-400">(optional)</span></>
          ) : (
            <>Annual Interest Rate (APR) % <span className="font-normal text-gray-400">(optional)</span></>
          )}
        </label>
        <input
          type="number"
          step="0.01"
          min="0"
          max="999.99"
          {...register('annualRatePct', { valueAsNumber: true, setValueAs: (v) => v === '' ? null : Number(v) })}
          className={inputClass}
          placeholder="e.g. 5.25"
        />
        {!watchedIsAsset && (
          <div className="mt-2 rounded-lg bg-blue-50 border border-blue-200 px-3 py-2 text-xs text-blue-800">
            Adding your APR lets us estimate your monthly interest charges and show you exactly how
            much sooner you could pay off this account — and how much interest you could save — by
            making extra payments.
          </div>
        )}
        <p className="text-gray-400 text-xs mt-1">
          {watchedIsAsset ? 'APY for savings/investments' : 'APR — check your statement or card agreement'}
        </p>
        {errors.annualRatePct && (
          <p className="text-red-500 text-xs mt-1">{errors.annualRatePct.message}</p>
        )}
      </div>

      {/* Color */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Color <span className="font-normal text-gray-400">(optional)</span>
        </label>
        <input
          type="color"
          {...register('color')}
          className="h-9 w-full border border-gray-300 rounded-lg px-1 py-1 cursor-pointer"
        />
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Account' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}
