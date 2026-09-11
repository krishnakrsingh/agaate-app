import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

const bulkSchema = z.object({
  taskIds: z.array(z.string().min(1)).min(1).max(200),
  action: z.enum(["ASSIGN", "STATUS"]),
  status: z.enum(["ASSIGNED", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]).optional(),
  assignedOfficerId: z.string().min(1).optional().nullable(),
  // Safety: caller must echo the exact selection count it previewed.
  expectedCount: z.number().int().min(1).max(200).optional(),
});

/**
 * Bulk task operations — answers "what happens with 500 records" without
 * forcing 500 individual PATCH calls. Bounded (200 IDs), permission-checked
 * per farm, reports per-item success/failure instead of failing silently.
 */
export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_ADMIN"]);
    const input = bulkSchema.parse(await request.json());
    if (input.expectedCount != null && input.expectedCount !== input.taskIds.length) {
      return NextResponse.json({ error: "Selection changed while confirming. Review the preview and retry." }, { status: 409 });
    }
    if (input.action === "STATUS" && !input.status) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    }
    if (input.action === "ASSIGN" && !input.assignedOfficerId) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    }

    const tasks = await prisma.task.findMany({ where: { id: { in: input.taskIds } }, select: { id: true, farmId: true } });
    const found = new Set(tasks.map((t) => t.id));
    const missing = input.taskIds.filter((id) => !found.has(id));
    // Farm-level permission check for every touched farm (no silent cross-farm writes).
    const farmIds = [...new Set(tasks.map((t) => t.farmId))];
    for (const farmId of farmIds) await requireFarmAccess(farmId, true);

    const data: any = {};
    if (input.action === "STATUS") data.status = input.status;
    if (input.action === "ASSIGN") data.assignedOfficerId = input.assignedOfficerId;

    const result = await prisma.task.updateMany({ where: { id: { in: tasks.map((t) => t.id) } }, data });
    await audit(actor.id, "BULK_UPDATE", "Task", `${result.count}-tasks`, {
      action: input.action,
      status: input.status ?? null,
      requested: input.taskIds.length,
      updated: result.count,
    });
    return NextResponse.json({ updated: result.count, missing });
  } catch (error) {
    return apiError(error);
  }
}
