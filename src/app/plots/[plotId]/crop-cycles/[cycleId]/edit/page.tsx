import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { getEditCropCyclePageData } from "@/modules/cropping";
import { CropCycleEditForm } from "@modules/cropping/ui/crop-cycle-edit-form";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function EditCropCyclePage({
  params,
}: {
  params: Promise<{ plotId: string; cycleId: string }>;
}) {
  const { plotId, cycleId } = await params;
  const session = await requireSession();

  let plot;
  try {
    const data = await getEditCropCyclePageData({ plotId, cycleId });
    plot = data.plot;
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
            { label: plot.name, href: `/plots/${plotId}` },
            { label: "Edit Crop Cycle" },
          ]}
        />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              CROP PLANNING &bull; {plot.name}
            </div>
            <h1>Edit Crop Cycle</h1>
            <p className="muted">
              Variety and milestone changes are persisted and immediately update any pending system tasks.
            </p>
          </div>
        </div>

        <CropCycleEditForm plotId={plotId} cycleId={cycleId} farmId={plot.farmId} />
      </main>
    </>
  );
}
