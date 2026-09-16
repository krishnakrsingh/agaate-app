/**
 * shared/dates — pure UTC date operations.
 * Framework-free, timezone-neutral calendar date arithmetic.
 */

export function utcDateOnly(date = new Date()): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

export function parseUtcDate(value: string | Date): Date {
  const d = typeof value === "string" ? new Date(value) : value;
  return utcDateOnly(d);
}

export function isWithinRollingSevenDays(value: Date, now = new Date()): boolean {
  const start = utcDateOnly(now);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  const candidate = utcDateOnly(value);
  return candidate >= start && candidate <= end;
}
