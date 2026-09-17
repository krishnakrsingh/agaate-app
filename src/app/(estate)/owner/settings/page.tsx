import { requireSession } from "@modules/auth";
import { accessibleFarmWhere } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { FarmSettingsConsole } from "@modules/estates/ui/farm-settings-console";

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
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Farm Settings</h1>
        </div>

        <FarmSettingsConsole farm={farm} />
      </main>
    </>
  );
}
