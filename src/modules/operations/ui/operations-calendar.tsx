"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

export interface CalendarTask {
  id: string;
  farmId: string;
  plotName: string;
  cropName: string | null;
  title: string;
  description: string;
  instructions?: string | null;
  category: string;
  priority: string;
  status: string;
  dueDate: string; // YYYY-MM-DD
  assignedOfficer: {
    id: string;
    name: string;
    phone: string | null;
  } | null;
  executions: {
    id: string;
    status: string;
    completedAt: string | null;
    remarks: string | null;
    labourHours: number;
    materials: string;
  }[];
}

export interface CalendarIncident {
  id: string;
  farmId: string;
  plotName: string;
  cropName: string | null;
  level: string;
  type: string;
  description: string;
  severity: string;
  impactPercent: number | null;
  status: string;
  date: string; // YYYY-MM-DD
  createdAt: string;
  reporter: {
    id: string;
    name: string;
    phone: string | null;
  };
}

export interface CalendarHarvest {
  id: string;
  farmId: string;
  plotName: string;
  cropName: string;
  date: string; // YYYY-MM-DD
  quantity: number;
  unit: string;
  grade: string;
  buyerOrMarket?: string | null;
  totalAmount?: number | null;
}

export interface CalendarEventsData {
  tasks: CalendarTask[];
  incidents: CalendarIncident[];
  harvests: CalendarHarvest[];
}

export interface FarmOption {
  id: string;
  name: string;
  location?: string | null;
}

interface OperationsCalendarProps {
  initialFarm: FarmOption;
  farms: FarmOption[];
  initialEvents: CalendarEventsData;
  initialYear: number;
  initialMonth: number;
}

export function OperationsCalendar({
  initialFarm,
  farms,
  initialEvents,
  initialYear,
  initialMonth,
}: OperationsCalendarProps) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(initialFarm.id);
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth); // 1-12
  const [events, setEvents] = useState<CalendarEventsData>(initialEvents);
  const [loading, setLoading] = useState(false);

  // Default to today
  const todayStr = useMemo(() => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  }, []);

  const [selectedDateStr, setSelectedDateStr] = useState<string>(todayStr);
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [filterType, setFilterType] = useState<"all" | "tasks" | "incidents" | "harvests">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch events when month, year or farm changes (skip on first mount if unchanged)
  useEffect(() => {
    if (year === initialYear && month === initialMonth && selectedFarmId === initialFarm.id) {
      return;
    }

    let isMounted = true;
    async function loadEvents() {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/calendar/events?farmId=${selectedFarmId}&year=${year}&month=${month}`
        );
        if (!res.ok) throw new Error("Failed to load operations schedule");
        const data = await res.json();
        if (isMounted) {
          setEvents(data);
        }
      } catch (err: any) {
        if (isMounted) {
          toast.show(err.message || "Failed to load calendar events", "error");
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadEvents();
    return () => {
      isMounted = false;
    };
  }, [year, month, selectedFarmId, initialYear, initialMonth, initialFarm.id, toast]);

  // Navigate months
  const handlePrevMonth = () => {
    if (month === 1) {
      setYear((y) => y - 1);
      setMonth(12);
    } else {
      setMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (month === 12) {
      setYear((y) => y + 1);
      setMonth(1);
    } else {
      setMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    const d = new Date();
    setYear(d.getFullYear());
    setMonth(d.getMonth() + 1);
    setSelectedDateStr(todayStr);
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  // Group events by date string (YYYY-MM-DD)
  const eventsByDate = useMemo(() => {
    const map = new Map<string, { tasks: CalendarTask[]; incidents: CalendarIncident[]; harvests: CalendarHarvest[] }>();

    events.tasks.forEach((t) => {
      const list = map.get(t.dueDate) || { tasks: [], incidents: [], harvests: [] };
      list.tasks.push(t);
      map.set(t.dueDate, list);
    });

    events.incidents.forEach((i) => {
      const list = map.get(i.date) || { tasks: [], incidents: [], harvests: [] };
      list.incidents.push(i);
      map.set(i.date, list);
    });

    events.harvests.forEach((h) => {
      const list = map.get(h.date) || { tasks: [], incidents: [], harvests: [] };
      list.harvests.push(h);
      map.set(h.date, list);
    });

    return map;
  }, [events]);

  // Build grid of days
  const calendarCells = useMemo(() => {
    const firstDayOfMonth = new Date(year, month - 1, 1);
    const lastDayOfMonth = new Date(year, month, 0);

    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    const prevMonthLastDay = new Date(year, month - 1, 0).getDate();
    const cells = [];

    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthLastDay - i;
      const prevM = month === 1 ? 12 : month - 1;
      const prevY = month === 1 ? year - 1 : year;
      const dateStr = `${prevY}-${String(prevM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
      });
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    const totalCellsNeeded = cells.length > 35 ? 42 : 35;
    const remaining = totalCellsNeeded - cells.length;
    for (let d = 1; d <= remaining; d++) {
      const nextM = month === 12 ? 1 : month + 1;
      const nextY = month === 12 ? year + 1 : year;
      const dateStr = `${nextY}-${String(nextM).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [year, month]);

  const weekCells = useMemo(() => {
    const selected = new Date(selectedDateStr + "T00:00:00");
    const dayOfWeek = selected.getDay();
    const diff = (dayOfWeek + 6) % 7;
    const monday = new Date(selected);
    monday.setDate(selected.getDate() - diff);

    const week = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      const dateStr = `${y}-${m}-${day}`;
      week.push({
        dayNumber: d.getDate(),
        dateStr,
        isCurrentMonth: d.getMonth() + 1 === month,
      });
    }
    return week;
  }, [selectedDateStr, month]);

  const activeCells = viewMode === "month" ? calendarCells : weekCells;

  const selectedDayEvents = useMemo(() => {
    const dayData = eventsByDate.get(selectedDateStr) || { tasks: [], incidents: [], harvests: [] };
    const q = searchQuery.toLowerCase().trim();

    const filteredTasks = dayData.tasks.filter((t) => {
      if (!q) return true;
      return (
        t.title.toLowerCase().includes(q) ||
        t.plotName.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        (t.assignedOfficer?.name && t.assignedOfficer.name.toLowerCase().includes(q))
      );
    });

    const filteredIncidents = dayData.incidents.filter((i) => {
      if (!q) return true;
      return (
        i.type.toLowerCase().includes(q) ||
        i.description.toLowerCase().includes(q) ||
        i.plotName.toLowerCase().includes(q) ||
        i.reporter.name.toLowerCase().includes(q)
      );
    });

    const filteredHarvests = dayData.harvests.filter((h) => {
      if (!q) return true;
      return (
        h.cropName.toLowerCase().includes(q) ||
        h.plotName.toLowerCase().includes(q) ||
        (h.buyerOrMarket && h.buyerOrMarket.toLowerCase().includes(q))
      );
    });

    return {
      tasks: filteredTasks,
      incidents: filteredIncidents,
      harvests: filteredHarvests,
      totalCount: filteredTasks.length + filteredIncidents.length + filteredHarvests.length,
    };
  }, [eventsByDate, selectedDateStr, searchQuery]);

  const formattedSelectedDate = useMemo(() => {
    try {
      const parts = selectedDateStr.split("-").map(Number);
      const d = new Date(parts[0], parts[1] - 1, parts[2]);
      return d.toLocaleDateString("en-US", {
        weekday: "long",
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return selectedDateStr;
    }
  }, [selectedDateStr]);

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {/* ── Top Header: line-first, not a card ── */}
      <div
        className="page-header"
        style={{ paddingBottom: 16 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 42,
              height: 42,
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--stone)",
              color: "var(--green)",
            }}
          >
            <Icons.Calendar size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                Operations Calendar
              </h1>
              {loading && (
                <span style={{ fontSize: 11, fontFamily: "monospace", color: "var(--green)", display: "flex", alignItems: "center", gap: 4 }}>
                  <Icons.Refresh size={12} className="animate-spin" /> Syncing...
                </span>
              )}
            </div>
            <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
              Chronological schedule of farm tasks, field executions &amp; logged incidents.
            </p>
          </div>
        </div>

        {/* Estate Switcher */}
        {farms.length > 1 && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <label htmlFor="estate-select" style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>
              Estate:
            </label>
            <select
              id="estate-select"
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="input-field"
              style={{ padding: "6px 12px", fontSize: 12, fontWeight: 600, width: "auto" }}
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* ── Controls Bar: rule-separated, not a card ── */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 0",
          borderBottom: "1px solid var(--hairline)",
        }}
      >
        {/* Month Navigator */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button
            type="button"
            onClick={handlePrevMonth}
            className="btn btn-sm btn-secondary"
            style={{ padding: "6px 10px" }}
            title="Previous Month"
          >
            <Icons.ChevronLeft size={16} />
          </button>

          <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", minWidth: 160, textAlign: "center" }}>
            {monthNames[month - 1]} {year}
          </span>

          <button
            type="button"
            onClick={handleNextMonth}
            className="btn btn-sm btn-secondary"
            style={{ padding: "6px 10px" }}
            title="Next Month"
          >
            <Icons.ChevronRight size={16} />
          </button>

          <button
            type="button"
            onClick={handleToday}
            className="btn btn-sm btn-secondary"
            style={{ fontSize: 11, padding: "5px 12px", color: "var(--green)", fontWeight: 700 }}
          >
            Today
          </button>
        </div>

        {/* View Mode Toggle & Legend */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: "var(--muted)" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--green)" }} /> Done Task
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--amber)" }} /> Due Task
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--danger)" }} /> Incident
            </span>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--blue)" }} /> Harvest
            </span>
          </div>

          <div style={{ display: "flex", gap: 4, backgroundColor: "var(--stone)", padding: 3, borderRadius: "var(--radius-sm)" }}>
            <button
              type="button"
              onClick={() => setViewMode("month")}
              className={`btn btn-sm ${viewMode === "month" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: 11, padding: "4px 10px" }}
            >
              Month View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("week")}
              className={`btn btn-sm ${viewMode === "week" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: 11, padding: "4px 10px" }}
            >
              Week View
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Operations Layout (Grid on left, Day Drawer on right) ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 20, alignItems: "start" }}>
        {/* Calendar Grid (7 columns) */}
        <div
          style={{
            padding: "16px 0",
            gridColumn: "span 2",
            minWidth: 0,
            borderTop: "1px solid var(--hairline)",
          }}
        >
          {/* Weekday headers */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, marginBottom: 8, textAlign: "center" }}>
            {weekdays.map((wd) => (
              <div key={wd} style={{ fontSize: 11, fontWeight: 700, fontFamily: "monospace", textTransform: "uppercase", color: "var(--muted)", padding: "4px 0" }}>
                {wd}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {activeCells.map((cell) => {
              const dayData = eventsByDate.get(cell.dateStr);
              const isSelected = cell.dateStr === selectedDateStr;
              const isToday = cell.dateStr === todayStr;

              const taskCount = dayData?.tasks.length || 0;
              const completedTasks = dayData?.tasks.filter((t) => t.status === "COMPLETED").length || 0;
              const pendingTasks = taskCount - completedTasks;
              const incidentCount = dayData?.incidents.length || 0;
              const harvestCount = dayData?.harvests.length || 0;

              return (
                <div
                  key={cell.dateStr}
                  onClick={() => setSelectedDateStr(cell.dateStr)}
                  style={{
                    position: "relative",
                    padding: 8,
                    minHeight: 100,
                    borderRadius: "var(--radius-xs)",
                    border: isSelected ? "1px solid var(--green-tint)" : "1px solid var(--line)",
                    backgroundColor: isSelected ? "var(--green-tint)" : "var(--canvas)",
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    opacity: cell.isCurrentMonth ? 1 : 0.45,
                  }}
                >
                  {/* Day Number and Today badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontFamily: "monospace",
                        fontWeight: isToday || isSelected ? 800 : 600,
                        color: isToday ? "var(--green-ink)" : isSelected ? "var(--green-dark)" : "var(--ink)",
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {isToday && (
                        <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--green-ink)" }} />
                      )}
                      {cell.dayNumber}
                    </span>

                    {(taskCount > 0 || incidentCount > 0 || harvestCount > 0) && (
                      <span
                        className="badge badge-muted font-mono"
                        style={{ fontSize: 10, padding: "1px 5px" }}
                      >
                        {taskCount + incidentCount + harvestCount}
                      </span>
                    )}
                  </div>

                  {/* Day activity pills */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 4 }}>
                    {completedTasks > 0 && (
                      <div
                        className="badge badge-green font-mono"
                        style={{ fontSize: 10, padding: "2px 4px", display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "var(--green)" }} />
                        <span>{completedTasks} Done</span>
                      </div>
                    )}

                    {pendingTasks > 0 && (
                      <div
                        className="badge badge-amber font-mono"
                        style={{ fontSize: 10, padding: "2px 4px", display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "var(--amber)" }} />
                        <span>{pendingTasks} Due</span>
                      </div>
                    )}

                    {incidentCount > 0 && (
                      <div
                        className="badge badge-danger font-mono"
                        style={{ fontSize: 10, padding: "2px 4px", display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "var(--danger)" }} />
                        <span>{incidentCount} Alert</span>
                      </div>
                    )}

                    {harvestCount > 0 && (
                      <div
                        className="badge badge-blue font-mono"
                        style={{ fontSize: 10, padding: "2px 4px", display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                      >
                        <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "var(--blue)" }} />
                        <span>Harvest</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Day Inspector / Details Panel ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div className="card" style={{ padding: 18 }}>
            {/* Panel Header */}
            <div style={{ paddingBottom: 12, borderBottom: "1px solid var(--line)", marginBottom: 14 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <span style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--green)", fontWeight: 700 }}>
                  Inspected Operations
                </span>
                {selectedDateStr === todayStr && (
                  <span className="badge badge-green" style={{ fontSize: 10 }}>
                    TODAY
                  </span>
                )}
              </div>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: "4px 0 2px" }}>
                {formattedSelectedDate}
              </h2>
              <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                {selectedDayEvents.totalCount} active items logged on this estate date
              </p>
            </div>

            {/* Quick Filter tabs & Search */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
              <div style={{ display: "flex", gap: 4, backgroundColor: "var(--stone)", padding: 4, borderRadius: "var(--radius-sm)" }}>
                <button
                  type="button"
                  onClick={() => setFilterType("all")}
                  className={`btn btn-sm ${filterType === "all" ? "btn-secondary" : "btn-ghost"}`}
                  style={{ flex: 1, fontSize: 11, padding: "4px 6px" }}
                >
                  All ({selectedDayEvents.totalCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("tasks")}
                  className={`btn btn-sm ${filterType === "tasks" ? "btn-secondary" : "btn-ghost"}`}
                  style={{ flex: 1, fontSize: 11, padding: "4px 6px", color: filterType === "tasks" ? "var(--green)" : undefined }}
                >
                  Tasks ({selectedDayEvents.tasks.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("incidents")}
                  className={`btn btn-sm ${filterType === "incidents" ? "btn-secondary" : "btn-ghost"}`}
                  style={{ flex: 1, fontSize: 11, padding: "4px 6px", color: filterType === "incidents" ? "var(--danger)" : undefined }}
                >
                  Alerts ({selectedDayEvents.incidents.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterType("harvests")}
                  className={`btn btn-sm ${filterType === "harvests" ? "btn-secondary" : "btn-ghost"}`}
                  style={{ flex: 1, fontSize: 11, padding: "4px 6px", color: filterType === "harvests" ? "var(--blue)" : undefined }}
                >
                  Yield ({selectedDayEvents.harvests.length})
                </button>
              </div>

              {/* Search input */}
              <input
                type="text"
                placeholder="Filter by plot, title, officer..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ fontSize: 12, padding: "6px 12px" }}
              />
            </div>

            {/* Event List Container */}
            <div style={{ display: "flex", flexDirection: "column", gap: 10, maxHeight: 520, overflowY: "auto", paddingRight: 2 }}>
              {/* Empty state */}
              {selectedDayEvents.totalCount === 0 && (
                <div style={{ textAlign: "center", padding: "36px 16px", border: "1px dashed var(--line)", borderRadius: "var(--radius-sm)" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", backgroundColor: "var(--stone)", color: "var(--muted)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 8px" }}>
                    <Icons.Calendar size={18} />
                  </div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", margin: 0 }}>No Operations Recorded</p>
                  <p className="muted" style={{ fontSize: 11, marginTop: 4, maxWidth: 220, marginLeft: "auto", marginRight: "auto" }}>
                    No tasks scheduled or field incidents logged for {formattedSelectedDate}.
                  </p>
                  <div style={{ marginTop: 14, display: "flex", flexDirection: "column", gap: 6 }}>
                    <Link
                      href="/tasks/new"
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: 11, padding: "6px 12px", textAlign: "center" }}
                    >
                      + Schedule New Task
                    </Link>
                    <Link
                      href="/officer/reports"
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: 11, padding: "6px 12px", textAlign: "center" }}
                    >
                      + Log Field Incident
                    </Link>
                  </div>
                </div>
              )}

              {/* 1. TASKS SECTION */}
              {(filterType === "all" || filterType === "tasks") &&
                selectedDayEvents.tasks.map((task) => {
                  const isDone = task.status === "COMPLETED";
                  return (
                    <div
                      key={task.id}
                      className="compact-card"
                      style={{
                        padding: 12,
                        borderRadius: "var(--radius-sm)",
                        border: isDone ? "1px solid var(--stone)" : "1px solid var(--canvas)",
                        backgroundColor: isDone ? "var(--stone)" : "var(--canvas)",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                        <span className="badge badge-muted font-mono" style={{ fontSize: 10 }}>
                          {task.category.replace(/_/g, " ")}
                        </span>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span
                            className={`badge ${
                              task.priority === "URGENT" || task.priority === "HIGH"
                                ? "badge-danger"
                                : "badge-muted"
                            }`}
                            style={{ fontSize: 9 }}
                          >
                            {task.priority}
                          </span>
                          <span
                            className={`badge ${isDone ? "badge-green" : "badge-amber"}`}
                            style={{ fontSize: 9 }}
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>

                      <h3 style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)", margin: "4px 0 2px", lineHeight: 1.3 }}>
                        {task.title}
                      </h3>
                      <p className="muted" style={{ fontSize: 11, margin: 0, lineHeight: 1.4 }}>
                        {task.description}
                      </p>

                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", paddingTop: 6, borderTop: "1px solid var(--line)", marginTop: 4 }}>
                        <span style={{ fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 140 }}>
                          📍 {task.plotName} {task.cropName ? `(${task.cropName})` : ""}
                        </span>
                        {task.assignedOfficer && (
                          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 120 }}>
                            👤 {task.assignedOfficer.name}
                          </span>
                        )}
                      </div>

                      {/* Execution Details if done */}
                      {task.executions && task.executions.length > 0 && task.executions[0].remarks && (
                        <div style={{ marginTop: 6, padding: 8, borderRadius: "var(--radius-xs)", backgroundColor: "var(--stone)", fontSize: 10, color: "var(--ink)" }}>
                          <span style={{ fontWeight: 700, color: "var(--green)", display: "block", marginBottom: 2 }}>
                            Execution Log:
                          </span>
                          <p style={{ margin: 0 }}>{task.executions[0].remarks}</p>
                          {task.executions[0].labourHours > 0 && (
                            <span className="muted" style={{ display: "block", marginTop: 2 }}>
                              Labor Logged: {task.executions[0].labourHours} hrs
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

              {/* 2. INCIDENTS SECTION */}
              {(filterType === "all" || filterType === "incidents") &&
                selectedDayEvents.incidents.map((incident) => (
                  <div
                    key={incident.id}
                    className="compact-card"
                    style={{
                      padding: 12,
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--canvas)",
                      backgroundColor: "var(--canvas)",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span className="badge badge-danger font-mono" style={{ fontSize: 10 }}>
                        ⚠️ {incident.type}
                      </span>
                      <span className="badge badge-muted" style={{ fontSize: 9 }}>
                        {incident.status}
                      </span>
                    </div>

                    <p style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                      {incident.description}
                    </p>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", paddingTop: 4, borderTop: "1px solid var(--line)" }}>
                      <span>📍 {incident.plotName}</span>
                      <span>By {incident.reporter.name}</span>
                    </div>
                  </div>
                ))}

              {/* 3. HARVESTS SECTION */}
              {(filterType === "all" || filterType === "harvests") &&
                selectedDayEvents.harvests.map((harvest) => (
                  <div
                    key={harvest.id}
                    className="compact-card"
                    style={{
                      padding: 12,
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--canvas)",
                      backgroundColor: "var(--canvas)",
                      gap: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                      <span className="badge badge-blue font-mono" style={{ fontSize: 10 }}>
                        🌾 HARVEST: {harvest.cropName}
                      </span>
                      <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "var(--green)" }}>
                        {harvest.quantity.toLocaleString()} {harvest.unit}
                      </span>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", paddingTop: 4, borderTop: "1px solid var(--line)" }}>
                      <span>📍 {harvest.plotName}</span>
                      {harvest.grade ? <span>Grade {harvest.grade}</span> : null}
                      {harvest.buyerOrMarket && <span>Market: {harvest.buyerOrMarket}</span>}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
