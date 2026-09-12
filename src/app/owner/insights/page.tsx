import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ExecutiveBrief } from "@/components/owner/executive-brief";

export const dynamic = "force-dynamic";

export default async function OwnerInsightsPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    select: { id: true, name: true, location: true, cultivableArea: true },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  const serializedFarms = farms.map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location,
    cultivableArea: f.cultivableArea?.toString() ?? "0",
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Farm Insights" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              ESTATE • FARM-LEVEL ANALYTICS
            </div>
            <h1>Farm Insights &amp; Intelligence</h1>
            <p className="muted">
              Farm-level production telemetry, seasonal yield volumes, labour deployment efficiency, and executive brief generator.
            </p>
          </div>
        </div>

        {serializedFarms.length > 0 ? (
          <ExecutiveBrief farms={serializedFarms} />
        ) : (
          <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
            No active estate profile found to generate insights.
          </div>
        )}
      </main>
    </>
  );
}
