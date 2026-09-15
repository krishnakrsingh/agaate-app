import type { Permission, RoleTier, AccessScope } from "@/lib/rbac";
import { ROLE_CATALOG, ROLE_PERMISSIONS } from "@/lib/rbac";
import type { Role } from "@prisma/client";

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

import type { PrismaClient } from "@prisma/client";

/** Map custom HQ role to a legacy enum for nav compat. */
export function legacyRoleForDefinition(slug: string, tier: RoleTier): Role {
  const system = SYSTEM_ROLE_DEFINITIONS.find((r) => r.slug === slug);
  if (system) return system.legacyRole;
  if (tier === "hq") return "AGRONOMIST";
  if (tier === "client") return "FARM_ADMIN";
  return "FARM_OFFICER";
}

export async function loadRoleDefinitionForAssignment(prisma: PrismaClient, roleDefinitionId: string) {
  const def = await prisma.roleDefinition.findUniqueOrThrow({ where: { id: roleDefinitionId } });
  if (!def.active) throw new Error("Selected role is inactive.");
  return {
    roleDefinitionId: def.id,
    role: legacyRoleForDefinition(def.slug, def.tier as RoleTier),
    scope: def.scope as AccessScope,
    tier: def.tier as RoleTier,
    slug: def.slug,
  };
}
