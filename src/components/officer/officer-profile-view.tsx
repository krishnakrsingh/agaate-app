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
              tasksHistory.map((t) => (
                <div
                  key={t.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: "var(--paper)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ fontSize: "14px", color: "var(--ink)" }}>{t.title}</strong>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          backgroundColor:
                            t.priority === "HIGH" || t.priority === "CRITICAL"
                              ? "var(--red-light)"
                              : "var(--stone)",
                          color:
                            t.priority === "HIGH" || t.priority === "CRITICAL"
                              ? "var(--red)"
                              : "var(--ink-soft)",
                        }}
                      >
                        {t.priority}
                      </span>
                    </div>

                    <span style={{ fontSize: "12px", color: "var(--muted)", fontFamily: "var(--font-mono)" }}>
                      {t.completedAt ? new Date(t.completedAt).toLocaleDateString([], { month: "short", day: "numeric" }) : "In progress"}
                    </span>
                  </div>

                  <div className="muted" style={{ fontSize: "12px" }}>
                    {t.farmName} • Plot: {t.plotName} {t.cropName ? `• 🌱 ${t.cropName}` : ""}
                  </div>

                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 2 }}>
                    {t.labourHours > 0 && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "var(--green)",
                          backgroundColor: "var(--green-light)",
                          padding: "2px 7px",
                          borderRadius: "4px",
                        }}
                      >
                        {t.labourHours} labour hrs
                      </span>
                    )}
                    {t.materials && (
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          color: "var(--ink-soft)",
                          backgroundColor: "var(--canvas)",
                          border: "1px solid var(--line)",
                          padding: "2px 7px",
                          borderRadius: "4px",
                        }}
                      >
                        {t.materials}
                      </span>
                    )}
                  </div>

                  {t.remarks && (
                    <div style={{ fontSize: "12px", color: "var(--ink)", fontStyle: "italic", marginTop: 2 }}>
                      &ldquo;{t.remarks}&rdquo;
                    </div>
                  )}
                </div>
              ))
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
              incidentsHistory.map((inc) => (
                <div
                  key={inc.id}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    padding: "12px 14px",
                    borderRadius: "10px",
                    backgroundColor: "var(--paper)",
                    border: "1px solid var(--line)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 700,
                          padding: "2px 6px",
                          borderRadius: "4px",
                          backgroundColor:
                            inc.severity === "CRITICAL" || inc.severity === "HIGH"
                              ? "var(--red-light)"
                              : "var(--amber-light)",
                          color:
                            inc.severity === "CRITICAL" || inc.severity === "HIGH"
                              ? "var(--red)"
                              : "var(--amber)",
                        }}
                      >
                        {inc.severity}
                      </span>
                      <strong style={{ fontSize: "13px", color: "var(--ink)" }}>{inc.type}</strong>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          padding: "1px 6px",
                          borderRadius: "4px",
                          backgroundColor: inc.status === "RESOLVED" ? "var(--green-light)" : "var(--stone)",
                          color: inc.status === "RESOLVED" ? "var(--green)" : "var(--ink-soft)",
                        }}
                      >
                        {inc.status}
                      </span>
                      <span style={{ fontSize: "12px", color: "var(--muted)" }}>{inc.date}</span>
                    </div>
                  </div>

                  <p style={{ margin: 0, fontSize: "13px", color: "var(--ink)", lineHeight: 1.4 }}>
                    {inc.description}
                  </p>

                  <div className="muted" style={{ fontSize: "12px", display: "flex", gap: 12, alignItems: "center" }}>
                    <span>{inc.farmName} • Plot: {inc.plotName}</span>
                    {inc.photosCount > 0 && (
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                        <Icons.Camera size={12} />
                        {inc.photosCount} {inc.photosCount === 1 ? "photo" : "photos"}
                      </span>
                    )}
                  </div>
                </div>
              ))
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
    </div>
  );
}
