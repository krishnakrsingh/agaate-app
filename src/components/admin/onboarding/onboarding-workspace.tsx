"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

interface PipelineFarm {
  id: string;
  name: string;
  location: string;
  ownerName: string;
  clientPhone?: string | null;
  client?: { id: string; name: string; code: string; phone?: string | null } | null;
  totalArea: string;
  cultivableArea: string;
  plotsCount: number;
  status: string;
  setupStage: string;
  setupProgress: number;
  daysInStage: number;
  slaStatus: "ON_TRACK" | "APPROACHING" | "OVERDUE";
  updatedAt: string;
}

interface StageCounts {
  SURVEY_SOIL_TEST: number;
  PLOT_DEMARCATION: number;
  BED_SOIL_PREP: number;
  IRRIGATION_LAYOUT: number;
  HANDED_OVER: number;
  totalInFlight: number;
}

const STAGE_META: { key: string; label: string; short: string; emoji: string }[] = [
  { key: "SURVEY_SOIL_TEST",  label: "Survey & Soil Test",  short: "Survey",      emoji: "🔬" },
  { key: "PLOT_DEMARCATION",  label: "Plot Demarcation",    short: "Demarcation", emoji: "📐" },
  { key: "BED_SOIL_PREP",     label: "Bed & Soil Prep",     short: "Bed Prep",    emoji: "🌱" },
  { key: "IRRIGATION_LAYOUT", label: "Irrigation Layout",   short: "Irrigation",  emoji: "💧" },
  { key: "HANDED_OVER",       label: "Handed Over",         short: "Done",        emoji: "✅" },
];

export function OnboardingWorkspace() {
  const toast = useToast();
  const [loading, setLoading] = useState(true);
  const [farms, setFarms] = useState<PipelineFarm[]>([]);
  const [stageCounts, setStageCounts] = useState<StageCounts>({
    SURVEY_SOIL_TEST: 0,
    PLOT_DEMARCATION: 0,
    BED_SOIL_PREP: 0,
    IRRIGATION_LAYOUT: 0,
    HANDED_OVER: 0,
    totalInFlight: 0,
  });
  const [summary, setSummary] = useState({
    totalAcreage: 0,
    slaOverdue: 0,
    slaApproaching: 0,
  });

  // Filters
  const [selectedStage, setSelectedStage] = useState("ALL");
  const [selectedSla, setSelectedSla] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Batch intake modal state
  const [batchModalOpen, setBatchModalOpen] = useState(false);
  const [batchClientId, setBatchClientId] = useState("");
  const [batchRawData, setBatchRawData] = useState("");
  const [isSubmittingBatch, setIsSubmittingBatch] = useState(false);

  const loadPipeline = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "25",
        stage: selectedStage,
        sla: selectedSla,
      });
      if (searchQuery.trim()) params.set("search", searchQuery.trim());

      const res = await fetch(`/api/admin/setup-pipeline?${params.toString()}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch pipeline.");

      setFarms(data.farms || []);
      setTotalPages(data.pagination?.totalPages || 1);
      setStageCounts(data.stageCounts || {});
      setSummary({
        totalAcreage: data.summaryStats?.totalInFlightAcreage || 0,
        slaOverdue: data.summaryStats?.slaOverdueCount || 0,
        slaApproaching: data.summaryStats?.slaApproachingCount || 0,
      });
    } catch (err: any) {
      toast.error(err.message || "Failed to load onboarding pipeline.");
    } finally {
      setLoading(false);
    }
  }, [page, selectedStage, selectedSla, searchQuery, toast]);

  useEffect(() => {
    loadPipeline();
  }, [loadPipeline]);

  // Stage Advancement
  async function handleAdvanceStage(farmId: string, nextStage: string) {
    try {
      const res = await fetch("/api/admin/setup-pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId, setupStage: nextStage }),
      });
      if (!res.ok) throw new Error("Stage advance failed.");
      toast.success("Stage updated successfully.");
      loadPipeline();
    } catch (err: any) {
      toast.error(err.message || "Unable to advance stage.");
    }
  }

  // Bulk Advance Selected Farms
  async function handleBulkAdvance(nextStage: string) {
    if (!selectedIds.size) return;
    try {
      const res = await fetch("/api/farms/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmIds: [...selectedIds],
          action: "STAGE",
          setupStage: nextStage,
          expectedCount: selectedIds.size,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Bulk advance failed.");
      toast.success(`${data.updated} farm(s) advanced to ${nextStage.replaceAll("_", " ")}.`);
      setSelectedIds(new Set());
      loadPipeline();
    } catch (err: any) {
      toast.error(err.message || "Unable to bulk advance.");
    }
  }

  // Handle Enterprise Multi-Farm Batch Import (e.g. 500 farms under 1 client)
  async function handleBatchSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!batchClientId.trim() || !batchRawData.trim()) {
      toast.error("Please provide both target Client ID and farm records.");
      return;
    }

    const lines = batchRawData.trim().split("\n").filter((l) => l.trim().length > 0);
    setIsSubmittingBatch(true);
    let successCount = 0;
    let failCount = 0;

    for (const line of lines) {
      // Expect CSV format: name,location,lat,lng,totalArea,cultivableArea,waterSource
      const parts = line.split(",").map((p) => p.trim().replace(/^['"]|['"]$/g, ""));
      if (parts.length < 6) {
        failCount++;
        continue;
      }
      const [name, location, latStr, lngStr, totalStr, cultivableStr, waterSource = "Borewell / General"] = parts;
      try {
        const res = await fetch("/api/farms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            clientId: batchClientId.trim(),
            name,
            ownerName: "Client Operations",
            location,
            latitude: parseFloat(latStr) || 12.9716,
            longitude: parseFloat(lngStr) || 77.5946,
            totalArea: parseFloat(totalStr) || 10,
            cultivableArea: parseFloat(cultivableStr) || 8,
            waterSource,
            setupStage: "SURVEY_SOIL_TEST",
          }),
        });
        if (res.ok) successCount++;
        else failCount++;
      } catch {
        failCount++;
      }
    }

    setIsSubmittingBatch(false);
    setBatchModalOpen(false);
    setBatchRawData("");
    toast.success(`Batch intake complete: ${successCount} farms created${failCount ? `, ${failCount} failed` : ""}.`);
    loadPipeline();
  }

  const stageCountMap: Record<string, number> = {
    SURVEY_SOIL_TEST: stageCounts.SURVEY_SOIL_TEST,
    PLOT_DEMARCATION: stageCounts.PLOT_DEMARCATION,
    BED_SOIL_PREP: stageCounts.BED_SOIL_PREP,
    IRRIGATION_LAYOUT: stageCounts.IRRIGATION_LAYOUT,
    HANDED_OVER: stageCounts.HANDED_OVER,
  };

  const nextStageMap: Record<string, string> = {
    SURVEY_SOIL_TEST: "PLOT_DEMARCATION",
    PLOT_DEMARCATION: "BED_SOIL_PREP",
    BED_SOIL_PREP: "IRRIGATION_LAYOUT",
    IRRIGATION_LAYOUT: "HANDED_OVER",
    HANDED_OVER: "HANDED_OVER",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

      {/* 1. Header & Quick Intake Actions */}
      <div style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-xl)", padding: "20px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "16px" }}>
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
            Onboarding Command Pipeline
          </h2>
          <p style={{ fontSize: "13px", color: "var(--muted)", margin: "4px 0 0" }}>
            Real-time stage tracking, SLA bottleneck alerts, and dual intake engines for 1 farm to 500-farm enterprise portfolios.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setBatchModalOpen(true)}>
            <Icons.Upload size={14} />
            <span>Multi-Farm Batch Intake</span>
          </button>
          <Link href="/farms/new" className="btn btn-primary btn-sm">
            <Icons.Plus size={14} />
            <span>New Client Onboarding</span>
          </Link>
        </div>
      </div>

      {/* 2. 5-Stage Pill Filter Bar */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
        {STAGE_META.map((st) => {
          const isSelected = selectedStage === st.key;
          const count = stageCountMap[st.key] ?? 0;
          return (
            <button
              key={st.key}
              type="button"
              onClick={() => { setSelectedStage(isSelected ? "ALL" : st.key); setPage(1); }}
              style={{
                background: isSelected ? "var(--ink)" : "var(--surface-card)",
                border: isSelected ? "1px solid var(--ink)" : "1px solid var(--hairline)",
                borderRadius: "var(--radius-md)",
                padding: "14px 12px",
                textAlign: "left",
                cursor: "pointer",
                transition: "all 0.12s ease",
                color: isSelected ? "#fff" : "inherit",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 6 }}>
                <span style={{ fontSize: 14 }}>{st.emoji}</span>
                <span style={{ fontSize: 10, fontFamily: "var(--font-mono)", textTransform: "uppercase" as const, color: isSelected ? "rgba(255,255,255,0.7)" : "var(--muted)", letterSpacing: "0.06em" }}>
                  {st.short}
                </span>
              </div>
              <div style={{ fontSize: "22px", fontWeight: 700, color: isSelected ? "#fff" : "var(--ink)", lineHeight: 1 }}>
                {count}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. SLA Health Ribbon */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px 18px", background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", fontSize: "13px", flexWrap: "wrap" }}>
        <span style={{ fontWeight: 700, color: "var(--ink)", fontSize: 12, letterSpacing: "0.05em", textTransform: "uppercase" as const }}>SLA Health</span>
        <div style={{ width: 1, height: 16, background: "var(--hairline)", flexShrink: 0 }} />

        <button
          type="button"
          onClick={() => setSelectedSla(selectedSla === "OVERDUE" ? "ALL" : "OVERDUE")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
            background: selectedSla === "OVERDUE" ? "var(--red-light)" : "transparent",
            border: selectedSla === "OVERDUE" ? "1px solid var(--red)" : "1px solid transparent",
            color: "var(--red)",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--red)", flexShrink: 0 }} />
          {summary.slaOverdue} Overdue (&gt;45 days)
        </button>

        <button
          type="button"
          onClick={() => setSelectedSla(selectedSla === "APPROACHING" ? "ALL" : "APPROACHING")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            borderRadius: "var(--radius-pill)",
            background: selectedSla === "APPROACHING" ? "var(--amber-light)" : "transparent",
            border: selectedSla === "APPROACHING" ? "1px solid var(--amber)" : "1px solid transparent",
            color: "var(--amber)",
            fontWeight: 700,
            cursor: "pointer",
            fontSize: 13,
          }}
        >
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: "var(--amber)", flexShrink: 0 }} />
          {summary.slaApproaching} Approaching (30–45 days)
        </button>

        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", color: "var(--muted)", fontSize: 12 }}>
          {summary.totalAcreage.toFixed(1)} ac in-flight
        </span>
      </div>

      {/* 4. Filter Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="search"
          className="input-field"
          placeholder="Search by farm name, survey no, district, owner…"
          value={searchQuery}
          onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
          style={{ maxWidth: "340px", height: "36px", fontSize: "13px" }}
        />

        <select
          aria-label="Filter by Stage"
          value={selectedStage}
          onChange={(e) => { setSelectedStage(e.target.value); setPage(1); }}
          style={{ height: "36px", fontSize: "13px" }}
        >
          <option value="ALL">All Stages</option>
          {STAGE_META.map((st) => (
            <option key={st.key} value={st.key}>{st.emoji} {st.label}</option>
          ))}
        </select>

        {selectedIds.size > 0 && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
            <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>{selectedIds.size} selected</span>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleBulkAdvance("HANDED_OVER")}>
              Handover Selected
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSelectedIds(new Set())}>
              Clear
            </button>
          </div>
        )}
      </div>

      {/* 5. In-Flight Cases Table */}
      <div className="table-responsive">
        <table className="data-table">
          <thead>
            <tr>
              <th style={{ width: 36, textAlign: "center" }}>
                <input
                  type="checkbox"
                  aria-label="Select all on page"
                  checked={farms.length > 0 && farms.every((f) => selectedIds.has(f.id))}
                  onChange={() => {
                    const allOn = farms.every((f) => selectedIds.has(f.id));
                    const next = new Set(selectedIds);
                    if (allOn) farms.forEach((f) => next.delete(f.id));
                    else farms.forEach((f) => next.add(f.id));
                    setSelectedIds(next);
                  }}
                />
              </th>
              <th>Estate Case & Owner</th>
              <th>Current Stage</th>
              <th>SLA Health</th>
              <th>Acreage</th>
              <th>Plots</th>
              <th>Quick Advance</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  Loading onboarding pipeline cases…
                </td>
              </tr>
            ) : farms.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "40px", color: "var(--muted)" }}>
                  No onboarding cases found matching active filters.
                </td>
              </tr>
            ) : (
              farms.map((f) => {
                const nextStage = nextStageMap[f.setupStage] || "HANDED_OVER";
                const nextMeta = STAGE_META.find((s) => s.key === nextStage);
                const slaBg = f.slaStatus === "OVERDUE" ? "var(--red-light)" : f.slaStatus === "APPROACHING" ? "var(--amber-light)" : "var(--surface-strong)";
                const slaColor = f.slaStatus === "OVERDUE" ? "var(--red)" : f.slaStatus === "APPROACHING" ? "var(--amber)" : "var(--muted)";

                return (
                  <tr key={f.id}>
                    <td style={{ textAlign: "center" }}>
                      <input
                        type="checkbox"
                        aria-label={`Select ${f.name}`}
                        checked={selectedIds.has(f.id)}
                        onChange={() => {
                          const next = new Set(selectedIds);
                          if (next.has(f.id)) next.delete(f.id);
                          else next.add(f.id);
                          setSelectedIds(next);
                        }}
                      />
                    </td>
                    <td>
                      <Link href={`/farms/${f.id}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                        {f.name}
                      </Link>
                      <div style={{ fontSize: "12px", color: "var(--muted)", marginTop: "2px" }}>
                        {f.ownerName}{f.client ? ` (${f.client.name})` : ""} · {f.location}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: "12px", fontWeight: 600, color: "var(--ink)" }}>
                        {STAGE_META.find((s) => s.key === f.setupStage)?.emoji}{" "}
                        {STAGE_META.find((s) => s.key === f.setupStage)?.label ?? f.setupStage.replaceAll("_", " ")}
                      </div>
                      {/* Progress bar */}
                      <div style={{ width: "90px", height: "3px", background: "var(--hairline)", borderRadius: "2px", marginTop: "5px", overflow: "hidden" }}>
                        <div style={{ width: `${f.setupProgress}%`, height: "100%", background: "var(--ink)", borderRadius: "2px" }} />
                      </div>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: "11px", fontWeight: 700, padding: "3px 9px", borderRadius: "var(--radius-pill)", background: slaBg, color: slaColor }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: slaColor, flexShrink: 0 }} />
                        {f.daysInStage}d · {f.slaStatus.replace("_", " ")}
                      </span>
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                      {Number(f.cultivableArea || 0)} / {Number(f.totalArea || 0)} ac
                    </td>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "13px" }}>
                      {f.plotsCount}
                    </td>
                    <td>
                      {f.setupStage !== "HANDED_OVER" ? (
                        <button type="button" className="btn btn-secondary btn-sm" onClick={() => handleAdvanceStage(f.id, nextStage)}>
                          {nextMeta?.emoji} {nextMeta?.short ?? "Advance"}
                        </button>
                      ) : (
                        <span className="status-badge active" style={{ fontSize: "10px" }}>COMPLETE</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            ← Previous
          </button>
          <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
            Page {page} of {totalPages}
          </span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>
            Next →
          </button>
        </div>
      )}

      {/* Enterprise Multi-Farm Batch Intake Modal */}
      {batchModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{ position: "fixed", inset: 0, zIndex: 999, display: "grid", placeItems: "center", background: "rgba(12, 10, 9, 0.5)", padding: "20px" }}
        >
          <div style={{ background: "var(--canvas)", border: "1px solid var(--hairline-strong)", borderRadius: "var(--radius-xl)", maxWidth: "600px", width: "100%", padding: "0", boxShadow: "var(--shadow-modal)", maxHeight: "90vh", overflowY: "auto" }}>
            <div style={{ padding: "22px 24px 18px", borderBottom: "1px solid var(--hairline)" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>Enterprise Batch Farmland Provisioning</h3>
              <p style={{ fontSize: "13px", color: "var(--muted)", margin: "5px 0 0" }}>
                Intake up to 500 farms for enterprise clients. Paste CSV rows below.
              </p>
            </div>

            <form onSubmit={handleBatchSubmit} style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label">Target Client ID</label>
                <input type="text" className="input-field" placeholder="e.g., client-1234 or paste Client CUID" value={batchClientId} onChange={(e) => setBatchClientId(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Farm Records (CSV: Name, Location, Lat, Long, TotalAc, CultivableAc, WaterSource)
                </label>
                <textarea
                  className="input-field"
                  rows={8}
                  placeholder={`"North Orchard 1", "Hosur, TN", 12.97, 77.59, 25.0, 20.0, "2x Borewells"\n"North Orchard 2", "Hosur, TN", 12.98, 77.60, 30.0, 25.0, "3x Borewells"`}
                  value={batchRawData}
                  onChange={(e) => setBatchRawData(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setBatchModalOpen(false)} disabled={isSubmittingBatch}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isSubmittingBatch}>
                  {isSubmittingBatch ? "Provisioning Farms…" : "Execute Batch Intake"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
