"use client";
import { useState, useEffect, FormEvent } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

type Plot = {
  id: string;
  name: string;
  cropCycles: { id: string; cropName: string }[];
};

type Farm = {
  id: string;
  name: string;
  plots: Plot[];
};

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantityInStock: string;
  unit: string;
};

const CATEGORIES = [
  { id: "IRRIGATION", label: "Irrigation Run", icon: "Sun", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
  { id: "FERTIGATION", label: "Fertigation / Drenching", icon: "Coins", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
  { id: "SPRAYING", label: "Pest / Foliar Spray", icon: "Zap", color: "text-rose-400 border-rose-500/30 bg-rose-500/10" },
  { id: "WEEDING", label: "Manual Weeding", icon: "TrendingUp", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
  { id: "PRUNING", label: "Pruning / Trellising", icon: "ClipboardList", color: "text-purple-400 border-purple-500/30 bg-purple-500/10" },
  { id: "FIELD_MAINTENANCE", label: "Pump / Shed Repair", icon: "Package", color: "text-orange-400 border-orange-500/30 bg-orange-500/10" },
];

export function QuickLogger({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("IRRIGATION");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
  const plots = selectedFarm?.plots || [];
  const activePlot = plots.find((p) => p.id === selectedPlotId);
  const cropCycleId = activePlot?.cropCycles[0]?.id || null;

  useEffect(() => {
    if (plots.length > 0 && !selectedPlotId) {
      setSelectedPlotId(plots[0].id);
    }
  }, [plots, selectedPlotId]);

  useEffect(() => {
    if (!selectedFarmId) return;
    fetch(`/api/inventory?farmId=${selectedFarmId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setInventoryItems(data))
      .catch(() => setInventoryItems([]));
  }, [selectedFarmId]);

  // Set default title based on category & plot
  useEffect(() => {
    const catObj = CATEGORIES.find((c) => c.id === selectedCategory);
    const plotName = activePlot?.name || "Plot";
    setTitle(`${catObj?.label || "Operation"} - ${plotName}`);
  }, [selectedCategory, activePlot]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId) {
      toast.show("Please select a farm", "error");
      return;
    }

    setPending(true);
    try {
      const body = {
        farmId: selectedFarmId,
        plotId: selectedPlotId || null,
        cropCycleId,
        category: selectedCategory,
        title,
        durationMinutes,
        inventoryItemId: selectedItemId || null,
        inventoryQuantity: selectedItemId && itemQuantity ? Number(itemQuantity) : null,
        notes: notes || null,
      };

      const res = await fetch("/api/officer/quick-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to log activity");
      }

      toast.show("Activity recorded directly into farm ledger!", "success");
      setNotes("");
      setSelectedItemId("");
      setItemQuantity("");
    } catch (err: any) {
      toast.show(err.message || "Submission failed", "error");
    } finally {
      setPending(false);
    }
  };

  const selectedInventoryItem = inventoryItems.find((i) => i.id === selectedItemId);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Icons.Zap className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Express Field Activity Logger</h1>
            <p className="text-xs text-zinc-400">
              Instant 1-tap logging for unassigned daily ground work. Keeps your farm owner informed in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-5 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-xl">
        {/* Farm & Plot Selection */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {farms.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Select Farm</label>
              <select
                value={selectedFarmId}
                onChange={(e) => {
                  setSelectedFarmId(e.target.value);
                  setSelectedPlotId("");
                }}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className={farms.length === 1 ? "col-span-2" : ""}>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Target Plot / Zone</label>
            <select
              value={selectedPlotId}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.cropCycles[0] ? `(${p.cropCycles[0].cropName})` : "(Fallow)"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Activity Category Selection */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-2">What did you execute today?</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`p-3 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                    isSelected
                      ? `${cat.color} ring-1 ring-white/20 shadow-md`
                      : "bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200"
                  }`}
                >
                  <span className="text-xs font-bold leading-snug">{cat.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Activity Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Duration presets */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">
            Duration: <span className="text-emerald-400 font-bold">{durationMinutes} Minutes</span> ({ (durationMinutes / 60).toFixed(1) } Hours)
          </label>
          <div className="flex items-center gap-2">
            {[30, 60, 120, 180, 240, 360].map((mins) => (
              <button
                key={mins}
                type="button"
                onClick={() => setDurationMinutes(mins)}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-all ${
                  durationMinutes === mins
                    ? "bg-emerald-600 text-white border-emerald-500"
                    : "bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white"
                }`}
              >
                {mins < 60 ? `${mins}m` : `${mins / 60}h`}
              </button>
            ))}
          </div>
        </div>

        {/* Shed Stock Consumption (Optional) */}
        {(selectedCategory === "FERTIGATION" || selectedCategory === "SPRAYING" || inventoryItems.length > 0) && (
          <div className="p-3.5 rounded-xl bg-zinc-800/40 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                <Icons.Package className="w-3.5 h-3.5 text-amber-400" />
                Did you consume any Shed Stock? (Optional)
              </span>
              {selectedItemId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemId("");
                    setItemQuantity("");
                  }}
                  className="text-[11px] text-zinc-400 hover:text-rose-400"
                >
                  Clear item
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">-- No stock consumed --</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Stock: {Number(item.quantityInStock)} {item.unit})
                  </option>
                ))}
              </select>

              {selectedItemId && selectedInventoryItem && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={`Quantity in ${selectedInventoryItem.unit}`}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                  <span className="text-xs text-zinc-400 font-medium px-2 py-1 bg-zinc-800 rounded border border-zinc-700">
                    {selectedInventoryItem.unit}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Observations & Field Notes */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Notes / Pressure / Observations</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Pump pressure was 2.5 bar, emitter flow checked, slight weed growth along dripline."
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Icons.Spinner className="w-4 h-4 animate-spin" />
              Logging Activity...
            </>
          ) : (
            <>
              <Icons.CheckCircle className="w-4 h-4" />
              Submit Field Log
            </>
          )}
        </button>
      </form>
    </div>
  );
}
