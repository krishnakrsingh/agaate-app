/**
 * modules/auth — canonical public API for identity + authorization.
 *
 * Strangler step 1 (zero-risk): re-exports only. No logic moved.
 *
 * Separation enforced here:
 * - WHO IS THIS USER? .......... src/lib/auth.ts (session/JWT) + src/lib/actor.ts (buildActor)
 * - WHAT MAY THEY DO? ........... src/lib/rbac.ts (pure permission catalog, NO Prisma/Next)
 * - WHICH RESOURCE SCOPE? ....... src/lib/access.ts (requireFarmAccess / accessibleFarmWhere)
 *
 * Rules:
 * - Domain/application code checks permissions via requirePermission /
 *   actorHasPermission — never by comparing raw role strings.
 * - requireRole is legacy; prefer requirePermission for new code.
 * - rbac.ts must stay pure (no Prisma, no Next). Verified by arch test.
 */

export {
  buildActor,
  parseRoleDefinition,
  actorHasPermission,
  actorSelect,
  type Actor,
  type RoleDefinitionView,
} from "@/lib/actor";

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
} from "@/lib/rbac";

// Server-only: session + resource scoping (imports Prisma/Next — do not
// import this entrypoint from pure domain code or client components).
export { HttpError, currentActor, requireRole, requirePermission, requireFarmAccess, accessibleFarmWhere } from "@/lib/access";
