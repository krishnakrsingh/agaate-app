import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, noStore, paginationParams } from "@/lib/api";
import { parseUtcDate } from "@/lib/business";

const createSchema = z.object({
  farmId: z.string().min(1),
  date: z.string().min(1),
  category: z.enum(["LABOUR_WAGES", "INPUTS", "MACHINERY_FUEL", "ELECTRICITY", "REPAIRS", "OTHER"]),
  amount: z.coerce.number().positive(),
  description: z.string().min(2).max(1000),
  receiptKey: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get("farmId");
    const { limit, offset } = paginationParams(searchParams);
    const category = searchParams.get("category")?.trim();
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
    if (category && category !== "ALL") where.category = category;
    if (q) where.description = { contains: q };
    if (from || to) {
      const range: any = {};
      if (from) range.gte = parseUtcDate(from);
      if (to) range.lte = parseUtcDate(to);
      where.date = range;
    }

    const [expenses, total] = await Promise.all([
      prisma.expenseLog.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true } },
        recordedBy: { select: { id: true, name: true, role: true } },
      },
      orderBy: { date: "desc" },
      take: limit,
      skip: offset,
      }),
      prisma.expenseLog.count({ where }),
    ]);

    const categorySums = await prisma.expenseLog.groupBy({
      by: ["category"],
      where,
      _sum: { amount: true },
    });

    const totalBurn = categorySums.reduce(
      (acc, curr) => acc + Number(curr._sum.amount || 0),
      0
    );

    return NextResponse.json({
      expenses,
      categorySums: categorySums.map((c) => ({
        category: c.category,
        total: Number(c._sum.amount || 0),
      })),
      totalBurn,
      total,
    }, { headers: { ...noStore, "X-Total-Count": String(total) } });
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

    await requireFarmAccess(input.farmId, true);
    let receiptKey: string | null = null;
    if (input.receiptKey) {
      const receipt = (await prisma.mediaAsset.findUnique({ where: { id: input.receiptKey } })) ?? (await prisma.mediaAsset.findUnique({ where: { storageKey: input.receiptKey } }));
      if (!receipt?.verifiedAt || receipt.farmId !== input.farmId || !["ACTIVITY_EVIDENCE", "CROP_PHOTO", "INCIDENT_PHOTO"].includes(receipt.kind)) {
        return NextResponse.json({ error: "Validation failed" }, { status: 422 });
      }
      receiptKey = receipt.storageKey;
    }

    const expense = await prisma.expenseLog.create({
      data: {
        farmId: input.farmId,
        date: parseUtcDate(input.date),
        category: input.category,
        amount: Math.round(input.amount * 100) / 100,
        description: input.description,
        receiptKey,
        recordedById: actor.id,
      },
      include: {
        farm: { select: { id: true, name: true } },
      },
    });

    await audit(actor.id, "CREATE", "ExpenseLog", expense.id, {
      category: input.category,
      amount: input.amount,
      farmId: input.farmId,
    });

    return NextResponse.json(expense, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
