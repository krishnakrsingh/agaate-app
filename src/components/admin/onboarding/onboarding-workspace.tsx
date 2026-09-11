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
      const parts = line.split(",").map((p) => p.trim().replace(/^["']|["']$/g, ""));
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

  const stagesDef = [
    { key: "SURVEY_SOIL_TEST", label: "1. Survey & Soil Test", count: stageCounts.SURVEY_SOIL_TEST },
    { key: "PLOT_DEMARCATION", label: "2. Demarcation", count: stageCounts.PLOT_DEMARCATION },
    { key: "BED_SOIL_PREP", label: "3. Bed Prep", count: stageCounts.BED_SOIL_PREP },
    { key: "IRRIGATION_LAYOUT", label: "4. Irrigation", count: stageCounts.IRRIGATION_LAYOUT },
    { key: "HANDED_OVER", label: "5. Handed Over", count: stageCounts.HANDED_OVER },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
      {/* 1. Header & Quick Intake Actions */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-xl)",
          padding: "20px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "16px",
        }}
      >
        <div>
          <h2 style={{ fontSize: "20px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
            Onboarding Command Pipeline
          </h2>
          <p style={{ fontSize: "14px", color: "var(--muted)", margin: "4px 0 0" }}>
            Real-time stage tracking, SLA bottleneck alerts, and dual intake engines for 1 farm to 500-farm enterprise portfolios.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setBatchModalOpen(true)}
          >
            <Icons.Upload size={14} />
            <span>Multi-Farm Batch Intake (500 Farms)</span>
          </button>

          <Link href="/farms/new" className="btn btn-primary btn-sm">
            <Icons.Plus size={14} />
            <span>Single Farm Intake Wizard</span>
          </Link>
        </div>
      </div>

      {/* 2. 5-Stage Visual Workflow Stepper Bar */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, 1fr)",
          gap: "12px",
        }}
      >
        {stagesDef.map((st) => {
          const isSelected = selectedStage === st.key;
          return (
            <button
              key={st.key}
              type="button"
              onClick={() => {
                setSelectedStage(isSelected ? "ALL" : st.key);
                setPage(1);
              }}
              style={{
                background: isSelected ? "var(--surface-strong)" : "var(--surface-card)",
                border: isSelected ? "2px solid var(--primary)" : "1px solid var(--hairline)",
                borderRadius: "var(--radius-md)",
                padding: "14px",
                textAlign: "left",
                cursor: "pointer",
                transition: "border-color 0.12s ease",
              }}
            >
              <div style={{ fontSize: "11px", fontFamily: "var(--font-mono)", textTransform: "uppercase", color: "var(--muted)" }}>
                {st.label}
              </div>
              <div style={{ fontSize: "22px", fontWeight: 600, color: "var(--ink)", marginTop: "4px" }}>
                {st.count}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. SLA Bottleneck Telemetry Ribbons */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "16px",
          padding: "12px 18px",
          background: "var(--canvas-soft)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          fontSize: "13px",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 600, color: "var(--ink)" }}>SLA Health:</span>
        <button
          type="button"
          onClick={() => setSelectedSla(selectedSla === "OVERDUE" ? "ALL" : "OVERDUE")}
          style={{
            background: selectedSla === "OVERDUE" ? "var(--red-light)" : "transparent",
            color: "var(--red)",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          {summary.slaOverdue} Overdue (&gt;45 days)
        </button>

        <button
          type="button"
          onClick={() => setSelectedSla(selectedSla === "APPROACHING" ? "ALL" : "APPROACHING")}
          style={{
            background: selectedSla === "APPROACHING" ? "var(--amber-light)" : "transparent",
            color: "var(--amber)",
            border: "none",
            fontWeight: 600,
            cursor: "pointer",
            padding: "4px 8px",
            borderRadius: "var(--radius-pill)",
          }}
        >
          {summary.slaApproaching} Approaching SLA (30–45 days)
        </button>

        <span style={{ marginLeft: "auto", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
          Total In-Flight: {summary.totalAcreage.toFixed(1)} acres
        </span>
      </div>

      {/* 4. Filter Toolbar */}
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <input
          type="search"
          className="input-field"
          placeholder="Search cases by farm name, survey no, district, owner..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          style={{ maxWidth: "340px", height: "36px", fontSize: "13px" }}
        />

        <select
          aria-label="Filter by Stage"
          value={selectedStage}
          onChange={(e) => {
            setSelectedStage(e.target.value);
            setPage(1);
          }}
          style={{ height: "36px", fontSize: "13px" }}
        >
          <option value="ALL">All Stages</option>
          <option value="SURVEY_SOIL_TEST">1. Survey & Soil Test</option>
          <option value="PLOT_DEMARCATION">2. Plot Demarcation</option>
          <option value="BED_SOIL_PREP">3. Bed & Soil Prep</option>
          <option value="IRRIGATION_LAYOUT">4. Irrigation Layout</option>
          <option value="HANDED_OVER">5. Handed Over</option>
        </select>

        {selectedIds.size > 0 && (
          <div style={{ display: "inline-flex", alignItems: "center", gap: "8px", marginLeft: "auto" }}>
            <span style={{ fontSize: "13px", fontWeight: 600 }}>{selectedIds.size} selected</span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => handleBulkAdvance("HANDED_OVER")}
            >
              Handover Selected
            </button>
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => setSelectedIds(new Set())}
            >
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
                <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                  Loading onboarding pipeline cases...
                </td>
              </tr>
            ) : farms.length === 0 ? (
              <tr>
                <td colSpan={7} style={{ textAlign: "center", padding: "32px", color: "var(--muted)" }}>
                  No onboarding cases found matching active filters.
                </td>
              </tr>
            ) : (
              farms.map((f) => {
                const nextStageMap: Record<string, string> = {
                  SURVEY_SOIL_TEST: "PLOT_DEMARCATION",
                  PLOT_DEMARCATION: "BED_SOIL_PREP",
                  BED_SOIL_PREP: "IRRIGATION_LAYOUT",
                  IRRIGATION_LAYOUT: "HANDED_OVER",
                  HANDED_OVER: "HANDED_OVER",
                };
                const nextStage = nextStageMap[f.setupStage] || "HANDED_OVER";

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
                        {f.ownerName} {f.client ? `(${f.client.name})` : ""} • {f.location}
                      </div>
                    </td>
                    <td>
                      <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
                        {f.setupStage.replaceAll("_", " ")}
                      </span>
                      <div style={{ width: "80px", height: "4px", background: "var(--hairline)", borderRadius: "2px", marginTop: "4px", overflow: "hidden" }}>
                        <div style={{ width: `${f.setupProgress}%`, height: "100%", background: "var(--primary)" }} />
                      </div>
                    </td>
                    <td>
                      <span
                        style={{
                          fontSize: "11px",
                          fontFamily: "var(--font-mono)",
                          fontWeight: 600,
                          padding: "2px 8px",
                          borderRadius: "var(--radius-pill)",
                          background:
                            f.slaStatus === "OVERDUE"
                              ? "var(--red-light)"
                              : f.slaStatus === "APPROACHING"
                              ? "var(--amber-light)"
                              : "var(--surface-strong)",
                          color:
                            f.slaStatus === "OVERDUE"
                              ? "var(--red)"
                              : f.slaStatus === "APPROACHING"
                              ? "var(--amber)"
                              : "var(--ink)",
                        }}
                      >
                        {f.daysInStage}d • {f.slaStatus}
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
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => handleAdvanceStage(f.id, nextStage)}
                        >
                          Advance → {nextStage.replaceAll("_", " ").slice(0, 8)}
                        </button>
                      ) : (
                        <span className="status-badge active" style={{ fontSize: "10px" }}>
                          COMPLETE
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            ← Previous Page
          </button>
          <span style={{ fontSize: "12px", fontFamily: "var(--font-mono)", color: "var(--muted)" }}>
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= totalPages}
            onClick={() => setPage(page + 1)}
          >
            Next Page →
          </button>
        </div>
      )}

      {/* Enterprise Multi-Farm Batch Intake Modal */}
      {batchModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 999,
            display: "grid",
            placeItems: "center",
            background: "rgba(12, 10, 9, 0.4)",
            padding: "20px",
          }}
        >
          <div
            style={{
              background: "var(--canvas)",
              border: "1px solid var(--hairline-strong)",
              borderRadius: "var(--radius-xl)",
              maxWidth: "600px",
              width: "100%",
              padding: "24px",
              boxShadow: "var(--shadow-modal)",
              maxHeight: "90vh",
              overflowY: "auto",
            }}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)", marginBottom: "6px" }}>
              Enterprise Batch Farmland Provisioning
            </h3>
            <p style={{ fontSize: "13px", color: "var(--muted)", marginBottom: "16px" }}>
              Quickly intake up to 500 farms for enterprise clients without repeating the form 500 times. Paste CSV rows below:
            </p>

            <form onSubmit={handleBatchSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="form-group">
                <label className="form-label">Target Client ID</label>
                <input
                  type="text"
                  className="input-field"
                  placeholder="e.g., client-1234 or paste Client CUID"
                  value={batchClientId}
                  onChange={(e) => setBatchClientId(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  Farm Records (CSV format: Name, Location, Lat, Long, TotalAc, CultivableAc, WaterSource)
                </label>
                <textarea
                  className="input-field"
                  rows={8}
                  placeholder={`"North Orchard 1", "Hosur, TN", 12.97, 77.59, 25.0, 20.0, "2x Borewells"
"North Orchard 2", "Hosur, TN", 12.98, 77.60, 30.0, 25.0, "3x Borewells"`}
                  value={batchRawData}
                  onChange={(e) => setBatchRawData(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "8px" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setBatchModalOpen(false)}
                  disabled={isSubmittingBatch}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isSubmittingBatch}
                >
                  {isSubmittingBatch ? "Provisioning Farms..." : "Execute Batch Intake"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
