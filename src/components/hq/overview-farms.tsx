import Link from "next/link";
import { prisma } from "@/lib/prisma";

function formatNumber(num: number): string {
  return new Intl.NumberFormat("en-IN").format(num);
}

export async function OverviewFarms() {
  try {
    const [totalFarms, recentFarms] = await Promise.all([
      prisma.farm.count(),
      prisma.farm.findMany({
        take: 8,
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          name: true,
          ownerName: true,
          district: true,
          state: true,
          totalArea: true,
          status: true,
          setupStage: true,
          client: {
            select: { id: true, name: true },
          },
          access: {
            where: {
              user: { role: "AGRONOMIST" },
            },
            select: {
              user: { select: { name: true } },
            },
            take: 1,
          },
        },
      }),
    ]);

    return (
      <section className="compact-card" aria-label="Estate Registry Snapshot" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div className="label" style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
              Managed Estates Portfolio
            </div>
            <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
              {formatNumber(totalFarms)} registered properties across active clients.
            </div>
          </div>
          <Link href="/hq/farms" className="btn btn-secondary btn-sm">
            View All Estates ({formatNumber(totalFarms)})
          </Link>
        </div>

        {recentFarms.length === 0 ? (
          <div className="empty-state" style={{ padding: "24px 16px", textAlign: "center" }}>
            <div className="empty-state-title">No estates registered yet</div>
            <div className="empty-state-desc">New farms added to the platform will appear here.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentFarms.map((farm) => {
              const agronomist = farm.access[0]?.user?.name;
              const locationStr = [farm.district, farm.state].filter(Boolean).join(", ");
              const areaStr = farm.totalArea ? `${Number(farm.totalArea).toFixed(1)} ac` : null;

              return (
                <div
                  key={farm.id}
                  className="data-row hover-glow"
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-md, 8px)",
                    border: "1px solid var(--hairline)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    flexWrap: "wrap",
                    gap: 12,
                  }}
                >
                  <div style={{ minWidth: 200, flex: "1 1 200px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <Link
                        href={`/farms/${farm.id}`}
                        style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}
                      >
                        {farm.name}
                      </Link>
                      {areaStr && (
                        <span className="badge" style={{ fontSize: 11 }}>
                          {areaStr}
                        </span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 13, marginTop: 3 }}>
                      Client: {farm.client?.name || farm.ownerName || "Unassigned"}
                      {locationStr ? ` &middot; ${locationStr}` : ""}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>Agronomist</div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: agronomist ? "var(--ink)" : "var(--muted)" }}>
                        {agronomist || "Unassigned"}
                      </div>
                    </div>

                    <div>
                      {farm.status === "ACTIVE" ? (
                        <span className="badge badge-green" style={{ fontSize: 11 }}>
                          Active
                        </span>
                      ) : (
                        <span className="badge badge-amber" style={{ fontSize: 11 }}>
                          In Setup
                        </span>
                      )}
                    </div>

                    <Link
                      href={`/farms/${farm.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 12 }}
                    >
                      Open &rarr;
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span className="muted" style={{ fontSize: 12 }}>
            Showing 8 most recently updated estates
          </span>
          <Link href="/hq/farms" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
            Search Full Estate Registry &rarr;
          </Link>
        </div>
      </section>
    );
  } catch (error) {
    return (
      <div className="error-banner" role="alert">
        Estate portfolio snapshot is temporarily unavailable.
      </div>
    );
  }
}
