import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { OperationsTriageConsole, type TriageData } from "@/components/admin/operations-triage-console";
import { utcDateOnly } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const session = await requireSession();
  const todayUtc = utcDateOnly(new Date());
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    exceptionsRaw,
    locationsRaw,
    flaggedBoundariesRaw,
    criticalTasksRaw,
    openIncidentsRaw,
    bottlenecksRaw,
  ] = await Promise.all([
    // 1. Pending geofence attendance exceptions
    prisma.attendanceException.findMany({
      where: { status: "PENDING" },
      include: {
        attendance: {
          include: {
            user: { select: { id: true, name: true, email: true } },
            farm: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { attendance: { attendanceDate: "desc" } },
      take: 50,
    }),

    // 2. Pending farm location change requests
    prisma.locationChangeRequest.findMany({
      where: { status: "PENDING" },
      include: {
        farm: {
          select: {
            id: true,
            name: true,
            location: true,
            latitude: true,
            longitude: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // 3. Flagged boundary geometry revisions (|Δ| >= policy tolerance)
    prisma.boundaryVersion.findMany({
      where: { areaFlagged: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),

    // 4. Critical overdue tasks
    prisma.task.findMany({
      where: {
        status: { in: ["ASSIGNED", "AVAILABLE", "IN_PROGRESS", "BLOCKED"] },
        dueDate: { lt: todayUtc },
      },
      include: {
        farm: { select: { id: true, name: true } },
        assignedOfficer: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 25,
    }),

    // 5. Open high-severity incidents
    prisma.incident.findMany({
      where: {
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
      },
      include: {
        farm: { select: { id: true, name: true } },
        reporter: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),

    // 6. In-flight farms stalled in setup stages (>30 days)
    prisma.farm.findMany({
      where: {
        status: "SETUP",
        updatedAt: { lte: thirtyDaysAgo },
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { updatedAt: "asc" },
      take: 25,
    }),
  ]);

  // Resolve entity names for flagged boundaries
  const farmBoundaryIds = flaggedBoundariesRaw
    .filter((b) => b.entityType === "FARM")
    .map((b) => b.entityId);
  const plotBoundaryIds = flaggedBoundariesRaw
    .filter((b) => b.entityType === "PLOT")
    .map((b) => b.entityId);

  const [farmsForBoundaries, plotsForBoundaries] = await Promise.all([
    farmBoundaryIds.length > 0
      ? prisma.farm.findMany({
          where: { id: { in: farmBoundaryIds } },
          select: { id: true, name: true },
        })
      : [],
    plotBoundaryIds.length > 0
      ? prisma.plot.findMany({
          where: { id: { in: plotBoundaryIds } },
          select: { id: true, name: true, farmId: true, farm: { select: { name: true } } },
        })
      : [],
  ]);

  const farmMap = new Map(farmsForBoundaries.map((f) => [f.id, f.name]));
  const plotMap = new Map(
    plotsForBoundaries.map((p) => [p.id, { name: p.name, farmId: p.farmId, farmName: p.farm.name }])
  );

  const triageData: TriageData = {
    pendingExceptions: exceptionsRaw.map((ex) => ({
      id: ex.id,
      attendanceId: ex.attendanceId,
      userName: ex.attendance.user.name,
      userEmail: ex.attendance.user.email || "",
      farmId: ex.attendance.farm.id,
      farmName: ex.attendance.farm.name,
      distanceMeters: Number(ex.distanceMeters || 0),
      reason: ex.reason,
      attendanceDate: ex.attendance.attendanceDate.toISOString().slice(0, 10),
    })),

    pendingLocations: locationsRaw.map((loc) => ({
      id: loc.id,
      farmId: loc.farmId,
      farmName: loc.farm.name,
      farmLocation: loc.farm.location,
      requesterName: "Field Manager",
      proposedLatitude: Number(loc.proposedLatitude),
      proposedLongitude: Number(loc.proposedLongitude),
      currentLatitude: Number(loc.farm.latitude),
      currentLongitude: Number(loc.farm.longitude),
      reason: loc.reason,
      createdAt: loc.createdAt.toISOString(),
    })),

    flaggedBoundaries: flaggedBoundariesRaw.map((b) => {
      let entityName = b.entityId;
      let farmId = b.entityId;
      let farmName = "Estate";

      if (b.entityType === "FARM") {
        farmName = farmMap.get(b.entityId) || "Estate";
        entityName = farmName;
      } else {
        const plotInfo = plotMap.get(b.entityId);
        if (plotInfo) {
          entityName = plotInfo.name;
          farmId = plotInfo.farmId;
          farmName = plotInfo.farmName;
        }
      }

      const measured = b.measuredAcres ? Number(b.measuredAcres) : null;
      const prev = b.prevAcres ? Number(b.prevAcres) : null;
      let deltaPercent: number | null = null;
      if (measured != null && prev != null && prev > 0) {
        deltaPercent = ((measured - prev) / prev) * 100;
      }

      return {
        id: b.id,
        entityType: b.entityType,
        entityId: b.entityId,
        entityName,
        farmId,
        farmName,
        source: b.source,
        measuredAcres: measured,
        prevAcres: prev,
        deltaPercent,
        actorName: b.actorName,
        createdAt: b.createdAt.toISOString(),
      };
    }),

    criticalTasks: criticalTasksRaw.map((t) => ({
      id: t.id,
      title: t.title,
      farmId: t.farm.id,
      farmName: t.farm.name,
      dueDate: t.dueDate.toISOString().slice(0, 10),
      priority: t.priority,
      status: t.status,
      officerName: t.assignedOfficer?.name || "Unassigned",
    })),

    openIncidents: openIncidentsRaw.map((inc) => ({
      id: inc.id,
      type: inc.type,
      description: inc.description,
      severity: inc.severity,
      farmId: inc.farm.id,
      farmName: inc.farm.name,
      reporterName: inc.reporter?.name || "Field Officer",
      createdAt: inc.createdAt.toISOString(),
    })),

    stalledSetups: bottlenecksRaw.map((f) => ({
      id: f.id,
      name: f.name,
      location: f.location,
      setupStage: f.setupStage,
      setupProgress: f.setupProgress,
      daysInStage: Math.floor((now.getTime() - new Date(f.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
      clientName: f.client?.name || f.ownerName,
    })),
  };

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow" style={{ margin: 0 }}>
              <span className="eyebrow-dot" />
              OPERATE • INBOX
            </div>
            <h1 style={{ fontSize: 24, margin: "2px 0 0", fontWeight: 700 }}>Inbox</h1>
          </div>
        </div>

        <OperationsTriageConsole data={triageData} />
      </main>
    </>
  );
}
