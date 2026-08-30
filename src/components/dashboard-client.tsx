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
      ? "Global command across every estate, people, and agronomy decision."
      : role === "FARM_ADMIN"
        ? "Own your assigned farms — plots, crops, people, and daily execution."
        : role === "AGRONOMIST"
          ? "Central intelligence — plan, monitor, and prescribe across all farms."
          : "Field execution — clock in, execute, and capture with precision.";

  return (
    <div style={{ display: "grid", gap: 0 }}>
      {/* HERO — Cohere white canvas, tight display */}
      <section style={{ padding: "56px 0 32px", borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 32, flexWrap: "wrap", alignItems: "flex-start" }}>
          <div style={{ flex: "1 1 560px", minWidth: 0, maxWidth: 760 }}>
            <div style={{ display: "inline-flex", gap: 8, alignItems: "center", marginBottom: 16 }}>
              <span style={{
                fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.28, textTransform: "uppercase",
                background: "var(--soft-stone)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-pill)",
                padding: "4px 10px", color: "var(--ink)"
              }}>
                {role.replaceAll("_", " ")} • {userName}
              </span>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: "var(--coral)" }} />
              <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--slate-cohere)" }}>ENTERPRISE FARM OPERATIONS</span>
            </div>
            <h1 style={{
              fontFamily: "var(--font-display)", fontSize: "clamp(36px, 5vw, 60px)",
              lineHeight: 1, letterSpacing: "-1.2px", fontWeight: 400, color: "var(--ink)", margin: "0 0 16px"
            }}>
              Controlled intelligence<br />from soil to harvest<span style={{ color: "var(--slate-cohere)" }}>.</span>
            </h1>
            <p style={{ fontSize: 18, lineHeight: 1.4, color: "var(--body-muted)", maxWidth: 680, margin: "0 0 24px" }}>
              {roleHint} Manage geofenced attendance, 7-day agronomy, and automated reporting on a single flat, bordered canvas — no shadows, no clutter.
            </p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
              {["SUPER_ADMIN", "FARM_ADMIN"].includes(role) ? (
                <Link href="/farms/new" style={{
                  background: "var(--cohere-primary)", color: "white", borderRadius: "var(--radius-pill)",
                  padding: "12px 24px", fontSize: 14, fontWeight: 500, display: "inline-flex", gap: 8, alignItems: "center"
                }}>
                  <Icons.Plus size={14} /><span>New farm</span>
                </Link>
              ) : role === "FARM_OFFICER" ? (
                <Link href="/officer/day" style={{
                  background: "var(--cohere-primary)", color: "white", borderRadius: "var(--radius-pill)",
                  padding: "12px 24px", fontSize: 14, fontWeight: 500, display: "inline-flex", gap: 8, alignItems: "center"
                }}>
                  <Icons.Sun size={14} /><span>Open My Day</span>
                </Link>
              ) : (
                <Link href="/tasks/new" style={{
                  background: "var(--cohere-primary)", color: "white", borderRadius: "var(--radius-pill)",
                  padding: "12px 24px", fontSize: 14, fontWeight: 500, display: "inline-flex", gap: 8, alignItems: "center"
                }}>
                  <Icons.Calendar size={14} /><span>Plan activity</span>
                </Link>
              )}
              <Link href="/reports/daily" style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                View daily report →
              </Link>
            </div>
          </div>

          <div style={{
            flex: "0 1 380px", minWidth: 280, background: "var(--soft-stone)", border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg)", padding: 24, display: "grid", gap: 14, alignContent: "start"
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "var(--radius-sm)", background: "var(--cohere-primary)", color: "white", display: "grid", placeItems: "center" }}>
                <Icons.Sprout size={18} />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Agaate Intelligence</div>
                <div style={{ fontSize: 12, color: "var(--slate-cohere)" }}>PWA • Offline tolerant • S3 verified</div>
              </div>
            </div>
            <div style={{ height: 1, background: "var(--hairline)" }} />
            <div style={{ display: "grid", gap: 10, fontSize: 14, color: "var(--ink)" }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--slate-cohere)" }}>Hq geofence</span><strong>500 m</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--slate-cohere)" }}>Weather</span><strong>Open-Meteo live</strong></div>
              <div style={{ display: "flex", justifyContent: "space-between" }}><span style={{ color: "var(--slate-cohere)" }}>Auth</span><strong>JWT 8h • bcrypt</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* TRUST STRIP — Cohere wide spacing, monochrome */}
      <div style={{ padding: "28px 0", borderBottom: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.28, color: "var(--slate-cohere)", textTransform: "uppercase" }}>
          Trusted across estates • mandya • hosur • nashik • 3 states
        </span>
        <div style={{ display: "flex", gap: 28, flexWrap: "wrap", opacity: 0.6, fontSize: 13, fontWeight: 600, letterSpacing: "-0.01em", color: "var(--ink)" }}>
          <span>SOMNATH AGRO</span><span>NARAYANA SWAMY</span><span>PRIYANKA VENTURES</span><span>AGAATE</span>
        </div>
      </div>

      {/* DARK FEATURE BAND — Cohere deep-green, 80px padding */}
      <section style={{
        margin: "32px 0 0", background: "var(--deep-green)", color: "white",
        borderRadius: "var(--radius-lg)", padding: 32, display: "grid", gap: 24
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 24, flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.28, textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>Live telemetry • API verified</div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: 32, lineHeight: 1.2, letterSpacing: "-0.32px", fontWeight: 400, color: "white", margin: "6px 0 0" }}>
              Operations at a glance
            </h2>
          </div>
          <div style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", maxWidth: 420 }}>
            Four flat capability cards — no shadows, just hairline rules and mineral type. 3-col desktop, 2 tablet, 1 mobile.
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
          {[
            { label: "Managed farms", value: metrics.totalFarms, sub: `${metrics.activeFarms} active • ${metrics.setupFarms} setup`, icon: Icons.Farm },
            { label: "Plots & crops", value: metrics.totalPlots, sub: `${metrics.totalCrops} active crop cycles`, icon: Icons.Layers },
            { label: "Dispatch", value: metrics.totalTasks, sub: `${metrics.completedTasks} completed`, icon: Icons.ClipboardList },
            { label: "Field signals", value: metrics.pendingIncidents, sub: metrics.pendingIncidents ? `${metrics.pendingIncidents} active incidents` : "All clear", icon: Icons.Activity },
          ].slice(0, 4).map((m, i) => (
            <div key={i} style={{
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "var(--radius-sm)", padding: 20, display: "grid", gap: 8
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.22, textTransform: "uppercase", color: "rgba(255,255,255,0.7)" }}>{m.label}</span>
                <span style={{ width: 28, height: 28, borderRadius: 6, background: "rgba(255,255,255,0.10)", display: "grid", placeItems: "center", color: "white" }}><m.icon size={14} /></span>
              </div>
              <div style={{ fontFamily: "var(--font-display)", fontSize: 32, lineHeight: 1, fontWeight: 400, color: "white" }}>{m.value}</div>
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>{m.sub}</div>
            </div>
          ))}
        </div>
        <style>{`@media(max-width:1024px){ section[style*="gridTemplateColumns: repeat(3"]{ grid-template-columns: repeat(2,1fr) !important; } } @media(max-width:640px){ section[style*="gridTemplateColumns: repeat(3"]{ grid-template-columns: 1fr !important; } }`}</style>
      </section>

      {/* FIELD INTELLIGENCE & HEALTH ALERTS (BRD §19 & §26) */}
      {(poorHealthAlerts.length > 0 || activeIncidents.length > 0) && (
        <section style={{ padding: "36px 0 0" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--danger-red)" }}>
                <Icons.AlertTriangle size={16} />
                <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, letterSpacing: 0.28, textTransform: "uppercase" }}>
                  Active Field Signals & Crop Health Alerts (BRD §19)
                </span>
              </div>
              <h2 style={{ fontFamily: "var(--font-body)", fontSize: 22, fontWeight: 500, margin: "4px 0 0", color: "var(--ink)" }}>
                Attention Required Across Estates
              </h2>
            </div>
            {["SUPER_ADMIN", "AGRONOMIST"].includes(role) && (
              <Link href="/tasks/new" className="btn btn-sm btn-primary" style={{ minHeight: 36 }}>
                <Icons.Calendar size={14} />
                <span>Prescribe Corrective Activity</span>
              </Link>
            )}
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
            {poorHealthAlerts.map((alert) => (
              <div
                key={alert.id}
                style={{
                  background: "#fff5f5",
                  border: "1px solid #fed7d7",
                  borderRadius: "var(--radius-sm)",
                  padding: 16,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "var(--radius-pill)",
                      background: "var(--danger-red)",
                      color: "white",
                      textTransform: "uppercase",
                    }}
                  >
                    POOR CROP HEALTH
                  </span>
                  <span style={{ fontSize: 12, color: "var(--slate-cohere)" }}>{alert.date}</span>
                </div>
                <div>
                  <strong style={{ fontSize: "1.05rem", color: "var(--slate-900)" }}>🌱 {alert.cropName}</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--slate-700)" }}>
                    {alert.farmName} &bull; Plot {alert.plotName} &bull; Stage: <strong>{alert.stage}</strong>
                  </p>
                  {alert.impactPercent && (
                    <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "var(--danger-red)", fontWeight: 600 }}>
                      Estimated Impact: {alert.impactPercent}%
                    </p>
                  )}
                </div>
                {alert.remarks && (
                  <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-muted)", fontStyle: "italic", background: "white", padding: "6px 10px", borderRadius: "var(--radius-xs)", border: "1px solid #fee2e2" }}>
                    &ldquo;{alert.remarks}&rdquo;
                  </p>
                )}
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <Link href={`/farms/${alert.farmId}`} style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--primary-700)", textDecoration: "underline" }}>
                    Inspect Plot Details →
                  </Link>
                </div>
              </div>
            ))}

            {activeIncidents.map((inc) => (
              <div
                key={inc.id}
                style={{
                  background: "#fffaf0",
                  border: "1px solid #feebc8",
                  borderRadius: "var(--radius-sm)",
                  padding: 16,
                  display: "grid",
                  gap: 8,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <span
                    style={{
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      padding: "2px 7px",
                      borderRadius: "var(--radius-pill)",
                      background: inc.severity === "CRITICAL" || inc.severity === "HIGH" ? "var(--danger-red)" : "#dd6b20",
                      color: "white",
                      textTransform: "uppercase",
                    }}
                  >
                    {inc.level} INCIDENT &bull; {inc.severity}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--slate-cohere)" }}>{inc.date}</span>
                </div>
                <div>
                  <strong style={{ fontSize: "1.05rem", color: "var(--slate-900)" }}>{inc.type}</strong>
                  <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "var(--slate-700)" }}>
                    {inc.farmName} {inc.plotName ? `&bull; Plot ${inc.plotName}` : ""} {inc.cropName ? `&bull; ${inc.cropName}` : ""}
                  </p>
                </div>
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--text-main)", background: "white", padding: "6px 10px", borderRadius: "var(--radius-xs)", border: "1px solid #fef3c7" }}>
                  {inc.description}
                </p>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
                  <Link href={`/farms/${inc.farmId}`} style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--primary-700)", textDecoration: "underline" }}>
                    View Farm →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FARMS — Cohere product cards: soft-stone, 8px, 32px padding, 3-col */}
      <section style={{ padding: "48px 0 0" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", alignItems: "flex-end", marginBottom: 20, borderBottom: "1px solid var(--hairline)", paddingBottom: 16 }}>
          <div style={{ minWidth: 0 }}>
            <h2 style={{ fontFamily: "var(--font-body)", fontSize: 24, fontWeight: 400, lineHeight: 1.3, color: "var(--ink)", margin: 0 }}>Estate portfolio</h2>
            <p style={{ fontSize: 14, color: "var(--slate-cohere)", margin: "4px 0 0" }}>Warm stone product cards — checkmarks, divider, pill CTA. 3-col desktop.</p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flex: "1 1 320px", justifyContent: "flex-end", minWidth: 0 }}>
            <div style={{ position: "relative", flex: "1 1 200px", maxWidth: 320, minWidth: 0 }}>
              <input
                type="text"
                placeholder="Search farms…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: "100%", padding: "10px 12px 10px 32px", borderRadius: "var(--radius-xs)",
                  border: "1px solid var(--hairline)", fontSize: 14, background: "white"
                }}
              />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}><Icons.Search size={14} /></span>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["ALL", "ACTIVE", "SETUP", "INACTIVE"].map((st) => (
                <button key={st} type="button" onClick={() => setStatusFilter(st)}
                  style={{
                    padding: "6px 12px", borderRadius: "var(--radius-xl)", fontSize: 13, fontWeight: 500,
                    border: "1px solid", borderColor: statusFilter === st ? "var(--cohere-primary)" : "var(--hairline)",
                    background: statusFilter === st ? "var(--cohere-primary)" : "transparent",
                    color: statusFilter === st ? "white" : "var(--ink)"
                  }}>
                  {st === "ALL" ? "All" : st}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 16 }}>
          {filteredFarms.map((farm) => {
            const plotCount = farm.plots?.length ?? 0;
            const officerCount = farm.access?.filter((a) => a.user.role === "FARM_OFFICER").length ?? 0;
            const crops = farm.plots?.flatMap((p) => p.cropCycles.map((c) => c.cropName)) ?? [];
            return (
              <Link key={farm.id} href={`/farms/${farm.id}`} style={{
                background: "var(--soft-stone)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)",
                padding: 24, display: "flex", flexDirection: "column", gap: 16, textDecoration: "none", minWidth: 0
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "flex-start" }}>
                  <span style={{
                    fontFamily: "var(--font-mono)", fontSize: 11, letterSpacing: 0.22, textTransform: "uppercase",
                    background: "white", border: "1px solid var(--hairline)", borderRadius: "var(--radius-pill)", padding: "3px 8px", color: "var(--ink)"
                  }}>
                    {farm.status}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--slate-cohere)", display: "inline-flex", gap: 4, alignItems: "center" }}>
                    <Icons.MapPin size={12} />{farm.location}
                  </span>
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontFamily: "var(--font-body)", fontSize: 20, fontWeight: 500, lineHeight: 1.2, color: "var(--ink)", overflowWrap: "break-word" }}>{farm.name}</div>
                  <div style={{ fontSize: 13, color: "var(--slate-cohere)", marginTop: 4 }}>{farm.ownerName} • {farm.totalArea} acres</div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", minHeight: 22 }}>
                  {crops.length ? crops.slice(0, 3).map((c, i) => (
                    <span key={i} style={{ fontSize: 12, fontWeight: 500, background: "white", border: "1px solid var(--hairline)", borderRadius: "var(--radius-xs)", padding: "2px 8px", color: "var(--ink)" }}>🌱 {c}</span>
                  )) : <span style={{ fontSize: 12, color: "var(--slate-cohere)", fontStyle: "italic" }}>No active crop</span>}
                  {crops.length > 3 && <span style={{ fontSize: 12, color: "var(--slate-cohere)" }}>+{crops.length - 3}</span>}
                </div>
                <div style={{ height: 1, background: "var(--hairline)", margin: "4px 0" }} />
                <div style={{ display: "flex", gap: 8, fontSize: 12, color: "var(--slate-cohere)", flexWrap: "wrap" }}>
                  <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}><Icons.Layers size={12} />{plotCount} plots</span>
                  <span>•</span><span>{officerCount} officers</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 4 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink)", display: "inline-flex", gap: 6, alignItems: "center" }}>
                    Open hub <Icons.ArrowRight size={12} />
                  </span>
                  <span style={{
                    fontSize: 12, fontWeight: 500, background: "var(--cohere-primary)", color: "white",
                    borderRadius: "var(--radius-pill)", padding: "6px 12px"
                  }}>
                    View
                  </span>
                </div>
              </Link>
            );
          })}
          {!filteredFarms.length && (
            <div style={{ gridColumn: "1/-1" }}>
              <EmptyState icon={<Icons.Farm size={28} />} title="No farms found" description="No estates match your search." />
            </div>
          )}
        </div>
        <style>{`@media(max-width:1024px){ div[style*="repeat(3, minmax(0,1fr)"]{ grid-template-columns: repeat(2, minmax(0,1fr)) !important; } } @media(max-width:640px){ div[style*="repeat(3, minmax(0,1fr)"]{ grid-template-columns: 1fr !important; } }`}</style>
      </section>
    </div>
  );
}
