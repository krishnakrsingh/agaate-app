"use client";
import { useState, FormEvent } from "react";
import Image from "next/image";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";

export type DiagnosticCase = {
  id: string;
  source: "INCIDENT" | "MONITORING";
  farmId: string;
  farmName: string;
  plotId?: string | null;
  plotName?: string | null;
  cropCycleId?: string | null;
  cropName?: string | null;
  title: string;
  description: string;
  severity: string;
  impactPercent?: string | null;
  imageUrl?: string | null;
  reportedBy: string;
  reportedAt: string;
};

export type DispatchedRx = {
  id: string;
  farmName: string;
  plotName: string;
  cropName: string;
  targetIssue: string;
  recipeSummary: string;
  priority: string;
  status: string;
  dispatchedAt: string;
};

export function DiagnosticsWorkbench({
  cases,
  recentPrescriptions,
}: {
  cases: DiagnosticCase[];
  recentPrescriptions: DispatchedRx[];
}) {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<"CASES" | "HISTORY">("CASES");
  const [selectedFarm, setSelectedFarm] = useState("ALL");
  const [selectedCase, setSelectedCase] = useState<DiagnosticCase | null>(null);
  const [zoomImage, setZoomImage] = useState<string | null>(null);

  // Rx Dispatch form states
  const [targetIssue, setTargetIssue] = useState("");
  const [materialName, setMaterialName] = useState("");
  const [dosage, setDosage] = useState("");
  const [waterVolume, setWaterVolume] = useState("200 L / Acre");
  const [priority, setPriority] = useState<"ROUTINE" | "HIGH" | "EMERGENCY">("HIGH");
  const [instructions, setInstructions] = useState("");
  const [pending, setPending] = useState(false);

  const farmNames = Array.from(new Set(cases.map((c) => c.farmName)));

  const filteredCases = cases.filter((c) => {
    if (selectedFarm !== "ALL" && c.farmName !== selectedFarm) return false;
    return true;
  });

  const openRxModal = (c: DiagnosticCase) => {
    setSelectedCase(c);
    setTargetIssue(c.title);
    setInstructions(`Targeting symptoms reported by ${c.reportedBy} on ${formatDate(c.reportedAt)}: "${c.description}"`);
  };

  const handleDispatchRx = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedCase) return;

    if (!selectedCase.plotId || !selectedCase.cropCycleId) {
      toast.show("This case is missing a specific plot or crop assignment.", "error");
      return;
    }

    setPending(true);
    try {
      const body = {
        farmId: selectedCase.farmId,
        plotId: selectedCase.plotId,
        cropCycleId: selectedCase.cropCycleId,
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

      toast.show("Prescription dispatched to on-site farm officer!", "success");
      setSelectedCase(null);
    } catch (err: any) {
      toast.show(err.message || "Error dispatching Rx", "error");
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
              <Icons.Stethoscope className="w-6 h-6 text-emerald-400" />
              Diagnostics & Prescription Workbench
            </h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              Crop Doctor
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Review leaf/crop scouting photos, diagnose infestations, and prescribe calibrated treatments.
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex items-center gap-2 p-1 bg-zinc-900 border border-zinc-800 rounded-xl">
          <button
            onClick={() => setActiveTab("CASES")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "CASES"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Active Field Cases ({cases.length})
          </button>
          <button
            onClick={() => setActiveTab("HISTORY")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              activeTab === "HISTORY"
                ? "bg-emerald-600 text-white shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            Dispatched Rx ({recentPrescriptions.length})
          </button>
        </div>
      </div>

      {activeTab === "CASES" ? (
        <>
          {/* Farm filter */}
          {farmNames.length > 1 && (
            <div className="flex items-center gap-2 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
              <span className="text-xs text-zinc-400 font-medium">Estate Filter:</span>
              <select
                value={selectedFarm}
                onChange={(e) => setSelectedFarm(e.target.value)}
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
          )}

          {/* Diagnostic Cards Grid */}
          {filteredCases.length === 0 ? (
            <div className="border border-zinc-800/80 rounded-2xl p-12 text-center bg-zinc-900/40">
              <Icons.CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h3 className="text-base font-semibold text-zinc-200">Zero active diagnostic cases</h3>
              <p className="text-xs text-zinc-500 mt-1">
                No pest outbreaks or crop stress reports pending review from on-site field officers.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredCases.map((c) => (
                <div
                  key={c.id}
                  className="border border-zinc-800/80 rounded-2xl bg-zinc-900/60 backdrop-blur overflow-hidden flex flex-col justify-between hover:border-zinc-700 transition-all shadow-md"
                >
                  <div>
                    {/* Photo Banner */}
                    <div className="relative h-48 w-full bg-zinc-950 border-b border-zinc-800/80 flex items-center justify-center overflow-hidden group">
                      {c.imageUrl ? (
                        <>
                          <Image
                            src={c.imageUrl}
                            alt={c.title}
                            fill
                            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                            className="object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                          <button
                            onClick={() => setZoomImage(c.imageUrl!)}
                            className="absolute bottom-2 right-2 p-1.5 rounded-lg bg-black/60 text-white hover:bg-black/90 backdrop-blur transition-colors opacity-0 group-hover:opacity-100"
                            title="Inspect Full Image"
                          >
                            <Icons.Camera className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <div className="text-center text-zinc-600">
                          <Icons.Camera className="w-10 h-10 mx-auto mb-1 opacity-40" />
                          <span className="text-[11px]">No field photo attached</span>
                        </div>
                      )}

                      <div className="absolute top-2 left-2 flex items-center gap-1.5">
                        <span
                          className={`text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full font-bold border backdrop-blur-md ${
                            c.severity === "CRITICAL" || c.severity === "URGENT" || c.severity === "HIGH"
                              ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                              : "bg-amber-500/20 text-amber-400 border-amber-500/30"
                          }`}
                        >
                          {c.severity}
                        </span>
                        {c.impactPercent && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-black/70 text-zinc-300 border border-zinc-700 backdrop-blur-md">
                            {Number(c.impactPercent)}% impact
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Content */}
                    <div className="p-4 space-y-2.5">
                      <div className="text-[11px] font-medium text-emerald-400 flex items-center gap-1">
                        <span>{c.farmName}</span>
                        {c.plotName && <span>&bull; {c.plotName}</span>}
                        {c.cropName && <span className="text-zinc-400">({c.cropName})</span>}
                      </div>

                      <h3 className="text-sm font-bold text-white leading-tight">{c.title}</h3>
                      <p className="text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                        {c.description}
                      </p>

                      <div className="pt-2 text-[11px] text-zinc-500 flex items-center justify-between border-t border-zinc-800/60">
                        <span>Logged by {c.reportedBy}</span>
                        <span>{formatDate(c.reportedAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-4 pt-0">
                    <button
                      onClick={() => openRxModal(c)}
                      disabled={!c.plotId || !c.cropCycleId}
                      className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white text-xs font-semibold rounded-xl transition-all flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
                    >
                      <Icons.Stethoscope className="w-3.5 h-3.5" />
                      Prescribe Treatment (Rx)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Prescriptions History Tab */
        <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/60 backdrop-blur">
          {recentPrescriptions.length === 0 ? (
            <div className="p-12 text-center text-zinc-400">
              <Icons.Stethoscope className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
              No prescriptions have been issued yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="text-xs uppercase bg-zinc-800/50 text-zinc-400 border-b border-zinc-800">
                  <tr>
                    <th className="px-4 py-3">Target Issue</th>
                    <th className="px-4 py-3">Estate & Plot</th>
                    <th className="px-4 py-3">Recipe & Formulation</th>
                    <th className="px-4 py-3">Priority</th>
                    <th className="px-4 py-3">Date Dispatched</th>
                    <th className="px-4 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60">
                  {recentPrescriptions.map((rx) => (
                    <tr key={rx.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3 font-semibold text-white">{rx.targetIssue}</td>
                      <td className="px-4 py-3 text-xs">
                        <div className="text-zinc-200 font-medium">{rx.farmName}</div>
                        <div className="text-zinc-400">
                          {rx.plotName} &bull; {rx.cropName}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-emerald-400 font-mono">
                        {rx.recipeSummary}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        <span
                          className={`px-2 py-0.5 rounded font-medium border text-[10px] ${
                            rx.priority === "EMERGENCY"
                              ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                              : "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          }`}
                        >
                          {rx.priority}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">{formatDate(rx.dispatchedAt)}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="text-xs px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                          {rx.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Prescription Form Modal */}
      {selectedCase && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Icons.Stethoscope className="w-5 h-5 text-emerald-400" />
                  Prescribe Treatment
                </h2>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Target: <span className="text-emerald-400 font-semibold">{selectedCase.cropName}</span> &bull;{" "}
                  {selectedCase.farmName} &gt; {selectedCase.plotName}
                </div>
              </div>
              <button
                onClick={() => setSelectedCase(null)}
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
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Prescribed Material *</label>
                  <input
                    type="text"
                    value={materialName}
                    onChange={(e) => setMaterialName(e.target.value)}
                    placeholder="e.g. Chlorantraniliprole 18.5% SC"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Dosage Rate *</label>
                  <input
                    type="text"
                    value={dosage}
                    onChange={(e) => setDosage(e.target.value)}
                    placeholder="e.g. 0.3 ml / Liter water"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Carrier / Water Volume</label>
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
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setSelectedCase(null)}
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

      {/* Full Photo Zoom Modal */}
      {zoomImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md cursor-zoom-out"
          onClick={() => setZoomImage(null)}
        >
          <div className="relative max-w-4xl max-h-[85vh] w-full h-full flex items-center justify-center">
            <Image
              src={zoomImage}
              alt="Zoomed Diagnostic"
              fill
              sizes="(max-width: 1200px) 100vw, 1200px"
              className="object-contain rounded-xl"
            />
          </div>
        </div>
      )}
    </div>
  );
}
