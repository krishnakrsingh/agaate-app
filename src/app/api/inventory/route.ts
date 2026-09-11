import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, HttpError } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, paginatedJson, paginationParams } from "@/lib/api";

const createItemSchema = z.object({
  farmId: z.string().min(1),
  name: z.string().min(2).max(200),
  category: z.enum(["FERTILIZER", "PESTICIDE", "SEED", "IRRIGATION", "PACKAGING", "TOOLS", "OTHER"]),
  quantity: z.coerce.number().min(0),
  unit: z.string().min(1).default("KG"),
  reorderLevel: z.coerce.number().min(0).optional().nullable(),
  costPerUnit: z.coerce.number().min(0).optional().nullable(),
});

const transactionSchema = z.object({
  itemId: z.string().min(1),
  type: z.enum(["STOCK_IN", "STOCK_OUT", "ADJUSTMENT"]),
  quantity: z.coerce.number().positive(),
  notes: z.string().optional().nullable(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    const { searchParams } = new URL(request.url);
    const farmId = searchParams.get("farmId");
    const { limit, offset } = paginationParams(searchParams);
    const category = searchParams.get("category")?.trim();
    const stock = searchParams.get("stock")?.trim();
    const q = searchParams.get("search")?.trim();

    let where: any = {};
    if (farmId) {
      await requireFarmAccess(farmId);
      where.farmId = farmId;
    } else if (actor.role === "FARM_ADMIN" || actor.role === "FARM_OFFICER") {
      where.farm = { access: { some: { userId: actor.id } } };
    }
    if (category && category !== "ALL") where.category = category;
    if (q) where.name = { contains: q };

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true } },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { name: "asc" },
      take: limit,
      skip: offset,
      }),
      prisma.inventoryItem.count({ where }),
    ]);

    const enriched = items.map((item) => {
      const stock = Number(item.quantityInStock);
      const reorder = item.reorderLevel ? Number(item.reorderLevel) : null;
      const isLowStock = reorder != null && stock <= reorder;
      return {
        ...item,
        isLowStock,
      };
    });
    const filtered = stock === "LOW" ? enriched.filter((i) => i.isLowStock) : enriched;

    return paginatedJson(filtered, stock === "LOW" ? filtered.length + offset : total);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    const body = await request.json();

    // Check if it's creating an item or a transaction
    if (body.itemId) {
      const { assertSameOrigin } = await import("@/lib/security");
      assertSameOrigin(request);
      const input = transactionSchema.parse(body);
      const item = await prisma.inventoryItem.findUnique({ where: { id: input.itemId } });
      if (!item) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });

      await requireFarmAccess(item.farmId, true);

      const roundedQty = Math.round(input.quantity * 100) / 100;
      const updated = await prisma.$transaction(async (tx) => {
        const fresh = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
        if (!fresh) throw new HttpError(404, "The requested record was not found.");
        const current = Number(fresh.quantityInStock);
        const next = input.type === "STOCK_OUT" ? current - roundedQty : current + roundedQty;
        if (input.type === "STOCK_OUT" && next < 0) {
          throw new HttpError(409, "Insufficient stock in shed.");
        }
        // Atomic guard: only write if stock hasn't moved under us.
        const write = await tx.inventoryItem.updateMany({
          where: { id: input.itemId, quantityInStock: fresh.quantityInStock },
          data: { quantityInStock: Math.round(next * 100) / 100 },
        });
        if (!write.count) throw new HttpError(409, "Insufficient stock in shed.");
        await tx.inventoryTransaction.create({
          data: {
            itemId: input.itemId,
            type: input.type,
            quantity: roundedQty,
            notes: input.notes || null,
          },
        });
        return tx.inventoryItem.findUniqueOrThrow({ where: { id: input.itemId } });
      });

      await audit(actor.id, input.type, "InventoryItem", item.id, {
        quantity: roundedQty,
        newBalance: Number(updated.quantityInStock),
      });

      return NextResponse.json(updated);
    }

    // Creating a new inventory item in the shed
    const input = createItemSchema.parse(body);
    {
      const { assertSameOrigin } = await import("@/lib/security");
      assertSameOrigin(request);
    }
    await requireFarmAccess(input.farmId, true);

    const item = await prisma.inventoryItem.create({
      data: {
        farmId: input.farmId,
        name: input.name,
        category: input.category,
        quantityInStock: input.quantity,
        unit: input.unit.toUpperCase(),
        reorderLevel: input.reorderLevel ?? null,
        costPerUnit: input.costPerUnit ?? null,
        transactions: {
          create: {
            type: "STOCK_IN",
            quantity: input.quantity,
            notes: "Initial inventory stock-in",
          },
        },
      },
      include: {
        farm: { select: { id: true, name: true } },
      },
    });

    await audit(actor.id, "CREATE", "InventoryItem", item.id, {
      name: item.name,
      quantity: input.quantity,
    });

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
