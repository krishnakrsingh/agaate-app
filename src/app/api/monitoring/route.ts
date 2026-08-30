import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { utcDateOnly } from "@/lib/business";

const schema = z.object({ farmId: z.string().min(1), plotId: z.string().min(1), cropCycleId: z.string().min(1), status: z.enum(["GOOD", "POOR"]), stage: z.enum(["Germination", "Establishment", "Vegetative", "Flowering", "Fruiting", "Harvesting"]), impactPercent: z.coerce.number().min(0).max(100).optional().nullable(), remarks: z.string().max(2000).optional().nullable(), mediaIds: z.array(z.string().min(1)).min(1).max(10) }).superRefine((v, ctx) => { if (v.status === "POOR" && v.impactPercent == null) ctx.addIssue({ code: "custom", path: ["impactPercent"], message: "Impact percentage is required for a poor update." }); });

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["FARM_OFFICER", "SUPER_ADMIN"]);
    const input = schema.parse(await request.json());
    await requireFarmAccess(input.farmId);
    const cycle = await prisma.cropCycle.findFirst({ where: { id: input.cropCycleId, plotId: input.plotId, status: "ACTIVE", plot: { farmId: input.farmId, deletedAt: null, status: { not: "ARCHIVED" } } } });
    if (!cycle) throw new Error("The crop cycle must be active and belong to the selected farm and plot.");
    const monitoring = await prisma.$transaction(async tx => {
      const created = await tx.cropMonitoring.create({ data: { farmId: input.farmId, plotId: input.plotId, cropCycleId: input.cropCycleId, officerId: actor.id, status: input.status, stage: input.stage, impactPercent: input.impactPercent, remarks: input.remarks } });
      const count = await tx.mediaAsset.updateMany({ where: { id: { in: input.mediaIds }, uploadedById: actor.id, kind: "CROP_PHOTO", monitoringId: null, verifiedAt: { not: null } }, data: { monitoringId: created.id, farmId: input.farmId } });
      if (count.count !== input.mediaIds.length) throw new Error("One or more crop photos are unavailable or unverified.");
      const today = utcDateOnly(new Date());
      const tasks = await tx.task.findMany({
        where: {
          origin: "DAILY_MONITORING",
          cropCycleId: input.cropCycleId,
          dueDate: today,
          status: { in: ["ASSIGNED", "AVAILABLE", "IN_PROGRESS"] },
        },
      });
      for (const task of tasks) {
        await tx.task.update({ where: { id: task.id }, data: { status: "COMPLETED", assignedOfficerId: task.assignedOfficerId ?? actor.id } });
        await tx.taskExecution.upsert({
          where: { taskId: task.id },
          update: { officerId: actor.id, status: "COMPLETED", completedAt: new Date() },
          create: { taskId: task.id, officerId: actor.id, status: "COMPLETED", startedAt: new Date(), completedAt: new Date() },
        });
      }
      return created;
    });
    await audit(actor.id, "CREATE", "CropMonitoring", monitoring.id, { status: monitoring.status });
    return NextResponse.json(monitoring, { status: 201 });
  } catch (error) { return apiError(error); }
}
