import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { DashboardClient } from "@/components/dashboard-client";
import { FarmSetupStage } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await requireSession();

  // Run fast indexed aggregations for 10,000+ client scale
  const [
    totalClients,
    totalFarms,
    activeFarms,
    setupFarms,
    acreageSums,
    totalPlots,
    pipelineFarmsRaw,
    initialClientsRaw,
    stageGroupCounts,
  ] = await Promise.all([
    // 1. Macro counts
    prisma.client.count(),
    prisma.farm.count(),
    prisma.farm.count({ where: { status: "ACTIVE" } }),
    prisma.farm.count({ where: { status: "SETUP" } }),
    prisma.farm.aggregate({
      _sum: { totalArea: true, cultivableArea: true },
    }),
    prisma.plot.count({ where: { status: { not: "ARCHIVED" } } }),

    // 2. In-flight setup pipeline farms (most recent 60)
    prisma.farm.findMany({
      where: {
        OR: [
          { status: "SETUP" },
          { setupStage: { not: "HANDED_OVER" } },
          {
            AND: [
              { setupStage: "HANDED_OVER" },
              {
                handedOverAt: {
                  gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
                },
              },
            ],
          },
        ],
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
            phone: true,
            code: true,
          },
        },
        _count: {
          select: { plots: true },
        },
      },
      orderBy: { updatedAt: "desc" },
      take: 60,
    }),

    // 3. Paginated Enterprise Clients (Initial Page 1, 20 items)
    prisma.client.findMany({
      include: {
        farms: {
          select: {
            id: true,
            name: true,
            location: true,
            status: true,
            setupStage: true,
            setupProgress: true,
            cultivableArea: true,
            totalArea: true,
          },
        },
        users: {
          where: { role: "FARM_ADMIN" },
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        _count: {
          select: { farms: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 20,
      skip: 0,
    }),

    // 4. Setup stage counts
    prisma.farm.groupBy({
      by: ["setupStage"],
      _count: { _all: true },
    }),
  ]);

  // Map stage counts
  const stageCounts: Record<FarmSetupStage, number> = {
    SURVEY_SOIL_TEST: 0,
    PLOT_DEMARCATION: 0,
    BED_SOIL_PREP: 0,
    IRRIGATION_LAYOUT: 0,
    HANDED_OVER: 0,
  };

  for (const item of stageGroupCounts) {
    if (item.setupStage && item.setupStage in stageCounts) {
      stageCounts[item.setupStage] = item._count._all;
    }
  }

  const inFlightSetups =
    stageCounts.SURVEY_SOIL_TEST +
    stageCounts.PLOT_DEMARCATION +
    stageCounts.BED_SOIL_PREP +
    stageCounts.IRRIGATION_LAYOUT;

  const macroTelemetry = {
    totalClients,
    totalFarms,
    activeFarms,
    setupFarms,
    totalAcreage: Number(acreageSums._sum.totalArea || 0),
    totalCultivable: Number(acreageSums._sum.cultivableArea || 0),
    totalPlots,
    inFlightSetups,
  };

  // Format pipeline farms
  const pipelineFarms = pipelineFarmsRaw.map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location,
    ownerName: f.ownerName,
    clientPhone: f.clientPhone,
    clientName: f.client?.name || f.ownerName,
    clientCode: f.client?.code || `CLI-${f.id.slice(-4).toUpperCase()}`,
    totalArea: f.totalArea.toString(),
    cultivableArea: f.cultivableArea.toString(),
    plotsCount: f._count.plots,
    status: f.status,
    setupStage: f.setupStage,
    setupProgress: f.setupProgress,
    createdAt: f.createdAt.toISOString(),
    handedOverAt: f.handedOverAt ? f.handedOverAt.toISOString() : null,
  }));

  // Format initial clients
  const initialClients = initialClientsRaw.map((c) => {
    const totalAcreage = c.farms.reduce(
      (acc, f) => acc + Number(f.totalArea || 0),
      0
    );
    const totalCultivable = c.farms.reduce(
      (acc, f) => acc + Number(f.cultivableArea || 0),
      0
    );
    const activeFarmsCount = c.farms.filter((f) => f.status === "ACTIVE").length;
    const setupFarmsCount = c.farms.filter((f) => f.status === "SETUP").length;

    return {
      id: c.id,
      code: c.code || `CLI-${c.id.slice(-4).toUpperCase()}`,
      name: c.name,
      companyName: c.companyName,
      email: c.email,
      phone: c.phone,
      state: c.state,
      district: c.district,
      status: c.status,
      createdAt: c.createdAt.toISOString(),
      totalFarms: c._count.farms,
      activeFarmsCount,
      setupFarmsCount,
      totalAcreage,
      totalCultivable,
      farms: c.farms.map((f) => ({
        id: f.id,
        name: f.name,
        status: f.status,
        setupStage: f.setupStage,
        setupProgress: f.setupProgress,
        cultivableArea: f.cultivableArea.toString(),
      })),
      owners: c.users,
    };
  });

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <DashboardClient
          macroTelemetry={macroTelemetry}
          stageCounts={stageCounts}
          initialPipelineFarms={pipelineFarms}
          initialClients={initialClients}
          userName={session.name}
          role={session.role}
        />
      </main>
    </>
  );
}
