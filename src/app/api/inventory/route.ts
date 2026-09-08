import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

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

    let where: any = {};
    if (farmId) {
      await requireFarmAccess(farmId);
      where.farmId = farmId;
    } else if (actor.role === "FARM_ADMIN" || actor.role === "FARM_OFFICER") {
      where.farm = { access: { some: { userId: actor.id } } };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      include: {
        farm: { select: { id: true, name: true } },
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 5,
        },
      },
      orderBy: { name: "asc" },
    });

    const enriched = items.map((item) => {
      const stock = Number(item.quantityInStock);
      const reorder = item.reorderLevel ? Number(item.reorderLevel) : null;
      const isLowStock = reorder != null && stock <= reorder;
      return {
        ...item,
        isLowStock,
      };
    });

    return NextResponse.json(enriched);
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
      const input = transactionSchema.parse(body);
      const item = await prisma.inventoryItem.findUniqueOrThrow({
        where: { id: input.itemId },
      });

      await requireFarmAccess(item.farmId);

      const delta = input.type === "STOCK_OUT" ? -input.quantity : input.quantity;
      const newQuantity = Number(item.quantityInStock) + delta;

      if (newQuantity < 0) {
        throw new Error(`Insufficient stock in shed. Current stock: ${item.quantityInStock} ${item.unit}`);
      }

      const updated = await prisma.$transaction(async (tx) => {
        await tx.inventoryTransaction.create({
          data: {
            itemId: input.itemId,
            type: input.type,
            quantity: input.quantity,
            notes: input.notes || null,
          },
        });

        return tx.inventoryItem.update({
          where: { id: input.itemId },
          data: { quantityInStock: newQuantity },
        });
      });

      await audit(actor.id, input.type, "InventoryItem", item.id, {
        quantity: input.quantity,
        newBalance: newQuantity,
      });

      return NextResponse.json(updated);
    }

    // Creating a new inventory item in the shed
    const input = createItemSchema.parse(body);
    await requireFarmAccess(input.farmId);

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
