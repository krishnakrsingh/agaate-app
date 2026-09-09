import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OperationsCommandCenter } from "@/components/ops/operations-command-center";
import { utcDateOnly } from "@/lib/business";

export const dynamic = "force-dynamic";

export default async function OperationsPage() {
  const session = await requireSession();
  const todayUtc = utcDateOnly(new Date());
  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalClients,
    totalFarms,
    activeFarms,
    setupFarms,
    acreageSums,
    totalPlots,
    pendingApprovals,
    delayedTasksCount,
    openIncidents,
    bottlenecksRaw,
    exceptionsRaw,
    criticalTasksRaw,
    recentAuditRaw,
  ] = await Promise.all([
    prisma.client.count(),
    prisma.farm.count(),
    prisma.farm.count({ where: { status: "ACTIVE" } }),
    prisma.farm.count({ where: { status: "SETUP" } }),
    prisma.farm.aggregate({
      _sum: { totalArea: true, cultivableArea: true },
    }),
    prisma.plot.count({ where: { deletedAt: null } }),
    prisma.attendanceException.count({ where: { status: "PENDING" } }),
    prisma.task.count({
      where: {
        status: { in: ["ASSIGNED", "AVAILABLE", "IN_PROGRESS", "BLOCKED"] },
        dueDate: { lt: todayUtc },
      },
    }),
    prisma.incident.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),

    // In-flight farms stalled in setup stages
    prisma.farm.findMany({
      where: {
        status: "SETUP",
        updatedAt: { lte: thirtyDaysAgo },
      },
      include: {
        client: { select: { name: true } },
      },
      orderBy: { updatedAt: "asc" },
      take: 8,
    }),

    // Pending geofence attendance exceptions
    prisma.attendanceException.findMany({
      where: { status: "PENDING" },
      include: {
        attendance: {
          include: {
            user: { select: { name: true } },
            farm: { select: { name: true } },
          },
        },
      },
      orderBy: { attendance: { attendanceDate: "desc" } },
      take: 8,
    }),

    // Critical overdue tasks
    prisma.task.findMany({
      where: {
        status: { in: ["ASSIGNED", "AVAILABLE", "IN_PROGRESS", "BLOCKED"] },
        dueDate: { lt: todayUtc },
      },
      include: {
        farm: { select: { name: true } },
        assignedOfficer: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 8,
    }),

    // Recent audit logs
    prisma.auditLog.findMany({
      include: {
        actor: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 8,
    }),
  ]);

  const bottleneckFarms = bottlenecksRaw.map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location,
    ownerName: f.ownerName,
    setupStage: f.setupStage,
    setupProgress: f.setupProgress,
    daysInStage: Math.floor((now.getTime() - new Date(f.updatedAt).getTime()) / (1000 * 60 * 60 * 24)),
    clientName: f.client?.name || f.ownerName,
  }));

  const pendingExceptions = exceptionsRaw.map((ex) => ({
    id: ex.id,
    userName: ex.attendance.user.name,
    farmName: ex.attendance.farm.name,
    distanceMeters: Number(ex.distanceMeters || 0),
    reason: ex.reason,
    date: ex.attendance.attendanceDate.toISOString().slice(0, 10),
  }));

  const criticalTasks = criticalTasksRaw.map((t) => ({
    id: t.id,
    title: t.title,
    farmName: t.farm.name,
    dueDate: t.dueDate.toISOString().slice(0, 10),
    priority: t.priority,
    status: t.status,
    officerName: t.assignedOfficer?.name || "Unassigned",
  }));

  const recentAuditLogs = recentAuditRaw.map((a) => ({
    id: a.id,
    actorName: a.actor?.name || "System Automated",
    action: a.action,
    entityType: a.entityType,
    entityId: a.entityId,
    createdAt: a.createdAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  }));

  const macro = {
    totalClients,
    totalFarms,
    activeFarms,
    setupFarms,
    totalAcreage: Number(acreageSums._sum.totalArea || 0),
    totalCultivable: Number(acreageSums._sum.cultivableArea || 0),
    totalPlots,
    pendingApprovals,
    delayedTasks: delayedTasksCount,
    openIncidents,
  };

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Operations Command Center" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              OPERATE • HQ COMMAND CENTER
            </div>
            <h1>Operations Center</h1>
            <p className="muted">
              Live operational control surface. Unresolved work, onboarding bottlenecks, geofence verification queues, and delayed tasks.
            </p>
          </div>
        </div>

        <OperationsCommandCenter
          macro={macro}
          bottleneckFarms={bottleneckFarms}
          pendingExceptions={pendingExceptions}
          criticalTasks={criticalTasks}
          recentAuditLogs={recentAuditLogs}
        />
      </main>
    </>
  );
}
