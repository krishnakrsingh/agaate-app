import "server-only";
import { prisma } from "@infrastructure/db";

/**
 * modules/chat/dossier — the live farm snapshot behind the agronomist
 * workspace. One query set, two doors: a conversation (context route) or a
 * bare farm (dossier route). All takes bounded; no full-farm loads.
 */
export async function getFarmDossier(farmId: string) {
  const [farm, plots, incidents, prescriptions, tasks, access] = await Promise.all([
    prisma.farm.findUniqueOrThrow({
      where: { id: farmId },
      select: {
        id: true, name: true, location: true, village: true, district: true, state: true,
        totalArea: true, cultivableArea: true, waterSource: true, soilType: true,
        soilPh: true, status: true, setupStage: true, boundaryGeoJson: true,
      },
    }),
    prisma.plot.findMany({
      where: { farmId, deletedAt: null },
      select: {
        id: true, name: true, area: true, soilType: true, irrigationSetup: true,
        valvesCount: true, status: true, boundaryGeoJson: true,
        irrigation: { select: { type: true } },
        cropCycles: {
          where: { status: { in: ["ACTIVE", "PLANNED"] } },
          select: {
            id: true, cropName: true, status: true, startDate: true, expectedFirstHarvestDate: true,
            varieties: { select: { name: true } },
            monitoring: { orderBy: { createdAt: "desc" }, take: 1 },
          },
          orderBy: { startDate: "desc" },
          take: 3,
        },
      },
      orderBy: { name: "asc" },
      take: 100,
    }),
    prisma.incident.findMany({
      where: { farmId, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
      select: {
        id: true, plotId: true, cropCycleId: true, level: true, type: true,
        severity: true, status: true, createdAt: true,
        plot: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.agronomyPrescription.findMany({
      where: { farmId },
      select: {
        id: true, plotId: true, targetIssue: true, priority: true,
        status: true, applicationDate: true,
        plot: { select: { name: true } },
        author: { select: { name: true } },
      },
      orderBy: { applicationDate: "desc" },
      take: 5,
    }),
    prisma.task.findMany({
      where: { farmId, status: { in: ["ASSIGNED", "IN_PROGRESS", "BLOCKED"] } },
      select: {
        id: true, plotId: true, title: true, category: true,
        priority: true, status: true, dueDate: true,
        assignedOfficer: { select: { id: true, name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 10,
    }),
    prisma.farmAccess.findMany({
      where: { farmId },
      select: { userId: true, canManage: true },
    }),
  ]);

  const people = access.length
    ? await prisma.user.findMany({
        where: { id: { in: access.map((a) => a.userId) }, active: true },
        select: { id: true, name: true, role: true, phone: true },
      })
    : [];
  const peopleById = new Map(people.map((p) => [p.id, p]));

  return {
    farm,
    plots: plots.map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area.toString(),
      soilType: p.soilType,
      irrigationSetup: p.irrigationSetup,
      irrigationType: p.irrigation[0]?.type ?? null,
      valvesCount: p.valvesCount,
      status: p.status,
      boundaryGeoJson: p.boundaryGeoJson ?? null,
      cycles: p.cropCycles.map((c) => ({
        id: c.id,
        cropName: c.cropName,
        variety: c.varieties[0]?.name ?? null,
        status: c.status,
        startDate: c.startDate,
        expectedFirstHarvestDate: c.expectedFirstHarvestDate,
        latestStage: c.monitoring[0]?.stage ?? null,
        latestHealth: c.monitoring[0]?.status ?? null,
        latestNote: c.monitoring[0]?.remarks ?? null,
      })),
    })),
    openIncidents: incidents,
    recentPrescriptions: prescriptions,
    activeTasks: tasks,
    people: access.map((a) => ({
      userId: a.userId,
      canManage: a.canManage,
      name: peopleById.get(a.userId)?.name ?? "Unknown",
      role: peopleById.get(a.userId)?.role ?? null,
      phone: peopleById.get(a.userId)?.phone ?? null,
    })),
  };
}
