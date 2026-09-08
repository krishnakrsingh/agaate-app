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
      <div
        className="compact-card"
        style={{
          padding: 24,
          gap: 16,
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-card)",
          backgroundColor: "var(--canvas)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--green)" }}>
              <span className="eyebrow-dot" style={{ backgroundColor: "var(--green)" }} />
              <span>7-DAY ROLLING AGRONOMY MATRIX</span>
            </div>
            <h2 className="section-title" style={{ fontSize: "20px", marginTop: 4 }}>
              Rolling Operations Timeline
            </h2>
          </div>
          <button
            type="button"
            className={`btn btn-secondary ${dayFilter === "ALL" ? "btn-primary" : ""}`}
            onClick={() => setDayFilter("ALL")}
            style={{ fontSize: "12px", borderRadius: "var(--radius-pill)", padding: "6px 14px" }}
          >
            Show Full 7 Days ({tasks.length})
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
          {rollingDays.map((d) => {
            const count = tasks.filter((t) => t.dueDate?.slice(0, 10) === d.dateStr).length;
            const isSelected = dayFilter === d.dateStr;
            return (
              <div
                key={d.dateStr}
                onClick={() => setDayFilter(isSelected ? "ALL" : d.dateStr)}
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  cursor: "pointer",
                  textAlign: "center",
                  backgroundColor: isSelected ? "var(--green)" : "var(--stone)",
                  color: isSelected ? "#FFFFFF" : "var(--ink)",
                  boxShadow: isSelected ? "var(--shadow-md)" : "none",
                  transition: "all 0.18s ease",
                  display: "flex",
                  flexDirection: "column",
                  gap: 3,
                }}
              >
                <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", fontWeight: 700, textTransform: "uppercase", opacity: isSelected ? 0.9 : 0.7 }}>
                  {d.weekday}
                </div>
                <div style={{ fontSize: "12px", opacity: isSelected ? 0.95 : 0.85 }}>{d.label}</div>
                <div style={{ fontSize: "20px", fontWeight: 700, marginTop: 4 }}>{count}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* FILTER & SEARCH BAR */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ position: "relative", width: 260 }}>
            <input
              type="text"
              className="input-field"
              placeholder="Search activities &amp; estates…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: 32, fontSize: 13, height: 38, borderRadius: "var(--radius-pill)" }}
            />
            <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}>
              <Icons.Search size={14} />
            </span>
          </div>

          <div className="tabs-nav" style={{ padding: 4, gap: 4 }}>
            {["ALL", "PENDING", "IN_PROGRESS", "COMPLETED"].map((st) => (
              <button
                key={st}
                type="button"
                className={`tab-btn ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
                style={{ padding: "6px 14px", fontSize: 12 }}
              >
                {st === "ALL" ? "All Statuses" : st.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <button
          type="button"
          className="btn btn-green"
          onClick={() => setShowPlanModal(true)}
          style={{ borderRadius: "var(--radius-pill)", padding: "8px 18px" }}
        >
          <Icons.Plus size={15} />
          <span>Plan Agronomy Activity</span>
        </button>
      </div>

      {showPlanModal && (
        <div className="modal-overlay" onClick={() => setShowPlanModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, borderRadius: "var(--radius-lg)", padding: 24 }}>
            <TaskForm onSuccess={() => { setShowPlanModal(false); load(); }} onCancel={() => setShowPlanModal(false)} />
          </div>
        </div>
      )}

      {loading && <CardSkeleton />}

      {/* OPERATIONAL TASK CARDS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filteredTasks.map((t) => (
          <article
            key={t.id}
            className="compact-card"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "stretch",
              gap: 14,
              padding: "22px 24px",
              borderRadius: "var(--radius-md)",
              boxShadow: "var(--shadow-card)",
              backgroundColor: "var(--canvas)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>{t.title}</span>
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
                  className="btn btn-secondary"
                  onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                  style={{ borderRadius: "var(--radius-pill)", padding: "5px 12px", fontSize: 12 }}
                >
                  <Icons.Edit size={13} />
                  <span>{editingId === t.id ? "Close" : "Edit"}</span>
                </button>
              </div>
            </div>

            {t.description && (
              <p style={{ margin: 0, fontSize: "14px", color: "var(--ink)", lineHeight: 1.5 }}>
                {t.description}
              </p>
            )}

            {t.instructions && (
              <div
                className="callout"
                style={{
                  padding: "12px 16px",
                  fontSize: "13px",
                  borderRadius: "var(--radius-sm)",
                }}
              >
                <span className="mono-label" style={{ color: "var(--green-dark)", fontWeight: 600 }}>
                  Agronomist Prescription:
                </span>
                <span style={{ color: "var(--ink)", marginTop: 2, display: "block" }}>{t.instructions}</span>
              </div>
            )}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: "12px",
                color: "var(--muted)",
                borderTop: "1px solid var(--line)",
                paddingTop: 12,
                marginTop: 4,
              }}
            >
              <span>Assignee: <strong style={{ color: "var(--ink)" }}>{t.assignedOfficer?.name ?? "Unassigned"}</strong></span>
              <span className="data">Due: {new Date(t.dueDate).toLocaleDateString()}</span>
            </div>

            {editingId === t.id && (
              <form
                onSubmit={(e) => save(e, t)}
                style={{
                  background: "var(--stone)",
                  padding: 18,
                  borderRadius: "var(--radius-sm)",
                  display: "grid",
                  gap: 12,
                  marginTop: 8,
                }}
              >
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
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setEditingId(null)}
                    style={{ borderRadius: "var(--radius-pill)" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    style={{ borderRadius: "var(--radius-pill)" }}
                  >
                    Save Changes
                  </button>
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
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowPlanModal(true)}
                style={{ borderRadius: "var(--radius-pill)" }}
              >
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
