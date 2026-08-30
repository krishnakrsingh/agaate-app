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
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, flex: "1 1 280px" }}>
          <Icons.Farm size={18} />
          <label style={{ display: "flex", alignItems: "center", gap: 8, margin: 0, fontWeight: 500, fontSize: 13, flex: 1 }}>
            <span style={{ whiteSpace: "nowrap" }}>Select Estate:</span>
            <select
              value={farmId}
              onChange={(e) => setFarmId(e.target.value)}
              style={{
                padding: "6px 12px",
                borderRadius: "var(--radius-xs)",
                border: "1px solid var(--hairline)",
                fontSize: 13,
                flex: 1,
                maxWidth: 280,
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
            <Icons.ArrowLeft size={13} />
          </button>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            style={{
              padding: "6px 12px",
              borderRadius: "var(--radius-xs)",
              border: "1px solid var(--hairline)",
              fontSize: 13,
              fontWeight: 500,
              background: "white",
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
          {/* Executive Summary Metrics (Cohere Metric Cards) */}
          <div className="metric-grid" style={{ marginBottom: 24 }}>
            <div className="metric-card">
              <span className="metric-label">Attendance Roster</span>
              <div className="metric-value">{report.attendance.length}</div>
              <div className="metric-sub">Verified Officers Present</div>
            </div>

            <div className="metric-card">
              <span className="metric-label">Task Completion</span>
              <div className="metric-value">{taskCompletionRate}%</div>
              <div className="metric-sub">{completedTasks} of {totalTasks} Tasks Done</div>
            </div>

            <div className="metric-card">
              <span className="metric-label">Labour Telemetry</span>
              <div className="metric-value">{report.resources.labourHours}h</div>
              <div className="metric-sub">Total Field Hours Logged</div>
            </div>

            <div className="metric-card">
              <span className="metric-label">Evidence & Signals</span>
              <div className="metric-value" style={{ color: report.incidents.length > 0 ? "var(--coral)" : "inherit" }}>
                {report.photoCount}
              </div>
              <div className="metric-sub">{report.photoCount} Photos &bull; {report.incidents.length} Incidents</div>
            </div>
          </div>

          {/* Section 1: Verified Field Attendance */}
          <article className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div>
                <div className="eyebrow">ROSTER COMPLIANCE</div>
                <h3 style={{ margin: "2px 0 0" }}>Verified Field Attendance</h3>
              </div>
              <span className="mono-label">{report.attendance.length} Recorded</span>
            </div>

            {report.attendance.length ? (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Officer</th>
                      <th>Shift Status</th>
                      <th>Clock In</th>
                      <th>Clock Out</th>
                      <th>Location Verification</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.attendance.map((a, i) => (
                      <tr key={i}>
                        <td><strong>{a.user.name}</strong></td>
                        <td><StatusBadge status={a.status} /></td>
                        <td>{a.startAt ? new Date(a.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"}</td>
                        <td>{a.endAt ? new Date(a.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "In Progress"}</td>
                        <td>
                          {a.startLatitude && a.startLongitude ? (
                            <span style={{ fontSize: 12, color: "#166534", display: "inline-flex", gap: 4, alignItems: "center" }}>
                              <Icons.CheckCircle size={12} />
                              <span>GPS Verified ({Number(a.startLatitude).toFixed(4)}, {Number(a.startLongitude).toFixed(4)})</span>
                            </span>
                          ) : (
                            <span style={{ fontSize: 12, color: "var(--muted)" }}>No GPS</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                icon={<Icons.Users size={28} />}
                title="No attendance records"
                description="No field officers clocked in for this farm on this date."
              />
            )}
          </article>

          {/* Section 2: Tasks & Agronomy Operations */}
          <article className="card" style={{ marginBottom: 20 }}>
            <div className="card-header">
              <div>
                <div className="eyebrow">EXECUTION DISPATCH</div>
                <h3 style={{ margin: "2px 0 0" }}>Agronomy Operations & Tasks</h3>
              </div>
              <span className="mono-label">{report.tasks.length} Operations</span>
            </div>

            {report.tasks.length ? (
              <div style={{ overflowX: "auto" }}>
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Operation Title</th>
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
              <EmptyState
                icon={<Icons.ClipboardList size={28} />}
                title="No activities scheduled"
                description="No agronomy operations or system tasks were scheduled for this date."
              />
            )}
          </article>

          {/* Section 3: Material Consumption & Resource Summary */}
          <div className="two-column" style={{ marginBottom: 20 }}>
            <article className="card">
              <div className="card-header">
                <div>
                  <div className="eyebrow">INPUT TRACKING</div>
                  <h3 style={{ margin: "2px 0 0" }}>Materials Consumed</h3>
                </div>
              </div>

              {report.resources.materials.length ? (
                <div style={{ display: "grid", gap: 8 }}>
                  {report.resources.materials.map((m, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        padding: "10px 14px",
                        background: "var(--soft-stone)",
                        borderRadius: "var(--radius-xs)",
                        fontSize: 14,
                      }}
                    >
                      <strong>{m.materialName}</strong>
                      <span className="mono-label" style={{ color: "var(--ink)", fontWeight: 600 }}>
                        {m.quantity} {m.unit}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p style={{ margin: 0, fontSize: 13, color: "var(--muted)", fontStyle: "italic" }}>
                  No materials recorded for today&apos;s completions.
                </p>
              )}
            </article>

            {/* Crop Monitoring & Incidents */}
            <article className="card">
              <div className="card-header">
                <div>
                  <div className="eyebrow">FIELD SIGNALS</div>
                  <h3 style={{ margin: "2px 0 0" }}>Monitoring & Incidents</h3>
                </div>
              </div>

              <div style={{ display: "grid", gap: 12 }}>
                <div>
                  <div className="mono-label" style={{ marginBottom: 6 }}>Daily Monitoring Checks: {report.monitoring.length}</div>
                  {report.monitoring.map((m, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--ink)", padding: "6px 0", borderBottom: "1px solid var(--hairline)" }}>
                      <span>Stage: <strong>{m.stage}</strong> &bull; Status: <StatusBadge status={m.status} /></span>
                      {m.remarks && <div style={{ color: "var(--body-muted)", fontSize: 12, marginTop: 2 }}>&ldquo;{m.remarks}&rdquo;</div>}
                    </div>
                  ))}
                </div>

                <div>
                  <div className="mono-label" style={{ marginBottom: 6 }}>Incidents Logged: {report.incidents.length}</div>
                  {report.incidents.map((inc, i) => (
                    <div key={i} style={{ fontSize: 13, color: "var(--error)", padding: "6px 0", borderBottom: "1px solid var(--hairline)" }}>
                      <strong>{inc.type} ({inc.level})</strong> &bull; {inc.severity}
                      <div style={{ color: "var(--ink)", fontSize: 12, marginTop: 2 }}>{inc.description}</div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          </div>
        </>
      )}
    </section>
  );
}
