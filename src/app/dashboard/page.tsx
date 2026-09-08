import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { distanceMeters, utcDateOnly } from "@/lib/business";
import { downloadUrl } from "@/lib/storage";
import { DashboardClient } from "@/components/dashboard-client";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();
  const todayUtc = utcDateOnly(new Date());

  const [
    farms,
    totalFarms,
    activeFarms,
    setupFarms,
    totalPlots,
    totalCrops,
    totalTasks,
    completedTasks,
    delayedAlerts,
    pendingIncidents,
    recentPoorHealth,
    recentIncidents,
    todayAttendances,
    assignedOfficers,
    pendingExceptions,
    pendingLocationRequests,
    todayTasks,
  ] = await Promise.all([
    // 1. Managed farms
    prisma.farm.findMany({
      where: farmWhere,
      include: {
        plots: {
          where: { status: { not: "ARCHIVED" } },
          include: {
            cropCycles: {
              where: { status: { not: "CANCELLED" } },
              select: { id: true, cropName: true, status: true },
            },
          },
        },
        access: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // 2. Metrics counts
    prisma.farm.count({ where: farmWhere }),
    prisma.farm.count({ where: { AND: [farmWhere, { status: "ACTIVE" }] } }),
    prisma.farm.count({ where: { AND: [farmWhere, { status: "SETUP" }] } }),
    prisma.plot.count({ where: { farm: farmWhere, status: { not: "ARCHIVED" } } }),
    prisma.cropCycle.count({ where: { plot: { farm: farmWhere }, status: { not: "CANCELLED" } } }),
    prisma.task.count({ where: { farm: farmWhere } }),
    prisma.task.count({ where: { farm: farmWhere, status: "COMPLETED" } }),
    prisma.task.count({
      where: {
        farm: farmWhere,
        status: { in: ["ASSIGNED", "AVAILABLE", "IN_PROGRESS", "BLOCKED"] },
        dueDate: { lt: todayUtc },
      },
    }),
    prisma.incident.count({ where: { farm: farmWhere, status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),

    // 3. Health & incident signals
    prisma.cropMonitoring.findMany({
      where: {
        cropCycle: { plot: { farm: farmWhere } },
        status: "POOR",
      },
      include: {
        cropCycle: { select: { cropName: true } },
        plot: { select: { name: true } },
        farm: { select: { id: true, name: true } },
        media: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.incident.findMany({
      where: {
        farm: farmWhere,
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
      },
      include: {
        farm: { select: { id: true, name: true } },
        plot: { select: { name: true } },
        cropCycle: { select: { cropName: true } },
        media: true,
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),

    // 4. Live Workforce & Attendance Telemetry
    prisma.attendance.findMany({
      where: {
        farm: farmWhere,
        attendanceDate: todayUtc,
      },
      include: {
        user: { select: { id: true, name: true, email: true, role: true } },
        farm: {
          select: {
            id: true,
            name: true,
            location: true,
            latitude: true,
            longitude: true,
            geofenceRadiusMeters: true,
          },
        },
        exception: true,
      },
      orderBy: { startAt: "desc" },
    }),

    // 5. Assigned Field Officers
    prisma.user.findMany({
      where: {
        role: "FARM_OFFICER",
        active: true,
        farmAccess: { some: { farm: farmWhere } },
      },
      select: {
        id: true,
        name: true,
        email: true,
        farmAccess: { where: { farm: farmWhere }, select: { farmId: true } },
      },
    }),

    // 6. Authoritative Queues
    prisma.attendanceException.findMany({
      where: {
        status: "PENDING",
        attendance: { farm: farmWhere },
      },
      include: {
        attendance: {
          include: {
            user: { select: { name: true, email: true } },
            farm: { select: { id: true, name: true, geofenceRadiusMeters: true } },
          },
        },
      },
      orderBy: { attendance: { startAt: "desc" } },
      take: 5,
    }),

    prisma.locationChangeRequest.findMany({
      where: {
        status: "PENDING",
        farm: farmWhere,
      },
      include: {
        farm: { select: { id: true, name: true, location: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),

    // 7. Today's Tasks
    prisma.task.findMany({
      where: {
        farm: farmWhere,
        dueDate: todayUtc,
      },
      select: {
        id: true,
        farmId: true,
        status: true,
      },
    }),
  ]);

  // Map today's tasks per farm
  const tasksPerFarm = new Map<string, { total: number; completed: number }>();
  for (const t of todayTasks) {
    const curr = tasksPerFarm.get(t.farmId) || { total: 0, completed: 0 };
    curr.total += 1;
    if (t.status === "COMPLETED") curr.completed += 1;
    tasksPerFarm.set(t.farmId, curr);
  }

  // Map today's attendance per farm
  const attendancePerFarm = new Map<string, number>();
  for (const att of todayAttendances) {
    attendancePerFarm.set(att.farmId, (attendancePerFarm.get(att.farmId) || 0) + 1);
  }

  // Rollup workforce stats
  const totalOfficersCount = assignedOfficers.length;
  const onDutyCount = todayAttendances.filter(
    (a) => a.status === "OPEN" || a.status === "EXCEPTION_APPROVED"
  ).length;
  const completedAttendanceCount = todayAttendances.filter(
    (a) => a.status === "COMPLETED" || !!a.endAt
  ).length;
  const exceptionsPendingCount = todayAttendances.filter(
    (a) => a.status === "EXCEPTION_PENDING"
  ).length;
  const verifiedOnSiteCount = todayAttendances.filter((a) => {
    if (!a.startAt) return false;
    if (a.exception) return false;
    if (a.startLatitude && a.startLongitude) {
      const dist = distanceMeters(
        { latitude: Number(a.farm.latitude), longitude: Number(a.farm.longitude) },
        { latitude: Number(a.startLatitude), longitude: Number(a.startLongitude) }
      );
      return dist <= a.farm.geofenceRadiusMeters;
    }
    return true;
  }).length;

  const presentCount = todayAttendances.length;
  const complianceRate =
    presentCount > 0 ? Math.round((verifiedOnSiteCount / presentCount) * 100) : 100;

  const workforceSummary = {
    totalOfficers: totalOfficersCount,
    onDutyCount,
    completedCount: completedAttendanceCount,
    exceptionPendingCount: exceptionsPendingCount,
    notClockedInCount: Math.max(0, totalOfficersCount - presentCount),
    withinGeofenceCount: verifiedOnSiteCount,
    complianceRate,
  };

  const formattedRosterPreview = todayAttendances.slice(0, 6).map((att) => {
    const startLat = att.startLatitude ? Number(att.startLatitude) : null;
    const startLng = att.startLongitude ? Number(att.startLongitude) : null;
    let dist = att.exception?.distanceMeters ? Number(att.exception.distanceMeters) : null;
    if (dist === null && startLat !== null && startLng !== null) {
      dist = distanceMeters(
        { latitude: Number(att.farm.latitude), longitude: Number(att.farm.longitude) },
        { latitude: startLat, longitude: startLng }
      );
    }
    const inside = dist !== null ? dist <= att.farm.geofenceRadiusMeters : true;

    return {
      attendanceId: att.id,
      officerId: att.user.id,
      officerName: att.user.name,
      officerEmail: att.user.email,
      farmId: att.farm.id,
      farmName: att.farm.name,
      status: att.status,
      startAt: att.startAt ? att.startAt.toISOString() : null,
      endAt: att.endAt ? att.endAt.toISOString() : null,
      distanceMeters: dist !== null ? Math.round(dist) : null,
      withinGeofence: inside,
      startSelfieKey: att.startSelfieKey,
      exceptionId: att.exception?.id || null,
      exceptionReason: att.exceptionReason || att.exception?.reason || null,
    };
  });

  const formattedFarms = farms.map((f) => {
    const farmTaskStat = tasksPerFarm.get(f.id) || { total: 0, completed: 0 };
    const farmAttendanceStat = attendancePerFarm.get(f.id) || 0;

    const farmAdmin = f.access.find(
      (a) => a.user.role === "FARM_ADMIN" || a.user.role === "SUPER_ADMIN"
    );

    const officerCount = f.access.filter((a) => a.user.role === "FARM_OFFICER").length;

    return {
      id: f.id,
      name: f.name,
      location: f.location,
      ownerName: f.ownerName,
      status: f.status,
      totalArea: f.totalArea.toString(),
      cultivableArea: f.cultivableArea.toString(),
      adminName: farmAdmin?.user.name || "Central Operations",
      officerCount,
      todayAttendanceCount: farmAttendanceStat,
      todayTasksTotal: farmTaskStat.total,
      todayTasksCompleted: farmTaskStat.completed,
      plots: f.plots.map((p) => ({
        id: p.id,
        name: p.name,
        cropCycles: p.cropCycles,
      })),
      access: f.access.map((a) => ({
        user: {
          id: a.user.id,
          name: a.user.name,
          role: a.user.role,
        },
      })),
    };
  });

  const formattedPendingExceptions = pendingExceptions.map((ex) => ({
    id: ex.id,
    distanceMeters: Math.round(Number(ex.distanceMeters)),
    reason: ex.reason,
    officerName: ex.attendance.user.name,
    officerEmail: ex.attendance.user.email,
    farmName: ex.attendance.farm.name,
    farmId: ex.attendance.farm.id,
    time: ex.attendance.startAt?.toISOString() || null,
  }));

  const formattedPendingLocations = pendingLocationRequests.map((loc) => ({
    id: loc.id,
    farmId: loc.farmId,
    farmName: loc.farm.name,
    farmLocation: loc.farm.location,
    proposedLat: Number(loc.proposedLatitude).toFixed(4),
    proposedLng: Number(loc.proposedLongitude).toFixed(4),
    reason: loc.reason,
    date: loc.createdAt.toISOString().slice(0, 10),
  }));

  const formattedPoorHealth = await Promise.all(
    recentPoorHealth.map(async (m) => {
      let imageUrl: string | null = null;
      if (m.media && m.media.length > 0) {
        try {
          imageUrl = await downloadUrl(m.media[0].storageKey);
        } catch {
          imageUrl = null;
        }
      }
      return {
        id: m.id,
        cropName: m.cropCycle.cropName,
        plotName: m.plot.name,
        farmName: m.farm.name,
        farmId: m.farm.id,
        stage: m.stage,
        impactPercent: m.impactPercent ? m.impactPercent.toString() : null,
        remarks: m.remarks,
        imageUrl,
        date: m.createdAt.toISOString().slice(0, 10),
      };
    })
  );

  const formattedIncidents = await Promise.all(
    recentIncidents.map(async (inc) => {
      let imageUrl: string | null = null;
      if (inc.media && inc.media.length > 0) {
        try {
          imageUrl = await downloadUrl(inc.media[0].storageKey);
        } catch {
          imageUrl = null;
        }
      }
      return {
        id: inc.id,
        type: inc.type,
        level: inc.level,
        severity: inc.severity || "MEDIUM",
        description: inc.description,
        impactPercent: inc.impactPercent ? inc.impactPercent.toString() : null,
        farmName: inc.farm.name,
        farmId: inc.farm.id,
        plotName: inc.plot?.name,
        cropName: inc.cropCycle?.cropName,
        status: inc.status,
        imageUrl,
        date: inc.createdAt.toISOString().slice(0, 10),
      };
    })
  );

  const metrics = {
    totalFarms,
    activeFarms,
    setupFarms,
    totalPlots,
    totalCrops,
    totalTasks,
    completedTasks,
    delayedAlerts,
    pendingIncidents,
  };

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell">
        <DashboardClient
          farms={formattedFarms}
          metrics={metrics}
          workforceSummary={workforceSummary}
          rosterPreview={formattedRosterPreview}
          pendingExceptions={formattedPendingExceptions}
          pendingLocations={formattedPendingLocations}
          poorHealthAlerts={formattedPoorHealth}
          activeIncidents={formattedIncidents}
          userName={session.name}
          role={session.role}
        />
      </main>
    </>
  );
}
