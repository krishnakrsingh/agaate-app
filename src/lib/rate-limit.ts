/**
 * COMPATIBILITY SHIM: canonical rate-limiter is @/infrastructure/security.
 * Do not add new callers.
 */
export {
  acquireRateLimitSlot,
  throttle,
  resetRateLimit,
  clearRateLimitStore,
} from "@/infrastructure/security";

