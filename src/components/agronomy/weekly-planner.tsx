"use client";
import { useState, useEffect, FormEvent } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";

type Plot = {
  id: string;
  name: string;
  cropCycles: { id: string; cropName: string }[];
};

type Officer = {
  id: string;
  name: string;
};

type Farm = {
  id: string;
  name: string;
  plots: Plot[];
  officers: Officer[];
};

type ScheduledTask = {
  id: string;
  dayIndex: number;
  dateStr: string;
  plotId: string;
  plotName: string;
  cropCycleId?: string;
  cropName?: string;
  category: string;
  title: string;
  instructions: string;
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  assignedOfficerId: string;
  officerName: string;
};

const RECIPE_PRESETS = [
  {
    category: "FERTIGATION",
    title: "NPK 19-19-19 Drip Fertigation",
    instructions: "Dissolve 5 KG NPK 19-19-19 in 100L tank. Inject through venturi during final 45 mins of drip cycle.",
  },
  {
    category: "PREVENTIVE_SPRAY",
    title: "Prophylactic Neem Foliar Spray",
    instructions: "Mix 3 ml Neem Oil 10,000 PPM / L water with spreader. Spray in late afternoon on underside of foliage.",
  },
  {
    category: "FOLIAR_NUTRITION",
    title: "Chelated Micronutrient Booster",
    instructions: "Apply 1.5 g / L Grade 4 micronutrients. Ensure pH of spray tank is balanced between 6.0 and 6.5.",
  },
  {
    category: "IRRIGATION_RECOMMENDATION",
    title: "Root Zone Saturation Run",
    instructions: "Run drip emitters for 120 mins. Maintain 2.0 bar manifold pressure. Check moisture probe at 30cm depth.",
  },
  {
    category: "CULTURAL_PRACTICE",
    title: "Canopy Pruning & Trellising",
    instructions: "Remove lateral ground suckers up to 3rd node. Secure main stem to support wire with twine.",
  },
];

export function WeeklyPlanner({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [weekOffset, setWeekOffset] = useState(0); // 0 = this week
  const [tasks, setTasks] = useState<ScheduledTask[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [targetDayIndex, setTargetDayIndex] = useState(0);
  const [pending, setPending] = useState(false);

  // Form states
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("FERTIGATION");
  const [title, setTitle] = useState(RECIPE_PRESETS[0].title);
  const [instructions, setInstructions] = useState(RECIPE_PRESETS[0].instructions);
  const [priority, setPriority] = useState<"LOW" | "MEDIUM" | "HIGH" | "URGENT">("HIGH");
  const [assignedOfficerId, setAssignedOfficerId] = useState("");

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
  const plots = selectedFarm?.plots || [];
  const officers = selectedFarm?.officers || [];

  // Generate 7-day rolling window
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() + weekOffset * 7);

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    return {
      index: i,
      date: d,
      dateStr: d.toISOString().slice(0, 10),
      dayName: d.toLocaleDateString("en-US", { weekday: "short" }),
      formatted: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    };
  });

  useEffect(() => {
    if (plots.length > 0 && !selectedPlotId) {
      setSelectedPlotId(plots[0].id);
    }
  }, [plots, selectedPlotId]);

  useEffect(() => {
    if (officers.length > 0 && !assignedOfficerId) {
      setAssignedOfficerId(officers[0].id);
    }
  }, [officers, assignedOfficerId]);

  const handlePresetSelect = (preset: typeof RECIPE_PRESETS[0]) => {
    setSelectedCategory(preset.category);
    setTitle(preset.title);
    setInstructions(preset.instructions);
  };

  const openAddTask = (dayIndex: number) => {
    setTargetDayIndex(dayIndex);
    setShowAddModal(true);
  };

  const handleCreateTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFarm || !selectedPlotId || !assignedOfficerId) {
      toast.show("Please select plot and on-site officer", "error");
      return;
    }

    const day = weekDays[targetDayIndex];
    const plot = plots.find((p) => p.id === selectedPlotId);
    const officer = officers.find((o) => o.id === assignedOfficerId);

    setPending(true);
    try {
      const body = {
        farmId: selectedFarm.id,
        plotId: selectedPlotId,
        cropCycleId: plot?.cropCycles[0]?.id || null,
        date: day.date.toISOString(),
        category: selectedCategory,
        title,
        description: instructions,
        instructions,
        priority,
        assignedOfficerId,
      };

      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to schedule task");
      }

      const created = await res.json();

      setTasks((prev) => [
        ...prev,
        {
          id: created.id,
          dayIndex: targetDayIndex,
          dateStr: day.dateStr,
          plotId: selectedPlotId,
          plotName: plot?.name || "Plot",
          cropCycleId: plot?.cropCycles[0]?.id,
          cropName: plot?.cropCycles[0]?.cropName,
          category: selectedCategory,
          title,
          instructions,
          priority,
          assignedOfficerId,
          officerName: officer?.name || "Officer",
        },
      ]);

      toast.show(`Task dispatched to ${officer?.name} for ${day.dayName}!`, "success");
      setShowAddModal(false);
    } catch (err: any) {
      toast.show(err.message || "Could not schedule task", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Icons.Calendar className="w-6 h-6 text-emerald-400" />
              Weekly Agronomy Planning Matrix
            </h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              Agaate Crop Doctor
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Build and dispatch precision 7-day spray, fertigation, and cultural practice schedules for on-site farm managers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {farms.length > 1 && (
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs rounded-lg px-3 py-2 outline-none focus:border-emerald-500"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setWeekOffset((prev) => prev - 1)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
              title="Previous Week"
            >
              <Icons.ArrowLeft className="w-4 h-4" />
            </button>
            <span className="px-2 font-medium text-zinc-200">
              {weekOffset === 0 ? "Current Week" : weekOffset > 0 ? `+${weekOffset} Wk` : `${weekOffset} Wk`}
            </span>
            <button
              onClick={() => setWeekOffset((prev) => prev + 1)}
              className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white"
              title="Next Week"
            >
              <Icons.ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* 7-Day Calendar Grid */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
        {weekDays.map((day) => {
          const dayTasks = tasks.filter((t) => t.dateStr === day.dateStr);

          return (
            <div
              key={day.index}
              className="border border-zinc-800/80 rounded-2xl bg-zinc-900/60 backdrop-blur p-3 flex flex-col justify-between min-h-[320px] hover:border-zinc-700 transition-colors"
            >
              <div>
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 mb-2 border-b border-zinc-800">
                  <div>
                    <span className="text-xs font-bold text-white uppercase">{day.dayName}</span>
                    <span className="text-[11px] text-zinc-500 block">{day.formatted}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-800 text-zinc-400 font-mono">
                    {dayTasks.length}
                  </span>
                </div>

                {/* Day Task Cards */}
                <div className="space-y-2">
                  {dayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-2 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1 shadow-sm"
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] font-bold text-emerald-400 truncate">
                          {t.category.replace("_", " ")}
                        </span>
                        <span
                          className={`text-[9px] px-1 py-0.2 rounded font-semibold ${
                            t.priority === "URGENT" || t.priority === "HIGH"
                              ? "bg-rose-500/10 text-rose-400"
                              : "bg-zinc-800 text-zinc-400"
                          }`}
                        >
                          {t.priority}
                        </span>
                      </div>

                      <div className="font-semibold text-white leading-tight">{t.title}</div>
                      <div className="text-[10px] text-zinc-400">{t.plotName}</div>
                      <div className="text-[10px] text-zinc-500 flex items-center gap-1 pt-1 border-t border-zinc-900">
                        <Icons.Users className="w-2.5 h-2.5" /> {t.officerName}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Add Task Button */}
              <button
                onClick={() => openAddTask(day.index)}
                className="mt-3 w-full py-1.5 border border-dashed border-zinc-700/80 hover:border-emerald-500 hover:bg-emerald-500/5 text-zinc-400 hover:text-emerald-400 rounded-xl text-xs font-medium flex items-center justify-center gap-1 transition-all"
              >
                <Icons.Plus className="w-3 h-3" />
                Schedule
              </button>
            </div>
          );
        })}
      </div>

      {/* Schedule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Icons.Calendar className="w-5 h-5 text-emerald-400" />
                  Schedule Operation
                </h2>
                <span className="text-xs text-zinc-400 mt-0.5 block">
                  {weekDays[targetDayIndex]?.dayName}, {weekDays[targetDayIndex]?.formatted} on {selectedFarm.name}
                </span>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Recipe Presets */}
            <div className="mt-4">
              <span className="text-[11px] font-semibold text-zinc-400 block mb-1.5 uppercase tracking-wider">
                Quick Agronomy Recipe Presets:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {RECIPE_PRESETS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handlePresetSelect(p)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors"
                  >
                    {p.title}
                  </button>
                ))}
              </div>
            </div>

            <form onSubmit={handleCreateTask} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Target Plot *</label>
                  <select
                    value={selectedPlotId}
                    onChange={(e) => setSelectedPlotId(e.target.value)}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {plots.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.cropCycles[0] ? `(${p.cropCycles[0].cropName})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Operation Category *</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FERTIGATION">Fertigation</option>
                    <option value="PREVENTIVE_SPRAY">Preventive Spray</option>
                    <option value="FOLIAR_NUTRITION">Foliar Nutrition</option>
                    <option value="PEST_CONTROL">Pest Control</option>
                    <option value="IRRIGATION_RECOMMENDATION">Irrigation Turn</option>
                    <option value="CULTURAL_PRACTICE">Cultural Practice</option>
                    <option value="CROP_MONITORING">Crop Scouting</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Task Title *</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Recipe / Execution Instructions</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Assign On-Site Manager *</label>
                  <select
                    value={assignedOfficerId}
                    onChange={(e) => setAssignedOfficerId(e.target.value)}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    {officers.length === 0 ? (
                      <option value="">No officers assigned to this farm</option>
                    ) : (
                      officers.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || !officers.length}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {pending && <Icons.Spinner className="w-3.5 h-3.5 animate-spin" />}
                  Dispatch Operation
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
