import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { parseUtcDate } from "@/lib/business";

const createSchema = z.object({
  farmId: z.string().min(1),
  plotId: z.string().min(1),
  cropCycleId: z.string().min(1),
  harvestDate: z.string().min(1),
  quantity: z.coerce.number().positive(),
  unit: z.string().min(1).default("KG"),
  grade: z.string().min(1).default("GRADE_A"),
  buyerOrMarket: z.string().optional().nullable(),
  vehicleNumber: z.string().optional().nullable(),
  pricePerUnit: z.coerce.number().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  photoKey: z.string().optional().nullable(),
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

    const logs = await prisma.harvestLog.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true } },
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { harvestDate: "desc" },
      take: 100,
    });

    return NextResponse.json(logs);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    const body = await request.json();
    const input = createSchema.parse(body);

    await requireFarmAccess(input.farmId);

    const totalAmount = input.pricePerUnit ? input.quantity * input.pricePerUnit : null;

    const log = await prisma.harvestLog.create({
      data: {
        farmId: input.farmId,
        plotId: input.plotId,
        cropCycleId: input.cropCycleId,
        harvestDate: parseUtcDate(input.harvestDate),
        quantity: input.quantity,
        unit: input.unit.toUpperCase(),
        grade: input.grade.toUpperCase(),
        buyerOrMarket: input.buyerOrMarket || null,
        vehicleNumber: input.vehicleNumber || null,
        pricePerUnit: input.pricePerUnit || null,
        totalAmount,
        notes: input.notes || null,
        photoKey: input.photoKey || null,
        createdById: actor.id,
      },
      include: {
        farm: { select: { id: true, name: true } },
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
      },
    });

    await audit(actor.id, "CREATE", "HarvestLog", log.id, {
      quantity: input.quantity,
      unit: input.unit,
      grade: input.grade,
      farmId: input.farmId,
    });

    return NextResponse.json(log, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
