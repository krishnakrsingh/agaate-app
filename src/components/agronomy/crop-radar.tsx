"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";

export type CropRadarItem = {
  cycleId: string;
  cropName: string;
  variety?: string | null;
  startDate: string;
  endDate?: string | null;
  daysInGround: number;
  plotId: string;
  plotName: string;
  plotArea: string;
  soilType?: string | null;
  irrigationType: string;
  farmId: string;
  farmName: string;
  latestHealthStatus?: string | null;
  latestStage?: string | null;
  recentPhotosCount: number;
};

export function CropRadar({ items }: { items: CropRadarItem[] }) {
  const toast = useToast();
  const [selectedFarmFilter, setSelectedFarmFilter] = useState("ALL");
  const [selectedStageFilter, setSelectedStageFilter] = useState("ALL");
  const [activeRxItem, setActiveRxItem] = useState<CropRadarItem | null>(null);
  const [pending, setPending] = useState(false);

  // Form states for Prescription Modal
  const [targetIssue, setTargetIssue] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [dosage, setDosage] = useState("");
  const [waterVolume, setWaterVolume] = useState("200 L / Acre");
  const [priority, setPriority] = useState<"ROUTINE" | "HIGH" | "EMERGENCY">("HIGH");
  const [instructions, setInstructions] = useState("");

  const farmNames = Array.from(new Set(items.map((i) => i.farmName)));

  const filtered = items.filter((item) => {
    if (selectedFarmFilter !== "ALL" && item.farmName !== selectedFarmFilter) return false;
    if (selectedStageFilter !== "ALL" && item.latestStage !== selectedStageFilter) return false;
    return true;
  });

  const totalCrops = items.length;
  const criticalStagesCount = items.filter(
    (i) => i.latestStage === "Flowering" || i.latestStage === "Fruiting"
  ).length;
  const flaggedCount = items.filter((i) => i.latestHealthStatus === "POOR").length;

  const handleDispatchRx = async (e: FormEvent) => {
    e.preventDefault();
    if (!activeRxItem) return;
    setPending(true);

    try {
      const body = {
        farmId: activeRxItem.farmId,
        plotId: activeRxItem.plotId,
        cropCycleId: activeRxItem.cycleId,
        targetIssue,
        applicationDate: new Date().toISOString().slice(0, 10),
        priority,
        recipeDetails: [
          {
            materialName,
            dosage,
            waterVolume,
          },
        ],
        instructions,
      };

      const res = await fetch("/api/prescriptions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to dispatch prescription");
      }

      toast.show("Prescription dispatched! Field task generated.", "success");
      setActiveRxItem(null);
      setTargetIssue("");
      setMaterialName("");
      setDosage("");
      setInstructions("");
    } catch (err: any) {
      toast.show(err.message || "Dispatch error", "error");
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
              <Icons.Activity className="w-6 h-6 text-emerald-400" />
              Agronomy Crop Radar
            </h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              Central Agronomist HQ
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time crop phenology monitoring and high-priority prescription dispatch across all client estates.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/agronomy/diagnostics"
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Icons.Stethoscope className="w-4 h-4" />
            Photo Diagnostics & Rx
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Supervised Crops</span>
          <div className="text-2xl font-bold text-white mt-2">
            {totalCrops} <span className="text-xs text-zinc-500 font-normal">active cycles</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">Across {farmNames.length} client farms</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Critical Phenology Stages</span>
          <div className="text-2xl font-bold text-amber-400 mt-2">
            {criticalStagesCount} <span className="text-xs text-zinc-500 font-normal">flowering / fruiting</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">High vulnerability to pest & nutrient stress</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Flagged For Attention</span>
          <div className={`text-2xl font-bold mt-2 ${flaggedCount > 0 ? "text-rose-400" : "text-emerald-400"}`}>
            {flaggedCount} <span className="text-xs text-zinc-500 font-normal">plots reporting stress</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {flaggedCount > 0 ? "Requires diagnostic inspection" : "All fields reporting normal growth"}
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
        <div className="flex items-center gap-2">
          <span className="text-xs text-zinc-400 font-medium">Farm:</span>
          <select
            value={selectedFarmFilter}
            onChange={(e) => setSelectedFarmFilter(e.target.value)}
            className="bg-zinc-800 border border-zinc-700 text-xs text-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Estates</option>
            {farmNames.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          {["ALL", "Vegetative", "Flowering", "Fruiting", "Harvesting"].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStageFilter(st)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                selectedStageFilter === st
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      {/* Radar Matrix Table */}
      <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/60 backdrop-blur">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-zinc-400">
            <Icons.Activity className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
            No active crop cycles match the filter criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="text-xs uppercase bg-zinc-800/50 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Crop & Variety</th>
                  <th className="px-4 py-3">Estate / Plot</th>
                  <th className="px-4 py-3">Stage & Health</th>
                  <th className="px-4 py-3">Days in Ground</th>
                  <th className="px-4 py-3">Irrigation & Soil</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filtered.map((item) => (
                  <tr key={item.cycleId} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-white">{item.cropName}</div>
                      <div className="text-xs text-zinc-400">{item.variety || "Standard Variety"}</div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="font-medium text-zinc-200">{item.farmName}</div>
                      <div className="text-xs text-zinc-400">
                        {item.plotName} ({Number(item.plotArea)} Ac)
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-zinc-800 text-zinc-200 border border-zinc-700">
                          {item.latestStage || "Vegetative"}
                        </span>
                        {item.latestHealthStatus === "POOR" ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-semibold">
                            STRESS
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            OPTIMAL
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      <span className="font-mono font-bold text-white">{item.daysInGround}</span>{" "}
                      <span className="text-xs text-zinc-400">Days</span>
                      <div className="text-[11px] text-zinc-500">Sown {formatDate(item.startDate)}</div>
                    </td>

                    <td className="px-4 py-3 text-xs text-zinc-400">
                      <div>{item.irrigationType}</div>
                      <div className="text-zinc-500 text-[11px]">{item.soilType || "Unspecified soil"}</div>
                    </td>

                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setActiveRxItem(item)}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium transition-colors shadow-sm"
                      >
                        <Icons.Stethoscope className="w-3 h-3" />
                        Issue Rx
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Issue Rx Prescription Modal */}
      {activeRxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Icons.Stethoscope className="w-5 h-5 text-emerald-400" />
                  Issue Agronomy Prescription (Rx)
                </h2>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Target: <span className="text-emerald-400 font-semibold">{activeRxItem.cropName}</span> &bull;{" "}
                  {activeRxItem.farmName} &gt; {activeRxItem.plotName}
                </div>
              </div>
              <button
                onClick={() => setActiveRxItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDispatchRx} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Target Issue / Diagnosis *</label>
                <input
                  type="text"
                  value={targetIssue}
                  onChange={(e) => setTargetIssue(e.target.value)}
                  placeholder="e.g. Early Blight Infestation, Powdery Mildew, Calcium Deficiency"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Recommended Product / Recipe *</label>
                  <input
                    type="text"
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                    placeholder="e.g. Mancozeb 75% WP, 0:52:34"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Dosage *</label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 2.5 g / Liter water"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Water Volume / Carrier</label>
                  <input
                    type="text"
                    value={waterVolume}
                    onChange={(e) => setWaterVolume(e.target.value)}
                    placeholder="e.g. 200 L / Acre"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Priority</label>
                  <select
                    value={priority}
                    onChange={(e: any) => setPriority(e.target.value)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="ROUTINE">Routine Maintenance</option>
                    <option value="HIGH">High Priority (Next 24h)</option>
                    <option value="EMERGENCY">Emergency (Immediate)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Application Instructions</label>
                <textarea
                  rows={3}
                  value={instructions}
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="e.g. Spray late in the afternoon. Ensure full coverage on underside of leaves. Do not mix with copper."
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl text-xs text-zinc-300 flex items-start gap-2">
                <Icons.Zap className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                <span>
                  Dispatched prescriptions automatically convert into an assigned actionable task on the on-site farm
                  manager&apos;s daily execution board.
                </span>
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveRxItem(null)}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {pending && <Icons.Spinner className="w-3.5 h-3.5 animate-spin" />}
                  Dispatch Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
