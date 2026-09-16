import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/db";

/**
 * infrastructure/audit/audit-service — canonical audit log persistence.
 *
 * Guaranteed non-throwing: audit failure never aborts user request or leaks
 * internal database failure to the client.
 */
export async function audit(
  actorId: string | null,
  action: string,
  entityType: string,
  entityId: string,
  metadata?: Prisma.InputJsonValue
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { actorId, action, entityType, entityId, metadata },
    });
  } catch (error) {
    console.error(`[audit-failed] ${action} ${entityType}:${entityId}`, error);
  }
}
