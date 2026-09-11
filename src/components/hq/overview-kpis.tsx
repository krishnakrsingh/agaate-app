import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

export async function OverviewKpis() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    const [
      totalClients,
      newClientsPastMonth,
      activeFarms,
      setupFarms,
      activeCycles,
      officersCount,
      agronomistsCount,
      incidentsOpen,
      criticalIncidents,
    ] = await Promise.all([
      prisma.client.count(),
      prisma.client.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
      prisma.farm.count({ where: { status: "ACTIVE" } }),
      prisma.farm.count({ where: { status: "SETUP" } }),
      prisma.cropCycle.count({ where: { status: "ACTIVE" } }),
      prisma.user.count({ where: { role: "FARM_OFFICER", active: true } }),
      prisma.user.count({ where: { role: "AGRONOMIST", active: true } }),
      prisma.incident.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
      prisma.incident.count({ where: { status: { in: ["OPEN", "ACKNOWLEDGED"] }, severity: "CRITICAL" } }),
    ]);

    return (
      <div
        style={{
          borderTop: "1px solid var(--hairline, #e4dfd7)",
          borderBottom: "1px solid var(--hairline, #e4dfd7)",
          padding: "12px 0",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexWrap: "wrap",
          background: "transparent",
        }}
        aria-label="Platform Vitals Strip"
      >
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--muted, #756f68)", marginRight: 4 }}>
          Platform Vitals
        </div>

        {/* Pill 1: Clients */}
        <Link
          href="/hq/clients"
          style={{
            textDecoration: "none",
            color: "var(--ink, #0e0d0c)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--surface-strong, #f2efe9)",
            border: "1px solid var(--hairline, #dfd9cf)",
            borderRadius: 9999,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink, #0e0d0c)" }} />
          <strong>{formatNumber(totalClients)}</strong> Clients
          {newClientsPastMonth > 0 && (
            <span style={{ color: "var(--muted, #756f68)", fontSize: 11 }}>
              (+{newClientsPastMonth}/mo)
            </span>
          )}
        </Link>

        {/* Pill 2: Managed Estates */}
        <Link
          href="/hq/farms"
          style={{
            textDecoration: "none",
            color: "var(--ink, #0e0d0c)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--surface-strong, #f2efe9)",
            border: "1px solid var(--hairline, #dfd9cf)",
            borderRadius: 9999,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink, #0e0d0c)" }} />
          <strong>{formatNumber(activeFarms)}</strong> Active Estates
        </Link>

        {/* Pill 3: Setup Pipeline */}
        <Link
          href="/hq/onboarding"
          style={{
            textDecoration: "none",
            color: "var(--ink, #0e0d0c)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--surface-strong, #f2efe9)",
            border: "1px solid var(--hairline, #dfd9cf)",
            borderRadius: 9999,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--muted, #756f68)" }} />
          <strong>{formatNumber(setupFarms)}</strong> In Setup Pipeline
        </Link>

        {/* Pill 4: Cultivation */}
        <Link
          href="/farms"
          style={{
            textDecoration: "none",
            color: "var(--ink, #0e0d0c)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--surface-strong, #f2efe9)",
            border: "1px solid var(--hairline, #dfd9cf)",
            borderRadius: 9999,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink, #0e0d0c)" }} />
          <strong>{formatNumber(activeCycles)}</strong> Active Crop Cycles
        </Link>

        {/* Pill 5: Staffing */}
        <Link
          href="/hq/people"
          style={{
            textDecoration: "none",
            color: "var(--ink, #0e0d0c)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: "var(--surface-strong, #f2efe9)",
            border: "1px solid var(--hairline, #dfd9cf)",
            borderRadius: 9999,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 500,
            transition: "all 0.15s ease",
          }}
        >
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink, #0e0d0c)" }} />
          <strong>{officersCount}</strong> Officers &middot; <strong>{agronomistsCount}</strong> Agronomists
        </Link>

        {/* Pill 6: Incidents Alert */}
        <Link
          href="/hq/incidents"
          style={{
            textDecoration: "none",
            color: criticalIncidents > 0 ? "#ffffff" : "var(--ink, #0e0d0c)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            background: criticalIncidents > 0 ? "var(--ink, #0e0d0c)" : "var(--surface-strong, #f2efe9)",
            border: "1px solid var(--ink, #0e0d0c)",
            borderRadius: 9999,
            padding: "5px 12px",
            fontSize: 12,
            fontWeight: 600,
            marginLeft: "auto",
            transition: "all 0.15s ease",
          }}
        >
          {criticalIncidents > 0 ? (
            <>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#ffffff" }} />
              {criticalIncidents} Critical Alert &middot; {incidentsOpen} Open
            </>
          ) : (
            <>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--ink, #0e0d0c)" }} />
              {incidentsOpen} Alerts &middot; Nominal
            </>
          )}
        </Link>
      </div>
    );
  } catch (error) {
    return (
      <div style={{ padding: "8px 0", fontSize: 12, color: "var(--muted, #756f68)" }}>
        Platform vitals unavailable.
      </div>
    );
  }
}
