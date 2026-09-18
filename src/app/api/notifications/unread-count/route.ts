import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { apiError } from "@infrastructure/http";

export async function GET(_request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST", "FARM_OFFICER"]);
    const count = await prisma.chatNotification.count({ where: { userId: actor.id, readAt: null } });
    return NextResponse.json({ count });
  } catch (error) {
    return apiError(error);
  }
}
