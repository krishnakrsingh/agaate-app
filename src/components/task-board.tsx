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
    <section style={{ display: "grid", gap: 18 }}>
      {/* 7-DAY ROLLING MATRIX */}
      <div className="card" style={{ padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div className="eyebrow"><span className="eyebrow-dot" />7-DAY ROLLING AGRONOMY MATRIX</div>
          <button type="button" className={`tab-btn ${dayFilter === "ALL" ? "active" : ""}`} onClick={() => setDayFilter("ALL")} style={{ fontSize: "0.78rem" }}>
            Show Full 7 Days ({tasks.length})
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 8 }}>
          {rollingDays.map((d) => {
            const count = tasks.filter((t) => t.dueDate?.slice(0, 10) === d.dateStr).length;
            const isSelected = dayFilter === d.dateStr;
            return (
              <div
                key={d.dateStr}
                onClick={() => setDayFilter(isSelected ? "ALL" : d.dateStr)}
                style={{
                  padding: 10, borderRadius: "var(--radius-sm)", cursor: "pointer", textAlign: "center",
                  background: isSelected ? "var(--primary)" : "var(--card-muted)", color: isSelected ? "var(--on-primary)" : "var(--text-main)",
                  border: `1px solid ${isSelected ? "var(--primary)" : "var(--border)"}`,
                }}
              >
                <div style={{ fontSize: "0.75rem", fontWeight: 700 }}>{d.weekday}</div>
                <div style={{ fontSize: "0.85rem", opacity: 0.9 }}>{d.label}</div>
                <div style={{ fontSize: "1.1rem", fontWeight: 800, marginTop: 4 }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input type="text" placeholder="Search tasks…" value={search} onChange={(e) => setSearch(e.target.value)} style={{ width: 220 }} />
          <div className="tabs-nav" style={{ margin: 0 }}>
            {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map((st) => (
              <button key={st} type="button" className={`tab-btn ${statusFilter === st ? "active" : ""}`} onClick={() => setStatusFilter(st)}>
                {st === "ALL" ? "All Statuses" : st.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowPlanModal(true)}>
          <Icons.Plus size={15} /><span>Plan Agronomy Activity</span>
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

      {/* TASK LIST */}
      <div style={{ display: "grid", gap: 10 }}>
        {filteredTasks.map((t) => (
          <article key={t.id} className="card" style={{ padding: 16, display: "grid", gap: 8 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
              <div>
                <strong style={{ fontSize: "1rem" }}>{t.title}</strong>
                <div className="muted" style={{ fontSize: "0.82rem" }}>{t.farm.name} {t.plot ? `&bull; ${t.plot.name}` : ""} {t.cropCycle ? `&bull; 🌱 ${t.cropCycle.cropName}` : ""}</div>
              </div>
              <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                <StatusBadge status={t.status} />
                <PriorityBadge priority={t.priority} />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditingId(editingId === t.id ? null : t.id)}><Icons.Edit size={14} /></button>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: "0.88rem" }}>{t.description}</p>
            {t.instructions && (
              <div style={{ padding: "8px 12px", background: "var(--card-muted)", borderRadius: "var(--radius-xs)", fontSize: "0.82rem" }}>
                <span className="mono-label" style={{ color: "var(--primary)" }}>Agronomist Guidance:</span> {t.instructions}
              </div>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "0.78rem", color: "var(--text-muted)", borderTop: "1px solid var(--border)", paddingTop: 8 }}>
              <span>Assigned: <strong>{t.assignedOfficer?.name ?? "Unassigned"}</strong></span>
              <span>Due: {new Date(t.dueDate).toLocaleDateString()}</span>
            </div>

            {editingId === t.id && (
              <form onSubmit={(e) => save(e, t)} style={{ background: "var(--card-muted)", padding: 14, borderRadius: "var(--radius-sm)", display: "grid", gap: 10, marginTop: 6 }}>
                <div className="two-column">
                  <div className="form-group" style={{ margin: 0 }}><label>Title</label><input name="title" defaultValue={t.title} required /></div>
                  <div className="form-group" style={{ margin: 0 }}><label>Due Date</label><input name="dueDate" type="date" defaultValue={t.dueDate?.slice(0, 10)} required /></div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Priority</label>
                    <select name="priority" defaultValue={t.priority}><option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option><option value="URGENT">Urgent</option></select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Status</label>
                    <select name="status" defaultValue={t.status}><option value="PENDING">Pending</option><option value="IN_PROGRESS">In Progress</option><option value="COMPLETED">Completed</option></select>
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => setEditingId(null)}>Cancel</button>
                  <button type="submit" className="btn btn-primary btn-sm">Save</button>
                </div>
              </form>
            )}
          </article>
        ))}

        {!filteredTasks.length && !loading && (
          <EmptyState icon={<Icons.Calendar size={28} />} title="No activities found" description="No scheduled activities match the selected day and filters." />
        )}
      </div>
    </section>
  );
}
