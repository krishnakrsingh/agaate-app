"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useMemo } from "react";
import { TaskCompletionForm } from "@/components/task-completion-form";
import { FieldReports } from "@/components/field-reports";
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
  plot?: { id?: string; name: string } | null;
  cropCycle?: { id?: string; cropName: string } | null;
  milestone?: { id: string; name: string } | null;
};

export function OfficerDay({ refreshKey }: { refreshKey?: number }) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [error, setError] = useState("");
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [monitoringTaskId, setMonitoringTaskId] = useState<string | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [originFilter, setOriginFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      await fetch("/api/tasks/generate-daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      }).catch(() => undefined);
      const r = await fetch(`/api/tasks?date=${new Date().toISOString().slice(0, 10)}`);
      if (!r.ok) throw new Error((await r.json()).error);
      setTasks(await r.json());
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
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
    <section style={{ display: "grid", gap: 18 }}>
      {/* Daily Shift Progress Card */}
      <div className="card" style={{ padding: 22 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              TODAY&apos;S QUEUE &bull; {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <h3 style={{ margin: "2px 0 0", fontSize: "1.15rem" }}>
              {completedCount} of {tasks.length} Operations Finished ({progressPercent}%)
            </h3>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-sm btn-danger"
              onClick={() => setShowIncidentModal(!showIncidentModal)}
            >
              <Icons.AlertTriangle size={14} />
              <span>{showIncidentModal ? "Close Incident" : "Report Incident"}</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={load}
              title="Refresh task queue"
            >
              <Icons.Activity size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Tactile Progress Bar */}
        <div style={{ width: "100%", height: 7, background: "var(--card-muted)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: "var(--primary)",
              borderRadius: "var(--radius-full)",
              transition: "width 0.3s ease",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 10, fontSize: "0.82rem", color: "var(--text-muted)" }}>
          <span><strong style={{ color: "var(--text-main)" }}>{completedCount}</strong> Completed</span>
          <span><strong style={{ color: "var(--primary)" }}>{inProgressCount}</strong> In Progress</span>
          <span><strong style={{ color: "var(--text-main)" }}>{tasks.length - completedCount - inProgressCount}</strong> Remaining</span>
        </div>
      </div>

      {/* Incident Quick Reporting Sheet */}
      {showIncidentModal && (
        <div style={{ marginBottom: 4 }}>
          <FieldReports
            initialTab="incident"
            hideTabs={true}
            onSuccess={() => {
              setShowIncidentModal(false);
              toast.success("Incident transmitted to Agronomist & Farm Admin!");
            }}
            onCancel={() => setShowIncidentModal(false)}
          />
        </div>
      )}

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="tabs-nav">
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
          <Icons.Calendar size={13} />
          <span>Agronomist ({tasks.filter((t) => t.origin === "AGRONOMIST").length})</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${originFilter === "SYSTEM" ? "active" : ""}`}
          onClick={() => setOriginFilter("SYSTEM")}
        >
          <Icons.Layers size={13} />
          <span>Milestones ({tasks.filter((t) => t.origin === "SYSTEM").length})</span>
        </button>
        <button
          type="button"
          className={`tab-btn ${originFilter === "DAILY_MONITORING" ? "active" : ""}`}
          onClick={() => setOriginFilter("DAILY_MONITORING")}
        >
          <Icons.Camera size={13} />
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

      {/* Task Cards List */}
      {!loading && (
        <div style={{ display: "grid", gap: 14 }}>
          {filteredTasks.map((task) => {
            const isCompleted = task.status === "COMPLETED";
            const isMonitoringActive = monitoringTaskId === task.id;
            const isCompletionActive = completionId === task.id;

            return (
              <article
                className="card"
                key={task.id}
                style={{
                  background: isCompleted ? "var(--card-muted)" : "var(--card)",
                  opacity: isCompleted ? 0.9 : 1,
                  padding: 20,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
                  <div style={{ flex: "1 1 300px" }}>
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      <span className="mono-label" style={{ background: "var(--card-muted)", padding: "2px 7px", borderRadius: "var(--radius-xs)" }}>
                        {task.origin.replaceAll("_", " ")}
                      </span>
                    </div>

                    <h3 style={{ margin: "2px 0 4px", fontSize: "1.1rem" }}>
                      {task.title}
                    </h3>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", margin: 0 }}>
                      <strong>{task.farm.name}</strong> {task.plot ? `&bull; Plot ${task.plot.name}` : ""} {task.cropCycle ? `&bull; 🌱 ${task.cropCycle.cropName}` : ""}
                    </p>
                  </div>

                  {/* Primary Action Button */}
                  <div>
                    {task.origin === "DAILY_MONITORING" && !isCompleted && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setMonitoringTaskId(isMonitoringActive ? null : task.id)}
                      >
                        <Icons.Camera size={14} />
                        <span>{isMonitoringActive ? "Close Form" : "Submit Monitoring"}</span>
                      </button>
                    )}

                    {["ASSIGNED", "AVAILABLE", "BLOCKED"].includes(task.status) && task.origin !== "DAILY_MONITORING" && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => start(task.id)}
                      >
                        <Icons.Zap size={14} />
                        <span>Start Activity</span>
                      </button>
                    )}

                    {task.status === "IN_PROGRESS" && (
                      <button
                        type="button"
                        className="btn btn-secondary btn-sm"
                        onClick={() => setCompletionId(isCompletionActive ? null : task.id)}
                      >
                        <Icons.CheckCircle size={14} />
                        <span>{isCompletionActive ? "Close Form" : "Record Completion"}</span>
                      </button>
                    )}

                    {isCompleted && (
                      <span className="status-badge badge-active">
                        <Icons.Check size={12} />
                        <span>Done</span>
                      </span>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--border)" }}>
                  <p style={{ fontSize: "0.9rem", color: "var(--text-main)", margin: 0 }}>
                    {task.description}
                  </p>
                  {task.instructions && (
                    <div style={{ fontSize: "0.84rem", color: "var(--text-main)", background: "var(--card-muted)", border: "1px solid var(--border)", padding: "8px 12px", borderRadius: "var(--radius-xs)", marginTop: 8 }}>
                      <strong>Agronomist Technical Guidance:</strong> {task.instructions}
                    </div>
                  )}
                </div>

                {/* Inline Daily Monitoring Form */}
                {isMonitoringActive && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px dashed var(--border)" }}>
                    <FieldReports
                      initialFarmId={task.farm.id}
                      initialPlotId={task.plot?.id}
                      initialCropCycleId={task.cropCycle?.id}
                      initialTab="monitoring"
                      hideTabs={true}
                      onSuccess={() => {
                        setMonitoringTaskId(null);
                        toast.success("Daily monitoring recorded & synced!");
                        void load();
                      }}
                      onCancel={() => setMonitoringTaskId(null)}
                    />
                  </div>
                )}

                {/* Inline Activity Completion Form */}
                {isCompletionActive && (
                  <TaskCompletionForm
                    taskId={task.id}
                    farmId={task.farm.id}
                    taskTitle={task.title}
                    milestoneName={task.milestone?.name ?? null}
                    onComplete={() => {
                      setCompletionId(null);
                      toast.success("Activity completion recorded!");
                      void load();
                    }}
                    onCancel={() => setCompletionId(null)}
                  />
                )}
              </article>
            );
          })}

          {!filteredTasks.length && (
            <EmptyState
              icon={<Icons.CheckCircle size={28} />}
              title="No activities in this queue"
              description="No field operations assigned for today matching this category filter."
            />
          )}
        </div>
      )}
    </section>
  );
}
