import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { utcDateOnly } from "@/lib/business";

const officerTaskSchema = z.object({
  farmId: z.string().min(1),
  plotId: z.string().optional().nullable(),
  cropCycleId: z.string().optional().nullable(),
  category: z.string().default("CROP_SPECIFIC"),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  instructions: z.string().max(2000).optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("HIGH"),
  startImmediately: z.boolean().default(false),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["FARM_OFFICER", "FARM_ADMIN", "SUPER_ADMIN"]);
    const body = await request.json();
    const input = officerTaskSchema.parse(body);

    await requireFarmAccess(input.farmId);

    const now = new Date();
    const today = utcDateOnly(now);

    const result = await prisma.$transaction(async (tx) => {
      const task = await tx.task.create({
        data: {
          farmId: input.farmId,
          plotId: input.plotId || null,
          cropCycleId: input.cropCycleId || null,
          origin: "DAILY_MONITORING",
          category: input.category,
          title: input.title,
          description: input.description || `Field task logged directly by ${actor.name}.`,
          instructions: input.instructions || null,
          priority: input.priority,
          dueDate: today,
          status: input.startImmediately ? "IN_PROGRESS" : "ASSIGNED",
          assignedOfficerId: actor.id,
          createdById: actor.id,
        },
        include: {
          farm: { select: { id: true, name: true } },
          plot: { select: { id: true, name: true } },
          cropCycle: { select: { id: true, cropName: true } },
        },
      });

      if (input.startImmediately) {
        await tx.taskExecution.create({
          data: {
            taskId: task.id,
            officerId: actor.id,
            status: "IN_PROGRESS",
            startedAt: now,
            remarks: "Directly initiated upon creation.",
          },
        });
      }

      return task;
    });

    await audit(actor.id, "CREATE", "Task", result.id, {
      farmId: result.farmId,
      origin: "DAILY_MONITORING",
      adHoc: true,
      priority: input.priority,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
