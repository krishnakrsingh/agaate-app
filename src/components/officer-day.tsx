"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { useEffect, useState, useMemo } from "react";
import { TaskCompletionForm } from "@/components/task-completion-form";
import { FieldReports } from "@/components/field-reports";
import { CreateTaskModal } from "@/components/officer/create-task-modal";
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
  dueDate?: string;
  farm: { id: string; name: string };
  plot?: { id?: string; name: string } | null;
  cropCycle?: { id?: string; cropName: string } | null;
  milestone?: { id: string; name: string } | null;
  executions?: Array<{ id: string; status: string; completedAt: string | null; remarks: string | null }>;
  primaryImageUrl?: string | null;
  media?: Array<{ id: string; url: string | null }>;
};

function getCategoryEmoji(category?: string, origin?: string): string {
  if (origin === "DAILY_MONITORING") return "👁️";
  switch (category) {
    case "FERTIGATION":
    case "IRRIGATION_RECOMMENDATION":
      return "💧";
    case "PREVENTIVE_SPRAY":
    case "PEST_CONTROL":
      return "🛡️";
    case "DISEASE_CONTROL":
      return "🔬";
    case "FOLIAR_NUTRITION":
    case "SOIL_APPLICATION":
      return "🧪";
    case "CULTURAL_PRACTICE":
      return "🚜";
    case "CROP_SPECIFIC":
      return "🌱";
    default:
      return "📋";
  }
}

function getCategoryShortLabel(category?: string): string {
  switch (category) {
    case "FERTIGATION":
      return "Fertigate";
    case "IRRIGATION_RECOMMENDATION":
      return "Irrigate";
    case "PREVENTIVE_SPRAY":
      return "Spray";
    case "PEST_CONTROL":
      return "Pest Check";
    case "DISEASE_CONTROL":
      return "Disease";
    case "FOLIAR_NUTRITION":
      return "Foliar";
    case "SOIL_APPLICATION":
      return "Soil Nutri";
    case "CULTURAL_PRACTICE":
      return "Practice";
    case "CROP_MONITORING":
      return "Scout";
    default:
      return "Operation";
  }
}

export function OfficerDay({ refreshKey }: { refreshKey?: number }) {
  const toast = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [completionId, setCompletionId] = useState<string | null>(null);
  const [monitoringTaskId, setMonitoringTaskId] = useState<string | null>(null);
  const [showCreateTaskModal, setShowCreateTaskModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"TODAY" | "TOMORROW" | "WEEK" | "COMPLETED" | "ALL">("TODAY");
  const [showSearch, setShowSearch] = useState(false);
  const [taskSearch, setTaskSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      await fetch("/api/tasks/generate-daily", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: new Date().toISOString().slice(0, 10) }),
      }).catch(() => undefined);

      const r = await fetch("/api/tasks");
      if (r.ok) {
        setTasks(await r.json());
      }
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
      if (r.ok) {
        toast.success("Activity started!");
        void load();
      }
    } catch {
      toast.error("Network error.");
    }
  }

  // Date boundaries
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const tomorrowStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  }, []);
  const nextWeekStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  }, []);

  // 1. Today tasks: active + due today, not completed
  const todayTasks = useMemo(() => {
    return tasks.filter((t) => {
      const d = t.dueDate ? t.dueDate.slice(0, 10) : todayStr;
      return (d <= todayStr || t.status === "IN_PROGRESS") && t.status !== "COMPLETED";
    });
  }, [tasks, todayStr]);

  // 2. Tomorrow tasks: due tomorrow, not completed
  const tomorrowTasks = useMemo(() => {
    return tasks.filter((t) => {
      const d = t.dueDate ? t.dueDate.slice(0, 10) : "";
      return d === tomorrowStr && t.status !== "COMPLETED";
    });
  }, [tasks, tomorrowStr]);

  // 3. Upcoming 7-day tasks: due next 7 days, not completed
  const weekTasks = useMemo(() => {
    return tasks.filter((t) => {
      const d = t.dueDate ? t.dueDate.slice(0, 10) : "";
      return d > todayStr && d <= nextWeekStr && t.status !== "COMPLETED";
    });
  }, [tasks, todayStr, nextWeekStr]);

  // 4. Completed tasks
  const completedTasks = useMemo(() => {
    return tasks.filter((t) => t.status === "COMPLETED");
  }, [tasks]);

  // Today's progress counts:
  const todayAllCount = useMemo(() => {
    return tasks.filter((t) => {
      const d = t.dueDate ? t.dueDate.slice(0, 10) : todayStr;
      return d <= todayStr || t.status === "IN_PROGRESS";
    }).length;
  }, [tasks, todayStr]);

  const todayCompletedCount = useMemo(() => {
    return tasks.filter((t) => {
      const d = t.dueDate ? t.dueDate.slice(0, 10) : todayStr;
      return (d <= todayStr || t.status === "IN_PROGRESS") && t.status === "COMPLETED";
    }).length;
  }, [tasks, todayStr]);

  const progressPercent = todayAllCount ? Math.round((todayCompletedCount / todayAllCount) * 100) : 0;

  // Active tab tasks
  const scopedTasks = useMemo(() => {
    if (activeTab === "TODAY") return todayTasks;
    if (activeTab === "TOMORROW") return tomorrowTasks;
    if (activeTab === "WEEK") return weekTasks;
    if (activeTab === "COMPLETED") return completedTasks;
    return tasks;
  }, [activeTab, todayTasks, tomorrowTasks, weekTasks, completedTasks, tasks]);

  const filteredTasks = useMemo(() => {
    const q = taskSearch.toLowerCase().trim();
    if (!q) return scopedTasks;
    return scopedTasks.filter((t) => {
      return (
        t.title.toLowerCase().includes(q) ||
        (t.plot?.name && t.plot.name.toLowerCase().includes(q)) ||
        (t.cropCycle?.cropName && t.cropCycle.cropName.toLowerCase().includes(q)) ||
        t.category.toLowerCase().includes(q)
      );
    });
  }, [scopedTasks, taskSearch]);

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 110 }}>
      {/* 1. COMPACT OPERATIONS HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "18px",
              fontWeight: 750,
              color: "var(--ink)",
              letterSpacing: "-0.02em",
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {activeTab === "TODAY"
              ? "Today's Tasks"
              : activeTab === "TOMORROW"
              ? "Tomorrow's Schedule"
              : activeTab === "WEEK"
              ? "7-Day Upcoming"
              : activeTab === "COMPLETED"
              ? "Completed Tasks"
              : "All Operations"}
          </h1>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginTop: 2 }}>
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                backgroundColor: progressPercent === 100 ? "var(--green)" : "var(--amber)",
              }}
            />
            <span className="muted" style={{ fontSize: "11.5px", fontWeight: 550 }}>
              {todayCompletedCount} of {todayAllCount} done ({progressPercent}%)
            </span>
          </div>
        </div>

        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setShowSearch((v) => !v)}
            style={{
              borderRadius: "9999px",
              width: 34,
              height: 34,
              padding: 0,
              display: "grid",
              placeItems: "center",
              backgroundColor: showSearch ? "var(--stone)" : "transparent",
            }}
            title="Search tasks"
          >
            <Icons.Search size={13} />
          </button>

          <button
            type="button"
            className="btn btn-secondary"
            onClick={load}
            style={{
              borderRadius: "9999px",
              width: 34,
              height: 34,
              padding: 0,
              display: "grid",
              placeItems: "center",
            }}
            title="Refresh"
          >
            <Icons.Refresh size={13} />
          </button>

          <button
            type="button"
            className="btn btn-green"
            onClick={() => setShowCreateTaskModal(true)}
            style={{
              borderRadius: "9999px",
              padding: "0 13px",
              fontWeight: 700,
              fontSize: "12px",
              height: 34,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Icons.Plus size={13} />
            <span>Add Task</span>
          </button>
        </div>
      </div>

      {/* Optional Search Bar */}
      {showSearch && (
        <div style={{ position: "relative", width: "100%" }}>
          <input
            type="text"
            placeholder="Search by title, plot, crop…"
            value={taskSearch}
            onChange={(e) => setTaskSearch(e.target.value)}
            autoFocus
            style={{
              width: "100%",
              height: "32px",
              borderRadius: "9999px",
              border: "1px solid var(--line)",
              backgroundColor: "var(--card)",
              padding: "0 28px 0 30px",
              fontSize: "12px",
              color: "var(--ink)",
              outline: "none",
            }}
          />
          <div style={{ position: "absolute", left: 10, top: 9, color: "var(--muted)", pointerEvents: "none" }}>
            <Icons.Search size={12} />
          </div>
          {taskSearch && (
            <button
              type="button"
              onClick={() => setTaskSearch("")}
              style={{
                position: "absolute",
                right: 8,
                top: 6,
                background: "none",
                border: "none",
                color: "var(--muted)",
                cursor: "pointer",
                fontSize: "14px",
                padding: "2px 4px",
              }}
            >
              &times;
            </button>
          )}
        </div>
      )}

      {/* 2. SINGLE HORIZONTAL SCHEDULE PILL RAIL (ONE ROW ONLY!) */}
      <div
        className="schedule-pill-rail"
        style={{
          display: "flex",
          gap: 5,
          overflowX: "auto",
          padding: "2px 0",
          scrollbarWidth: "none",
          WebkitOverflowScrolling: "touch",
        }}
      >
        {[
          { key: "TODAY", label: "Today", count: todayTasks.length },
          { key: "TOMORROW", label: "Tomorrow", count: tomorrowTasks.length },
          { key: "WEEK", label: "7 Days", count: weekTasks.length },
          { key: "COMPLETED", label: "Done", count: completedTasks.length },
          { key: "ALL", label: "All", count: tasks.length },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as any)}
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: active ? 700 : 500,
                borderRadius: "9999px",
                border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
                backgroundColor: active ? "var(--ink)" : "var(--card)",
                color: active ? "var(--canvas)" : "var(--muted)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
                transition: "all 0.12s ease",
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: "10.5px",
                  fontWeight: 700,
                  opacity: active ? 0.9 : 0.6,
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {loading && <CardSkeleton />}

      {/* 3. COMPACT, INFORMATION-DENSE TASK CARDS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredTasks.map((task) => {
          const isDone = task.status === "COMPLETED";
          const isStarted = task.status === "IN_PROGRESS";
          const isMonitoring = task.origin === "DAILY_MONITORING";

          const taskDate = task.dueDate ? task.dueDate.slice(0, 10) : null;
          const isOverdue = taskDate && taskDate < todayStr && !isDone;

          return (
            <article
              key={task.id}
              className={`card officer-task-card${isDone ? " is-done" : ""}`}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 10,
                padding: "8px 12px",
              }}
            >
              <div style={{ display: "flex", gap: 10, alignItems: "center", width: "100%" }}>
                {/* 90x90 SQUARE THUMBNAIL (TAP TO EXPAND PHOTO IF AVAILABLE) */}
                {task.primaryImageUrl ? (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setExpandedPhotoUrl(task.primaryImageUrl!);
                  }}
                  title="Tap to expand photo evidence"
                  style={{
                    position: "relative",
                    width: 90,
                    height: 90,
                    minWidth: 90,
                    maxWidth: 90,
                    borderRadius: "10px",
                    overflow: "hidden",
                    backgroundColor: "var(--stone)",
                    cursor: "zoom-in",
                    flexShrink: 0,
                  }}
                >
                  <img
                    src={task.primaryImageUrl}
                    alt={task.title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      bottom: 5,
                      right: 5,
                      backgroundColor: "rgba(0, 0, 0, 0.65)",
                      color: "#fff",
                      borderRadius: 4,
                      padding: "1px 4px",
                      fontSize: "8.5px",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 2,
                      backdropFilter: "blur(2px)",
                    }}
                  >
                    <Icons.Maximize2 size={9} />
                    {task.media && task.media.length > 1 && <span>{task.media.length}</span>}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    width: 90,
                    height: 90,
                    minWidth: 90,
                    maxWidth: 90,
                    borderRadius: "10px",
                    backgroundColor: isDone ? "rgba(0,0,0,0.04)" : "var(--stone)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 3,
                    flexShrink: 0,
                    border: "1px solid var(--stone)",
                  }}
                >
                  <span style={{ fontSize: "24px" }}>
                    {getCategoryEmoji(task.category, task.origin)}
                  </span>
                  <span
                    style={{
                      fontSize: "9px",
                      fontWeight: 700,
                      color: "var(--muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.03em",
                    }}
                  >
                    {getCategoryShortLabel(task.category)}
                  </span>
                </div>
              )}

              {/* CONTENT & METADATA HIERARCHY */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "flex-start",
                  minHeight: 90,
                  gap: 3,
                  flex: 1,
                  minWidth: 0,
                  padding: "6px 0",
                }}
              >
                {/* Row 1: Plot on Left, Status/Priority on Right */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                  <span
                    style={{
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--green-dark)",
                      backgroundColor: "var(--green-light)",
                      border: "1px solid var(--green-light)",
                      padding: "1px 6px",
                      borderRadius: "6px",
                      maxWidth: "60%",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {task.plot ? task.plot.name.replace(/^Plot:\s*/i, "") : "Main Field"}
                    {task.cropCycle ? ` • ${task.cropCycle.cropName.split(" ")[0]}` : ""}
                  </span>

                  <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                    {task.priority === "URGENT" && !isDone && (
                      <span
                        style={{
                          fontSize: "9.5px",
                          fontWeight: 750,
                          textTransform: "uppercase",
                          color: "var(--red)",
                          backgroundColor: "var(--red-light)",
                          padding: "1px 5px",
                          borderRadius: "9999px",
                        }}
                      >
                        Urgent
                      </span>
                    )}

                    {isStarted ? (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "var(--green-dark)",
                          backgroundColor: "rgba(36, 84, 58, 0.12)",
                          padding: "1px 6px",
                          borderRadius: "9999px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <span className="telemetry-live-dot" style={{ width: 4, height: 4, backgroundColor: "var(--green)" }} />
                        IN PROGRESS
                      </span>
                    ) : isDone ? (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 650,
                          color: "var(--green-dark)",
                          backgroundColor: "var(--green-light)",
                          padding: "1px 6px",
                          borderRadius: "9999px",
                        }}
                      >
                        COMPLETED
                      </span>
                    ) : isOverdue ? (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 700,
                          color: "var(--red)",
                          backgroundColor: "var(--red-light)",
                          padding: "1px 6px",
                          borderRadius: "9999px",
                        }}
                      >
                        Overdue
                      </span>
                    ) : (
                      <span
                        style={{
                          fontSize: "10px",
                          fontWeight: 600,
                          color: "var(--muted)",
                          padding: "1px 4px",
                        }}
                      >
                        {taskDate === todayStr ? "Due Today" : taskDate ? taskDate.slice(5) : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Row 2: Title */}
                <h3
                  style={{
                    fontSize: "13px",
                    fontWeight: 700,
                    color: "var(--ink)",
                    margin: 0,
                    lineHeight: 1.25,
                    letterSpacing: "-0.01em",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  title={task.title}
                >
                  {task.title}
                </h3>

                {/* Row 3: Description */}
                <p
                  style={{
                    margin: 0,
                    fontSize: "11.5px",
                    color: "var(--ink-soft)",
                    lineHeight: 1.3,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {task.description || "Operational agronomy task."}
                </p>

                {/* Row 4: Action Footer */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: "10.5px",
                    color: "var(--muted)",
                  }}
                >
                  <span>
                    {task.origin === "DAILY_MONITORING" ? "Officer Task" : "Prescribed"}
                    {task.instructions ? " • Guidance" : ""}
                  </span>

                  <div style={{ display: "flex", gap: 5, alignItems: "center" }}>
                    {isDone ? (
                      <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--green)" }}>
                        COMPLETED
                      </span>
                    ) : isMonitoring ? (
                      <button
                        type="button"
                        className="btn btn-green"
                        onClick={() => setMonitoringTaskId(task.id)}
                        style={{
                          borderRadius: "9999px",
                          padding: "0 10px",
                          height: 24,
                          fontWeight: 700,
                          fontSize: "11px",
                        }}
                      >
                        Signal
                      </button>
                    ) : isStarted ? (
                      <button
                        type="button"
                        className="btn btn-green"
                        onClick={() => setCompletionId(completionId === task.id ? null : task.id)}
                        style={{
                          borderRadius: "9999px",
                          padding: "0 10px",
                          height: 24,
                          fontWeight: 700,
                          fontSize: "11px",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 3,
                        }}
                      >
                        <Icons.CheckCircle size={11} />
                        <span>Record Completion</span>
                      </button>
                    ) : (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          type="button"
                          className="btn btn-secondary"
                          onClick={() => void start(task.id)}
                          style={{
                            borderRadius: "9999px",
                            padding: "0 8px",
                            height: 22,
                            fontWeight: 650,
                            fontSize: "10.5px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <Icons.Zap size={11} />
                          <span>Start Activity</span>
                        </button>
                        <button
                          type="button"
                          className="btn btn-green"
                          onClick={() => setCompletionId(completionId === task.id ? null : task.id)}
                          style={{
                            borderRadius: "9999px",
                            padding: "0 8px",
                            height: 22,
                            fontWeight: 700,
                            fontSize: "10.5px",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 3,
                          }}
                        >
                          <span>Record Completion</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {completionId === task.id && (
                <div style={{ width: "100%", marginTop: 8, paddingTop: 10, borderTop: "1px solid var(--line)" }}>
                  <TaskCompletionForm
                    taskId={task.id}
                    farmId={task.farm.id}
                    taskTitle={task.title}
                    milestoneName={task.milestone?.name}
                    onComplete={() => {
                      setCompletionId(null);
                      toast.success("Task execution confirmed.");
                      void load();
                    }}
                    onCancel={() => setCompletionId(null)}
                  />
                </div>
              )}
            </article>
          );
        })}

        {!loading && filteredTasks.length === 0 && (
          <EmptyState
            title={activeTab === "TODAY" ? "No Tasks Due Today" : "No Operations Found"}
            description={
              activeTab === "TODAY"
                ? "You are completely up to date! Check tomorrow's schedule or tap '+ Add Task' if work is needed."
                : "No tasks match the active filter or search."
            }
          />
        )}
      </div>

      {/* Monitoring Modal */}
      {monitoringTaskId && (() => {
        const t = tasks.find((item) => item.id === monitoringTaskId);
        if (!t) return null;
        return (
          <div className="modal-overlay" onClick={() => setMonitoringTaskId(null)}>
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
              style={{ maxWidth: 540, borderRadius: "16px", padding: 22 }}
            >
              <FieldReports
                initialFarmId={t.farm.id}
                initialPlotId={t.plot?.id}
                initialCropCycleId={t.cropCycle?.id}
                initialTab="monitoring"
                onSuccess={() => {
                  setMonitoringTaskId(null);
                  toast.success("Crop observations recorded.");
                  void load();
                }}
                onCancel={() => setMonitoringTaskId(null)}
              />
            </div>
          </div>
        );
      })()}

      {/* Create Task Modal */}
      {showCreateTaskModal && (
        <CreateTaskModal
          isOpen={showCreateTaskModal}
          onClose={() => setShowCreateTaskModal(false)}
          onSuccess={() => {
            setShowCreateTaskModal(false);
            toast.success("Operational task created.");
            void load();
          }}
        />
      )}

      {/* Lightbox for Task Evidence Photos */}
      {expandedPhotoUrl && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.9)",
            backdropFilter: "blur(8px)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
            padding: 16,
          }}
          onClick={() => setExpandedPhotoUrl(null)}
        >
          <button
            type="button"
            onClick={() => setExpandedPhotoUrl(null)}
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              width: 36,
              height: 36,
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
              color: "#fff",
              border: "none",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
            }}
            title="Close image"
          >
            <Icons.X size={18} />
          </button>
          <img
            src={expandedPhotoUrl}
            alt="Task evidence"
            style={{
              maxWidth: "92vw",
              maxHeight: "80vh",
              objectFit: "contain",
              borderRadius: "14px",
              boxShadow: "0 10px 30px rgba(0,0,0,0.6)",
            }}
            onClick={(e) => e.stopPropagation()}
          />
          <span style={{ marginTop: 14, color: "rgba(255,255,255,0.75)", fontSize: "12px", fontWeight: 500 }}>
            Tap anywhere to close
          </span>
        </div>
      )}
    </section>
  );
}
