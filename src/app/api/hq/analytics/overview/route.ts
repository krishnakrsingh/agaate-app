import { NextRequest, NextResponse } from "next/server";
import { HttpError, currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";
import { parseUtcDate } from "@/lib/business";

export const dynamic = "force-dynamic";

// Scale contract: every list in this payload is capped. Counts that feed
// ratios are pure aggregates (no row scans), never truncated lists.
const TOP = 50;
const MAX_RANGE_DAYS = 366;

const num = (v: unknown) => Number(v || 0);

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "AGRONOMIST"]);

    const sp = request.nextUrl.searchParams;
    const clientId = sp.get("clientId")?.trim() || null;
    const farmId = sp.get("farmId")?.trim() || null;
    const fromRaw = sp.get("from")?.trim() || null;
    const toRaw = sp.get("to")?.trim() || null;

    // Client/farm scope is mandatory: never run platform-wide full scans.
    if (!clientId && !farmId) {
      throw new HttpError(422, "Farm selection is required: choose a client or a farm.");
    }
    if (!fromRaw || !toRaw) {
      throw new HttpError(422, "Validation failed: from and to dates are required.");
    }
    const from = parseUtcDate(fromRaw);
    const to = parseUtcDate(toRaw);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
      throw new HttpError(422, "Validation failed: invalid date range.");
    }
    if (Math.round((to.getTime() - from.getTime()) / 86400000) + 1 > MAX_RANGE_DAYS) {
      throw new HttpError(422, "Validation failed: date range cannot exceed 12 months.");
    }

    let farmWhere: { id: string } | { clientId: string };
    let scopeLabel = "";
    if (farmId) {
      await requireFarmAccess(farmId);
      const farm = await prisma.farm.findUnique({
        where: { id: farmId },
        select: { id: true, name: true },
      });
      if (!farm) throw new HttpError(404, "The requested record was not found.");
      farmWhere = { id: farmId };
      scopeLabel = farm.name;
    } else {
      const client = await prisma.client.findUnique({
        where: { id: clientId! },
        select: { id: true, name: true },
      });
      if (!client) throw new HttpError(404, "The requested record was not found.");
      farmWhere = { clientId: clientId! };
      scopeLabel = client.name;
    }

    const dateRange = { gte: from, lte: to };
    const cycleWhere = { plot: { farm: farmWhere, deletedAt: null }, startDate: { ...dateRange } };
    const harvestWhere = { farm: farmWhere, harvestDate: { ...dateRange } };
    const taskWhere = { farm: farmWhere, dueDate: { ...dateRange } };
    const incidentWhere = { farm: farmWhere, createdAt: { ...dateRange } };
    const attendanceWhere = { farm: farmWhere, attendanceDate: { ...dateRange } };
    const monitoringWhere = { farm: farmWhere, createdAt: { ...dateRange } };

    const [
      cycles,
      cycleTotal,
      cyclesByStatus,
      harvestAgg,
      harvestByFarm,
      harvestByCycle,
      harvestByGrade,
      harvestByDate,
      tasksByOfficer,
      tasksDoneByOfficer,
      harvestsByUser,
      attendanceByUser,
      attendanceDoneByUser,
      farmAcres,
      plotAcres,
      plotCount,
      activeCycles,
      incidentTotal,
      incidentsByStatus,
      incidentsByLevel,
      incidentsByType,
      incidentsByFarm,
      monitoringByStatus,
    ] = await Promise.all([
      prisma.cropCycle.findMany({
        where: cycleWhere,
        select: {
          id: true,
          cropName: true,
          startDate: true,
          status: true,
          plot: { select: { id: true, name: true, farm: { select: { id: true, name: true } } } },
        },
        orderBy: { startDate: "desc" },
        take: TOP,
      }),
      prisma.cropCycle.count({ where: cycleWhere }),
      prisma.cropCycle.groupBy({ by: ["status"], where: cycleWhere, _count: { _all: true } }),
      prisma.harvestLog.aggregate({
        where: harvestWhere,
        _sum: { quantity: true, totalAmount: true },
        _count: { _all: true },
      }),
      prisma.harvestLog.groupBy({
        by: ["farmId"],
        where: harvestWhere,
        _sum: { quantity: true, totalAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: TOP,
      }),
      prisma.harvestLog.groupBy({
        by: ["cropCycleId"],
        where: harvestWhere,
        _sum: { quantity: true, totalAmount: true },
        _count: { _all: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: TOP,
      }),
      prisma.harvestLog.groupBy({
        by: ["grade"],
        where: harvestWhere,
        _sum: { quantity: true },
        _count: { _all: true },
        orderBy: { _sum: { quantity: "desc" } },
        take: TOP,
      }),
      prisma.harvestLog.groupBy({
        by: ["harvestDate"],
        where: harvestWhere,
        _sum: { quantity: true },
        orderBy: { harvestDate: "asc" },
        take: MAX_RANGE_DAYS,
      }),
      prisma.task.groupBy({
        by: ["assignedOfficerId"],
        where: { ...taskWhere, assignedOfficerId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { assignedOfficerId: "desc" } },
        take: TOP,
      }),
      prisma.task.groupBy({
        by: ["assignedOfficerId"],
        where: { ...taskWhere, status: "COMPLETED", assignedOfficerId: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { assignedOfficerId: "desc" } },
        take: TOP,
      }),
      prisma.harvestLog.groupBy({
        by: ["createdById"],
        where: harvestWhere,
        _count: { _all: true },
        _sum: { quantity: true },
        orderBy: { _count: { createdById: "desc" } },
        take: TOP,
      }),
      prisma.attendance.groupBy({
        by: ["userId"],
        where: attendanceWhere,
        _count: { _all: true },
        orderBy: { _count: { userId: "desc" } },
        take: TOP,
      }),
      prisma.attendance.groupBy({
        by: ["userId"],
        where: { ...attendanceWhere, status: "COMPLETED" },
        _count: { _all: true },
        orderBy: { _count: { userId: "desc" } },
        take: TOP,
      }),
      prisma.farm.aggregate({
        where: farmWhere,
        _sum: { totalArea: true, cultivableArea: true },
        _count: { _all: true },
      }),
      prisma.plot.aggregate({
        where: { farm: farmWhere, deletedAt: null },
        _sum: { area: true },
      }),
      prisma.plot.count({ where: { farm: farmWhere, deletedAt: null } }),
      prisma.cropCycle.count({
        where: { plot: { farm: farmWhere, deletedAt: null }, status: "ACTIVE" },
      }),
      prisma.incident.count({ where: incidentWhere }),
      prisma.incident.groupBy({ by: ["status"], where: incidentWhere, _count: { _all: true } }),
      prisma.incident.groupBy({ by: ["level"], where: incidentWhere, _count: { _all: true } }),
      prisma.incident.groupBy({
        by: ["type"],
        where: incidentWhere,
        _count: { _all: true },
        orderBy: { _count: { type: "desc" } },
        take: TOP,
      }),
      prisma.incident.groupBy({
        by: ["farmId"],
        where: incidentWhere,
        _count: { _all: true },
        orderBy: { _count: { farmId: "desc" } },
        take: TOP,
      }),
      prisma.cropMonitoring.groupBy({ by: ["status"], where: monitoringWhere, _count: { _all: true } }),
    ]);

    // Resolve display names for grouped ids (all capped lookups).
    const farmIds = [...new Set([...harvestByFarm.map((h) => h.farmId), ...incidentsByFarm.map((i) => i.farmId)])];
    const cycleIds = harvestByCycle.map((h) => h.cropCycleId);
    const officerIds = [
      ...new Set([
        ...tasksByOfficer.map((t) => t.assignedOfficerId).filter((v): v is string => !!v),
        ...tasksDoneByOfficer.map((t) => t.assignedOfficerId).filter((v): v is string => !!v),
        ...harvestsByUser.map((h) => h.createdById),
        ...attendanceByUser.map((a) => a.userId),
      ]),
    ].slice(0, 150);

    const [scopeFarms, yieldCycles, officers] = await Promise.all([
      farmIds.length
        ? prisma.farm.findMany({ where: { id: { in: farmIds } }, select: { id: true, name: true } })
        : [],
      cycleIds.length
        ? prisma.cropCycle.findMany({
            where: { id: { in: cycleIds } },
            select: { id: true, cropName: true, plot: { select: { name: true } } },
          })
        : [],
      officerIds.length
        ? prisma.user.findMany({ where: { id: { in: officerIds } }, select: { id: true, name: true } })
        : [],
    ]);

    const farmName = new Map(scopeFarms.map((f) => [f.id, f.name]));
    const cycleName = new Map(yieldCycles.map((c) => [c.id, `${c.cropName} (${c.plot.name})`]));
    const officerName = new Map(officers.map((o) => [o.id, o.name]));

    const doneByOfficer = new Map(
      tasksDoneByOfficer.map((t) => [t.assignedOfficerId as string, t._count._all])
    );
    const harvestCountByUser = new Map(harvestsByUser.map((h) => [h.createdById, h._count._all]));
    const harvestKgByUser = new Map(harvestsByUser.map((h) => [h.createdById, num(h._sum.quantity)]));
    const attendanceTotal = new Map(attendanceByUser.map((a) => [a.userId, a._count._all]));
    const attendanceDone = new Map(attendanceDoneByUser.map((a) => [a.userId, a._count._all]));

    const officerRows = officerIds
      .map((id) => {
        const assigned = tasksByOfficer.find((t) => t.assignedOfficerId === id)?._count._all || 0;
        const completed = doneByOfficer.get(id) || 0;
        const days = attendanceTotal.get(id) || 0;
        const present = attendanceDone.get(id) || 0;
        return {
          officerId: id,
          officerName: officerName.get(id) || "Unknown officer",
          tasksAssigned: assigned,
          tasksCompleted: completed,
          completionRate: assigned > 0 ? Math.round((completed / assigned) * 100) : 0,
          harvestsLogged: harvestCountByUser.get(id) || 0,
          harvestKg: harvestKgByUser.get(id) || 0,
          attendanceDays: days,
          attendanceRate: days > 0 ? Math.round((present / days) * 100) : 0,
        };
      })
      .sort((a, b) => b.tasksCompleted - a.tasksCompleted || b.harvestKg - a.harvestKg)
      .slice(0, TOP);

    const totalKg = num(harvestAgg._sum.quantity);
    const totalRevenue = num(harvestAgg._sum.totalAmount);
    const cultivable = num(farmAcres._sum.cultivableArea);
    const mapped = num(plotAcres._sum.area);

    return NextResponse.json(
      {
        scope: { clientId, farmId, from: fromRaw, to: toRaw, label: scopeLabel },
        cropHistory: {
          total: cycleTotal,
          truncated: cycleTotal > cycles.length,
          byStatus: cyclesByStatus.map((s) => ({ status: s.status, count: s._count._all })),
          cycles: cycles.map((c) => ({
            id: c.id,
            cropName: c.cropName,
            startDate: c.startDate.toISOString().slice(0, 10),
            status: c.status,
            plotId: c.plot.id,
            plotName: c.plot.name,
            farmId: c.plot.farm.id,
            farmName: c.plot.farm.name,
          })),
        },
        harvest: {
          totalKg,
          totalRevenue,
          batches: harvestAgg._count._all,
          byFarm: harvestByFarm.map((h) => ({
            farmId: h.farmId,
            farmName: farmName.get(h.farmId) || "Unknown farm",
            kg: num(h._sum.quantity),
            revenue: num(h._sum.totalAmount),
            batches: h._count._all,
          })),
          byCrop: harvestByCycle.map((h) => ({
            cropCycleId: h.cropCycleId,
            cropName: cycleName.get(h.cropCycleId) || "Unknown crop",
            kg: num(h._sum.quantity),
            revenue: num(h._sum.totalAmount),
            batches: h._count._all,
          })),
          byGrade: harvestByGrade.map((g) => ({
            grade: g.grade,
            kg: num(g._sum.quantity),
            batches: g._count._all,
          })),
          byDate: harvestByDate.map((d) => ({
            date: d.harvestDate.toISOString().slice(0, 10),
            kg: num(d._sum.quantity),
          })),
        },
        officers: officerRows,
        land: {
          farmCount: farmAcres._count._all,
          totalAcres: num(farmAcres._sum.totalArea),
          cultivableAcres: cultivable,
          mappedPlotAcres: mapped,
          plotCount,
          activeCycles,
          mappingRate: cultivable > 0 ? Math.round((mapped / cultivable) * 100) : 0,
        },
        incidents: {
          total: incidentTotal,
          ratePer100Cycles: cycleTotal > 0 ? Math.round((incidentTotal / cycleTotal) * 100) : 0,
          byStatus: incidentsByStatus.map((s) => ({ status: s.status, count: s._count._all })),
          byLevel: incidentsByLevel.map((s) => ({ level: s.level, count: s._count._all })),
          byType: incidentsByType.map((s) => ({ type: s.type, count: s._count._all })),
          byFarm: incidentsByFarm.map((s) => ({
            farmId: s.farmId,
            farmName: farmName.get(s.farmId) || "Unknown farm",
            count: s._count._all,
          })),
          monitoringByStatus: monitoringByStatus.map((s) => ({ status: s.status, count: s._count._all })),
        },
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}
