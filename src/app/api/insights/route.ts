import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";
import { utcDateOnly } from "@/lib/business";

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST"]);

    const todayUtc = utcDateOnly(new Date());

    const [
      totalClients,
      totalFarms,
      totalPlots,
      totalUsers,
      farmsByStatus,
      farmsByStage,
      farmsByState,
      acreageAgg,
      taskMetrics,
      incidentMetrics,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.farm.count(),
      prisma.plot.count({ where: { deletedAt: null } }),
      prisma.user.count({ where: { active: true } }),
      prisma.farm.groupBy({
        by: ["status"],
        _count: { _all: true },
      }),
      prisma.farm.groupBy({
        by: ["setupStage"],
        _count: { _all: true },
      }),
      prisma.farm.groupBy({
        by: ["state"],
        _count: { _all: true },
        _sum: { totalArea: true, cultivableArea: true },
        where: { state: { not: null } },
        orderBy: { _count: { state: "desc" } },
        take: 10,
      }),
      prisma.farm.aggregate({
        _sum: { totalArea: true, cultivableArea: true },
      }),
      Promise.all([
        prisma.task.count(),
        prisma.task.count({ where: { status: "COMPLETED" } }),
        prisma.task.count({
          where: {
            status: { in: ["ASSIGNED", "AVAILABLE", "IN_PROGRESS", "BLOCKED"] },
            dueDate: { lt: todayUtc },
          },
        }),
        prisma.task.count({
          where: { status: { in: ["ASSIGNED", "AVAILABLE", "IN_PROGRESS"] } },
        }),
      ]),
      Promise.all([
        prisma.incident.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
        prisma.cropMonitoring.count({ where: { status: "POOR" } }),
      ]),
    ]);

    const [allTasks, completedTasks, delayedTasks, pendingTasks] = taskMetrics;
    const [openIncidents, poorCropUpdates] = incidentMetrics;

    return NextResponse.json(
      {
        totals: {
          clients: totalClients,
          farms: totalFarms,
          plots: totalPlots,
          users: totalUsers,
          totalAcreage: Number(acreageAgg._sum.totalArea || 0),
          cultivableAcreage: Number(acreageAgg._sum.cultivableArea || 0),
        },
        farmsByStatus: farmsByStatus.map((s) => ({
          status: s.status,
          count: s._count._all,
        })),
        farmsByStage: farmsByStage.map((s) => ({
          stage: s.setupStage,
          count: s._count._all,
        })),
        topStates: farmsByState.map((st) => ({
          state: st.state || "Unknown",
          farmCount: st._count._all,
          acreage: Number(st._sum.totalArea || 0),
        })),
        tasks: {
          total: allTasks,
          completed: completedTasks,
          delayed: delayedTasks,
          pending: pendingTasks,
          completionRate: allTasks > 0 ? Math.round((completedTasks / allTasks) * 100) : 0,
        },
        health: {
          openIncidents,
          poorCropUpdates,
        },
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}
