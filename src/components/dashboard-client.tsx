"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Icons } from "./icons";
import { EmptyState } from "./ui/empty-state";
import { StatusBadge } from "./ui/badge";

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

  const totalAcreage = farms
    .reduce((acc, f) => acc + Number(f.totalArea || 0), 0)
    .toFixed(1);

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* ── PAGE HEADER & OPERATIONS SUMMARY ── */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            PORTFOLIO OVERVIEW &bull; {role.replaceAll("_", " ")}
          </div>
          <h1>Farm Operations Portfolio</h1>
          <p className="muted">
            Global monitoring of managed land estates, active crop cycles, and daily field execution telemetry.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {["SUPER_ADMIN", "FARM_ADMIN"].includes(role) && (
            <Link href="/farms/new" className="btn btn-primary">
              <Icons.Plus size={16} />
              <span>Create New Farm</span>
            </Link>
          )}

          {role === "FARM_OFFICER" && (
            <Link href="/officer/day" className="btn btn-primary">
              <Icons.Sun size={16} />
              <span>Open My Day</span>
            </Link>
          )}

          {role === "AGRONOMIST" && (
            <Link href="/tasks/new" className="btn btn-primary">
              <Icons.Calendar size={16} />
              <span>Plan Agronomy Activity</span>
            </Link>
          )}

          <Link href="/reports/daily" className="btn btn-secondary">
            <Icons.FileText size={15} />
            <span>Daily Report</span>
          </Link>
        </div>
      </div>

      {/* ── KPI METRIC CARDS ── */}
      <section className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">Managed Estates</span>
          <div className="metric-value">{metrics.totalFarms}</div>
          <div className="metric-sub">{metrics.activeFarms} Active &bull; {metrics.setupFarms} In Setup</div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Total Acreage</span>
          <div className="metric-value">{totalAcreage} <span style={{ fontSize: "1.1rem", fontWeight: 500 }}>Acres</span></div>
          <div className="metric-sub">{metrics.totalPlots} Land Plots Defined</div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Active Crop Cycles</span>
          <div className="metric-value">{metrics.totalCrops}</div>
          <div className="metric-sub">Controlled Varieties & Milestones</div>
        </div>

        <div className="metric-card">
          <span className="metric-label">Daily Operations</span>
          <div className="metric-value">{metrics.totalTasks}</div>
          <div className="metric-sub">{metrics.completedTasks} Finished Today</div>
        </div>
      </section>

      {/* ── ATTENTION SIGNALS (POOR HEALTH / INCIDENTS) ── */}
      {(poorHealthAlerts.length > 0 || activeIncidents.length > 0) && (
        <section
          style={{
            background: "var(--danger-light)",
            border: "1px solid var(--danger-border)",
            borderRadius: "var(--radius-md)",
            padding: 18,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.AlertTriangle size={18} style={{ color: "var(--danger)" }} />
              <strong style={{ color: "var(--danger-text)", fontSize: "0.95rem" }}>
                Field Action Required &bull; {poorHealthAlerts.length + activeIncidents.length} Active Operational Signals
              </strong>
            </div>
            <Link href="/tasks" className="btn btn-sm btn-outline" style={{ borderColor: "var(--danger)", color: "var(--danger-text)" }}>
              <span>Prescribe Corrective Task</span>
              <Icons.ArrowRight size={13} />
            </Link>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {poorHealthAlerts.map((a) => (
              <div
                key={a.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--danger-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "0.9rem", color: "var(--danger-text)" }}>🔴 {a.cropName} &bull; {a.plotName}</strong>
                  <span className="priority-tag high">{a.impactPercent ? `${a.impactPercent}% Impact` : "Poor Health"}</span>
                </div>
                <p style={{ margin: "4px 0", fontSize: "0.82rem", color: "var(--text-main)" }}>
                  {a.farmName} &bull; Stage: {a.stage} {a.remarks ? `&bull; "${a.remarks}"` : ""}
                </p>
                <Link href={`/farms/${a.farmId}`} style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>
                  View Farm Hub &rarr;
                </Link>
              </div>
            ))}

            {activeIncidents.map((inc) => (
              <div
                key={inc.id}
                style={{
                  background: "var(--card)",
                  border: "1px solid var(--danger-border)",
                  borderRadius: "var(--radius-sm)",
                  padding: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "0.9rem" }}>⚠️ {inc.type}</strong>
                  <span className="priority-tag critical">{inc.severity}</span>
                </div>
                <p style={{ margin: "4px 0", fontSize: "0.82rem", color: "var(--text-main)" }}>
                  {inc.farmName} &bull; {inc.description}
                </p>
                <Link href={`/farms/${inc.farmId}`} style={{ fontSize: "0.8rem", color: "var(--primary)", fontWeight: 600 }}>
                  Inspect Incident &rarr;
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── ESTATES PORTFOLIO DIRECTORY ── */}
      <section style={{ display: "grid", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          {/* Status Tabs */}
          <div className="tabs-nav" style={{ margin: 0 }}>
            {["ALL", "ACTIVE", "SETUP", "INACTIVE"].map((st) => (
              <button
                key={st}
                type="button"
                className={`tab-btn ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === "ALL" ? `All Estates (${farms.length})` : `${st.replaceAll("_", " ")} (${farms.filter((f) => f.status === st).length})`}
              </button>
            ))}
          </div>

          {/* Search */}
          <div style={{ position: "relative", minWidth: 260 }}>
            <input
              type="text"
              placeholder="Filter by estate, location, owner…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 12px 8px 34px",
                fontSize: "0.88rem",
                height: 38,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 11,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icons.Search size={15} />
            </span>
          </div>
        </div>

        {/* Farm Cards Grid */}
        <div style={{ display: "grid", gap: 12 }}>
          {filteredFarms.map((farm) => {
            const cropNames = Array.from(
              new Set(
                farm.plots.flatMap((p) =>
                  p.cropCycles.filter((c) => c.status !== "CANCELLED").map((c) => c.cropName)
                )
              )
            );

            return (
              <Link
                key={farm.id}
                href={`/farms/${farm.id}`}
                className="card"
                style={{
                  display: "grid",
                  gridTemplateColumns: "2fr 1.2fr 1.5fr 1fr auto",
                  alignItems: "center",
                  gap: 16,
                  padding: "18px 22px",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
                    <strong style={{ fontSize: "1.1rem", color: "var(--text-main)" }}>
                      {farm.name}
                    </strong>
                    <StatusBadge status={farm.status} />
                  </div>
                  <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                    <Icons.MapPin size={12} />
                    <span>{farm.location}</span>
                  </span>
                </div>

                <div>
                  <span className="mono-label" style={{ display: "block" }}>Acreage</span>
                  <strong style={{ fontSize: "0.95rem" }}>
                    {farm.totalArea} Total <span className="muted" style={{ fontWeight: 400 }}>({farm.cultivableArea} cult.)</span>
                  </strong>
                </div>

                <div>
                  <span className="mono-label" style={{ display: "block" }}>Active Crops ({cropNames.length})</span>
                  <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 2 }}>
                    {cropNames.slice(0, 3).map((c) => (
                      <span
                        key={c}
                        style={{
                          padding: "2px 6px",
                          borderRadius: "var(--radius-xs)",
                          background: "var(--primary-light)",
                          color: "var(--primary)",
                          fontSize: "0.75rem",
                          fontWeight: 600,
                        }}
                      >
                        🌱 {c}
                      </span>
                    ))}
                    {cropNames.length === 0 && (
                      <span className="muted" style={{ fontSize: "0.8rem" }}>No active crops</span>
                    )}
                    {cropNames.length > 3 && (
                      <span className="muted" style={{ fontSize: "0.75rem" }}>+{cropNames.length - 3} more</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="mono-label" style={{ display: "block" }}>Plots</span>
                  <strong style={{ fontSize: "0.95rem" }}>{farm.plots.length} Plots</strong>
                </div>

                <div>
                  <span className="btn btn-sm btn-outline">
                    <span>Manage</span>
                    <Icons.ArrowRight size={13} />
                  </span>
                </div>
              </Link>
            );
          })}

          {!filteredFarms.length && (
            <EmptyState
              icon={<Icons.Farm size={28} />}
              title="No estates match criteria"
              description="Try adjusting your status filter or search term."
            />
          )}
        </div>
      </section>
    </div>
  );
}
