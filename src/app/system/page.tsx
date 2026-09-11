import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { AuditConsole } from "@/components/audit-console";
import { DEFAULT_GEOFENCE_RADIUS_METERS } from "@/lib/business";

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
              CONFIGURE • POLICIES &amp; AUDIT
            </div>
            <h1>System</h1>
            <p className="muted">
              Platform policies (read-only) and the immutable audit trail. Pending approvals live in Operations → Inbox.
            </p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <section
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            <div>
              <div className="eyebrow" style={{ fontSize: 10, margin: 0 }}>GEOFENCE DEFAULT</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>{DEFAULT_GEOFENCE_RADIUS_METERS}m radius</div>
              <div className="muted" style={{ fontSize: 12 }}>Per-estate override in Estate Settings.</div>
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: 10, margin: 0 }}>SETUP SLA</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>30 days per stage</div>
              <div className="muted" style={{ fontSize: 12 }}>Flagged in Operations → Stalled.</div>
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: 10, margin: 0 }}>PASSWORD POLICY</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Min 12 characters</div>
              <div className="muted" style={{ fontSize: 12 }}>Applies to People → Add member and Attendance → Hire.</div>
            </div>
            <div>
              <div className="eyebrow" style={{ fontSize: 10, margin: 0 }}>AUDIT RETENTION</div>
              <div style={{ fontWeight: 700, fontSize: 16 }}>Immutable log</div>
              <div className="muted" style={{ fontSize: 12 }}>Filter below by action, entity, date, or actor.</div>
            </div>
          </section>

          <AuditConsole />
        </div>
      </main>
    </>
  );
}
