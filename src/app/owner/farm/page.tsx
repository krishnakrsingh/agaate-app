import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { MyFarmOverview } from "@/components/owner/my-farm-overview";

export const dynamic = "force-dynamic";

export default async function OwnerFarmPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    include: {
      _count: {
        select: { plots: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedFarms = farms.map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location,
    address: f.address,
    latitude: f.latitude.toString(),
    longitude: f.longitude.toString(),
    totalArea: f.totalArea.toString(),
    cultivableArea: f.cultivableArea.toString(),
    waterSource: f.waterSource,
    soilType: f.soilType,
    surveyNumber: f.surveyNumber,
    village: f.village,
    taluk: f.taluk,
    district: f.district,
    state: f.state,
    pincode: f.pincode,
    terrainType: f.terrainType,
    fencingType: f.fencingType,
    borewellCount: f.borewellCount,
    borewellDepthFeet: f.borewellDepthFeet,
    waterYieldGph: f.waterYieldGph,
    electricitySupply: f.electricitySupply,
    soilPh: f.soilPh ? f.soilPh.toString() : null,
    soilEc: f.soilEc ? f.soilEc.toString() : null,
    soilOrganicCarbon: f.soilOrganicCarbon ? f.soilOrganicCarbon.toString() : null,
    proposedCrops: f.proposedCrops,
    status: f.status,
    setupStage: f.setupStage,
    plotsCount: f._count.plots,
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "My Farm" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              ESTATE • OPERATIONAL PROFILE
            </div>
            <h1>My Farm</h1>
            <p className="muted">
              Spatial geometry, cadastral records, soil baseline chemistry, and agricultural infrastructure specifications.
            </p>
          </div>
        </div>

        <MyFarmOverview farms={serializedFarms} />
      </main>
    </>
  );
}
