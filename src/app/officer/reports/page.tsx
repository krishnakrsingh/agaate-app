import { requireSession } from "@/lib/auth";
import { FieldReports } from "@/components/field-reports";
import { LocationRequestForm } from "@/components/location-request-form";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function OfficerReportsPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell narrow">
        <Breadcrumbs items={[{ label: "Field Signals" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              FIELD INTELLIGENCE &bull; {session.name}
            </div>
            <h1>Field Signals & Incident Logs</h1>
            <p className="muted">
              Submit daily visual crop health updates and report positive or negative field incidents.
            </p>
          </div>
        </div>

        <FieldReports />
        <LocationRequestForm />
      </main>
    </>
  );
}
