import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { PlotsExplorer } from "@/components/owner/plots-explorer";

export const dynamic = "force-dynamic";

export default async function OwnerPlotsPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    include: {
      plots: {
        where: { deletedAt: null, status: { not: "ARCHIVED" } },
        include: {
          irrigation: true,
          cropCycles: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              cropName: true,
              varieties: { select: { name: true } },
              status: true,
              startDate: true,
              expectedFirstHarvestDate: true,
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedFarms = farms.map((f) => ({
    id: f.id,
    name: f.name,
    cultivableArea: f.cultivableArea.toString(),
    totalArea: f.totalArea.toString(),
    latitude: f.latitude.toString(),
    longitude: f.longitude.toString(),
    plots: f.plots.map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area.toString(),
      soilType: p.soilType,
      status: p.status,
      latitude: p.latitude.toString(),
      longitude: p.longitude.toString(),
      irrigation: p.irrigation.map((i) => ({
        id: i.id,
        type: i.type,
        details: i.details,
      })),
      cropCycles: p.cropCycles.map((c) => ({
        id: c.id,
        cropName: c.cropName,
        variety: c.varieties[0]?.name || null,
        status: c.status,
        startDate: c.startDate.toISOString(),
        endDate: c.expectedFirstHarvestDate ? c.expectedFirstHarvestDate.toISOString() : null,
      })),
    })),
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <PlotsExplorer farms={serializedFarms} />
      </main>
    </>
  );
}
