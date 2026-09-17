import { notFound } from "next/navigation";
import { requireSession, hasPermission } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { FarmEditPageForm } from "@modules/estates/ui/farm-edit-page-form";

export const dynamic = "force-dynamic";

export default async function EditFarmPage({
  params,
}: {
  params: Promise<{ farmId: string }>;
}) {
  const { farmId } = await params;
  const session = await requireSession();

  if (!hasPermission(session.permissions, "farms:write")) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Farms", href: "/hq/farms" }, { label: "Edit Farm" }]} />
          <h1>Access Restricted</h1>
          <p className="error">You do not have permission to edit farm details.</p>
        </main>
      </>
    );
  }

  const farm = await prisma.farm.findUnique({
    where: { id: farmId },
    select: {
      id: true,
      name: true,
      ownerName: true,
      location: true,
      address: true,
      village: true,
      city: true,
      state: true,
      pincode: true,
      localConnect: true,
      surveyNumber: true,
      waterSource: true,
      totalArea: true,
      cultivableArea: true,
      geofenceRadiusMeters: true,
      latitude: true,
      longitude: true,
    },
  });

  if (!farm) notFound();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        <Breadcrumbs
          items={[
            { label: "HQ" },
            { label: "Farms", href: "/hq/farms" },
            { label: farm.name, href: `/hq/farms/${farm.id}` },
            { label: "Edit Farm" },
          ]}
        />
        <FarmEditPageForm
          farm={{
            id: farm.id,
            name: farm.name,
            ownerName: farm.ownerName,
            location: farm.location,
            address: farm.address,
            village: farm.village,
            city: farm.city,
            state: farm.state,
            pincode: farm.pincode,
            localConnect: farm.localConnect,
            surveyNumber: farm.surveyNumber,
            waterSource: farm.waterSource,
            totalArea: farm.totalArea?.toString() ?? "0",
            cultivableArea: farm.cultivableArea?.toString() ?? "0",
            geofenceRadiusMeters: farm.geofenceRadiusMeters,
            latitude: farm.latitude?.toString() ?? "0",
            longitude: farm.longitude?.toString() ?? "0",
          }}
          returnTo={`/hq/farms/${farm.id}`}
        />
      </main>
    </>
  );
}
