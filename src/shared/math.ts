/**
 * shared/math — pure numeric and statistical helpers.
 */

export function variance(expected: number | null, actual: number | null): { amount: number; percentage: number | null } | null {
  if (expected == null || actual == null) return null;
  const amount = actual - expected;
  return {
    amount,
    percentage: expected === 0 ? null : (amount / expected) * 100,
  };
}
