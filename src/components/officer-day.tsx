"use client";
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
      {/* Daily Progress Header */}
      <div
        className="card"
        style={{
          padding: 24,
          marginBottom: 20,
          background: "var(--canvas)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot"></span>
              TODAY&apos;S FIELD SHIFT &bull; {new Date().toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}
            </div>
            <h3 style={{ margin: "2px 0 0" }}>
              {completedCount} of {tasks.length} Activities Completed ({progressPercent}%)
            </h3>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-sm btn-primary"
              onClick={() => setShowIncidentModal(!showIncidentModal)}
              style={{ background: "var(--coral)", borderColor: "var(--coral)", color: "white" }}
            >
              <Icons.AlertTriangle size={13} />
              <span>{showIncidentModal ? "Close Incident Form" : "Report Incident"}</span>
            </button>

            <button
              type="button"
              className="btn btn-sm btn-secondary"
              onClick={load}
              title="Refresh task list"
            >
              <span>Refresh Queue</span>
            </button>
          </div>
        </div>

        {/* Tactile Progress Bar */}
        <div style={{ width: "100%", height: 6, background: "var(--soft-stone)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              background: "var(--primary)",
              borderRadius: "var(--radius-full)",
              transition: "width 0.4s cubic-bezier(0.16, 1, 0.3, 1)",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: 16, marginTop: 12, fontSize: 13, color: "var(--body-muted)" }}>
          <span><strong>{completedCount}</strong> Done</span>
          <span><strong>{inProgressCount}</strong> In Progress</span>
          <span><strong>{tasks.length - completedCount - inProgressCount}</strong> Remaining</span>
        </div>
      </div>

      {/* Incident Quick Reporting Modal/Drawer */}
      {showIncidentModal && (
        <div style={{ marginBottom: 20 }}>
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

      {/* Task Filter Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 20 }}>
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

      {/* Tasks List */}
      {!loading && (
        <div style={{ display: "grid", gap: 14 }}>
          {filteredTasks.map((task) => {
            const isCompleted = task.status === "COMPLETED";
            const isMonitoringActive = monitoringTaskId === task.id;

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
                    <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
                      <StatusBadge status={task.status} />
                      <PriorityBadge priority={task.priority} />
                      <span className="mono-label" style={{ background: "var(--soft-stone)", padding: "2px 8px", borderRadius: "var(--radius-xs)" }}>
                        {task.origin.replaceAll("_", " ")}
                      </span>
                    </div>

                    <h3 style={{ margin: "2px 0 4px" }}>
                      {task.title}
                    </h3>
                    <p style={{ color: "var(--body-muted)", fontSize: 13, margin: 0 }}>
                      <strong>{task.farm.name}</strong> {task.plot ? `&bull; Plot ${task.plot.name}` : ""} {task.cropCycle ? `&bull; 🌱 ${task.cropCycle.cropName}` : ""}
                    </p>
                  </div>

                  {/* Primary Action Button */}
                  <div style={{ margin: 0 }}>
                    {task.origin === "DAILY_MONITORING" && !isCompleted && (
                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => setMonitoringTaskId(isMonitoringActive ? null : task.id)}
                      >
                        <Icons.Camera size={14} />
                        <span>{isMonitoringActive ? "Close Monitoring" : "Submit Monitoring"}</span>
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
                        onClick={() => setCompletionId(completionId === task.id ? null : task.id)}
                      >
                        <Icons.CheckCircle size={14} />
                        <span>{completionId === task.id ? "Close Details" : "Record Completion"}</span>
                      </button>
                    )}
                  </div>
                </div>

                <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid var(--hairline)" }}>
                  <p style={{ fontSize: 14, color: "var(--ink)", margin: "0 0 4px" }}>
                    {task.description}
                  </p>
                  {task.instructions && (
                    <p style={{ fontSize: 13, color: "var(--ink)", background: "var(--soft-stone)", border: "1px solid var(--hairline)", padding: "8px 12px", borderRadius: "var(--radius-xs)", margin: "8px 0 0" }}>
                      <strong>Agronomist Guidance:</strong> {task.instructions}
                    </p>
                  )}
                </div>

                {/* Inline Daily Monitoring Form */}
                {isMonitoringActive && (
                  <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px dashed var(--hairline)" }}>
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
