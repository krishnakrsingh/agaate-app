import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { calculatedInfrastructure } from "@/lib/business";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

const date = z.coerce.date();
const milestone = z.object({ id: z.string().min(1).optional(), name: z.string().min(2).max(120), targetDate: date, remarks: z.string().max(500).optional().nullable() });
const patchSchema = z.object({
  cropName: z.string().min(2).max(120).optional(),
  startDate: date.optional(),
  expectedFirstHarvestDate: date.optional().nullable(),
  establishmentType: z.enum(["NURSERY_TRANSPLANTATION", "DIRECT_SOWING"]).optional(),
  varieties: z.array(z.string().trim().min(1).max(80)).min(1).max(20).optional(),
  bedPreparationEnabled: z.boolean().optional(), bedWidthCm: z.coerce.number().positive().optional().nullable(),
  bedCenterDistanceCm: z.coerce.number().positive().optional().nullable(), expectedBedsPerAcre: z.coerce.number().positive().optional().nullable(),
  mulchEnabled: z.boolean().optional(), mulchHolePattern: z.enum(["SINGLE_LINE", "DOUBLE_LINE_ZIGZAG"]).optional().nullable(),
  plantDistanceCm: z.coerce.number().positive().optional().nullable(), expectedPlantsPerAcre: z.coerce.number().positive().optional().nullable(),
  milestones: z.array(milestone).min(3).optional()
});

export async function GET(_: NextRequest, { params }: { params: Promise<{ plotId: string; cycleId: string }> }) {
  try {
    const { plotId, cycleId } = await params;
    const plot = await prisma.plot.findUniqueOrThrow({ where: { id: plotId }, select: { farmId: true } });
    await requireFarmAccess(plot.farmId);
    const cycle = await prisma.cropCycle.findFirstOrThrow({ where: { id: cycleId, plotId }, include: { varieties: true, milestones: { orderBy: { targetDate: "asc" } } } });
    return NextResponse.json(cycle);
  } catch (error) { return apiError(error); }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ plotId: string; cycleId: string }> }) {
  try {
    const { plotId, cycleId } = await params;
    const cycle = await prisma.cropCycle.findFirstOrThrow({ where: { id: cycleId, plotId }, include: { plot: { select: { farmId: true, area: true } }, milestones: true } });
    const actor = await requireFarmAccess(cycle.plot.farmId, true);
    const input = patchSchema.parse(await request.json());
    const effectiveBeds = input.expectedBedsPerAcre !== undefined ? input.expectedBedsPerAcre : (cycle.expectedBedsPerAcre == null ? null : Number(cycle.expectedBedsPerAcre));
    const effectiveMulch = input.mulchEnabled !== undefined ? input.mulchEnabled : cycle.mulchEnabled;
    const effectivePattern = input.mulchHolePattern !== undefined ? input.mulchHolePattern : cycle.mulchHolePattern;
    const effectivePlantDistance = input.plantDistanceCm !== undefined ? input.plantDistanceCm : (cycle.plantDistanceCm == null ? null : Number(cycle.plantDistanceCm));
    if ((input.bedPreparationEnabled ?? cycle.bedPreparationEnabled) && effectiveBeds == null) throw new Error("Expected beds per acre is required when bed preparation is enabled.");
    if (effectiveMulch && (effectivePattern == null || effectivePlantDistance == null)) throw new Error("Mulch pattern and plant distance are required when mulching is enabled.");
    const effectivePlants = input.expectedPlantsPerAcre !== undefined ? input.expectedPlantsPerAcre : (cycle.expectedPlantsPerAcre == null ? null : Number(cycle.expectedPlantsPerAcre));
    if (input.milestones) { const required = ["Land Preparation", effectiveMulch ? "Mulching & TP / Sowing Readiness" : "TP / Sowing Readiness", (input.establishmentType ?? cycle.establishmentType) === "NURSERY_TRANSPLANTATION" ? "Transplantation" : "Direct Sowing", "First Harvest"]; if (!required.every(name => input.milestones!.some(m => m.name === name))) throw new Error("All four standard milestones must be retained."); }
    const calc = calculatedInfrastructure(Number(cycle.plot.area), effectiveBeds, effectivePlants);
    const updated = await prisma.$transaction(async tx => {
      const { varieties, milestones, ...base } = input;
      if (varieties) {
        await tx.cropVariety.deleteMany({ where: { cropCycleId: cycleId } });
        await tx.cropVariety.createMany({ data: [...new Set(varieties)].map(name => ({ cropCycleId: cycleId, name })) });
      }
      if (milestones) {
        const retained = milestones.filter(item => item.id).map(item => item.id!);
        const removed = cycle.milestones.filter(item => !retained.includes(item.id)).map(item => item.id);
        if (removed.length) { await tx.task.updateMany({ where: { milestoneId: { in: removed }, status: { in: ["DRAFT", "ASSIGNED", "AVAILABLE"] } }, data: { status: "CANCELLED", milestoneId: null } }); await tx.milestone.deleteMany({ where: { id: { in: removed } } }); }
        for (const item of milestones) {
          const existing = item.id && cycle.milestones.some(m => m.id === item.id) ? item.id : null;
          const saved = existing
            ? await tx.milestone.update({ where: { id: existing }, data: { name: item.name, targetDate: item.targetDate, remarks: item.remarks } })
            : await tx.milestone.create({ data: { cropCycleId: cycleId, name: item.name, targetDate: item.targetDate, remarks: item.remarks } });
          await tx.task.updateMany({ where: { milestoneId: saved.id, status: { in: ["DRAFT", "ASSIGNED", "AVAILABLE"] } }, data: { title: saved.name, dueDate: saved.targetDate, description: `Complete the ${saved.name} milestone.` } });
          if (!existing) await tx.task.create({ data: { farmId: cycle.plot.farmId, plotId, cropCycleId: cycleId, milestoneId: saved.id, origin: "SYSTEM", category: "MILESTONE", title: saved.name, description: `Complete the ${saved.name} milestone.`, dueDate: saved.targetDate, status: "AVAILABLE", createdById: actor.id } });
        }
      }
      return tx.cropCycle.update({ where: { id: cycleId }, data: { ...base, expectedTotalBeds: calc.expectedTotalBeds, expectedPlants: calc.expectedPlants }, include: { varieties: true, milestones: true } });
    });
    await audit(actor.id, "UPDATE", "CropCycle", cycleId, { plotId, varietiesChanged: Boolean(input.varieties), milestonesChanged: Boolean(input.milestones) });
    return NextResponse.json(updated);
  } catch (error) { return apiError(error); }
}

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ plotId: string; cycleId: string }> }) {
  try {
    const { plotId, cycleId } = await params;
    const cycle = await prisma.cropCycle.findFirstOrThrow({ where: { id: cycleId, plotId }, include: { plot: { select: { farmId: true } } } });
    const actor = await requireFarmAccess(cycle.plot.farmId, true);
    if (cycle.status === "ACTIVE") return NextResponse.json({ error: "An active crop cycle cannot be deleted." }, { status: 409 });
    await prisma.$transaction(async tx => { await tx.cropCycle.update({ where: { id: cycleId }, data: { status: "CANCELLED" } }); await tx.task.updateMany({ where: { cropCycleId: cycleId, status: { in: ["DRAFT", "ASSIGNED", "AVAILABLE"] } }, data: { status: "CANCELLED" } }); });
    await audit(actor.id, "CANCEL", "CropCycle", cycleId, { plotId });
    return new NextResponse(null, { status: 204 });
  } catch (error) { return apiError(error); }
}
