import { requireSession, accessibleFarmWhere } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { OwnerPlotsView, OwnerPlotFarm } from "@modules/plots/ui/owner-plots-view";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: Promise<{ farmId?: string }>;
}

export default async function OwnerPlotsPage({ searchParams }: Props) {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();
  const resolvedParams = searchParams ? await searchParams : {};

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    include: {
      plots: {
        where: { deletedAt: null, status: { not: "ARCHIVED" } },
        include: {
          irrigation: { select: { type: true } },
          cropCycles: {
            where: { status: { in: ["ACTIVE", "PLANNED"] } },
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              id: true,
              cropName: true,
              status: true,
              startDate: true,
              expectedFirstHarvestDate: true,
              varieties: { select: { name: true } },
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedFarms: OwnerPlotFarm[] = farms.map((f) => ({
    id: f.id,
    name: f.name,
    latitude: f.latitude.toString(),
    longitude: f.longitude.toString(),
    totalArea: f.totalArea.toString(),
    cultivableArea: f.cultivableArea.toString(),
    boundaryGeoJson: f.boundaryGeoJson,
    plots: f.plots.map((p) => {
      const activeCycle = p.cropCycles[0];
      return {
        id: p.id,
        name: p.name,
        area: p.area.toString(),
        boundaryGeoJson: p.boundaryGeoJson,
        status: p.status,
        soilType: p.soilType,
        irrigationType: p.irrigation[0]?.type || null,
        farmId: f.id,
        farmName: f.name,
        activeCrop: activeCycle
          ? {
              id: activeCycle.id,
              cropName: activeCycle.cropName,
              variety: activeCycle.varieties[0]?.name || null,
              status: activeCycle.status,
              startDate: activeCycle.startDate.toISOString(),
              harvestDate: activeCycle.expectedFirstHarvestDate
                ? activeCycle.expectedFirstHarvestDate.toISOString()
                : null,
            }
          : null,
      };
    }),
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <OwnerPlotsView farms={serializedFarms} initialFarmId={resolvedParams.farmId} />
      </main>
    </>
  );
}
