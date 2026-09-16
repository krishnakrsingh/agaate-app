import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime } from "@/lib/business";

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

export async function OverviewTriage() {
  try {
    const [
      criticalIncidents,
      highIncidentsCount,
      setupFarmsCount,
      farmsWithoutAgronomist,
    ] = await Promise.all([
      prisma.incident.findMany({
        where: {
          status: { in: ["OPEN", "ACKNOWLEDGED"] },
          severity: "CRITICAL",
        },
        select: {
          id: true,
          type: true,
          description: true,
          createdAt: true,
          farm: {
            select: { id: true, name: true, ownerName: true },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 3,
      }),
      prisma.incident.count({
        where: {
          status: { in: ["OPEN", "ACKNOWLEDGED"] },
          severity: "HIGH",
        },
      }),
      prisma.farm.count({
        where: { status: "SETUP" },
      }),
      prisma.farm.count({
        where: {
          status: { in: ["ACTIVE", "SETUP"] },
          access: {
            none: {
              user: { role: "AGRONOMIST" },
            },
          },
        },
      }),
    ]);

    const hasCritical = criticalIncidents.length > 0;
    const hasItems = hasCritical || highIncidentsCount > 0 || setupFarmsCount > 0 || farmsWithoutAgronomist > 0;

    if (!hasItems) {
      return (
        <section className="compact-card" style={{ borderLeft: "4px solid var(--primary)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 20 }}>✓</span>
              <div>
                <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 15 }}>
                  All Systems Operational
                </div>
                <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                  No open critical incidents, pending onboarding bottlenecks, or unassigned estates.
                </div>
              </div>
            </div>
            <Link href="/hq/farms" className="btn btn-secondary btn-sm">
              View All Farms
            </Link>
          </div>
        </section>
      );
    }

    return (
      <section className="compact-card" aria-label="Action Items and Operations Triage" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="label" style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Needs Attention Today
            </div>
            {hasCritical && (
              <span className="badge badge-danger" style={{ fontSize: 11, padding: "2px 8px" }}>
                Critical Escalation
              </span>
            )}
          </div>
          <Link href="/hq/incidents" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
            Open Incident Desk &rarr;
          </Link>
        </div>

        {/* Critical Incident Emergency Banner (if any exist) */}
        {hasCritical && (
          <div
            style={{
              background: "var(--danger-bg, rgba(239, 68, 68, 0.08))",
              border: "1px solid var(--danger-border, rgba(239, 68, 68, 0.25))",
              borderRadius: "var(--radius-md, 8px)",
              padding: "12px 16px",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            {criticalIncidents.map((incident) => (
              <div
                key={incident.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span className="badge badge-danger" style={{ fontSize: 10 }}>P0 CRITICAL</span>
                    <span style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                      {incident.farm.name}
                    </span>
                    <span className="muted" style={{ fontSize: 13 }}>
                      &middot; {incident.type.replace(/_/g, " ")}
                    </span>
                  </div>
                  <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
                    {incident.description || "No description provided"} &middot; {formatDateTime(incident.createdAt)}
                  </div>
                </div>
                <Link
                  href="/hq/incidents"
                  className="btn btn-sm"
                  style={{
                    background: "var(--danger, #dc2626)",
                    color: "#fff",
                    border: "none",
                    fontWeight: 600,
                  }}
                >
                  Triage Incident &rarr;
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Action Tray Tiles */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12 }}>
          {/* Tile 1: High/Open Incidents */}
          <Link
            href="/hq/incidents"
            className="data-row hover-glow"
            style={{
              textDecoration: "none",
              color: "inherit",
              padding: "12px 14px",
              borderRadius: "var(--radius-md, 8px)",
              border: "1px solid var(--hairline)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                Field Incidents
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {highIncidentsCount > 0 ? `${formatNumber(highIncidentsCount)} high-priority open` : "Standard queue nominal"}
              </div>
            </div>
            <span className="badge badge-amber">{highIncidentsCount > 0 ? highIncidentsCount : "Open"}</span>
          </Link>

          {/* Tile 2: Setup Pipeline */}
          <Link
            href="/hq/onboarding"
            className="data-row hover-glow"
            style={{
              textDecoration: "none",
              color: "inherit",
              padding: "12px 14px",
              borderRadius: "var(--radius-md, 8px)",
              border: "1px solid var(--hairline)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                Estates in Setup Pipeline
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {setupFarmsCount > 0 ? `${formatNumber(setupFarmsCount)} awaiting handover` : "Pipeline clear"}
              </div>
            </div>
            <span className="badge badge-blue">{formatNumber(setupFarmsCount)}</span>
          </Link>

          {/* Tile 3: Agronomist Allocation */}
          <Link
            href="/hq/people"
            className="data-row hover-glow"
            style={{
              textDecoration: "none",
              color: "inherit",
              padding: "12px 14px",
              borderRadius: "var(--radius-md, 8px)",
              border: "1px solid var(--hairline)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                Specialist Allocations
              </div>
              <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                {farmsWithoutAgronomist > 0 ? `${formatNumber(farmsWithoutAgronomist)} estates need specialist` : "Full specialist coverage"}
              </div>
            </div>
            <span className="badge">{farmsWithoutAgronomist > 0 ? "Review" : "Nominal"}</span>
          </Link>
        </div>
      </section>
    );
  } catch (error) {
    return (
      <div className="error-banner" role="alert">
        Triage alerts are temporarily unavailable.
      </div>
    );
  }
}
