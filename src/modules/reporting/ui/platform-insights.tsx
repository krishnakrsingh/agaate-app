"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { CardSkeleton } from "@/components/ui/skeleton";

interface InsightsData {
  totals: {
    clients: number;
    farms: number;
    plots: number;
    users: number;
    totalAcreage: number;
    cultivableAcreage: number;
  };
  farmsByStatus: Array<{ status: string; count: number }>;
  farmsByStage: Array<{ stage: string; count: number }>;
  topStates: Array<{ state: string; farmCount: number; acreage: number }>;
  tasks: {
    total: number;
    completed: number;
    delayed: number;
    pending: number;
    completionRate: number;
  };
  health: {
    openIncidents: number;
    poorCropUpdates: number;
  };
}

export function PlatformInsights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/insights")
      .then((r) => r.json())
      .then((res) => {
        setData(res);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) {
    return <CardSkeleton />;
  }

  if (!data || !data.totals) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "var(--muted)" }}>
        Unable to aggregate insights data.
      </div>
    );
  }

  const cultivablePercent =
    data.totals.totalAcreage > 0
      ? Math.round((data.totals.cultivableAcreage / data.totals.totalAcreage) * 100)
      : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Macro KPI Row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-xl)",
          padding: "20px 24px",
        }}
      >
        <div>
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
            Total Farmland
          </div>
          <div style={{ fontSize: "26px", fontWeight: 600, color: "var(--ink)", marginTop: "4px" }}>
            {data.totals.totalAcreage.toLocaleString()} <span style={{ fontSize: "14px", fontWeight: 400 }}>ac</span>
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            {data.totals.cultivableAcreage.toLocaleString()} ac ({cultivablePercent}%) cultivable
          </div>
        </div>

        <div>
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
            Operations Execution
          </div>
          <div style={{ fontSize: "26px", fontWeight: 600, color: "var(--ink)", marginTop: "4px" }}>
            {data.tasks.completionRate}%
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            {data.tasks.completed.toLocaleString()} of {data.tasks.total.toLocaleString()} tasks completed
          </div>
        </div>

        <div>
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
            Delayed Operations
          </div>
          <div style={{ fontSize: "26px", fontWeight: 600, color: data.tasks.delayed > 0 ? "var(--red)" : "var(--ink)", marginTop: "4px" }}>
            {data.tasks.delayed.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            past target due date
          </div>
        </div>

        <div>
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
            Field Incidents
          </div>
          <div style={{ fontSize: "26px", fontWeight: 600, color: data.health.openIncidents > 0 ? "var(--amber)" : "var(--ink)", marginTop: "4px" }}>
            {data.health.openIncidents.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            {data.health.poorCropUpdates} poor health updates
          </div>
        </div>
      </div>

      {/* 2. Grid: Status Breakdown & Onboarding Stage Conversion */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* Status Breakdown */}
        <section
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)" }}>
              Farms by Status
            </h3>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Click to filter directory</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.farmsByStatus.map((s) => {
              const pct = data.totals.farms > 0 ? Math.round((s.count / data.totals.farms) * 100) : 0;
              return (
                <Link
                  key={s.status}
                  href={`/directory?tab=farms&status=${s.status}`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "var(--canvas-soft)",
                    borderRadius: "var(--radius-md)",
                    textDecoration: "none",
                    color: "inherit",
                    border: "1px solid var(--hairline-soft)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <span className={`status-badge ${s.status.toLowerCase()}`}>{s.status}</span>
                    <span style={{ fontSize: "13px", color: "var(--muted)" }}>{pct}% of total</span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ fontSize: "15px", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                      {s.count.toLocaleString()}
                    </span>
                    <Icons.ChevronRight size={14} style={{ color: "var(--muted)" }} />
                  </div>
                </Link>
              );
            })}
          </div>
        </section>

        {/* Onboarding Stage Conversion */}
        <section
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)" }}>
              Onboarding Stage Pipeline
            </h3>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>Click to drill into stage</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {data.farmsByStage.map((st) => (
              <Link
                key={st.stage}
                href={`/onboarding?stage=${st.stage}`}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 14px",
                  background: "var(--canvas-soft)",
                  borderRadius: "var(--radius-md)",
                  textDecoration: "none",
                  color: "inherit",
                  border: "1px solid var(--hairline-soft)",
                }}
              >
                <div style={{ fontSize: "13px", fontWeight: 500, color: "var(--ink)" }}>
                  {st.stage.replaceAll("_", " ")}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <span style={{ fontSize: "15px", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                    {st.count.toLocaleString()}
                  </span>
                  <Icons.ChevronRight size={14} style={{ color: "var(--muted)" }} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      </div>

      {/* 3. Geographic Footprint (Top Agricultural States) */}
      <section
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-xl)",
          padding: "24px",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)" }}>
            Geographic Footprint & Regional Distribution
          </h3>
          <span style={{ fontSize: "12px", color: "var(--muted)" }}>Top States by Farm Estate Density</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>State / Territory</th>
                <th>Farm Count</th>
                <th>Total Acreage</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {data.topStates.map((st) => (
                <tr key={st.state}>
                  <td style={{ fontWeight: 600 }}>{st.state}</td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "14px" }}>
                    {st.farmCount.toLocaleString()}
                  </td>
                  <td style={{ fontFamily: "var(--font-mono)", fontSize: "14px" }}>
                    {st.acreage.toLocaleString()} ac
                  </td>
                  <td>
                    <Link href={`/directory?tab=farms&state=${encodeURIComponent(st.state)}`} className="text-action" style={{ fontSize: "13px" }}>
                      Filter Farms in {st.state} →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
