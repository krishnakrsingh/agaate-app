"use client";
import { useEffect, useState } from "react";
import Link from "next/link";

interface VisitRow {
  plotId: string;
  name: string;
  status: "VISITED" | "MISSED" | "NEVER";
  lastVisitAt: string | null;
  via: string | null;
}

/**
 * Field coverage: which plots have seen boots in the last N days.
 * Signals: completed plot tasks, attendance GPS inside plot fences,
 * field activity (monitoring/incidents/harvests). Read-only rollup.
 */
export function PlotCoverageCard({ farmId }: { farmId: string }) {
  const [days, setDays] = useState(14);
  const [rows, setRows] = useState<VisitRow[]>([]);
  const [summary, setSummary] = useState({ total: 0, visited: 0, missed: 0, never: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/farms/${farmId}/plot-visits?days=${days}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((body) => {
        if (!body) return;
        setRows(body.plots ?? []);
        setSummary(body.summary ?? { total: 0, visited: 0, missed: 0, never: 0 });
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [farmId, days]);

  const attention = rows.filter((r) => r.status !== "VISITED");
  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 8 }}>
        <strong style={{ fontSize: 14 }}>
          Field Coverage{loading ? "…" : `: ${summary.visited}/${summary.total} visited`}
        </strong>
        <label style={{ fontSize: 12, color: "var(--muted)" }}>
          window{" "}
          <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
            {[7, 14, 30].map((d) => (
              <option key={d} value={d}>{d} days</option>
            ))}
          </select>
        </label>
      </div>
      {!loading && attention.length === 0 && summary.total > 0 && (
        <p className="muted" style={{ fontSize: 12.5, margin: "6px 0 0" }}>Every plot seen recently. Nothing missed.</p>
      )}
      {!loading &&
        attention.slice(0, 8).map((r) => (
          <div className="list-row" key={r.plotId}>
            <span style={{ flex: 1 }}>
              <Link href={`/plots/${r.plotId}`}><b>{r.name}</b></Link>
              <br />
              <small style={{ color: "var(--muted)" }}>
                {r.status === "NEVER" ? "never recorded a visit" : `last visit ${r.lastVisitAt ? r.lastVisitAt.slice(0, 10) : "—"}`}
              </small>
            </span>
            <span className={`badge ${r.status === "NEVER" ? "badge-danger" : "badge-amber"}`}>{r.status}</span>
          </div>
        ))}
      {!loading && attention.length > 8 && (
        <p className="muted" style={{ fontSize: 12, margin: "6px 0 0" }}>+{attention.length - 8} more in the Directory.</p>
      )}
    </div>
  );
}
