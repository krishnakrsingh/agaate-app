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
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Farm Insights &amp; Intelligence</h1>
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
