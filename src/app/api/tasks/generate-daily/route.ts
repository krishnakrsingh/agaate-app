import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { parseUtcDate, utcDateOnly } from "@/lib/business";

const schema = z.object({
  farmId: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    if (actor.role !== "FARM_OFFICER" && actor.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Only Farm Officers can generate daily monitoring tasks." }, { status: 403 });
    }
    const body = await request.json().catch(() => ({}));
    const input = schema.parse(body);
    if (input.farmId) await requireFarmAccess(input.farmId);
    const requestedDate = input.date ? parseUtcDate(input.date) : utcDateOnly(new Date());

    const farmWhere = actor.role === "SUPER_ADMIN"
      ? { status: "ACTIVE" as const, ...(input.farmId ? { id: input.farmId } : {}) }
      : { status: "ACTIVE" as const, access: { some: { userId: actor.id } }, ...(input.farmId ? { id: input.farmId } : {}) };
    const farms = await prisma.farm.findMany({
      where: farmWhere,
      select: { id: true },
    });
    const farmIds = farms.map((f) => f.id);
    if (!farmIds.length) return NextResponse.json({ generated: 0, tasks: [] });

    const cycles = await prisma.cropCycle.findMany({
      where: { status: "ACTIVE", plot: { farmId: { in: farmIds }, deletedAt: null } },
      select: { id: true, cropName: true, plotId: true, plot: { select: { farmId: true } } },
    });

    const generated: string[] = [];
    for (const cycle of cycles) {
      const deterministicId = `daily_${cycle.id}_${requestedDate.toISOString().slice(0,10)}_${actor.id}`;
      // Idempotent check: deterministic id + legacy check for any daily task on same cycle/date/officer
      const existsById = await prisma.task.findUnique({ where: { id: deterministicId } });
      if (existsById) continue;
      const legacyExists = await prisma.task.findFirst({
        where: {
          origin: "DAILY_MONITORING",
          cropCycleId: cycle.id,
          dueDate: requestedDate,
          OR: [{ assignedOfficerId: actor.id }, { assignedOfficerId: null }],
        },
      });
      if (legacyExists) continue;
      const nextDay = new Date(requestedDate);
      nextDay.setUTCDate(nextDay.getUTCDate() + 1);
      const alreadyMonitored = await prisma.cropMonitoring.findFirst({
        where: { cropCycleId: cycle.id, createdAt: { gte: requestedDate, lt: nextDay } },
      });
      try {
        const task = await prisma.task.create({
          data: {
            id: deterministicId,
            farmId: cycle.plot.farmId,
            plotId: cycle.plotId,
            cropCycleId: cycle.id,
            origin: "DAILY_MONITORING",
            category: "CROP_MONITORING",
            title: `Daily monitoring \u00b7 ${cycle.cropName}`,
            description: "Record crop health, stage, remarks, and at least one photo.",
            dueDate: requestedDate,
            status: alreadyMonitored ? "COMPLETED" : "ASSIGNED",
            assignedOfficerId: actor.id,
            createdById: actor.id,
          },
        });
        generated.push(task.id);
      } catch (e) {
        // If duplicate due to race, ignore
        if (e instanceof Error && e.message.includes("Unique constraint")) continue;
        throw e;
      }
    }

    const tasks = await prisma.task.findMany({
      where: { id: { in: generated } },
      include: { farm: { select: { id: true, name: true } }, plot: { select: { id: true, name: true } }, cropCycle: { select: { id: true, cropName: true } } },
    });

    return NextResponse.json({ generated: generated.length, tasks });
  } catch (error) {
    return apiError(error);
  }
}
