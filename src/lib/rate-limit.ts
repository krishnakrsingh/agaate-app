type RateLimitRecord = {
  attempts: number[];
};

const rateLimitStore = new Map<string, RateLimitRecord>();

/**
 * Checks if an action is permitted within the rate limit window.
 */
export function checkRateLimit(
  key: string,
  maxAttempts = 5,
  windowMs = 15 * 60 * 1000
): { allowed: boolean; remaining: number; retryAfterSeconds: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  const record = rateLimitStore.get(key);
  if (!record) {
    return { allowed: true, remaining: maxAttempts, retryAfterSeconds: 0 };
  }

  // Filter attempts within the active sliding window
  const activeAttempts = record.attempts.filter((timestamp) => timestamp > windowStart);
  rateLimitStore.set(key, { attempts: activeAttempts });

  if (activeAttempts.length >= maxAttempts) {
    const oldestAttempt = Math.min(...activeAttempts);
    const retryAfterMs = oldestAttempt + windowMs - now;
    const retryAfterSeconds = Math.max(1, Math.ceil(retryAfterMs / 1000));
    return { allowed: false, remaining: 0, retryAfterSeconds };
  }

  return {
    allowed: true,
    remaining: maxAttempts - activeAttempts.length,
    retryAfterSeconds: 0,
  };
}

/**
 * Records a failed attempt for the given key.
 */
export function recordFailedAttempt(key: string, windowMs = 15 * 60 * 1000): void {
  const now = Date.now();
  const windowStart = now - windowMs;
  const record = rateLimitStore.get(key) ?? { attempts: [] };
  const activeAttempts = record.attempts.filter((timestamp) => timestamp > windowStart);
  activeAttempts.push(now);
  rateLimitStore.set(key, { attempts: activeAttempts });
}

/**
 * Resets the rate limit counter upon successful authentication.
 */
export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

/**
 * Clears the entire store (primarily for unit tests).
 */
export function clearRateLimitStore(): void {
  rateLimitStore.clear();
}
