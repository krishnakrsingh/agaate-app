import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PlotEditForm } from "@/components/plot-edit-form";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function PlotPage({
  params,
}: {
  params: Promise<{ plotId: string }>;
}) {
  const { plotId } = await params;
  const session = await requireSession();

  let plot;
  try {
    plot = await prisma.plot.findUniqueOrThrow({
      where: { id: plotId },
      include: {
        irrigation: true,
        farm: { select: { id: true, name: true } },
      },
    });
    await requireFarmAccess(plot.farmId, true);
  } catch {
    return notFound();
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell narrow">
        <Breadcrumbs
          items={[
            { label: plot.farm.name, href: `/farms/${plot.farmId}` },
            { label: plot.name },
          ]}
        />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              PLOT MANAGEMENT &bull; {plot.status}
            </div>
            <h1>{plot.name}</h1>
            <p className="muted">
              Configure boundaries, area, and irrigation infrastructure for {plot.farm.name}.
            </p>
          </div>
        </div>

        <PlotEditForm
          plot={{
            ...plot,
            farmId: plot.farmId,
            area: plot.area.toString(),
            latitude: plot.latitude.toString(),
            longitude: plot.longitude.toString(),
            irrigation: plot.irrigation.map((i) => ({
              type: i.type,
              details: i.details,
            })),
          }}
        />
      </main>
    </>
  );
}
