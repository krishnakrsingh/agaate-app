"use client";

import { useState, useEffect } from "react";
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
  >("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<"severity" | "newest" | "oldest">("severity");
  const [mineOnly, setMineOnly] = useState(false);
  const [claimed, setClaimed] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const t = localStorage.getItem(TAB_KEY);
      if (t) setActiveTab(t as any);
      const c = loadClaimed();
      if (c) setClaimed(c);
    } catch {
      // ignore
    }
  }, []);

  const setTab = (t: typeof activeTab) => {
    setActiveTab(t);
    try {
      localStorage.setItem(TAB_KEY, t);
    } catch {
      /* noop */
    }
  };

  const claim = (key: string) => {
    setClaimed((prev) => {
      const next = { ...prev, [key]: "me" };
      try {
        localStorage.setItem(CLAIM_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
      return next;
    });
  };

  const unclaim = (key: string) => {
    setClaimed((prev) => {
      const next = { ...prev };
      delete next[key];
      try {
        localStorage.setItem(CLAIM_KEY, JSON.stringify(next));
      } catch {
        /* noop */
      }
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
    ...exceptions.map(
      (ex): QueueItem => ({
        key: `ex:${ex.id}`,
        kind: "EXCEPTION",
        severity: ex.distanceMeters > 500 ? "P0" : ex.distanceMeters > 150 ? "P1" : "P2",
        title: `${ex.userName} — +${Math.round(ex.distanceMeters)}m outside fence`,
        detail: ex.reason || "No reason specified",
        farmName: ex.farmName,
        farmId: ex.farmId,
        href: `/farms/${ex.farmId}`,
        ageLabel: ex.attendanceDate,
        ageDays: daysSince(ex.attendanceDate),
        rawId: ex.id,
      })
    ),
    ...locations.map(
      (loc): QueueItem => ({
        key: `loc:${loc.id}`,
        kind: "LOCATION",
        severity: "P1",
        title: `${loc.farmName} — centerpoint relocate requested`,
        detail: loc.reason || "Field manager request",
        farmName: loc.farmName,
        farmId: loc.farmId,
        href: `/farms/${loc.farmId}`,
        ageLabel: new Date(loc.createdAt).toLocaleDateString("en-CA"),
        ageDays: daysSince(loc.createdAt),
        rawId: loc.id,
      })
    ),
    ...data.openIncidents.map(
      (inc): QueueItem => ({
        key: `inc:${inc.id}`,
        kind: "INCIDENT",
        severity: "P0",
        title: `${inc.type} — ${inc.farmName}`,
        detail: inc.description?.slice(0, 120) || `Reported by ${inc.reporterName}`,
        farmName: inc.farmName,
        farmId: inc.farmId,
        href: `/farms/${inc.farmId}?tab=signals`,
        ageLabel: new Date(inc.createdAt).toLocaleDateString("en-CA"),
        ageDays: daysSince(inc.createdAt),
        rawId: inc.id,
      })
    ),
    ...data.stalledSetups.map(
      (s): QueueItem => ({
        key: `setup:${s.id}`,
        kind: "SETUP",
        severity: s.daysInStage > 60 ? "P0" : "P1",
        title: `${s.name} — stalled ${s.daysInStage}d in ${s.setupStage.replaceAll("_", " ")}`,
        detail: `Client: ${s.clientName} • Progress: ${s.setupProgress}%`,
        farmName: s.name,
        farmId: s.id,
        href: `/farms/${s.id}`,
        ageLabel: `${s.daysInStage}d in stage`,
        ageDays: s.daysInStage,
        rawId: s.id,
      })
    ),
    ...data.criticalTasks.map(
      (t): QueueItem => ({
        key: `task:${t.id}`,
        kind: "TASK",
        severity: t.priority === "CRITICAL" || t.priority === "HIGH" ? "P0" : "P1",
        title: `${t.title} — overdue ${t.dueDate}`,
        detail: `Officer: ${t.officerName} • Status: ${t.status}`,
        farmName: t.farmName,
        farmId: t.farmId,
        href: `/farms/${t.farmId}?tab=tasks`,
        ageLabel: t.dueDate,
        ageDays: daysSince(t.dueDate),
        rawId: t.id,
      })
    ),
    ...data.flaggedBoundaries.map(
      (b): QueueItem => ({
        key: `b:${b.id}`,
        kind: "BOUNDARY",
        severity: b.deltaPercent != null && Math.abs(b.deltaPercent) > 20 ? "P0" : "P2",
        title: `${b.entityName} — geometry delta ${b.prevAcres ?? "?"} → ${b.measuredAcres ?? "removed"} ac`,
        detail: `Source: ${b.source.replaceAll("_", " ")} • Actor: ${b.actorName || "Officer"}`,
        farmName: b.farmName,
        farmId: b.farmId,
        href: `/farms/${b.farmId}?tab=boundaries`,
        ageLabel: new Date(b.createdAt).toLocaleDateString("en-CA"),
        ageDays: daysSince(b.createdAt),
        rawId: b.id,
      })
    ),
  ];

  const p0Count = queue.filter((q) => q.severity === "P0").length;

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

  const totalSelectedCount = selectedExceptions.size + selectedLocations.size;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* 1. Operational Triage Summary Metrics Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
        }}
      >
        {/* Total Attention */}
        <div
          onClick={() => setTab("ALL")}
          style={{
            cursor: "pointer",
            padding: "14px 16px",
            background: "var(--surface-card)",
            border: activeTab === "ALL" ? "1.5px solid var(--body-strong)" : "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            transition: "all 0.15s ease",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
              Total Queue
            </span>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: totalAttentionCount > 0 ? "var(--amber)" : "var(--green)",
              }}
            />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>{totalAttentionCount}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>
            {p0Count > 0 ? `${p0Count} P0 critical items` : "All systems operational"}
          </div>
        </div>

        {/* Geofence */}
        <div
          onClick={() => setTab("EXCEPTIONS")}
          style={{
            cursor: "pointer",
            padding: "14px 16px",
            background: "var(--surface-card)",
            border: activeTab === "EXCEPTIONS" ? "1.5px solid var(--body-strong)" : "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            transition: "all 0.15s ease",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
              Geofence
            </span>
            <Icons.Navigation size={14} style={{ color: exceptions.length > 0 ? "#f59e0b" : "var(--muted)" }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>{exceptions.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Off-site check-ins</div>
        </div>

        {/* Locations */}
        <div
          onClick={() => setTab("LOCATIONS")}
          style={{
            cursor: "pointer",
            padding: "14px 16px",
            background: "var(--surface-card)",
            border: activeTab === "LOCATIONS" ? "1.5px solid var(--body-strong)" : "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            transition: "all 0.15s ease",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
              Locations
            </span>
            <Icons.MapPin size={14} style={{ color: locations.length > 0 ? "#f59e0b" : "var(--muted)" }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>{locations.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Centerpoint moves</div>
        </div>

        {/* Overdue Tasks & Incidents */}
        <div
          onClick={() => setTab("TASKS")}
          style={{
            cursor: "pointer",
            padding: "14px 16px",
            background: "var(--surface-card)",
            border: activeTab === "TASKS" ? "1.5px solid var(--body-strong)" : "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            transition: "all 0.15s ease",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
              Overdue
            </span>
            <Icons.ClipboardList size={14} style={{ color: (data.criticalTasks.length + data.openIncidents.length) > 0 ? "var(--red)" : "var(--muted)" }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>
            {data.criticalTasks.length + data.openIncidents.length}
          </div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Critical tasks & incidents</div>
        </div>

        {/* Stalled Setups */}
        <div
          onClick={() => setTab("SETUPS")}
          style={{
            cursor: "pointer",
            padding: "14px 16px",
            background: "var(--surface-card)",
            border: activeTab === "SETUPS" ? "1.5px solid var(--body-strong)" : "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
            transition: "all 0.15s ease",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontSize: 11, fontWeight: 600, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
              Stalled
            </span>
            <Icons.Zap size={14} style={{ color: data.stalledSetups.length > 0 ? "var(--amber)" : "var(--muted)" }} />
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)" }}>{data.stalledSetups.length}</div>
          <div style={{ fontSize: 12, color: "var(--muted)" }}>Estates &gt; 30d SLA</div>
        </div>
      </div>

      {/* 2. Controls & Segmented Tab Navigation Bar */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg)",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        {/* Segmented Filter Pills */}
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 2 }}>
          <button
            type="button"
            className={`btn btn-sm ${activeTab === "ALL" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("ALL")}
            style={{ borderRadius: "var(--radius-pill)", gap: 6, fontWeight: 600 }}
          >
            <span>Inbox</span>
            <span style={{ fontSize: 11, opacity: 0.8, background: activeTab === "ALL" ? "rgba(255,255,255,0.2)" : "var(--surface-strong)", padding: "1px 6px", borderRadius: 10 }}>
              {totalAttentionCount}
            </span>
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === "EXCEPTIONS" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("EXCEPTIONS")}
            style={{ borderRadius: "var(--radius-pill)", gap: 6 }}
          >
            <Icons.Navigation size={13} />
            <span>Geofence</span>
            {exceptions.length > 0 && (
              <span style={{ fontSize: 11, background: "var(--amber)", color: "var(--white, #fff)", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                {exceptions.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === "LOCATIONS" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("LOCATIONS")}
            style={{ borderRadius: "var(--radius-pill)", gap: 6 }}
          >
            <Icons.MapPin size={13} />
            <span>Locations</span>
            {locations.length > 0 && (
              <span style={{ fontSize: 11, background: "var(--amber)", color: "var(--white, #fff)", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                {locations.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === "BOUNDARIES" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("BOUNDARIES")}
            style={{ borderRadius: "var(--radius-pill)", gap: 6 }}
          >
            <Icons.Shield size={13} />
            <span>Boundaries</span>
            {data.flaggedBoundaries.length > 0 && (
              <span style={{ fontSize: 11, background: "var(--surface-strong)", padding: "1px 6px", borderRadius: 10 }}>
                {data.flaggedBoundaries.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === "TASKS" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("TASKS")}
            style={{ borderRadius: "var(--radius-pill)", gap: 6 }}
          >
            <Icons.ClipboardList size={13} />
            <span>Overdue</span>
            {(data.criticalTasks.length + data.openIncidents.length) > 0 && (
              <span style={{ fontSize: 11, background: "var(--red)", color: "var(--white, #fff)", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                {data.criticalTasks.length + data.openIncidents.length}
              </span>
            )}
          </button>

          <button
            type="button"
            className={`btn btn-sm ${activeTab === "SETUPS" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => setTab("SETUPS")}
            style={{ borderRadius: "var(--radius-pill)", gap: 6 }}
          >
            <Icons.Zap size={13} />
            <span>Stalled</span>
            {data.stalledSetups.length > 0 && (
              <span style={{ fontSize: 11, background: "var(--amber)", color: "var(--white, #fff)", padding: "1px 6px", borderRadius: 10, fontWeight: 700 }}>
                {data.stalledSetups.length}
              </span>
            )}
          </button>
        </div>

        {/* Search, Filter, Sort & Bulk Action Toolbar */}
        {activeTab === "ALL" && totalAttentionCount > 0 && (
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", gap: 10, flex: 1, minWidth: 280, flexWrap: "wrap" }}>
              <div style={{ position: "relative", flex: 1, minWidth: 200 }}>
                <input
                  className="input-field"
                  placeholder="Search by officer, farm, or reason..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  style={{
                    width: "100%",
                    padding: "7px 12px 7px 34px",
                    fontSize: 13,
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--hairline)",
                    background: "var(--canvas-floor)",
                  }}
                />
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }}>
                  <Icons.Search size={14} />
                </span>
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}
                  >
                    <Icons.X size={13} />
                  </button>
                )}
              </div>

              <select
                className="input-field"
                value={sort}
                onChange={(e) => setSort(e.target.value as any)}
                style={{
                  fontSize: 13,
                  padding: "7px 12px",
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--hairline)",
                  background: "var(--canvas-floor)",
                  cursor: "pointer",
                }}
              >
                <option value="severity">Sort: Severity (High → Low)</option>
                <option value="newest">Sort: Newest First</option>
                <option value="oldest">Sort: Oldest / Most Overdue</option>
              </select>

              <button
                type="button"
                className={`btn btn-sm ${mineOnly ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setMineOnly((v) => !v)}
                style={{ borderRadius: "var(--radius-md)" }}
              >
                <Icons.User size={13} />
                <span>{mineOnly ? "Claimed Only" : "Mine Only"}</span>
              </button>
            </div>

            {/* Bulk Selection Banner */}
            {totalSelectedCount > 0 ? (
              <div style={{ display: "flex", alignItems: "center", gap: 8, background: "var(--surface-strong)", padding: "4px 10px", borderRadius: "var(--radius-pill)", border: "1px solid var(--hairline)" }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                  {totalSelectedCount} selected
                </span>
                <button
                  type="button"
                  className="btn btn-green btn-sm"
                  disabled={bulkBusy}
                  onClick={() => {
                    if (selectedExceptions.size > 0 && selectedLocations.size === 0) handleBulkExceptions("APPROVED");
                    else if (selectedLocations.size > 0 && selectedExceptions.size === 0) handleBulkLocations("APPROVED");
                    else handleQueueBulk("APPROVED");
                  }}
                  style={{ padding: "3px 10px", fontSize: 12 }}
                >
                  <Icons.Check size={12} />
                  <span>Approve</span>
                </button>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={bulkBusy}
                  onClick={() => {
                    if (selectedExceptions.size > 0 && selectedLocations.size === 0) handleBulkExceptions("REJECTED");
                    else if (selectedLocations.size > 0 && selectedExceptions.size === 0) handleBulkLocations("REJECTED");
                    else handleQueueBulk("REJECTED");
                  }}
                  style={{ padding: "3px 10px", fontSize: 12 }}
                >
                  <Icons.X size={12} />
                  <span>Reject</span>
                </button>
              </div>
            ) : (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Showing {filteredQueue.length} of {queue.length} items
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. Main Inbox Queue List (ALL Tab) */}
      {activeTab === "ALL" && totalAttentionCount > 0 && (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg)",
            overflow: "hidden",
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--canvas-floor)", borderBottom: "1px solid var(--hairline)" }}>
                  <th style={{ width: 36, padding: "10px 14px" }}></th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
                    Severity
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
                    Issue / Item Description
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
                    Estate
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "left", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
                    Age / SLA
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "center", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
                    Claim
                  </th>
                  <th style={{ padding: "10px 14px", textAlign: "right", fontWeight: 600, fontSize: 11, letterSpacing: "0.05em", color: "var(--muted)", textTransform: "uppercase" }}>
                    Action
                  </th>
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

                  const severityBadgeStyle =
                    q.severity === "P0"
                      ? { bg: "var(--red-light)", color: "var(--red)", border: "none" }
                      : q.severity === "P1"
                        ? { bg: "var(--amber-light)", color: "var(--amber)", border: "none" }
                        : { bg: "var(--surface-strong)", color: "var(--muted)", border: "var(--hairline)" };

                  return (
                    <tr
                      key={q.key}
                      style={{
                        borderBottom: "1px solid var(--hairline)",
                        transition: "background 0.12s ease",
                      }}
                    >
                      <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
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
                            style={{ cursor: "pointer" }}
                          />
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 11 }}>&bull;</span>
                        )}
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "2px 8px",
                              borderRadius: 4,
                              background: severityBadgeStyle.bg,
                              color: severityBadgeStyle.color,
                              border: `1px solid ${severityBadgeStyle.border}`,
                              display: "inline-block",
                              textAlign: "center",
                              width: "fit-content",
                            }}
                          >
                            {q.severity} CRITICAL
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)", letterSpacing: "0.04em" }}>
                            {q.kind}
                          </span>
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle", maxWidth: 420 }}>
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 13, lineHeight: 1.3 }}>
                          {q.title}
                        </div>
                        <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {q.detail}
                        </div>
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 12, color: "var(--body)" }}>
                          <Icons.Farm size={13} style={{ color: "var(--muted)" }} />
                          <span>{q.farmName}</span>
                        </span>
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 12, color: q.ageDays > 30 ? "#d97706" : "var(--muted)", fontWeight: q.ageDays > 30 ? 600 : 400 }}>
                          {q.ageLabel}
                        </span>
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle", textAlign: "center", whiteSpace: "nowrap" }}>
                        {isClaimed ? (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => unclaim(q.key)}
                            style={{ padding: "2px 8px", fontSize: 11, borderRadius: "var(--radius-pill)" }}
                            title="Release claim"
                          >
                            <span>Mine ✕</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => claim(q.key)}
                            style={{ padding: "2px 8px", fontSize: 11, borderRadius: "var(--radius-pill)" }}
                            title="Claim item for follow-up"
                          >
                            <span>Claim</span>
                          </button>
                        )}
                      </td>

                      <td style={{ padding: "12px 14px", verticalAlign: "middle", textAlign: "right", whiteSpace: "nowrap" }}>
                        <Link
                          href={q.href}
                          className="btn btn-secondary btn-sm"
                          style={{ padding: "3px 10px", fontSize: 12, borderRadius: "var(--radius-md)" }}
                        >
                          <span>Inspect &rarr;</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            {filteredQueue.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                No queue items match &ldquo;{query}&rdquo;. Try clearing search filters or toggling Mine Only.
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4. Empty State When All Systems Clear */}
      {totalAttentionCount === 0 && (
        <div
          style={{
            padding: "56px 24px",
            textAlign: "center",
            background: "var(--surface-card)",
            border: "1px dashed var(--hairline)",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              backgroundColor: "var(--green-light)",
              color: "var(--green)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <Icons.CheckCircle size={26} />
          </div>
          <div style={{ fontSize: 17, fontWeight: 700, color: "var(--ink)" }}>
            Inbox Zero &bull; Operational Queue Clear
          </div>
          <p style={{ maxWidth: 480, margin: 0, fontSize: 13, color: "var(--muted)", lineHeight: 1.5 }}>
            No field officers clocked in outside authorized geofences, all boundary revisions are verified, and onboarding SLAs across all estates are on schedule.
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

      {/* 5. Triage Tab 1: Attendance Geofence Violations */}
      {activeTab === "EXCEPTIONS" && exceptions.length > 0 && (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Navigation size={16} style={{ color: "#f59e0b" }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                  Geofence Boundary Violations ({exceptions.length})
                </h2>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "3px 0 0" }}>
                Field officers who checked in beyond authorized farm boundary radius.
              </p>
            </div>

            <button type="button" className="btn btn-secondary btn-sm" onClick={selectAllExceptions}>
              {selectedExceptions.size === exceptions.length ? "Deselect All" : "Select All"}
            </button>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--canvas-floor)", borderBottom: "1px solid var(--hairline)" }}>
                  <th style={{ width: 36, padding: "10px" }}></th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Officer</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Estate</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Distance Outside Fence</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Reason Specified</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Date</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Decision</th>
                </tr>
              </thead>
              <tbody>
                {exceptions.map((ex) => (
                  <tr key={ex.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "12px 10px" }}>
                      <input
                        type="checkbox"
                        checked={selectedExceptions.has(ex.id)}
                        onChange={() => toggleSelectException(ex.id)}
                      />
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <div style={{ fontWeight: 600, color: "var(--ink)" }}>{ex.userName}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{ex.userEmail}</div>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <Link href={`/farms/${ex.farmId}`} style={{ fontWeight: 500, color: "var(--ink)" }}>
                        {ex.farmName}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{ padding: "2px 8px", borderRadius: 4, background: "rgba(245, 158, 11, 0.12)", color: "#d97706", fontWeight: 700, fontSize: 12 }}>
                        +{Math.round(ex.distanceMeters)}m
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", maxWidth: 280, color: "var(--body)" }}>
                      {ex.reason}
                    </td>
                    <td style={{ padding: "12px 10px", color: "var(--muted)", fontSize: 12 }}>
                      {ex.attendanceDate}
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right" }}>
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
        </div>
      )}

      {/* 6. Triage Tab 2: Farm Location Change Requests */}
      {activeTab === "LOCATIONS" && locations.length > 0 && (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <Icons.MapPin size={16} style={{ color: "#f59e0b" }} />
            <div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                Farm Centerpoint Relocation Requests ({locations.length})
              </h2>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "3px 0 0" }}>
                Requests submitted by site managers to update authoritative coordinates.
              </p>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--canvas-floor)", borderBottom: "1px solid var(--hairline)" }}>
                  <th style={{ padding: "10px", textAlign: "left" }}>Estate</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Current Coordinates</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Proposed Coordinates</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Reason</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Submitted</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Decision</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "12px 10px" }}>
                      <Link href={`/farms/${loc.farmId}`} style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {loc.farmName}
                      </Link>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{loc.farmLocation}</div>
                    </td>
                    <td style={{ padding: "12px 10px", fontFamily: "var(--font-mono)", fontSize: 12 }}>
                      {loc.currentLatitude.toFixed(5)}, {loc.currentLongitude.toFixed(5)}
                    </td>
                    <td style={{ padding: "12px 10px", fontFamily: "var(--font-mono)", fontSize: 12, color: "#d97706", fontWeight: 600 }}>
                      {loc.proposedLatitude.toFixed(5)}, {loc.proposedLongitude.toFixed(5)}
                    </td>
                    <td style={{ padding: "12px 10px", maxWidth: 260, color: "var(--body)" }}>
                      {loc.reason}
                    </td>
                    <td style={{ padding: "12px 10px", color: "var(--muted)", fontSize: 12 }}>
                      {new Date(loc.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right" }}>
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
        </div>
      )}

      {/* 7. Triage Tab 3: Flagged Boundaries */}
      {activeTab === "BOUNDARIES" && data.flaggedBoundaries.length > 0 && (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Shield size={16} style={{ color: "#f59e0b" }} />
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                  Boundary Geometry Revisions ({data.flaggedBoundaries.length})
                </h2>
                <p style={{ fontSize: 13, color: "var(--muted)", margin: "3px 0 0" }}>
                  Polygons whose measured acreage diverged beyond policy tolerance thresholds.
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
                <tr style={{ background: "var(--canvas-floor)", borderBottom: "1px solid var(--hairline)" }}>
                  <th style={{ padding: "10px", textAlign: "left" }}>Entity</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Estate Context</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Source</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Area Delta</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Actor</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Updated</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Spatial Inspection</th>
                </tr>
              </thead>
              <tbody>
                {data.flaggedBoundaries.map((b) => (
                  <tr key={b.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "var(--surface-strong)", marginRight: 6, fontWeight: 600 }}>
                        {b.entityType}
                      </span>
                      <strong>{b.entityName}</strong>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <Link href={`/farms/${b.farmId}`} style={{ color: "var(--ink)" }}>
                        {b.farmName}
                      </Link>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 10, background: "var(--surface-strong)", color: "var(--muted)" }}>
                        {b.source.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{ fontWeight: 600, color: "#d97706", fontFamily: "var(--font-mono)" }}>
                        {b.prevAcres != null ? `${b.prevAcres} → ` : ""}
                        {b.measuredAcres != null ? `${b.measuredAcres} ac` : "Removed"}
                        {b.deltaPercent != null && ` (${b.deltaPercent > 0 ? "+" : ""}${b.deltaPercent.toFixed(1)}%)`}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px", color: "var(--muted)", fontSize: 12 }}>
                      {b.actorName || "Officer"}
                    </td>
                    <td style={{ padding: "12px 10px", color: "var(--muted)", fontSize: 12 }}>
                      {new Date(b.createdAt).toLocaleDateString()}
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right" }}>
                      <Link href={`/farms/${b.farmId}?tab=boundaries`} className="btn btn-secondary btn-sm">
                        <Icons.Maximize2 size={12} />
                        <span>Compare History</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 8. Triage Tab 4: Critical Overdue Tasks & Incidents */}
      {activeTab === "TASKS" && (data.criticalTasks.length > 0 || data.openIncidents.length > 0) && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 16 }}>
          {data.criticalTasks.length > 0 && (
            <div
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-lg)",
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.ClipboardList size={16} style={{ color: "var(--red)" }} />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                  Overdue Execution Tasks ({data.criticalTasks.length})
                </h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.criticalTasks.map((t) => (
                  <div
                    key={t.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--canvas-floor)",
                      border: "1px solid var(--hairline)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{t.title}</div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                        {t.farmName} &bull; Officer: <strong>{t.officerName}</strong> &bull; Due: {t.dueDate}
                      </div>
                    </div>
                    <Link href={`/farms/${t.farmId}?tab=tasks`} className="btn btn-secondary btn-sm">
                      <span>Inspect</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {data.openIncidents.length > 0 && (
            <div
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-lg)",
                padding: 18,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                boxShadow: "var(--shadow-sm)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.AlertTriangle size={16} style={{ color: "var(--red)" }} />
                <h2 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                  High-Severity Incidents ({data.openIncidents.length})
                </h2>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.openIncidents.map((inc) => (
                  <div
                    key={inc.id}
                    style={{
                      padding: "10px 12px",
                      borderRadius: "var(--radius-md)",
                      background: "var(--canvas-floor)",
                      border: "1px solid var(--hairline)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span style={{ fontSize: 10, padding: "1px 6px", borderRadius: 4, background: "var(--red-light)", color: "var(--red)", fontWeight: 700 }}>
                          {inc.severity || "HIGH"}
                        </span>
                        <span style={{ fontWeight: 600, fontSize: 13, color: "var(--ink)" }}>{inc.type}</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>
                        {inc.farmName} &bull; Reported by {inc.reporterName}
                      </div>
                    </div>
                    <Link href={`/farms/${inc.farmId}?tab=signals`} className="btn btn-secondary btn-sm">
                      <span>Follow Up</span>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 9. Triage Tab 5: Stalled Setup Estates (>30d) */}
      {activeTab === "SETUPS" && data.stalledSetups.length > 0 && (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg)",
            padding: 20,
            display: "flex",
            flexDirection: "column",
            gap: 16,
            boxShadow: "var(--shadow-sm)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Zap size={16} style={{ color: "#f59e0b" }} />
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                  Estates Stalled in Turnkey Onboarding ({data.stalledSetups.length})
                </h2>
              </div>
              <p style={{ fontSize: 13, color: "var(--muted)", margin: "3px 0 0" }}>
                Farms exceeding the 30-day onboarding stage SLA threshold.
              </p>
            </div>

            <Link href="/onboarding" className="btn btn-secondary btn-sm">
              <span>View Full Pipeline</span>
            </Link>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr style={{ background: "var(--canvas-floor)", borderBottom: "1px solid var(--hairline)" }}>
                  <th style={{ padding: "10px", textAlign: "left" }}>Estate</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Client</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Onboarding Stage</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Days in Stage</th>
                  <th style={{ padding: "10px", textAlign: "left" }}>Setup Progress</th>
                  <th style={{ padding: "10px", textAlign: "right" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {data.stalledSetups.map((s) => (
                  <tr key={s.id} style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "12px 10px" }}>
                      <Link href={`/farms/${s.id}`} style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {s.name}
                      </Link>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>{s.location}</div>
                    </td>
                    <td style={{ padding: "12px 10px" }}>{s.clientName}</td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: "var(--surface-strong)", fontWeight: 600 }}>
                        {s.setupStage.replaceAll("_", " ")}
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <span style={{ color: "#d97706", fontWeight: 700, fontFamily: "var(--font-mono)" }}>
                        {s.daysInStage} days
                      </span>
                    </td>
                    <td style={{ padding: "12px 10px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <div style={{ width: 80, height: 6, borderRadius: 3, background: "var(--hairline)", overflow: "hidden" }}>
                          <div style={{ width: `${s.setupProgress}%`, height: "100%", background: "#f59e0b" }} />
                        </div>
                        <span style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>{s.setupProgress}%</span>
                      </div>
                    </td>
                    <td style={{ padding: "12px 10px", textAlign: "right" }}>
                      <Link href={`/farms/${s.id}`} className="btn btn-secondary btn-sm">
                        <span>Unblock Stage</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
