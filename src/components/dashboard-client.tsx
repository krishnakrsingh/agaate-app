"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Icons } from "./icons";
import { EmptyState } from "./ui/empty-state";
import { StatusBadge } from "./ui/badge";

type Farm = {
  id: string; name: string; location: string; ownerName: string; status: string;
  totalArea: string; cultivableArea: string;
  plots: { id: string; name: string; cropCycles: { id: string; cropName: string; status: string }[] }[];
  access: { user: { id: string; name: string; role: string } }[];
};

type MetricData = {
  totalFarms: number; activeFarms: number; setupFarms: number; totalPlots: number;
  totalCrops: number; totalTasks: number; completedTasks: number; delayedAlerts: number; pendingIncidents: number;
};

type Alert = { id: string; cropName: string; farmName: string; farmId: string; stage: string; impactPercent: string | null; remarks: string | null };
type Incident = { id: string; type: string; severity: string; description: string; farmName: string; farmId: string };

export function DashboardClient({
  farms, metrics, poorHealthAlerts = [], activeIncidents = [], role = "SUPER_ADMIN",
}: {
  farms: Farm[]; metrics: MetricData; poorHealthAlerts?: Alert[]; activeIncidents?: Incident[]; userName?: string; role?: string;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const filteredFarms = useMemo(() => {
    return farms.filter((f) => {
      const matchStatus = statusFilter === "ALL" || f.status === statusFilter;
      const matchSearch = !search || f.name.toLowerCase().includes(search.toLowerCase()) || f.location.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [farms, statusFilter, search]);

  const totalAcreage = farms.reduce((acc, f) => acc + Number(f.totalArea || 0), 0).toFixed(1);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>PORTFOLIO OVERVIEW &bull; {role.replaceAll("_", " ")}</span>
          </div>
          <h1 className="page-title">Farm Operations Portfolio</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Global monitoring of managed land estates, active crop cycles, and daily field execution telemetry.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {["SUPER_ADMIN", "FARM_ADMIN"].includes(role) && (
            <Link href="/farms/new" className="btn btn-primary">
              <Icons.Plus size={15} />
              <span>Create Farm</span>
            </Link>
          )}
          {role === "FARM_OFFICER" && (
            <Link href="/officer/day" className="btn btn-green">
              <Icons.Sun size={15} />
              <span>Open My Day</span>
            </Link>
          )}
          {role === "AGRONOMIST" && (
            <Link href="/tasks/new" className="btn btn-green">
              <Icons.Calendar size={15} />
              <span>Plan Activity</span>
            </Link>
          )}
          <Link href="/reports/daily" className="btn btn-secondary">
            <Icons.FileText size={15} />
            <span>Daily Report</span>
          </Link>
        </div>
      </div>

      {/* METRIC ORIENTATION SUMMARY (Lines over Floating Cards) */}
      <section>
        <div className="label" style={{ marginBottom: 8, color: "var(--ink)" }}>OPERATIONAL TELEMETRY</div>
        <div className="metric-summary-row">
          <div className="metric-summary-item">
            <span className="metric-label">Managed Estates</span>
            <div className="metric-value">{metrics.totalFarms}</div>
            <div className="metric-sub">{metrics.activeFarms} ACTIVE &bull; {metrics.setupFarms} SETUP</div>
          </div>
          <div className="metric-summary-item">
            <span className="metric-label">Total Acreage</span>
            <div className="metric-value">
              {totalAcreage} <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--muted)" }}>ACRES</span>
            </div>
            <div className="metric-sub">{metrics.totalPlots} LAND PLOTS</div>
          </div>
          <div className="metric-summary-item">
            <span className="metric-label">Active Crop Cycles</span>
            <div className="metric-value">{metrics.totalCrops}</div>
            <div className="metric-sub">CONTROLLED VARIETIES</div>
          </div>
          <div className="metric-summary-item">
            <span className="metric-label">Daily Operations</span>
            <div className="metric-value">{metrics.totalTasks}</div>
            <div className="metric-sub">{metrics.completedTasks} COMPLETED TODAY</div>
          </div>
        </div>
      </section>

      {/* SIGNALS TRAY */}
      {(poorHealthAlerts.length > 0 || activeIncidents.length > 0) && (
        <section style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div className="eyebrow" style={{ color: "var(--red)" }}>
            <span className="eyebrow-dot" style={{ backgroundColor: "var(--red)" }} />
            <span>EXCEPTIONS &amp; ATTENTION SIGNALS</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12 }}>
            {poorHealthAlerts.map((a) => (
              <Link
                key={a.id}
                href={`/farms/${a.farmId}`}
                className="callout red"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "13px", color: "var(--red)" }}>POOR HEALTH: {a.cropName}</strong>
                  <span className="priority-tag critical">{a.impactPercent ? `${a.impactPercent}% Loss` : "Alert"}</span>
                </div>
                <div className="muted" style={{ fontSize: "12px" }}>
                  {a.farmName} &bull; Stage: {a.stage} &bull; {a.remarks}
                </div>
              </Link>
            ))}
            {activeIncidents.map((inc) => (
              <Link
                key={inc.id}
                href={`/farms/${inc.farmId}`}
                className="callout amber"
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: "13px", color: "var(--amber)" }}>INCIDENT: {inc.type}</strong>
                  <span className="priority-tag high">{inc.severity}</span>
                </div>
                <div className="muted" style={{ fontSize: "12px" }}>
                  {inc.farmName} &bull; {inc.description}
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ESTATE DIRECTORY (Line-First Structured Rows) */}
      <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span className="section-title">Estate Directory</span>
            <span className="data" style={{ color: "var(--muted)" }}>({filteredFarms.length})</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <input
              type="text"
              placeholder="Filter by name or location…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: 240, minHeight: 38, padding: "8px 12px" }}
            />
            <div className="tabs-nav">
              {["ALL", "ACTIVE", "SETUP", "COMPLETED"].map((s) => (
                <button
                  key={s}
                  type="button"
                  className={`tab-btn ${statusFilter === s ? "active" : ""}`}
                  onClick={() => setStatusFilter(s)}
                >
                  {s === "ALL" ? "All Estates" : s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          {filteredFarms.map((farm) => {
            const activeCrops = farm.plots.flatMap((p) => p.cropCycles).filter((c) => c.status === "ACTIVE");
            return (
              <Link
                key={farm.id}
                href={`/farms/${farm.id}`}
                className="data-row"
                style={{ padding: "16px 20px" }}
              >
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="item-title">{farm.name}</span>
                    <StatusBadge status={farm.status} />
                  </div>
                  <div className="muted" style={{ fontSize: "13px" }}>
                    {farm.location} &bull; Owner: {farm.ownerName} &bull; <span className="data">{farm.totalArea}</span> acres
                  </div>
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 24, textAlign: "right" }}>
                  <div>
                    <div className="data" style={{ fontWeight: 500, color: "var(--ink)" }}>{farm.plots.length} Plots</div>
                    <div className="muted" style={{ fontSize: "12px" }}>
                      {activeCrops.length > 0 ? activeCrops.map((c) => c.cropName).join(", ") : "No active crops"}
                    </div>
                  </div>
                  <Icons.ChevronRight size={16} color="var(--muted)" />
                </div>
              </Link>
            );
          })}

          {!filteredFarms.length && (
            <EmptyState
              icon={<Icons.Farm size={24} />}
              title="No estates found"
              description="No farm properties match your search criteria."
            />
          )}
        </div>
      </section>
    </div>
  );
}
