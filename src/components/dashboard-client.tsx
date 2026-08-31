"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Icons } from "./icons";
import { EmptyState } from "./ui/empty-state";

type Farm = {
  id: string;
  name: string;
  location: string;
  ownerName: string;
  status: string;
  totalArea: string;
  cultivableArea: string;
  plots: { id: string; name: string; cropCycles: { id: string; cropName: string; status: string }[] }[];
  access: { user: { id: string; name: string; role: string } }[];
};

type MetricData = {
  totalFarms: number;
  activeFarms: number;
  setupFarms: number;
  totalPlots: number;
  totalCrops: number;
  totalTasks: number;
  completedTasks: number;
  delayedAlerts: number;
  pendingIncidents: number;
};

type PoorHealthAlert = {
  id: string;
  cropName: string;
  plotName: string;
  farmName: string;
  farmId: string;
  stage: string;
  impactPercent: string | null;
  remarks: string | null;
  date: string;
};

type ActiveIncident = {
  id: string;
  type: string;
  level: string;
  severity: string;
  description: string;
  impactPercent: string | null;
  farmName: string;
  farmId: string;
  plotName?: string;
  cropName?: string;
  status: string;
  date: string;
};

export function DashboardClient({
  farms,
  metrics,
  poorHealthAlerts = [],
  activeIncidents = [],
  userName = "User",
  role = "SUPER_ADMIN",
}: {
  farms: Farm[];
  metrics: MetricData;
  poorHealthAlerts?: PoorHealthAlert[];
  activeIncidents?: ActiveIncident[];
  userName?: string;
  role?: string;
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredFarms = useMemo(() => {
    return farms.filter((f) => {
      const matchesStatus = statusFilter === "ALL" || f.status === statusFilter;
      const matchesSearch =
        searchQuery === "" ||
        f.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        f.ownerName.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }, [farms, statusFilter, searchQuery]);

  const roleHint =
    role === "SUPER_ADMIN"
      ? "Global multi-estate operations across land plots, agronomists, and field officers."
      : role === "FARM_ADMIN"
      ? "Manage assigned farms — plot layout, crop cycles, team assignments, and approvals."
      : role === "AGRONOMIST"
      ? "Central agronomy intelligence — 7-day planning, crop health monitoring, and prescriptions."
      : "Field execution — live presence clock-in, task dispatch, and real-time incident reports.";

  return (
    <div style={{ display: "grid", gap: 0 }}>
      {/* ── HERO SECTION — Spotify Content-First Dark Canvas ── */}
      <section style={{ padding: "36px 0 28px", borderBottom: "1px solid var(--border-subtle)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 560px", minWidth: 0, maxWidth: 760 }}>
            <div style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <span className="mono-label" style={{
                background: "var(--mid-dark)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-full)",
                padding: "4px 12px", color: "var(--text-base)"
              }}>
                {role.replaceAll("_", " ")} &bull; {userName}
              </span>
              <span className="eyebrow-dot" />
              <span className="mono-label" style={{ color: "var(--text-secondary)" }}>ENTERPRISE PRECISION AGRI OPS</span>
            </div>

            <h1 style={{ margin: "0 0 14px", color: "var(--text-light)" }}>
              Controlled intelligence<br />from soil to harvest<span style={{ color: "var(--spotify-green)" }}>.</span>
            </h1>

            <p style={{ fontSize: 16, lineHeight: 1.5, color: "var(--text-secondary)", maxWidth: 640, margin: "0 0 24px" }}>
              {roleHint} Geofenced presence attendance, 7-day rolling agronomy dispatch, and automated reports on an immersive, content-first canvas.
            </p>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              {["SUPER_ADMIN", "FARM_ADMIN"].includes(role) ? (
                <Link href="/farms/new" className="btn btn-primary">
                  <Icons.Plus size={15} /><span>Create New Farm</span>
                </Link>
              ) : role === "FARM_OFFICER" ? (
                <Link href="/officer/day" className="btn btn-primary">
                  <Icons.Sun size={15} /><span>Open My Day</span>
                </Link>
              ) : (
                <Link href="/tasks/new" className="btn btn-primary">
                  <Icons.Calendar size={15} /><span>Plan 7-Day Activity</span>
                </Link>
              )}
              <Link href="/reports/daily" className="btn btn-ghost">
                View daily report &rarr;
              </Link>
            </div>
          </div>

          {/* Side Telemetry Card (Spotify Audio Device Aesthetic) */}
          <div style={{
            flex: "0 1 380px", minWidth: 280, background: "var(--dark-surface)", border: "1px solid var(--border-card)",
            borderRadius: "var(--radius-sm)", padding: 24, display: "grid", gap: 14, alignContent: "start",
            boxShadow: "var(--shadow-medium)"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 34, height: 34, borderRadius: "var(--radius-circle)", background: "var(--spotify-green)", color: "#000000", display: "grid", placeItems: "center" }}>
                <Icons.Sprout size={16} />
              </div>
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text-base)" }}>Agaate Platform Telemetry</div>
                <div className="mono-label" style={{ fontSize: 11, color: "var(--text-secondary)" }}>PWA &bull; S3 Evidence &bull; Offline Sync</div>
              </div>
            </div>
            <div style={{ height: 1, background: "var(--border-subtle)" }} />
            <div style={{ display: "grid", gap: 10, fontSize: 13, color: "var(--text-base)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>HQ Geofence</span><strong>500 meters</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Weather Telemetry</span><strong style={{ color: "var(--spotify-green)" }}>Open-Meteo Live</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--text-secondary)" }}>Security & Access</span><strong>Session Auth &bull; RBAC</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRUST LOGO STRIP ── */}
      <div className="trust-logo-strip" style={{ borderBottom: "1px solid var(--border-subtle)" }}>
        <span className="mono-label">
          DEPLOYED ACROSS ESTATES &bull; MANDYA &bull; HOSUR &bull; NASHIK &bull; 3 STATES
        </span>
        <div style={{ display: "flex", gap: 24, flexWrap: "wrap", opacity: 0.7, fontSize: 12, fontWeight: 700, letterSpacing: "1.2px", color: "var(--text-secondary)" }}>
          <span>SOMNATH AGRO</span><span>NARAYANA SWAMY</span><span>PRIYANKA VENTURES</span><span>AGAATE PRECISION</span>
        </div>
      </div>

      {/* ── KPI METRIC CARDS ── */}
      <section className="metric-grid" style={{ marginTop: 32 }}>
        <div className="metric-card">
          <span className="metric-label">Managed Estates</span>
          <div className="metric-value">{metrics.totalFarms}</div>
          <div className="metric-sub">{metrics.activeFarms} Active &bull; {metrics.setupFarms} In Setup</div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Plots & Crop Cycles</span>
          <div className="metric-value">{metrics.totalPlots}</div>
          <div className="metric-sub">{metrics.totalCrops} Active Crop Cycles</div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Daily Operations</span>
          <div className="metric-value">{metrics.totalTasks}</div>
          <div className="metric-sub">{metrics.completedTasks} Completed Today</div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Field Signals</span>
          <div className="metric-value" style={{ color: metrics.pendingIncidents > 0 ? "var(--negative-red)" : "inherit" }}>
            {metrics.pendingIncidents}
          </div>
          <div className="metric-sub">{metrics.delayedAlerts} Overdue &bull; {metrics.pendingIncidents} Incidents</div>
        </div>
      </section>

      {/* ── DARK FEATURE BAND: FIELD INTELLIGENCE & HEALTH SIGNALS ── */}
      {(poorHealthAlerts.length > 0 || activeIncidents.length > 0) && (
        <section className="dark-feature-band" style={{ marginBottom: 36 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <div className="mono-label" style={{ color: "var(--text-secondary)", display: "flex", gap: 8, alignItems: "center" }}>
                <span className="eyebrow-dot" />
                <span>ACTIVE FIELD SIGNALS &bull; BRD §19 & §26</span>
              </div>
              <h2 style={{ color: "var(--text-light)", margin: "8px 0 0" }}>
                Estates Requiring Agronomy Action
              </h2>
            </div>

            {["SUPER_ADMIN", "AGRONOMIST"].includes(role) && (
              <Link href="/tasks/new" className="btn btn-secondary">
                <Icons.Calendar size={14} /><span>Prescribe Corrective Task</span>
              </Link>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 16 }}>
            {poorHealthAlerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  background: "var(--dark-surface)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "var(--radius-sm)",
                  padding: 20,
                  display: "grid",
                  gap: 10,
                  boxShadow: "var(--shadow-medium)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="mono-label" style={{ color: "var(--negative-red)", fontWeight: 700 }}>
                    POOR CROP HEALTH
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{alert.date}</span>
                </div>
                <div>
                  <strong style={{ fontSize: 15, color: "var(--text-base)" }}>🌱 {alert.cropName}</strong>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                    {alert.farmName} &bull; Plot {alert.plotName} &bull; Stage: <strong style={{ color: "var(--text-base)" }}>{alert.stage}</strong>
                  </p>
                  {alert.impactPercent && (
                    <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--negative-red)", fontWeight: 700 }}>
                      Estimated Yield Impact: {alert.impactPercent}%
                    </p>
                  )}
                </div>
                {alert.remarks && (
                  <p style={{ margin: 0, fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic", background: "var(--mid-dark)", padding: "8px 12px", borderRadius: "var(--radius-xs)" }}>
                    &ldquo;{alert.remarks}&rdquo;
                  </p>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <Link href={`/farms/${alert.farmId}`} style={{ fontSize: 13, fontWeight: 700, color: "var(--spotify-green)", textDecoration: "none" }}>
                    Inspect Plot Details &rarr;
                  </Link>
                </div>
              </div>
            ))}

            {activeIncidents.map((inc) => (
              <div
                key={inc.id}
                style={{
                  background: "var(--dark-surface)",
                  border: "1px solid var(--border-card)",
                  borderRadius: "var(--radius-sm)",
                  padding: 20,
                  display: "grid",
                  gap: 10,
                  boxShadow: "var(--shadow-medium)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span className="mono-label" style={{ color: "var(--warning-orange)", fontWeight: 700 }}>
                    {inc.level} INCIDENT &bull; {inc.severity}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>{inc.date}</span>
                </div>
                <div>
                  <strong style={{ fontSize: 15, color: "var(--text-base)" }}>{inc.type}</strong>
                  <p style={{ margin: "2px 0 0", fontSize: 13, color: "var(--text-secondary)" }}>
                    {inc.farmName} {inc.plotName ? `&bull; Plot ${inc.plotName}` : ""} {inc.cropName ? `&bull; ${inc.cropName}` : ""}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: "var(--text-secondary)", background: "var(--mid-dark)", padding: "8px 12px", borderRadius: "var(--radius-xs)" }}>
                  {inc.description}
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <Link href={`/farms/${inc.farmId}`} style={{ fontSize: 13, fontWeight: 700, color: "var(--spotify-green)", textDecoration: "none" }}>
                    View Farm Incident &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── ESTATE PORTFOLIO SECTION (Spotify Content List) ── */}
      <section style={{ marginTop: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", paddingBottom: 16, borderBottom: "1px solid var(--border-subtle)", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="mono-label">ESTATE OPERATIONS</div>
            <h2 style={{ margin: "4px 0 0", color: "var(--text-light)" }}>Estate Portfolio</h2>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div style={{ position: "relative", minWidth: 260 }}>
              <input
                type="text"
                placeholder="Search estates, location, owner…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-search"
                style={{ height: 40, fontSize: 13, width: "100%" }}
              />
              <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--text-secondary)", display: "grid", placeItems: "center" }}>
                <Icons.Search size={14} />
              </span>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {["ALL", "ACTIVE", "SETUP", "INACTIVE"].map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`tab-btn ${statusFilter === st ? "active" : ""}`}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dark Surface Estate List Cards */}
        <div style={{ display: "grid", gap: 8, marginTop: 16 }}>
          {filteredFarms.map((farm) => {
            const plotCount = farm.plots?.length ?? 0;
            const officerCount = farm.access?.filter((a) => a.user.role === "FARM_OFFICER").length ?? 0;
            const crops = farm.plots?.flatMap((p) => p.cropCycles.map((c) => c.cropName)) ?? [];

            return (
              <Link
                key={farm.id}
                href={`/farms/${farm.id}`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 1fr 1.5fr 1fr auto",
                  alignItems: "center",
                  gap: 16,
                  padding: "16px 20px",
                  borderRadius: "var(--radius-sm)",
                  background: "var(--dark-surface)",
                  border: "1px solid var(--border-card)",
                  transition: "all var(--transition-fast)",
                }}
                className="card"
              >
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <span className={`status ${farm.status.toLowerCase()}`}>
                      {farm.status}
                    </span>
                    <span className="mono-label" style={{ fontSize: 11 }}>{farm.location}</span>
                  </div>
                  <strong style={{ fontSize: 16, color: "var(--text-light)" }}>{farm.name}</strong>
                  <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 2 }}>{farm.ownerName}</div>
                </div>

                <div>
                  <div className="mono-label">ACREAGE</div>
                  <div style={{ fontSize: 14, color: "var(--text-base)", fontWeight: 600 }}>
                    {farm.totalArea} ac <span style={{ color: "var(--text-secondary)", fontWeight: 400 }}>({farm.cultivableArea} cult)</span>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {crops.length > 0 ? (
                    crops.slice(0, 3).map((c, i) => (
                      <span key={i} className="mono-label" style={{ background: "var(--mid-dark)", padding: "4px 10px", borderRadius: "var(--radius-full)", color: "var(--text-base)", border: "1px solid var(--border-subtle)" }}>
                        🌱 {c}
                      </span>
                    ))
                  ) : (
                    <span style={{ fontSize: 13, color: "var(--text-secondary)", fontStyle: "italic" }}>
                      No active crop cycles
                    </span>
                  )}
                  {crops.length > 3 && (
                    <span className="mono-label" style={{ color: "var(--text-secondary)" }}>
                      +{crops.length - 3}
                    </span>
                  )}
                </div>

                <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                  <span>{plotCount} Plots</span> &bull; <span>{officerCount} Officers</span>
                </div>

                <div>
                  <span style={{ fontSize: 13, fontWeight: 700, color: "var(--spotify-green)", display: "inline-flex", gap: 6, alignItems: "center" }}>
                    <span>Open Hub</span>
                    <Icons.ArrowRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}

          {!filteredFarms.length && (
            <div style={{ padding: "48px 0" }}>
              <EmptyState
                icon={<Icons.Farm size={32} />}
                title="No estates found"
                description="No farms match your search or filter criteria."
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
