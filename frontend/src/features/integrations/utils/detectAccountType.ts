import type { AccountType } from '@features/core/types';

/**
 * Infer a likely account type and asset/liability classification from an
 * account name and optional SimpleFIN type string.
 *
 * Handles English and French terms (Scotiabank and other Canadian banks send
 * French account-type strings via SimpleFIN). Normalizes Unicode diacritics
 * before matching so accented characters (é, è, ê, â…) work without
 * needing accent-specific patterns.
 *
 * Intentionally duplicated from the backend utility — no shared code between FE/BE.
 * Pure function — no side effects.
 */
export function detectAccountType(
  name: string,
  simplefinType?: string
): { type: AccountType; isAsset: boolean } {
  // Normalize Unicode diacritics (é→e, è→e, ê→e, â→a, etc.) for accent-insensitive matching.
  const raw = `${name} ${simplefinType ?? ''}`.toLowerCase();
  const text = raw.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  // Credit cards (EN + FR: "carte de credit")
  if (/credit.?card|visa|mastercard|amex|american express|discover|carte.?de.?credit/.test(text))
    return { type: 'credit_card', isAsset: false };

  // Line of credit (EN + FR: "marge de credit", "marge")
  if (/line.?of.?credit|\bloc\b|heloc|personal line|marge.?de.?credit|\bmarge\b/.test(text))
    return { type: 'line_of_credit', isAsset: false };

  // Mortgage (EN + FR: "hypotheque")
  if (/mortgage|hypotheque/.test(text))
    return { type: 'mortgage', isAsset: false };

  // Loans (EN + FR: "pret")
  if (/\bloan\b|\bpret\b/.test(text))
    return { type: 'loan', isAsset: false };

  // Savings (EN + FR: "epargne", CELI = TFSA, RELI)
  if (/saving|hisa|tfsa|celi|\bepargne\b/.test(text))
    return { type: 'savings', isAsset: true };

  // Investments (EN + FR: REER = RRSP, REEE = RESP)
  if (/invest|brokerage|rrsp|resp|\bira\b|401k|403b|reer|reee/.test(text))
    return { type: 'investment', isAsset: true };

  // Chequing / checking (EN + FR: "cheque", "cheques" — diacritics already stripped)
  if (/chequ|check/.test(text))
    return { type: 'checking', isAsset: true };

  return { type: 'other', isAsset: true };
}
