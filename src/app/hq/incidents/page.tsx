import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { IncidentsCommand } from "@/components/hq/incidents-command";

export const dynamic = "force-dynamic";

export default async function HqIncidentsPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "HQ" }, { label: "Incidents" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              HQ Command
            </div>
            <h1>Incidents</h1>
            <p className="muted">
              Severity mapping: P0 is Critical, P1 is High, P2 is Medium, Low or unset.
              An open P0 older than 24 hours breaches SLA and is highlighted.
            </p>
          </div>
        </div>

        <Suspense
          fallback={
            <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
              Loading incident command…
            </div>
          }
        >
          <IncidentsCommand />
        </Suspense>
      </main>
    </>
  );
}
