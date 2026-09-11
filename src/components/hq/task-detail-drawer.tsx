"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "../icons";
import { StatusBadge, PriorityBadge } from "../ui/badge";
import { useToast } from "../ui/toast";
import { formatDateTime } from "@/lib/business";
import { useOfficerSearch, shortId, dueLabel, overdueDays, isOpenStatus } from "./tasks-lookups";

type DetailTask = {
  id: string;
  title: string;
  description: string;
  instructions: string | null;
  category: string;
  status: string;
  priority: string;
  dueDate: string;
  origin: string;
  createdAt: string;
  updatedAt: string;
  farmId: string;
  plotId: string | null;
  assignedOfficerId: string | null;
  farm: { id: string; name: string; client: { id: string; name: string; code: string | null } | null } | null;
  plot: { id: string; name: string } | null;
  assignedOfficer: { id: string; name: string } | null;
  executions: {
    id: string;
    status: string;
    startedAt: string | null;
    completedAt: string | null;
    remarks: string | null;
    officer: { id: string; name: string } | null;
  }[];
};

type HistoryEntry = {
  id: string;
  action: string;
  createdAt: string;
  actor: { name: string; email: string } | null;
  metadata: Record<string, unknown> | null;
};

// Assignment history: who was assigned when, reconstructed from the Task
// audit trail. CREATE and UPDATE entries that touch assignedOfficerId carry
// the from/to officer ids (newer entries also carry the name); older bulk
// assignments predate per-task audit and surface as the current assignee.
function assignmentText(h: HistoryEntry): string {
  const meta = h.metadata ?? {};
  if (h.action === "CREATE") {
    const name = typeof meta.assignedToName === "string" ? meta.assignedToName : null;
    return name ? `Created and assigned to ${name}` : "Created";
  }
  const from = typeof meta.assignedFrom === "string" ? shortId(meta.assignedFrom) : "unassigned";
  const toName = typeof meta.assignedToName === "string" ? meta.assignedToName : null;
  const to = toName ?? (typeof meta.assignedTo === "string" ? shortId(meta.assignedTo) : "unassigned");
  return `Assignment: ${from} → ${to}`;
}

export function TaskDetailDrawer({
  taskId,
  onClose,
  onChanged,
}: {
  taskId: string | null;
  onClose: () => void;
  onChanged: () => void;
}) {
  const toast = useToast();
  const [task, setTask] = useState<DetailTask | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [allowed, setAllowed] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [acting, setActing] = useState(false);
  const [pickedOfficer, setPickedOfficer] = useState<{ id: string; name: string } | null>(null);

  const load = useCallback(async (id: string, signal?: AbortSignal) => {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/hq/tasks/${id}`, { signal });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Unable to load task.");
      const b = await r.json();
      setTask(b.task);
      setHistory(Array.isArray(b.history) ? b.history : []);
      setAllowed(Array.isArray(b.allowedTransitions) ? b.allowedTransitions : []);
      setPickedOfficer(null);
    } catch (e: unknown) {
      if ((e as Error)?.name === "AbortError") return;
      setError(e instanceof Error ? e.message : "Unable to load task.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!taskId) {
      setTask(null);
      setHistory([]);
      setAllowed([]);
      setError("");
      return;
    }
    const ctrl = new AbortController();
    void load(taskId, ctrl.signal);
    return () => ctrl.abort();
  }, [taskId, load]);

  useEffect(() => {
    if (!taskId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [taskId, onClose]);

  async function mutate(body: Record<string, string | null>) {
    if (!task) return;
    setActing(true);
    try {
      const r = await fetch(`/api/hq/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const payload = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(payload.error ?? "Update failed.");
      toast.success("Task updated.");
      await load(task.id);
      onChanged();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Update failed.");
    } finally {
      setActing(false);
    }
  }

  if (!taskId) return null;

  return (
    <div className="modal-overlay" onClick={onClose} style={{ justifyContent: "flex-end" }}>
      <div
        className="modal-content"
        role="dialog"
        aria-label="Task detail"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 520, width: "100%", height: "100%", maxHeight: "100%", borderRadius: 0, overflowY: "auto", margin: 0 }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>TASK {shortId(taskId)}</div>
            <h3 style={{ margin: "2px 0 0", fontSize: 17 }}>{task?.title ?? "Loading…"}</h3>
          </div>
          <button type="button" className="btn btn-secondary" onClick={onClose} aria-label="Close task detail" style={{ marginLeft: "auto", height: 30, fontSize: 12 }}>
            <Icons.X size={14} />
          </button>
        </div>

        {loading && <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 16 }}>Loading task…</p>}
        {!loading && error && (
          <div style={{ marginTop: 16 }}>
            <p style={{ fontSize: 13, color: "var(--red)", fontWeight: 600 }}>{error}</p>
            <button type="button" className="btn btn-secondary" onClick={() => void load(taskId)} style={{ marginTop: 8, height: 30, fontSize: 12 }}>Retry</button>
          </div>
        )}

        {!loading && !error && task && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <StatusBadge status={task.status} />
              <PriorityBadge priority={task.priority} />
              <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{task.origin}</span>
            </div>

            <dl style={{ display: "grid", gridTemplateColumns: "110px 1fr", gap: "6px 12px", fontSize: 12, margin: 0 }}>
              <dt style={{ color: "var(--muted)" }}>Due</dt>
              <dd style={{ margin: 0 }}>
                {dueLabel(task.dueDate)}
                {(() => {
                  const d = overdueDays(task.dueDate);
                  return d != null && d > 0 && isOpenStatus(task.status) ? (
                    <span style={{ color: "var(--red)", fontWeight: 700 }}> • {d}d overdue</span>
                  ) : null;
                })()}
              </dd>
              <dt style={{ color: "var(--muted)" }}>Farm</dt>
              <dd style={{ margin: 0 }}>
                <Link href={`/farms/${task.farmId}?tab=tasks`}>{task.farm?.name ?? shortId(task.farmId)}</Link>
                {task.farm?.client && <span style={{ color: "var(--muted)" }}> • {task.farm.client.name}</span>}
              </dd>
              <dt style={{ color: "var(--muted)" }}>Plot</dt>
              <dd style={{ margin: 0 }}>{task.plot ? `${task.plot.name} (${shortId(task.plot.id)})` : "—"}</dd>
              <dt style={{ color: "var(--muted)" }}>Officer</dt>
              <dd style={{ margin: 0 }}>{task.assignedOfficer?.name ?? "Unassigned"}</dd>
              <dt style={{ color: "var(--muted)" }}>Category</dt>
              <dd style={{ margin: 0 }}>{task.category}</dd>
            </dl>

            <div>
              <div className="eyebrow" style={{ fontSize: 10, margin: "0 0 4px" }}>DESCRIPTION</div>
              <p style={{ fontSize: 13, margin: 0, whiteSpace: "pre-wrap" }}>{task.description}</p>
              {task.instructions && (
                <p style={{ fontSize: 12, color: "var(--muted)", margin: "8px 0 0", whiteSpace: "pre-wrap" }}>{task.instructions}</p>
              )}
            </div>

            <div>
              <div className="eyebrow" style={{ fontSize: 10, margin: "0 0 4px" }}>STATUS — ONLY VALID TRANSITIONS OFFERED</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {allowed.filter((s) => s !== "COMPLETED").map((s) => (
                  <button
                    key={s}
                    type="button"
                    className="btn btn-secondary"
                    disabled={acting}
                    onClick={() => void mutate({ status: s })}
                    style={{ height: 30, fontSize: 12 }}
                  >
                    Mark {s.replaceAll("_", " ")}
                  </button>
                ))}
                {allowed.length === 0 && <span style={{ fontSize: 12, color: "var(--muted)" }}>Terminal state — no further transitions.</span>}
              </div>
              <p style={{ fontSize: 11, color: "var(--muted)", margin: "6px 0 0" }}>
                Completion happens via the execution completion endpoint with field evidence — never from this drawer.
              </p>
            </div>

            <div>
              <div className="eyebrow" style={{ fontSize: 10, margin: "0 0 4px" }}>ASSIGN OFFICER</div>
              <AssignControl task={task} picked={pickedOfficer} setPicked={setPickedOfficer} acting={acting} onApply={(id) => void mutate({ assignedOfficerId: id })} />
            </div>

            <div>
              <div className="eyebrow" style={{ fontSize: 10, margin: "0 0 4px" }}>FIELD WORK — WHO WORKED ON IT</div>
              {task.executions.length === 0 && <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>No recorded field work yet.</p>}
              {task.executions.map((x) => (
                <div key={x.id} style={{ fontSize: 12, padding: "6px 0", borderBottom: "1px solid var(--line)" }}>
                  <strong>{x.officer?.name ?? "Unknown officer"}</strong>
                  <span style={{ color: "var(--muted)" }}> • {x.status.replaceAll("_", " ")}</span>
                  {x.startedAt && <span style={{ color: "var(--muted)" }}> • started {formatDateTime(x.startedAt)}</span>}
                  {x.completedAt && <span style={{ color: "var(--muted)" }}> • done {formatDateTime(x.completedAt)}</span>}
                  {x.remarks && <div style={{ color: "var(--muted)" }}>{x.remarks}</div>}
                </div>
              ))}
            </div>

            <div>
              <div className="eyebrow" style={{ fontSize: 10, margin: "0 0 4px" }}>ASSIGNMENT HISTORY — WHO WAS ASSIGNED WHEN</div>
              {(() => {
                const events = history.filter(
                  (h) => h.action === "CREATE" || (h.action === "UPDATE" && Array.isArray((h.metadata as { fields?: unknown } | null)?.fields) && ((h.metadata as { fields: string[] }).fields.includes("assignedOfficerId")))
                );
                if (!events.length) {
                  return (
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                      No per-task assignment audit yet
                      {task.assignedOfficer ? (
                        <> — currently <strong>{task.assignedOfficer.name}</strong> (assigned via bulk dispatch before per-task audit; use the control above to re-assign with full history).</>
                      ) : (
                        " — task is unassigned."
                      )}
                    </p>
                  );
                }
                return (
                  <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 6 }}>
                    {events.map((h) => (
                      <li key={h.id} style={{ fontSize: 12 }}>
                        <div>{assignmentText(h)}</div>
                        <div style={{ color: "var(--muted)", fontSize: 11 }}>
                          {h.actor?.name ?? "system"} • {formatDateTime(h.createdAt)}
                        </div>
                      </li>
                    ))}
                  </ul>
                );
              })()}
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <Link href={`/farms/${task.farmId}?tab=tasks`} className="btn btn-secondary" style={{ height: 32, fontSize: 12 }}>
                Open Farm 360 tasks tab
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AssignControl({
  task,
  picked,
  setPicked,
  acting,
  onApply,
}: {
  task: DetailTask;
  picked: { id: string; name: string } | null;
  setPicked: (o: { id: string; name: string } | null) => void;
  acting: boolean;
  onApply: (officerId: string | null) => void;
}) {
  const search = useOfficerSearch(task.farmId);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ fontSize: 12 }}>
        Current: <strong>{task.assignedOfficer?.name ?? "Unassigned"}</strong>
        {task.assignedOfficer && (
          <button
            type="button"
            className="btn btn-secondary"
            disabled={acting}
            onClick={() => onApply(null)}
            style={{ height: 28, fontSize: 12, marginLeft: 8 }}
          >
            Unassign
          </button>
        )}
      </div>
      {picked ? (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12 }}>
            Assign to <strong>{picked.name}</strong>
          </span>
          <button type="button" className="btn btn-primary" disabled={acting} onClick={() => onApply(picked.id)} style={{ height: 30, fontSize: 12 }}>
            {acting ? "Working…" : "Apply"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => setPicked(null)} style={{ height: 30, fontSize: 12 }}>
            Clear
          </button>
        </div>
      ) : (
        <div style={{ position: "relative" }}>
          <input
            type="search"
            className="input-field"
            aria-label="Search officers to assign"
            placeholder="Type officer name, email, phone… (min 2 chars)"
            value={search.query}
            onChange={(e) => search.setQuery(e.target.value)}
            style={{ height: 34, fontSize: 12 }}
          />
          {search.query.trim().length >= 2 && search.results.length > 0 && (
            <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
              {search.results.map((o) => (
                <li key={o.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setPicked({ id: o.id, name: o.name });
                      search.clear();
                    }}
                    style={{ display: "block", width: "100%", textAlign: "left", background: "var(--surface-card)", border: "none", padding: "8px 12px", cursor: "pointer", fontSize: 12 }}
                  >
                    <strong>{o.name}</strong>
                    {o.email && <span style={{ color: "var(--muted)" }}> • {o.email}</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
