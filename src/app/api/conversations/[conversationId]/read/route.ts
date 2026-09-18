import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { apiError } from "@infrastructure/http";
import { gateConversation } from "@modules/chat/access";

const schema = z.object({
  messageId: z.string().min(1).optional().nullable(),
});

/** Advance the reader watermark; marks this conversation's notifications read. */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { assertSameOrigin } = await import("@infrastructure/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER", "FARM_ADMIN"]);
    const { conversationId } = await params;
    const { conversation, isParticipant } = await gateConversation(conversationId, actor);
    if (!isParticipant) {
      return NextResponse.json({ error: "You do not have permission for this action." }, { status: 403 });
    }
    const input = schema.parse(await request.json());

    let watermark = new Date();
    if (input.messageId) {
      const msg = await prisma.chatMessage.findUnique({
        where: { id: input.messageId },
        select: { createdAt: true, conversationId: true },
      });
      if (!msg || msg.conversationId !== conversation.id) throw new Error("Validation failed");
      watermark = msg.createdAt;
    }

    await prisma.$transaction([
      prisma.conversationParticipant.upsert({
        where: { conversationId_userId: { conversationId: conversation.id, userId: actor.id } },
        update: { lastReadAt: watermark },
        create: { conversationId: conversation.id, userId: actor.id, lastReadAt: watermark },
      }),
      prisma.chatNotification.updateMany({
        where: { conversationId: conversation.id, userId: actor.id, readAt: null },
        data: { readAt: watermark },
      }),
    ]);
    return NextResponse.json({ ok: true, lastReadAt: watermark });
  } catch (error) {
    return apiError(error);
  }
}
