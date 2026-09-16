import type { Role } from "@prisma/client";
import type { AccessScope, Permission, RoleTier } from "./rbac";
import { ROLE_CATALOG, ROLE_PERMISSIONS } from "./rbac";

export type RoleDefinitionSeed = {
  slug: string;
  label: string;
  description: string;
  tier: RoleTier;
  scope: AccessScope;
  permissions: Permission[];
  isSystem: boolean;
  legacyRole: Role;
};

/** System roles seeded into RoleDefinition — mirrors rbac.ts catalog. */
export const SYSTEM_ROLE_DEFINITIONS: RoleDefinitionSeed[] = (
  Object.keys(ROLE_CATALOG) as Role[]
).map((legacyRole) => {
  const meta = ROLE_CATALOG[legacyRole];
  return {
    slug: legacyRole,
    label: meta.label,
    description: meta.description,
    tier: meta.tier,
    scope: meta.scope,
    permissions: [...ROLE_PERMISSIONS[legacyRole]],
    isSystem: true,
    legacyRole,
  };
});

export function slugifyRoleName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/** Map custom HQ role to a legacy enum for nav compat. */
export function legacyRoleForDefinition(slug: string, tier: RoleTier): Role {
  const system = SYSTEM_ROLE_DEFINITIONS.find((r) => r.slug === slug);
  if (system) return system.legacyRole;
  if (tier === "hq") return "AGRONOMIST";
  if (tier === "client") return "FARM_ADMIN";
  return "FARM_OFFICER";
}
