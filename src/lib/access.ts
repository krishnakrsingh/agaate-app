import "server-only";

/**
 * @deprecated Prefer importing from `@modules/auth`.
 * Legacy compatibility shim for access control helpers.
 */
export {
  HttpError,
  currentActor,
  requireRole,
  requirePermission,
  requireFarmAccess,
  accessibleFarmWhere,
} from "@/modules/auth/application/accessControl";
