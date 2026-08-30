"use client";
import { useState, useMemo } from "react";
import Link from "next/link";
import { Icons } from "./icons";
import { StatusBadge, RoleBadge } from "./ui/badge";
import { EmptyState } from "./ui/empty-state";

type Farm = {
  id: string;
  name: string;
  location: string;
  ownerName: string;
  status: string;
  totalArea: string;
  cultivableArea: string;
  plots: {
    id: string;
    name: string;
    cropCycles: { id: string; cropName: string; status: string }[];
  }[];
  access: { user: { id: string; name: string; role: string } }[];
  _count?: {
    plots: number;
    tasks: number;
    incidents: number;
  };
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

export function DashboardClient({
  farms,
  metrics,
  userName = "User",
  role = "SUPER_ADMIN",
}: {
  farms: Farm[];
  metrics: MetricData;
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

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Welcome Operational Overview Card */}
      <div
        className="card"
        style={{
          border: "1px solid var(--border-subtle)",
          padding: "24px",
          marginBottom: 0,
          background: "var(--bg-card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div className="eyebrow" style={{ marginBottom: 4 }}>
              <span className="eyebrow-dot"></span>
              ENTERPRISE FARM OPERATIONS &bull; <RoleBadge role={role} />
            </div>
            <h1 style={{ fontSize: "1.8rem", margin: "4px 0 6px" }}>
              Welcome, {userName}
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", margin: 0, maxWidth: 680 }}>
              {role === "SUPER_ADMIN" && "Global operational oversight across all managed estates, agronomy planning, user security, and compliance."}
              {role === "FARM_ADMIN" && "Manage farm infrastructure, plots, crop establishment, officer assignments, and attendance exceptions."}
              {role === "AGRONOMIST" && "Manage 7-day rolling agronomy activities, analyze crop telemetry, and provide corrective prescriptions."}
              {role === "FARM_OFFICER" && "Clock in with geofence validation, execute assigned daily tasks, and submit crop monitoring logs."}
            </p>
          </div>

          {/* Role-Specific Quick Action Buttons */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            {["SUPER_ADMIN", "FARM_ADMIN"].includes(role) && (
              <>
                <Link href="/farms/new" className="btn btn-sm btn-primary" style={{ minHeight: 38 }}>
                  <Icons.Plus size={14} />
                  <span>New Farm</span>
                </Link>

                <Link href="/admin/approvals" className="btn btn-sm btn-secondary" style={{ minHeight: 38 }}>
                  <Icons.AlertTriangle size={14} />
                  <span>Approvals</span>
                </Link>
              </>
            )}

            {["SUPER_ADMIN", "AGRONOMIST"].includes(role) && (
              <Link href="/tasks/new" className="btn btn-sm btn-primary" style={{ minHeight: 38 }}>
                <Icons.Calendar size={14} />
                <span>Plan Activity</span>
              </Link>
            )}

            {role === "FARM_OFFICER" && (
              <Link href="/officer/day" className="btn btn-sm btn-primary" style={{ minHeight: 38 }}>
                <Icons.CheckCircle size={14} />
                <span>My Day Shift</span>
              </Link>
            )}

            <Link href="/reports/daily" className="btn btn-sm btn-secondary" style={{ minHeight: 38 }}>
              <Icons.FileText size={14} />
              <span>Daily Report</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Telemetry Metric Cards */}
      <div className="metric-grid">
        <article className="metric-card">
          <div className="metric-card-top">
            <span className="label">Managed Farms</span>
            <div className="metric-icon-box emerald">
              <Icons.Farm size={18} />
            </div>
          </div>
          <strong className="value">{metrics.totalFarms}</strong>
          <span className="subtext" style={{ color: "var(--primary-700)" }}>
            {metrics.activeFarms} Active &bull; {metrics.setupFarms} Setup
          </span>
        </article>

        <article className="metric-card">
          <div className="metric-card-top">
            <span className="label">Plots & Crops</span>
            <div className="metric-icon-box blue">
              <Icons.Layers size={18} />
            </div>
          </div>
          <strong className="value">{metrics.totalPlots}</strong>
          <span className="subtext" style={{ color: "var(--sky-dark)" }}>
            {metrics.totalCrops} Active Crop Cycles
          </span>
        </article>

        <article className="metric-card">
          <div className="metric-card-top">
            <span className="label">Activity Dispatch</span>
            <div className="metric-icon-box amber">
              <Icons.ClipboardList size={18} />
            </div>
          </div>
          <strong className="value">{metrics.totalTasks}</strong>
          <span className="subtext" style={{ color: "var(--harvest-dark)" }}>
            {metrics.completedTasks} Completed
          </span>
        </article>

        <article className="metric-card">
          <div className="metric-card-top">
            <span className="label">Field Signals</span>
            <div className="metric-icon-box blue">
              <Icons.Activity size={18} />
            </div>
          </div>
          <strong className="value">{metrics.pendingIncidents}</strong>
          <span className="subtext" style={{ color: metrics.pendingIncidents > 0 ? "var(--danger-red)" : "var(--primary-700)" }}>
            {metrics.pendingIncidents > 0 ? "Active Incidents Logged" : "All Clear"}
          </span>
        </article>
      </div>

      {/* Farms Gallery Section */}
      <section>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          {/* Search Bar */}
          <div style={{ position: "relative", minWidth: 260 }}>
            <input
              type="text"
              placeholder="Search by farm, owner, or location…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "9px 12px 9px 34px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                fontSize: "0.88rem",
                width: "100%",
                background: "white",
              }}
            />
            <div style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--slate-400)" }}>
              <Icons.Search size={16} />
            </div>
          </div>

          {/* Status Filter Tabs */}
          <div className="tabs-nav" style={{ margin: 0, padding: 3 }}>
            {["ALL", "ACTIVE", "SETUP", "INACTIVE"].map((st) => (
              <button
                key={st}
                type="button"
                className={`tab-btn ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
                style={{ padding: "5px 12px", fontSize: "0.8rem" }}
              >
                {st === "ALL" ? "All Farms" : st}
              </button>
            ))}
          </div>
        </div>

        {/* Farms Grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))", gap: 16 }}>
          {filteredFarms.map((farm) => {
            const plotCount = farm.plots?.length ?? farm._count?.plots ?? 0;
            const officerCount = farm.access?.filter((a) => a.user.role === "FARM_OFFICER").length ?? 0;
            const crops = farm.plots?.flatMap((p) => p.cropCycles.map((c) => c.cropName)) ?? [];

            return (
              <Link
                key={farm.id}
                href={`/farms/${farm.id}`}
                className="card card-interactive"
                style={{
                  margin: 0,
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  transition: "all 0.2s ease",
                  border: "1px solid var(--border-subtle)",
                  padding: "20px",
                }}
              >
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <StatusBadge status={farm.status} />
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                      <Icons.MapPin size={12} />
                      <span>{farm.location}</span>
                    </span>
                  </div>

                  <h3 style={{ fontSize: "1.2rem", margin: "2px 0 6px", color: "var(--slate-900)" }}>
                    {farm.name}
                  </h3>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "0 0 12px" }}>
                    Owner: <strong>{farm.ownerName}</strong> &bull; {farm.totalArea} Acres
                  </p>

                  {/* Crop Badges */}
                  {crops.length > 0 ? (
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                      {crops.slice(0, 3).map((crop, idx) => (
                        <span
                          key={idx}
                          style={{
                            padding: "2px 7px",
                            borderRadius: "var(--radius-xs)",
                            background: "var(--primary-50)",
                            color: "var(--primary-800)",
                            border: "1px solid var(--primary-200)",
                            fontSize: "0.75rem",
                            fontWeight: 600,
                          }}
                        >
                          🌱 {crop}
                        </span>
                      ))}
                      {crops.length > 3 && (
                        <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                          +{crops.length - 3} more
                        </span>
                      )}
                    </div>
                  ) : (
                    <p style={{ fontSize: "0.8rem", color: "var(--text-muted)", fontStyle: "italic", marginBottom: 12 }}>
                      No active crop cycle planned yet.
                    </p>
                  )}
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    paddingTop: 12,
                    borderTop: "1px solid var(--border-subtle)",
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                  }}
                >
                  <div style={{ display: "flex", gap: 12 }}>
                    <span><strong>{plotCount}</strong> Plots</span>
                    <span><strong>{officerCount}</strong> Officers</span>
                  </div>
                  <span style={{ color: "var(--primary-700)", fontWeight: 700, display: "flex", alignItems: "center", gap: 2 }}>
                    <span>Open Hub</span>
                    <Icons.ChevronRight size={14} />
                  </span>
                </div>
              </Link>
            );
          })}

          {!filteredFarms.length && (
            <div style={{ gridColumn: "1 / -1" }}>
              <EmptyState
                icon={<Icons.Farm size={28} />}
                title="No farms found"
                description="No farm estates match your current search query or filter selection."
              />
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
