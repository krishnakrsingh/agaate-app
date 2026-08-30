"use client";
import { useEffect, useState } from "react";
import { Icons } from "./icons";
import { StatusBadge } from "./ui/badge";
import { CardSkeleton } from "./ui/skeleton";
import { EmptyState } from "./ui/empty-state";

type Farm = { id: string; name: string };
type Report = {
  attendance: Array<{
    user: { name: string };
    status: string;
    startAt: string | null;
    endAt: string | null;
    startLatitude: string | null;
    startLongitude: string | null;
    endLatitude: string | null;
    endLongitude: string | null;
  }>;
  tasks: Array<{
    title: string;
    status: string;
    assignedOfficer?: { name: string } | null;
  }>;
  resources: {
    labourHours: number;
    materials: Array<{ materialName: string; quantity: string; unit: string }>;
  };
  monitoring: Array<{ status: string; stage: string; remarks: string | null }>;
  incidents: Array<{ type: string; level: string; severity: string | null; description: string }>;
  photoCount: number;
};

export function DailyReport() {
  const [farms, setFarms] = useState<Farm[]>([]);
  const [farmId, setFarmId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list) => {
        setFarms(list);
        if (list.length > 0) setFarmId(list[0].id);
      })
      .catch(() => setError("Unable to load farms."));
  }, []);

  async function load(targetFarmId = farmId, targetDate = date) {
    if (!targetFarmId) return;
    setLoading(true);
    setError("");

    try {
      const r = await fetch(`/api/reports/daily?farmId=${targetFarmId}&date=${targetDate}`);
      setLoading(false);
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setError(body.error ?? "Unable to load daily report.");
        return;
      }
      setReport(await r.json());
    } catch {
      setLoading(false);
      setError("Network error loading daily report.");
    }
  }

  useEffect(() => {
    if (farmId && date) void load(farmId, date);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [farmId, date]);

  function adjustDate(delta: number) {
    const d = new Date(date);
    d.setDate(d.getDate() + delta);
    const newDate = d.toISOString().slice(0, 10);
    setDate(newDate);
  }

  const completedTasks = report?.tasks.filter((t) => t.status === "COMPLETED").length ?? 0;
  const totalTasks = report?.tasks.length ?? 0;
  const taskCompletionRate = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return (
    <section>
      {/* Date & Farm Selector Bar */}
      <div
        className="card"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "16px 20px",
          marginBottom: 20,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 280px" }}>
          <Icons.Farm size={18} style={{ color: "var(--primary-700)" }} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontWeight: 600, fontSize: "0.88rem", flex: 1 }}>
            <span style={{ whiteSpace: "nowrap" }}>Select Farm:</span>
            <select
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                fontSize: "0.88rem",
                flex: 1,
                maxWidth: 300,
                background: "white",
              }}
            >
              {farms.map((f) => (
                <option value={f.id} key={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Date Stepper & Actions */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => adjustDate(-1)}
            title="Previous day"
          >
            <Icons.ArrowLeft size={14} />
          </button>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-strong)",
              fontSize: "0.88rem",
              fontWeight: 600,
              background: "white",
            }}
          />

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => adjustDate(1)}
            title="Next day"
          >
            <Icons.ArrowRight size={14} />
          </button>

          <button
            type="button"
            className="btn btn-sm btn-outline"
            onClick={() => setDate(new Date().toISOString().slice(0, 10))}
          >
            Today
          </button>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => window.print()}
            title="Print or export PDF report"
          >
            <Icons.FileText size={14} />
            <span>Print / PDF</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {loading && (
        <div style={{ display: "grid", gap: 14 }}>
          <CardSkeleton />
        </div>
      )}

      {report && !loading && (
        <>
          {/* Executive Summary Metrics */}
          <div className="metric-grid" style={{ margin: "0 0 24px" }}>
            <article className="metric-card">
              <div className="metric-card-top">
                <span className="label">Attendance Roster</span>
                <div className="metric-icon-box emerald">
                  <Icons.Users size={18} />
                </div>
              </div>
              <strong className="value">{report.attendance.length}</strong>
              <span className="subtext" style={{ color: "var(--primary-700)" }}>
                Officers Present on Site
              </span>
            </article>

            <article className="metric-card">
              <div className="metric-card-top">
                <span className="label">Task Completion</span>
                <div className="metric-icon-box blue">
                  <Icons.CheckCircle size={18} />
                </div>
              </div>
              <strong className="value">
                {completedTasks}/{totalTasks}
              </strong>
              <span className="subtext" style={{ color: "var(--sky-dark)" }}>
                {taskCompletionRate}% Dispatch Success Rate
              </span>
            </article>

            <article className="metric-card">
              <div className="metric-card-top">
                <span className="label">Labour Man-Hours</span>
                <div className="metric-icon-box amber">
                  <Icons.Clock size={18} />
                </div>
              </div>
              <strong className="value">{report.resources.labourHours} hrs</strong>
              <span className="subtext" style={{ color: "var(--harvest-dark)" }}>
                Field Labour Tracked
              </span>
            </article>

            <article className="metric-card">
              <div className="metric-card-top">
                <span className="label">Photos & Signals</span>
                <div className="metric-icon-box blue">
                  <Icons.Camera size={18} />
                </div>
              </div>
              <strong className="value">{report.photoCount}</strong>
              <span className="subtext" style={{ color: "var(--sky-dark)" }}>
                Photographic Field Proofs
              </span>
            </article>
          </div>

          {/* Detailed Structured Report Sections */}
          <div className="two-column" style={{ alignItems: "start" }}>
            {/* Attendance Roster */}
            <article className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <h3>1. Attendance Roster ({report.attendance.length})</h3>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {report.attendance.map((a, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 14px",
                      background: "var(--slate-50)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong style={{ fontSize: "0.95rem" }}>{a.user.name}</strong>
                      <StatusBadge status={a.status} />
                    </div>

                    <div style={{ fontSize: "0.82rem", color: "var(--text-muted)", marginTop: 6, display: "grid", gap: 2 }}>
                      <div>
                        <strong>Start:</strong>{" "}
                        {a.startAt ? new Date(a.startAt).toLocaleTimeString() : "—"}{" "}
                        {a.startLatitude && `(${a.startLatitude}, ${a.startLongitude})`}
                      </div>
                      <div>
                        <strong>End:</strong>{" "}
                        {a.endAt ? new Date(a.endAt).toLocaleTimeString() : "Active / Open"}{" "}
                        {a.endLatitude && `(${a.endLatitude}, ${a.endLongitude})`}
                      </div>
                    </div>
                  </div>
                ))}

                {!report.attendance.length && (
                  <EmptyState
                    icon={<Icons.Users size={24} />}
                    title="No attendance records"
                    description="No officer clock-in logs recorded for this date."
                  />
                )}
              </div>
            </article>

            {/* Task Execution */}
            <article className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <h3>2. Task Execution ({report.tasks.length})</h3>
              </div>

              <div style={{ display: "grid", gap: 10 }}>
                {report.tasks.map((t, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "12px 14px",
                      background: t.status === "COMPLETED" ? "var(--primary-50)" : "var(--slate-50)",
                      borderRadius: "var(--radius-md)",
                      border: `1px solid ${t.status === "COMPLETED" ? "var(--primary-200)" : "var(--border-subtle)"}`,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <strong>{t.title}</strong>
                      <StatusBadge status={t.status} />
                    </div>
                    <small className="muted" style={{ display: "block", marginTop: 4 }}>
                      Officer: {t.assignedOfficer?.name ?? "Unassigned"}
                    </small>
                  </div>
                ))}

                {!report.tasks.length && (
                  <EmptyState
                    icon={<Icons.ClipboardList size={24} />}
                    title="No planned tasks"
                    description="No tasks dispatched or recorded for this date."
                  />
                )}
              </div>
            </article>

            {/* Resource & Labour Tracking */}
            <article className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <h3>3. Resource & Labour Utilization</h3>
              </div>

              <div style={{ marginBottom: 14 }}>
                <strong style={{ fontSize: "1.05rem", color: "var(--primary-900)" }}>
                  Total Labour Hours: {report.resources.labourHours} Man-Hours
                </strong>
              </div>

              <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                Materials Consumed ({report.resources.materials.length})
              </h4>
              <div style={{ display: "grid", gap: 6 }}>
                {report.resources.materials.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      padding: "8px 12px",
                      background: "var(--slate-50)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                      fontSize: "0.88rem",
                    }}
                  >
                    <strong>{m.materialName}</strong>
                    <span style={{ fontWeight: 600, color: "var(--primary-800)" }}>
                      {m.quantity} {m.unit}
                    </span>
                  </div>
                ))}

                {!report.resources.materials.length && (
                  <p className="muted" style={{ fontSize: "0.85rem" }}>
                    No material usage recorded today.
                  </p>
                )}
              </div>
            </article>

            {/* Field Signals & Incidents */}
            <article className="card" style={{ margin: 0 }}>
              <div className="card-header">
                <h3>4. Crop Signals & Incidents</h3>
              </div>

              <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                Crop Monitoring ({report.monitoring.length})
              </h4>
              <div style={{ display: "grid", gap: 6, marginBottom: 16 }}>
                {report.monitoring.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 12px",
                      background: m.status === "POOR" ? "var(--danger-light)" : "var(--primary-50)",
                      borderRadius: "var(--radius-sm)",
                      border: `1px solid ${m.status === "POOR" ? "var(--danger-border)" : "var(--primary-200)"}`,
                      fontSize: "0.85rem",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <strong>{m.status} &bull; {m.stage}</strong>
                    </div>
                    {m.remarks && <p style={{ margin: "2px 0 0", color: "var(--text-main)" }}>{m.remarks}</p>}
                  </div>
                ))}

                {!report.monitoring.length && (
                  <p className="muted" style={{ fontSize: "0.85rem" }}>
                    No crop monitoring records for this date.
                  </p>
                )}
              </div>

              <h4 style={{ fontSize: "0.85rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 8 }}>
                Incidents Logged ({report.incidents.length})
              </h4>
              <div style={{ display: "grid", gap: 6 }}>
                {report.incidents.map((inc, i) => (
                  <div
                    key={i}
                    style={{
                      padding: "8px 12px",
                      background: "white",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-strong)",
                      fontSize: "0.85rem",
                    }}
                  >
                    <strong>{inc.type}</strong> ({inc.level} Level &bull; {inc.severity})
                    <p style={{ margin: "2px 0 0", color: "var(--text-muted)" }}>{inc.description}</p>
                  </div>
                ))}

                {!report.incidents.length && (
                  <p className="muted" style={{ fontSize: "0.85rem" }}>
                    No incidents recorded for this date.
                  </p>
                )}
              </div>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
