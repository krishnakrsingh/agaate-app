import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { audit } from "@infrastructure/audit";
import { apiError } from "@infrastructure/http";
import { gateConversation } from "@modules/chat/access";
import { chatBroadcaster } from "@modules/chat/infrastructure/chatBroadcaster";

const ENTITY_TYPES = ["PLOT", "CROP_CYCLE", "TASK", "PRESCRIPTION", "INCIDENT", "MONITORING"] as const;

const sendSchema = z.object({
  clientMessageId: z.string().min(1).max(128),
  body: z.string().trim().min(1).max(2000),
  refs: z
    .array(
      z.object({
        entityType: z.enum(ENTITY_TYPES),
        entityId: z.string().min(1),
        label: z.string().max(120).optional().nullable(),
      })
    )
    .max(5)
    .default([]),
  attachmentMediaIds: z.array(z.string().min(1)).max(6).default([]),
});

type ShapedMessage = Awaited<ReturnType<typeof shapeMessages>>[number];

async function shapeMessages(messages: { id: string; conversationId: string; senderId: string; body: string; clientMessageId: string; createdAt: Date; editedAt: Date | null; deletedAt: Date | null }[]) {
  if (!messages.length) return [];
  const ids = messages.map((m) => m.id);
  const senderIds = [...new Set(messages.map((m) => m.senderId))];
  const [senders, refs, attachments] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: senderIds } }, select: { id: true, name: true, role: true } }),
    prisma.chatMessageRef.findMany({ where: { messageId: { in: ids } } }),
    prisma.chatAttachment.findMany({
      where: { messageId: { in: ids } },
      include: { mediaAsset: { select: { id: true, kind: true, mimeType: true, sizeBytes: true } } },
    }),
  ]);
  const senderById = new Map(senders.map((s) => [s.id, s]));
  const refsByMsg = new Map<string, typeof refs>();
  for (const r of refs) {
    const arr = refsByMsg.get(r.messageId) ?? [];
    arr.push(r);
    refsByMsg.set(r.messageId, arr);
  }
  const attByMsg = new Map<string, { id: string; kind: string; mimeType: string; sizeBytes: number }[]>();
  for (const a of attachments) {
    const arr = attByMsg.get(a.messageId) ?? [];
    arr.push(a.mediaAsset);
    attByMsg.set(a.messageId, arr);
  }
  return messages.map((m) => ({
    id: m.id,
    conversationId: m.conversationId,
    senderId: m.senderId,
    senderName: senderById.get(m.senderId)?.name ?? "Unknown",
    senderRole: senderById.get(m.senderId)?.role ?? null,
    body: m.deletedAt ? "" : m.body,
    deleted: !!m.deletedAt,
    clientMessageId: m.clientMessageId,
    createdAt: m.createdAt,
    editedAt: m.editedAt,
    refs: refsByMsg.get(m.id) ?? [],
    attachments: attByMsg.get(m.id) ?? [],
    // Back-compat for older clients: first attachment only.
    attachment: (attByMsg.get(m.id) ?? [])[0] ?? null,
  }));
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER", "FARM_ADMIN"]);
    const { conversationId } = await params;
    const { conversation } = await gateConversation(conversationId, actor);
    const sp = request.nextUrl.searchParams;
    const rawLimit = Number(sp.get("limit") ?? 30);
    const limit = Number.isInteger(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 30;
    const beforeId = sp.get("before");
    const afterId = sp.get("after");

    let cursor: { createdAt: Date; id: string } | null = null;
    const cursorId = beforeId ?? afterId;
    if (cursorId) {
      const ref = await prisma.chatMessage.findUnique({
        where: { id: cursorId },
        select: { createdAt: true, id: true, conversationId: true },
      });
      if (!ref || ref.conversationId !== conversation.id) {
        throw new Error("Validation failed");
      }
      cursor = { createdAt: ref.createdAt, id: ref.id };
    }

    const where: any = { conversationId: conversation.id };
    if (cursor && beforeId) {
      where.OR = [
        { createdAt: { lt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { lt: cursor.id } },
      ];
    } else if (cursor && afterId) {
      where.OR = [
        { createdAt: { gt: cursor.createdAt } },
        { createdAt: cursor.createdAt, id: { gt: cursor.id } },
      ];
    }

    const rows = await prisma.chatMessage.findMany({
      where,
      orderBy: beforeId || !afterId ? [{ createdAt: "desc" }, { id: "desc" }] : [{ createdAt: "asc" }, { id: "asc" }],
      take: limit + 1,
    });
    const hasMore = rows.length > limit;
    const page = (hasMore ? rows.slice(0, limit) : rows).sort(
      (a, b) => a.createdAt.getTime() - b.createdAt.getTime() || (a.id < b.id ? -1 : 1)
    );
    return NextResponse.json({ messages: await shapeMessages(page), hasMore });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { assertSameOrigin, getClientIp, throttle } = await import("@infrastructure/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER", "FARM_ADMIN"]);
    const slot = throttle(`chat-send:${actor.id}`, 30, 60_000);
    if (!slot.allowed) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }
    const { conversationId } = await params;
    const { conversation } = await gateConversation(conversationId, actor, { requireWrite: true });
    if (conversation.status === "CLOSED") {
      return NextResponse.json({ error: "This conversation is closed." }, { status: 422 });
    }
    const input = sendSchema.parse(await request.json());

    // Idempotent retry: same clientMessageId returns the original row.
    const existing = await prisma.chatMessage.findUnique({ where: { clientMessageId: input.clientMessageId } });
    if (existing) {
      if (existing.conversationId !== conversation.id) throw new Error("Validation failed");
      const [shaped] = await shapeMessages([existing]);
      return NextResponse.json(shaped);
    }

    // Validate every contextual ref belongs to this conversation's farm.
    const refLabels: { entityType: string; entityId: string; label: string | null }[] = [];
    for (const ref of input.refs) {
      let farmId: string | null = null;
      let label: string | null = ref.label?.slice(0, 120) ?? null;
      if (ref.entityType === "PLOT") {
        const plot = await prisma.plot.findUnique({ where: { id: ref.entityId }, select: { farmId: true, name: true } });
        farmId = plot?.farmId ?? null;
        label = label ?? (plot ? `Plot · ${plot.name}` : null);
      } else if (ref.entityType === "CROP_CYCLE") {
        const cycle = await prisma.cropCycle.findUnique({
          where: { id: ref.entityId },
          select: { cropName: true, plot: { select: { farmId: true, name: true } } },
        });
        farmId = cycle?.plot.farmId ?? null;
        label = label ?? (cycle ? `${cycle.cropName} · ${cycle.plot.name}` : null);
      } else if (ref.entityType === "TASK") {
        const task = await prisma.task.findUnique({ where: { id: ref.entityId }, select: { farmId: true, title: true } });
        farmId = task?.farmId ?? null;
        label = label ?? (task ? `Task · ${task.title.slice(0, 80)}` : null);
      } else if (ref.entityType === "PRESCRIPTION") {
        const rx = await prisma.agronomyPrescription.findUnique({ where: { id: ref.entityId }, select: { farmId: true, targetIssue: true } });
        farmId = rx?.farmId ?? null;
        label = label ?? (rx ? `Rx · ${rx.targetIssue.slice(0, 80)}` : null);
      } else if (ref.entityType === "INCIDENT") {
        const inc = await prisma.incident.findUnique({ where: { id: ref.entityId }, select: { farmId: true, type: true } });
        farmId = inc?.farmId ?? null;
        label = label ?? (inc ? `Issue · ${inc.type}` : null);
      } else {
        const mon = await prisma.cropMonitoring.findUnique({
          where: { id: ref.entityId },
          select: { farmId: true, stage: true },
        });
        farmId = mon?.farmId ?? null;
        label = label ?? (mon ? `Scouting · ${mon.stage}` : null);
      }
      if (!farmId || farmId !== conversation.farmId) throw new Error("A referenced record does not belong to this farm.");
      refLabels.push({ entityType: ref.entityType, entityId: ref.entityId, label });
    }

    // Attachments: sender's own verified uploads for this farm, not yet attached.
    let media: { id: string }[] = [];
    if (input.attachmentMediaIds.length) {
      media = await prisma.mediaAsset.findMany({
        where: {
          id: { in: input.attachmentMediaIds },
          farmId: conversation.farmId,
          uploadedById: actor.id,
          kind: { in: ["CROP_PHOTO", "INCIDENT_PHOTO", "ACTIVITY_EVIDENCE"] },
        },
        select: { id: true },
      });
      if (media.length !== [...new Set(input.attachmentMediaIds)].length) {
        throw new Error("One or more attachments are invalid for this conversation.");
      }
      const taken = await prisma.chatAttachment.count({ where: { mediaAssetId: { in: media.map((m) => m.id) } } });
      if (taken) throw new Error("One or more attachments are already used in another message.");
    }

    const message = await prisma.$transaction(async (tx) => {
      const created = await tx.chatMessage.create({
        data: { conversationId: conversation.id, senderId: actor.id, body: input.body, clientMessageId: input.clientMessageId },
      });
      if (refLabels.length) {
        await tx.chatMessageRef.createMany({ data: refLabels.map((r) => ({ messageId: created.id, ...r })) });
      }
      if (media.length) {
        await tx.chatAttachment.createMany({ data: media.map((m) => ({ messageId: created.id, mediaAssetId: m.id })) });
      }
      await tx.conversation.update({ where: { id: conversation.id }, data: { lastMessageAt: created.createdAt } });
      // Notify every other participant (dedup by messageId).
      const others = await tx.conversationParticipant.findMany({
        where: { conversationId: conversation.id, userId: { not: actor.id } },
        select: { userId: true },
      });
      if (others.length) {
        const recipients = await tx.user.findMany({
          where: { id: { in: others.map((o) => o.userId) } },
          select: { id: true, role: true },
        });
        const farm = await tx.farm.findUnique({ where: { id: conversation.farmId }, select: { name: true } });
        const sender = await tx.user.findUnique({ where: { id: actor.id }, select: { name: true } });
        await tx.chatNotification.createMany({
          data: recipients.map((r) => ({
            userId: r.id,
            conversationId: conversation.id,
            messageId: created.id,
            title: `${sender?.name ?? "Someone"} · ${farm?.name ?? "Farm"}`,
            deepLink:
              r.role === "AGRONOMIST"
                ? `/agronomy/chat?conversation=${conversation.id}`
                : r.role === "FARM_OFFICER"
                  ? `/officer/chat?conversation=${conversation.id}`
                  : r.role === "FARM_ADMIN"
                    ? `/owner/chat?conversation=${conversation.id}`
                    : `/hq/agronomists?conversation=${conversation.id}`,
          })),
          skipDuplicates: true,
        });
      }
      return created;
    });

    await audit(actor.id, "MESSAGE_SEND", "ChatMessage", message.id, { conversationId: conversation.id });
    const [shaped] = await shapeMessages([message]);
    chatBroadcaster.broadcastMessage(conversation.id, shaped);
    chatBroadcaster.broadcastConversationUpdate(conversation.farmId, {
      id: conversation.id,
      status: conversation.status,
      subject: (await prisma.conversation.findUnique({ where: { id: conversation.id }, select: { subject: true } }))?.subject,
      lastMessageAt: message.createdAt,
    });
    return NextResponse.json(shaped, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { assertSameOrigin } = await import("@infrastructure/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    const { conversationId } = await params;
    const { conversation } = await gateConversation(conversationId, actor, { requireWrite: true });
    const messageId = request.nextUrl.searchParams.get("messageId");
    if (!messageId) throw new Error("Validation failed");
    const message = await prisma.chatMessage.findUnique({ where: { id: messageId } });
    if (!message || message.conversationId !== conversation.id) {
      const { HttpError } = await import("@modules/auth");
      throw new HttpError(404, "The requested record was not found.");
    }
    if (message.senderId !== actor.id && actor.role !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 });
    }
    await prisma.chatMessage.update({ where: { id: message.id }, data: { body: "", deletedAt: new Date() } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
