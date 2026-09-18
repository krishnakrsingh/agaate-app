import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { audit } from "@infrastructure/audit";
import { apiError } from "@infrastructure/http";
import { assertChattableRole, gateConversation } from "@modules/chat/access";

const schema = z.object({ userId: z.string().min(1) });

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { assertSameOrigin } = await import("@infrastructure/security");
    assertSameOrigin(request);
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST"]);
    const { conversationId } = await params;
    const { conversation } = await gateConversation(conversationId, actor, { requireWrite: true });
    if (conversation.status === "CLOSED") {
      return NextResponse.json({ error: "This conversation is closed." }, { status: 422 });
    }
    const input = schema.parse(await request.json());

    const user = await prisma.user.findUnique({
      where: { id: input.userId },
      select: { id: true, role: true, active: true },
    });
    if (!user || !user.active) throw new Error("One or more selected people no longer exist.");
    assertChattableRole(user.role);
    if (user.role !== "SUPER_ADMIN") {
      const access = await prisma.farmAccess.findUnique({
        where: { userId_farmId: { userId: user.id, farmId: conversation.farmId } },
      });
      if (!access) throw new Error("One or more selected people do not have access to this farm.");
    }

    await prisma.conversationParticipant.upsert({
      where: { conversationId_userId: { conversationId: conversation.id, userId: user.id } },
      update: {},
      create: { conversationId: conversation.id, userId: user.id },
    });
    await audit(actor.id, "PARTICIPANT_ADD", "Conversation", conversation.id, { userId: user.id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
