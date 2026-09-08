"use client";
import { useState, useEffect, FormEvent } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";
import { downloadCsv } from "@/lib/export";

type Farm = {
  id: string;
  name: string;
};

type MusterRecord = {
  id: string;
  musterDate: string;
  totalLabourers: number;
  maleCount?: number | null;
  femaleCount?: number | null;
  hoursPerShift: string;
  dailyWageRate?: string | null;
  totalWageCost?: string | null;
  contractorName?: string | null;
  notes?: string | null;
  farm: { name: string };
  recordedBy: { name: string };
};

export function MobileCrewMuster({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [musterDate, setMusterDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalLabourers, setTotalLabourers] = useState("10");
  const [maleCount, setMaleCount] = useState("4");
  const [femaleCount, setFemaleCount] = useState("6");
  const [hoursPerShift, setHoursPerShift] = useState("8");
  const [dailyWageRate, setDailyWageRate] = useState("450");
  const [contractorName, setContractorName] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [records, setRecords] = useState<MusterRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = async () => {
    if (!selectedFarmId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crew?farmId=${selectedFarmId}`);
      if (res.ok) setRecords(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, [selectedFarmId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const body = {
        farmId: selectedFarmId,
        musterDate,
        totalLabourers: Number(totalLabourers),
        maleCount: maleCount ? Number(maleCount) : null,
        femaleCount: femaleCount ? Number(femaleCount) : null,
        hoursPerShift: Number(hoursPerShift),
        dailyWageRate: dailyWageRate ? Number(dailyWageRate) : null,
        contractorName: contractorName || null,
        notes: notes || null,
      };

      const res = await fetch("/api/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to log crew muster");
      }

      toast.show("Crew muster & daily wage recorded!", "success");
      setNotes("");
      void loadRecords();
    } catch (err: any) {
      toast.show(err.message || "Failed to log muster", "error");
    } finally {
      setPending(false);
    }
  };

  const calculatedTotalSpend = (Number(totalLabourers) || 0) * (Number(dailyWageRate) || 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Icons.Users className="w-5 h-5" />
          </span>
          <div>
            <h1 className="text-xl font-bold text-white">Daily Labour & Crew Muster</h1>
            <p className="text-xs text-zinc-400">
              Track daily field hands, contractors, and wage outflow for your farm.
            </p>
          </div>
        </div>
      </div>

      {/* Main Form */}
      <form onSubmit={handleSubmit} className="space-y-4 bg-zinc-900/70 border border-zinc-800 rounded-2xl p-5 shadow-xl">
        {/* Farm & Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {farms.length > 1 && (
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1">Farm</label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
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
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Muster Date *</label>
            <input
              type="date"
              value={musterDate}
              onChange={(e) => setMusterDate(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Headcounts */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Total Labourers *</label>
            <input
              type="number"
              min="1"
              value={totalLabourers}
              onChange={(e) => setTotalLabourers(e.target.value)}
              required
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Male Count</label>
            <input
              type="number"
              min="0"
              value={maleCount}
              onChange={(e) => setMaleCount(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Female Count</label>
            <input
              type="number"
              min="0"
              value={femaleCount}
              onChange={(e) => setFemaleCount(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* Shift hours & Wage Rate */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Shift Duration (Hours)</label>
            <input
              type="number"
              step="0.5"
              value={hoursPerShift}
              onChange={(e) => setHoursPerShift(e.target.value)}
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Daily Wage / Person (₹)</label>
            <input
              type="number"
              step="1"
              value={dailyWageRate}
              onChange={(e) => setDailyWageRate(e.target.value)}
              placeholder="e.g. 450"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1">Calculated Daily Payout</label>
            <div className="w-full bg-zinc-800/60 border border-zinc-700/80 rounded-lg px-3 py-2 text-sm text-emerald-400 font-mono font-bold">
              ₹{calculatedTotalSpend.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Contractor Name */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Labour Contractor / Gang Leader Name</label>
          <input
            type="text"
            value={contractorName}
            onChange={(e) => setContractorName(e.target.value)}
            placeholder="e.g. Ramesh Maistry / Local Panchayat Gang"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Notes */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1">Work Description / Plot Assignments</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 6 weeding in Plot 1, 4 harvesting in Plot 3"
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={pending}
          className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 active:scale-[0.99] text-white font-semibold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 disabled:opacity-50"
        >
          {pending ? (
            <>
              <Icons.Spinner className="w-4 h-4 animate-spin" />
              Recording Muster...
            </>
          ) : (
            <>
              <Icons.CheckCircle className="w-4 h-4" />
              Save Crew Muster
            </>
          )}
        </button>
      </form>

      {/* Recent Musters Table */}
      <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
            <Icons.Clock className="w-3.5 h-3.5 text-zinc-500" />
            Recent Crew Musters
          </h2>

          <button
            type="button"
            onClick={() => {
              const farmName = farms.find((f) => f.id === selectedFarmId)?.name || "Estate";
              const headers = [
                "Muster Date",
                "Farm",
                "Total Labourers",
                "Male",
                "Female",
                "Hours/Shift",
                "Daily Wage Rate (INR)",
                "Total Wage Cost (INR)",
                "Contractor / Gang",
                "Recorded By",
                "Notes",
              ];
              const rows = records.map((r) => [
                r.musterDate.slice(0, 10),
                r.farm.name,
                r.totalLabourers,
                r.maleCount ?? "",
                r.femaleCount ?? "",
                r.hoursPerShift,
                r.dailyWageRate ?? "",
                r.totalWageCost ?? "",
                r.contractorName ?? "N/A",
                r.recordedBy.name,
                r.notes ?? "",
              ]);
              downloadCsv(`crew-payroll-${farmName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`, headers, rows);
              toast.show("Crew muster payroll exported to CSV!", "success");
            }}
            disabled={records.length === 0}
            className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors disabled:opacity-40"
          >
            <Icons.FileText className="w-3.5 h-3.5" />
            Export Payroll CSV
          </button>
        </div>

        {loading ? (
          <div className="text-xs text-zinc-500 py-3 text-center">Loading muster records...</div>
        ) : records.length === 0 ? (
          <div className="text-xs text-zinc-500 py-3 text-center">No crew muster records found.</div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {records.slice(0, 7).map((r) => (
              <div key={r.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <div className="font-semibold text-white">
                    {r.totalLabourers} Field Hands ({r.maleCount || 0}M / {r.femaleCount || 0}F)
                  </div>
                  <div className="text-zinc-500 text-[11px]">
                    {formatDate(r.musterDate)} {r.contractorName ? `&bull; Contractor: ${r.contractorName}` : ""}
                  </div>
                  {r.notes && <div className="text-zinc-400 text-[11px] mt-0.5">{r.notes}</div>}
                </div>
                <div className="text-right">
                  <div className="font-bold text-emerald-400 font-mono">
                    {r.totalWageCost ? `₹${Number(r.totalWageCost).toLocaleString("en-IN")}` : "-"}
                  </div>
                  <span className="text-[10px] text-zinc-500">
                    Logged by {r.recordedBy.name}
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
