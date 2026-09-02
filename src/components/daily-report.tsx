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
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Date & Farm Selector Bar */}
      <div
        className="compact-card"
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
          <Icons.Farm size={18} color="var(--green)" />
          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontWeight: 550, fontSize: "13px", flex: 1 }}>
            <span style={{ whiteSpace: "nowrap" }}>Select Estate:</span>
            <select
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              style={{
                minHeight: 36,
                padding: "6px 12px",
                fontSize: "13px",
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
              minHeight: 36,
              padding: "6px 12px",
              fontSize: "13px",
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
          {/* Executive Summary Telemetry */}
          <div className="metric-summary-row">
            <div className="metric-summary-item">
              <span className="metric-label">Field Staff On-Site</span>
              <div className="metric-value">{report.attendance.length}</div>
              <div className="metric-sub">
                {report.attendance.filter((a) => a.endAt).length} SHIFTS FINISHED
              </div>
            </div>

            <div className="metric-summary-item">
              <span className="metric-label">Task Progress</span>
              <div className="metric-value">{completedTasks} / {totalTasks}</div>
              <div className="metric-sub">{taskCompletionRate}% EXECUTION RATE</div>
            </div>

            <div className="metric-summary-item">
              <span className="metric-label">Labour Utilization</span>
              <div className="metric-value">
                {report.resources.labourHours} <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--muted)" }}>HRS</span>
              </div>
              <div className="metric-sub">TOTAL MAN-HOURS LOGGED</div>
            </div>

            <div className="metric-summary-item">
              <span className="metric-label">Field Signals</span>
              <div className="metric-value">{report.monitoring.length + report.incidents.length}</div>
              <div className="metric-sub">
                {report.monitoring.length} MONITORING &bull; {report.incidents.length} INCIDENTS
              </div>
            </div>
          </div>

          {/* ── SECTION 1: ATTENDANCE ROSTER ── */}
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <h2 className="section-title">Verified Field Presence Roster</h2>
                <p className="muted" style={{ marginTop: 2 }}>
                  Officer presence verified via GPS coordinate boundaries and timestamp telemetry.
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
                        <td className="data">{a.startAt ? new Date(a.startAt).toLocaleTimeString() : "—"}</td>
                        <td className="data">{a.endAt ? new Date(a.endAt).toLocaleTimeString() : "In Progress"}</td>
                        <td className="data" style={{ fontSize: "12px" }}>
                          {a.startLatitude ? `${Number(a.startLatitude).toFixed(4)}, ${Number(a.startLongitude).toFixed(4)}` : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div style={{ padding: 20, textAlign: "center", background: "var(--canvas)", border: "1px solid var(--line)" }}>
                <p className="muted" style={{ margin: 0 }}>No attendance records logged for this date.</p>
              </div>
            )}
          </section>

          {/* ── SECTION 2: OPERATIONS & TASK COMPLETIONS ── */}
          <section style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
              <div>
                <h2 className="section-title">Assigned &amp; Completed Field Tasks</h2>
                <p className="muted" style={{ marginTop: 2 }}>
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
              <div style={{ padding: 20, textAlign: "center", background: "var(--canvas)", border: "1px solid var(--line)" }}>
                <p className="muted" style={{ margin: 0 }}>No activities scheduled for this date.</p>
              </div>
            )}
          </section>

          {/* ── SECTION 3: RESOURCE CONSUMPTION ── */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {/* Materials Used */}
            <article className="compact-card" style={{ padding: 20, gap: 12 }}>
              <h3 className="item-title">Input Material Consumption</h3>
              {report.resources.materials.length > 0 ? (
                <div style={{ display: "flex", flexDirection: "column" }}>
                  {report.resources.materials.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 12px",
                        borderBottom: "1px solid var(--line)",
                        fontSize: "13px",
                      }}
                    >
                      <span>{m.materialName}</span>
                      <strong className="data">{m.quantity} {m.unit}</strong>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="muted" style={{ margin: 0, fontSize: "13px" }}>No material inputs recorded today.</p>
              )}
            </article>

            {/* Field Signals Summary */}
            <article className="compact-card" style={{ padding: 20, gap: 12 }}>
              <h3 className="item-title">Field Telemetry &amp; Evidence</h3>
              <div style={{ display: "flex", flexDirection: "column", fontSize: "13px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>
                  <span>Crop Monitoring Logs</span>
                  <strong className="data">{report.monitoring.length} Observations</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px", borderBottom: "1px solid var(--line)" }}>
                  <span>Field Incidents Logged</span>
                  <strong className="data">{report.incidents.length} Incidents</strong>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 12px" }}>
                  <span>Evidence Photos Captured</span>
                  <strong className="data">{report.photoCount} High-Res Frames</strong>
                </div>
              </div>
            </article>
          </div>
        </>
      )}

      {!report && !loading && (
        <EmptyState
          icon={<Icons.FileText size={24} />}
          title="No daily report data available"
          description="Select an active estate and date to inspect automated operations intelligence."
        />
      )}
    </section>
  );
}
