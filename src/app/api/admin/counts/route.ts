import { NextResponse } from "next/server";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";
import { utcDateOnly } from "@/lib/business";

/** Lightweight sidebar badges — counts only, no includes. */
export async function GET() {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const todayUtc = utcDateOnly(new Date());
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const [exceptions, locations, boundaries, overdueTasks, openIncidents, stalled, missingBoundary] =
      await Promise.all([
        prisma.attendanceException.count({ where: { status: "PENDING" } }),
        prisma.locationChangeRequest.count({ where: { status: "PENDING" } }),
        prisma.boundaryVersion.count({ where: { areaFlagged: true } }),
        prisma.task.count({
          where: {
            status: { in: ["ASSIGNED", "AVAILABLE", "IN_PROGRESS", "BLOCKED"] },
            dueDate: { lt: todayUtc },
          },
        }),
        prisma.incident.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
        prisma.farm.count({ where: { status: "SETUP", updatedAt: { lte: thirtyDaysAgo } } }),
        prisma.farm.count({ where: { boundaryGeoJson: null } }),
      ]);
    return NextResponse.json(
      {
        inbox: exceptions + locations + boundaries + overdueTasks + openIncidents + stalled,
        onboarding: stalled,
        missingBoundary,
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}
