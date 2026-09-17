import { redirect } from "next/navigation";
import { requireSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { AnalyticsConsole } from "@modules/reporting/ui/analytics-console";

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
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Yield Intelligence &amp; Analytics</h1>
        </div>

        <AnalyticsConsole clients={clients} farms={farms} />
      </main>
    </>
  );
}
