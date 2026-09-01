"use client";
/* eslint-disable react-hooks/set-state-in-effect */
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
  const selectedFarm = farms.find((f) => f.id === farmId);

  return (
    <section style={{ display: "grid", gap: 20 }}>
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
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 280px" }}>
          <Icons.Farm size={18} style={{ color: "var(--primary)" }} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontWeight: 600, fontSize: "0.88rem", flex: 1 }}>
            <span style={{ whiteSpace: "nowrap" }}>Select Estate:</span>
            <select
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              style={{
                padding: "6px 12px",
                fontSize: "0.88rem",
                flex: 1,
                maxWidth: 280,
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
            <Icons.ArrowLeft size={13} />
          </button>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "6px 12px",
              fontSize: "0.88rem",
              fontWeight: 500,
              width: "auto",
            }}
          />

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => adjustDate(1)}
            title="Next day"
          >
            <Icons.ArrowRight size={13} />
          </button>

          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={() => setDate(new Date().toISOString().slice(0, 10))}
          >
            Today
          </button>

          <button
            type="button"
            className="btn btn-sm btn-primary"
            onClick={() => window.print()}
            title="Print or export PDF report"
          >
            <Icons.FileText size={13} />
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
          <div className="metric-grid">
            <div className="metric-card">
              <span className="metric-label">Field Staff On-Site</span>
              <div className="metric-value">{report.attendance.length}</div>
              <div className="metric-sub">
                {report.attendance.filter((a) => a.endAt).length} Shifts Finished
              </div>
            </div>

            <div className="metric-card">
              <span className="metric-label">Task Progress</span>
              <div className="metric-value">{completedTasks} / {totalTasks}</div>
              <div className="metric-sub">{taskCompletionRate}% Execution Rate</div>
            </div>

            <div className="metric-card">
              <span className="metric-label">Labour Utilization</span>
              <div className="metric-value">{report.resources.labourHours} <span style={{ fontSize: "1.1rem", fontWeight: 500 }}>Hrs</span></div>
              <div className="metric-sub">Total Man-Hours Logged</div>
            </div>

            <div className="metric-card">
              <span className="metric-label">Field Signals</span>
              <div className="metric-value">{report.monitoring.length + report.incidents.length}</div>
              <div className="metric-sub">
                {report.monitoring.length} Monitoring &bull; {report.incidents.length} Incidents
              </div>
            </div>
          </div>

          {/* ── SECTION 1: ATTENDANCE ROSTER ── */}
          <article className="card" style={{ padding: 22 }}>
            <div className="card-header">
              <div>
                <h3 style={{ margin: 0 }}>Verified Field Presence Roster</h3>
                <p className="muted" style={{ margin: "2px 0 0" }}>
                  Officer clock-ins verified via GPS coordinates and live front-camera selfie.
                </p>
              </div>
            </div>

            {report.attendance.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Officer</th>
                      <th>Status</th>
                      <th>Shift Start</th>
                      <th>Shift End</th>
                      <th>GPS Coordinates</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.attendance.map((a, i) => (
                      <tr key={i}>
                        <td><strong>{a.user.name}</strong></td>
                        <td><StatusBadge status={a.status} /></td>
                        <td>{a.startAt ? new Date(a.startAt).toLocaleTimeString() : "—"}</td>
                        <td>{a.endAt ? new Date(a.endAt).toLocaleTimeString() : "In Progress"}</td>
                        <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
                          {a.startLatitude ? `${Number(a.startLatitude).toFixed(4)}, ${Number(a.startLongitude).toFixed(4)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: "center", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                <p className="muted" style={{ margin: 0 }}>No attendance records logged for this date.</p>
              </div>
            )}
          </article>

          {/* ── SECTION 2: OPERATIONS & TASK COMPLETIONS ── */}
          <article className="card" style={{ padding: 22 }}>
            <div className="card-header">
              <div>
                <h3 style={{ margin: 0 }}>Assigned & Completed Field Tasks</h3>
                <p className="muted" style={{ margin: "2px 0 0" }}>
                  Status of scheduled agronomy operations for {selectedFarm?.name ?? "the farm"}.
                </p>
              </div>
            </div>

            {report.tasks.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Activity Title</th>
                      <th>Status</th>
                      <th>Assigned Officer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.tasks.map((t, i) => (
                      <tr key={i}>
                        <td><strong>{t.title}</strong></td>
                        <td><StatusBadge status={t.status} /></td>
                        <td>{t.assignedOfficer?.name ?? "Unassigned"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 16, textAlign: "center", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                <p className="muted" style={{ margin: 0 }}>No activities scheduled for this date.</p>
              </div>
            )}
          </article>

          {/* ── SECTION 3: RESOURCE CONSUMPTION ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {/* Materials Used */}
            <article className="card" style={{ padding: 22 }}>
              <h3 style={{ margin: "0 0 12px" }}>Input Material Consumption</h3>
              {report.resources.materials.length > 0 ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {report.resources.materials.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "var(--card-muted)",
                        borderRadius: "var(--radius-sm)",
                        fontSize: "0.88rem",
                      }}
                    >
                      <span>{m.materialName}</span>
                      <strong>{m.quantity} {m.unit}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ margin: 0, fontSize: "0.88rem" }}>No material inputs recorded today.</p>
              )}
            </article>

            {/* Field Signals Summary */}
            <article className="card" style={{ padding: 22 }}>
              <h3 style={{ margin: "0 0 12px" }}>Field Telemetry & Evidence</h3>
              <div style={{ display: "grid", gap: 10, fontSize: "0.88rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                  <span>Crop Monitoring Logs</span>
                  <strong>{report.monitoring.length} Observations</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                  <span>Field Incidents Logged</span>
                  <strong>{report.incidents.length} Incidents</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                  <span>Evidence Photos Captured</span>
                  <strong>{report.photoCount} High-Res Frames</strong>
                </div>
              </div>
            </article>
          </div>
        </>
      )}

      {!report && !loading && (
        <EmptyState
          icon={<Icons.FileText size={28} />}
          title="No daily report data available"
          description="Select an active estate and date to inspect automated operations intelligence."
        />
      )}
    </section>
  );
}
