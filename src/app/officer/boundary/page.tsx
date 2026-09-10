import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { BoundaryTargetPicker } from "@/components/boundary-target-picker";

export const dynamic = "force-dynamic";

export default async function BoundaryWalkPage({
  searchParams,
}: {
  searchParams: Promise<{ farmId?: string; plotId?: string }>;
}) {
  const session = await requireSession();
  const sp = await searchParams;

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        <Breadcrumbs items={[{ label: "Field Work" }, { label: "Boundary Walk" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              FIELD CAPTURE • GPS PERIMETER WALK
            </div>
            <h1>Walk the Boundary</h1>
            <p className="muted">
              Walk the fence line with GPS on. The server rebuilds and validates the polygon from your raw
              track — nothing is authoritative until sync is accepted.
            </p>
          </div>
        </div>
        <BoundaryTargetPicker presetFarmId={sp.farmId} presetPlotId={sp.plotId} />
      </main>
    </>
  );
}
