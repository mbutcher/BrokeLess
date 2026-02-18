import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { Account, CreateAccountInput } from '../types';
import { useCreateAccount, useUpdateAccount } from '../hooks/useAccounts';
import { getApiErrorMessage } from '@lib/api/errors';

const ACCOUNT_TYPES = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'loan', label: 'Loan' },
  { value: 'mortgage', label: 'Mortgage' },
  { value: 'investment', label: 'Investment' },
  { value: 'other', label: 'Other' },
] as const;

const accountSchema = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  type: z.enum(['checking', 'savings', 'credit_card', 'loan', 'mortgage', 'investment', 'other']),
  isAsset: z.boolean(),
  startingBalance: z.number().default(0),
  currency: z.string().length(3).default('USD'),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().or(z.literal('')),
  institution: z.string().max(255).optional(),
});

type AccountFormData = z.infer<typeof accountSchema>;

interface AccountFormProps {
  account?: Account;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AccountForm({ account, onSuccess, onCancel }: AccountFormProps) {
  const isEditing = Boolean(account);
  const createAccount = useCreateAccount();
  const updateAccount = useUpdateAccount();

  const {
    register,
    handleSubmit,
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
        }
      : {
          type: 'checking',
          isAsset: true,
          startingBalance: 0,
          currency: 'USD',
        },
  });

  const error = createAccount.error ?? updateAccount.error;

  async function onSubmit(data: AccountFormData) {
    if (isEditing && account) {
      await updateAccount.mutateAsync({ id: account.id, data: { name: data.name, color: data.color || null, institution: data.institution || null } });
    } else {
      const input: CreateAccountInput = {
        name: data.name,
        type: data.type,
        isAsset: data.isAsset,
        startingBalance: data.startingBalance,
        currency: data.currency,
        color: data.color || undefined,
        institution: data.institution || undefined,
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Account Name</label>
        <input {...register('name')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Chase Checking" />
        {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
      </div>

      {!isEditing && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Account Type</label>
            <select {...register('type')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Starting Balance</label>
            <input type="number" step="0.01" {...register('startingBalance', { valueAsNumber: true })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Institution (optional)</label>
        <input {...register('institution')} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. Chase Bank" />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Color (optional)</label>
        <input type="color" {...register('color')} className="h-9 w-full border border-gray-300 rounded-lg px-1 py-1 cursor-pointer" />
      </div>

      <div className="flex gap-3 pt-2">
        <button type="button" onClick={onCancel} className="flex-1 border border-gray-300 rounded-lg px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Cancel
        </button>
        <button type="submit" disabled={isSubmitting} className="flex-1 bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
          {isSubmitting ? 'Saving...' : isEditing ? 'Update Account' : 'Create Account'}
        </button>
      </div>
    </form>
  );
}
