import "server-only";
import type { Role } from "@prisma/client";
import type { AccessScope, Permission, RoleTier } from "@/lib/rbac";
import { hasPermission, normalizePermissions } from "@/lib/rbac";

export type RoleDefinitionView = {
  id: string;
  slug: string;
  label: string;
  description: string;
  tier: RoleTier;
  scope: AccessScope;
  permissions: Permission[];
  isSystem: boolean;
  active: boolean;
};

export type Actor = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  clientId: string | null;
  roleDefinitionId: string | null;
  roleSlug: string;
  roleLabel: string;
  tier: RoleTier;
  scope: AccessScope;
  permissions: Permission[];
};

type RoleDefRow = {
  id: string;
  slug: string;
  label: string;
  description: string;
  tier: string;
  scope: string;
  permissions: unknown;
  isSystem: boolean;
  active: boolean;
};

export function parseRoleDefinition(row: RoleDefRow | null | undefined): RoleDefinitionView | null {
  if (!row) return null;
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    tier: row.tier as RoleTier,
    scope: row.scope as AccessScope,
    permissions: normalizePermissions(Array.isArray(row.permissions) ? (row.permissions as string[]) : []),
    isSystem: row.isSystem,
    active: row.active,
  };
}

export function buildActor(
  user: {
    id: string;
    name: string;
    email: string;
    role: Role;
    active: boolean;
    clientId: string | null;
    roleDefinitionId: string | null;
    roleDefinition?: RoleDefRow | null;
  }
): Actor {
  const def = parseRoleDefinition(user.roleDefinition);
  const permissions = def?.permissions ?? [];
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    clientId: user.clientId,
    roleDefinitionId: user.roleDefinitionId,
    roleSlug: def?.slug ?? user.role,
    roleLabel: def?.label ?? user.role.replaceAll("_", " "),
    tier: def?.tier ?? "field",
    scope: def?.scope ?? "self",
    permissions,
  };
}

export function actorHasPermission(actor: Actor, permission: Permission): boolean {
  return hasPermission(actor.permissions.length ? actor.permissions : actor.role, permission);
}

export const actorSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  active: true,
  clientId: true,
  roleDefinitionId: true,
  roleDefinition: {
    select: {
      id: true,
      slug: true,
      label: true,
      description: true,
      tier: true,
      scope: true,
      permissions: true,
      isSystem: true,
      active: true,
    },
  },
} as const;
