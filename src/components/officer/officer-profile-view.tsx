"use client";

import { useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { ThemeToggle } from "@/components/theme-toggle";

export interface ShiftRecord {
  id: string;
  farmName: string;
  date: string;
  startAt: string | null;
  endAt: string | null;
  durationMinutes: number | null;
  status: string;
  insideGeofence: boolean;
  exceptionReason: string | null;
}

export interface TaskRecord {
  id: string;
  taskId: string;
  title: string;
  priority: string;
  category: string;
  status: string;
  farmName: string;
  plotName: string;
  cropName: string | null;
  completedAt: string | null;
  startedAt: string | null;
  remarks: string | null;
  primaryImageUrl?: string | null;
  labourHours: number;
  materials: string;
}

export interface IncidentRecord {
  id: string;
  date: string;
  createdAt: string;
  severity: string;
  type: string;
  level: string;
  status: string;
  description: string;
  farmName: string;
  plotName: string;
  cropName: string | null;
  photosCount: number;
  primaryImageUrl?: string | null;
}

function getCategoryEmoji(cat: string) {
  switch (cat) {
    case "FERTIGATION":
    case "FOLIAR_NUTRITION":
      return "💧";
    case "PREVENTIVE_SPRAY":
    case "PEST_CONTROL":
    case "DISEASE_CONTROL":
      return "🌿";
    case "IRRIGATION_RECOMMENDATION":
      return "💦";
    case "CROP_MONITORING":
      return "🔍";
    case "CULTURAL_PRACTICE":
      return "🌱";
    default:
      return "🚜";
  }
}

function getCategoryShortLabel(cat: string) {
  switch (cat) {
    case "FERTIGATION": return "Fertigate";
    case "FOLIAR_NUTRITION": return "Foliar";
    case "SOIL_APPLICATION": return "Soil App";
    case "PREVENTIVE_SPRAY": return "Spray";
    case "PEST_CONTROL": return "Pest Ctrl";
    case "DISEASE_CONTROL": return "Disease";
    case "CROP_MONITORING": return "Scouting";
    case "IRRIGATION_RECOMMENDATION": return "Irrigate";
    case "CULTURAL_PRACTICE": return "Field Work";
    default: return "Activity";
  }
}

interface OfficerProfileProps {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    role: string;
    createdAt: string;
  };
  farm: {
    id: string;
    name: string;
    location: string;
    totalArea: number;
    cultivableArea: number;
    geofenceRadiusMeters: number;
    plotsCount: number;
  } | null;
  stats: {
    totalShifts: number;
    totalHoursLogged: number;
    completedTasks: number;
    reportedIncidents: number;
  };
  todayAttendance: {
    id: string;
    status: string;
    startAt: string;
    endAt: string | null;
    durationMinutes: number | null;
    isInsideGeofence: boolean;
    selfieUrl: string | null;
  } | null;
  shiftsHistory: ShiftRecord[];
  tasksHistory: TaskRecord[];
  incidentsHistory: IncidentRecord[];
}

export function OfficerProfileView({
  user,
  farm,
  stats,
  todayAttendance,
  shiftsHistory,
  tasksHistory,
  incidentsHistory,
}: OfficerProfileProps) {
  const [loggingOut, setLoggingOut] = useState(false);
  const [activeHistoryTab, setActiveHistoryTab] = useState<"shifts" | "tasks" | "incidents">("shifts");
  const [expandedPhotoUrl, setExpandedPhotoUrl] = useState<string | null>(null);

  const initials = user.name ? user.name.trim().charAt(0).toUpperCase() : "O";
  const isShiftActive = todayAttendance && !todayAttendance.endAt;

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      window.location.href = "/login";
    }
  };

  const formatMins = (mins: number | null) => {
    if (mins === null) return "In Progress";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 1. HERO IDENTITY CARD */}
      <div
        className="card"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: "20px",
          borderRadius: "14px",
          background: "var(--canvas)",
          border: "1px solid var(--line)",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div
          style={{
            position: "relative",
            width: 58,
            height: 58,
            borderRadius: "50%",
            background: "var(--green-light)",
            color: "var(--green-dark)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "24px",
            fontWeight: 800,
            flexShrink: 0,
          }}
        >
          {initials}
          <span
            style={{
              position: "absolute",
              bottom: 2,
              right: 2,
              width: 12,
              height: 12,
              borderRadius: "50%",
              backgroundColor: isShiftActive ? "var(--green)" : "var(--muted)",
              border: "2px solid var(--canvas)",
            }}
          />
        </div>

        <div style={{ minWidth: 0, flex: "1 1 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: "19px", fontWeight: 750, color: "var(--ink)" }}>
              {user.name}
            </h2>
            <span
              style={{
                fontSize: "11px",
                fontWeight: 700,
                color: "var(--green)",
                backgroundColor: "var(--green-light)",
                padding: "2px 8px",
                borderRadius: "6px",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              Farm Officer
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 14,
              flexWrap: "wrap",
              marginTop: 6,
              fontSize: "13px",
              color: "var(--muted)",
            }}
          >
            <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icons.FileText size={13} />
              {user.email}
            </span>
            {user.phone && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                <Icons.Activity size={13} />
                {user.phone}
              </span>
            )}
            {farm && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 5, color: "var(--ink-soft)" }}>
                <Icons.Farm size={13} style={{ color: "var(--green)" }} />
                <strong>{farm.name}</strong>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. TODAY'S SHIFT STATUS BAR */}
      <div
        className="card"
        style={{
          padding: "12px 16px",
          borderRadius: "10px",
          background: "var(--canvas)",
          border: "1px solid var(--line)",
          borderLeft: isShiftActive ? "3px solid var(--green)" : "3px solid var(--muted)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            className="telemetry-live-dot"
            style={{
              width: 8,
              height: 8,
              backgroundColor: isShiftActive ? "var(--green)" : "var(--muted)",
            }}
          />
          <strong style={{ fontSize: "13px", color: "var(--ink)" }}>
            {isShiftActive ? "Active Shift In Progress" : todayAttendance ? "Today's Shift Completed" : "Off-Duty (Shift Not Started)"}
          </strong>
          {todayAttendance?.startAt && (
            <span className="muted" style={{ fontSize: "12px" }}>
              • Clocked in at {new Date(todayAttendance.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          )}
        </div>

        <div>
          {isShiftActive ? (
            <Link
              href="/officer/day"
              className="btn btn-secondary btn-sm"
              style={{ fontSize: "12px", height: "30px", padding: "4px 12px", borderRadius: "6px" }}
            >
              Go to Day Desk
            </Link>
          ) : !todayAttendance ? (
            <Link
              href="/officer/day"
              className="btn btn-green btn-sm"
              style={{ fontSize: "12px", height: "30px", padding: "4px 12px", borderRadius: "6px" }}
            >
              Start Shift
            </Link>
          ) : null}
        </div>
      </div>

      {/* 3. OPERATIONAL METRIC TILES */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
          gap: 10,
        }}
      >
        <div
          className="card"
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            background: "var(--canvas)",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Shifts Worked
          </span>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
            {stats.totalShifts}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            background: "var(--canvas)",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Field Hours Logged
          </span>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--green)", fontFamily: "var(--font-mono)" }}>
            {stats.totalHoursLogged} <span style={{ fontSize: "13px", fontWeight: 600 }}>hrs</span>
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            background: "var(--canvas)",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Tasks Completed
          </span>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
            {stats.completedTasks}
          </div>
        </div>

        <div
          className="card"
          style={{
            padding: "14px 16px",
            borderRadius: "12px",
            background: "var(--canvas)",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <span style={{ fontSize: "11px", fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>
            Hazards Flagged
          </span>
          <div style={{ fontSize: "22px", fontWeight: 800, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
            {stats.reportedIncidents}
          </div>
        </div>
      </div>

      {/* 4. SEGMENTED OPERATIONAL HISTORY CONSOLE */}
      <div
        className="card"
        style={{
          padding: "18px 20px",
          borderRadius: "14px",
          background: "var(--canvas)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 750, color: "var(--ink)" }}>
              Operational History Ledger
            </h3>
            <p className="muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
              Verified logs of shifts, completed operations, and submitted hazard reports.
            </p>
          </div>

          {/* Subtab Switcher */}
          <div
            style={{
              display: "inline-flex",
              gap: 3,
              backgroundColor: "var(--stone)",
              padding: 3,
              borderRadius: "9999px",
              border: "1px solid var(--line)",
            }}
          >
            <button
              type="button"
              onClick={() => setActiveHistoryTab("shifts")}
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: activeHistoryTab === "shifts" ? 700 : 500,
                color: activeHistoryTab === "shifts" ? "var(--ink)" : "var(--muted)",
                backgroundColor: activeHistoryTab === "shifts" ? "#FFFFFF" : "transparent",
                borderRadius: "9999px",
                border: "none",
                boxShadow: activeHistoryTab === "shifts" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                cursor: "pointer",
              }}
            >
              Shifts ({shiftsHistory.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveHistoryTab("tasks")}
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: activeHistoryTab === "tasks" ? 700 : 500,
                color: activeHistoryTab === "tasks" ? "var(--ink)" : "var(--muted)",
                backgroundColor: activeHistoryTab === "tasks" ? "#FFFFFF" : "transparent",
                borderRadius: "9999px",
                border: "none",
                boxShadow: activeHistoryTab === "tasks" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                cursor: "pointer",
              }}
            >
              Tasks ({tasksHistory.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveHistoryTab("incidents")}
              style={{
                padding: "5px 12px",
                fontSize: "12px",
                fontWeight: activeHistoryTab === "incidents" ? 700 : 500,
                color: activeHistoryTab === "incidents" ? "var(--ink)" : "var(--muted)",
                backgroundColor: activeHistoryTab === "incidents" ? "#FFFFFF" : "transparent",
                borderRadius: "9999px",
                border: "none",
                boxShadow: activeHistoryTab === "incidents" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                cursor: "pointer",
              }}
            >
              Incidents ({incidentsHistory.length})
            </button>
          </div>
        </div>

        {/* TAB 1: SHIFTS HISTORY */}
        {activeHistoryTab === "shifts" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {shiftsHistory.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                No attendance shifts recorded yet.
              </div>
            ) : (
              shiftsHistory.map((s) => (
                <div
                  key={s.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: "var(--paper)",
                    border: "1px solid var(--line)",
                    flexWrap: "wrap",
                    gap: 10,
                  }}
                >
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{s.date}</strong>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 7px",
                          borderRadius: "4px",
                          backgroundColor: s.insideGeofence ? "var(--green-light)" : "var(--amber-light)",
                          color: s.insideGeofence ? "var(--green)" : "var(--amber)",
                        }}
                      >
                        {s.insideGeofence ? "Verified Inside" : "Exception Requested"}
                      </span>
                    </div>
                    <div className="muted" style={{ fontSize: "12px", marginTop: 3 }}>
                      {s.farmName} • {s.startAt ? new Date(s.startAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—"} to{" "}
                      {s.endAt ? new Date(s.endAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Active"}
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "13px",
                        fontWeight: 700,
                        color: "var(--ink)",
                        backgroundColor: "var(--canvas)",
                        padding: "3px 10px",
                        borderRadius: "6px",
                        border: "1px solid var(--line)",
                      }}
                    >
                      {formatMins(s.durationMinutes)}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: TASKS HISTORY */}
        {activeHistoryTab === "tasks" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {tasksHistory.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                No completed tasks recorded yet.
              </div>
            ) : (
              tasksHistory.map((t) => {
                const isCompleted = t.status === "COMPLETED";
                return (
                  <div
                    key={t.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "4px 12px 4px 4px",
                      borderRadius: "14px",
                      border: "1px solid var(--line)",
                      backgroundColor: isCompleted ? "var(--stone)" : "var(--canvas)",
                      boxShadow: "var(--shadow-sm)",
                      alignItems: "center",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {/* SQUARE IMAGE THUMBNAIL (TAP TO EXPAND) */}
                    {t.primaryImageUrl ? (
                      <div
                        onClick={() => setExpandedPhotoUrl(t.primaryImageUrl!)}
                        title="Tap to expand photo"
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
                          backgroundColor: "rgba(0,0,0,0.04)",
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
                          {getCategoryEmoji(t.category)}
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
                      {/* Row 1: Plot/Crop on Left, Status/Priority on Right */}
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
                          {t.plotName ? t.plotName.replace(/^Plot:\s*/i, "") : t.farmName}
                          {t.cropName ? ` • ${t.cropName.split(" ")[0]}` : ""}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          {t.priority === "HIGH" || t.priority === "CRITICAL" || t.priority === "URGENT" ? (
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
                              {t.priority}
                            </span>
                          ) : null}

                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 650,
                              padding: "1px 6px",
                              borderRadius: "9999px",
                              color: isCompleted ? "var(--green-dark)" : "var(--muted)",
                              backgroundColor: isCompleted ? "var(--green-light)" : "rgba(0,0,0,0.04)",
                            }}
                          >
                            {isCompleted ? "✓ Completed" : t.status}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Title */}
                      <h4
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
                      </h4>

                      {/* Row 3: Remarks or description clamp */}
                      <p
                        style={{
                          margin: 0,
                          fontSize: "11px",
                          color: t.remarks ? "var(--ink)" : "var(--ink-soft)",
                          lineHeight: 1.25,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                          fontStyle: t.remarks ? "italic" : "normal",
                        }}
                      >
                        {t.remarks ? `“${t.remarks}”` : `${t.farmName} • Completed field operation`}
                      </p>

                      {/* Row 4: Footer metrics */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "10.5px",
                          color: "var(--muted)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0, overflow: "hidden" }}>
                          {t.labourHours > 0 && (
                            <span style={{ fontWeight: 600, color: "var(--green-dark)", flexShrink: 0 }}>
                              {t.labourHours} hrs
                            </span>
                          )}
                          {t.materials && (
                            <span style={{ maxWidth: 130, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              {t.materials}
                            </span>
                          )}
                        </div>

                        <span style={{ flexShrink: 0, fontFamily: "var(--font-mono)" }}>
                          {t.completedAt ? new Date(t.completedAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "—"}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* TAB 3: INCIDENTS HISTORY */}
        {activeHistoryTab === "incidents" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {incidentsHistory.length === 0 ? (
              <div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: "13px" }}>
                No field hazards or incidents reported by you yet.
              </div>
            ) : (
              incidentsHistory.map((inc) => {
                const isResolved = inc.status === "RESOLVED" || inc.status === "CLOSED";
                const isCritical = inc.severity === "CRITICAL";
                const isHigh = inc.severity === "HIGH";

                return (
                  <div
                    key={inc.id}
                    style={{
                      display: "flex",
                      gap: 10,
                      padding: "4px 12px 4px 4px",
                      borderRadius: "14px",
                      border: isCritical && !isResolved ? "1.5px solid var(--red-light, #fee2e2)" : "1px solid var(--line)",
                      backgroundColor: isResolved ? "var(--stone)" : "var(--canvas)",
                      boxShadow: "var(--shadow-sm)",
                      alignItems: "center",
                      transition: "all 0.12s ease",
                    }}
                  >
                    {/* SQUARE IMAGE THUMBNAIL (TAP TO EXPAND) */}
                    {inc.primaryImageUrl ? (
                      <div
                        onClick={() => setExpandedPhotoUrl(inc.primaryImageUrl!)}
                        title="Tap to expand photo"
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
                          src={inc.primaryImageUrl}
                          alt={inc.type}
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
                          {inc.photosCount > 1 && <span>{inc.photosCount}</span>}
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
                          backgroundColor: "var(--stone)",
                          display: "flex",
                          flexDirection: "column",
                          alignItems: "center",
                          justifyContent: "center",
                          gap: 3,
                          color: "var(--muted)",
                          flexShrink: 0,
                          border: "1px solid var(--line)",
                        }}
                      >
                        <Icons.AlertTriangle size={18} style={{ opacity: 0.45 }} />
                        <span style={{ fontSize: "9px", fontWeight: 600 }}>No Photo</span>
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
                      {/* Row 1: Plot/Crop on Left, Severity + Status on Right */}
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
                          {inc.plotName ? inc.plotName.replace(/^Plot:\s*/i, "") : inc.farmName}
                          {inc.cropName ? ` • ${inc.cropName.split(" ")[0]}` : ""}
                        </span>

                        <div style={{ display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
                          {isCritical ? (
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
                              Critical
                            </span>
                          ) : isHigh ? (
                            <span
                              style={{
                                fontSize: "9.5px",
                                fontWeight: 750,
                                textTransform: "uppercase",
                                color: "var(--amber)",
                                backgroundColor: "var(--amber-light)",
                                padding: "1px 5px",
                                borderRadius: "9999px",
                              }}
                            >
                              High
                            </span>
                          ) : null}

                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: 650,
                              padding: "1px 6px",
                              borderRadius: "9999px",
                              color: isResolved ? "var(--green-dark)" : "var(--muted)",
                              backgroundColor: isResolved ? "var(--green-light)" : "rgba(0,0,0,0.04)",
                            }}
                          >
                            {isResolved ? "✓ Resolved" : inc.status}
                          </span>
                        </div>
                      </div>

                      {/* Row 2: Type/Title */}
                      <h4
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
                      >
                        {inc.type}
                      </h4>

                      {/* Row 3: Description 2-line clamp */}
                      <p
                        style={{
                          margin: 0,
                          fontSize: "11px",
                          color: "var(--ink-soft)",
                          lineHeight: 1.25,
                          display: "-webkit-box",
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: "vertical",
                          overflow: "hidden",
                        }}
                      >
                        {inc.description}
                      </p>

                      {/* Row 4: Footer */}
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          fontSize: "10.5px",
                          color: "var(--muted)",
                        }}
                      >
                        <span>{inc.farmName}</span>
                        <span style={{ fontFamily: "var(--font-mono)" }}>{inc.date}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* 5. ASSIGNED ESTATE SPECIFICATIONS */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          borderRadius: "14px",
          background: "var(--canvas)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 750,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--green)",
          }}
        >
          Assigned Estate Specifications
        </span>

        {farm ? (
          <div>
            <div style={{ fontSize: "16px", fontWeight: 700, color: "var(--ink)" }}>{farm.name}</div>
            <div style={{ fontSize: "13px", color: "var(--muted)", marginTop: 2 }}>{farm.location}</div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))",
                gap: 8,
                marginTop: 12,
              }}
            >
              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>Cultivable Area</div>
                <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--ink)" }}>
                  {farm.cultivableArea} ac
                </div>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>Total Plots</div>
                <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--ink)" }}>
                  {farm.plotsCount}
                </div>
              </div>

              <div
                style={{
                  padding: "8px 12px",
                  borderRadius: "8px",
                  background: "var(--paper)",
                  border: "1px solid var(--line)",
                }}
              >
                <div style={{ fontSize: "11px", color: "var(--muted)" }}>Geofence Radius</div>
                <div style={{ fontSize: "14px", fontWeight: 750, color: "var(--ink)" }}>
                  {farm.geofenceRadiusMeters}m
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ fontSize: "13px", color: "var(--muted)" }}>
            No estate currently linked to your account. Contact Agaate Admin.
          </div>
        )}
      </div>

      {/* 6. APP TOOLS, APPEARANCE & SECURITY */}
      <div
        className="card"
        style={{
          padding: "16px 20px",
          borderRadius: "14px",
          background: "var(--canvas)",
          border: "1px solid var(--line)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <span
          style={{
            fontSize: "11px",
            fontWeight: 750,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--green)",
          }}
        >
          Tools &amp; Settings
        </span>

        {/* Direct Link to Harvest & Crew Logger */}
        <Link
          href="/officer/harvest"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "10px 14px",
            borderRadius: "10px",
            backgroundColor: "var(--paper)",
            border: "1px solid var(--line)",
            textDecoration: "none",
            color: "var(--ink)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Icons.Truck size={16} style={{ color: "var(--green)" }} />
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>Field Harvest &amp; Crew Logger</div>
              <div style={{ fontSize: "12px", color: "var(--muted)" }}>Record tonnage cuttings and labor muster</div>
            </div>
          </div>
          <Icons.ChevronRight size={14} style={{ color: "var(--muted)" }} />
        </Link>

        {/* Display Appearance */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "8px 0",
            borderBottom: "1px solid var(--line)",
          }}
        >
          <div>
            <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--ink)" }}>Display Appearance</div>
            <div style={{ fontSize: "12px", color: "var(--muted)" }}>Toggle light or dark high-contrast mode</div>
          </div>
          <ThemeToggle />
        </div>

        {/* Secure Sign Out */}
        <button
          type="button"
          onClick={handleSignOut}
          disabled={loggingOut}
          style={{
            marginTop: 6,
            width: "100%",
            height: "42px",
            borderRadius: "10px",
            border: "1px solid rgba(220, 38, 38, 0.2)",
            backgroundColor: "var(--red-light)",
            color: "var(--red)",
            fontWeight: 700,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
          }}
        >
          <Icons.LogOut size={15} />
          <span>{loggingOut ? "Signing Out…" : "Secure Sign Out"}</span>
        </button>
      </div>

      {/* FULL-SCREEN PHOTO LIGHTBOX MODAL */}
      {expandedPhotoUrl && (
        <div
          onClick={() => setExpandedPhotoUrl(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0, 0, 0, 0.92)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
            backdropFilter: "blur(4px)",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: "92vw",
              maxHeight: "88vh",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <button
              type="button"
              onClick={() => setExpandedPhotoUrl(null)}
              style={{
                position: "absolute",
                top: -42,
                right: 0,
                backgroundColor: "rgba(255, 255, 255, 0.2)",
                color: "#fff",
                border: "none",
                borderRadius: "9999px",
                width: 34,
                height: 34,
                display: "grid",
                placeItems: "center",
                cursor: "pointer",
                transition: "background-color 0.15s",
              }}
              title="Close image view"
            >
              <Icons.X size={18} />
            </button>
            <img
              src={expandedPhotoUrl}
              alt="Expanded evidence photo"
              style={{
                maxWidth: "92vw",
                maxHeight: "84vh",
                borderRadius: "12px",
                objectFit: "contain",
                boxShadow: "0 20px 40px rgba(0, 0, 0, 0.6)",
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
