import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { labourHours } from "@/lib/business";
import { apiError } from "@/lib/api";

const schema = z.object({ remarks: z.string().max(2000).optional().nullable(), materials: z.array(z.object({ materialName: z.string().min(1).max(120), quantity: z.coerce.number().positive(), unit: z.string().min(1).max(30) })).max(30).default([]), labour: z.array(z.object({ labourers: z.coerce.number().int().positive().max(1000), hours: z.coerce.number().positive().max(24) })).max(20).default([]), mediaIds: z.array(z.string().min(1)).max(20).default([]), actualBedsCreated: z.coerce.number().nonnegative().optional(), actualPlants: z.coerce.number().nonnegative().optional() });

export async function POST(request: NextRequest, { params }: { params: Promise<{ taskId: string }> }) {
  try {
    const { taskId } = await params;
    const actor = await currentActor();
    requireRole(actor.role, ["FARM_OFFICER", "SUPER_ADMIN"]);
    const task = await prisma.task.findUniqueOrThrow({ where: { id: taskId }, include: { cropCycle: true, milestone: true } });
    await requireFarmAccess(task.farmId);
    if (actor.role === "FARM_OFFICER" && task.assignedOfficerId !== actor.id) throw new Error("This task is assigned to another officer.");
    if (task.status !== "IN_PROGRESS") return NextResponse.json({ error: "Start the activity before recording completion." }, { status: 409 });
    const input = schema.parse(await request.json());
    if (input.actualBedsCreated !== undefined && (!task.cropCycleId || !/(land|bed) preparation/i.test(task.title))) return NextResponse.json({ error: "Actual bed count can only be recorded on a bed preparation activity." }, { status: 422 });
    if (input.actualPlants !== undefined && (!task.cropCycleId || !/(transplantation|transplant|direct sowing|sowing)/i.test(task.title))) return NextResponse.json({ error: "Actual plant count can only be recorded on a transplantation or sowing activity." }, { status: 422 });
    const execution = await prisma.$transaction(async tx => {
      const ex = await tx.taskExecution.upsert({ where: { taskId }, update: { officerId: actor.id, status: "COMPLETED", completedAt: new Date(), remarks: input.remarks, materials: { deleteMany: {}, create: input.materials }, labour: { deleteMany: {}, create: input.labour.map(l => ({ ...l, labourHours: labourHours(l.labourers, l.hours) })) } }, create: { taskId, officerId: actor.id, status: "COMPLETED", startedAt: new Date(), completedAt: new Date(), remarks: input.remarks, materials: { create: input.materials }, labour: { create: input.labour.map(l => ({ ...l, labourHours: labourHours(l.labourers, l.hours) })) } } });
      if (input.mediaIds.length) {
        const count = await tx.mediaAsset.updateMany({ where: { id: { in: input.mediaIds }, uploadedById: actor.id, kind: "ACTIVITY_EVIDENCE", executionId: null, verifiedAt: { not: null } }, data: { executionId: ex.id, farmId: task.farmId } });
        if (count.count !== input.mediaIds.length) throw new Error("One or more activity evidence files are unavailable or unverified.");
      }
      if (task.cropCycleId && (input.actualBedsCreated !== undefined || input.actualPlants !== undefined)) await tx.cropCycle.update({ where: { id: task.cropCycleId }, data: { ...(input.actualBedsCreated !== undefined ? { actualBedsCreated: input.actualBedsCreated } : {}), ...(input.actualPlants !== undefined ? { actualPlants: input.actualPlants } : {}) } });
      if (task.milestoneId) await tx.milestone.update({ where: { id: task.milestoneId }, data: { status: "COMPLETED", completedAt: new Date(), remarks: input.remarks ?? undefined } });
      await tx.task.update({ where: { id: taskId }, data: { status: "COMPLETED" } });
      return ex;
    });
    await audit(actor.id, "COMPLETE", "Task", taskId, { actualBedsCreated: input.actualBedsCreated, actualPlants: input.actualPlants });
    return NextResponse.json(execution);
  } catch (error) { return apiError(error); }
}
