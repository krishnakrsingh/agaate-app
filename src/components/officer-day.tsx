"use client";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { TaskCompletionForm } from "@/components/task-completion-form";
import { Icons } from "./icons";
import { StatusBadge, PriorityBadge } from "./ui/badge";
import { CardSkeleton } from "./ui/skeleton";
import { EmptyState } from "./ui/empty-state";
import { useToast } from "./ui/toast";

type Task = {
  id: string;
  title: string;
  description: string;
  instructions?: string | null;
  status: string;
  origin: "AGRONOMIST" | "SYSTEM" | "DAILY_MONITORING";
  priority: string;
  category: string;
  farm: { id: string; name: string };
  plot?: { name: string } | null;
  cropCycle?: { cropName: string } | null;
};

export function OfficerDay({ refreshKey }: { refreshKey?: number }) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [originFilter, setOriginFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    fetch(`/api/tasks?date=${new Date().toISOString().slice(0, 10)}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error);
        setTasks(await r.json());
        setLoading(false);
      })
      .catch((e) => {
        setError(e.message);
        setLoading(false);
      });
  };

  useEffect(() => {
    void load();
  }, [refreshKey]);

  async function start(id: string) {
    try {
      const r = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      if (!r.ok) {
        const msg = (await r.json()).error ?? "Task update failed.";
        setError(msg);
        toast.error(msg);
        return;
      }
      toast.success("Activity started! In-progress status recorded.");
      void load();
    } catch {
      setError("Network error starting activity.");
      toast.error("Network error starting activity.");
    }
  }

  const filteredTasks = useMemo(() => {
    if (originFilter === "ALL") return tasks;
    return tasks.filter((t) => t.origin === originFilter);
  }, [tasks, originFilter]);

  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const progressPercent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <section>
      {/* Daily Progress & Command Hub Header */}
      <div
        className="card"
        style={{
          border: "1px solid var(--border-subtle)",
          padding: "20px 24px",
          marginBottom: 20,
          background: "var(--bg-card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              TODAY&apos;S FIELD SHIFT &bull; {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <h3 style={{ margin: "4px 0 0", fontSize: "1.35rem" }}>
              {completedCount} of {tasks.length} Activities Completed ({progressPercent}%)
            </h3>
          </div>

          {/* Quick Action Shortcuts */}
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Link href="/officer/reports" className="btn btn-sm btn-primary" style={{ minHeight: 38 }}>
              <Icons.Camera size={14} />
              <span>Record Crop Signal</span>
            </Link>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={load}
              title="Refresh task list"
              style={{ minHeight: 38 }}
            >
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Tactile Progress Bar */}
        <div style={{ width: "100%", height: 10, background: "var(--slate-100)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: "linear-gradient(90deg, var(--primary-600), var(--primary-400))",
              borderRadius: "var(--radius-full)",
              transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: "0.82rem", color: "var(--text-muted)" }}>
          <span><strong>{completedCount}</strong> Done</span>
          <span><strong>{inProgressCount}</strong> In Progress</span>
          <span><strong>{tasks.length - completedCount - inProgressCount}</strong> Remaining</span>
        </div>
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Task Filter Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className={`tab-btn ${originFilter === "ALL" ? "active" : ""}`}
          onClick={() => setOriginFilter("ALL")}
        >
          <span>All Tasks ({tasks.length})</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${originFilter === "AGRONOMIST" ? "active" : ""}`}
          onClick={() => setOriginFilter("AGRONOMIST")}
        >
          <Icons.Calendar size={14} />
          <span>Agronomist ({tasks.filter((t) => t.origin === "AGRONOMIST").length})</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${originFilter === "SYSTEM" ? "active" : ""}`}
          onClick={() => setOriginFilter("SYSTEM")}
        >
          <Icons.Layers size={14} />
          <span>Milestones ({tasks.filter((t) => t.origin === "SYSTEM").length})</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${originFilter === "DAILY_MONITORING" ? "active" : ""}`}
          onClick={() => setOriginFilter("DAILY_MONITORING")}
        >
          <Icons.Camera size={14} />
          <span>Monitoring ({tasks.filter((t) => t.origin === "DAILY_MONITORING").length})</span>
        </button>
      </div>

      {/* Loading Skeletons */}
      {loading && (
        <div style={{ display: "grid", gap: 14 }}>
          <CardSkeleton />
          <CardSkeleton />
        </div>
      )}

      {/* Tasks List */}
      {!loading && (
        <div style={{ display: "grid", gap: 14 }}>
          {filteredTasks.map((task) => {
            const isCompleted = task.status === "COMPLETED";

            return (
              <article
                className="card"
                key={task.id}
                style={{
                  margin: 0,
                  border: isCompleted ? "1px solid var(--primary-200)" : "1px solid var(--border-subtle)",
                  background: isCompleted ? "var(--slate-50)" : "white",
                  padding: "20px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
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
                    </div>

                    <h3 style={{ fontSize: "1.2rem", margin: "2px 0 6px", color: isCompleted ? "var(--slate-700)" : "var(--slate-900)" }}>
                      {task.title}
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.88rem", margin: 0 }}>
                      <strong>{task.farm.name}</strong> {task.plot ? `&bull; Plot ${task.plot.name}` : ""} {task.cropCycle ? `&bull; 🌱 ${task.cropCycle.cropName}` : ""}
                    </p>
                  </div>

                  {/* Primary Action Button (Target >= 48px on Mobile) */}
                  <div className="actions" style={{ margin: 0 }}>
                    {task.origin === "DAILY_MONITORING" && !isCompleted && (
                      <Link className="btn btn-primary" href="/officer/reports" style={{ minHeight: 44 }}>
                        <Icons.Camera size={16} />
                        <span>Submit Monitoring</span>
                      </Link>
                    )}

                    {["ASSIGNED", "AVAILABLE", "BLOCKED"].includes(task.status) && (
                      <button
                        type="button"
                        className="btn btn-primary"
                        onClick={() => start(task.id)}
                        style={{ minHeight: 44 }}
                      >
                        <Icons.Zap size={16} />
                        <span>Start Activity</span>
                      </button>
                    )}

                    {task.status === "IN_PROGRESS" && (
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setCompletionId(completionId === task.id ? null : task.id)}
                        style={{ minHeight: 44 }}
                      >
                        <Icons.CheckCircle size={16} style={{ color: "var(--primary-600)" }} />
                        <span>{completionId === task.id ? "Close Details" : "Record Completion"}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--border-subtle)" }}>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-main)", margin: "0 0 4px" }}>
                    {task.description}
                  </p>
                  {task.instructions && (
                    <p style={{ fontSize: "0.85rem", color: "var(--primary-900)", background: "var(--primary-50)", border: "1px solid var(--primary-200)", padding: "8px 12px", borderRadius: "var(--radius-sm)", margin: "8px 0 0" }}>
                      <strong>Agronomist Guidance:</strong> {task.instructions}
                    </p>
                  )}
                </div>

                {completionId === task.id && (
                  <TaskCompletionForm
                    taskId={task.id}
                    farmId={task.farm.id}
                    taskTitle={task.title}
                    onComplete={() => {
                      setCompletionId(null);
                      toast.success("Activity completion recorded!");
                      void load();
                    }}
                  />
                )}
              </article>
            );
          })}

          {!filteredTasks.length && (
            <EmptyState
              icon={<Icons.CheckCircle size={28} />}
              title="No activities found"
              description="No tasks assigned for today matching this category filter."
            />
          )}
        </div>
      )}
    </section>
  );
}
