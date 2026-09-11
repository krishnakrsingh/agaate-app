import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AnalyticsConsole } from "@/components/hq/analytics-console";

export const dynamic = "force-dynamic";

export default async function HqAnalyticsPage() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN" && session.role !== "AGRONOMIST") {
    redirect("/");
  }

  // Filter options only: capped lookups, no row scans on this page.
  const [clients, farms] = await Promise.all([
    prisma.client.findMany({
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
    prisma.farm.findMany({
      select: { id: true, name: true, clientId: true },
      orderBy: { name: "asc" },
      take: 100,
    }),
  ]);

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "HQ Analytics" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              HQ • FARMING HISTORY &amp; YIELD INTELLIGENCE
            </div>
            <h1>Farming History &amp; Yield Intelligence</h1>
            <p className="muted">
              Crop history per plot, harvest totals, officer productivity, land utilization, and incident rates.
              Scoped to one client or farm at a time — pick a scope and date range to begin.
            </p>
          </div>
        </div>

        <AnalyticsConsole clients={clients} farms={farms} />
      </main>
    </>
  );
}
