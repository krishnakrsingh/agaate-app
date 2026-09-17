import { requireSession } from "@modules/auth";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { BoundaryTargetPicker } from "@modules/spatial/ui/boundary-target-picker";

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
        <Breadcrumbs items={[{ label: "Field Work", href: "/dashboard" }, { label: "Boundary Walk" }]} />
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Walk the Boundary</h1>
        </div>
        <BoundaryTargetPicker presetFarmId={sp.farmId} presetPlotId={sp.plotId} />
      </main>
    </>
  );
}
