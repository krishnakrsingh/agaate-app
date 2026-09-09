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
  id: string;
  title: string;
  description: string;
  instructions: string | null;
  priority: string;
  category?: string;
  status: string;
  origin: string;
  dueDate: string;
  farm: { id: string; name: string };
  plot: { name: string } | null;
  cropCycle: { cropName: string } | null;
  assignedOfficer: { name: string } | null;
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
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);

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

          <div
            className="schedule-pill-rail"
            style={{
              display: "flex",
              gap: 5,
              overflowX: "auto",
              padding: "2px 0",
              scrollbarWidth: "none",
            }}
          >
            {[
              { key: "ALL", label: "All Tasks", count: tasks.length },
              { key: "PENDING", label: "Pending", count: tasks.filter((t) => t.status === "PENDING" || t.status === "ASSIGNED" || t.status === "AVAILABLE").length },
              { key: "IN_PROGRESS", label: "In Progress", count: tasks.filter((t) => t.status === "IN_PROGRESS").length },
              { key: "COMPLETED", label: "Completed", count: tasks.filter((t) => t.status === "COMPLETED").length },
            ].map((tab) => {
              const active = statusFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatusFilter(tab.key)}
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
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {filteredTasks.map((t) => {
          const isDone = t.status === "COMPLETED";
          const isStarted = t.status === "IN_PROGRESS";
          const isUrgent = t.priority === "URGENT" || t.priority === "HIGH";

          return (
            <article
              key={t.id}
              className="officer-task-card"
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 0,
                borderRadius: "14px",
                border: isStarted
                  ? "1.5px solid var(--green)"
                  : isUrgent && !isDone
                  ? "1.5px solid var(--amber-light, #fef3c7)"
                  : "1px solid var(--line)",
                backgroundColor: isDone ? "var(--stone)" : "var(--canvas)",
                boxShadow: "var(--shadow-sm)",
                opacity: isDone ? 0.8 : 1,
                transition: "all 0.15s ease",
                overflow: "hidden",
              }}
            >
              {/* Main Card Row: 90x90 Thumbnail on Left, Metadata on Right */}
              <div
                style={{
                  display: "flex",
                  gap: 10,
                  padding: "4px 12px 4px 4px",
                  alignItems: "center",
                }}
              >
                {/* 90x90 SQUARE THUMBNAIL (TAP TO EXPAND IF PHOTO) */}
                {t.primaryImageUrl ? (
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedPhotoUrl(t.primaryImageUrl!);
                    }}
                    title="Tap to expand evidence photo"
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
                      src={t.primaryImageUrl}
                      alt={t.title}
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
                      {t.media && t.media.length > 1 && <span>{t.media.length}</span>}
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
                      border: "1px solid var(--line)",
                    }}
                  >
                    <span style={{ fontSize: "24px" }}>
                      {getCategoryEmoji(t.category, t.origin)}
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
                      {getCategoryShortLabel(t.category)}
                    </span>
                  </div>
                )}

                {/* CONTENT & METADATA HIERARCHY */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    height: 90,
                    gap: 2,
                    flex: 1,
                    minWidth: 0,
                  }}
                >
                  {/* Row 1: Plot/Estate on Left, Status/Priority on Right */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        color: "var(--green-dark)",
                        backgroundColor: "var(--green-light)",
                        padding: "1px 6px",
                        borderRadius: "6px",
                        maxWidth: "60%",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {t.plot?.name ? t.plot.name.replace(/^Plot:\s*/i, "") : t.farm.name}
                      {t.cropCycle ? ` • ${t.cropCycle.cropName.split(" ")[0]}` : ""}
                    </span>

                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                      <StatusBadge status={t.status} />
                      <PriorityBadge priority={t.priority} />
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
                    title={t.title}
                  >
                    {t.title}
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
                    {t.description || t.instructions || "Agronomy operational activity."}
                  </p>

                  {/* Row 4: Assignee / Due date + Edit Trigger */}
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
                      Assignee: <strong style={{ color: "var(--ink)" }}>{t.assignedOfficer?.name ?? "Unassigned"}</strong>
                      {" • "}Due: {new Date(t.dueDate).toLocaleDateString([], { month: "short", day: "numeric" })}
                    </span>

                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditingId(editingId === t.id ? null : t.id)}
                      style={{
                        borderRadius: "9999px",
                        padding: "0 9px",
                        height: 22,
                        fontSize: "10.5px",
                        fontWeight: 650,
                      }}
                    >
                      {editingId === t.id ? "Close" : "Edit"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Inline Edit Drawer */}
              {editingId === t.id && (
                <form
                  onSubmit={(e) => save(e, t)}
                  style={{
                    background: "var(--stone)",
                    padding: "14px 16px",
                    borderTop: "1px solid var(--line)",
                    display: "grid",
                    gap: 10,
                  }}
                >
                  <div className="two-column">
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Title</label>
                      <input name="title" defaultValue={t.title} required style={{ height: 32, fontSize: 12 }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Due Date</label>
                      <input name="dueDate" type="date" defaultValue={t.dueDate?.slice(0, 10)} required style={{ height: 32, fontSize: 12 }} />
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Priority</label>
                      <select name="priority" defaultValue={t.priority} style={{ height: 32, fontSize: 12 }}>
                        <option value="LOW">Low</option>
                        <option value="MEDIUM">Medium</option>
                        <option value="HIGH">High</option>
                        <option value="URGENT">Urgent</option>
                      </select>
                    </div>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Status</label>
                      <select name="status" defaultValue={t.status} style={{ height: 32, fontSize: 12 }}>
                        <option value="PENDING">Pending</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                    </div>
                    <div className="form-group wide" style={{ margin: 0 }}>
                      <label style={{ fontSize: 11 }}>Instructions / Guidance</label>
                      <textarea name="instructions" defaultValue={t.instructions || ""} rows={2} style={{ fontSize: 12 }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={() => setEditingId(null)}
                      style={{ borderRadius: "9999px", height: 28, fontSize: 11, padding: "0 12px" }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary"
                      style={{ borderRadius: "9999px", height: 28, fontSize: 11, padding: "0 14px" }}
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              )}
            </article>
          );
        })}

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
