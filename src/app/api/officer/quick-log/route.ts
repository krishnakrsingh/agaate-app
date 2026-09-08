import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { utcDateOnly } from "@/lib/business";
import { sendNotification } from "@/lib/notifications";

const quickLogSchema = z.object({
  farmId: z.string().min(1),
  plotId: z.string().optional().nullable(),
  cropCycleId: z.string().optional().nullable(),
  category: z.enum([
    "IRRIGATION",
    "FERTIGATION",
    "SPRAYING",
    "WEEDING",
    "PRUNING",
    "FIELD_MAINTENANCE",
    "CROP_SCOUTING",
    "OTHER",
  ]),
  title: z.string().min(2).max(200),
  durationMinutes: z.coerce.number().int().min(5).max(1440).default(60),
  inventoryItemId: z.string().optional().nullable(),
  inventoryQuantity: z.coerce.number().positive().optional().nullable(),
  notes: z.string().max(2000).optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["FARM_OFFICER", "FARM_ADMIN", "SUPER_ADMIN"]);
    const body = await request.json();
    const input = quickLogSchema.parse(body);

    await requireFarmAccess(input.farmId);

    const now = new Date();
    const today = utcDateOnly(now);

    // Map category to Prisma TaskCategory
    const categoryMap: Record<string, any> = {
      IRRIGATION: "IRRIGATION_RECOMMENDATION",
      FERTIGATION: "FERTIGATION",
      SPRAYING: "PREVENTIVE_SPRAY",
      WEEDING: "CULTURAL_PRACTICE",
      PRUNING: "CULTURAL_PRACTICE",
      FIELD_MAINTENANCE: "CULTURAL_PRACTICE",
      CROP_SCOUTING: "CROP_MONITORING",
      OTHER: "CROP_SPECIFIC",
    };

    const taskCategory = categoryMap[input.category] || "CROP_SPECIFIC";

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create completed task
      const task = await tx.task.create({
        data: {
          farmId: input.farmId,
          plotId: input.plotId || null,
          cropCycleId: input.cropCycleId || null,
          origin: "DAILY_MONITORING",
          category: taskCategory,
          title: `[Quick Log] ${input.title}`,
          description: input.notes || `Direct field execution logged by ${actor.name} (${input.durationMinutes} min).`,
          priority: "MEDIUM",
          dueDate: today,
          status: "COMPLETED",
          assignedOfficerId: actor.id,
          createdById: actor.id,
        },
      });

      // 2. Create execution record
      const startedAt = new Date(now.getTime() - input.durationMinutes * 60 * 1000);
      await tx.taskExecution.create({
        data: {
          taskId: task.id,
          officerId: actor.id,
          status: "COMPLETED",
          startedAt,
          completedAt: now,
          remarks: input.notes || "Completed via Field Quick Logger.",
        },
      });

      // 3. If inventory item was consumed, deduct stock and create transaction
      if (input.inventoryItemId && input.inventoryQuantity) {
        const item = await tx.inventoryItem.findUnique({
          where: { id: input.inventoryItemId },
        });

        if (item && item.farmId === input.farmId) {
          const newQty = Number(item.quantityInStock) - input.inventoryQuantity;
          await tx.inventoryItem.update({
            where: { id: input.inventoryItemId },
            data: { quantityInStock: Math.max(0, newQty) },
          });

          await tx.inventoryTransaction.create({
            data: {
              itemId: item.id,
              type: "STOCK_OUT",
              quantity: input.inventoryQuantity,
              notes: `Consumed for Quick Log Task: ${input.title}`,
            },
          });
        }
      }

      return task;
    });

    await audit(actor.id, "CREATE", "Task", result.id, {
      quickLog: true,
      category: input.category,
      farmId: input.farmId,
    });

    // Check if consumed item dropped below safety reorder threshold
    if (input.inventoryItemId && input.inventoryQuantity) {
      const updatedItem = await prisma.inventoryItem.findUnique({
        where: { id: input.inventoryItemId },
        include: { farm: { select: { name: true } } },
      });

      if (
        updatedItem &&
        updatedItem.reorderLevel != null &&
        Number(updatedItem.quantityInStock) <= Number(updatedItem.reorderLevel)
      ) {
        await sendNotification({
          type: "LOW_STOCK_ALERT",
          recipientEmail: actor.email,
          recipientName: "Farm Owner & Procurement",
          title: `Low Stock Alert: ${updatedItem.name} at ${updatedItem.farm.name}`,
          message: `Remaining stock for ${updatedItem.name} is ${updatedItem.quantityInStock} ${updatedItem.unit} (Threshold: ${updatedItem.reorderLevel} ${updatedItem.unit}). Please arrange reorder.`,
          metadata: {
            farmId: input.farmId,
            itemId: updatedItem.id,
            remainingStock: updatedItem.quantityInStock,
            unit: updatedItem.unit,
          },
        });
      }
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
