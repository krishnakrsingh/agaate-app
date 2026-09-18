import { requireSession, accessibleFarmWhere } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { OwnerCropsView, SerializedCropCycle } from "@modules/crops/ui/owner-crops-view";
import { CropCycleTargetPlot } from "@modules/crops/ui/crop-cycle-wizard";

export const dynamic = "force-dynamic";

export default async function OwnerCropsPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  // Fetch farms and plots accessible to this client/farm admin
  const farms = await prisma.farm.findMany({
    where: farmWhere,
    include: {
      plots: {
        where: { deletedAt: null, status: { not: "ARCHIVED" } },
        include: {
          cropCycles: {
            orderBy: { createdAt: "desc" },
            include: {
              varieties: true,
              milestones: {
                orderBy: { targetDate: "asc" },
              },
              prescriptions: {
                take: 5,
                orderBy: { createdAt: "desc" },
              },
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const availablePlots: CropCycleTargetPlot[] = [];
  const serializedCycles: SerializedCropCycle[] = [];

  for (const f of farms) {
    for (const p of f.plots) {
      availablePlots.push({
        id: p.id,
        name: p.name,
        area: p.area.toString(),
        farmId: f.id,
        farmName: f.name,
      });

      for (const c of p.cropCycles) {
        serializedCycles.push({
          id: c.id,
          cropName: c.cropName,
          startDate: c.startDate.toISOString(),
          expectedFirstHarvestDate: c.expectedFirstHarvestDate?.toISOString() || null,
          status: c.status,
          establishmentType: c.establishmentType,
          plantingMethod: c.plantingMethod,
          spacing: c.spacing,
          bedPreparationEnabled: c.bedPreparationEnabled,
          bedWidthCm: c.bedWidthCm ? parseFloat(c.bedWidthCm.toString()) : null,
          bedCenterDistanceCm: c.bedCenterDistanceCm ? parseFloat(c.bedCenterDistanceCm.toString()) : null,
          expectedBedsPerAcre: c.expectedBedsPerAcre ? parseFloat(c.expectedBedsPerAcre.toString()) : null,
          mulchEnabled: c.mulchEnabled,
          mulchHolePattern: c.mulchHolePattern,
          plantDistanceCm: c.plantDistanceCm ? parseFloat(c.plantDistanceCm.toString()) : null,
          expectedPlantsPerAcre: c.expectedPlantsPerAcre ? parseFloat(c.expectedPlantsPerAcre.toString()) : null,
          varieties: c.varieties.map((v) => v.name),
          milestones: c.milestones.map((m) => ({
            id: m.id,
            name: m.name,
            targetDate: m.targetDate.toISOString(),
            status: m.status,
            completedAt: m.completedAt?.toISOString() || null,
            remarks: m.remarks,
          })),
          prescriptions: c.prescriptions.map((pr) => ({
            id: pr.id,
            targetIssue: pr.targetIssue,
            instructions: pr.instructions,
            priority: pr.priority,
            status: pr.status,
            createdAt: pr.createdAt.toISOString(),
          })),
          plotId: p.id,
          plotName: p.name,
          plotArea: p.area.toString(),
          plotBoundaryGeoJson: p.boundaryGeoJson,
          farmId: f.id,
          farmName: f.name,
          farmLatitude: f.latitude.toString(),
          farmLongitude: f.longitude.toString(),
          farmBoundaryGeoJson: f.boundaryGeoJson,
        });
      }
    }
  }

  const serializedFarmList = farms.map((f) => ({
    id: f.id,
    name: f.name,
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell" style={{ paddingBottom: 32 }}>
        <OwnerCropsView
          cropCycles={serializedCycles}
          availablePlots={availablePlots}
          farms={serializedFarmList}
        />
      </main>
    </>
  );
}
