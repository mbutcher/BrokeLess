import type { RecurringFrequency } from '@features/core/types';

export function frequencyLabel(frequency: RecurringFrequency, interval?: number | null): string {
  switch (frequency) {
    case 'weekly':
      return 'Weekly';
    case 'biweekly':
      return 'Biweekly';
    case 'semi_monthly':
      return 'Twice monthly';
    case 'monthly':
      return 'Monthly';
    case 'annually':
      return 'Annually';
    case 'every_n_days':
      return interval ? `Every ${interval} days` : 'Every N days';
  }
}
