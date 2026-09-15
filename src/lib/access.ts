import "server-only";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { actorHasPermission, requireActiveUser, type Actor } from "@/lib/actor";
import type { Permission } from "@/lib/rbac";

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }

const platformReadRoles = new Set<Role>(["SUPER_ADMIN", "OPERATIONS_MANAGER", "AGRONOMIST"]);

export async function currentActor(): Promise<Actor> {
  return requireActiveUser();
}

export function requireRole(actor: Actor | { role: Role }, allowed: Role[]) {
  if (actor.role !== "SUPER_ADMIN" && !allowed.includes(actor.role)) {
    throw new HttpError(403, "You do not have permission for this action.");
  }
}

export function requirePermission(actor: Actor, permission: Permission) {
  if (!actorHasPermission(actor, permission)) {
    throw new HttpError(403, "You do not have permission for this action.");
  }
}

export async function requireFarmAccess(farmId: string, manage = false) {
  const user = await currentActor();
  if (actorHasPermission(user, "platform:admin")) return user;
  if (!manage && (platformReadRoles.has(user.role) || user.permissions.includes("farms:read_all"))) return user;
  const access = await prisma.farmAccess.findUnique({ where: { userId_farmId: { userId: user.id, farmId } } });
  if (!access || (manage && !access.canManage)) throw new HttpError(403, "You do not have access to this farm.");
  return user;
}

export async function accessibleFarmWhere() {
  const user = await currentActor();
  if (platformReadRoles.has(user.role) || user.permissions.includes("farms:read_all")) {
    return {};
  }
  return { access: { some: { userId: user.id } } };
}
