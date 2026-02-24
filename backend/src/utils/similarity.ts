/**
 * Levenshtein-based string similarity utility.
 * No external dependencies — standard DP implementation.
 */

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;

  // Build (m+1) × (n+1) distance matrix initialised to base cases
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [];
    for (let j = 0; j <= n; j++) {
      dp[i]![j] = i === 0 ? j : j === 0 ? i : 0;
    }
  }

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i]![j] = dp[i - 1]![j - 1]!;
      } else {
        dp[i]![j] = 1 + Math.min(dp[i - 1]![j - 1]!, dp[i - 1]![j]!, dp[i]![j - 1]!);
      }
    }
  }

  return dp[m]![n]!;
}

/**
 * Returns a similarity ratio between 0.0 (completely different) and 1.0 (identical).
 * Case-insensitive comparison.
 */
export function similarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1.0;
  return 1 - levenshtein(a.toLowerCase(), b.toLowerCase()) / maxLen;
}
