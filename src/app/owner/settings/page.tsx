import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { FarmSettingsConsole } from "@/components/owner/farm-settings-console";

export const dynamic = "force-dynamic";

export default async function OwnerSettingsPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const farm = await prisma.farm.findFirst({
    where: farmWhere,
    select: {
      id: true,
      name: true,
      location: true,
      address: true,
      geofenceRadiusMeters: true,
      waterSource: true,
      soilType: true,
    },
  });

  if (!farm) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Farm Settings" }]} />
          <h1>No Active Farm Found</h1>
          <p className="muted">You need an active farm estate to calibrate configuration settings.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Farm Settings" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              ESTATE • CONFIGURATION &amp; PERIMETER
            </div>
            <h1>Farm Settings</h1>
            <p className="muted">
              Configure estate metadata, geofence radius calibration, and soil/water infrastructural baseline.
            </p>
          </div>
        </div>

        <FarmSettingsConsole farm={farm} />
      </main>
    </>
  );
}
