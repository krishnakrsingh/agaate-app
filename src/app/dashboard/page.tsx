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

  const [farms, totalFarms, activeFarms, setupFarms, totalPlots, totalCrops, totalTasks, completedTasks, delayedAlerts, pendingIncidents] =
    await Promise.all([
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

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell">
        <DashboardClient
          farms={formattedFarms}
          metrics={metrics}
          userName={session.name}
          role={session.role}
        />
      </main>
    </>
  );
}
