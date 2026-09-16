import Link from "next/link";
import { DEFAULT_GEOFENCE_RADIUS_METERS } from "@/lib/business";

type Policy = {
  title: string;
  value: string;
  note: string;
  href: string;
  linkLabel: string;
};

// Read-only mirror of enforced platform defaults. Values are sourced from
// code/schema constants where one exists; each card links to where the
// policy takes effect. Nothing here is editable from this page.
const POLICIES: Policy[] = [
  {
    title: "GEOFENCE DEFAULT",
    value: `${DEFAULT_GEOFENCE_RADIUS_METERS}m radius`,
    note: "Farm.geofenceRadiusMeters default; per-farm override on the farm record.",
    href: "/farms",
    linkLabel: "Where used: Farms",
  },
  {
    title: "SETUP SLA",
    value: "30 days per stage",
    note: "Farms stalled in a setup stage past 30 days are flagged for follow-up.",
    href: "/operations",
    linkLabel: "Where used: Operations",
  },
  {
    title: "PASSWORD POLICY",
    value: "Min 12 characters",
    note: "Enforced by validation when creating or updating a user.",
    href: "/people",
    linkLabel: "Where used: People",
  },
  {
    title: "AUDIT IMMUTABLE",
    value: "Append-only log",
    note: "AuditLog has a read-only API; there is no edit or delete endpoint.",
    href: "/hq/system#audit",
    linkLabel: "Where used: Audit explorer below",
  },
  {
    title: "ROSTER CAPS",
    value: "Assigned officers only",
    note: "Attendance roster is scoped to assigned (officer, farm) pairs and role-gated.",
    href: "/attendance",
    linkLabel: "Where used: Attendance",
  },
];

export function SystemPolicyCards() {
  return (
    <section
      aria-label="Platform policies"
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--line)",
        borderRadius: 12,
        padding: 20,
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 12,
      }}
    >
      {POLICIES.map((policy) => (
        <div key={policy.title}>
          <div className="eyebrow" style={{ fontSize: 10, margin: 0 }}>
            {policy.title}
          </div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{policy.value}</div>
          <div className="muted" style={{ fontSize: 12 }}>
            {policy.note}
          </div>
          <Link href={policy.href} style={{ fontSize: 12 }}>
            {policy.linkLabel}
          </Link>
        </div>
      ))}
    </section>
  );
}
