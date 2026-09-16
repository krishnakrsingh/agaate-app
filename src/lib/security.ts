/**
 * COMPATIBILITY SHIM: canonical request security is @/infrastructure/security.
 * Do not add new callers.
 */
export {
  getClientIp,
  assertSameOrigin,
  assertSafeStorageKey,
} from "@/infrastructure/security";

