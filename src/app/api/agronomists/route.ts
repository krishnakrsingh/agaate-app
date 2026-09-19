import { NextRequest } from "next/server";
import { currentActor, requirePermission } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { apiError, paginatedJson, paginationParams } from "@infrastructure/http";

/**
 * HQ agronomist directory: profile + farm assignments + workload + activity.
 * Assignment changes reuse PATCH /api/users/:id {farmIds, managesFarmIds}.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requirePermission(actor, "internal_team:manage");
    const sp = request.nextUrl.searchParams;
    const { limit, offset } = paginationParams(sp);
    const search = sp.get("search")?.trim() || null;
    const activeParam = sp.get("active");

    const where: any = { role: "AGRONOMIST" };
    if (activeParam === "true") where.active = true;
    else if (activeParam === "false") where.active = false;
    if (search) {
      where.AND = [
        { OR: [{ name: { contains: search, mode: "insensitive" } }, { email: { contains: search, mode: "insensitive" } }, { phone: { contains: search, mode: "insensitive" } }] },
      ];
    }

    const [total, agronomists] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true, name: true, email: true, phone: true, active: true, createdAt: true,
          farmAccess: {
            select: {
              farmId: true, canManage: true,
              farm: { select: { id: true, name: true, location: true, status: true } },
            },
          },
        },
        orderBy: { name: "asc" },
        take: limit,
        skip: offset,
      }),
    ]);

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const shaped = await Promise.all(
      agronomists.map(async (a) => {
        const [openConversations, prescriptions30d, openCreatedTasks, unread] = await Promise.all([
          prisma.conversationParticipant.findMany({
            where: { userId: a.id },
            select: { conversationId: true, lastReadAt: true },
          }).then(async (parts) => {
            if (!parts.length) return { open: 0, unread: 0 };
            const open = await prisma.conversation.count({
              where: { id: { in: parts.map((p) => p.conversationId) }, status: "OPEN" },
            });
            const unreadCounts = await Promise.all(
              parts.map((p) =>
                prisma.chatMessage.count({
                  where: {
                    conversationId: p.conversationId,
                    deletedAt: null,
                    senderId: { not: a.id },
                    ...(p.lastReadAt ? { createdAt: { gt: p.lastReadAt } } : {}),
                  },
                })
              )
            );
            return { open, unread: unreadCounts.reduce((s, n) => s + n, 0) };
          }),
          prisma.agronomyPrescription.count({ where: { authorId: a.id, createdAt: { gte: thirtyDaysAgo } } }),
          prisma.task.count({ where: { createdById: a.id, status: { in: ["ASSIGNED", "IN_PROGRESS", "BLOCKED"] } } }),
          prisma.chatNotification.count({ where: { userId: a.id, readAt: null } }),
        ]);
        return {
          ...a,
          farms: a.farmAccess,
          leadFarms: a.farmAccess.filter((f) => f.canManage),
          workload: {
            openConversations: openConversations.open,
            unreadMessages: openConversations.unread,
            pendingNotifications: unread,
            prescriptions30d,
            openCreatedTasks,
          },
        };
      })
    );

    return paginatedJson(shaped, total);
  } catch (error) {
    return apiError(error);
  }
}
