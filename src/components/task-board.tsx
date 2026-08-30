"use client";
import { FormEvent, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Icons } from "./icons";
import { StatusBadge, PriorityBadge } from "./ui/badge";
import { CardSkeleton } from "./ui/skeleton";
import { EmptyState } from "./ui/empty-state";
import { useToast } from "./ui/toast";

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
  const [message, setMessage] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [selectedDayFilter, setSelectedDayFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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
      const matchesDay =
        selectedDayFilter === "ALL" || t.dueDate?.slice(0, 10) === selectedDayFilter;
      const matchesSearch =
        searchQuery === "" ||
        t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.assignedOfficer?.name &&
          t.assignedOfficer.name.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesStatus && matchesDay && matchesSearch;
    });
  }, [tasks, statusFilter, selectedDayFilter, searchQuery]);

  return (
    <section>
      {/* 7-Day Rolling Agronomy Timeline Strip */}
      <div
        className="card"
        style={{
          border: "1px solid var(--border-subtle)",
          padding: "16px 20px",
          marginBottom: 20,
          background: "var(--bg-card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            7-DAY ROLLING AGRONOMY MATRIX (BRD §19)
          </div>
          <button
            type="button"
            className={`tab-btn ${selectedDayFilter === "ALL" ? "active" : ""}`}
            onClick={() => setSelectedDayFilter("ALL")}
            style={{ fontSize: "0.78rem", padding: "4px 10px" }}
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
                  padding: "10px",
                  borderRadius: "var(--radius-md)",
                  background: isSelected ? "var(--primary-50)" : "var(--slate-50)",
                  border: `2px solid ${isSelected ? "var(--primary-600)" : "var(--border-subtle)"}`,
                  cursor: "pointer",
                  textAlign: "center",
                  transition: "all var(--transition-fast)",
                }}
              >
                <span style={{ fontSize: "0.75rem", fontWeight: 700, color: isSelected ? "var(--primary-800)" : "var(--slate-600)", textTransform: "uppercase", display: "block" }}>
                  {d.weekday}
                </span>
                <span style={{ fontSize: "0.82rem", color: "var(--text-muted)", display: "block" }}>
                  {d.label}
                </span>
                <strong style={{ fontSize: "1.1rem", color: count > 0 ? "var(--primary-700)" : "var(--slate-400)", marginTop: 2, display: "block" }}>
                  {count} {count === 1 ? "task" : "tasks"}
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
          marginBottom: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {/* Search Input */}
          <div style={{ position: "relative" }}>
            <input
              type="text"
              placeholder="Search activities, farms, officers…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                padding: "8px 12px 8px 32px",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-strong)",
                fontSize: "0.88rem",
                width: 240,
                background: "white",
              }}
            />
            <div
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--slate-400)",
              }}
            >
              <Icons.Search size={14} />
            </div>
          </div>

          {/* Status Tabs */}
          <div className="tabs-nav" style={{ margin: 0, padding: 3 }}>
            {["ALL", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "AVAILABLE"].map((st) => (
              <button
                key={st}
                type="button"
                className={`tab-btn ${statusFilter === st ? "active" : ""}`}
                onClick={() => setStatusFilter(st)}
                style={{ padding: "5px 10px", fontSize: "0.78rem" }}
              >
                {st === "ALL" ? "All" : st.replaceAll("_", " ")}
              </button>
            ))}
          </div>
        </div>

        <Link href="/tasks/new" className="btn btn-sm btn-primary" style={{ minHeight: 38 }}>
          <Icons.Plus size={14} />
          <span>Plan Activity</span>
        </Link>
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
        <div style={{ display: "grid", gap: 14 }}>
          {filteredTasks.map((task) => {
            const isEditing = editingId === task.id;
            const isCompleted = task.status === "COMPLETED";

            return (
              <article
                className="card"
                key={task.id}
                style={{
                  margin: 0,
                  border: isCompleted ? "1px solid var(--primary-200)" : "1px solid var(--border-subtle)",
                  background: isCompleted ? "var(--slate-50)" : "white",
                  padding: "18px 20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      <span
                        style={{
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "var(--radius-xs)",
                          background: "var(--slate-100)",
                          color: "var(--slate-700)",
                          textTransform: "uppercase",
                        }}
                      >
                        {task.origin.replaceAll("_", " ")}
                      </span>
                      <span style={{ fontSize: "0.78rem", color: "var(--text-muted)" }}>
                        Due: <strong>{new Date(task.dueDate).toLocaleDateString()}</strong>
                      </span>
                    </div>

                    <h3 style={{ fontSize: "1.15rem", margin: "2px 0 4px" }}>{task.title}</h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
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

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border-subtle)" }}>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-main)", margin: "0 0 4px" }}>
                    {task.description}
                  </p>
                  {task.instructions && (
                    <p style={{ fontSize: "0.85rem", color: "var(--primary-900)", background: "var(--primary-50)", border: "1px solid var(--primary-200)", padding: "6px 10px", borderRadius: "var(--radius-sm)", margin: "6px 0 0" }}>
                      <strong>Agronomist Guidance:</strong> {task.instructions}
                    </p>
                  )}
                </div>

                {/* Inline Editing Form */}
                {isEditing && (
                  <form
                    onSubmit={(e) => save(e, task)}
                    className="form"
                    style={{
                      marginTop: 14,
                      paddingTop: 14,
                      borderTop: "1px dashed var(--border-strong)",
                    }}
                  >
                    <div className="two-column">
                      <div className="form-group">
                        <label>Title</label>
                        <input name="title" defaultValue={task.title} required />
                      </div>

                      <div className="form-group">
                        <label>Due Date (Rolling 7-Day Window)</label>
                        <input
                          name="dueDate"
                          type="date"
                          defaultValue={task.dueDate ? new Date(task.dueDate).toISOString().slice(0, 10) : ""}
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label>Priority</label>
                        <select name="priority" defaultValue={task.priority}>
                          <option value="LOW">Low</option>
                          <option value="MEDIUM">Medium</option>
                          <option value="HIGH">High</option>
                          <option value="URGENT">Urgent</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Agronomist Guidance / Instructions</label>
                        <input name="instructions" defaultValue={task.instructions || ""} />
                      </div>

                      <div className="form-group wide">
                        <label>Description</label>
                        <textarea name="description" defaultValue={task.description} rows={2} required />
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                      <button type="button" className="btn btn-sm btn-secondary" onClick={() => setEditingId(null)}>
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-sm btn-primary">
                        <Icons.Check size={14} />
                        <span>Save Changes</span>
                      </button>
                    </div>
                  </form>
                )}
              </article>
            );
          })}

          {!filteredTasks.length && (
            <EmptyState
              icon={<Icons.Calendar size={28} />}
              title="No activities found"
              description="No tasks match the selected date or category filter in the 7-day rolling window."
              action={
                <Link href="/tasks/new" className="btn btn-sm btn-primary">
                  <Icons.Plus size={14} />
                  <span>Plan First Activity</span>
                </Link>
              }
            />
          )}
        </div>
      )}
    </section>
  );
}
