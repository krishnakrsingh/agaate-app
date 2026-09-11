"use client";

import { useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

export interface TriageData {
  pendingExceptions: Array<{
    id: string;
    attendanceId: string;
    userName: string;
    userEmail: string;
    farmId: string;
    farmName: string;
    distanceMeters: number;
    reason: string;
    attendanceDate: string;
  }>;
  pendingLocations: Array<{
    id: string;
    farmId: string;
    farmName: string;
    farmLocation: string;
    requesterName: string;
    proposedLatitude: number;
    proposedLongitude: number;
    currentLatitude: number;
    currentLongitude: number;
    reason: string;
    createdAt: string;
  }>;
  flaggedBoundaries: Array<{
    id: string;
    entityType: "FARM" | "PLOT";
    entityId: string;
    entityName: string;
    farmId: string;
    farmName: string;
    source: string;
    measuredAcres: number | null;
    prevAcres: number | null;
    deltaPercent: number | null;
    actorName: string | null;
    createdAt: string;
  }>;
  criticalTasks: Array<{
    id: string;
    title: string;
    farmId: string;
    farmName: string;
    officerName: string;
    dueDate: string;
    priority: string;
    status: string;
  }>;
  openIncidents: Array<{
    id: string;
    type: string;
    description: string;
    severity: string | null;
    farmId: string;
    farmName: string;
    reporterName: string;
    createdAt: string;
  }>;
  stalledSetups: Array<{
    id: string;
    name: string;
    location: string;
    clientName: string;
    setupStage: string;
    setupProgress: number;
    daysInStage: number;
  }>;
}

type QueueKind = "EXCEPTION" | "LOCATION" | "BOUNDARY" | "TASK" | "INCIDENT" | "SETUP";
type QueueItem = {
  key: string;
  kind: QueueKind;
  severity: "P0" | "P1" | "P2";
  title: string;
  detail: string;
  farmName: string;
  farmId: string;
  href: string;
  ageLabel: string;
  ageDays: number;
  rawId: string;
};

function severityRank(s: QueueItem["severity"]) {
  return s === "P0" ? 0 : s === "P1" ? 1 : 2;
}

const CLAIM_KEY = "ops-claimed-v1";
const TAB_KEY = "ops-tab-v1";

function loadClaimed(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(CLAIM_KEY) || "{}");
  } catch {
    return {};
  }
}

export function OperationsTriageConsole({ data }: { data: TriageData }) {
  const toast = useToast();
  const [exceptions, setExceptions] = useState(data.pendingExceptions);
  const [locations, setLocations] = useState(data.pendingLocations);
  const [selectedExceptions, setSelectedExceptions] = useState<Set<string>>(new Set());
  const [selectedLocations, setSelectedLocations] = useState<Set<string>>(new Set());
  const [actingId, setActingId] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "ALL" | "EXCEPTIONS" | "LOCATIONS" | "BOUNDARIES" | "TASKS" | "SETUPS"
  >(() => {
    try {
      const t = localStorage.getItem(TAB_KEY);
      return (t as any) || "ALL";
    } catch {
      return "ALL";
    }
  });
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"severity" | "newest" | "oldest">("severity");
  const [mineOnly, setMineOnly] = useState(false);
  const [claimed, setClaimed] = useState<Record<string, string>>(() => {
    try {
      return loadClaimed();
    } catch {
      return {};
    }
  });

  const setTab = (t: typeof activeTab) => {
    setActiveTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch { /* noop */ }
  };

  const claim = (key: string) => {
    setClaimed((prev) => {
      const next = { ...prev, [key]: "me" };
      try {
        localStorage.setItem(CLAIM_KEY, JSON.stringify(next));
      } catch { /* noop */ }
      return next;
    });
  };
  const unclaim = (key: string) => {
    setClaimed((prev) => {
      const next = { ...prev };
      delete next[key];
      try {
        localStorage.setItem(CLAIM_KEY, JSON.stringify(next));
      } catch { /* noop */ }
      return next;
    });
  };

  const totalAttentionCount =
    exceptions.length +
    locations.length +
    data.flaggedBoundaries.length +
    data.criticalTasks.length +
    data.openIncidents.length +
    data.stalledSetups.length;

  const nowMs = Date.now();
  const daysSince = (iso: string) => {
    const t = new Date(iso).getTime();
    if (isNaN(t)) return 0;
    return Math.max(0, Math.floor((nowMs - t) / 86400000));
  };

  // Unified inbox: one sortable, searchable queue across all 6 sources.
  const queue: QueueItem[] = [
    ...exceptions.map((ex): QueueItem => ({
      key: `ex:${ex.id}`,
      kind: "EXCEPTION",
      severity: ex.distanceMeters > 500 ? "P0" : ex.distanceMeters > 150 ? "P1" : "P2",
      title: `${ex.userName} — +${Math.round(ex.distanceMeters)}m outside fence`,
      detail: ex.reason || "No reason given",
      farmName: ex.farmName,
      farmId: ex.farmId,
      href: `/farms/${ex.farmId}`,
      ageLabel: ex.attendanceDate,
      ageDays: daysSince(ex.attendanceDate),
      rawId: ex.id,
    })),
    ...locations.map((loc): QueueItem => ({
      key: `loc:${loc.id}`,
      kind: "LOCATION",
      severity: "P1",
      title: `${loc.farmName} — centerpoint move requested`,
      detail: loc.reason || "No reason given",
      farmName: loc.farmName,
      farmId: loc.farmId,
      href: `/farms/${loc.farmId}`,
      ageLabel: new Date(loc.createdAt).toLocaleDateString(),
      ageDays: daysSince(loc.createdAt),
      rawId: loc.id,
    })),
    ...data.openIncidents.map((inc): QueueItem => ({
      key: `inc:${inc.id}`,
      kind: "INCIDENT",
      severity: (inc.severity || "HIGH") === "CRITICAL" ? "P0" : "P0",
      title: `${inc.type} — ${inc.farmName}`,
      detail: inc.description?.slice(0, 120) || `Reported by ${inc.reporterName}`,
      farmName: inc.farmName,
      farmId: inc.farmId,
      href: `/farms/${inc.farmId}?tab=signals`,
      ageLabel: new Date(inc.createdAt).toLocaleDateString(),
      ageDays: daysSince(inc.createdAt),
      rawId: inc.id,
    })),
    ...data.stalledSetups.map((s): QueueItem => ({
      key: `setup:${s.id}`,
      kind: "SETUP",
      severity: s.daysInStage > 60 ? "P0" : "P1",
      title: `${s.name} — stalled ${s.daysInStage}d in ${s.setupStage.replaceAll("_", " ")}`,
      detail: `${s.clientName} • ${s.setupProgress}%`,
      farmName: s.name,
      farmId: s.id,
      href: `/farms/${s.id}`,
      ageLabel: `${s.daysInStage}d in stage`,
      ageDays: s.daysInStage,
      rawId: s.id,
    })),
    ...data.criticalTasks.map((t): QueueItem => ({
      key: `task:${t.id}`,
      kind: "TASK",
      severity: t.priority === "CRITICAL" || t.priority === "HIGH" ? "P0" : "P1",
      title: `${t.title} — overdue ${t.dueDate}`,
      detail: `${t.farmName} • ${t.officerName} • ${t.status}`,
      farmName: t.farmName,
      farmId: t.farmId,
      href: `/farms/${t.farmId}?tab=tasks`,
      ageLabel: t.dueDate,
      ageDays: daysSince(t.dueDate),
      rawId: t.id,
    })),
    ...data.flaggedBoundaries.map((b): QueueItem => ({
      key: `b:${b.id}`,
      kind: "BOUNDARY",
      severity: b.deltaPercent != null && Math.abs(b.deltaPercent) > 20 ? "P0" : "P2",
      title: `${b.entityName} — area ${b.prevAcres ?? "?"} → ${b.measuredAcres ?? "removed"} ac`,
      detail: `${b.farmName} • ${b.source.replaceAll("_", " ")} • ${b.actorName || "Officer"}`,
      farmName: b.farmName,
      farmId: b.farmId,
      href: `/farms/${b.farmId}?tab=boundaries`,
      ageLabel: new Date(b.createdAt).toLocaleDateString(),
      ageDays: daysSince(b.createdAt),
      rawId: b.id,
    })),
  ];

  const filteredQueue = queue
    .filter((q) => {
      if (mineOnly && !claimed[q.key]) return false;
      if (!query.trim()) return true;
      const s = `${q.title} ${q.detail} ${q.farmName} ${q.kind}`.toLowerCase();
      return s.includes(query.trim().toLowerCase());
    })
    .sort((a, b) => {
      if (sort === "severity")
        return severityRank(a.severity) - severityRank(b.severity) || b.ageDays - a.ageDays;
      if (sort === "newest") return a.ageDays - b.ageDays;
      return b.ageDays - a.ageDays;
    });

  async function handleReviewException(id: string, status: "APPROVED" | "REJECTED") {
    setActingId(id);
    try {
      const res = await fetch(`/api/attendance-exceptions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to process exception.");
      }
      setExceptions((prev) => prev.filter((x) => x.id !== id));
      setSelectedExceptions((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
      toast.success(`Exception marked ${status.toLowerCase()}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update exception.");
    } finally {
      setActingId(null);
    }
  }

  async function handleBulkExceptions(status: "APPROVED" | "REJECTED") {
    const ids = Array.from(selectedExceptions);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const res = await fetch("/api/attendance-exceptions/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ exceptionIds: ids, status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Bulk action failed.");
      }
      setExceptions((prev) => prev.filter((x) => !ids.includes(x.id)));
      setSelectedExceptions(new Set());
      toast.success(`${ids.length} exceptions marked ${status.toLowerCase()}.`);
    } catch (err: any) {
      toast.error(err.message || "Bulk operation failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleBulkLocations(status: "APPROVED" | "REJECTED") {
    const ids = Array.from(selectedLocations);
    if (ids.length === 0) return;
    setBulkBusy(true);
    try {
      const results = await Promise.all(
        ids.map((id) =>
          fetch(`/api/location-change-requests/${id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status }),
          })
        )
      );
      const failed = results.filter((r) => !r.ok).length;
      if (failed > 0) throw new Error(`${failed} location requests failed.`);
      setLocations((prev) => prev.filter((l) => !ids.includes(l.id)));
      setSelectedLocations(new Set());
      toast.success(`${ids.length} location requests ${status.toLowerCase()}.`);
    } catch (err: any) {
      toast.error(err.message || "Bulk operation failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleQueueBulk(status: "APPROVED" | "REJECTED") {
    // Unified bulk: exceptions go via bulk endpoint, locations via sequential PATCH.
    const exIds = filteredQueue.filter((q) => q.kind === "EXCEPTION" && selectedExceptions.has(q.rawId)).map((q) => q.rawId);
    const locIds = filteredQueue.filter((q) => q.kind === "LOCATION" && selectedLocations.has(q.rawId)).map((q) => q.rawId);
    if (exIds.length === 0 && locIds.length === 0) return;
    setBulkBusy(true);
    try {
      if (exIds.length > 0) {
        const res = await fetch("/api/attendance-exceptions/bulk", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ exceptionIds: exIds, status }),
        });
        if (!res.ok) throw new Error("Bulk exception action failed.");
        setExceptions((prev) => prev.filter((x) => !exIds.includes(x.id)));
        setSelectedExceptions(new Set());
      }
      if (locIds.length > 0) {
        await Promise.all(
          locIds.map((id) =>
            fetch(`/api/location-change-requests/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status }),
            }).then((r) => {
              if (!r.ok) throw new Error("Location bulk failed.");
            })
          )
        );
        setLocations((prev) => prev.filter((l) => !locIds.includes(l.id)));
        setSelectedLocations(new Set());
      }
      toast.success(`Bulk ${status.toLowerCase()}: ${exIds.length + locIds.length} items.`);
    } catch (err: any) {
      toast.error(err.message || "Bulk operation failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  async function handleReviewLocation(id: string, status: "APPROVED" | "REJECTED") {
    setActingId(id);
    try {
      const res = await fetch(`/api/location-change-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to review location request.");
      }
      setLocations((prev) => prev.filter((l) => l.id !== id));
      toast.success(`Location request ${status.toLowerCase()}.`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update location request.");
    } finally {
      setActingId(null);
    }
  }

  const toggleSelectException = (id: string) => {
    setSelectedExceptions((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllExceptions = () => {
    if (selectedExceptions.size === exceptions.length) {
      setSelectedExceptions(new Set());
    } else {
      setSelectedExceptions(new Set(exceptions.map((e) => e.id)));
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Operational Triage Summary Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "16px 20px",
          background: totalAttentionCount > 0 ? "var(--surface-card)" : "rgba(46,125,50,0.06)",
          border: totalAttentionCount > 0 ? "1px solid var(--hairline)" : "1px solid rgba(46,125,50,0.2)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <span
            style={{
              width: 10,
              height: 10,
              borderRadius: "50%",
              backgroundColor: totalAttentionCount > 0 ? "var(--amber)" : "var(--green)",
              display: "inline-block",
            }}
          />
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)" }}>
              {totalAttentionCount > 0
                ? `${totalAttentionCount} items require operational decision`
                : "All systems operational — Zero pending exceptions"}
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
              {totalAttentionCount > 0
                ? "Review off-site geofence clock-ins, location shifts, flagged boundaries, and overdue tasks."
                : "Field officers are inside fences, boundaries are verified, and onboarding SLAs are on track."}
            </div>
          </div>
        </div>

        {(selectedExceptions.size > 0 || selectedLocations.size > 0) && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 12, color: "var(--muted)" }}>
              {selectedExceptions.size + selectedLocations.size} selected
            </span>
            <button
              type="button"
              className="btn btn-green btn-sm"
              disabled={bulkBusy}
              onClick={() => {
                if (selectedExceptions.size > 0 && selectedLocations.size === 0)
                  handleBulkExceptions("APPROVED");
                else if (selectedLocations.size > 0 && selectedExceptions.size === 0)
                  handleBulkLocations("APPROVED");
                else handleQueueBulk("APPROVED");
              }}
            >
              <Icons.Check size={13} />
              <span>Approve Selected</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={bulkBusy}
              onClick={() => {
                if (selectedExceptions.size > 0 && selectedLocations.size === 0)
                  handleBulkExceptions("REJECTED");
                else if (selectedLocations.size > 0 && selectedExceptions.size === 0)
                  handleBulkLocations("REJECTED");
                else handleQueueBulk("REJECTED");
              }}
            >
              <Icons.X size={13} />
              <span>Reject Selected</span>
            </button>
          </div>
        )}
      </div>

      {/* 2. Segmented Triage Filter Tabs */}
      <div className="tabs-nav" style={{ margin: 0 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "ALL" ? "active" : ""}`}
          onClick={() => setTab("ALL")}
        >
          <span>Inbox</span>
          <span className="badge badge-stone" style={{ fontSize: 11, marginLeft: 6 }}>
            {totalAttentionCount}
          </span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "EXCEPTIONS" ? "active" : ""}`}
          onClick={() => setTab("EXCEPTIONS")}
        >
          <Icons.Navigation size={13} />
          <span>Geofence</span>
          {exceptions.length > 0 && (
            <span className="badge badge-amber" style={{ fontSize: 11, marginLeft: 6 }}>
              {exceptions.length}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "LOCATIONS" ? "active" : ""}`}
          onClick={() => setTab("LOCATIONS")}
        >
          <Icons.MapPin size={13} />
          <span>Locations</span>
          {locations.length > 0 && (
            <span className="badge badge-amber" style={{ fontSize: 11, marginLeft: 6 }}>
              {locations.length}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "BOUNDARIES" ? "active" : ""}`}
          onClick={() => setTab("BOUNDARIES")}
        >
          <Icons.Shield size={13} />
          <span>Boundaries</span>
          {data.flaggedBoundaries.length > 0 && (
            <span className="badge badge-amber" style={{ fontSize: 11, marginLeft: 6 }}>
              {data.flaggedBoundaries.length}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "TASKS" ? "active" : ""}`}
          onClick={() => setTab("TASKS")}
        >
          <Icons.ClipboardList size={13} />
          <span>Overdue</span>
          {(data.criticalTasks.length + data.openIncidents.length) > 0 && (
            <span className="badge badge-amber" style={{ fontSize: 11, marginLeft: 6 }}>
              {data.criticalTasks.length + data.openIncidents.length}
            </span>
          )}
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "SETUPS" ? "active" : ""}`}
          onClick={() => setTab("SETUPS")}
        >
          <Icons.Zap size={13} />
          <span>Stalled</span>
          {data.stalledSetups.length > 0 && (
            <span className="badge badge-amber" style={{ fontSize: 11, marginLeft: 6 }}>
              {data.stalledSetups.length}
            </span>
          )}
        </button>
      </div>

      {/* 2b. Unified inbox — only on ALL tab. Searchable, sortable, claimable. */}
      {activeTab === "ALL" && totalAttentionCount > 0 && (
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            padding: 16,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ position: "relative", flex: 1, minWidth: 220 }}>
              <input
                className="input-field"
                placeholder="Search inbox — officer, farm, reason…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                style={{ width: "100%", padding: "8px 12px 8px 32px", fontSize: 13 }}
              />
              <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
                <Icons.Search size={14} />
              </span>
            </div>
            <select
              className="input-field"
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              style={{ fontSize: 13, padding: "8px 10px" }}
              title="Sort queue"
            >
              <option value="severity">Sort: Severity first</option>
              <option value="newest">Sort: Newest first</option>
              <option value="oldest">Sort: Oldest / most overdue</option>
            </select>
            <button
              type="button"
              className={`btn btn-sm ${mineOnly ? "btn-primary" : "btn-secondary"}`}
              onClick={() => setMineOnly((v) => !v)}
              title="Show only items you claimed"
            >
              <span>{mineOnly ? "Mine only: on" : "Mine only"}</span>
            </button>
            <span className="muted" style={{ fontSize: 11 }}>
              Showing first {filteredQueue.length} of {queue.length} (server caps at 50/type — open a tab for the full list)
            </span>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 32 }}></th>
                  <th>Severity</th>
                  <th>Item</th>
                  <th>Farm</th>
                  <th>Age</th>
                  <th>Owner</th>
                  <th style={{ textAlign: "right" }}>Open</th>
                </tr>
              </thead>
              <tbody>
                {filteredQueue.map((q) => {
                  const isClaimed = !!claimed[q.key];
                  const checkable = q.kind === "EXCEPTION" || q.kind === "LOCATION";
                  const checked =
                    q.kind === "EXCEPTION"
                      ? selectedExceptions.has(q.rawId)
                      : q.kind === "LOCATION"
                        ? selectedLocations.has(q.rawId)
                        : false;
                  return (
                    <tr key={q.key}>
                      <td>
                        {checkable ? (
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={() => {
                              if (q.kind === "EXCEPTION") {
                                setSelectedExceptions((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(q.rawId)) next.delete(q.rawId);
                                  else next.add(q.rawId);
                                  return next;
                                });
                              } else {
                                setSelectedLocations((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(q.rawId)) next.delete(q.rawId);
                                  else next.add(q.rawId);
                                  return next;
                                });
                              }
                            }}
                          />
                        ) : (
                          <span className="muted" style={{ fontSize: 11 }}>—</span>
                        )}
                      </td>
                      <td>
                        <span
                          className={`badge ${q.severity === "P0" ? "badge-danger" : q.severity === "P1" ? "badge-amber" : "badge-stone"}`}
                          style={{ fontSize: 11, fontWeight: 700 }}
                        >
                          {q.severity}
                        </span>
                        <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>{q.kind}</div>
                      </td>
                      <td style={{ maxWidth: 340 }}>
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>{q.title}</div>
                        <div className="muted" style={{ fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 340 }}>{q.detail}</div>
                      </td>
                      <td>{q.farmName}</td>
                      <td className="muted" style={{ fontSize: 12, whiteSpace: "nowrap" }}>{q.ageLabel}</td>
                      <td>
                        {isClaimed ? (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => unclaim(q.key)} title="Release claim">
                            <span>Mine ✕</span>
                          </button>
                        ) : (
                          <button type="button" className="btn btn-secondary btn-sm" onClick={() => claim(q.key)} title="Claim for follow-up">
                            <span>Claim</span>
                          </button>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={q.href} className="btn btn-secondary btn-sm">
                          <span>Open</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {filteredQueue.length === 0 && (
              <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                No inbox items match “{query}”. Try clearing search or turning off Mine only.
              </div>
            )}
          </div>
        </section>
      )}

      {/* 3. Empty State When Calm */}
      {totalAttentionCount === 0 && (
        <div
          style={{
            padding: "64px 24px",
            textAlign: "center",
            background: "var(--surface)",
            border: "1px dashed var(--line)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              backgroundColor: "rgba(46,125,50,0.1)",
              color: "var(--green)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icons.CheckCircle size={24} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)" }}>
            Inbox Zero — Nothing Requires Administrative Review
          </div>
          <p className="muted" style={{ maxWidth: 460, margin: 0, fontSize: 13 }}>
            No officers clocked in outside authorized geofences, no abnormal geometry revisions, and all in-flight estate onboarding is within SLA thresholds.
          </p>
          <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
            <Link href="/farms" className="btn btn-secondary btn-sm">
              <Icons.Farm size={14} />
              <span>Explore Farm Portfolio</span>
            </Link>
            <Link href="/spatial" className="btn btn-secondary btn-sm">
              <Icons.Navigation size={14} />
              <span>Open Spatial Console</span>
            </Link>
          </div>
        </div>
      )}

      {/* 4. Triage Section 1: Attendance Geofence Violations */}
      {activeTab === "EXCEPTIONS" && exceptions.length > 0 && (
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Navigation size={16} color="var(--amber)" />
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                  Geofence Boundary Violations ({exceptions.length})
                </h2>
              </div>
              <p className="muted" style={{ fontSize: 12, margin: "3px 0 0" }}>
                Field officers who checked in beyond the authorized farm boundary radius.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={selectAllExceptions}
            >
              {selectedExceptions.size === exceptions.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}></th>
                  <th>Officer</th>
                  <th>Farm</th>
                  <th>Distance Outside Fence</th>
                  <th>Reason Given</th>
                  <th>Date</th>
                  <th style={{ textAlign: "right" }}>Decisions</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((ex) => (
                  <tr key={ex.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedExceptions.has(ex.id)}
                        onChange={() => toggleSelectException(ex.id)}
                      />
                    </td>
                    <td>
                      <div style={{ fontWeight: 600, color: "var(--ink)" }}>{ex.userName}</div>
                      <div className="muted" style={{ fontSize: 11 }}>{ex.userEmail}</div>
                    </td>
                    <td>
                      <Link href={`/farms/${ex.farmId}`} style={{ fontWeight: 500, color: "inherit" }}>
                        {ex.farmName}
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-amber" style={{ fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                        +{Math.round(ex.distanceMeters)}m
                      </span>
                    </td>
                    <td style={{ maxWidth: 280, color: "var(--ink-secondary)" }}>
                      {ex.reason}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {ex.attendanceDate}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-green btn-sm"
                          disabled={actingId === ex.id}
                          onClick={() => handleReviewException(ex.id, "APPROVED")}
                        >
                          <Icons.Check size={12} />
                          <span>Approve</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={actingId === ex.id}
                          onClick={() => handleReviewException(ex.id, "REJECTED")}
                        >
                          <Icons.X size={12} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. Triage Section 2: Farm Location Change Requests */}
      {activeTab === "LOCATIONS" && locations.length > 0 && (
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icons.MapPin size={16} color="var(--amber)" />
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                Farm Centerpoint Location Requests ({locations.length})
              </h2>
              <p className="muted" style={{ fontSize: 12, margin: "3px 0 0" }}>
                Requests submitted by site managers to relocate authoritative farm coordinates.
              </p>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Farm</th>
                  <th>Current Coordinates</th>
                  <th>Proposed Coordinates</th>
                  <th>Reason</th>
                  <th>Submitted</th>
                  <th style={{ textAlign: "right" }}>Decisions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td>
                      <Link href={`/farms/${loc.farmId}`} style={{ fontWeight: 600, color: "inherit" }}>
                        {loc.farmName}
                      </Link>
                      <div className="muted" style={{ fontSize: 11 }}>{loc.farmLocation}</div>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11 }}>
                      {loc.currentLatitude.toFixed(5)}, {loc.currentLongitude.toFixed(5)}
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11, color: "var(--amber)", fontWeight: 600 }}>
                      {loc.proposedLatitude.toFixed(5)}, {loc.proposedLongitude.toFixed(5)}
                    </td>
                    <td style={{ maxWidth: 260, color: "var(--ink-secondary)" }}>
                      {loc.reason}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {new Date(loc.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: 6 }}>
                        <button
                          type="button"
                          className="btn btn-green btn-sm"
                          disabled={actingId === loc.id}
                          onClick={() => handleReviewLocation(loc.id, "APPROVED")}
                        >
                          <Icons.Check size={12} />
                          <span>Approve Move</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={actingId === loc.id}
                          onClick={() => handleReviewLocation(loc.id, "REJECTED")}
                        >
                          <Icons.X size={12} />
                          <span>Reject</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 6. Triage Section 3: Flagged Geometry & Boundary Changes */}
      {activeTab === "BOUNDARIES" && data.flaggedBoundaries.length > 0 && (
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Shield size={16} color="var(--amber)" />
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                  Boundary Revisions Requiring Review ({data.flaggedBoundaries.length})
                </h2>
                <p className="muted" style={{ fontSize: 12, margin: "3px 0 0" }}>
                  Polygons whose measured acreage diverged from previous authoritative state beyond policy tolerance.
                </p>
              </div>
            </div>
            <Link href="/spatial" className="btn btn-secondary btn-sm">
              <Icons.Navigation size={13} />
              <span>Spatial Console</span>
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Entity</th>
                  <th>Farm Context</th>
                  <th>Source</th>
                  <th>Area Delta</th>
                  <th>Actor</th>
                  <th>Updated</th>
                  <th style={{ textAlign: "right" }}>Spatial Inspection</th>
                </tr>
              </thead>
              <tbody>
                {data.flaggedBoundaries.map((b) => (
                  <tr key={b.id}>
                    <td>
                      <span className="badge badge-stone" style={{ fontSize: 10, marginRight: 6 }}>
                        {b.entityType}
                      </span>
                      <strong>{b.entityName}</strong>
                    </td>
                    <td>
                      <Link href={`/farms/${b.farmId}`} style={{ color: "inherit" }}>
                        {b.farmName}
                      </Link>
                    </td>
                    <td>
                      <span className="badge badge-muted" style={{ fontSize: 11 }}>
                        {b.source.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                        {b.prevAcres != null ? `${b.prevAcres} → ` : ""}
                        {b.measuredAcres != null ? `${b.measuredAcres} ac` : "Removed"}
                        {b.deltaPercent != null && ` (${b.deltaPercent > 0 ? "+" : ""}${b.deltaPercent.toFixed(1)}%)`}
                      </span>
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {b.actorName || "Officer"}
                    </td>
                    <td className="muted" style={{ fontSize: 12 }}>
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link
                        href={`/farms/${b.farmId}?tab=boundaries`}
                        className="btn btn-secondary btn-sm"
                      >
                        <Icons.Maximize2 size={12} />
                        <span>Compare History</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 7. Triage Section 4: Critical Overdue Tasks & Open High Incidents */}
      {activeTab === "TASKS" &&
        (data.criticalTasks.length > 0 || data.openIncidents.length > 0) && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(420px, 1fr))", gap: 20 }}>
            {data.criticalTasks.length > 0 && (
              <section
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.ClipboardList size={16} color="var(--amber)" />
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                    Overdue Critical Tasks ({data.criticalTasks.length})
                  </h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.criticalTasks.map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--canvas)",
                        border: "1px solid var(--hairline)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{t.title}</div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          {t.farmName} &bull; Officer: <strong>{t.officerName}</strong> &bull; Due: {t.dueDate}
                        </div>
                      </div>
                      <Link href={`/farms/${t.farmId}?tab=tasks`} className="btn btn-secondary btn-sm">
                        <span>Inspect</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {data.openIncidents.length > 0 && (
              <section
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-lg)",
                  padding: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.AlertTriangle size={16} color="var(--amber)" />
                  <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                    High-Severity Incidents ({data.openIncidents.length})
                  </h2>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.openIncidents.map((inc) => (
                    <div
                      key={inc.id}
                      style={{
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        background: "var(--canvas)",
                        border: "1px solid var(--hairline)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="badge badge-danger" style={{ fontSize: 10 }}>
                            {inc.severity || "HIGH"}
                          </span>
                          <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{inc.type}</span>
                        </div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 3 }}>
                          {inc.farmName} &bull; Reported by {inc.reporterName}
                        </div>
                      </div>
                      <Link href={`/farms/${inc.farmId}?tab=signals`} className="btn btn-secondary btn-sm">
                        <span>Follow Up</span>
                      </Link>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>
        )}

      {/* 8. Triage Section 5: Stalled Setup Estates (>30d) */}
      {activeTab === "SETUPS" && data.stalledSetups.length > 0 && (
        <section
          style={{
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Zap size={16} color="var(--amber)" />
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                  Estates Stalled in Turnkey Setup ({data.stalledSetups.length})
                </h2>
                <p className="muted" style={{ fontSize: 12, margin: "3px 0 0" }}>
                  Farms that have stayed in their current onboarding stage longer than the 30-day SLA.
                </p>
              </div>
            </div>
            <Link href="/onboarding" className="btn btn-secondary btn-sm">
              <span>View Full Pipeline</span>
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Farm</th>
                  <th>Client</th>
                  <th>Stage</th>
                  <th>Days In Stage</th>
                  <th>Progress</th>
                  <th style={{ textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.stalledSetups.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <Link href={`/farms/${s.id}`} style={{ fontWeight: 600, color: "inherit" }}>
                        {s.name}
                      </Link>
                      <div className="muted" style={{ fontSize: 11 }}>{s.location}</div>
                    </td>
                    <td>{s.clientName}</td>
                    <td>
                      <span className="badge badge-stone" style={{ fontSize: 11 }}>
                        {s.setupStage.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td>
                      <span style={{ color: "var(--amber)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                        {s.daysInStage} days
                      </span>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div
                          style={{
                            width: 80,
                            height: 6,
                            borderRadius: 3,
                            background: "var(--line)",
                            overflow: "hidden",
                          }}
                        >
                          <div
                            style={{
                              width: `${s.setupProgress}%`,
                              height: "100%",
                              background: "var(--amber)",
                            }}
                          />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>
                          {s.setupProgress}%
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: "right" }}>
                      <Link href={`/farms/${s.id}`} className="btn btn-secondary btn-sm">
                        <span>Unblock Stage</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
