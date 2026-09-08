import { requireSession } from "@/lib/auth";
import { AuditConsole } from "@/components/audit-console";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const session = await requireSession();

  if (!["SUPER_ADMIN", "FARM_ADMIN"].includes(session.role)) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Audit Trail" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only administrators can inspect operational audit logs.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell">
        <Breadcrumbs items={[{ label: "Security & Compliance" }, { label: "System Audit Trail" }]} />

        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              SYSTEM GOVERNANCE &amp; TRACEABILITY
            </div>
            <h1 className="page-title">Executive Audit Trail</h1>
            <p className="muted">
              Immutable ledger of platform actions, officer shift verifications, exception rulings, and infrastructure provisioning.
            </p>
          </div>
        </div>

        <AuditConsole />
      </main>
    </>
  );
}
