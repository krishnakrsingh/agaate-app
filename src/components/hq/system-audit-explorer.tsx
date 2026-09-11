import { AuditConsole } from "@/components/audit-console";

// HQ-namespaced audit explorer. Reuses the shared AuditConsole (action /
// entity dropdowns, date range, actor search, pagination, CSV export) as-is;
// this wrapper only adds the section anchor and scope note.
export function SystemAuditExplorer() {
  return (
    <section aria-label="Audit explorer" id="audit" style={{ scrollMarginTop: 16 }}>
      <h2 style={{ fontSize: 16, margin: "0 0 4px" }}>Audit explorer</h2>
      <p className="muted" style={{ fontSize: 12, margin: "0 0 12px" }}>
        Full platform trail via the shared read-only audit API. Filters apply server-side; CSV exports the current page.
      </p>
      <AuditConsole />
    </section>
  );
}
