import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireFarmAccess, requireRole } from "@modules/auth";
import { apiError } from "@infrastructure/http";
import { getFarmDossier } from "@modules/chat/dossier";

/**
 * Farm-direct dossier for the agronomist workspace: the estate picture
 * without needing an open thread (empty states, estate switching).
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER"]);
    const { farmId } = await params;
    await requireFarmAccess(farmId);
    const dossier = await getFarmDossier(farmId);
    return NextResponse.json({ ...dossier, focus: { plotId: null, cropCycleId: null } });
  } catch (error) {
    return apiError(error);
  }
}
