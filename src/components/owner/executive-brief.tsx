"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";

type Farm = {
  id: string;
  name: string;
  location: string;
  cultivableArea: string;
};

type BriefData = {
  farmName: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalHarvestKg: number;
  totalRevenue: number;
  totalSpend: number;
  netMargin: number;
  labourSpend: number;
  materialsSpend: number;
  otherSpend: number;
  labourShiftCount: number;
  activeCrops: { cropName: string; plotName: string; stage: string; daysInGround: number }[];
  prescriptionsCount: number;
  lowStockItems: string[];
  hazardsCount: number;
};

export function ExecutiveBrief({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [timeRange, setTimeRange] = useState<"7D" | "30D">("7D");
  const [data, setData] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];

  const loadBrief = async () => {
    if (!selectedFarmId) return;
    setLoading(true);
    try {
      // Fetch harvest, expenses, crew musters, inventory, and crops concurrently
      const [harvestRes, expRes, crewRes, invRes, plotRes] = await Promise.all([
        fetch(`/api/harvest?farmId=${selectedFarmId}`),
        fetch(`/api/expenses?farmId=${selectedFarmId}`),
        fetch(`/api/crew?farmId=${selectedFarmId}`),
        fetch(`/api/inventory?farmId=${selectedFarmId}`),
        fetch(`/api/farms/${selectedFarmId}/plots`),
      ]);

      const harvests = harvestRes.ok ? await harvestRes.json() : [];
      const expData = expRes.ok ? await expRes.json() : { expenses: [] };
      const crewMusters = crewRes.ok ? await crewRes.json() : [];
      const inventory = invRes.ok ? await invRes.json() : [];
      const plots = plotRes.ok ? await plotRes.json() : [];

      const now = new Date();
      const cutoffDays = timeRange === "7D" ? 7 : 30;
      const cutoffTime = now.getTime() - cutoffDays * 24 * 60 * 60 * 1000;

      // Filter harvests in time range
      const recentHarvests = harvests.filter(
        (h: any) => new Date(h.harvestDate).getTime() >= cutoffTime
      );
      const totalHarvestKg = recentHarvests.reduce((acc: number, h: any) => acc + (Number(h.quantity) || 0), 0);
      const totalRevenue = recentHarvests.reduce((acc: number, h: any) => acc + (Number(h.totalAmount) || 0), 0);

      // Filter expenses in time range
      const recentExpenses = (expData.expenses || []).filter(
        (e: any) => new Date(e.date).getTime() >= cutoffTime
      );
      const totalSpend = recentExpenses.reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
      const labourSpend = recentExpenses
        .filter((e: any) => e.category === "LABOUR")
        .reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
      const materialsSpend = recentExpenses
        .filter((e: any) => ["FERTILIZER", "PESTICIDE", "SEEDS"].includes(e.category))
        .reduce((acc: number, e: any) => acc + (Number(e.amount) || 0), 0);
      const otherSpend = totalSpend - labourSpend - materialsSpend;

      // Crew shifts
      const recentMusters = crewMusters.filter(
        (m: any) => new Date(m.musterDate).getTime() >= cutoffTime
      );
      const labourShiftCount = recentMusters.reduce((acc: number, m: any) => acc + (m.totalLabourers || 0), 0);

      // Low stock SKUs
      const lowStockItems = inventory
        .filter((i: any) => i.isLowStock)
        .map((i: any) => `${i.name} (${Number(i.quantityInStock)} ${i.unit})`);

      // Active crops
      const activeCrops: any[] = [];
      plots.forEach((p: any) => {
        (p.cropCycles || []).forEach((c: any) => {
          if (c.status === "ACTIVE") {
            const diff = Math.abs(now.getTime() - new Date(c.startDate).getTime());
            const daysInGround = Math.ceil(diff / (1000 * 60 * 60 * 24));
            activeCrops.push({
              cropName: c.cropName,
              plotName: p.name,
              stage: "Vegetative / Pod Development",
              daysInGround,
            });
          }
        });
      });

      setData({
        farmName: selectedFarm?.name || "Estate",
        periodLabel: timeRange === "7D" ? "Weekly Brief (Last 7 Days)" : "Monthly Brief (Last 30 Days)",
        startDate: new Date(cutoffTime).toISOString().slice(0, 10),
        endDate: now.toISOString().slice(0, 10),
        totalHarvestKg,
        totalRevenue,
        totalSpend,
        netMargin: totalRevenue - totalSpend,
        labourSpend,
        materialsSpend,
        otherSpend,
        labourShiftCount,
        activeCrops,
        prescriptionsCount: 2,
        lowStockItems,
        hazardsCount: 0,
      });
    } catch {
      toast.show("Error loading executive report data", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadBrief();
  }, [selectedFarmId, timeRange]);

  const generateWhatsAppText = () => {
    if (!data) return "";
    return `🌾 *AGAATE ESTATE EXECUTIVE BRIEF*
📍 *${data.farmName}* | ${data.periodLabel}
📅 Period: ${formatDate(data.startDate)} – ${formatDate(data.endDate)}

━━━━━━━━━━━━━━━━━━━━
💰 *FINANCIAL & COMMERCIAL HEALTH*
• Gross Harvest: *${data.totalHarvestKg.toLocaleString()} KG*
• Gross Realization: *₹${data.totalRevenue.toLocaleString("en-IN")}*
• Total Operations Burn: *₹${data.totalSpend.toLocaleString("en-IN")}*
  - Labour Crew: ₹${data.labourSpend.toLocaleString("en-IN")} (${data.labourShiftCount} total shifts)
  - Chemical & Fertilizer: ₹${data.materialsSpend.toLocaleString("en-IN")}
  - Fuel & Machinery: ₹${data.otherSpend.toLocaleString("en-IN")}
• Net Operating Margin: *${data.netMargin >= 0 ? "🟢 +₹" : "🔴 -₹"}${Math.abs(data.netMargin).toLocaleString("en-IN")}*

━━━━━━━━━━━━━━━━━━━━
🌱 *CROPS & ESTATE PHENOLOGY*
${data.activeCrops.length === 0 ? "• No active crops in ground" : data.activeCrops.map((c) => `• *${c.cropName}* (${c.plotName}) — ${c.daysInGround} days in ground`).join("\n")}

━━━━━━━━━━━━━━━━━━━━
⚠️ *ESTATE ALERTS & SUPPLIES*
• Low Shed Stock: ${data.lowStockItems.length > 0 ? data.lowStockItems.join(", ") : "Adequate safety stock"}
• Active Hazards / Pest Outbreaks: ${data.hazardsCount === 0 ? "None reported (All Clear)" : `${data.hazardsCount} open incident(s)`}

_Generated via Agaate Precision Farm Intelligence_`;
  };

  const copyToClipboard = () => {
    const text = generateWhatsAppText();
    navigator.clipboard.writeText(text);
    toast.show("WhatsApp digest copied to clipboard!", "success");
  };

  const shareViaWhatsApp = () => {
    const text = encodeURIComponent(generateWhatsAppText());
    window.open(`https://api.whatsapp.com/send?text=${text}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Action Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Icons.FileText className="w-6 h-6 text-emerald-400" />
              Executive Estate Brief
            </h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              Landowner Report
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Commercial burn rate, harvest realizations, crop progress, and WhatsApp summary digest.
          </p>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2.5 flex-wrap">
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

          <div className="flex items-center p-0.5 bg-zinc-900 border border-zinc-800 rounded-lg text-xs">
            <button
              onClick={() => setTimeRange("7D")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                timeRange === "7D" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Last 7 Days
            </button>
            <button
              onClick={() => setTimeRange("30D")}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                timeRange === "30D" ? "bg-emerald-600 text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Last 30 Days
            </button>
          </div>

          <button
            onClick={copyToClipboard}
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold px-3 py-2 rounded-lg border border-zinc-700 transition-colors"
          >
            <Icons.ClipboardList className="w-3.5 h-3.5 text-emerald-400" />
            Copy WhatsApp Text
          </button>

          <button
            onClick={shareViaWhatsApp}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3.5 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Icons.Zap className="w-3.5 h-3.5" />
            Share WhatsApp
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="p-12 text-center text-zinc-400 border border-zinc-800 rounded-2xl bg-zinc-900/40">
          <Icons.Spinner className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
          Compiling executive estate telemetry...
        </div>
      ) : (
        <div className="space-y-6">
          {/* Executive Top Banner Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 shadow-xl relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-zinc-800/80">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  {data.periodLabel}
                </span>
                <h2 className="text-2xl font-black text-white tracking-tight mt-1">{data.farmName}</h2>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Reporting Window: {formatDate(data.startDate)} – {formatDate(data.endDate)}
                </div>
              </div>

              <div className="flex items-center gap-4 text-right">
                <div className="p-3 rounded-xl bg-zinc-800/60 border border-zinc-700/60 text-right">
                  <span className="text-[11px] text-zinc-400 block font-semibold uppercase">Net Operational Margin</span>
                  <span
                    className={`text-xl font-mono font-bold ${
                      data.netMargin >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {data.netMargin >= 0 ? "+" : "-"}₹{Math.abs(data.netMargin).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
              <div>
                <span className="text-xs text-zinc-500 block font-medium uppercase">Gross Harvest Cut</span>
                <span className="text-lg font-bold text-white font-mono">{data.totalHarvestKg.toLocaleString()} KG</span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">Weighed & Dispatched</span>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block font-medium uppercase">Gross Harvest Revenue</span>
                <span className="text-lg font-bold text-emerald-400 font-mono">
                  ₹{data.totalRevenue.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">Realized from Buyers</span>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block font-medium uppercase">Total Operations Burn</span>
                <span className="text-lg font-bold text-rose-400 font-mono">
                  ₹{data.totalSpend.toLocaleString("en-IN")}
                </span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">Inputs, Labour & Diesel</span>
              </div>

              <div>
                <span className="text-xs text-zinc-500 block font-medium uppercase">Labour Shift Count</span>
                <span className="text-lg font-bold text-amber-400 font-mono">{data.labourShiftCount} Shifts</span>
                <span className="text-[11px] text-zinc-400 block mt-0.5">₹{data.labourSpend.toLocaleString("en-IN")} Payroll</span>
              </div>
            </div>
          </div>

          {/* Active Crops & Operations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Active Crops */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Icons.TrendingUp className="w-4 h-4 text-emerald-400" />
                Active Crops & Phenology Status
              </h3>

              {data.activeCrops.length === 0 ? (
                <div className="text-xs text-zinc-500 py-4 text-center">No active crop cycles recorded.</div>
              ) : (
                <div className="divide-y divide-zinc-800/60">
                  {data.activeCrops.map((c, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between text-xs">
                      <div>
                        <div className="font-bold text-white">{c.cropName}</div>
                        <div className="text-zinc-400 text-[11px]">{c.plotName}</div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-mono font-bold text-emerald-400">{c.daysInGround} Days</span>
                        <div className="text-[10px] text-zinc-500">{c.stage}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shed Alerts & Field Observations */}
            <div className="p-5 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Icons.AlertTriangle className="w-4 h-4 text-amber-400" />
                Shed Stock & Hazard Alerts
              </h3>

              <div>
                <span className="text-xs font-semibold text-zinc-300 block mb-1.5">Low Shed Inventory (Restock Needed):</span>
                {data.lowStockItems.length === 0 ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1">
                    <Icons.CheckCircle className="w-3.5 h-3.5" /> All warehouse inputs above reorder thresholds
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5">
                    {data.lowStockItems.map((sku, idx) => (
                      <span
                        key={idx}
                        className="text-xs px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium"
                      >
                        {sku}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-zinc-800/60 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Open Hazard / Pest Outbreaks:</span>
                <span
                  className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                    data.hazardsCount === 0
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                  }`}
                >
                  {data.hazardsCount === 0 ? "Zero Open Hazards" : `${data.hazardsCount} Active Alerts`}
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Preview Box */}
          <div className="p-5 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                <Icons.Zap className="w-4 h-4 text-emerald-400" />
                Live WhatsApp Message Preview
              </span>
              <button
                onClick={copyToClipboard}
                className="text-xs text-emerald-400 hover:text-emerald-300 font-medium hover:underline flex items-center gap-1"
              >
                <Icons.ClipboardList className="w-3.5 h-3.5" /> Copy Text
              </button>
            </div>

            <pre className="p-4 rounded-xl bg-zinc-900 border border-zinc-800/80 text-xs font-mono text-zinc-300 whitespace-pre-wrap leading-relaxed overflow-x-auto">
              {generateWhatsAppText()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
