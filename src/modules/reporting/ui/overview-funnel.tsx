import Link from "next/link";
import { prisma } from "@/lib/prisma";

const STAGE_ORDER = [
  "SURVEY_SOIL_TEST",
  "PLOT_DEMARCATION",
  "BED_SOIL_PREP",
  "IRRIGATION_LAYOUT",
  "HANDED_OVER",
] as const;

const STAGE_LABELS: Record<string, string> = {
  SURVEY_SOIL_TEST: "Survey and soil test",
  PLOT_DEMARCATION: "Plot demarcation",
  BED_SOIL_PREP: "Bed and soil prep",
  IRRIGATION_LAYOUT: "Irrigation layout",
  HANDED_OVER: "Handed over",
};

const STALLED_AFTER_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

export async function OverviewFunnel() {
  try {
    const stalledBefore = new Date(Date.now() - STALLED_AFTER_DAYS * DAY_MS);
    const [groups, stalled] = await Promise.all([
      prisma.farm.groupBy({ by: ["setupStage"], where: { status: "SETUP" }, _count: { setupStage: true } }),
      prisma.farm.findMany({
        where: { status: "SETUP", updatedAt: { lte: stalledBefore } },
        select: { id: true, name: true, setupStage: true, updatedAt: true, ownerName: true, client: { select: { name: true } } },
        orderBy: { updatedAt: "asc" },
        take: 10,
      }),
    ]);

    const byStage = new Map(groups.map((g) => [g.setupStage, g._count.setupStage]));
    const total = STAGE_ORDER.reduce((sum, stage) => sum + (byStage.get(stage) ?? 0), 0);

    return (
      <section className="compact-card" aria-label="Onboarding funnel">
        <div className="card-header">
          <div>
            <div className="label">Onboarding funnel</div>
            <div className="muted" style={{ marginTop: 4 }}>
              {total === 0 ? "No estates in setup right now." : `${total} estate${total === 1 ? "" : "s"} in setup across 5 stages.`}
            </div>
          </div>
          <Link href="/hq/onboarding" className="btn btn-secondary btn-sm">
            Open onboarding
          </Link>
        </div>
        {total === 0 ? (
          <div className="empty-state">
            <div className="empty-state-title">Pipeline is clear</div>
            <div className="empty-state-desc">New estates will appear here as they enter setup.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {STAGE_ORDER.map((stage) => {
              const count = byStage.get(stage) ?? 0;
              const width = total > 0 ? Math.max(count > 0 ? 4 : 0, Math.round((count / total) * 100)) : 0;
              return (
                <div key={stage}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                    <span style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)" }}>{STAGE_LABELS[stage]}</span>
                    <span className="badge">{count}</span>
                  </div>
                  <div
                    aria-hidden
                    style={{ height: 6, borderRadius: 9999, background: "var(--surface-strong)", marginTop: 6, overflow: "hidden" }}
                  >
                    <div style={{ width: `${width}%`, height: "100%", background: "var(--primary)" }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
        {stalled.length > 0 && (
          <div style={{ marginTop: 20, borderTop: "1px solid var(--hairline)", paddingTop: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div className="label">
                Critical SLA Breaches &middot; Stalled &gt;30 Days ({stalled.length} shown)
              </div>
              <Link href="/hq/onboarding" style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                View All Stalled Pipeline &rarr;
              </Link>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {stalled.map((farm) => {
                const days = Math.floor((Date.now() - new Date(farm.updatedAt).getTime()) / DAY_MS);
                return (
                  <div
                    key={farm.id}
                    className="data-row"
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--hairline)",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ flex: 1, minWidth: 0, paddingRight: 12 }}>
                      <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>
                        <Link href={`/hq/farms/${farm.id}`} style={{ textDecoration: "none", color: "inherit" }} className="hover-underline">
                          {farm.name}
                        </Link>
                      </div>
                      <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                        {farm.client?.name || farm.ownerName} &middot;{" "}
                        <span style={{ color: "var(--amber)", fontWeight: 500 }}>{days} days stalled</span> in{" "}
                        {STAGE_LABELS[farm.setupStage] ?? farm.setupStage}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                      <span className="badge badge-amber">{days}d Stalled</span>
                      <Link
                        href={`/hq/farms/${farm.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ fontSize: 12, padding: "5px 12px" }}
                      >
                        Inspect Farm &rarr;
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </section>
    );
  } catch {
    return (
      <div className="error-banner" role="alert">
        The onboarding funnel is temporarily unavailable. Estate setup data is unchanged.
      </div>
    );
  }
}
