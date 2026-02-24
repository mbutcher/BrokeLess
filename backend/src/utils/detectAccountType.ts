import type { AccountType } from '@typings/core.types';

/**
 * Infer a likely account type and asset/liability classification from an
 * account name and optional SimpleFIN type string.
 *
 * Used when auto-creating a new account during SimpleFIN import mapping.
 * Pure function — no side effects, no DB access.
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
