import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole, requireFarmAccess } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { apiError } from "@infrastructure/http";

/**
 * Who can I talk to on this farm? Returns chattable people (agronomists +
 * fellow officers) plus my existing conversations there. Officers cannot hit
 * /api/users, so chat needs its own scoped roster.
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER", "FARM_ADMIN"]);
    const farmId = request.nextUrl.searchParams.get("farmId")?.trim();
    if (!farmId) throw new Error("Validation failed");
    await requireFarmAccess(farmId);

    const [farm, access] = await Promise.all([
      prisma.farm.findUniqueOrThrow({
        where: { id: farmId },
        select: { id: true, name: true, location: true },
      }),
      prisma.farmAccess.findMany({
        where: {
          farmId,
          user: { active: true, id: { not: actor.id }, role: { in: ["AGRONOMIST", "FARM_OFFICER", "SUPER_ADMIN", "FARM_ADMIN"] } },
        },
        select: {
          canManage: true,
          user: { select: { id: true, name: true, role: true } },
        },
      }),
    ]);

    const isSupervisory = actor.role === "SUPER_ADMIN" || actor.role === "AGRONOMIST";

    const mine = await prisma.conversation.findMany({
      where: {
        farmId,
        status: "OPEN",
        ...(isSupervisory
          ? {}
          : {
              id: {
                in: (
                  await prisma.conversationParticipant.findMany({
                    where: { userId: actor.id },
                    select: { conversationId: true },
                  })
                ).map((p) => p.conversationId),
              },
            }),
      },
      select: { id: true, subject: true, plotId: true, lastMessageAt: true },
      orderBy: { lastMessageAt: "desc" },
      take: 20,
    });

    const people = access.map((a) => ({
      userId: a.user.id,
      name: a.user.name,
      role: a.user.role,
      lead: a.canManage,
    }));

    // If no agronomist is explicitly assigned to this farm, include active central agronomists
    // so owners and officers can always consult agronomic staff.
    const hasAgronomist = people.some((p) => p.role === "AGRONOMIST");
    if (!hasAgronomist && actor.role !== "AGRONOMIST") {
      const centralAgronomists = await prisma.user.findMany({
        where: { role: "AGRONOMIST", active: true, id: { not: actor.id } },
        select: { id: true, name: true, role: true },
        take: 3,
      });
      for (const ag of centralAgronomists) {
        people.push({
          userId: ag.id,
          name: ag.name,
          role: ag.role,
          lead: false,
        });
      }
    }

    return NextResponse.json({
      farm,
      people,
      myConversations: mine,
    });
  } catch (error) {
    return apiError(error);
  }
}
