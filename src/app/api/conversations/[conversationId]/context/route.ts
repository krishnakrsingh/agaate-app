import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@modules/auth";
import { apiError } from "@infrastructure/http";
import { gateConversation } from "@modules/chat/access";
import { getFarmDossier } from "@modules/chat/dossier";

/**
 * Live farm snapshot for the agronomist workspace: the officer never has to
 * re-explain which plot, crop or stage — the dossier panel shows it.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER"]);
    const { conversationId } = await params;
    const { conversation } = await gateConversation(conversationId, actor);
    const dossier = await getFarmDossier(conversation.farmId);
    return NextResponse.json({
      ...dossier,
      focus: { plotId: conversation.plotId, cropCycleId: conversation.cropCycleId },
    });
  } catch (error) {
    return apiError(error);
  }
}
