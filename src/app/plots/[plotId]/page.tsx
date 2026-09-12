import { notFound } from "next/navigation";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { PlotEditForm } from "@/components/plot-edit-form";
import { BoundaryHistory } from "@/components/boundary-history";
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
        farm: { select: { id: true, name: true, boundaryGeoJson: true, latitude: true, longitude: true } },
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
            <div style={{ marginTop: 10 }}>
              <Link href={`/officer/boundary?plotId=${plot.id}`} className="btn btn-secondary btn-sm">
                Walk plot fence with GPS
              </Link>
            </div>
          </div>
        </div>

        <PlotEditForm
          plot={{
            ...plot,
            farmId: plot.farmId,
            area: plot.area?.toString() ?? "0",
            latitude: plot.latitude?.toString() ?? "0",
            longitude: plot.longitude?.toString() ?? "0",
            measuredAcres: plot.measuredAcres ? plot.measuredAcres.toString() : null,
            irrigation: plot.irrigation.map((i) => ({
              type: i.type,
              details: i.details,
            })),
          }}
          farmBoundary={plot.farm.boundaryGeoJson}
          farmCenter={plot.farm.latitude != null && plot.farm.longitude != null ? [Number(plot.farm.latitude), Number(plot.farm.longitude)] : null}
        />

        <div style={{ marginTop: 20 }}>
          <BoundaryHistory entityType="PLOT" entityId={plot.id} canRestore currentBoundary={plot.boundaryGeoJson} />
        </div>
      </main>
    </>
  );
}
