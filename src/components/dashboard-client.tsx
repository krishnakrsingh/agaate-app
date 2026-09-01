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
    <div style={{ display: "grid", gap: 20 }}>
      {/* PAGE HEADER */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="eyebrow"><span className="eyebrow-dot" />PORTFOLIO OVERVIEW &bull; {role.replaceAll("_", " ")}</div>
          <h1>Farm Operations Portfolio</h1>
          <p className="muted">Global monitoring of managed land estates, active crop cycles, and daily field execution telemetry.</p>
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {["SUPER_ADMIN", "FARM_ADMIN"].includes(role) && (
            <Link href="/farms/new" className="btn btn-primary"><Icons.Plus size={15} /><span>Create Farm</span></Link>
          )}
          {role === "FARM_OFFICER" && (
            <Link href="/officer/day" className="btn btn-primary"><Icons.Sun size={15} /><span>Open My Day</span></Link>
          )}
          {role === "AGRONOMIST" && (
            <Link href="/tasks/new" className="btn btn-primary"><Icons.Calendar size={15} /><span>Plan Activity</span></Link>
          )}
          <Link href="/reports/daily" className="btn btn-secondary"><Icons.FileText size={15} /><span>Daily Report</span></Link>
        </div>
      </div>

      {/* METRIC GRID */}
      <section className="metric-grid">
        <div className="metric-card">
          <span className="metric-label">Managed Estates</span>
          <div className="metric-value">{metrics.totalFarms}</div>
          <div className="metric-sub">{metrics.activeFarms} Active &bull; {metrics.setupFarms} Setup</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Total Acreage</span>
          <div className="metric-value">{totalAcreage} <span style={{ fontSize: "1.1rem", fontWeight: 500 }}>Acres</span></div>
          <div className="metric-sub">{metrics.totalPlots} Land Plots</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Active Crop Cycles</span>
          <div className="metric-value">{metrics.totalCrops}</div>
          <div className="metric-sub">Controlled Varieties</div>
        </div>
        <div className="metric-card">
          <span className="metric-label">Daily Operations</span>
          <div className="metric-value">{metrics.totalTasks}</div>
          <div className="metric-sub">{metrics.completedTasks} Finished Today</div>
        </div>
      </section>

      {/* SIGNALS TRAY */}
      {(poorHealthAlerts.length > 0 || activeIncidents.length > 0) && (
        <section className="card" style={{ padding: 18, background: "var(--card-muted)", display: "grid", gap: 10 }}>
          <div className="eyebrow" style={{ color: "var(--danger-text)" }}><span className="eyebrow-dot" style={{ background: "var(--danger)" }} />ATTENTION SIGNALS</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
            {poorHealthAlerts.map((a) => (
              <Link key={a.id} href={`/farms/${a.farmId}`} style={{ padding: 12, background: "var(--card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--danger-border)", textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ color: "var(--danger-text)" }}>🌱 Poor Health: {a.cropName}</strong>
                  <span className="priority-tag critical">{a.impactPercent ? `${a.impactPercent}% Loss` : "Alert"}</span>
                </div>
                <div className="muted" style={{ fontSize: "0.78rem", marginTop: 4 }}>{a.farmName} &bull; {a.stage} stage &bull; {a.remarks}</div>
              </Link>
            ))}
            {activeIncidents.map((inc) => (
              <Link key={inc.id} href={`/farms/${inc.farmId}`} style={{ padding: 12, background: "var(--card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--warning-border)", textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <strong style={{ color: "var(--warning-text)" }}>⚠ {inc.type}</strong>
                  <span className="priority-tag high">{inc.severity}</span>
                </div>
                <div className="muted" style={{ fontSize: "0.78rem", marginTop: 4 }}>{inc.farmName} &bull; {inc.description}</div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* ESTATE DIRECTORY */}
      <section style={{ display: "grid", gap: 12 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <input type="text" placeholder="Search estates…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 240 }} />
          <div className="tabs-nav" style={{ margin: 0 }}>
            {["ALL", "ACTIVE", "SETUP", "COMPLETED"].map((s) => (
              <button key={s} type="button" className={`tab-btn ${statusFilter === s ? "active" : ""}`} onClick={() => setStatusFilter(s)}>
                {s === "ALL" ? "All Estates" : s}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gap: 10 }}>
          {filteredFarms.map((farm) => {
            const activeCrops = farm.plots.flatMap((p) => p.cropCycles).filter((c) => c.status === "ACTIVE");
            return (
              <Link key={farm.id} href={`/farms/${farm.id}`} className="card" style={{ padding: 18, textDecoration: "none", color: "inherit", display: "grid", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div>
                    <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{farm.name}</h3>
                    <span className="muted" style={{ fontSize: "0.82rem" }}>{farm.location} &bull; Owner: {farm.ownerName} &bull; {farm.totalArea} acres</span>
                  </div>
                  <StatusBadge status={farm.status} />
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center", fontSize: "0.82rem", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                  <span>Plots: <strong>{farm.plots.length}</strong></span>
                  <span>&bull;</span>
                  <span>Active Crops: <strong>{activeCrops.length > 0 ? activeCrops.map((c) => c.cropName).join(", ") : "None"}</strong></span>
                </div>
              </Link>
            );
          })}

          {!filteredFarms.length && (
            <EmptyState icon={<Icons.Farm size={28} />} title="No estates found" description="No farm properties match your search criteria." />
          )}
        </div>
      </section>
    </div>
  );
}
