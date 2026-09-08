"use client";
import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";

type Plot = {
  id: string;
  name: string;
  area: string;
  soilType?: string | null;
  status: string;
  latitude: string;
  longitude: string;
  irrigation: { id: string; type: string; details?: string | null }[];
  cropCycles: {
    id: string;
    cropName: string;
    variety?: string | null;
    status: string;
    startDate: string;
    endDate?: string | null;
  }[];
};

type Farm = {
  id: string;
  name: string;
  cultivableArea: string;
  totalArea: string;
  latitude: string;
  longitude: string;
  plots: Plot[];
};

export function PlotsExplorer({ farms }: { farms: Farm[] }) {
  const router = useRouter();
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [showAddModal, setShowAddModal] = useState(false);
  const [pending, setPending] = useState(false);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];

  if (!selectedFarm) {
    return (
      <div className="p-12 text-center text-zinc-400">
        <Icons.AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
        No farm assigned to your account.
      </div>
    );
  }

  const plots = selectedFarm.plots || [];
  const totalPlotArea = plots.reduce((acc, p) => acc + Number(p.area), 0);
  const activeCropsCount = plots.reduce(
    (acc, p) => acc + p.cropCycles.filter((c) => c.status === "ACTIVE").length,
    0
  );

  const handleCreatePlot = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);

    const body = {
      name: form.get("name"),
      area: Number(form.get("area")),
      latitude: Number(form.get("latitude") || selectedFarm.latitude),
      longitude: Number(form.get("longitude") || selectedFarm.longitude),
      soilType: form.get("soilType") || null,
      irrigation: [
        {
          type: form.get("irrigationType") || "Drip",
          details: form.get("irrigationDetails") || null,
        },
      ],
    };

    try {
      const res = await fetch(`/api/farms/${selectedFarm.id}/plots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to create plot");
      }

      toast.show("New plot created successfully", "success");
      setShowAddModal(false);
      router.refresh();
    } catch (err: any) {
      toast.show(err.message || "Error creating plot", "error");
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
              <Icons.TrendingUp className="w-6 h-6 text-emerald-400" />
              Estate Plots & Crop Registry
            </h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              Land Parcels
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Browse land zones, monitor vegetative stages, soil characteristics, and irrigation infrastructure.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {farms.length > 1 && (
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Icons.Plus className="w-4 h-4" />
            Add Plot
          </button>
        </div>
      </div>

      {/* Farm Acreage KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Plots / Zones</span>
          <div className="text-2xl font-bold text-white mt-2">{plots.length} <span className="text-xs text-zinc-500 font-normal">parcels</span></div>
          <div className="text-xs text-zinc-500 mt-1">Allocated within {selectedFarm.name}</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Area Utilization</span>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {totalPlotArea.toFixed(1)} / {Number(selectedFarm.cultivableArea).toFixed(1)}{" "}
            <span className="text-xs text-zinc-500 font-normal">Acres</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {Math.round((totalPlotArea / (Number(selectedFarm.cultivableArea) || 1)) * 100)}% cultivable area mapped
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
          <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Active Plantings</span>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            {activeCropsCount} <span className="text-xs text-zinc-500 font-normal">cycles in ground</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">Managed under active agronomy cycles</div>
        </div>
      </div>

      {/* Plots Grid */}
      {plots.length === 0 ? (
        <div className="border border-zinc-800/80 rounded-2xl p-12 text-center bg-zinc-900/40">
          <Icons.Farm className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-zinc-200">No plots demarcated yet</h3>
          <p className="text-xs text-zinc-500 mt-1 max-w-sm mx-auto">
            Demarcate your estate into distinct agricultural plots (e.g. Zone A, Mango Orchard, Greenhouse 1) to track planting & harvest metrics.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="mt-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-2 rounded-lg font-medium"
          >
            <Icons.Plus className="w-3.5 h-3.5" />
            Demarcate First Plot
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {plots.map((plot) => {
            const activeCycle = plot.cropCycles.find((c) => c.status === "ACTIVE");

            return (
              <div
                key={plot.id}
                className="border border-zinc-800/80 rounded-xl bg-zinc-900/60 backdrop-blur p-5 flex flex-col justify-between hover:border-zinc-700 transition-colors"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <h3 className="text-base font-bold text-white tracking-tight">{plot.name}</h3>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-medium border ${
                        activeCycle
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : "bg-zinc-800 text-zinc-400 border-zinc-700"
                      }`}
                    >
                      {activeCycle ? "CULTIVATED" : "FALLOW"}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs py-2 border-y border-zinc-800/60 mb-3">
                    <div>
                      <span className="text-zinc-500 block">Area</span>
                      <span className="font-semibold text-zinc-200 font-mono">{Number(plot.area)} Acres</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Soil Type</span>
                      <span className="font-semibold text-zinc-200">{plot.soilType || "Not specified"}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">Irrigation</span>
                      <span className="font-semibold text-zinc-200">
                        {plot.irrigation.map((i) => i.type).join(", ") || "None"}
                      </span>
                    </div>
                    <div>
                      <span className="text-zinc-500 block">GPS Center</span>
                      <span className="font-mono text-zinc-400 text-[11px]">
                        {Number(plot.latitude).toFixed(3)}, {Number(plot.longitude).toFixed(3)}
                      </span>
                    </div>
                  </div>

                  {/* Active Crop Details */}
                  {activeCycle ? (
                    <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-900/30 text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-emerald-400 font-bold">{activeCycle.cropName}</span>
                        {activeCycle.variety && (
                          <span className="text-zinc-400 text-[11px]">({activeCycle.variety})</span>
                        )}
                      </div>
                      <div className="text-zinc-400 text-[11px] flex justify-between">
                        <span>Planted: {formatDate(activeCycle.startDate)}</span>
                        {activeCycle.endDate && <span>Est. Harvest: {formatDate(activeCycle.endDate)}</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-lg bg-zinc-800/40 border border-zinc-800 text-xs text-zinc-400 text-center">
                      No active crop cycle in ground.
                    </div>
                  )}
                </div>

                <div className="pt-4 mt-2 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                  <Link
                    href={`/plots/${plot.id}`}
                    className="text-xs text-zinc-300 hover:text-white font-medium hover:underline flex items-center gap-1"
                  >
                    Configure <Icons.ChevronRight className="w-3 h-3" />
                  </Link>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/plots/${plot.id}/crop-cycles/new`}
                      className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium transition-colors"
                    >
                      New Cycle
                    </Link>
                    <Link
                      href={`/owner/harvest`}
                      className="text-xs px-2.5 py-1 rounded bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-medium transition-colors"
                    >
                      Harvests
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Plot Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Icons.TrendingUp className="w-5 h-5 text-emerald-400" />
                Demarcate New Plot on {selectedFarm.name}
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreatePlot} className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Plot Name / Demarcation *</label>
                  <input
                    type="text"
                    name="name"
                    placeholder="e.g. Zone A - North Field, Polyhouse 1"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Plot Area (Acres) *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="area"
                    placeholder="e.g. 2.5"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Soil Type</label>
                  <input
                    type="text"
                    name="soilType"
                    placeholder="e.g. Red Loam, Black Cotton, Sandy"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Primary Irrigation *</label>
                  <select
                    name="irrigationType"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="Drip">Drip Irrigation</option>
                    <option value="Sprinkler">Sprinkler</option>
                    <option value="Rain Pipe">Rain Pipe</option>
                    <option value="Flood">Flood / Channel</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Irrigation Notes</label>
                  <input
                    type="text"
                    name="irrigationDetails"
                    placeholder="e.g. Inline 16mm, 40cm emitter"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    name="latitude"
                    defaultValue={Number(selectedFarm.latitude)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="0.000001"
                    name="longitude"
                    defaultValue={Number(selectedFarm.longitude)}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
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
                  Create Plot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
