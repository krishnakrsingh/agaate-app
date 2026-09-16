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
        <div className="dir-root">
          <header className="dir-header">
            <div className="dir-header-text">
              <h1 className="dir-title">Incidents</h1>
              <p className="dir-subtitle">Triage field incidents across every estate and client.</p>
            </div>
          </header>

          <Suspense
            fallback={
              <div style={{ padding: 32, textAlign: "center", color: "var(--muted)" }}>
                Loading incident command…
              </div>
            }
          >
            <IncidentsCommand />
          </Suspense>
        </div>
      </main>
    </>
  );
}
