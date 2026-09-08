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

type Farm = {
  id: string;
  name: string;
  plots: Plot[];
};

type RecentHarvest = {
  id: string;
  harvestDate: string;
  quantity: string;
  unit: string;
  grade: string;
  buyerOrMarket?: string | null;
  vehicleNumber?: string | null;
  plot: { name: string };
  cropCycle: { cropName: string };
};

export function MobileHarvestLogger({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("KG");
  const [grade, setGrade] = useState("GRADE_A");
  const [buyerOrMarket, setBuyerOrMarket] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [recentHarvests, setRecentHarvests] = useState<RecentHarvest[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
  const plots = selectedFarm?.plots || [];
  const activePlot = plots.find((p) => p.id === selectedPlotId);
  const availableCrops = activePlot?.cropCycles || [];

  useEffect(() => {
    if (plots.length > 0 && !selectedPlotId) {
      setSelectedPlotId(plots[0].id);
    }
  }, [plots, selectedPlotId]);

  useEffect(() => {
    if (availableCrops.length > 0) {
      setSelectedCycleId(availableCrops[0].id);
    } else {
      setSelectedCycleId("");
    }
  }, [selectedPlotId, availableCrops]);

  const loadRecent = async () => {
    if (!selectedFarmId) return;
    setLoadingRecent(true);
    try {
      const res = await fetch(`/api/harvest?farmId=${selectedFarmId}`);
      if (res.ok) {
        const data = await res.json();
        setRecentHarvests(data.slice(0, 5));
      }
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    void loadRecent();
  }, [selectedFarmId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId || !selectedPlotId || !selectedCycleId) {
      toast.show("Select farm, plot, and active crop cycle", "error");
      return;
    }

    setPending(true);
    try {
      const body = {
        farmId: selectedFarmId,
        plotId: selectedPlotId,
        cropCycleId: selectedCycleId,
        harvestDate,
        quantity: Number(quantity),
        unit,
        grade,
        buyerOrMarket: buyerOrMarket || null,
        vehicleNumber: vehicleNumber || null,
        notes: notes || null,
      };

      const res = await fetch("/api/harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to log harvest");
      }

      toast.show("Harvest cut logged successfully!", "success");
      setQuantity("");
      setNotes("");
      setBuyerOrMarket("");
      setVehicleNumber("");
      void loadRecent();
    } catch (err: any) {
      toast.show(err.message || "Failed to log harvest", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Icons.Truck className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Record Daily Harvest Cut</h1>
            <p className="text-xs text-zinc-400">
              Field crate weighing & vehicle dispatch logging.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-xl">
        {/* Farm & Plot */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {farms.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Farm</label>
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
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Plot / Block</label>
            <select
              value={selectedPlotId}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Crop Cycle & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Crop Cycle *</label>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              {availableCrops.length === 0 ? (
                <option value="">No active crop on this plot</option>
              ) : (
                availableCrops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cropName}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Harvest Date *</label>
            <input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Quantity & Unit */}
        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Harvested Quantity *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 450"
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            >
              <option value="KG">KG</option>
              <option value="CRATES">Crates</option>
              <option value="QUINTAL">Quintal</option>
              <option value="TONNE">Tonne</option>
              <option value="BOXES">Boxes</option>
            </select>
          </div>
        </div>

        {/* Grade Selection */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Quality Grade *</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {[
              { id: "GRADE_A", label: "Grade A (Export/Prem)", color: "text-emerald-400 border-emerald-500/30 bg-emerald-500/10" },
              { id: "GRADE_B", label: "Grade B (Market)", color: "text-cyan-400 border-cyan-500/30 bg-cyan-500/10" },
              { id: "GRADE_C", label: "Grade C (Local)", color: "text-amber-400 border-amber-500/30 bg-amber-500/10" },
              { id: "PROCESSING", label: "Processing / Cull", color: "text-zinc-400 border-zinc-700 bg-zinc-800" },
            ].map((g) => (
              <button
                key={g.id}
                type="button"
                onClick={() => setGrade(g.id)}
                className={`p-2 rounded-lg border text-xs font-semibold transition-all text-center ${
                  grade === g.id
                    ? `${g.color} ring-1 ring-white/20`
                    : "bg-zinc-800/40 border-zinc-800 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Buyer & Vehicle */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Buyer / Mandi Destination</label>
            <input
              type="text"
              value={buyerOrMarket}
              onChange={(e) => setBuyerOrMarket(e.target.value)}
              placeholder="e.g. APMC Hubli, BigBasket, Cold Storage"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Vehicle / Dispatch Number</label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. KA-04-E-1234"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Notes / Crate Count / Brix</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 18 crates, sugar brix 12.5, picked before noon heat"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={pending || !availableCrops.length}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Icons.Spinner className="w-4 h-4 animate-spin" />
              Recording Harvest...
            </>
          ) : (
            <>
              <Icons.CheckCircle className="w-4 h-4" />
              Confirm Harvest Cut
            </>
          )}
        </button>
      </form>

      {/* Recent Harvests on this estate */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
          <Icons.Clock className="w-3.5 h-3.5 text-zinc-500" />
          Recent Harvests on this Farm
        </h2>

        {loadingRecent ? (
          <div className="text-xs text-zinc-500 py-3 text-center">Loading recent cuts...</div>
        ) : recentHarvests.length === 0 ? (
          <div className="text-xs text-zinc-500 py-3 text-center">No harvest cuts logged recently.</div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {recentHarvests.map((h) => (
              <div key={h.id} className="py-2 flex items-center justify-between text-xs">
                <div>
                  <span className="font-semibold text-white">{h.cropCycle.cropName}</span>
                  <span className="text-zinc-500 ml-1.5 font-normal">
                    ({h.plot.name} &bull; {formatDate(h.harvestDate)})
                  </span>
                  {h.buyerOrMarket && (
                    <div className="text-[11px] text-zinc-400">To: {h.buyerOrMarket}</div>
                  )}
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400 font-mono">
                    {Number(h.quantity).toLocaleString()} {h.unit}
                  </div>
                  <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded">
                    {h.grade.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
