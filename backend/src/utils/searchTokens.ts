/**
 * Tokenises plaintext for HMAC-based search indexing.
 * All tokens are lowercase alphanumeric words of at least 2 characters.
 */
export function tokenize(text: string): string[] {
  return [...new Set(text.toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length >= 2))];
}

/**
 * Extracts search tokens from a transaction's payee and description fields.
 * Handles null values gracefully.
 */
export function extractSearchTokens(
  payee: string | null,
  description: string | null
): string[] {
  const combined = [payee, description].filter(Boolean).join(' ');
  if (!combined) return [];
  return tokenize(combined);
}
