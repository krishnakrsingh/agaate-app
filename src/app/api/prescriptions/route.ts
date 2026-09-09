import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { parseUtcDate } from "@/lib/business";
import { sendNotification } from "@/lib/notifications";

const prescriptionSchema = z.object({
  farmId: z.string().min(1),
  plotId: z.string().min(1),
  cropCycleId: z.string().min(1),
  targetIssue: z.string().min(2).max(200),
  applicationDate: z.string().min(1),
  instructions: z.string().min(2).max(2000),
  priority: z.enum(["ROUTINE", "HIGH", "EMERGENCY"]).default("HIGH"),
  recipeDetails: z.array(
    z.object({
      materialName: z.string().min(1),
      dosage: z.string().min(1),
      waterVolume: z.string().optional(),
      notes: z.string().optional(),
    })
  ).min(1),
  assignedOfficerId: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get("farmId");

    let where: any = {};
    if (farmId) {
      await requireFarmAccess(farmId);
      where.farmId = farmId;
    } else if (actor.role === "FARM_ADMIN" || actor.role === "FARM_OFFICER") {
      where.farm = { access: { some: { userId: actor.id } } };
    }

    const prescriptions = await prisma.agronomyPrescription.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true } },
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
        author: { select: { id: true, name: true, role: true } },
      },
      orderBy: { applicationDate: "desc" },
      take: 50,
    });

    return NextResponse.json(prescriptions);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { assertSameOrigin } = await import("@/lib/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["AGRONOMIST", "SUPER_ADMIN", "FARM_ADMIN"]);

    const body = await request.json();
    const input = prescriptionSchema.parse(body);

    await requireFarmAccess(input.farmId);
    const plot = await prisma.plot.findUnique({ where: { id: input.plotId }, select: { farmId: true } });
    if (!plot || plot.farmId !== input.farmId) return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    const cycle = await prisma.cropCycle.findUnique({ where: { id: input.cropCycleId }, select: { plotId: true, plot: { select: { farmId: true } } } });
    if (!cycle || cycle.plotId !== input.plotId || cycle.plot.farmId !== input.farmId) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    }
    if (input.assignedOfficerId) {
      const officer = await prisma.user.findUnique({ where: { id: input.assignedOfficerId }, select: { role: true, active: true } });
      if (!officer?.active || officer.role !== "FARM_OFFICER") return NextResponse.json({ error: "Validation failed" }, { status: 422 });
      const hasAccess = await prisma.farmAccess.findUnique({ where: { userId_farmId: { userId: input.assignedOfficerId, farmId: input.farmId } } });
      if (!hasAccess) return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    }

    const appDate = parseUtcDate(input.applicationDate);

    const prescription = await prisma.$transaction(async (tx) => {
      const created = await tx.agronomyPrescription.create({
        data: {
          farmId: input.farmId,
          plotId: input.plotId,
          cropCycleId: input.cropCycleId,
          authorId: actor.id,
          targetIssue: input.targetIssue,
          recipeDetails: input.recipeDetails,
          applicationDate: appDate,
          instructions: input.instructions,
          priority: input.priority,
          status: "DISPATCHED",
        },
      });

      // Auto-dispatch high-priority Task for on-site farm officer
      const recipeSummary = input.recipeDetails
        .map((r) => `${r.materialName} @ ${r.dosage}${r.waterVolume ? ` (${r.waterVolume})` : ""}`)
        .join("; ");

      await tx.task.create({
        data: {
          farmId: input.farmId,
          plotId: input.plotId,
          cropCycleId: input.cropCycleId,
          origin: "AGRONOMIST",
          category: "Crop Protection & Nutrition",
          title: `Rx: ${input.targetIssue}`,
          description: `Agronomy Prescription: ${recipeSummary}`,
          instructions: input.instructions,
          priority: input.priority === "EMERGENCY" ? "URGENT" : input.priority,
          dueDate: appDate,
          status: "ASSIGNED",
          assignedOfficerId: input.assignedOfficerId || null,
          createdById: actor.id,
        },
      });

      return created;
    });

    await audit(actor.id, "CREATE", "AgronomyPrescription", prescription.id, {
      targetIssue: input.targetIssue,
      farmId: input.farmId,
    });

    if (input.priority === "HIGH" || input.priority === "EMERGENCY") {
      const farm = await prisma.farm.findUnique({
        where: { id: input.farmId },
        select: { name: true, access: { where: { canManage: true }, include: { user: { select: { email: true, name: true } } } } },
      });
      const assignee = input.assignedOfficerId ? await prisma.user.findUnique({ where: { id: input.assignedOfficerId }, select: { email: true, name: true } }) : null;
      const manager = farm?.access[0]?.user;
      const recipientEmail = assignee?.email ?? manager?.email;
      const recipientName = assignee?.name ?? manager?.name ?? "On-Site Farm Management Team";
      if (recipientEmail) {
        await sendNotification({
          type: "EMERGENCY_RX",
          recipientEmail,
          recipientName,
          title: `[${input.priority}] Agronomy Prescription Dispatched: ${input.targetIssue}`,
          message: `Agaate Agronomist ${actor.name} has dispatched a prescription for ${farm?.name || "the estate"}: "${input.instructions}"`,
          metadata: {
            farmId: input.farmId,
            plotId: input.plotId,
            priority: input.priority,
          },
        });
      }
    }

    return NextResponse.json(prescription, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
