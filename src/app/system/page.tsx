import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AuditConsole } from "@/components/audit-console";
import { ApprovalsConsole } from "@/components/approvals-console";

export const dynamic = "force-dynamic";

export default async function SystemPage() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "System Governance" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can access system configuration and audit controls.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "System Governance" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              CONFIGURE • PLATFORM SYSTEM &amp; GOVERNANCE
            </div>
            <h1>System Governance &amp; Audit</h1>
            <p className="muted">
              Platform security parameters, immutable activity audit trail, and pending administrative verification approvals.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          {/* Verification & Approvals Desk */}
          <section>
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--ink)", marginBottom: "12px" }}>
              Pending Verification &amp; Approvals
            </h2>
            <ApprovalsConsole />
          </section>

          {/* Immutable Audit Log Console */}
          <section>
            <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--ink)", marginBottom: "12px" }}>
              Platform Audit Trail
            </h2>
            <AuditConsole />
          </section>
        </div>
      </main>
    </>
  );
}
