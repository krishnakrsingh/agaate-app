"use client";
/* eslint-disable react-hooks/set-state-in-effect */
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
      const [harvestRes, expRes, crewRes, invRes, plotRes, rxRes, incRes] = await Promise.all([
        fetch(`/api/harvest?farmId=${selectedFarmId}`),
        fetch(`/api/expenses?farmId=${selectedFarmId}`),
        fetch(`/api/crew?farmId=${selectedFarmId}`),
        fetch(`/api/inventory?farmId=${selectedFarmId}`),
        fetch(`/api/farms/${selectedFarmId}/plots`),
        fetch(`/api/prescriptions?farmId=${selectedFarmId}&limit=100`),
        fetch(`/api/incidents?farmId=${selectedFarmId}&limit=100&status=OPEN`),
      ]);

      const harvests = harvestRes.ok ? await harvestRes.json() : [];
      const expData = expRes.ok ? await expRes.json() : { expenses: [] };
      const crewMusters = crewRes.ok ? await crewRes.json() : [];
      const inventory = invRes.ok ? await invRes.json() : [];
      const plots = plotRes.ok ? await plotRes.json() : [];
      const prescriptions = rxRes.ok ? await rxRes.json() : [];
      const openIncidents = incRes.ok ? await incRes.json() : [];

      const now = new Date();
      const cutoffDays = timeRange === "7D" ? 7 : 30;
      const cutoffTime = now.getTime() - cutoffDays * 24 * 60 * 60 * 1000;

      const recentHarvests = harvests.filter(
        (h: any) => new Date(h.harvestDate).getTime() >= cutoffTime
      );
      const totalHarvestKg = recentHarvests.reduce((acc: number, h: any) => acc + (Number(h.quantity) || 0), 0);
      const totalRevenue = recentHarvests.reduce((acc: number, h: any) => acc + (Number(h.totalAmount) || 0), 0);

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

      const recentMusters = crewMusters.filter(
        (m: any) => new Date(m.musterDate).getTime() >= cutoffTime
      );
      const labourShiftCount = recentMusters.reduce((acc: number, m: any) => acc + (m.totalLabourers || 0), 0);

      const lowStockItems = inventory
        .filter((i: any) => i.isLowStock)
        .map((i: any) => `${i.name} (${Number(i.quantityInStock)} ${i.unit})`);

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
        prescriptionsCount: Array.isArray(prescriptions) ? prescriptions.length : 0,
        lowStockItems,
        hazardsCount: Array.isArray(openIncidents) ? openIncidents.length : 0,
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
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Action Header */}
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "16px 20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.FileText size={20} style={{ color: "var(--green)" }} />
              Executive Estate Brief
            </h2>
            <span className="badge badge-green">Landowner Report</span>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
            Commercial burn rate, harvest realizations, crop progress, and WhatsApp summary digest.
          </p>
        </div>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {farms.length > 1 && (
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="input-field"
              style={{ fontSize: 12, padding: "6px 12px", width: "auto" }}
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}

          <div style={{ display: "flex", gap: 4, backgroundColor: "var(--stone)", padding: 3, borderRadius: "var(--radius-sm)" }}>
            <button
              type="button"
              onClick={() => setTimeRange("7D")}
              className={`btn btn-sm ${timeRange === "7D" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: 11, padding: "4px 10px" }}
            >
              Last 7 Days
            </button>
            <button
              type="button"
              onClick={() => setTimeRange("30D")}
              className={`btn btn-sm ${timeRange === "30D" ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: 11, padding: "4px 10px" }}
            >
              Last 30 Days
            </button>
          </div>

          <button
            type="button"
            onClick={copyToClipboard}
            className="btn btn-sm btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 12px" }}
          >
            <Icons.ClipboardList size={14} style={{ color: "var(--green)" }} />
            Copy WhatsApp Text
          </button>

          <button
            type="button"
            onClick={shareViaWhatsApp}
            className="btn btn-sm btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 14px" }}
          >
            <Icons.Zap size={14} />
            Share WhatsApp
          </button>
        </div>
      </div>

      {loading || !data ? (
        <div className="card" style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
          <Icons.Spinner size={24} className="animate-spin" style={{ margin: "0 auto 8px", color: "var(--green)" }} />
          Compiling executive estate telemetry...
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Executive Top Banner Card */}
          <div className="card" style={{ padding: 24, border: "1px solid var(--card)" }}>
            <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 16, paddingBottom: 20, borderBottom: "1px solid var(--line)" }}>
              <div>
                <span style={{ fontSize: 11, fontFamily: "monospace", textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--green)", fontWeight: 700 }}>
                  {data.periodLabel}
                </span>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "var(--ink)", margin: "4px 0 2px" }}>{data.farmName}</h2>
                <div className="muted" style={{ fontSize: 12 }}>
                  Reporting Window: {formatDate(data.startDate)} – {formatDate(data.endDate)}
                </div>
              </div>

              <div style={{ textAlign: "right" }}>
                <div style={{ padding: "10px 16px", backgroundColor: "var(--stone)", borderRadius: "var(--radius-sm)", border: "1px solid var(--stone)" }}>
                  <span className="muted" style={{ fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", display: "block" }}>
                    Net Operational Margin
                  </span>
                  <span
                    style={{
                      fontSize: 20,
                      fontFamily: "monospace",
                      fontWeight: 800,
                      color: data.netMargin >= 0 ? "var(--green)" : "var(--danger)",
                    }}
                  >
                    {data.netMargin >= 0 ? "+" : "-"}₹{Math.abs(data.netMargin).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            </div>

            {/* Financial Grid */}
            <div className="metric-summary-row" style={{ marginTop: 20 }}>
              <div className="metric-summary-item">
                <span className="metric-label">Gross Harvest Cut</span>
                <div className="metric-value font-mono">{data.totalHarvestKg.toLocaleString()} KG</div>
                <div className="metric-sub">Weighed &amp; Dispatched</div>
              </div>

              <div className="metric-summary-item">
                <span className="metric-label">Gross Harvest Revenue</span>
                <div className="metric-value font-mono" style={{ color: "var(--green)" }}>
                  ₹{data.totalRevenue.toLocaleString("en-IN")}
                </div>
                <div className="metric-sub">Realized from Buyers</div>
              </div>

              <div className="metric-summary-item">
                <span className="metric-label">Total Operations Burn</span>
                <div className="metric-value font-mono" style={{ color: "var(--danger)" }}>
                  ₹{data.totalSpend.toLocaleString("en-IN")}
                </div>
                <div className="metric-sub">Inputs, Labour &amp; Diesel</div>
              </div>

              <div className="metric-summary-item">
                <span className="metric-label">Labour Shift Count</span>
                <div className="metric-value font-mono" style={{ color: "var(--amber)" }}>{data.labourShiftCount} Shifts</div>
                <div className="metric-sub">₹{data.labourSpend.toLocaleString("en-IN")} Payroll</div>
              </div>
            </div>
          </div>

          {/* Active Crops & Operations */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
            {/* Active Crops */}
            <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                <Icons.TrendingUp size={16} style={{ color: "var(--green)" }} />
                Active Crops &amp; Phenology Status
              </h3>

              {data.activeCrops.length === 0 ? (
                <div className="muted" style={{ fontSize: 12, padding: "16px 0", textAlign: "center" }}>No active crop cycles recorded.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {data.activeCrops.map((c, idx) => (
                    <div key={idx} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid var(--stone)", fontSize: 12 }}>
                      <div>
                        <div style={{ fontWeight: 700, color: "var(--ink)" }}>{c.cropName}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{c.plotName}</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 12, fontFamily: "monospace", fontWeight: 700, color: "var(--green)" }}>{c.daysInGround} Days</span>
                        <div className="muted" style={{ fontSize: 10 }}>{c.stage}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Shed Alerts & Field Observations */}
            <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
                <Icons.AlertTriangle size={16} style={{ color: "var(--amber)" }} />
                Shed Stock &amp; Hazard Alerts
              </h3>

              <div>
                <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", display: "block", marginBottom: 6 }}>Low Shed Inventory (Restock Needed):</span>
                {data.lowStockItems.length === 0 ? (
                  <span style={{ fontSize: 12, color: "var(--green)", display: "flex", alignItems: "center", gap: 6 }}>
                    <Icons.CheckCircle size={14} /> All warehouse inputs above reorder thresholds
                  </span>
                ) : (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {data.lowStockItems.map((sku, idx) => (
                      <span
                        key={idx}
                        className="badge badge-amber font-mono"
                        style={{ fontSize: 11 }}
                      >
                        {sku}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div style={{ paddingTop: 10, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                <span className="muted">Open Hazard / Pest Outbreaks:</span>
                <span className={`badge ${data.hazardsCount === 0 ? "badge-green" : "badge-danger"}`}>
                  {data.hazardsCount === 0 ? "Zero Open Hazards" : `${data.hazardsCount} Active Alerts`}
                </span>
              </div>
            </div>
          </div>

          {/* WhatsApp Preview Box */}
          <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--green)", display: "flex", alignItems: "center", gap: 6 }}>
                <Icons.Zap size={16} />
                Live WhatsApp Message Preview
              </span>
              <button
                type="button"
                onClick={copyToClipboard}
                className="btn btn-sm btn-ghost"
                style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--green)", fontWeight: 600 }}
              >
                <Icons.ClipboardList size={13} /> Copy Text
              </button>
            </div>

            <pre style={{ margin: 0, padding: 14, borderRadius: "var(--radius-xs)", backgroundColor: "var(--stone)", border: "1px solid var(--stone)", fontSize: 12, fontFamily: "monospace", color: "var(--ink)", whiteSpace: "pre-wrap", lineHeight: 1.5, overflowX: "auto" }}>
              {generateWhatsAppText()}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
