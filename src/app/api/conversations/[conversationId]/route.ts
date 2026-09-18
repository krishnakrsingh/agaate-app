import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { audit } from "@infrastructure/audit";
import { apiError } from "@infrastructure/http";
import { gateConversation } from "@modules/chat/access";

const patchSchema = z.object({
  status: z.enum(["OPEN", "CLOSED"]),
});

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER", "FARM_ADMIN"]);
    const { conversationId } = await params;
    const { conversation } = await gateConversation(conversationId, actor);

    const [full, participants] = await Promise.all([
      prisma.conversation.findUniqueOrThrow({
        where: { id: conversation.id },
        include: { farm: { select: { id: true, name: true, location: true } } },
      }),
      prisma.conversationParticipant.findMany({ where: { conversationId: conversation.id } }),
    ]);
    const users = await prisma.user.findMany({
      where: { id: { in: participants.map((p) => p.userId) } },
      select: { id: true, name: true, role: true },
    });
    const userById = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      ...full,
      participants: participants.map((p) => ({
        userId: p.userId,
        name: userById.get(p.userId)?.name ?? "Unknown",
        role: userById.get(p.userId)?.role ?? null,
        lastReadAt: p.lastReadAt,
        joinedAt: p.joinedAt,
      })),
    });
  } catch (error) {
    return apiError(error);
  }
}

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
    const { conversation } = await gateConversation(conversationId, actor, { requireWrite: true });
    const input = patchSchema.parse(await request.json());

    const updated = await prisma.conversation.update({
      where: { id: conversation.id },
      data: { status: input.status },
    });
    await audit(actor.id, input.status === "CLOSED" ? "CONVERSATION_CLOSE" : "CONVERSATION_REOPEN", "Conversation", conversation.id, {});
    return NextResponse.json(updated);
  } catch (error) {
    return apiError(error);
  }
}
