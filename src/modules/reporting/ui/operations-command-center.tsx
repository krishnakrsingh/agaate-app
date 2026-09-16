"use client";

import { useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

interface CommandCenterProps {
  macro: {
    totalClients: number;
    totalFarms: number;
    activeFarms: number;
    setupFarms: number;
    totalAcreage: number;
    totalCultivable: number;
    totalPlots: number;
    pendingApprovals: number;
    delayedTasks: number;
    openIncidents: number;
  };
  bottleneckFarms: Array<{
    id: string;
    name: string;
    location: string;
    ownerName: string;
    setupStage: string;
    setupProgress: number;
    daysInStage: number;
    clientName: string;
  }>;
  pendingExceptions: Array<{
    id: string;
    userName: string;
    farmName: string;
    distanceMeters: number;
    reason: string;
    date: string;
  }>;
  criticalTasks: Array<{
    id: string;
    title: string;
    farmName: string;
    dueDate: string;
    priority: string;
    status: string;
    officerName: string;
  }>;
  recentAuditLogs: Array<{
    id: string;
    actorName: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
  }>;
}

export function OperationsCommandCenter({
  macro,
  bottleneckFarms,
  pendingExceptions: initialExceptions,
  criticalTasks,
  recentAuditLogs,
}: CommandCenterProps) {
  const toast = useToast();
  const [exceptions, setExceptions] = useState(initialExceptions);
  const [actingId, setActingId] = useState<string | null>(null);

  async function handleReviewException(id: string, status: "APPROVED" | "REJECTED") {
    setActingId(id);
    try {
      const res = await fetch(`/api/attendance-exceptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error("Failed to process exception.");
      setExceptions((prev) => prev.filter((x) => x.id !== id));
      toast.success(`Exception successfully marked ${status}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update exception.");
    } finally {
      setActingId(null);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Macro Operational Telemetry Bar (Every Metric is a Clickable Filter) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "16px",
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-xl)",
          padding: "20px 24px",
        }}
      >
        <Link
          href="/directory?tab=farms"
          style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
            Total Portfolio
          </div>
          <div style={{ fontSize: "24px", fontWeight: 600, color: "var(--ink)" }}>
            {macro.totalFarms.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            across {macro.totalClients.toLocaleString()} clients →
          </div>
        </Link>

        <Link
          href="/directory?tab=farms&status=ACTIVE"
          style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
            Active Production
          </div>
          <div style={{ fontSize: "24px", fontWeight: 600, color: "var(--ink)" }}>
            {macro.activeFarms.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            {macro.totalPlots.toLocaleString()} active plots →
          </div>
        </Link>

        <Link
          href="/onboarding"
          style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
            In-Flight Setup
          </div>
          <div style={{ fontSize: "24px", fontWeight: 600, color: "var(--amber)" }}>
            {macro.setupFarms.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            onboarding pipeline →
          </div>
        </Link>

        <Link
          href="/work"
          style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
            Delayed Operations
          </div>
          <div style={{ fontSize: "24px", fontWeight: 600, color: macro.delayedTasks > 0 ? "var(--red)" : "var(--ink)" }}>
            {macro.delayedTasks.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            overdue task queue →
          </div>
        </Link>

        <Link
          href="/system"
          style={{ textDecoration: "none", color: "inherit", display: "flex", flexDirection: "column", gap: "4px" }}
        >
          <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
            Pending Approvals
          </div>
          <div style={{ fontSize: "24px", fontWeight: 600, color: macro.pendingApprovals > 0 ? "var(--amber)" : "var(--ink)" }}>
            {macro.pendingApprovals.toLocaleString()}
          </div>
          <div style={{ fontSize: "12px", color: "var(--muted)" }}>
            geofence exceptions →
          </div>
        </Link>
      </div>

      {/* 2. Priority Attention Queues (The Real Work) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        {/* QUEUE 1: Onboarding Bottlenecks */}
        <section
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                Onboarding Bottlenecks
              </h2>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "2px 0 0" }}>
                Estates stalled in setup stages requiring immediate HQ intervention.
              </p>
            </div>
            <Link href="/onboarding" className="text-action" style={{ fontSize: "12px" }}>
              View Pipeline →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {bottleneckFarms.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                No stalled onboarding cases. All estates on track.
              </div>
            ) : (
              bottleneckFarms.slice(0, 5).map((f) => (
                <div
                  key={f.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "var(--canvas-soft)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--hairline-soft)",
                    gap: "12px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <Link
                      href={`/farms/${f.id}`}
                      style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)", textDecoration: "none" }}
                    >
                      {f.name}
                    </Link>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                      Stage: <strong>{f.setupStage.replaceAll("_", " ")}</strong> • {f.clientName}
                    </div>
                  </div>

                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <span
                      style={{
                        display: "inline-block",
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        fontWeight: 600,
                        color: f.daysInStage >= 45 ? "var(--red)" : "var(--amber)",
                        padding: "2px 8px",
                        background: f.daysInStage >= 45 ? "var(--red-light)" : "var(--amber-light)",
                        borderRadius: "var(--radius-pill)",
                      }}
                    >
                      {f.daysInStage} DAYS IN STAGE
                    </span>
                    <div>
                      <Link href={`/farms/${f.id}`} className="text-action" style={{ fontSize: "12px", marginTop: "4px", display: "inline-block" }}>
                        Advance Stage →
                      </Link>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* QUEUE 2: Pending Approvals & Geofence Exceptions */}
        <section
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                Verification & Geofence Queue
              </h2>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "2px 0 0" }}>
                Field workers clocking in outside perimeter needing approval.
              </p>
            </div>
            <Link href="/system" className="text-action" style={{ fontSize: "12px" }}>
              All Exceptions →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {exceptions.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                Zero pending geofence exceptions. All field check-ins verified.
              </div>
            ) : (
              exceptions.slice(0, 5).map((ex) => (
                <div
                  key={ex.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    background: "var(--canvas-soft)",
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--hairline-soft)",
                    gap: "12px",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, fontSize: "14px", color: "var(--ink)" }}>
                      {ex.userName} • {ex.farmName}
                    </div>
                    <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                      Distance: <strong>{Math.round(ex.distanceMeters)}m</strong> from centroid • &ldquo;{ex.reason}&rdquo;
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => handleReviewException(ex.id, "REJECTED")}
                      disabled={actingId === ex.id}
                    >
                      Reject
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary btn-sm"
                      onClick={() => handleReviewException(ex.id, "APPROVED")}
                      disabled={actingId === ex.id}
                    >
                      Approve
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>

      {/* 3. Delayed Tasks & Critical Change Activity Stream */}
      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: "24px" }}>
        {/* Critical Operations Workload */}
        <section
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                Overdue Platform Operations
              </h2>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "2px 0 0" }}>
                Agronomy prescriptions and field tasks past target due date.
              </p>
            </div>
            <Link href="/work" className="text-action" style={{ fontSize: "12px" }}>
              Work Center →
            </Link>
          </div>

          <div className="table-responsive">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Task Title</th>
                  <th>Estate</th>
                  <th>Officer</th>
                  <th>Due Date</th>
                  <th>Priority</th>
                </tr>
              </thead>
              <tbody>
                {criticalTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", padding: "20px", color: "var(--muted)" }}>
                      Zero overdue tasks across all client estates.
                    </td>
                  </tr>
                ) : (
                  criticalTasks.slice(0, 6).map((t) => (
                    <tr key={t.id}>
                      <td style={{ fontWeight: 600 }}>{t.title}</td>
                      <td style={{ fontSize: "13px" }}>{t.farmName}</td>
                      <td style={{ fontSize: "13px", color: "var(--muted)" }}>{t.officerName}</td>
                      <td style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--red)" }}>
                        {t.dueDate}
                      </td>
                      <td>
                        <span className="status-badge" style={{ fontSize: "10px" }}>
                          {t.priority}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Live Audit Log Feed */}
        <section
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-xl)",
            padding: "20px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <h2 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                System Audit Stream
              </h2>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "2px 0 0" }}>
                Immutable ledger of platform mutations.
              </p>
            </div>
            <Link href="/system" className="text-action" style={{ fontSize: "12px" }}>
              Full Audit Trail →
            </Link>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {recentAuditLogs.slice(0, 6).map((log) => (
              <div
                key={log.id}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "2px",
                  padding: "10px 12px",
                  background: "var(--canvas-soft)",
                  borderRadius: "var(--radius-md)",
                  borderBottom: "1px solid var(--hairline-soft)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{log.actorName}</span>
                  <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "11px" }}>
                    {log.createdAt}
                  </span>
                </div>
                <div style={{ fontSize: "13px", color: "var(--body)" }}>
                  <span style={{ fontWeight: 500 }}>{log.action}</span> on {log.entityType} ({log.entityId.slice(0, 10)})
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
