import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole, HttpError } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, paginationParams } from "@/lib/api";
import { isWithinRollingSevenDays, parseUtcDate } from "@/lib/business";

const schema = z.object({ farmId: z.string().min(1), plotId: z.string().min(1).optional().nullable(), cropCycleId: z.string().min(1).optional().nullable(), date: z.coerce.date(), category: z.enum(["FERTIGATION", "FOLIAR_NUTRITION", "SOIL_APPLICATION", "PREVENTIVE_SPRAY", "PEST_CONTROL", "DISEASE_CONTROL", "CROP_MONITORING", "IRRIGATION_RECOMMENDATION", "CULTURAL_PRACTICE", "CROP_SPECIFIC"]), title: z.string().min(3).max(160), description: z.string().min(3).max(2000), instructions: z.string().max(2000).optional().nullable(), priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]), assignedOfficerId: z.string().min(1) });

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const search = request.nextUrl ? request.nextUrl.searchParams : new URL(request.url).searchParams;
    const farmId = search.get("farmId");
    const day = search.get("date");
    if (farmId) await requireFarmAccess(farmId);

    const unrestricted = actor.role === "SUPER_ADMIN" || actor.role === "AGRONOMIST";
    const { limit, offset } = paginationParams(search);

    let where: any;
    if (actor.role === "FARM_OFFICER") {
      const officerFarms = await prisma.farm.findMany({
        where: { access: { some: { userId: actor.id } } },
        select: { id: true },
      });
      const officerFarmIds = officerFarms.map((f) => f.id);

      where = {
        ...(farmId ? { farmId } : { farmId: { in: officerFarmIds } }),
        ...(day ? { dueDate: parseUtcDate(day) } : {}),
        OR: [
          { assignedOfficerId: actor.id },
          { status: "AVAILABLE", assignedOfficerId: null },
        ],
      };
    } else {
      where = {
        ...(farmId ? { farmId } : unrestricted ? {} : { farm: { access: { some: { userId: actor.id } } } }),
        ...(day ? { dueDate: parseUtcDate(day) } : {}),
      };
    }

    return NextResponse.json(
      await prisma.task.findMany({
        where,
        include: {
          farm: { select: { id: true, name: true } },
          plot: { select: { id: true, name: true } },
          cropCycle: { select: { id: true, cropName: true } },
          milestone: { select: { id: true, name: true } },
          assignedOfficer: { select: { name: true } },
          executions: true,
        },
        orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
        take: limit,
        skip: offset,
      })
    );
  } catch (error) { return apiError(error); }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor(); requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST"]); const input = schema.parse(await request.json()); if (!isWithinRollingSevenDays(input.date)) throw new HttpError(422, "Agronomy activities must be planned within the rolling seven-day window."); await requireFarmAccess(input.farmId);
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: input.farmId }, select: { status: true } }); if (farm.status !== "ACTIVE") throw new Error("Agronomy activities can only be planned for an active farm.");
    const officer = await prisma.user.findUniqueOrThrow({ where: { id: input.assignedOfficerId }, select: { role: true, active: true, farmAccess: { where: { farmId: input.farmId } } } }); if (officer.role !== "FARM_OFFICER" || !officer.active || !officer.farmAccess.length) throw new Error("The assigned user must be an active Farm Officer assigned to this farm.");
    if (input.plotId && !await prisma.plot.findFirst({ where: { id: input.plotId, farmId: input.farmId, deletedAt: null } })) throw new Error("The selected plot is not part of this farm.");
    if (input.cropCycleId && !await prisma.cropCycle.findFirst({ where: { id: input.cropCycleId, plot: { farmId: input.farmId, deletedAt: null }, ...(input.plotId ? { plotId: input.plotId } : {}) } })) throw new Error("The selected crop cycle is not part of this farm and plot.");
    const task = await prisma.$transaction(async tx => { const plan = await tx.agronomyPlan.upsert({ where: { farmId_planDate: { farmId: input.farmId, planDate: input.date } }, update: {}, create: { farmId: input.farmId, planDate: input.date, createdById: actor.id } }); return tx.task.create({ data: { farmId: input.farmId, plotId: input.plotId, cropCycleId: input.cropCycleId, planId: plan.id, origin: "AGRONOMIST", category: input.category, title: input.title, description: input.description, instructions: input.instructions, priority: input.priority, dueDate: input.date, status: "ASSIGNED", assignedOfficerId: input.assignedOfficerId, createdById: actor.id } }); });
    await audit(actor.id, "CREATE", "Task", task.id, { farmId: task.farmId, origin: "AGRONOMIST" }); return NextResponse.json(task, { status: 201 });
  } catch (error) { return apiError(error); }
}
