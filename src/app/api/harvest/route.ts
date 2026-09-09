import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, paginatedJson, paginationParams } from "@/lib/api";
import { parseUtcDate } from "@/lib/business";

const createSchema = z.object({
  farmId: z.string().min(1),
  plotId: z.string().min(1),
  cropCycleId: z.string().optional().nullable(),
  harvestDate: z.string().min(1),
  quantity: z.coerce.number().positive().max(1000000),
  unit: z.enum(["KG", "CRATE", "CRATES", "QUINTAL", "TONNE", "BAG", "PIECE"]).default("KG"),
  grade: z.enum(["GRADE_A", "GRADE_B", "GRADE_C", "PROCESSING", "UNGRADED"]).default("GRADE_A"),
  buyerOrMarket: z.string().max(200).optional().nullable(),
  vehicleNumber: z.string().max(30).optional().nullable(),
  pricePerUnit: z.coerce.number().positive().max(10000000).optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
  photoKey: z.string().max(512).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get("farmId");
    const { limit, offset } = paginationParams(searchParams);
    const grade = searchParams.get("grade")?.trim();
    const q = searchParams.get("search")?.trim();
    const from = searchParams.get("from") || searchParams.get("dateFrom");
    const to = searchParams.get("to") || searchParams.get("dateTo");

    let where: any = {};
    if (farmId) {
      await requireFarmAccess(farmId);
      where.farmId = farmId;
    } else if (actor.role === "FARM_ADMIN" || actor.role === "FARM_OFFICER") {
      where.farm = { access: { some: { userId: actor.id } } };
    }
    if (grade && grade !== "ALL") where.grade = grade;
    if (q) where.OR = [{ buyerOrMarket: { contains: q } }, { notes: { contains: q } }, { vehicleNumber: { contains: q } }];
    if (from || to) {
      const range: any = {};
      if (from) range.gte = parseUtcDate(from);
      if (to) range.lte = parseUtcDate(to);
      where.harvestDate = range;
    }

    const [logs, total] = await Promise.all([
      prisma.harvestLog.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true } },
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
        createdBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { harvestDate: "desc" },
      take: limit,
      skip: offset,
      }),
      prisma.harvestLog.count({ where }),
    ]);

    return paginatedJson(logs, total);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { assertSameOrigin } = await import("@/lib/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    const body = await request.json();
    const input = createSchema.parse(body);

    // Field officers record harvest from the officer mobile logger; assigned
    // farm access suffices (plot-farm match + audit trail below).
    await requireFarmAccess(input.farmId);
    const plot = await prisma.plot.findUnique({ where: { id: input.plotId }, select: { farmId: true } });
    if (!plot || plot.farmId !== input.farmId) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    }

    let cropCycleId = input.cropCycleId;
    if (cropCycleId) {
      const cycle = await prisma.cropCycle.findUnique({ where: { id: cropCycleId }, select: { plotId: true, plot: { select: { farmId: true } } } });
      if (!cycle || cycle.plotId !== input.plotId || cycle.plot.farmId !== input.farmId) {
        return NextResponse.json({ error: "Validation failed" }, { status: 422 });
      }
    } else {
      const activeCycle = await prisma.cropCycle.findFirst({
        where: { plotId: input.plotId, status: "ACTIVE" },
        orderBy: { startDate: "desc" },
      });
      if (!activeCycle) {
        return NextResponse.json({ error: "Validation failed" }, { status: 422 });
      }
      cropCycleId = activeCycle.id;
    }

    let photoKey: string | null = null;
    if (input.photoKey) {
      const photo = (await prisma.mediaAsset.findUnique({ where: { id: input.photoKey } })) ?? (await prisma.mediaAsset.findUnique({ where: { storageKey: input.photoKey } }));
      if (!photo?.verifiedAt || photo.farmId !== input.farmId) {
        return NextResponse.json({ error: "Validation failed" }, { status: 422 });
      }
      photoKey = photo.storageKey;
    }

    const quantity = Math.round(input.quantity * 100) / 100;
    const price = input.pricePerUnit != null ? Math.round(input.pricePerUnit * 100) / 100 : null;
    const totalAmount = price != null ? Math.round(quantity * price * 100) / 100 : null;

    const log = await prisma.harvestLog.create({
      data: {
        farmId: input.farmId,
        plotId: input.plotId,
        cropCycleId: cropCycleId!,
        harvestDate: parseUtcDate(input.harvestDate),
        quantity,
        unit: input.unit,
        grade: input.grade,
        buyerOrMarket: input.buyerOrMarket || null,
        vehicleNumber: input.vehicleNumber || null,
        pricePerUnit: price,
        totalAmount,
        notes: input.notes || null,
        photoKey,
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
