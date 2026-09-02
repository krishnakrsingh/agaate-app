"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { FormEvent, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Icons } from "./icons";
import { StatusBadge, PriorityBadge } from "./ui/badge";
import { CardSkeleton } from "./ui/skeleton";
import { EmptyState } from "./ui/empty-state";
import { useToast } from "./ui/toast";
import { TaskForm } from "./task-form";

type Task = {
  id: string; title: string; description: string; instructions: string | null; priority: string;
  status: string; origin: string; dueDate: string; farm: { id: string; name: string };
  plot: { name: string } | null; cropCycle: { cropName: string } | null; assignedOfficer: { name: string } | null;
};

export function TaskBoard() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [dayFilter, setDayFilter] = useState<string>("ALL");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);

  const load = () => {
    setLoading(true);
    fetch("/api/tasks")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => { setTasks(data); setLoading(false); })
      .catch(() => { setError("Unable to load activities."); setLoading(false); });
  };

  useEffect(() => { void load(); }, []);

  const rollingDays = useMemo(() => {
    const days = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      days.push({
        dateStr: d.toISOString().slice(0, 10),
        weekday: i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" }),
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      });
    }
    return days;
  }, []);

  async function save(e: FormEvent<HTMLFormElement>, task: Task) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    try {
      const r = await fetch(`/api/tasks/${task.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: f.get("title"), description: f.get("description"), instructions: f.get("instructions") || null,
          priority: f.get("priority"), dueDate: f.get("dueDate"), status: f.get("status") || undefined,
        }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Update failed.");
      toast.success("Activity updated.");
      setEditingId(null);
      void load();
    } catch (err: any) {
      toast.error(err.message ?? "Error updating task.");
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchDay = dayFilter === "ALL" || t.dueDate?.slice(0, 10) === dayFilter;
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) || t.farm.name.toLowerCase().includes(search.toLowerCase());
      return matchStatus && matchDay && matchSearch;
    });
  }, [tasks, statusFilter, dayFilter, search]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 7-DAY ROLLING MATRIX */}
      <div className="compact-card" style={{ padding: 20, gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>7-DAY ROLLING AGRONOMY MATRIX</span>
          </div>
          <button
            type="button"
            className={`tab-btn ${dayFilter === "ALL" ? "active" : ""}`}
            onClick={() => setDayFilter("ALL")}
            style={{ fontSize: "11px", height: 28, padding: "4px 10px" }}
          >
            Show Full 7 Days ({tasks.length})
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))", gap: 8 }}>
          {rollingDays.map((d) => {
            const count = tasks.filter((t) => t.dueDate?.slice(0, 10) === d.dateStr).length;
            const isSelected = dayFilter === d.dateStr;
            return (
              <div
                key={d.dateStr}
                onClick={() => setDayFilter(isSelected ? "ALL" : d.dateStr)}
                style={{
                  padding: "10px 12px",
                  borderRadius: "var(--radius-xs)",
                  cursor: "pointer",
                  textAlign: "center",
                  backgroundColor: isSelected ? "var(--ink)" : "var(--stone)",
                  color: isSelected ? "var(--on-dark)" : "var(--ink)",
                  border: `1px solid ${isSelected ? "var(--ink)" : "var(--line)"}`,
                  transition: "all 0.12s ease",
                }}
              >
                <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 600, textTransform: "uppercase" }}>{d.weekday}</div>
                <div style={{ fontSize: "12px", opacity: 0.85, marginTop: 2 }}>{d.label}</div>
                <div className="data" style={{ fontSize: "18px", fontWeight: 600, marginTop: 4 }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <input
            type="text"
            placeholder="Search activities &amp; estates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 240, minHeight: 38, padding: "8px 12px" }}
          />
          <div className="tabs-nav">
            {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map((st) => (
              <button
                key={st}
                type="button"
                className={`tab-btn ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === "ALL" ? "All Statuses" : st.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-green btn-sm" onClick={() => setShowPlanModal(true)}>
          <Icons.Plus size={14} />
          <span>Plan Agronomy Activity</span>
        </button>
      </div>

      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640 }}>
            <TaskForm onSuccess={() => { setShowPlanModal(false); load(); }} onCancel={() => setShowPlanModal(false)} />
          </div>
        </div>
      )}

      {loading && <CardSkeleton />}

      {/* OPERATIONAL TASK TABLE / LIST */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {filteredTasks.map((t) => (
          <article
            key={t.id}
            className="data-row"
            style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: 10, padding: "16px 20px" }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span className="item-title">{t.title}</span>
                  <StatusBadge status={t.status} />
                  <PriorityBadge priority={t.priority} />
                </div>
                <div className="muted" style={{ fontSize: "13px" }}>
                  {t.farm.name} {t.plot ? `&bull; Plot: ${t.plot.name}` : ""} {t.cropCycle ? `&bull; 🌱 ${t.cropCycle.cropName}` : ""}
                </div>
              </div>

              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                >
                  <Icons.Edit size={13} />
                  <span>{editingId === t.id ? "Close" : "Edit"}</span>
                </button>
              </div>
            </div>

            {t.description && <p style={{ margin: 0, fontSize: "14px", color: "var(--ink)" }}>{t.description}</p>}

            {t.instructions && (
              <div className="callout" style={{ padding: "10px 14px", fontSize: "13px" }}>
                <span className="mono-label" style={{ color: "var(--green-dark)" }}>Agronomist Prescription:</span>
                <span style={{ color: "var(--ink)" }}>{t.instructions}</span>
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "12px", color: "var(--muted)", borderTop: "1px solid var(--line)", paddingTop: 10, marginTop: 4 }}>
              <span>Assignee: <strong style={{ color: "var(--ink)" }}>{t.assignedOfficer?.name ?? "Unassigned"}</strong></span>
              <span className="data">Due: {new Date(t.dueDate).toLocaleDateString()}</span>
            </div>

            {editingId === t.id && (
              <form onSubmit={(e) => save(e, t)} style={{ background: "var(--stone)", padding: 16, border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", display: "grid", gap: 12, marginTop: 8 }}>
                <div className="two-column">
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Title</label>
                    <input name="title" defaultValue={t.title} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Due Date</label>
                    <input name="dueDate" type="date" defaultValue={t.dueDate?.slice(0, 10)} required />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Priority</label>
                    <select name="priority" defaultValue={t.priority}>
                      <option value="LOW">Low</option>
                      <option value="MEDIUM">Medium</option>
                      <option value="HIGH">High</option>
                      <option value="URGENT">Urgent</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Status</label>
                    <select name="status" defaultValue={t.status}>
                      <option value="PENDING">Pending</option>
                      <option value="IN_PROGRESS">In Progress</option>
                      <option value="COMPLETED">Completed</option>
                    </select>
                  </div>
                  <div className="form-group wide" style={{ margin: 0 }}>
                    <label>Instructions / Guidance</label>
                    <textarea name="instructions" defaultValue={t.instructions || ""} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm">Save Changes</button>
                </div>
              </form>
            )}
          </article>
        ))}

        {!filteredTasks.length && !loading && (
          <EmptyState
            icon={<Icons.Calendar size={24} />}
            title="No scheduled activities found"
            description="No agronomy work orders match the selected date or status filters."
            action={
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowPlanModal(true)}>
                <Icons.Plus size={14} />
                <span>Plan Activity</span>
              </button>
            }
          />
        )}
      </div>
    </section>
  );
}
