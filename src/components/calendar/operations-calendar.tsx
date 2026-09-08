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

    // Weekday of 1st day (0 = Sunday, 1 = Monday... 6 = Saturday)
    // Convert to Monday = 0, Sunday = 6
    let startDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();

    // Previous month filler days
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

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      cells.push({
        dayNumber: d,
        dateStr,
        isCurrentMonth: true,
      });
    }

    // Next month filler days to complete rows (up to 35 or 42)
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

  // If week view, calculate the 7 days of the currently selected week
  const weekCells = useMemo(() => {
    const selected = new Date(selectedDateStr + "T00:00:00");
    const dayOfWeek = selected.getDay();
    // Monday as first day
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

  // Selected date events
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

  // Selected date formatted title
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
    <div className="space-y-6">
      {/* ── Top Instrument Header ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Icons.Calendar size={22} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-white tracking-tight">Operations Calendar</h1>
              {loading && (
                <span className="text-[11px] font-mono text-emerald-400 animate-pulse flex items-center gap-1">
                  <Icons.Refresh size={12} className="animate-spin" /> Syncing...
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">
              Complete chronological ledger of scheduled tasks, field executions & logged incidents.
            </p>
          </div>
        </div>

        {/* Estate Switcher (if multiple) */}
        {farms.length > 1 && (
          <div className="flex items-center gap-2">
            <label htmlFor="estate-select" className="text-xs text-slate-400 font-medium">Estate:</label>
            <select
              id="estate-select"
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-emerald-500"
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

      {/* ── Calendar Controls Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800/80">
        {/* Month Navigator */}
        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevMonth}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Previous Month"
          >
            <Icons.ChevronLeft size={16} />
          </button>

          <span className="text-sm font-bold text-white min-w-[150px] text-center">
            {monthNames[month - 1]} {year}
          </span>

          <button
            onClick={handleNextMonth}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition"
            title="Next Month"
          >
            <Icons.ChevronRight size={16} />
          </button>

          <button
            onClick={handleToday}
            className="ml-2 px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-emerald-500/20 transition"
          >
            Today
          </button>
        </div>

        {/* View Mode Toggle & Legend */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-slate-400 font-medium mr-2">
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> Done Task
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-400" /> Pending Task
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-500" /> Incident
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400" /> Harvest
            </span>
          </div>

          <div className="inline-flex rounded-lg bg-slate-950 p-0.5 border border-slate-800">
            <button
              onClick={() => setViewMode("month")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === "month"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode("week")}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                viewMode === "week"
                  ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              Week View
            </button>
          </div>
        </div>
      </div>

      {/* ── Main Operations Layout (Grid on left, Day Drawer on right) ── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Calendar Grid (7 columns) */}
        <div className="lg:col-span-8 bg-slate-900/50 rounded-2xl border border-slate-800/80 p-3 sm:p-4 shadow-xl">
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1.5 mb-2 text-center">
            {weekdays.map((wd) => (
              <div key={wd} className="text-xs font-mono font-bold text-slate-400 py-1 uppercase tracking-wider">
                {wd}
              </div>
            ))}
          </div>

          {/* Day Cells Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
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
                  className={`relative p-2 min-h-[90px] sm:min-h-[110px] rounded-xl border flex flex-col justify-between cursor-pointer transition-all duration-150 select-none ${
                    isSelected
                      ? "bg-emerald-500/10 border-emerald-500 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/50"
                      : isToday
                      ? "bg-slate-800/40 border-slate-700 hover:border-slate-600"
                      : cell.isCurrentMonth
                      ? "bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/40"
                      : "bg-slate-950/20 border-slate-900/60 opacity-40 hover:opacity-70"
                  }`}
                >
                  {/* Day Number and Today badge */}
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-xs font-mono font-bold ${
                        isToday
                          ? "w-6 h-6 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center font-extrabold shadow"
                          : isSelected
                          ? "text-emerald-400"
                          : cell.isCurrentMonth
                          ? "text-slate-300"
                          : "text-slate-600"
                      }`}
                    >
                      {cell.dayNumber}
                    </span>

                    {/* Total counter indicator */}
                    {(taskCount > 0 || incidentCount > 0 || harvestCount > 0) && (
                      <span className="text-[10px] font-mono px-1 rounded bg-slate-800/80 text-slate-400">
                        {taskCount + incidentCount + harvestCount}
                      </span>
                    )}
                  </div>

                  {/* Day activity pills */}
                  <div className="space-y-1 mt-1">
                    {completedTasks > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-300 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                        <span className="truncate">{completedTasks} Done</span>
                      </div>
                    )}

                    {pendingTasks > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                        <span className="truncate">{pendingTasks} Due</span>
                      </div>
                    )}

                    {incidentCount > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
                        <span className="truncate">{incidentCount} Alert{incidentCount > 1 ? "s" : ""}</span>
                      </div>
                    )}

                    {harvestCount > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-300 truncate">
                        <span className="w-1.5 h-1.5 rounded-full bg-purple-400 shrink-0" />
                        <span className="truncate">Harvest</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ── Day Inspector / Details Panel ── */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl">
            {/* Panel Header */}
            <div className="pb-3 border-b border-slate-800 mb-4">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Inspected Operations
                </span>
                {selectedDateStr === todayStr && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    TODAY
                  </span>
                )}
              </div>
              <h2 className="text-base font-bold text-white mt-1">
                {formattedSelectedDate}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {selectedDayEvents.totalCount} active items logged on this estate date
              </p>
            </div>

            {/* Quick Filter tabs & Search */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <button
                  onClick={() => setFilterType("all")}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition ${
                    filterType === "all" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  All ({selectedDayEvents.totalCount})
                </button>
                <button
                  onClick={() => setFilterType("tasks")}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition ${
                    filterType === "tasks" ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Tasks ({selectedDayEvents.tasks.length})
                </button>
                <button
                  onClick={() => setFilterType("incidents")}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition ${
                    filterType === "incidents" ? "bg-slate-800 text-rose-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Incidents ({selectedDayEvents.incidents.length})
                </button>
                <button
                  onClick={() => setFilterType("harvests")}
                  className={`flex-1 py-1 rounded-lg text-xs font-semibold transition ${
                    filterType === "harvests" ? "bg-slate-800 text-purple-400" : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  Harvest ({selectedDayEvents.harvests.length})
                </button>
              </div>

              {/* Search input */}
              <div className="relative">
                <input
                  type="text"
                  placeholder="Filter by plot, title, officer..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Event List Container */}
            <div className="space-y-3 max-h-[520px] overflow-y-auto pr-1">
              {/* Empty state */}
              {selectedDayEvents.totalCount === 0 && (
                <div className="text-center py-10 px-4 rounded-xl border border-dashed border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-slate-800/60 text-slate-400 flex items-center justify-center mx-auto mb-2">
                    <Icons.Calendar size={18} />
                  </div>
                  <p className="text-xs font-semibold text-slate-300">No Operations Recorded</p>
                  <p className="text-[11px] text-slate-500 mt-1 max-w-[200px] mx-auto">
                    No tasks scheduled or field incidents logged for {formattedSelectedDate}.
                  </p>
                  <div className="mt-4 flex flex-col gap-2">
                    <Link
                      href="/tasks/new"
                      className="px-3 py-1.5 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 text-xs font-semibold border border-emerald-500/30 transition text-center"
                    >
                      + Schedule New Task
                    </Link>
                    <Link
                      href="/officer/reports"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition text-center"
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
                      className={`p-3 rounded-xl border transition ${
                        isDone
                          ? "bg-slate-950/70 border-emerald-900/40"
                          : "bg-slate-950 border-slate-800"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {task.category.replace(/_/g, " ")}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              task.priority === "URGENT" || task.priority === "HIGH"
                                ? "bg-rose-500/20 text-rose-300"
                                : "bg-slate-800 text-slate-400"
                            }`}
                          >
                            {task.priority}
                          </span>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              isDone
                                ? "bg-emerald-500/20 text-emerald-400"
                                : "bg-amber-500/20 text-amber-300"
                            }`}
                          >
                            {task.status}
                          </span>
                        </div>
                      </div>

                      <h3 className="text-xs font-bold text-white leading-snug">{task.title}</h3>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{task.description}</p>

                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-medium text-slate-300 truncate max-w-[140px]">
                          📍 {task.plotName} {task.cropName ? `(${task.cropName})` : ""}
                        </span>
                        {task.assignedOfficer && (
                          <span className="text-slate-400 truncate max-w-[120px]">
                            👤 {task.assignedOfficer.name}
                          </span>
                        )}
                      </div>

                      {/* Execution Details if done */}
                      {task.executions && task.executions.length > 0 && task.executions[0].remarks && (
                        <div className="mt-2 p-2 rounded bg-slate-900/80 border border-slate-800 text-[10px] text-slate-300 space-y-0.5">
                          <span className="font-semibold text-emerald-400 block">Execution Log:</span>
                          <p>{task.executions[0].remarks}</p>
                          {task.executions[0].labourHours > 0 && (
                            <span className="text-slate-400 block">
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
                    className="p-3 rounded-xl border border-rose-900/40 bg-rose-950/10 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">
                        ⚠️ {incident.type}
                      </span>
                      <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                        {incident.status}
                      </span>
                    </div>

                    <p className="text-white font-medium">{incident.description}</p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-rose-900/30">
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
                    className="p-3 rounded-xl border border-purple-900/40 bg-purple-950/10 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300">
                        🌾 HARVEST: {harvest.cropName}
                      </span>
                      <span className="text-xs font-mono font-bold text-emerald-400">
                        {harvest.quantity.toLocaleString()} {harvest.unit}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span>📍 {harvest.plotName}</span>
                      {harvest.grade ? <span className="text-purple-300">Grade {harvest.grade}</span> : null}
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
