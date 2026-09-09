"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";
import { StatusBadge } from "./ui/badge";
import { useToast } from "./ui/toast";
import { FarmSetupStage } from "@prisma/client";

export type MacroTelemetry = {
  totalClients: number;
  totalFarms: number;
  activeFarms: number;
  setupFarms: number;
  totalAcreage: number;
  totalCultivable: number;
  totalPlots: number;
  inFlightSetups: number;
};

export type SetupPipelineItem = {
  id: string;
  name: string;
  surveyNumber?: string | null;
  village?: string | null;
  taluk?: string | null;
  district?: string | null;
  state?: string | null;
  location: string;
  ownerName: string;
  clientPhone?: string | null;
  clientName: string;
  clientCode: string;
  totalArea: string;
  cultivableArea: string;
  plotsCount: number;
  status: string;
  setupStage: FarmSetupStage;
  setupProgress: number;
  soilType?: string | null;
  soilPh?: string | null;
  waterSource?: string | null;
  fencingType?: string | null;
  targetHandoverDate?: string | null;
  daysInStage?: number;
  slaStatus?: "ON_TRACK" | "APPROACHING" | "OVERDUE";
  createdAt: string;
  updatedAt?: string;
  handedOverAt?: string | null;
};

export type ClientDirectoryItem = {
  id: string;
  code: string;
  name: string;
  companyName?: string | null;
  email?: string | null;
  phone?: string | null;
  state?: string | null;
  district?: string | null;
  status: string;
  createdAt: string;
  totalFarms: number;
  activeFarmsCount: number;
  setupFarmsCount: number;
  totalAcreage: number;
  totalCultivable: number;
  farms: {
    id: string;
    name: string;
    status: string;
    setupStage: string;
    setupProgress: number;
    cultivableArea: string;
  }[];
  owners: {
    id: string;
    name: string;
    email?: string | null;
    phone?: string | null;
  }[];
};

interface DashboardClientProps {
  macroTelemetry: MacroTelemetry;
  stageCounts: Record<FarmSetupStage, number>;
  initialPipelineFarms: SetupPipelineItem[];
  initialClients: ClientDirectoryItem[];
  userName?: string;
  role?: string;
}

const STAGE_METADATA: Record<
  FarmSetupStage,
  { label: string; stepNumber: number; nextStage?: FarmSetupStage; defaultProgress: number; desc: string }
> = {
  SURVEY_SOIL_TEST: {
    label: "Survey & Soil Testing",
    stepNumber: 1,
    nextStage: "PLOT_DEMARCATION",
    defaultProgress: 20,
    desc: "Topographic mapping & soil/water laboratory test",
  },
  PLOT_DEMARCATION: {
    label: "Plot Demarcation",
    stepNumber: 2,
    nextStage: "BED_SOIL_PREP",
    defaultProgress: 40,
    desc: "Boundary fencing, roads, and parcel zoning",
  },
  BED_SOIL_PREP: {
    label: "Bed & Soil Preparation",
    stepNumber: 3,
    nextStage: "IRRIGATION_LAYOUT",
    defaultProgress: 60,
    desc: "Tilling, raised beds, compost, and mulching",
  },
  IRRIGATION_LAYOUT: {
    label: "Irrigation Layout",
    stepNumber: 4,
    nextStage: "HANDED_OVER",
    defaultProgress: 80,
    desc: "Drip manifolds, venturi injectors, and pump tests",
  },
  HANDED_OVER: {
    label: "Handed Over (Client Live)",
    stepNumber: 5,
    defaultProgress: 100,
    desc: "Final audit passed & client operations unlocked",
  },
};

const STAGES_ORDER: FarmSetupStage[] = [
  "SURVEY_SOIL_TEST",
  "PLOT_DEMARCATION",
  "BED_SOIL_PREP",
  "IRRIGATION_LAYOUT",
  "HANDED_OVER",
];

export function DashboardClient({
  macroTelemetry,
  stageCounts,
  initialPipelineFarms,
  initialClients,
  userName = "Super Administrator",
}: DashboardClientProps) {
  const router = useRouter();
  const toast = useToast();

  const [activeTab, setActiveTab] = useState<"PIPELINE" | "CLIENTS" | "REGIONAL">("PIPELINE");
  const [pipelineFarms, setPipelineFarms] = useState<SetupPipelineItem[]>(initialPipelineFarms);
  const [clients] = useState<ClientDirectoryItem[]>(initialClients);

  // Server-side pagination & filter states for 100,000+ scale
  const [pipelineSearch, setPipelineSearch] = useState("");
  const [pipelineStageFilter, setPipelineStageFilter] = useState<string>("ALL");
  const [pipelineSlaFilter, setPipelineSlaFilter] = useState<string>("ALL");
  const [pipelineStateFilter, setPipelineStateFilter] = useState<string>("ALL");
  const [pipelineSortBy, setPipelineSortBy] = useState<string>("updatedAt");
  const [pipelinePage, setPipelinePage] = useState(1);
  const [pipelineLimit, setPipelineLimit] = useState(25);
  const [pipelineTotalCount, setPipelineTotalCount] = useState(macroTelemetry.inFlightSetups);
  const [pipelineTotalPages, setPipelineTotalPages] = useState(Math.max(1, Math.ceil(macroTelemetry.inFlightSetups / 25)));
  const [pipelineLoading, setPipelineLoading] = useState(false);
  const [liveStageCounts, setLiveStageCounts] = useState<Record<FarmSetupStage, number> & { totalInFlight?: number }>(stageCounts);
  const [liveSummaryStats, setLiveSummaryStats] = useState({
    totalInFlightAcreage: 0,
    slaOverdueCount: 0,
    slaApproachingCount: 0,
  });
  const [selectedDossierFarm, setSelectedDossierFarm] = useState<SetupPipelineItem | null>(null);

  // Client Directory search & filter states
  const [clientSearch, setClientSearch] = useState("");
  const [clientStateFilter, setClientStateFilter] = useState<string>("ALL");

  // Modals & async action states
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedClient, setSelectedClient] = useState<ClientDirectoryItem | null>(null);

  // Debounced server fetch for 100,000+ farms scale
  useEffect(() => {
    let isMounted = true;
    const timer = setTimeout(() => {
      setPipelineLoading(true);
      const params = new URLSearchParams({
        page: String(pipelinePage),
        limit: String(pipelineLimit),
        stage: pipelineStageFilter,
        sla: pipelineSlaFilter,
        state: pipelineStateFilter === "ALL" ? "" : pipelineStateFilter,
        sortBy: pipelineSortBy,
      });
      if (pipelineSearch.trim()) {
        params.set("search", pipelineSearch.trim());
      }

      fetch(`/api/admin/setup-pipeline?${params.toString()}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!isMounted || !data) return;
          setPipelineFarms(data.farms || []);
          if (data.pagination) {
            setPipelineTotalCount(data.pagination.totalCount);
            setPipelineTotalPages(data.pagination.totalPages);
          }
          if (data.stageCounts) {
            setLiveStageCounts(data.stageCounts);
          }
          if (data.summaryStats) {
            setLiveSummaryStats(data.summaryStats);
          }
        })
        .catch(() => undefined)
        .finally(() => {
          if (isMounted) setPipelineLoading(false);
        });
    }, 250);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [pipelineSearch, pipelineStageFilter, pipelineSlaFilter, pipelineStateFilter, pipelineSortBy, pipelinePage, pipelineLimit]);


  // Filtered clients
  const filteredClients = useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    return clients.filter((c) => {
      const matchState = clientStateFilter === "ALL" || (c.state && c.state === clientStateFilter);
      const matchSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        (c.phone && c.phone.includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q)) ||
        (c.companyName && c.companyName.toLowerCase().includes(q)) ||
        (c.district && c.district.toLowerCase().includes(q));
      return matchState && matchSearch;
    });
  }, [clients, clientSearch, clientStateFilter]);

  // Advance farm to next stage
  const handleAdvanceStage = async (farm: SetupPipelineItem) => {
    const currentMeta = STAGE_METADATA[farm.setupStage];
    if (!currentMeta.nextStage) return;

    const nextStage = currentMeta.nextStage;
    const nextMeta = STAGE_METADATA[nextStage];

    // If next stage is HANDED_OVER, use the dedicated handover endpoint
    if (nextStage === "HANDED_OVER") {
      await handleHandover(farm.id, farm.name);
      return;
    }

    setProcessingId(farm.id);
    try {
      const res = await fetch("/api/admin/setup-pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: farm.id,
          setupStage: nextStage,
          setupProgress: nextMeta.defaultProgress,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to advance stage.");
      }

      setPipelineFarms((prev) =>
        prev.map((f) =>
          f.id === farm.id
            ? { ...f, setupStage: nextStage, setupProgress: nextMeta.defaultProgress }
            : f
        )
      );

      toast.success(`${farm.name} advanced to ${nextMeta.label}.`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to advance setup stage.");
    } finally {
      setProcessingId(null);
    }
  };

  // 1-Click Handover and Activation
  const handleHandover = async (farmId: string, farmName: string) => {
    setProcessingId(farmId);
    try {
      const res = await fetch(`/api/admin/farms/${farmId}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Handover failed.");
      }

      const data = await res.json();

      setPipelineFarms((prev) =>
        prev.map((f) =>
          f.id === farmId
            ? {
                ...f,
                setupStage: "HANDED_OVER",
                setupProgress: 100,
                status: "ACTIVE",
                handedOverAt: data.handedOverAt,
              }
            : f
        )
      );

      toast.success(`Estate ${farmName} successfully handed over! Client access unlocked.`);
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Handover operation failed.");
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* ── 1. EXECUTIVE COMMAND HEADER & DIRECT ACTIONS ── */}
      <div className="page-header" style={{ paddingBottom: 16 }}>
        <div className="page-header-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>ENTERPRISE COMMAND • AGARTE HQ DIRECTIVE</span>
          </div>
          <h1 className="page-title">National Farm Infrastructure &amp; Client Directorate</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: 760 }}>
            Master operational oversight across {macroTelemetry.totalClients.toLocaleString()} client accounts and{" "}
            {macroTelemetry.totalFarms.toLocaleString()} estates. Tracking the 5-stage turnkey setup pipeline from raw land survey to client handover.
          </p>
        </div>

        {/* Global Master Actions */}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center", alignSelf: "flex-start" }}>
          <Link href="/farms/new" className="btn btn-primary">
            <Icons.Plus size={15} />
            <span>Onboard Client &amp; Farm</span>
          </Link>
          <Link href="/admin/users" className="btn btn-secondary">
            <Icons.Users size={15} />
            <span>Client &amp; Staff Accounts</span>
          </Link>
          <Link href="/admin/audit" className="btn btn-secondary">
            <Icons.Activity size={15} />
            <span>Audit Trail</span>
          </Link>
          <Link href="/admin/attendance" className="btn btn-secondary">
            <Icons.Users size={15} />
            <span>Field Workforce</span>
          </Link>
        </div>
      </div>

      {/* ── 2. MACRO ENTERPRISE KPI DECK (10,000+ CLIENT CAPACITY) ── */}
      <div className="metric-summary-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
        <div className="metric-summary-item">
          <span className="metric-label">Enterprise Clients</span>
          <div className="metric-value" style={{ color: "var(--ink)" }}>
            {macroTelemetry.totalClients.toLocaleString()}
          </div>
          <div className="metric-sub">Active client accounts across India</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Turnkey Setups In-Flight</span>
          <div className="metric-value" style={{ color: "var(--amber)" }}>
            {macroTelemetry.inFlightSetups.toLocaleString()}
          </div>
          <div className="metric-sub">
            {stageCounts.SURVEY_SOIL_TEST} Survey • {stageCounts.PLOT_DEMARCATION} Plots • {stageCounts.BED_SOIL_PREP} Beds • {stageCounts.IRRIGATION_LAYOUT} Drip
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Farmland Under Mgmt</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {Math.round(macroTelemetry.totalCultivable).toLocaleString()}{" "}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>
              / {Math.round(macroTelemetry.totalAcreage).toLocaleString()} Ac
            </span>
          </div>
          <div className="metric-sub">{macroTelemetry.totalPlots.toLocaleString()} demarcated parcels ready</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Live Handed-Over Estates</span>
          <div className="metric-value" style={{ color: "var(--ink)" }}>
            {macroTelemetry.activeFarms.toLocaleString()}{" "}
            <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>
              / {macroTelemetry.totalFarms.toLocaleString()} Total
            </span>
          </div>
          <div className="metric-sub">{stageCounts.HANDED_OVER} completed handovers</div>
        </div>
      </div>

      {/* ── 3. SEGMENTED PRIMARY NAVIGATION ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 14 }}>
        <div className="tabs-nav" style={{ padding: 6, gap: 6 }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === "PIPELINE" ? "active" : ""}`}
            onClick={() => setActiveTab("PIPELINE")}
          >
            <Icons.Layers size={15} />
            <span>Turnkey Setup Pipeline</span>
            <span className="badge badge-amber" style={{ fontSize: 11, padding: "2px 8px" }}>
              {macroTelemetry.inFlightSetups} Active
            </span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === "CLIENTS" ? "active" : ""}`}
            onClick={() => setActiveTab("CLIENTS")}
          >
            <Icons.Users size={15} />
            <span>Client Accounts Directory</span>
            <span className="badge badge-muted" style={{ fontSize: 11, padding: "2px 8px" }}>
              {macroTelemetry.totalClients.toLocaleString()}
            </span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === "REGIONAL" ? "active" : ""}`}
            onClick={() => setActiveTab("REGIONAL")}
          >
            <Icons.MapPin size={15} />
            <span>National Footprint</span>
          </button>
        </div>
      </div>

      {/* ── 4. TAB 1: 5-STAGE TURNKEY SETUP PIPELINE (KANBAN BOARD) ── */}
      {activeTab === "PIPELINE" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* 1. STAGE TELEMETRY FUNNEL DECK (100,000+ FARMS CAPACITY) */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            <div
              onClick={() => {
                setPipelineStageFilter("ALL");
                setPipelinePage(1);
              }}
              className="compact-card"
              style={{
                padding: "12px 14px",
                cursor: "pointer",
                border: pipelineStageFilter === "ALL" ? "2px solid var(--green)" : "1px solid var(--line)",
                background: pipelineStageFilter === "ALL" ? "var(--green-light)" : "var(--canvas)",
                transition: "all 0.15s ease",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="mono-label" style={{ fontSize: 10, color: "var(--ink-soft)" }}>ALL IN-FLIGHT</span>
                <span className="badge badge-amber" style={{ fontSize: 10, padding: "1px 6px" }}>
                  {liveStageCounts.totalInFlight ?? macroTelemetry.inFlightSetups}
                </span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, margin: "4px 0 2px", color: "var(--ink)" }}>
                Total Pipeline
              </div>
              <div className="muted" style={{ fontSize: 11 }}>
                All 5 stages across India
              </div>
            </div>

            {STAGES_ORDER.map((st) => {
              const meta = STAGE_METADATA[st];
              const count = liveStageCounts[st] ?? 0;
              const isSelected = pipelineStageFilter === st;
              const isHandover = st === "HANDED_OVER";

              return (
                <div
                  key={st}
                  onClick={() => {
                    setPipelineStageFilter(isSelected ? "ALL" : st);
                    setPipelinePage(1);
                  }}
                  className="compact-card"
                  style={{
                    padding: "12px 14px",
                    cursor: "pointer",
                    border: isSelected ? "2px solid var(--green)" : "1px solid var(--line)",
                    background: isSelected ? "var(--green-light)" : "var(--canvas)",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span className="mono-label" style={{ fontSize: 10, color: "var(--ink-soft)" }}>
                      STAGE {meta.stepNumber} OF 5
                    </span>
                    <span
                      className={`badge ${isHandover ? "badge-green" : count > 0 ? "badge-amber" : "badge-muted"}`}
                      style={{ fontSize: 10, padding: "1px 6px" }}
                    >
                      {count}
                    </span>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 700, margin: "4px 0 2px", color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {meta.label}
                  </div>
                  <div className="muted" style={{ fontSize: 11, lineHeight: 1.2, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {meta.desc}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 2. HIGH-DENSITY OPERATIONAL CONTROLS TOOLBAR */}
          <div
            className="compact-card"
            style={{
              padding: "14px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              {/* Search input */}
              <div style={{ position: "relative", width: 280 }}>
                <input
                  type="text"
                  placeholder="Search farm, Khasra/survey #, client, district..."
                  value={pipelineSearch}
                  onChange={(e) => {
                    setPipelineSearch(e.target.value);
                    setPipelinePage(1);
                  }}
                  className="input-field"
                  style={{ fontSize: 12, padding: "6px 28px 6px 28px" }}
                />
                <span style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)", pointerEvents: "none" }}>
                  <Icons.Search size={13} />
                </span>
                {pipelineSearch && (
                  <button
                    type="button"
                    onClick={() => {
                      setPipelineSearch("");
                      setPipelinePage(1);
                    }}
                    style={{ position: "absolute", right: 8, top: 8, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}
                  >
                    <Icons.X size={12} />
                  </button>
                )}
              </div>

              {/* Stage Filter */}
              <select
                value={pipelineStageFilter}
                onChange={(e) => {
                  setPipelineStageFilter(e.target.value);
                  setPipelinePage(1);
                }}
                className="input-field"
                style={{ fontSize: 12, padding: "6px 10px", width: "auto" }}
              >
                <option value="ALL">All 5 Pipeline Stages</option>
                {STAGES_ORDER.map((st) => (
                  <option key={st} value={st}>
                    Stage {STAGE_METADATA[st].stepNumber}: {STAGE_METADATA[st].label} ({liveStageCounts[st] ?? 0})
                  </option>
                ))}
              </select>

              {/* SLA Health Filter */}
              <select
                value={pipelineSlaFilter}
                onChange={(e) => {
                  setPipelineSlaFilter(e.target.value);
                  setPipelinePage(1);
                }}
                className="input-field"
                style={{ fontSize: 12, padding: "6px 10px", width: "auto" }}
              >
                <option value="ALL">All SLA Statuses</option>
                <option value="ON_TRACK">On Track (&lt;30 days)</option>
                <option value="APPROACHING">Approaching SLA (30-45 days)</option>
                <option value="OVERDUE">Overdue / Delayed (&gt;45 days)</option>
              </select>

              {/* Region Filter */}
              <select
                value={pipelineStateFilter}
                onChange={(e) => {
                  setPipelineStateFilter(e.target.value);
                  setPipelinePage(1);
                }}
                className="input-field"
                style={{ fontSize: 12, padding: "6px 10px", width: "auto" }}
              >
                <option value="ALL">All States / Regions</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Gujarat">Gujarat</option>
              </select>

              {/* Sort Order */}
              <select
                value={pipelineSortBy}
                onChange={(e) => {
                  setPipelineSortBy(e.target.value);
                  setPipelinePage(1);
                }}
                className="input-field"
                style={{ fontSize: 12, padding: "6px 10px", width: "auto" }}
              >
                <option value="updatedAt">Sort: Recently Updated</option>
                <option value="targetHandoverDate">Sort: Target Handover Date</option>
                <option value="totalArea">Sort: Total Acreage (Desc)</option>
                <option value="setupProgress">Sort: Stage Progress (%)</option>
              </select>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              {pipelineLoading && (
                <span className="muted" style={{ fontSize: 12 }}>
                  Refreshing data...
                </span>
              )}
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Showing {pipelineFarms.length} of {pipelineTotalCount} estates
              </div>
            </div>
          </div>

          {/* 3. DATA-DENSE OPERATIONAL WORKLIST TABLE */}
          <div className="compact-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12, textAlign: "left" }}>
                <thead>
                  <tr style={{ background: "var(--surface-strong)", borderBottom: "1px solid var(--line)" }}>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--ink)" }}>ESTATE &amp; CADASTRAL RECORD</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--ink)" }}>CLIENT ACCOUNT</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--ink)" }}>ACREAGE &amp; ZONING</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--ink)" }}>SOIL &amp; HYDROLOGY</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--ink)" }}>TURNKEY STAGE &amp; PROGRESS</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--ink)" }}>SLA &amp; TIMELINE</th>
                    <th style={{ padding: "10px 14px", fontWeight: 700, color: "var(--ink)", textAlign: "right" }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {pipelineFarms.map((farm) => {
                    const meta = STAGE_METADATA[farm.setupStage] || STAGE_METADATA.SURVEY_SOIL_TEST;
                    const isHandover = farm.setupStage === "HANDED_OVER";
                    const isReadyForHandover = farm.setupStage === "IRRIGATION_LAYOUT";

                    return (
                      <tr
                        key={farm.id}
                        style={{
                          borderBottom: "1px solid var(--line)",
                          background: isHandover ? "var(--green-light)" : "var(--canvas)",
                        }}
                      >
                        {/* Estate & Cadastral */}
                        <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                          <Link
                            href={`/farms/${farm.id}`}
                            style={{ fontWeight: 700, color: "var(--ink)", fontSize: 13, textDecoration: "none" }}
                          >
                            {farm.name}
                          </Link>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 3 }}>
                            {farm.surveyNumber ? (
                              <span className="badge badge-stone font-mono" style={{ fontSize: 10 }}>
                                #{farm.surveyNumber}
                              </span>
                            ) : null}
                            <span className="muted" style={{ fontSize: 11 }}>
                              📍 {farm.village ? `${farm.village}, ` : ""}{farm.district || farm.location}
                            </span>
                          </div>
                        </td>

                        {/* Client Account */}
                        <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                          <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                            {farm.clientName}
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 2 }}>
                            <span className="badge badge-muted font-mono" style={{ fontSize: 9 }}>
                              {farm.clientCode}
                            </span>
                            {farm.clientPhone && (
                              <span className="muted font-mono" style={{ fontSize: 10 }}>
                                {farm.clientPhone}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Acreage & Zoning */}
                        <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                          <div>
                            <strong>{farm.cultivableArea}</strong> / {farm.totalArea} Ac
                          </div>
                          <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
                            {farm.plotsCount} Parcels Demarcated
                          </div>
                        </td>

                        {/* Soil & Hydrology */}
                        <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                          <div>{farm.soilType || "Red Sandy Loam"}</div>
                          <div className="muted" style={{ fontSize: 10, marginTop: 2 }}>
                            💧 {farm.waterSource || "Borewell Grid"}
                          </div>
                        </td>

                        {/* Turnkey Stage & Progress */}
                        <td style={{ padding: "10px 14px", verticalAlign: "top", minWidth: 200 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                            <span
                              className={`badge ${isHandover ? "badge-green" : "badge-amber"}`}
                              style={{ fontSize: 10, padding: "1px 6px" }}
                            >
                              Stage {meta.stepNumber}: {meta.label}
                            </span>
                            <span style={{ fontWeight: 700, fontSize: 11, color: isHandover ? "var(--green)" : "var(--ink)" }}>
                              {farm.setupProgress}%
                            </span>
                          </div>
                          <div style={{ width: "100%", height: 5, background: "var(--surface-strong)", borderRadius: 3, overflow: "hidden" }}>
                            <div
                              style={{
                                width: `${farm.setupProgress}%`,
                                height: "100%",
                                background: isHandover ? "var(--green)" : "var(--amber)",
                                transition: "width 0.3s ease",
                              }}
                            />
                          </div>
                        </td>

                        {/* SLA & Timeline */}
                        <td style={{ padding: "10px 14px", verticalAlign: "top" }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span
                              className={`badge ${
                                isHandover
                                  ? "badge-green"
                                  : farm.slaStatus === "OVERDUE"
                                  ? "badge-rose"
                                  : farm.slaStatus === "APPROACHING"
                                  ? "badge-amber"
                                  : "badge-green"
                              }`}
                              style={{ fontSize: 10 }}
                            >
                              {isHandover
                                ? "HANDED OVER"
                                : farm.slaStatus === "OVERDUE"
                                ? "OVERDUE"
                                : farm.slaStatus === "APPROACHING"
                                ? "APPROACHING"
                                : "ON TRACK"}
                            </span>
                          </div>
                          <div className="muted font-mono" style={{ fontSize: 10, marginTop: 3 }}>
                            {farm.daysInStage !== undefined ? `${farm.daysInStage} days in stage` : "Current stage"}
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: "10px 14px", verticalAlign: "top", textAlign: "right" }}>
                          <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => setSelectedDossierFarm(farm)}
                              className="btn btn-sm btn-outline"
                              style={{ fontSize: 11, padding: "4px 8px" }}
                              title="Inspect complete technical dossier"
                            >
                              Dossier
                            </button>

                            {isReadyForHandover && (
                              <button
                                type="button"
                                onClick={() => handleHandover(farm.id, farm.name)}
                                disabled={processingId === farm.id}
                                className="btn btn-sm btn-primary"
                                style={{
                                  fontSize: 11,
                                  padding: "4px 8px",
                                  background: "var(--green)",
                                  borderColor: "var(--green)",
                                }}
                              >
                                {processingId === farm.id ? "Activating..." : "1-Click Handover"}
                              </button>
                            )}

                            {meta.nextStage && !isReadyForHandover && !isHandover && (
                              <button
                                type="button"
                                onClick={() => handleAdvanceStage(farm)}
                                disabled={processingId === farm.id}
                                className="btn btn-sm btn-secondary"
                                style={{ fontSize: 11, padding: "4px 8px" }}
                              >
                                {processingId === farm.id ? "..." : `Advance →`}
                              </button>
                            )}

                            {isHandover && (
                              <Link
                                href="/owner/dashboard"
                                className="btn btn-sm btn-ghost"
                                style={{ fontSize: 11, padding: "4px 8px", color: "var(--green-dark)" }}
                              >
                                Live Cockpit
                              </Link>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {pipelineFarms.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ padding: "40px 16px", textAlign: "center" }} className="muted">
                        No farmland infrastructure setups matched your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div
              style={{
                padding: "12px 18px",
                background: "var(--surface-strong)",
                borderTop: "1px solid var(--line)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Showing page {pipelinePage} of {pipelineTotalPages} ({pipelineTotalCount} total estates)
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <select
                  value={pipelineLimit}
                  onChange={(e) => {
                    setPipelineLimit(Number(e.target.value));
                    setPipelinePage(1);
                  }}
                  className="input-field"
                  style={{ fontSize: 11, padding: "4px 8px", width: "auto" }}
                >
                  <option value={20}>20 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>

                <button
                  type="button"
                  onClick={() => setPipelinePage((p) => Math.max(1, p - 1))}
                  disabled={pipelinePage <= 1}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  ← Previous
                </button>
                <button
                  type="button"
                  onClick={() => setPipelinePage((p) => Math.min(pipelineTotalPages, p + 1))}
                  disabled={pipelinePage >= pipelineTotalPages}
                  className="btn btn-sm btn-secondary"
                  style={{ fontSize: 11, padding: "4px 10px" }}
                >
                  Next →
                </button>
              </div>
            </div>
          </div>

          {/* 4. TECHNICAL DOSSIER INSPECTION MODAL */}
          {selectedDossierFarm && (
            <div
              style={{
                position: "fixed",
                inset: 0,
                background: "rgba(0, 0, 0, 0.45)",
                backdropFilter: "blur(2px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 1000,
                padding: 16,
              }}
              onClick={() => setSelectedDossierFarm(null)}
            >
              <div
                className="compact-card"
                style={{
                  width: "100%",
                  maxWidth: 700,
                  maxHeight: "90vh",
                  overflowY: "auto",
                  padding: 24,
                  display: "flex",
                  flexDirection: "column",
                  gap: 18,
                  boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
                }}
                onClick={(e) => e.stopPropagation()}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                  <div>
                    <span className="mono-label" style={{ fontSize: 10, color: "var(--ink-soft)" }}>
                      FARMLAND INFRASTRUCTURE DOSSIER
                    </span>
                    <h2 style={{ fontSize: 18, margin: "4px 0 2px", fontWeight: 700 }}>
                      {selectedDossierFarm.name}
                    </h2>
                    <p className="muted" style={{ margin: 0, fontSize: 12 }}>
                      📍 {selectedDossierFarm.location}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedDossierFarm(null)}
                    className="btn btn-sm btn-ghost"
                    style={{ padding: 4 }}
                  >
                    <Icons.X size={16} />
                  </button>
                </div>

                {/* Technical Parameters Matrix */}
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 12, fontSize: 12 }}>
                  <div style={{ background: "var(--surface-strong)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                    <div className="mono-label" style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>
                      CADASTRAL &amp; LAND RECORD
                    </div>
                    <div>Survey/Khasra #: <strong>{selectedDossierFarm.surveyNumber || "Pending revenue upload"}</strong></div>
                    <div>District &amp; State: <strong>{selectedDossierFarm.district || "N/A"}, {selectedDossierFarm.state || "N/A"}</strong></div>
                    <div>Total Registered Area: <strong>{selectedDossierFarm.totalArea} Acres</strong></div>
                    <div>Cultivable Area: <strong>{selectedDossierFarm.cultivableArea} Acres</strong></div>
                  </div>

                  <div style={{ background: "var(--surface-strong)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                    <div className="mono-label" style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>
                      SOIL SCIENCE &amp; HYDROLOGY
                    </div>
                    <div>Primary Soil: <strong>{selectedDossierFarm.soilType || "Red Sandy Loam"}</strong></div>
                    <div>Soil pH Baseline: <strong>{selectedDossierFarm.soilPh ? `${selectedDossierFarm.soilPh} (Neutral)` : "Testing in progress"}</strong></div>
                    <div>Water Supply: <strong>{selectedDossierFarm.waterSource || "Borewell System"}</strong></div>
                    <div>Security Fencing: <strong>{selectedDossierFarm.fencingType || "Standard Chainlink"}</strong></div>
                  </div>

                  <div style={{ background: "var(--surface-strong)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                    <div className="mono-label" style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>
                      CLIENT ORGANIZATION
                    </div>
                    <div>Client Name: <strong>{selectedDossierFarm.clientName}</strong></div>
                    <div>Account Code: <strong className="font-mono">{selectedDossierFarm.clientCode}</strong></div>
                    <div>Mobile: <strong>{selectedDossierFarm.clientPhone || "N/A"}</strong></div>
                  </div>

                  <div style={{ background: "var(--surface-strong)", padding: 12, borderRadius: "var(--radius-sm)" }}>
                    <div className="mono-label" style={{ fontSize: 10, color: "var(--muted)", marginBottom: 4 }}>
                      PROJECT SLA &amp; TIMELINE
                    </div>
                    <div>Current Stage: <strong>Stage {STAGE_METADATA[selectedDossierFarm.setupStage]?.stepNumber || 1}: {STAGE_METADATA[selectedDossierFarm.setupStage]?.label}</strong></div>
                    <div>Days in Stage: <strong>{selectedDossierFarm.daysInStage ?? 0} days</strong></div>
                    <div>Target Handover: <strong>{selectedDossierFarm.targetHandoverDate ? new Date(selectedDossierFarm.targetHandoverDate).toLocaleDateString() : "Pending Schedule"}</strong></div>
                  </div>
                </div>

                <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, marginTop: 8 }}>
                  <Link
                    href={`/farms/${selectedDossierFarm.id}`}
                    className="btn btn-sm btn-primary"
                    style={{ fontSize: 12 }}
                  >
                    Open Estate Management Hub →
                  </Link>
                  <button
                    type="button"
                    onClick={() => setSelectedDossierFarm(null)}
                    className="btn btn-sm btn-secondary"
                    style={{ fontSize: 12 }}
                  >
                    Close Dossier
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* ── 5. TAB 2: ENTERPRISE CLIENT DIRECTORY ── */}
      {activeTab === "CLIENTS" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Search & Filter Header */}
          <div
            className="compact-card"
            style={{
              padding: "12px 18px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
              <div style={{ position: "relative", width: 300 }}>
                <input
                  type="text"
                  placeholder="Search 10,000+ clients by name, code, phone, district..."
                  value={clientSearch}
                  onChange={(e) => setClientSearch(e.target.value)}
                  className="input-field"
                  style={{ fontSize: 12, padding: "6px 28px 6px 28px" }}
                />
                <span style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)", pointerEvents: "none" }}>
                  <Icons.Search size={13} />
                </span>
                {clientSearch && (
                  <button
                    type="button"
                    onClick={() => setClientSearch("")}
                    style={{ position: "absolute", right: 8, top: 8, background: "none", border: "none", color: "var(--muted)", cursor: "pointer", padding: 0 }}
                  >
                    <Icons.X size={12} />
                  </button>
                )}
              </div>

              {/* State Filter */}
              <select
                value={clientStateFilter}
                onChange={(e) => setClientStateFilter(e.target.value)}
                className="input-field"
                style={{ fontSize: 12, padding: "6px 10px", width: "auto" }}
              >
                <option value="ALL">All States</option>
                <option value="Karnataka">Karnataka</option>
                <option value="Maharashtra">Maharashtra</option>
                <option value="Tamil Nadu">Tamil Nadu</option>
                <option value="Andhra Pradesh">Andhra Pradesh</option>
                <option value="Gujarat">Gujarat</option>
              </select>
            </div>

            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Showing {filteredClients.length} accounts
            </div>
          </div>

          {/* Client Table */}
          <div className="compact-card" style={{ padding: 0, overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table className="data-table" style={{ width: "100%", margin: 0, fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Client Code &amp; Name</th>
                    <th>Contact &amp; Verification</th>
                    <th>State &amp; District</th>
                    <th>Estates Portfolio</th>
                    <th>Total Acreage</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClients.map((client) => (
                    <tr key={client.id}>
                      {/* Code & Name */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span className="badge badge-muted font-mono" style={{ fontSize: 10 }}>
                            {client.code}
                          </span>
                          <div>
                            <strong style={{ color: "var(--ink)", display: "block" }}>{client.name}</strong>
                            {client.companyName && (
                              <span className="muted" style={{ fontSize: 11 }}>{client.companyName}</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Contact */}
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                          {client.phone && (
                            <span className="font-mono" style={{ fontSize: 11, color: "var(--ink)" }}>
                              📞 {client.phone}
                            </span>
                          )}
                          {client.email && (
                            <span className="muted" style={{ fontSize: 11 }}>
                              ✉️ {client.email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Region */}
                      <td>
                        <span style={{ fontWeight: 500, color: "var(--ink)" }}>
                          {client.district ? `${client.district}, ` : ""}
                          {client.state || "Karnataka"}
                        </span>
                      </td>

                      {/* Estates Count */}
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <strong style={{ fontSize: 13, color: "var(--ink)" }}>
                            {client.totalFarms} {client.totalFarms === 1 ? "Estate" : "Estates"}
                          </strong>
                          {client.setupFarmsCount > 0 && (
                            <span className="badge badge-amber font-mono" style={{ fontSize: 9 }}>
                              {client.setupFarmsCount} Setup
                            </span>
                          )}
                          {client.activeFarmsCount > 0 && (
                            <span className="badge badge-green font-mono" style={{ fontSize: 9 }}>
                              {client.activeFarmsCount} Active
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Acreage */}
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                          {Math.round(client.totalCultivable)} Ac
                        </span>
                        <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>
                          / {Math.round(client.totalAcreage)} Ac
                        </span>
                      </td>

                      {/* Status */}
                      <td>
                        <StatusBadge status={client.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => setSelectedClient(client)}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: 11, padding: "4px 8px" }}
                          >
                            <span>Inspect Portfolio →</span>
                          </button>
                          <Link
                            href={`/farms/new?clientId=${client.id}`}
                            className="btn btn-sm btn-ghost"
                            style={{ fontSize: 11, padding: "4px 8px" }}
                            title="Add Another Farm"
                          >
                            <Icons.Plus size={12} />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: "36px 12px", color: "var(--muted)" }}>
                        No enterprise client accounts found matching your query.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* ── 6. TAB 3: NATIONAL FOOTPRINT ── */}
      {activeTab === "REGIONAL" && (
        <section className="compact-card" style={{ padding: 24, gap: 20 }}>
          <div className="page-header" style={{ border: "none", padding: 0 }}>
            <div>
              <div className="eyebrow" style={{ color: "var(--green)" }}>
                <span className="eyebrow-dot" style={{ backgroundColor: "var(--green)" }} />
                <span>CROSS-INDIA DISTRIBUTION</span>
              </div>
              <h2 className="section-title" style={{ fontSize: 18, marginTop: 4 }}>
                Agaate National Farmland Presence
              </h2>
              <p className="muted" style={{ fontSize: 13, margin: "2px 0 0" }}>
                Multi-state operational summary of clients, cultivable acreage, and active farm setup hubs.
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {[
              { state: "Karnataka", clients: Math.max(12, Math.round(macroTelemetry.totalClients * 0.45)), acreage: Math.round(macroTelemetry.totalCultivable * 0.48), hubs: "Chikkaballapur, Kolar, Mysuru, Mandya" },
              { state: "Maharashtra", clients: Math.max(8, Math.round(macroTelemetry.totalClients * 0.28)), acreage: Math.round(macroTelemetry.totalCultivable * 0.27), hubs: "Nashik, Pune, Solapur, Ahmednagar" },
              { state: "Tamil Nadu", clients: Math.max(4, Math.round(macroTelemetry.totalClients * 0.15)), acreage: Math.round(macroTelemetry.totalCultivable * 0.14), hubs: "Hosur, Coimbatore, Dindigul" },
              { state: "Andhra Pradesh", clients: Math.max(3, Math.round(macroTelemetry.totalClients * 0.12)), acreage: Math.round(macroTelemetry.totalCultivable * 0.11), hubs: "Chittoor, Anantapur" },
            ].map((reg) => (
              <div
                key={reg.state}
                style={{
                  border: "1px solid var(--line)",
                  borderRadius: "var(--radius-sm)",
                  padding: 16,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                  background: "var(--canvas)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <strong style={{ fontSize: 15, color: "var(--ink)" }}>{reg.state}</strong>
                  <span className="badge badge-green font-mono" style={{ fontSize: 10 }}>
                    {reg.acreage.toLocaleString()} Ac
                  </span>
                </div>
                <div className="muted" style={{ fontSize: 12 }}>
                  {reg.clients.toLocaleString()} Client Accounts Managed
                </div>
                <div style={{ fontSize: 11, color: "var(--ink-soft)", paddingTop: 4, borderTop: "1px solid var(--stone)" }}>
                  Primary Setup Hubs: {reg.hubs}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── 7. CLIENT ACCOUNT INSPECTION MODAL ── */}
      {selectedClient && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
          onClick={() => setSelectedClient(null)}
        >
          <div
            className="compact-card"
            style={{
              maxWidth: 720,
              width: "100%",
              maxHeight: "85vh",
              overflowY: "auto",
              padding: 24,
              gap: 20,
              background: "var(--canvas)",
              borderRadius: "var(--radius-md)",
              boxShadow: "0 16px 48px rgba(0,0,0,0.2)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span className="badge badge-muted font-mono" style={{ fontSize: 10 }}>
                    {selectedClient.code}
                  </span>
                  <h2 style={{ fontSize: 18, margin: 0, fontWeight: 700 }}>
                    {selectedClient.name}
                  </h2>
                </div>
                {selectedClient.companyName && (
                  <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                    {selectedClient.companyName}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="btn btn-sm btn-ghost"
                style={{ padding: 4 }}
              >
                <Icons.X size={16} />
              </button>
            </div>

            {/* Client Telemetry Bar */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(3, 1fr)",
                gap: 12,
                padding: 12,
                background: "var(--stone)",
                borderRadius: "var(--radius-sm)",
                fontSize: 12,
              }}
            >
              <div>
                <span className="mono-label" style={{ fontSize: 9 }}>TOTAL ESTATES</span>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginTop: 2 }}>
                  {selectedClient.totalFarms} Farms
                </div>
              </div>
              <div>
                <span className="mono-label" style={{ fontSize: 9 }}>CULTIVABLE ACREAGE</span>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--green)", marginTop: 2 }}>
                  {Math.round(selectedClient.totalCultivable)} Ac
                </div>
              </div>
              <div>
                <span className="mono-label" style={{ fontSize: 9 }}>REGION</span>
                <div style={{ fontWeight: 700, fontSize: 14, color: "var(--ink)", marginTop: 2 }}>
                  {selectedClient.state || "Karnataka"}
                </div>
              </div>
            </div>

            {/* Farms Portfolio List */}
            <div>
              <h4 style={{ fontSize: 13, marginBottom: 10, fontWeight: 700 }}>
                Estates Owned by {selectedClient.name}
              </h4>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {selectedClient.farms.map((f) => (
                  <div
                    key={f.id}
                    style={{
                      border: "1px solid var(--line)",
                      borderRadius: "var(--radius-sm)",
                      padding: "10px 14px",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      background: "var(--canvas)",
                    }}
                  >
                    <div>
                      <strong style={{ fontSize: 13, color: "var(--ink)" }}>{f.name}</strong>
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                        Acreage: {f.cultivableArea} Ac • Stage: {f.setupStage.replace(/_/g, " ")} ({f.setupProgress}%)
                      </div>
                    </div>

                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <StatusBadge status={f.status} />
                      <Link
                        href={`/farms/${f.id}`}
                        className="btn btn-sm btn-secondary"
                        style={{ fontSize: 11, padding: "4px 8px" }}
                      >
                        Inspect Estate
                      </Link>
                    </div>
                  </div>
                ))}
                {selectedClient.farms.length === 0 && (
                  <div className="muted" style={{ fontSize: 12, padding: "12px 0", textAlign: "center" }}>
                    No farms registered under this client yet.
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, borderTop: "1px solid var(--line)", paddingTop: 14 }}>
              <Link
                href={`/farms/new?clientId=${selectedClient.id}`}
                className="btn btn-secondary btn-sm"
              >
                <Icons.Plus size={13} />
                <span>Onboard Additional Estate</span>
              </Link>
              <button
                type="button"
                onClick={() => setSelectedClient(null)}
                className="btn btn-primary btn-sm"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
