/**
 * @deprecated Prefer importing from `@modules/auth`.
 * Legacy compatibility shim for role definition seeds and loaders.
 */
export {
  SYSTEM_ROLE_DEFINITIONS,
  slugifyRoleName,
  legacyRoleForDefinition,
  type RoleDefinitionSeed,
} from "@/modules/auth/domain/rolePolicy";

export { loadRoleDefinitionForAssignment } from "@/modules/auth/infrastructure/authQueries";
