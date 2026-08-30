import "server-only";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
export async function audit(actorId: string | null, action: string, entityType: string, entityId: string, metadata?: Prisma.InputJsonValue) { await prisma.auditLog.create({ data: { actorId, action, entityType, entityId, metadata } }); }
