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
  id: string; title: string; description: string; instructions?: string | null; status: string;
  origin: "AGRONOMIST" | "SYSTEM" | "DAILY_MONITORING"; priority: string; category: string;
  farm: { id: string; name: string }; plot?: { id?: string; name: string } | null;
  cropCycle?: { id?: string; cropName: string } | null; milestone?: { id: string; name: string } | null;
};

export function OfficerDay({ refreshKey }: { refreshKey?: number }) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [monitoringTaskId, setMonitoringTaskId] = useState<string | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [originFilter, setOriginFilter] = useState<string>("ALL");
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      await fetch("/api/tasks/generate-daily", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      }).catch(() => undefined);
      const r = await fetch(`/api/tasks?date=${new Date().toISOString().slice(0, 10)}`);
      if (r.ok) setTasks(await r.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [refreshKey]);

  async function start(id: string) {
    try {
      const r = await fetch(`/api/tasks/${id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "IN_PROGRESS" }),
      });
      if (r.ok) {
        toast.success("Activity started!");
        void load();
      }
    } catch {
      toast.error("Network error.");
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
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* SHIFT PROGRESS BAR */}
      <div className="compact-card" style={{ padding: 20, gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4, flexWrap: "wrap", gap: 8 }}>
          <div>
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              <span>TODAY&apos;S OPERATIONS QUEUE</span>
            </div>
            <h2 className="section-title" style={{ fontSize: "20px", marginTop: 4 }}>
              {completedCount} of {tasks.length} Operations Completed ({progressPercent}%)
            </h2>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => setShowIncidentModal(!showIncidentModal)}>
              <Icons.AlertTriangle size={14} />
              <span>{showIncidentModal ? "Close" : "Report Incident"}</span>
            </button>
            <button type="button" className="btn btn-sm btn-secondary" onClick={load}>
              <Icons.Activity size={14} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div style={{ width: "100%", height: 4, backgroundColor: "var(--line)", borderRadius: "var(--radius-none)", overflow: "hidden" }}>
          <div style={{ width: `${progressPercent}%`, height: "100%", backgroundColor: "var(--green)", transition: "width 0.3s ease" }} />
        </div>
      </div>

      {showIncidentModal && (
        <div style={{ background: "var(--canvas)", border: "1px solid var(--line)", padding: 20, borderRadius: "var(--radius-sm)" }}>
          <FieldReports initialTab="incident" hideTabs={true} onSuccess={() => { setShowIncidentModal(false); toast.success("Incident reported."); }} onCancel={() => setShowIncidentModal(false)} />
        </div>
      )}

      {/* FILTER TABS */}
      <div className="tabs-nav">
        {["ALL", "AGRONOMIST", "SYSTEM", "DAILY_MONITORING"].map((org) => (
          <button
            key={org}
            type="button"
            className={`tab-btn ${originFilter === org ? "active" : ""}`}
            onClick={() => setOriginFilter(org)}
          >
            {org === "ALL" ? "All Operations" : org === "SYSTEM" ? "Milestones" : org === "DAILY_MONITORING" ? "Monitoring" : "Agronomist Tasks"}
          </button>
        ))}
      </div>

      {loading && <CardSkeleton />}

      {/* TASK EXECUTION ROWS / CARDS */}
      <div style={{ display: "flex", flexDirection: "column" }}>
        {filteredTasks.map((task) => {
          const isDone = task.status === "COMPLETED";
          const isStarted = task.status === "IN_PROGRESS";
          const isMonitoring = task.origin === "DAILY_MONITORING";

          return (
            <article
              key={task.id}
              className="data-row"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 12,
                padding: "18px 20px",
                backgroundColor: isDone ? "var(--stone)" : "var(--canvas)",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span className="item-title">{task.title}</span>
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="muted" style={{ fontSize: "13px" }}>
                    {task.farm.name} {task.plot ? `&bull; Plot: ${task.plot.name}` : ""} {task.cropCycle ? `&bull; 🌱 ${task.cropCycle.cropName}` : ""}
                  </div>
                </div>
              </div>

              {task.description && <p style={{ margin: 0, fontSize: "14px", color: "var(--ink)" }}>{task.description}</p>}

              {task.instructions && (
                <div className="callout" style={{ padding: "10px 14px", fontSize: "13px" }}>
                  <span className="mono-label" style={{ color: "var(--green-dark)" }}>Operational Guidance:</span>
                  <span style={{ color: "var(--ink)" }}>{task.instructions}</span>
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 4, borderTop: "1px solid var(--line)", paddingTop: 12, flexWrap: "wrap" }}>
                {!isDone && !isStarted && !isMonitoring && (
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => start(task.id)} style={{ minHeight: 40 }}>
                    <Icons.Zap size={14} />
                    <span>Start Activity</span>
                  </button>
                )}
                {!isDone && isMonitoring && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setMonitoringTaskId(monitoringTaskId === task.id ? null : task.id)} style={{ minHeight: 40 }}>
                    <Icons.Camera size={14} />
                    <span>{monitoringTaskId === task.id ? "Close Log" : "Capture Monitoring Photo"}</span>
                  </button>
                )}
                {!isDone && (
                  <button type="button" className="btn btn-green btn-sm" onClick={() => setCompletionId(completionId === task.id ? null : task.id)} style={{ minHeight: 40 }}>
                    <Icons.CheckCircle size={14} />
                    <span>Complete Task</span>
                  </button>
                )}
              </div>

              {monitoringTaskId === task.id && (
                <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                  <FieldReports initialFarmId={task.farm.id} initialPlotId={task.plot?.id} initialCropCycleId={task.cropCycle?.id} initialTab="monitoring" hideTabs={true} onSuccess={() => { setMonitoringTaskId(null); void load(); }} onCancel={() => setMonitoringTaskId(null)} />
                </div>
              )}

              {completionId === task.id && (
                <div style={{ marginTop: 8, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                  <TaskCompletionForm taskId={task.id} farmId={task.farm.id} taskTitle={task.title} milestoneName={task.milestone?.name} onComplete={() => { setCompletionId(null); void load(); }} onCancel={() => setCompletionId(null)} />
                </div>
              )}
            </article>
          );
        })}

        {!filteredTasks.length && !loading && (
          <EmptyState
            icon={<Icons.CheckCircle size={24} />}
            title="All operations finished"
            description="All field activities and monitoring checks for today have been completed."
          />
        )}
      </div>
    </section>
  );
}
