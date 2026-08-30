import { requireSession } from "@/lib/auth";
import { ApprovalsConsole } from "@/components/approvals-console";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function AdminApprovalsPage() {
  const session = await requireSession();

  if (!["SUPER_ADMIN", "FARM_ADMIN"].includes(session.role)) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Approvals" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Farm Admins and Super Admins can review operational exceptions.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell">
        <Breadcrumbs items={[{ label: "Approvals & Exceptions" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              COMPLIANCE & AUDIT LOGS
            </div>
            <h1>Approvals & Operational Exceptions</h1>
            <p className="muted">
              Review geofence distance exceptions, authorize farm location changes, and monitor live attendance logs.
            </p>
          </div>
        </div>

        <ApprovalsConsole />
      </main>
    </>
  );
}
