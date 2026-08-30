import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { utcDateOnly } from "@/lib/business";
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
  ] = await Promise.all([
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
            user: { select: { id: true, name: true, role: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
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
    prisma.cropMonitoring.findMany({
      where: {
        cropCycle: { plot: { farm: farmWhere } },
        status: "POOR",
      },
      include: {
        cropCycle: {
          select: {
            cropName: true,
          },
        },
        plot: {
          select: {
            name: true,
          },
        },
        farm: {
          select: {
            id: true,
            name: true,
          },
        },
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
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

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

  const formattedFarms = farms.map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location,
    ownerName: f.ownerName,
    status: f.status,
    totalArea: f.totalArea.toString(),
    cultivableArea: f.cultivableArea.toString(),
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
  }));

  const formattedPoorHealth = recentPoorHealth.map((m) => ({
    id: m.id,
    cropName: m.cropCycle.cropName,
    plotName: m.plot.name,
    farmName: m.farm.name,
    farmId: m.farm.id,
    stage: m.stage,
    impactPercent: m.impactPercent ? m.impactPercent.toString() : null,
    remarks: m.remarks,
    date: m.createdAt.toISOString().slice(0, 10),
  }));

  const formattedIncidents = recentIncidents.map((inc) => ({
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
    date: inc.createdAt.toISOString().slice(0, 10),
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell">
        <DashboardClient
          farms={formattedFarms}
          metrics={metrics}
          poorHealthAlerts={formattedPoorHealth}
          activeIncidents={formattedIncidents}
          userName={session.name}
          role={session.role}
        />
      </main>
    </>
  );
}
