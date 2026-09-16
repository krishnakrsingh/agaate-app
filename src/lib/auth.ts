import "server-only";

/**
 * @deprecated Prefer importing from `@modules/auth`.
 * Legacy compatibility shim for session and authentication.
 */
export {
  SESSION_COOKIE,
  SESSION_COOKIE_SECURE,
  testSessionContext,
  createSession,
  clearSession,
  getSession,
  requireSession,
  requireActiveUser,
} from "@/modules/auth/infrastructure/session";

export type { Session } from "@/modules/auth/infrastructure/authQueries";
