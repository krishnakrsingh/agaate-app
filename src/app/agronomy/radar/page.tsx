import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { CropRadar, CropRadarItem } from "@/components/agronomy/crop-radar";

export const dynamic = "force-dynamic";

export default async function AgronomyRadarPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  // Bounded: first 200 active cycles by start date + real total. The old
  // build loaded every ACTIVE cycle in the portfolio into one page.
  const where = {
    status: "ACTIVE" as const,
    plot: {
      farm: farmWhere,
      deletedAt: null,
    },
  };
  const [activeCycles, totalActive] = await Promise.all([
  prisma.cropCycle.findMany({
    where,
    include: {
      plot: {
        include: {
          farm: { select: { id: true, name: true } },
          irrigation: true,
        },
      },
      varieties: { select: { name: true } },
      monitoring: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      _count: {
        select: {
          monitoring: true,
        },
      },
    },
    orderBy: { startDate: "asc" },
    take: 200,
  }),
  prisma.cropCycle.count({ where }),
  ]);

  const now = new Date();

  const items: CropRadarItem[] = activeCycles.map((c) => {
    const diffTime = Math.abs(now.getTime() - new Date(c.startDate).getTime());
    const daysInGround = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const latestMon = c.monitoring[0];

    return {
      cycleId: c.id,
      cropName: c.cropName,
      variety: c.varieties[0]?.name || null,
      startDate: c.startDate.toISOString(),
      endDate: c.expectedFirstHarvestDate ? c.expectedFirstHarvestDate.toISOString() : null,
      daysInGround,
      plotId: c.plot.id,
      plotName: c.plot.name,
      plotArea: c.plot.area.toString(),
      soilType: c.plot.soilType,
      irrigationType: c.plot.irrigation[0]?.type || "Rainfed",
      farmId: c.plot.farm.id,
      farmName: c.plot.farm.name,
      latestHealthStatus: latestMon?.status || null,
      latestStage: latestMon?.stage || null,
      recentPhotosCount: c._count.monitoring,
    };
  });

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <CropRadar items={items} total={totalActive} />
      </main>
    </>
  );
}
