import type { AccountType } from './types';

export const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Chequing',
  savings: 'Savings',
  credit_card: 'Credit Card',
  loan: 'Loan',
  line_of_credit: 'Line of Credit',
  mortgage: 'Mortgage',
  investment: 'Investment',
  other: 'Other',
};
