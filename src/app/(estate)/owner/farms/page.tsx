import { requireSession, accessibleFarmWhere } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { OwnerFarmsView, OwnerFarmData } from "@modules/estates/ui/owner-farms-view";

export const dynamic = "force-dynamic";

export default async function OwnerFarmsPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    include: {
      plots: {
        where: { deletedAt: null, status: { not: "ARCHIVED" } },
        include: {
          cropCycles: {
            where: { status: { in: ["ACTIVE", "PLANNED"] } },
            select: { cropName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedFarms: OwnerFarmData[] = farms.map((f) => {
    const cropSet = new Set<string>();
    f.plots.forEach((p) => {
      p.cropCycles.forEach((c) => cropSet.add(c.cropName));
    });

    return {
      id: f.id,
      name: f.name,
      location: f.location,
      surveyNumber: f.surveyNumber,
      state: f.state,
      district: f.district,
      totalArea: f.totalArea.toString(),
      cultivableArea: f.cultivableArea.toString(),
      waterSource: f.waterSource,
      soilType: f.soilType,
      status: f.status,
      plotCount: f.plots.length,
      activeCropCount: cropSet.size,
      crops: Array.from(cropSet),
    };
  });

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <OwnerFarmsView farms={serializedFarms} clientName={session.name} />
      </main>
    </>
  );
}
