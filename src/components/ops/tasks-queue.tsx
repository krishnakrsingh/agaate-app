"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useServerList } from "@/components/data/use-server-list";
import { ServerTable } from "@/components/data/server-table";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { TaskForm } from "@/components/task-form";

type Task = {
  id: string;
  title: string;
  description: string;
  priority: string;
  category?: string;
  status: string;
  dueDate: string;
  farm: { id: string; name: string };
  plot: { name: string } | null;
  assignedOfficer: { name: string } | null;
};

type Summary = { queued: number; inProgress: number; blocked: number; completed7d: number; overdue: number };

const STATUS_OPTIONS = ["ALL", "QUEUED", "ASSIGNED", "AVAILABLE", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"];
const PRIORITY_OPTIONS = ["ALL", "LOW", "MEDIUM", "HIGH", "URGENT"];

/**
 * Scalable replacement for the old 7-day Kanban matrix that fetched the
 * first 100 tasks and filtered in memory. Model: summary + drill-down —
 * aggregate segments first (25k in Onboarding → show counts per segment),
 * then a server-paginated queue with faceted filters and bulk dispatch.
 */
export function TasksQueue() {
  const toast = useToast();
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [showPlan, setShowPlan] = useState(false);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [confirmBulk, setConfirmBulk] = useState<null | { action: "COMPLETED" | "IN_PROGRESS" | "CANCELLED" }>(null);

  const extraParams = useMemo(() => {
    const p: Record<string, string> = {};
    if (status !== "ALL") p.status = status;
    if (priority !== "ALL") p.priority = priority;
    return p;
  }, [status, priority]);

  const list = useServerList<Task>("/api/tasks", { initialLimit: 25, extraParams });
  const { selected, clearSelection } = list;

  // Segment counts are fetched as small bounded aggregates, not by scanning rows.
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const [q, p, b] = await Promise.all([
          fetch("/api/tasks?limit=1&offset=0&status=QUEUED").then((r) => Number(r.headers.get("X-Total-Count") || 0)),
          fetch("/api/tasks?limit=1&offset=0&status=IN_PROGRESS").then((r) => Number(r.headers.get("X-Total-Count") || 0)),
          fetch("/api/tasks?limit=1&offset=0&status=BLOCKED").then((r) => Number(r.headers.get("X-Total-Count") || 0)),
        ]);
        if (!cancelled) setSummary({ queued: q, inProgress: p, blocked: b, completed7d: 0, overdue: 0 });
      } catch {
        if (!cancelled) setSummary(null);
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function runBulk(newStatus: string) {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkBusy(true);
    try {
      const r = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskIds: ids, action: "STATUS", status: newStatus, expectedCount: ids.length }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? "Bulk update failed.");
      toast.success(`${body.updated} task(s) moved to ${newStatus}.`);
      setConfirmBulk(null);
      list.reload();
    } catch (e: any) {
      toast.error(e.message ?? "Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Level 1 — summary segments, then drill down */}
      <div className="compact-card" style={{ padding: 16, display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
        <div>
          <div className="eyebrow">WORK QUEUE — SUMMARY FIRST</div>
          <h2 className="section-title" style={{ fontSize: 20, margin: "4px 0 0" }}>Tasks queue</h2>
        </div>
        {[
          { label: "Queued", value: summary?.queued, filter: "QUEUED" },
          { label: "In progress", value: summary?.inProgress, filter: "IN_PROGRESS" },
          { label: "Blocked", value: summary?.blocked, filter: "BLOCKED" },
        ].map((s) => (
          <button
            key={s.label}
            type="button"
            onClick={() => setStatus(s.filter)}
            style={{
              background: status === s.filter ? "var(--green-light)" : "transparent",
              border: status === s.filter ? "1px solid var(--green-light)" : "1px solid var(--line)",
              borderRadius: 8, padding: "8px 14px", cursor: "pointer", textAlign: "left",
            }}
            title={`Drill into ${s.label}`}
          >
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 700 }}>{s.value == null ? "…" : s.value.toLocaleString()}</div>
          </button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button type="button" className="btn btn-green" onClick={() => setShowPlan(true)}>+ Plan activity</button>
        </div>
      </div>

      <ServerTable<Task>
        columns={[
          { key: "task", header: "Task", render: (t) => (
            <div style={{ minWidth: 220 }}>
              <div style={{ fontWeight: 650 }}>{t.title}</div>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.farm.name}{t.plot ? ` • ${t.plot.name}` : ""} • due {t.dueDate?.slice(0, 10)}</div>
            </div>
          ) },
          { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
          { key: "priority", header: "Priority", render: (t) => <PriorityBadge priority={t.priority} /> },
          { key: "assignee", header: "Assignee", render: (t) => <span style={{ fontSize: 12 }}>{t.assignedOfficer?.name ?? "Unassigned"}</span> },
          { key: "open", header: "", render: (t) => <Link href={`/tasks?highlight=${t.id}`} style={{ fontSize: 12 }}>Open</Link> },
        ]}
        rows={list.rows}
        total={list.total}
        page={list.page}
        limit={list.limit}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearch={list.setSearch}
        onPage={list.setPage}
        onLimit={list.setLimit}
        onRetry={list.reload}
        searchPlaceholder="Search title, description, farm… (server-side)"
        emptyTitle="No tasks match"
        emptyHint="Adjust status / priority filters or search. The queue only loads the current page — never the whole backlog."
        toolbar={
          <>
            <select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)} style={{ height: 36, fontSize: 12 }}>
              {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
            <select aria-label="Priority filter" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ height: 36, fontSize: 12 }}>
              {PRIORITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </>
        }
        bulkBar={
          selected.size > 0 ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 16px", background: "var(--amber-light)", borderBottom: "1px solid var(--amber-light)", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 12 }}>{selected.size} selected</strong>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Bulk moves are confirmed and permission-checked per farm.</span>
              {(["IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((s) => (
                <button key={s} type="button" className="btn btn-secondary" disabled={bulkBusy} onClick={() => setConfirmBulk({ action: s })} style={{ height: 30, fontSize: 12 }}>Mark {s}</button>
              ))}
              <button type="button" className="btn btn-secondary" onClick={clearSelection} style={{ height: 30, fontSize: 12 }}>Clear</button>
            </div>
          ) : undefined
        }
        selected={selected}
        onToggleSelect={list.toggleSelect}
        onTogglePage={list.toggleSelectPage}
      />

      {confirmBulk && (
        <div className="modal-overlay" onClick={() => setConfirmBulk(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 440, padding: 20 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>Move {selected.size} task(s) to {confirmBulk.action}?</h3>
            <p style={{ fontSize: 12, color: "var(--muted)" }}>Preview: {selected.size} selected on this page. Only rows you can manage will update; missing rows are reported, never silently skipped.</p>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setConfirmBulk(null)}>Cancel</button>
              <button type="button" className="btn btn-primary" disabled={bulkBusy} onClick={() => void runBulk(confirmBulk.action)}>{bulkBusy ? "Working…" : `Confirm (${selected.size})`}</button>
            </div>
          </div>
        </div>
      )}

      {showPlan && (
        <div className="modal-overlay" onClick={() => setShowPlan(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, padding: 24 }}>
            <TaskForm onSuccess={() => { setShowPlan(false); list.reload(); }} onCancel={() => setShowPlan(false)} />
          </div>
        </div>
      )}
    </section>
  );
}
