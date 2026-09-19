import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole, requireFarmAccess } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { audit } from "@infrastructure/audit";
import { apiError, paginatedJson } from "@infrastructure/http";
import { assertChattableRole, participantConversationIds } from "@modules/chat/access";
import { chatBroadcaster } from "@modules/chat/infrastructure/chatBroadcaster";

const createConversationSchema = z.object({
  farmId: z.string().min(1),
  plotId: z.string().min(1).optional().nullable(),
  cropCycleId: z.string().min(1).optional().nullable(),
  subject: z.string().min(2).max(120).optional().nullable(),
  participantIds: z.array(z.string().min(1)).min(1).max(10),
});

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER", "FARM_ADMIN"]);
    const sp = request.nextUrl.searchParams;
    const farmId = sp.get("farmId")?.trim() || null;
    const status = sp.get("status")?.trim() || null;
    const userId = sp.get("userId")?.trim() || null;
    const q = sp.get("q")?.trim() || null;

    if (farmId) await requireFarmAccess(farmId);

    const where: any = {};
    if (actor.role === "SUPER_ADMIN") {
      if (farmId) where.farmId = farmId;
      if (userId) {
        const parts = await prisma.conversationParticipant.findMany({
          where: { userId },
          select: { conversationId: true },
        });
        where.id = { in: parts.map((p) => p.conversationId) };
      }
    } else if (actor.role === "AGRONOMIST") {
      if (farmId) {
        where.farmId = farmId;
      } else {
        const myParts = await participantConversationIds(actor);
        where.OR = [
          { id: { in: myParts } },
          { farm: { access: { some: { userId: actor.id } } } },
        ];
      }
    } else {
      where.id = { in: await participantConversationIds(actor) };
      if (farmId) where.farmId = farmId;
    }
    if (status === "OPEN" || status === "CLOSED") where.status = status;
    if (q) {
      const qFilter = {
        OR: [
          { subject: { contains: q, mode: "insensitive" } },
          { farm: { name: { contains: q, mode: "insensitive" } } },
        ],
      };
      where.AND = [...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []), ...(where.OR ? [{ OR: where.OR }] : []), qFilter];
      delete where.OR;
    }

    const [total, conversations] = await Promise.all([
      prisma.conversation.count({ where }),
      prisma.conversation.findMany({
        where,
        include: {
          farm: { select: { id: true, name: true } },
        },
        orderBy: { lastMessageAt: "desc" },
        take: 50,
      }),
    ]);

    // Enrich with participants + last message + unread. Conversation lists
    // per user are small (tens); one batched pass, no per-row awaits in loop.
    const ids = conversations.map((c) => c.id);
    const [participants, lastMessages] = await Promise.all([
      prisma.conversationParticipant.findMany({
        where: { conversationId: { in: ids } },
      }),
      prisma.chatMessage.findMany({
        where: { conversationId: { in: ids }, deletedAt: null },
        orderBy: [{ conversationId: "asc" }, { createdAt: "desc" }],
        distinct: ["conversationId"],
      }),
    ]);
    const userIds = [...new Set(participants.map((p) => p.userId))];
    const users = userIds.length
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, role: true },
        })
      : [];
    const userById = new Map(users.map((u) => [u.id, u]));
    const lastByConv = new Map(lastMessages.map((m) => [m.conversationId, m]));
    const partsByConv = new Map<string, typeof participants>();
    for (const p of participants) {
      const arr = partsByConv.get(p.conversationId) ?? [];
      arr.push(p);
      partsByConv.set(p.conversationId, arr);
    }
    const meByConv = new Map(participants.filter((p) => p.userId === actor.id).map((p) => [p.conversationId, p]));

    let unread: { conversationId: string; _count: { _all: number } }[] = [];
    if (actor.role !== "SUPER_ADMIN") {
      unread = (await Promise.all(
        conversations.map((c) => {
          const me = meByConv.get(c.id);
          if (!me) return null;
          return prisma.chatMessage
            .count({
              where: {
                conversationId: c.id,
                deletedAt: null,
                senderId: { not: actor.id },
                ...(me.lastReadAt ? { createdAt: { gt: me.lastReadAt } } : {}),
              },
            })
            .then((count) => ({ conversationId: c.id, _count: { _all: count } }));
        }).filter(Boolean) as Promise<{ conversationId: string; _count: { _all: number } }>[]
      ));
    }
    const unreadByConv = new Map(unread.map((u) => [u.conversationId, u._count._all]));

    const shaped = conversations.map((c) => {
      const last = lastByConv.get(c.id);
      return {
        id: c.id,
        farmId: c.farmId,
        farmName: c.farm.name,
        plotId: c.plotId,
        cropCycleId: c.cropCycleId,
        subject: c.subject,
        status: c.status,
        lastMessageAt: c.lastMessageAt,
        unreadCount: unreadByConv.get(c.id) ?? 0,
        participants: (partsByConv.get(c.id) ?? []).map((p) => ({
          userId: p.userId,
          name: userById.get(p.userId)?.name ?? "Unknown",
          role: userById.get(p.userId)?.role ?? null,
          lastReadAt: p.lastReadAt,
        })),
        lastMessage: last
          ? {
              id: last.id,
              body: last.body.slice(0, 120),
              senderId: last.senderId,
              senderName: userById.get(last.senderId)?.name ?? "Unknown",
              createdAt: last.createdAt,
            }
          : null,
      };
    });

    return paginatedJson(shaped, total);
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const { assertSameOrigin, getClientIp, throttle } = await import("@infrastructure/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER", "FARM_ADMIN"]);
    const slot = throttle(`chat-create:${actor.id}`, 30, 60_000);
    if (!slot.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
    const input = createConversationSchema.parse(await request.json());
    assertChattableRole(actor.role);

    await requireFarmAccess(input.farmId);
    const farm = await prisma.farm.findUnique({ where: { id: input.farmId }, select: { id: true } });
    if (!farm) throw new Error("A selected farm no longer exists.");

    if (input.plotId) {
      const plot = await prisma.plot.findUnique({ where: { id: input.plotId }, select: { farmId: true } });
      if (!plot || plot.farmId !== input.farmId) throw new Error("The selected plot does not belong to this farm.");
    }
    if (input.cropCycleId) {
      const cycle = await prisma.cropCycle.findUnique({
        where: { id: input.cropCycleId },
        select: { plotId: true, plot: { select: { farmId: true } } },
      });
      if (!cycle || cycle.plot.farmId !== input.farmId || (input.plotId && cycle.plotId !== input.plotId)) {
        throw new Error("The selected crop does not belong to this farm.");
      }
    }

    // Every participant must exist, be active, hold a chattable role and have
    // farm access (explicit FarmAccess row or platform read for HQ).
    const memberIds = [...new Set([...input.participantIds, actor.id])];
    const members = await prisma.user.findMany({
      where: { id: { in: memberIds } },
      select: { id: true, role: true, active: true },
    });
    if (members.length !== memberIds.length) throw new Error("One or more selected people no longer exist.");
    for (const m of members) {
      if (!m.active) throw new Error("One or more selected people are no longer active.");
      assertChattableRole(m.role);
      if (m.role !== "SUPER_ADMIN" && m.role !== "AGRONOMIST") {
        const access = await prisma.farmAccess.findUnique({
          where: { userId_farmId: { userId: m.id, farmId: input.farmId } },
        });
        if (!access) throw new Error("One or more selected people do not have access to this farm.");
      }
      if (m.role === "AGRONOMIST") {
        await prisma.farmAccess.upsert({
          where: { userId_farmId: { userId: m.id, farmId: input.farmId } },
          update: {},
          create: { userId: m.id, farmId: input.farmId, canManage: false },
        });
      }
    }

    // Duplicate guard: an identical open thread (same farm, same scope, same
    // people) is resumed instead of forked. Both UIs "Chat" buttons funnel
    // here, so double-taps and repeat taps collapse onto one conversation.
    const scopeWhere: any = {
      farmId: input.farmId,
      status: "OPEN",
      plotId: input.plotId ?? null,
      cropCycleId: input.cropCycleId ?? null,
    };
    const openCandidates = await prisma.conversation.findMany({
      where: scopeWhere,
      select: { id: true },
      orderBy: { lastMessageAt: "desc" },
      take: 20,
    });
    if (openCandidates.length) {
      const parts = await prisma.conversationParticipant.findMany({
        where: { conversationId: { in: openCandidates.map((c) => c.id) } },
        select: { conversationId: true, userId: true },
      });
      const byConv = new Map<string, Set<string>>();
      for (const p of parts) {
        const s = byConv.get(p.conversationId) ?? new Set<string>();
        s.add(p.userId);
        byConv.set(p.conversationId, s);
      }
      const wanted = new Set(memberIds);
      for (const c of openCandidates) {
        const have = byConv.get(c.id) ?? new Set<string>();
        if (have.size === wanted.size && [...wanted].every((id) => have.has(id))) {
          const existing = await prisma.conversation.findUniqueOrThrow({ where: { id: c.id } });
          chatBroadcaster.broadcastConversationUpdate(input.farmId, existing);
          return NextResponse.json({ ...existing, reused: true });
        }
      }
    }

    const conversation = await prisma.$transaction(async (tx) => {
      const created = await tx.conversation.create({
        data: {
          farmId: input.farmId,
          plotId: input.plotId ?? null,
          cropCycleId: input.cropCycleId ?? null,
          subject: input.subject ?? null,
          createdById: actor.id,
        },
      });
      await tx.conversationParticipant.createMany({
        data: memberIds.map((userId) => ({ conversationId: created.id, userId })),
        skipDuplicates: true,
      });
      return created;
    });

    await audit(actor.id, "CONVERSATION_CREATE", "Conversation", conversation.id, { farmId: input.farmId });
    chatBroadcaster.broadcastConversationUpdate(input.farmId, conversation);
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
