import "server-only";
import type { PrismaClient, Role } from "@prisma/client";
import { prisma } from "@infrastructure/db";
import { buildActor } from "../domain/actorPolicy";
import type { AccessScope, Permission, RoleTier } from "../domain/rbac";
import { legacyRoleForDefinition } from "../domain/rolePolicy";

export type Session = {
  userId: string;
  role: Role;
  roleSlug: string;
  roleLabel: string;
  permissions: Permission[];
  name: string;
};

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

export async function loadRoleDefinitionForAssignment(
  clientOrId: PrismaClient | string,
  roleDefinitionId?: string
) {
  const client = typeof clientOrId === "string" ? prisma : clientOrId;
  const id = typeof clientOrId === "string" ? clientOrId : roleDefinitionId!;
  const def = await client.roleDefinition.findUniqueOrThrow({ where: { id } });
  if (!def.active) throw new Error("Selected role is inactive.");
  return {
    roleDefinitionId: def.id,
    role: legacyRoleForDefinition(def.slug, def.tier as RoleTier),
    scope: def.scope as AccessScope,
    tier: def.tier as RoleTier,
    slug: def.slug,
  };
}

export async function loadUserForSession(userId: string): Promise<Session | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: actorSelect,
  });
  if (!user?.active) return null;
  if (user.roleDefinition && !user.roleDefinition.active) return null;
  const actor = buildActor(user);
  return {
    userId: actor.id,
    role: actor.role,
    roleSlug: actor.roleSlug,
    roleLabel: actor.roleLabel,
    permissions: actor.permissions,
    name: actor.name,
  };
}

export async function loadActiveUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: actorSelect,
  });
  if (!user?.active) throw new Error("Account is unavailable");
  if (user.roleDefinition && !user.roleDefinition.active) throw new Error("Account is unavailable");
  return buildActor(user);
}
