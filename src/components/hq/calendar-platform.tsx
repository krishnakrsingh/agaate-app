"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { HistoryTimeline, OfficerLens } from "@/components/hq/calendar-timeline";

export interface HqFarmOption {
  id: string;
  name: string;
  location: string;
  clientId: string | null;
  clientName: string | null;
}

export interface HqClientOption {
  id: string;
  name: string;
}

interface DayBucket {
  date: string;
  tasksDue: number;
  tasksDone: number;
  incidents: number;
  harvests: number;
  monitoring: number;
  musters: number;
  exceptions: number;
}

interface CalendarPayload {
  from: string;
  to: string;
  days: DayBucket[];
  totals: DayBucket;
}

type ViewMode = "month" | "week" | "day";

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toKey(y: number, m: number, d: number): string {
  return `${y}-${pad(m)}-${pad(d)}`;
}

function todayKey(): string {
  const d = new Date();
  return toKey(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m, d };
}

function addDays(key: string, n: number): string {
  const { y, m, d } = parseKey(key);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + n);
  return toKey(dt.getFullYear(), dt.getMonth() + 1, dt.getDate());
}

function monthRange(anchor: string, scoped: boolean): { from: string; to: string } {
  const { y, m } = parseKey(anchor);
  const first = toKey(y, m, 1);
  const lastDay = new Date(y, m, 0).getDate();
  const last = toKey(y, m, lastDay);
  // Platform-wide month fetches the exact month (<=31 days) so it stays
  // unscoped; scoped views add bleed to fill adjacent grid cells.
  if (!scoped) return { from: first, to: last };
  return { from: addDays(first, -7), to: addDays(last, 7) };
}

function weekRange(anchor: string): { from: string; to: string } {
  const { y, m, d } = parseKey(anchor);
  const dt = new Date(y, m - 1, d);
  const monday = new Date(dt);
  monday.setDate(dt.getDate() - ((dt.getDay() + 6) % 7));
  const from = toKey(monday.getFullYear(), monday.getMonth() + 1, monday.getDate());
  return { from, to: addDays(from, 6) };
}

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/**
 * Platform calendar: month / week / day views over tasks due, completions,
 * harvests, incidents, crop checks, musters, and attendance exceptions.
 * Every visible range is fetched bounded from /api/hq/history/calendar.
 */
export function HqCalendarPlatform({
  farms,
  clients,
  initialFarmId,
  initialClientId,
  initialAnchor,
  initialView,
  lockFarmId,
  hideHeader,
}: {
  farms: HqFarmOption[];
  clients: HqClientOption[];
  initialFarmId: string;
  initialClientId: string;
  initialAnchor: string;
  initialView: ViewMode;
  lockFarmId?: string;
  hideHeader?: boolean;
}) {
  const [view, setView] = useState<ViewMode>(initialView);
  const [anchor, setAnchor] = useState(initialAnchor);
  const [farmId, setFarmId] = useState(lockFarmId || initialFarmId);
  const [clientId, setClientId] = useState(initialClientId);
  const [selected, setSelected] = useState(initialAnchor);
  const [data, setData] = useState<CalendarPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const scoped = farmId !== "" || clientId !== "";
  const range = useMemo(() => {
    if (view === "day") return { from: anchor, to: anchor };
    if (view === "week") return weekRange(anchor);
    return monthRange(anchor, scoped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, anchor, scoped]);

  useEffect(() => {
    let live = true;
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ from: range.from, to: range.to });
    if (farmId) params.set("farmId", farmId);
    if (clientId) params.set("clientId", clientId);
    fetch(`/api/hq/history/calendar?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Failed to load platform calendar.");
        }
        return res.json() as Promise<CalendarPayload>;
      })
      .then((payload) => {
        if (live) setData(payload);
      })
      .catch((err: Error) => {
        if (live) {
          setError(err.message);
          setData(null);
        }
      })
      .finally(() => {
        if (live) setLoading(false);
      });
    return () => {
      live = false;
    };
  }, [range.from, range.to, farmId, clientId]);

  const buckets = useMemo(() => {
    const map = new Map<string, DayBucket>();
    for (const d of data?.days ?? []) map.set(d.date, d);
    return map;
  }, [data]);

  const cells = useMemo(() => {
    if (view === "day") return [{ dateStr: anchor, dayNumber: parseKey(anchor).d, inWindow: true }];
    if (view === "week") {
      const out = [];
      for (let i = 0; i < 7; i++) {
        const key = addDays(range.from, i);
        out.push({ dateStr: key, dayNumber: parseKey(key).d, inWindow: true });
      }
      return out;
    }
    // Month grid (Monday-first), bleed cells dimmed.
    const { y, m } = parseKey(anchor);
    const firstDow = (new Date(y, m - 1, 1).getDay() + 6) % 7;
    const daysInMonth = new Date(y, m, 0).getDate();
    const prevDays = new Date(y, m - 1, 0).getDate();
    const out = [];
    for (let i = firstDow - 1; i >= 0; i--) {
      const d = prevDays - i;
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      out.push({ dateStr: toKey(py, pm, d), dayNumber: d, inWindow: false });
    }
    for (let d = 1; d <= daysInMonth; d++) out.push({ dateStr: toKey(y, m, d), dayNumber: d, inWindow: true });
    const need = out.length > 35 ? 42 : 35;
    for (let d = 1; out.length < need; d++) {
      const nm = m === 12 ? 1 : m + 1;
      const ny = m === 12 ? y + 1 : y;
      out.push({ dateStr: toKey(ny, nm, d), dayNumber: d, inWindow: false });
    }
    return out;
  }, [view, anchor, range.from]);

  const today = todayKey();
  const selectedBucket = buckets.get(selected);
  const { y: ay, m: am } = parseKey(anchor);
  const title = view === "month" ? `${MONTH_NAMES[am - 1]} ${ay}` : view === "week" ? `Week of ${range.from}` : selected;

  function step(dir: 1 | -1) {
    if (view === "month") {
      const nm = am + dir;
      const ny = nm < 1 ? ay - 1 : nm > 12 ? ay + 1 : ay;
      const fixed = ((nm + 11) % 12) + 1;
      const key = toKey(ny, fixed, 1);
      setAnchor(key);
      setSelected(key);
    } else {
      const key = addDays(anchor, dir * (view === "week" ? 7 : 1));
      setAnchor(key);
      setSelected(key);
    }
  }

  function goToday() {
    const t = todayKey();
    setAnchor(t);
    setSelected(t);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {!hideHeader && (
        <div className="page-header" style={{ paddingBottom: 16 }}>
          <div>
            <span className="label">Platform history</span>
            <h1 style={{ margin: "4px 0 2px" }}>Operations Calendar</h1>
            <p className="muted" style={{ fontSize: 12, margin: 0 }}>
              Tasks, harvests, incidents, checks, musters, and attendance exceptions across estates.
              {loading ? " Syncing…" : ""}
            </p>
          </div>
          {!lockFarmId && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <label htmlFor="hq-client" style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Client:</label>
              <select id="hq-client" value={clientId} onChange={(e) => setClientId(e.target.value)} className="input-field" style={{ width: "auto", minHeight: 36, fontSize: 12 }}>
                <option value="">All clients</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
              <label htmlFor="hq-farm" style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Farm:</label>
              <select id="hq-farm" value={farmId} onChange={(e) => setFarmId(e.target.value)} className="input-field" style={{ width: "auto", minHeight: 36, fontSize: 12 }}>
                <option value="">All farms</option>
                {farms.filter((f) => !clientId || f.clientId === clientId).map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: "1px solid var(--hairline)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button type="button" onClick={() => step(-1)} className="btn btn-sm btn-secondary" aria-label="Previous period">‹</button>
          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", minWidth: 180, textAlign: "center" }}>{title}</span>
          <button type="button" onClick={() => step(1)} className="btn btn-sm btn-secondary" aria-label="Next period">›</button>
          <button type="button" onClick={goToday} className="btn btn-sm btn-secondary" style={{ fontSize: 11, color: "var(--green)", fontWeight: 700 }}>Today</button>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span className="muted" style={{ fontSize: 11 }}>Due • Done • Incident • Harvest • Muster • Exception</span>
          <div className="tabs-nav">
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button key={v} type="button" onClick={() => setView(v)} className={`tab-btn ${view === v ? "active" : ""}`} style={{ textTransform: "capitalize" }}>
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {error && (
        <div className="error-banner" role="alert">
          <span style={{ fontSize: 13 }}>{error}</span>
        </div>
      )}

      {data && !error && data.days.length === 0 && !loading && (
        <div className="empty-state">
          <p className="empty-state-title">Nothing scheduled in this range</p>
          <p className="empty-state-desc">No tasks, harvests, incidents, checks, musters, or exceptions fall inside {range.from} to {range.to}.</p>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, alignItems: "start" }}>
        <div style={{ gridColumn: "span 2", minWidth: 0 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 8, textAlign: "center" }}>
            {WEEKDAYS.map((wd) => (
              <div key={wd} style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)", padding: "4px 0" }}>{wd}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {cells.map((cell) => {
              const b = buckets.get(cell.dateStr);
              const isSelected = cell.dateStr === selected;
              const isToday = cell.dateStr === today;
              const total = b ? b.tasksDue + b.tasksDone + b.incidents + b.harvests + b.monitoring + b.musters + b.exceptions : 0;
              return (
                <button
                  key={cell.dateStr}
                  type="button"
                  onClick={() => { setSelected(cell.dateStr); setAnchor(cell.dateStr); }}
                  style={{
                    position: "relative", padding: 8, minHeight: view === "day" ? 160 : 96,
                    borderRadius: "var(--radius-xs)", textAlign: "left",
                    border: isSelected ? "1px solid var(--primary)" : "1px solid var(--line)",
                    backgroundColor: isSelected ? "var(--surface-strong)" : "var(--surface-card)",
                    cursor: "pointer", opacity: cell.inWindow ? 1 : 0.45,
                    display: "flex", flexDirection: "column", gap: 4,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: isToday || isSelected ? 800 : 600, color: "var(--ink)" }}>
                    {isToday ? `Today ${cell.dayNumber}` : cell.dayNumber}
                  </span>
                  {loading ? (
                    <span className="muted" style={{ fontSize: 10 }}>…</span>
                  ) : b && total > 0 ? (
                    <span style={{ display: "flex", flexDirection: "column", gap: 2, fontSize: 10, color: "var(--muted)" }}>
                      {b.tasksDue > 0 && <span>{b.tasksDue} due</span>}
                      {b.tasksDone > 0 && <span>{b.tasksDone} done</span>}
                      {b.incidents > 0 && <span>{b.incidents} incident</span>}
                      {b.harvests > 0 && <span>{b.harvests} harvest</span>}
                      {b.musters > 0 && <span>{b.musters} muster</span>}
                      {b.exceptions > 0 && <span>{b.exceptions} exception</span>}
                    </span>
                  ) : (
                    <span className="muted" style={{ fontSize: 10 }}>—</span>
                  )}
                </button>
              );
            })}
          </div>
          {data && (
            <p className="muted" style={{ fontSize: 11, marginTop: 8 }}>
              {range.from} to {range.to}: {data.totals.tasksDue} due, {data.totals.tasksDone} done, {data.totals.incidents} incidents, {data.totals.harvests} harvests, {data.totals.musters} musters, {data.totals.exceptions} exceptions.
            </p>
          )}
        </div>

        <div className="card" style={{ padding: 18 }}>
          <span className="label">Selected day</span>
          <h2 style={{ fontSize: 18, margin: "4px 0 2px" }}>{selected}</h2>
          {selectedBucket ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--ink)", marginBottom: 12 }}>
              <span>Tasks due: {selectedBucket.tasksDue}</span>
              <span>Tasks completed: {selectedBucket.tasksDone}</span>
              <span>Incidents: {selectedBucket.incidents}</span>
              <span>Harvests: {selectedBucket.harvests}</span>
              <span>Crop checks: {selectedBucket.monitoring}</span>
              <span>Crew musters: {selectedBucket.musters}</span>
              <span>Attendance exceptions: {selectedBucket.exceptions}</span>
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12 }}>No activity recorded on this day in scope.</p>
          )}
          {farmId ? (
            <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 12 }}>
              <HistoryTimeline farmId={farmId} from={selected} to={selected} />
              {!lockFarmId && (
                <Link href={`/hq/farms/${farmId}`} style={{ fontSize: 12, display: "inline-block", marginTop: 8 }}>
                  Open Farm 360
                </Link>
              )}
            </div>
          ) : (
            <p className="muted" style={{ fontSize: 12, borderTop: "1px solid var(--hairline)", paddingTop: 12, marginBottom: 0 }}>
              Select a farm to read the per-day history feed, or open a farm to view its history tab.
            </p>
          )}
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 16 }}>
        <span className="label">Officer lens</span>
        <h2 style={{ fontSize: 22, margin: "4px 0 2px" }}>Who worked on what</h2>
        <p className="muted" style={{ fontSize: 12, margin: "0 0 12px" }}>
          Tasks completed and assigned, incidents reported, and days present for the visible range
          ({range.from} to {range.to}). Same lens powers Client 360 history and analytics.
        </p>
        {scoped ? (
          <OfficerLens farmId={farmId || undefined} clientId={clientId || undefined} from={range.from} to={range.to} />
        ) : (
          <div className="empty-state">
            <p className="empty-state-title">Scope the officer lens</p>
            <p className="empty-state-desc">Select a farm or client above to see per-officer activity.</p>
          </div>
        )}
      </div>
    </div>
  );
}
