import type { AccountType } from '@features/core/types';

/**
 * Infer a likely account type and asset/liability classification from an
 * account name and optional SimpleFIN type string.
 *
 * Intentionally duplicated from the backend utility — no shared code between FE/BE.
 * Pure function — no side effects.
 */
export function detectAccountType(
  name: string,
  simplefinType?: string
): { type: AccountType; isAsset: boolean } {
  const text = `${name} ${simplefinType ?? ''}`.toLowerCase();

  if (/credit.?card|visa|mastercard|amex|american express|discover/.test(text))
    return { type: 'credit_card', isAsset: false };
  if (/line.?of.?credit|\bloc\b|heloc|personal line/.test(text))
    return { type: 'line_of_credit', isAsset: false };
  if (/mortgage/.test(text))
    return { type: 'mortgage', isAsset: false };
  if (/\bloan\b/.test(text))
    return { type: 'loan', isAsset: false };
  if (/saving|hisa|tfsa/.test(text))
    return { type: 'savings', isAsset: true };
  if (/invest|brokerage|rrsp|resp|\bira\b|401k|403b/.test(text))
    return { type: 'investment', isAsset: true };
  if (/chequ|check/.test(text))
    return { type: 'checking', isAsset: true };

  return { type: 'other', isAsset: true };
}
