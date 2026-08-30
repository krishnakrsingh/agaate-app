import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { requireFarmAccess } from "@/lib/access";
import { CropCycleForm } from "@/components/crop-cycle-form";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function NewCropCyclePage({
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
      include: { farm: { select: { id: true, name: true } } },
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
            { label: plot.name, href: `/plots/${plot.id}` },
            { label: "New Crop Cycle" },
          ]}
        />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              CROP PLANNING &bull; {plot.name} ({plot.area.toString()} ACRES)
            </div>
            <h1>Plan Crop Cycle</h1>
            <p className="muted">
              Configure crop infrastructure, population targets, and automated milestone activities for {plot.farm.name}.
            </p>
          </div>
        </div>

        <CropCycleForm
          plotId={plotId}
          farmId={plot.farmId}
          plotArea={Number(plot.area)}
        />
      </main>
    </>
  );
}
