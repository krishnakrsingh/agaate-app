import type { Role } from "@prisma/client";
import type { AccessScope, Permission, RoleTier } from "./rbac";
import { hasPermission, normalizePermissions, ROLE_CATALOG, ROLE_PERMISSIONS } from "./rbac";

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

export type RoleDefRow = {
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
  let rawPerms: unknown = row.permissions;
  if (typeof rawPerms === "string") {
    try {
      rawPerms = JSON.parse(rawPerms);
    } catch {
      rawPerms = [];
    }
  }
  return {
    id: row.id,
    slug: row.slug,
    label: row.label,
    description: row.description,
    tier: row.tier as RoleTier,
    scope: row.scope as AccessScope,
    permissions: normalizePermissions(Array.isArray(rawPerms) ? (rawPerms as string[]) : []),
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
  const fallback = user.role ? ROLE_CATALOG[user.role] : undefined;
  const rolePermissions = user.role && ROLE_PERMISSIONS[user.role] ? [...ROLE_PERMISSIONS[user.role]] : [];
  const permissions =
    user.role === "SUPER_ADMIN"
      ? rolePermissions
      : (def?.permissions && def.permissions.length > 0 ? def.permissions : rolePermissions);

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    active: user.active,
    clientId: user.clientId,
    roleDefinitionId: user.roleDefinitionId,
    roleSlug: def?.slug ?? user.role,
    roleLabel: def?.label ?? fallback?.label ?? user.role.replaceAll("_", " "),
    tier: def?.tier ?? fallback?.tier ?? "field",
    scope: def?.scope ?? fallback?.scope ?? "self",
    permissions,
  };
}

export function actorHasPermission(actor: Actor, permission: Permission): boolean {
  if (actor.role === "SUPER_ADMIN" || actor.permissions?.includes("platform:admin")) return true;
  return hasPermission(actor.permissions?.length ? actor.permissions : actor.role, permission);
}
