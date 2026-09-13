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
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Incidents Command</h1>
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
