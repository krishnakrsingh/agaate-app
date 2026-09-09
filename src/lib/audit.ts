import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export async function audit(actorId: string | null, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) {
  try {
    await prisma.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } });
  } catch (error) {
    // Audit must never fail the user request or leak: log server-side only.
    console.error(`[audit-failed] ${action} ${entityType}:${entityId}`, error);
  }
}
