import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, paginatedJson, paginationParams } from "@/lib/api";
import { parseUtcDate } from "@/lib/business";

const musterSchema = z.object({
  farmId: z.string().min(1),
  musterDate: z.string().min(1),
  totalLabourers: z.coerce.number().int().min(1),
  maleCount: z.coerce.number().int().min(0).optional().nullable(),
  femaleCount: z.coerce.number().int().min(0).optional().nullable(),
  hoursPerShift: z.coerce.number().positive().default(8.0),
  dailyWageRate: z.coerce.number().positive().optional().nullable(),
  contractorName: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get("farmId");
    const { limit, offset } = paginationParams(searchParams);
    const q = searchParams.get("search")?.trim();

    let where: any = {};
    if (farmId) {
      await requireFarmAccess(farmId);
      where.farmId = farmId;
    } else if (actor.role === "FARM_ADMIN" || actor.role === "FARM_OFFICER") {
      where.farm = { access: { some: { userId: actor.id } } };
    }
    if (q) where.OR = [{ contractorName: { contains: q } }, { notes: { contains: q } }];

    const [musters, total] = await Promise.all([
      prisma.dailyCrewMuster.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, name: true } },
      },
      orderBy: { musterDate: "desc" },
      take: limit,
      skip: offset,
      }),
      prisma.dailyCrewMuster.count({ where }),
    ]);

    return paginatedJson(musters, total);
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
    const input = musterSchema.parse(body);
    if (input.maleCount != null && input.femaleCount != null && input.maleCount + input.femaleCount !== input.totalLabourers) {
      return NextResponse.json({ error: "Validation failed" }, { status: 422 });
    }

    // Field officers muster crew from the officer mobile logger; assigned
    // farm access suffices (upsert is date-scoped, actor recorded below).
    await requireFarmAccess(input.farmId);

    const date = parseUtcDate(input.musterDate);
    const totalWageCost = input.dailyWageRate
      ? Math.round(input.totalLabourers * input.dailyWageRate * 100) / 100
      : null;

    const existing = await prisma.dailyCrewMuster.findUnique({ where: { farmId_musterDate: { farmId: input.farmId, musterDate: date } }, select: { id: true } });
    const muster = await prisma.dailyCrewMuster.upsert({
      where: {
        farmId_musterDate: {
          farmId: input.farmId,
          musterDate: date,
        },
      },
      update: {
        totalLabourers: input.totalLabourers,
        maleCount: input.maleCount ?? null,
        femaleCount: input.femaleCount ?? null,
        hoursPerShift: input.hoursPerShift,
        dailyWageRate: input.dailyWageRate ?? null,
        totalWageCost,
        contractorName: input.contractorName || null,
        notes: input.notes || null,
        recordedById: actor.id,
      },
      create: {
        farmId: input.farmId,
        musterDate: date,
        totalLabourers: input.totalLabourers,
        maleCount: input.maleCount ?? null,
        femaleCount: input.femaleCount ?? null,
        hoursPerShift: input.hoursPerShift,
        dailyWageRate: input.dailyWageRate ?? null,
        totalWageCost,
        contractorName: input.contractorName || null,
        notes: input.notes || null,
        recordedById: actor.id,
      },
      include: {
        farm: { select: { id: true, name: true } },
      },
    });

    await audit(actor.id, existing ? "UPDATE" : "CREATE", "DailyCrewMuster", muster.id, {
      totalLabourers: input.totalLabourers,
      farmId: input.farmId,
    });

    return NextResponse.json(muster, { status: existing ? 200 : 201 });
  } catch (error) {
    return apiError(error);
  }
}
