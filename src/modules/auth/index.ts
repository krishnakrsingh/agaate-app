/**
 * modules/auth — canonical public API for identity + authorization.
 *
 * Architecture layers:
 * - domain/ ........... pure RBAC catalog, role policy, actor policy (framework-free)
 * - application/ ...... access control, role/permission requirements, farm scoping
 * - infrastructure/ ... session management, JWT signing/verification, auth DB queries
 */

// Pure domain exports (RBAC, roles, actor policy)
export {
  ALL_ROLES,
  INTERNAL_ROLES,
  CLIENT_ROLES,
  ALL_PERMISSIONS,
  PERMISSION_GROUPS,
  ROLE_PERMISSIONS,
  ROLE_CATALOG,
  ASSIGNABLE_INTERNAL_ROLES,
  getRoleMeta,
  isValidPermission,
  normalizePermissions,
  hasPermission,
  permissionsForRole,
  roleUsesFarmAccess,
  resolveManageFarmIds,
  describeUserAccess,
  type Permission,
  type RoleTier,
  type AccessScope,
  type RoleMeta,
  type AccessLevelLabel,
} from "./domain/rbac";

export {
  buildActor,
  parseRoleDefinition,
  actorHasPermission,
  type Actor,
  type RoleDefinitionView,
  type RoleDefRow,
} from "./domain/actorPolicy";

export {
  SYSTEM_ROLE_DEFINITIONS,
  slugifyRoleName,
  legacyRoleForDefinition,
  type RoleDefinitionSeed,
} from "./domain/rolePolicy";

// Infrastructure exports
export {
  actorSelect,
  loadRoleDefinitionForAssignment,
  loadUserForSession,
  loadActiveUser,
  type Session,
} from "./infrastructure/authQueries";

export {
  signSessionToken,
  verifySessionToken,
} from "./infrastructure/jwt";

export {
  SESSION_COOKIE,
  SESSION_COOKIE_SECURE,
  testSessionContext,
  createSession,
  clearSession,
  getSession,
  requireSession,
  requireActiveUser,
} from "./infrastructure/session";

// Application exports
export {
  HttpError,
  currentActor,
  requireRole,
  requirePermission,
  requireFarmAccess,
  accessibleFarmWhere,
} from "./application/accessControl";
