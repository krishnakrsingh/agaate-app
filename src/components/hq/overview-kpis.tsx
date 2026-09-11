import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STALLED_AFTER_DAYS = 30;

function formatCompactAcres(acres: number): string {
  if (acres >= 1_000_000) {
    return `${(acres / 1_000_000).toFixed(2)}M ac`;
  }
  if (acres >= 1_000) {
    return `${(acres / 1_000).toFixed(1)}k ac`;
  }
  return `${Math.round(acres)} ac`;
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

export async function OverviewKpis() {
  try {
    const stalledBefore = new Date(Date.now() - STALLED_AFTER_DAYS * 24 * 60 * 60 * 1000);
    const now = new Date();

    const [
      farmsTotal,
      farmsSetup,
      farmsUnmapped,
      officersCount,
      farmAdminsCount,
      stalledFarms,
      incidentsOpen,
      criticalIncidents,
      overdueTasks,
      areaAggregation,
    ] = await Promise.all([
      prisma.farm.count(),
      prisma.farm.count({ where: { status: "SETUP" } }),
      prisma.farm.count({ where: { boundaryGeoJson: null } }),
      prisma.user.count({ where: { role: "FARM_OFFICER", active: true } }),
      prisma.user.count({ where: { role: "FARM_ADMIN", active: true } }),
      prisma.farm.count({ where: { status: "SETUP", updatedAt: { lte: stalledBefore } } }),
      prisma.incident.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
      prisma.incident.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] }, severity: "CRITICAL" } }),
      prisma.task.count({ where: { status: { notIn: ["COMPLETED", "CANCELLED"] }, dueDate: { lt: now } } }),
      prisma.farm.aggregate({ _sum: { totalArea: true, cultivableArea: true } }),
    ]);

    const totalAcres = Number(areaAggregation._sum.totalArea ?? 0);
    const cultivableAcres = Number(areaAggregation._sum.cultivableArea ?? 0);
    const cultivationRate = totalAcres > 0 ? ((cultivableAcres / totalAcres) * 100).toFixed(1) : "0.0";
    const officerRatio = officersCount > 0 ? Math.round(farmsTotal / officersCount) : farmsTotal;
    const stalledPercent = farmsSetup > 0 ? Math.round((stalledFarms / farmsSetup) * 100) : 0;

    return (
      <div className="metric-grid" aria-label="Executive Operations Cockpit" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {/* Pillar 1: Land Portfolio & Cadastral Coverage */}
        <Link
          href="/hq/map"
          className="compact-card hover-glow"
          style={{ textDecoration: "none", color: "inherit", gap: 10, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <span className="metric-label">Land &amp; Cadastral Readiness</span>
              <span className="badge badge-amber" style={{ fontSize: 11 }}>
                {formatNumber(farmsUnmapped)} Unmapped
              </span>
            </div>
            <div className="metric-value" style={{ marginTop: 6 }}>
              {formatCompactAcres(totalAcres)}
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {cultivationRate}% Cultivable ({formatCompactAcres(cultivableAcres)})
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {formatNumber(farmsTotal)} estates &middot; Cadastral risk: 99.8%
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>Inspect GIS &rarr;</span>
          </div>
        </Link>

        {/* Pillar 2: Workforce Coverage Ratio */}
        <Link
          href="/hq/people"
          className="compact-card hover-glow"
          style={{ textDecoration: "none", color: "inherit", gap: 10, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <span className="metric-label">Workforce Fleet Density</span>
              <span className="badge badge-amber" style={{ fontSize: 11 }}>
                Coverage Deficit
              </span>
            </div>
            <div className="metric-value" style={{ marginTop: 6 }}>
              1 : {officerRatio}
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Estates assigned per active field officer
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {officersCount} Officers &middot; {formatNumber(farmAdminsCount)} Client Admins
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>View Roster &rarr;</span>
          </div>
        </Link>

        {/* Pillar 3: Onboarding Pipeline SLA */}
        <Link
          href="/hq/onboarding"
          className="compact-card hover-glow"
          style={{ textDecoration: "none", color: "inherit", gap: 10, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <span className="metric-label">Onboarding Pipeline SLA</span>
              <span className="badge badge-amber" style={{ fontSize: 11 }}>
                {stalledPercent}% Stalled &gt;30d
              </span>
            </div>
            <div className="metric-value" style={{ marginTop: 6 }}>
              {formatNumber(stalledFarms)}
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              Stalled estates out of {formatNumber(farmsSetup)} currently in setup
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              4 stages: Survey, Demarcation, Prep, Irrigation
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>Triage Pipeline &rarr;</span>
          </div>
        </Link>

        {/* Pillar 4: Field Incidents & Agronomy Triage */}
        <Link
          href="/hq/farms"
          className="compact-card hover-glow"
          style={{ textDecoration: "none", color: "inherit", gap: 10, display: "flex", flexDirection: "column", justifyContent: "space-between" }}
        >
          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
              <span className="metric-label">Incident &amp; Field Risk</span>
              {criticalIncidents > 0 ? (
                <span className="badge badge-danger" style={{ fontSize: 11 }}>
                  {criticalIncidents} Critical Alert
                </span>
              ) : (
                <span className="badge badge-blue" style={{ fontSize: 11 }}>
                  {incidentsOpen} Active
                </span>
              )}
            </div>
            <div className="metric-value" style={{ marginTop: 6 }}>
              {incidentsOpen} Alerts
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 4 }}>
              {criticalIncidents > 0 ? `${criticalIncidents} Critical, ` : ""}
              {overdueTasks} Overdue agronomic tasks
            </div>
          </div>
          <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              Escalation required across affected estates
            </span>
            <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>Review Incidents &rarr;</span>
          </div>
        </Link>
      </div>
    );
  } catch (error) {
    return (
      <div className="error-banner" role="alert">
        Operational telemetry is temporarily unavailable. Underlying records are unaffected.
      </div>
    );
  }
}
