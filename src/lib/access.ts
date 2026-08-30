import "server-only";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/auth";

export class HttpError extends Error { constructor(public status: number, message: string) { super(message); } }
const platformRoles = new Set<Role>(["SUPER_ADMIN", "AGRONOMIST"]);

export async function currentActor() { return requireActiveUser(); }
export function requireRole(role: Role, allowed: Role[]) { if (role !== "SUPER_ADMIN" && !allowed.includes(role)) throw new HttpError(403, "You do not have permission for this action."); }
export async function requireFarmAccess(farmId: string, manage = false) {
  const user = await currentActor();
  if (platformRoles.has(user.role)) return user;
  const access = await prisma.farmAccess.findUnique({ where: { userId_farmId: { userId: user.id, farmId } } });
  if (!access || (manage && !access.canManage)) throw new HttpError(403, "You do not have access to this farm.");
  return user;
}
export async function accessibleFarmWhere() {
  const user = await currentActor();
  return platformRoles.has(user.role) ? {} : { access: { some: { userId: user.id } } };
}
