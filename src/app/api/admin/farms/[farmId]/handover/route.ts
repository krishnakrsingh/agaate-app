import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ farmId: string }> }
) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const { farmId } = await context.params;

    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
      include: {
        client: {
          include: {
            users: {
              where: { role: "FARM_ADMIN" },
            },
          },
        },
        access: {
          include: { user: true },
        },
      },
    });

    if (!farm) {
      return NextResponse.json({ error: "Farm not found" }, { status: 404 });
    }

    const now = new Date();

    const updated = await prisma.$transaction(async (tx) => {
      // 1. Update Farm to HANDED_OVER and ACTIVE
      const f = await tx.farm.update({
        where: { id: farmId },
        data: {
          setupStage: "HANDED_OVER",
          setupProgress: 100,
          status: "ACTIVE",
          handedOverAt: now,
        },
      });

      // 2. Ensure Client's Farm Admin has FarmAccess
      if (farm.client && farm.client.users.length > 0) {
        for (const adminUser of farm.client.users) {
          await tx.farmAccess.upsert({
            where: {
              userId_farmId: {
                userId: adminUser.id,
                farmId: farm.id,
              },
            },
            update: {
              canManage: true,
            },
            create: {
              userId: adminUser.id,
              farmId: farm.id,
              canManage: true,
            },
          });

          // Ensure user is active
          if (!adminUser.active) {
            await tx.user.update({
              where: { id: adminUser.id },
              data: { active: true },
            });
          }
        }
      }

      return f;
    });

    await audit(actor.id, "UPDATE", "Farm", farm.id, {
      action: "HANDOVER_COMPLETED",
      setupStage: "HANDED_OVER",
      status: "ACTIVE",
      handedOverAt: now.toISOString(),
      clientName: farm.client?.name || farm.ownerName,
    });

    return NextResponse.json({
      success: true,
      farmId: updated.id,
      farmName: updated.name,
      clientName: farm.client?.name || farm.ownerName,
      handedOverAt: now.toISOString(),
      status: updated.status,
      setupStage: updated.setupStage,
    });
  } catch (error) {
    return apiError(error);
  }
}
