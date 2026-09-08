"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useMemo } from "react";
import { TaskCompletionForm } from "@/components/task-completion-form";
import { FieldReports } from "@/components/field-reports";
import { IncidentReportForm } from "@/components/incident-report-form";
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
  const [statusTab, setStatusTab] = useState<"ALL" | "PENDING" | "COMPLETED">("ALL");
  const [taskSearch, setTaskSearch] = useState("");
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

  const completedCount = tasks.filter((t) => t.status === "COMPLETED").length;
  const pendingCount = tasks.filter((t) => t.status !== "COMPLETED").length;
  const inProgressCount = tasks.filter((t) => t.status === "IN_PROGRESS").length;
  const progressPercent = tasks.length ? Math.round((completedCount / tasks.length) * 100) : 0;

  const filteredTasks = useMemo(() => {
    const q = taskSearch.toLowerCase().trim();
    return tasks.filter((t) => {
      const matchesOrigin = originFilter === "ALL" || t.origin === originFilter;
      const matchesStatus =
        statusTab === "ALL" ||
        (statusTab === "PENDING" && t.status !== "COMPLETED") ||
        (statusTab === "COMPLETED" && t.status === "COMPLETED");
      const matchesSearch =
        !q ||
        t.title.toLowerCase().includes(q) ||
        (t.plot?.name && t.plot.name.toLowerCase().includes(q)) ||
        (t.cropCycle?.cropName && t.cropCycle.cropName.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q);
      return matchesOrigin && matchesStatus && matchesSearch;
    });
  }, [tasks, originFilter, statusTab, taskSearch]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* SHIFT PROGRESS BAR CARD */}
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
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
          <div>
            <div className="eyebrow" style={{ color: "var(--green)" }}>
              <span className="eyebrow-dot" style={{ backgroundColor: "var(--green)" }} />
              <span>TODAY&apos;S OPERATIONS QUEUE</span>
            </div>
            <h2 className="section-title" style={{ fontSize: "22px", marginTop: 4 }}>
              {completedCount} of {tasks.length} Operations Completed ({progressPercent}%)
            </h2>
          </div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setShowIncidentModal(!showIncidentModal)}
              style={{ borderRadius: "var(--radius-pill)", padding: "8px 16px" }}
            >
              <Icons.AlertTriangle size={15} />
              <span>{showIncidentModal ? "Close Form" : "Report Hazard / Incident"}</span>
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={load}
              style={{ borderRadius: "var(--radius-pill)", padding: "8px 16px" }}
            >
              <Icons.Activity size={15} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        <div
          style={{
            width: "100%",
            height: 8,
            backgroundColor: "var(--stone)",
            borderRadius: "var(--radius-pill)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progressPercent}%`,
              height: "100%",
              backgroundColor: "var(--green)",
              borderRadius: "var(--radius-pill)",
              transition: "width 0.4s ease",
            }}
          />
        </div>
      </div>

      {showIncidentModal && (
        <div
          style={{
            background: "var(--canvas)",
            border: "1px solid var(--line)",
            padding: 20,
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-lg)",
          }}
        >
          <IncidentReportForm
            onSuccess={() => {
              setShowIncidentModal(false);
              toast.success("Field incident logged with photos.");
              void load();
            }}
            onCancel={() => setShowIncidentModal(false)}
          />
        </div>
      )}

      {/* FILTER TABS & SEARCH CONTROLS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div className="tabs-nav" style={{ padding: 4, gap: 4 }}>
            {["ALL", "AGRONOMIST", "SYSTEM", "DAILY_MONITORING"].map((org) => (
              <button
                key={org}
                type="button"
                className={`tab-btn ${originFilter === org ? "active" : ""}`}
                onClick={() => setOriginFilter(org)}
              >
                {org === "ALL"
                  ? "All Operations"
                  : org === "SYSTEM"
                  ? "Milestones"
                  : org === "DAILY_MONITORING"
                  ? "Monitoring"
                  : "Agronomist Tasks"}
              </button>
            ))}
          </div>

          {/* Quick status tabs: All / Pending / Done */}
          <div style={{ display: "flex", gap: 4, background: "var(--stone)", padding: 3, borderRadius: "var(--radius-sm)" }}>
            <button
              type="button"
              onClick={() => setStatusTab("ALL")}
              className="btn btn-sm"
              style={{
                background: statusTab === "ALL" ? "var(--canvas)" : "transparent",
                color: statusTab === "ALL" ? "var(--ink)" : "var(--muted)",
                fontWeight: statusTab === "ALL" ? 600 : 400,
                boxShadow: statusTab === "ALL" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                fontSize: "12px",
                padding: "3px 8px",
              }}
            >
              All ({tasks.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("PENDING")}
              className="btn btn-sm"
              style={{
                background: statusTab === "PENDING" ? "var(--canvas)" : "transparent",
                color: statusTab === "PENDING" ? "var(--amber)" : "var(--muted)",
                fontWeight: statusTab === "PENDING" ? 600 : 400,
                boxShadow: statusTab === "PENDING" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                fontSize: "12px",
                padding: "3px 8px",
              }}
            >
              Due ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusTab("COMPLETED")}
              className="btn btn-sm"
              style={{
                background: statusTab === "COMPLETED" ? "var(--canvas)" : "transparent",
                color: statusTab === "COMPLETED" ? "var(--green)" : "var(--muted)",
                fontWeight: statusTab === "COMPLETED" ? 600 : 400,
                boxShadow: statusTab === "COMPLETED" ? "0 1px 2px rgba(0,0,0,0.06)" : "none",
                fontSize: "12px",
                padding: "3px 8px",
              }}
            >
              Done ({completedCount})
            </button>
          </div>
        </div>

        {/* Task Search Bar */}
        <div style={{ position: "relative" }}>
          <input
            type="text"
            placeholder="Search operations by title, plot zone, crop, or category…"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 32, fontSize: "13px", height: 36 }}
          />
          <div style={{ position: "absolute", left: 10, top: 10, color: "var(--muted)" }}>
            <Icons.Search size={14} />
          </div>
          {taskSearch && (
            <button
              type="button"
              onClick={() => setTaskSearch("")}
              style={{
                position: "absolute",
                right: 10,
                top: 8,
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "16px",
              }}
            >
              &times;
            </button>
          )}
        </div>
      </div>

      {loading && <CardSkeleton />}

      {/* TASK EXECUTION CARDS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {filteredTasks.map((task) => {
          const isDone = task.status === "COMPLETED";
          const isStarted = task.status === "IN_PROGRESS";
          const isMonitoring = task.origin === "DAILY_MONITORING";

          return (
            <article
              key={task.id}
              className="compact-card"
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "stretch",
                gap: 14,
                padding: "22px 24px",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-card)",
                backgroundColor: isDone ? "var(--stone)" : "var(--canvas)",
                opacity: isDone ? 0.85 : 1,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontSize: "16px", fontWeight: 600, color: "var(--ink)" }}>{task.title}</span>
                    <StatusBadge status={task.status} />
                    <PriorityBadge priority={task.priority} />
                  </div>
                  <div className="muted" style={{ fontSize: "13px" }}>
                    {task.farm.name} {task.plot ? `&bull; Plot: ${task.plot.name}` : ""} {task.cropCycle ? `&bull; 🌱 ${task.cropCycle.cropName}` : ""}
                  </div>
                </div>
              </div>

              {task.description && (
                <p style={{ margin: 0, fontSize: "14px", color: "var(--ink)", lineHeight: 1.5 }}>
                  {task.description}
                </p>
              )}

              {task.instructions && (
                <div
                  className="callout"
                  style={{
                    padding: "12px 16px",
                    fontSize: "13px",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <span className="mono-label" style={{ color: "var(--green-dark)", fontWeight: 600 }}>
                    Operational Guidance:
                  </span>
                  <span style={{ color: "var(--ink)", marginTop: 2, display: "block" }}>{task.instructions}</span>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 6,
                  borderTop: "1px solid var(--line)",
                  paddingTop: 14,
                  flexWrap: "wrap",
                }}
              >
                {!isDone && !isStarted && !isMonitoring && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => start(task.id)}
                    style={{ borderRadius: "var(--radius-pill)", padding: "7px 16px" }}
                  >
                    <Icons.Zap size={14} />
                    <span>Start Activity</span>
                  </button>
                )}
                {!isDone && isMonitoring && (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => setMonitoringTaskId(monitoringTaskId === task.id ? null : task.id)}
                    style={{ borderRadius: "var(--radius-pill)", padding: "7px 16px" }}
                  >
                    <Icons.Camera size={14} />
                    <span>{monitoringTaskId === task.id ? "Close Log" : "Capture Monitoring Photo"}</span>
                  </button>
                )}
                {!isDone && (
                  <button
                    type="button"
                    className="btn btn-green"
                    onClick={() => setCompletionId(completionId === task.id ? null : task.id)}
                    style={{ borderRadius: "var(--radius-pill)", padding: "7px 16px" }}
                  >
                    <Icons.CheckCircle size={14} />
                    <span>Complete Task</span>
                  </button>
                )}
              </div>

              {monitoringTaskId === task.id && (
                <div style={{ marginTop: 10, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                  <FieldReports
                    initialFarmId={task.farm.id}
                    initialPlotId={task.plot?.id}
                    initialCropCycleId={task.cropCycle?.id}
                    initialTab="monitoring"
                    hideTabs={true}
                    onSuccess={() => { setMonitoringTaskId(null); void load(); }}
                    onCancel={() => setMonitoringTaskId(null)}
                  />
                </div>
              )}

              {completionId === task.id && (
                <div style={{ marginTop: 10, paddingTop: 14, borderTop: "1px solid var(--line)" }}>
                  <TaskCompletionForm
                    taskId={task.id}
                    farmId={task.farm.id}
                    taskTitle={task.title}
                    milestoneName={task.milestone?.name}
                    onComplete={() => { setCompletionId(null); void load(); }}
                    onCancel={() => setCompletionId(null)}
                  />
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
