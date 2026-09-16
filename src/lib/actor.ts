import "server-only";

/**
 * @deprecated Prefer importing from `@modules/auth`.
 * Legacy compatibility shim for Actor types and helpers.
 */
export {
  parseRoleDefinition,
  buildActor,
  actorHasPermission,
  type RoleDefinitionView,
  type Actor,
  type RoleDefRow,
} from "@/modules/auth/domain/actorPolicy";

export { actorSelect } from "@/modules/auth/infrastructure/authQueries";
