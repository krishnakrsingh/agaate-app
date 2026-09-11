"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { formatDate } from "@/lib/business";
import type { HistoryItem, HistoryKind } from "@/app/api/hq/history/route";
import type { OfficerRow } from "@/app/api/hq/history/officers/route";

const KIND_LABELS: Record<HistoryKind, string> = {
  task_due: "Task due",
  task_completed: "Task done",
  incident: "Incident",
  harvest: "Harvest",
  monitoring: "Crop check",
  attendance: "Attendance",
  muster: "Muster",
  audit: "Record update",
};

const KIND_BADGE: Record<HistoryKind, string> = {
  task_due: "badge-amber",
  task_completed: "badge-green",
  incident: "badge-danger",
  harvest: "badge-green",
  monitoring: "badge-blue",
  attendance: "badge-muted",
  muster: "badge-amber",
  audit: "badge-muted",
};

function historyLink(farmId: string, item: HistoryItem): string {
  // Farm 360 coordination: links land on the HQ farm page. Follow-up for the
  // Farm 360 owner: honor ?view=history and embed <HistoryTimeline/> there;
  // these deep links already carry the ids needed (taskId / incidentId).
  const base = `/hq/farms/${farmId}`;
  if (item.links.taskId) return `${base}?view=history&taskId=${item.links.taskId}`;
  if (item.links.incidentId) return `${base}?view=history&incidentId=${item.links.incidentId}`;
  return base;
}

/**
 * Embeddable per-farm timeline. Drop-in for Farm 360 (`/hq/farms/[farmId]`):
 * render <HistoryTimeline farmId={id} /> inside its history view (?view=history).
 * Read-model: display only, no edits.
 */
export function HistoryTimeline({
  farmId,
  from,
  to,
  kinds,
}: {
  farmId: string;
  from?: string;
  to?: string;
  kinds?: HistoryKind[];
}) {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (nextCursor: string | null, append: boolean) => {
      const params = new URLSearchParams({ farmId, limit: "40" });
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      if (kinds?.length) params.set("kinds", kinds.join(","));
      if (nextCursor) params.set("cursor", nextCursor);
      const res = await fetch(`/api/hq/history?${params.toString()}`);
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error || "Failed to load farm history.");
      }
      return (await res.json()) as { items: HistoryItem[]; nextCursor: string | null };
    },
    [farmId, from, to, kinds]
  );

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    setItems([]);
    setCursor(null);
    load(null, false)
      .then((data) => {
        if (!live) return;
        setItems(data.items);
        setCursor(data.nextCursor);
      })
      .catch((err: Error) => {
        if (live) setError(err.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [load]);

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
    try {
      const data = await load(cursor, true);
      setItems((prev) => [...prev, ...data.items]);
      setCursor(data.nextCursor);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load more history.");
    } finally {
      setLoadingMore(false);
    }
  }

  if (loading) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>Loading farm history…</p>
      </div>
    );
  }

  if (error && items.length === 0) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--danger)", margin: "0 0 4px" }}>History unavailable</p>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">No history in this range</p>
        <p className="empty-state-desc">No tasks, incidents, harvests, checks, attendance, musters, or record updates fall inside the selected dates.</p>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <p className="muted" style={{ fontSize: 11, margin: "0 0 8px" }}>Read-only feed over existing farm records. History is never edited here.</p>
      <div className="milestones-timeline">
        {items.map((item, idx) => (
          <div className="milestone-item" key={`${item.date}-${idx}`}>
            <div className="milestone-track">
              <span className="milestone-marker" />
              {idx < items.length - 1 && <span className="milestone-line" />}
            </div>
            <div className="milestone-content" style={{ paddingBottom: 4 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <span className={`badge ${KIND_BADGE[item.kind]}`} style={{ fontSize: 10 }}>{KIND_LABELS[item.kind]}</span>
                <span className="muted" style={{ fontSize: 11 }}>{formatDate(item.date)}</span>
              </div>
              <Link href={historyLink(farmId, item)} style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                {item.title}
              </Link>
              <p className="muted" style={{ fontSize: 11, margin: 0 }}>
                {item.actor ? `By ${item.actor}` : "System record"}{item.status ? ` • ${item.status.replace(/_/g, " ")}` : ""}
              </p>
            </div>
          </div>
        ))}
      </div>
      {error && <p style={{ fontSize: 12, color: "var(--danger)" }}>{error}</p>}
      {cursor && (
        <button type="button" onClick={loadMore} disabled={loadingMore} className="btn btn-secondary btn-sm" style={{ marginTop: 12, alignSelf: "center" }}>
          {loadingMore ? "Loading…" : "Load older entries"}
        </button>
      )}
    </div>
  );
}

/**
 * Officer lens: who worked on what in scope. Reused by Client 360 history and
 * analytics views. Aggregates only — nothing here can mutate records.
 */
export function OfficerLens({
  farmId,
  clientId,
  from,
  to,
}: {
  farmId?: string;
  clientId?: string;
  from?: string;
  to?: string;
}) {
  const [rows, setRows] = useState<OfficerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams();
    if (farmId) params.set("farmId", farmId);
    if (clientId) params.set("clientId", clientId);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    fetch(`/api/hq/history/officers?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Failed to load officer activity.");
        }
        return res.json() as Promise<{ officers: OfficerRow[] }>;
      })
      .then((data) => {
        if (live) setRows(data.officers);
      })
      .catch((err: Error) => {
        if (live) setError(err.message);
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [farmId, clientId, from, to]);

  if (loading) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>Loading officer activity…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="card" style={{ padding: 20 }}>
        <p style={{ fontSize: 13, fontWeight: 600, color: "var(--danger)", margin: "0 0 4px" }}>Officer lens unavailable</p>
        <p className="muted" style={{ fontSize: 12, margin: 0 }}>{error}</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="empty-state">
        <p className="empty-state-title">No officer activity in scope</p>
        <p className="empty-state-desc">Select a farm or client with recorded tasks, incidents, or attendance in the selected range.</p>
      </div>
    );
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Officer</th>
            <th>Tasks done</th>
            <th>Assigned</th>
            <th>Incidents</th>
            <th>Days present</th>
            <th>Checks</th>
            <th>Musters</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.officerId}>
              <td style={{ fontWeight: 600 }}>{r.name}</td>
              <td>{r.tasksCompleted}</td>
              <td>{r.tasksAssigned}</td>
              <td>{r.incidentsReported}</td>
              <td>{r.attendanceDays}{r.attendanceExceptions > 0 ? ` (${r.attendanceExceptions} exception)` : ""}</td>
              <td>{r.monitoringCount}</td>
              <td>{r.mustersRecorded}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
