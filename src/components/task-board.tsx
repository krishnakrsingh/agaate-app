"use client";
import { FormEvent, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Icons } from "./icons";
import { StatusBadge, PriorityBadge } from "./ui/badge";
import { CardSkeleton } from "./ui/skeleton";
import { EmptyState } from "./ui/empty-state";
import { useToast } from "./ui/toast";
import { TaskForm } from "./task-form";

type Task = {
  id: string;
  title: string;
  description: string;
  instructions: string | null;
  priority: string;
  status: string;
  origin: string;
  dueDate: string;
  farm: { id: string; name: string };
  plot: { name: string } | null;
  cropCycle: { cropName: string } | null;
  assignedOfficer: { name: string } | null;
};

export function TaskBoard() {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [targetPlanDate, setTargetPlanDate] = useState<string | undefined>(undefined);

  const load = () => {
    setLoading(true);
    fetch("/api/tasks")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((data) => {
        setTasks(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load activities.");
        setLoading(false);
      });
  };

  useEffect(() => {
    void load();
  }, []);

  // Generate Rolling 7-Day Window dates
  const rollingDays = useMemo(() => {
    const days: { dateStr: string; label: string; weekday: string }[] = [];
    const today = new Date();
    for (let i = 0; i < 7; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr = d.toISOString().slice(0, 10);
      const weekday = i === 0 ? "Today" : d.toLocaleDateString("en-US", { weekday: "short" });
      const label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      days.push({ dateStr, label, weekday });
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
          title: f.get("title"),
          description: f.get("description"),
          instructions: f.get("instructions") || null,
          priority: f.get("priority"),
          dueDate: f.get("dueDate"),
        }),
      });

      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        const errMsg = body.error ?? "Unable to update activity.";
        setError(errMsg);
        toast.error(errMsg);
        return;
      }

      toast.success("Activity successfully updated.");
      setEditingId(null);
      void load();
    } catch {
      setError("Network error updating task.");
      toast.error("Network error updating task.");
    }
  }

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
      const matchesDay = selectedDayFilter === "ALL" || t.dueDate?.slice(0, 10) === selectedDayFilter;
      const matchesSearch =
        searchQuery === "" ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.assignedOfficer?.name && t.assignedOfficer.name.toLowerCase().includes(searchQuery.toLowerCase()));

      return matchesStatus && matchesDay && matchesSearch;
    });
  }, [tasks, statusFilter, selectedDayFilter, searchQuery]);

  return (
    <section>
      {/* Rolling 7-Day Matrix Navigation (Cohere Mineral Surface) */}
      <div
        style={{
          background: "var(--soft-stone)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-sm)",
          padding: 20,
          marginBottom: 24,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 8 }}>
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            7-DAY ROLLING AGRONOMY MATRIX (BRD §19)
          </div>
          <button
            type="button"
            className={`tab-btn ${selectedDayFilter === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedDayFilter("ALL")}
            style={{ fontSize: 12, padding: "4px 12px" }}
          >
            Show Full 7-Day Window ({tasks.length})
          </button>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
            gap: 8,
          }}
        >
          {rollingDays.map((d) => {
            const count = tasks.filter((t) => t.dueDate?.slice(0, 10) === d.dateStr).length;
            const isSelected = selectedDayFilter === d.dateStr;

            return (
              <div
                key={d.dateStr}
                onClick={() => setSelectedDayFilter(isSelected ? "ALL" : d.dateStr)}
                style={{
                  padding: 12,
                  borderRadius: "var(--radius-xs)",
                  background: isSelected ? "var(--primary)" : "var(--canvas)",
                  color: isSelected ? "var(--on-primary)" : "var(--ink)",
                  border: `1px solid ${isSelected ? "var(--primary)" : "var(--hairline)"}`,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all var(--transition-fast)",
                }}
              >
                <span className="mono-label" style={{ color: isSelected ? "rgba(255, 255, 255, 0.8)" : "var(--slate)", display: "block" }}>
                  {d.weekday}
                </span>
                <span style={{ fontSize: 13, color: isSelected ? "rgba(255, 255, 255, 0.9)" : "var(--body-muted)", display: "block", marginTop: 2 }}>
                  {d.label}
                </span>
                <strong style={{ fontSize: 16, color: isSelected ? "white" : count > 0 ? "var(--ink)" : "var(--muted)", marginTop: 4, display: "block" }}>
                  {count}
                </strong>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filter & Controls Bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Input */}
          <div style={{ position: "relative", minWidth: 240 }}>
            <input
              type="text"
              placeholder="Search activities, farms…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 12px 8px 32px",
                fontSize: 13,
                height: 36,
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--slate)",
              }}
            >
              <Icons.Search size={14} />
            </span>
          </div>

          {/* Status Tabs */}
          <div className="tabs-nav" style={{ margin: 0 }}>
            {["ALL", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "AVAILABLE"].map((st) => (
              <button
                key={st}
                type="button"
                className={`tab-btn ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
              >
                {st === "ALL" ? "All" : st.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8 }}>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={() => {
              setTargetPlanDate(selectedDayFilter !== "ALL" ? selectedDayFilter : undefined);
              setShowPlanModal(true);
            }}
          >
            <Icons.Plus size={14} />
            <span>Quick Plan Activity</span>
          </button>
          <Link href="/tasks/new" className="btn btn-secondary btn-sm" title="Open full planner page">
            <Icons.Calendar size={14} />
          </Link>
        </div>
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Skeletons */}
      {loading && (
        <div style={{ display: "grid", gap: 14 }}>
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Task Cards List */}
      {!loading && (
        <div style={{ display: "grid", gap: 12 }}>
          {filteredTasks.map((task) => {
            const isEditing = editingId === task.id;
            const isCompleted = task.status === "COMPLETED";

            return (
              <article
                className="card"
                key={task.id}
                style={{
                  margin: 0,
                  background: isCompleted ? "var(--soft-stone)" : "var(--canvas)",
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      <span className="mono-label" style={{ background: "var(--soft-stone)", padding: "2px 8px", borderRadius: "var(--radius-xs)" }}>
                        {task.origin.replaceAll("_", " ")}
                      </span>
                      <span className="mono-label" style={{ color: "var(--slate)" }}>
                        Due: {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 style={{ margin: "2px 0 4px" }}>{task.title}</h3>
                    <p style={{ color: "var(--body-muted)", fontSize: 13, margin: 0 }}>
                      <strong>{task.farm.name}</strong> {task.plot ? `&bull; Plot ${task.plot.name}` : ""} {task.cropCycle ? `&bull; 🌱 ${task.cropCycle.cropName}` : ""}{" "}
                      {task.assignedOfficer ? `&bull; Officer: ${task.assignedOfficer.name}` : "• Unassigned"}
                    </p>
                  </div>

                  <button
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setEditingId(isEditing ? null : task.id)}
                  >
                    <Icons.Edit size={13} />
                    <span>{isEditing ? "Cancel" : "Edit Plan"}</span>
                  </button>
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--hairline)" }}>
                  <p style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 4px" }}>
                    {task.description}
                  </p>
                  {task.instructions && (
                    <p style={{ fontSize: 13, color: "var(--ink)", background: "var(--soft-stone)", border: "1px solid var(--hairline)", padding: "8px 12px", borderRadius: "var(--radius-xs)", margin: "6px 0 0" }}>
                      <strong>Agronomist Guidance:</strong> {task.instructions}
                    </p>
                  )}
                </div>

                {/* Inline Editing Form */}
                {isEditing && (
                  <form
                    onSubmit={(e) => save(e, task)}
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px dashed var(--hairline)",
                      display: "grid",
                      gap: 12,
                    }}
                  >
                    <div className="two-column">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Title</label>
                        <input name="title" defaultValue={task.title} required />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Due Date (Rolling 7-Day Window)</label>
                        <input
                          name="dueDate"
                          type="date"
                          defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Priority</label>
                        <select name="priority" defaultValue={task.priority}>
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Agronomist Guidance / Instructions</label>
                        <input name="instructions" defaultValue={task.instructions || ""} />
                      </div>

                      <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
                        <label>Description</label>
                        <textarea name="description" defaultValue={task.description} rows={2} required />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setEditingId(null)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary btn-sm">
                        Save Updates
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}

          {!filteredTasks.length && (
            <EmptyState
              icon={<Icons.ClipboardList size={28} />}
              title="No activities found"
              description="No tasks match the selected filter or search query."
            />
          )}
        </div>
      )}

      {/* Quick Plan Modal Drawer */}
      {showPlanModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.6)",
            backdropFilter: "blur(2px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <div
            className="card"
            style={{
              maxWidth: 720,
              width: "100%",
              maxHeight: "92vh",
              overflowY: "auto",
              padding: 24,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <div>
                <div className="eyebrow">
                  <span className="eyebrow-dot"></span>
                  7-DAY ROLLING PRESCRIPTION DISPATCH &bull; BRD §20
                </div>
                <h3 style={{ margin: "2px 0 0" }}>Plan Agronomy Activity</h3>
              </div>
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => setShowPlanModal(false)}
                style={{ padding: 4 }}
              >
                ✕
              </button>
            </div>

            <TaskForm
              initialDate={targetPlanDate}
              onSuccess={() => {
                toast.success("Activity scheduled in 7-day rolling plan!");
                setShowPlanModal(false);
                void load();
              }}
              onCancel={() => setShowPlanModal(false)}
            />
          </div>
        </div>
      )}
    </section>
  );
}
