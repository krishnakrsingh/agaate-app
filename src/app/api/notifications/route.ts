import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { apiError, paginatedJson } from "@infrastructure/http";

const readSchema = z.object({
  ids: z.array(z.string().min(1)).max(100).optional(),
  allRead: z.boolean().optional(),
  conversationId: z.string().min(1).optional(),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER"]);
    const sp = request.nextUrl.searchParams;
    const unreadOnly = sp.get("unread") !== "false";
    const rawLimit = Number(sp.get("limit") ?? 30);
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 50) : 30;

    const where: any = { userId: actor.id };
    if (unreadOnly) where.readAt = null;

    const [total, items] = await Promise.all([
      prisma.chatNotification.count({ where }),
      prisma.chatNotification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
    ]);
    return paginatedJson(items, total);
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { assertSameOrigin } = await import("@infrastructure/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER"]);
    const input = readSchema.parse(await request.json());
    const now = new Date();
    if (input.allRead || input.conversationId) {
      await prisma.chatNotification.updateMany({
        where: {
          userId: actor.id,
          readAt: null,
          ...(input.conversationId ? { conversationId: input.conversationId } : {}),
        },
        data: { readAt: now },
      });
    } else if (input.ids?.length) {
      await prisma.chatNotification.updateMany({
        where: { userId: actor.id, id: { in: input.ids } },
        data: { readAt: now },
      });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
