import { requireSession } from "@/lib/auth";
import { OfficerSignalsConsole } from "@/components/officer-signals-console";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function OfficerReportsPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell narrow">
        <Breadcrumbs items={[{ label: "Field Signals & Incidents" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              FIELD INTELLIGENCE &bull; {session.name}
            </div>
            <h1 className="page-title">Field Signals &amp; Incident Intelligence</h1>
            <p className="muted">
              Document field hazards, upload photographic evidence, track mitigation progress, and log crop observations.
            </p>
          </div>
        </div>

        <OfficerSignalsConsole />
      </main>
    </>
  );
}
