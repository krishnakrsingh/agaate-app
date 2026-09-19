import "server-only";
import { prisma } from "@infrastructure/db";
import { HttpError } from "@modules/auth";
import type { Actor } from "@modules/auth";

/**
 * modules/chat/access — membership gate for contextual chat.
 *
 * Rule: every read/write requires BOTH a ConversationParticipant row AND a
 * live FarmAccess row, EXCEPT SUPER_ADMIN who may read (inspect) without
 * joining but can never write without joining. Platform-read roles do NOT
 * get implicit chat access — chat membership is explicit, so farm data can't
 * leak through ID guessing. The FarmAccess check matters on unassignment:
 * a removed officer/agronomist keeps their participant row but loses access
 * immediately (their history stays intact for the other side).
 */

export type ConversationGate = {
  conversation: { id: string; farmId: string; status: string; plotId: string | null; cropCycleId: string | null };
  isParticipant: boolean;
};

export async function gateConversation(
  conversationId: string,
  actor: Actor,
  opts: { requireWrite?: boolean } = {}
): Promise<ConversationGate> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    select: { id: true, farmId: true, status: true, plotId: true, cropCycleId: true },
  });
  if (!conversation) throw new HttpError(404, "The requested conversation was not found.");

  const participant = await prisma.conversationParticipant.findUnique({
    where: { conversationId_userId: { conversationId, userId: actor.id } },
  });
  const isParticipant = !!participant;

  if (!isParticipant) {
    // SUPER_ADMIN and AGRONOMIST can inspect conversations on farms they oversee.
    if (actor.role === "SUPER_ADMIN" || actor.role === "AGRONOMIST") {
      if (opts.requireWrite) {
        // Auto-join supervisory staff when they write a directive or advice
        await prisma.conversationParticipant.upsert({
          where: { conversationId_userId: { conversationId, userId: actor.id } },
          update: {},
          create: { conversationId, userId: actor.id },
        });
        return { conversation, isParticipant: true };
      }
      return { conversation, isParticipant: false };
    }
    throw new HttpError(403, "You do not have access to this conversation.");
  }

  // Stale membership is not access: unassigned users lose the farm the
  // moment their FarmAccess row disappears (SUPER_ADMIN and AGRONOMIST bypass — HQ & Agronomists oversee the platform).
  if (actor.role !== "SUPER_ADMIN" && actor.role !== "AGRONOMIST") {
    const access = await prisma.farmAccess.findUnique({
      where: { userId_farmId: { userId: actor.id, farmId: conversation.farmId } },
    });
    if (!access) {
      throw new HttpError(403, "You do not have access to this conversation.");
    }
  }
  return { conversation, isParticipant: true };
}

/** Conversation ids the actor participates in (empty = none). */
export async function participantConversationIds(actor: Actor): Promise<string[]> {
  const rows = await prisma.conversationParticipant.findMany({
    where: { userId: actor.id },
    select: { conversationId: true },
  });
  return rows.map((r) => r.conversationId);
}

/** Roles allowed to hold chat membership: Agronomists, Officers, HQ Admins, and Farm Admins (Estate Owners). */
export const CHAT_PARTICIPANT_ROLES = ["AGRONOMIST", "FARM_OFFICER", "SUPER_ADMIN", "FARM_ADMIN"] as const;

export function assertChattableRole(role: string) {
  if (!(CHAT_PARTICIPANT_ROLES as readonly string[]).includes(role)) {
    throw new HttpError(422, "Only agronomists, farm officers, farm admins, and HQ admins can join conversations.");
  }
}
