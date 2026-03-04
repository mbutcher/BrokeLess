import type { AccountType } from './types';

export const ACCOUNT_TYPES: AccountType[] = [
  'checking', 'savings', 'credit_card', 'loan',
  'line_of_credit', 'mortgage', 'investment', 'other',
];

export const ASSET_TYPES: AccountType[] = [
  'checking', 'savings', 'investment', 'other',
];

export const LIABILITY_TYPES: AccountType[] = [
  'credit_card', 'loan', 'line_of_credit', 'mortgage',
];

export function inferIsAsset(type: AccountType): boolean {
  return ASSET_TYPES.includes(type);
}
