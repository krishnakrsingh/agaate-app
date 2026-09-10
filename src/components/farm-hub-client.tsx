"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";
import { PlotForm } from "./plot-form";
import { GridSplitForm } from "./grid-split-form";
import { BoundaryHistory } from "./boundary-history";
import { WeatherCard } from "./weather-card";
import { FarmAccessManager } from "./farm-access-manager";
import { FarmEditForm } from "./farm-edit-form";
import { ActivateFarmButton } from "./activate-farm-button";
import { FarmStatusControl } from "./farm-status-control";
import { IncidentFollowUp } from "./incident-followup";
import { IncidentStatusControl } from "./incident-status-control";
import { StatusBadge, PriorityBadge } from "./ui/badge";
import { EmptyState } from "./ui/empty-state";
import { useToast } from "./ui/toast";

type Milestone = { id: string; name: string; targetDate: string; status: string };
type CropCycle = { id: string; cropName: string; startDate: string; status: string; varieties: { name: string }[]; milestones: Milestone[] };
type Plot = { id: string; name: string; area: string; status: string; soilType: string | null; boundaryGeoJson?: string | null; measuredAcres?: string | null; irrigation: { type: string; details: string | null }[]; cropCycles: CropCycle[] };
type Incident = {
  id: string;
  type: string;
  level: string;
  severity: string | null;
  status: string;
  description: string;
  impactPercent: string | null;
  createdAt: string;
  imageUrl?: string | null;
  reporterName?: string;
  reporter?: { name: string } | null;
};
type Monitoring = { id: string; status: string; stage: string; impactPercent: string | null; remarks: string | null; createdAt: string; reporter?: { name: string } | null };

export type FarmSetupStageKey =
  | "SURVEY_SOIL_TEST"
  | "PLOT_DEMARCATION"
  | "BED_SOIL_PREP"
  | "IRRIGATION_LAYOUT"
  | "HANDED_OVER";

type Farm = {
  id: string;
  name: string;
  ownerName: string;
  location: string;
  address: string | null;
  latitude: string;
  longitude: string;
  totalArea: string;
  cultivableArea: string;
  waterSource: string;
  status: string;
  setupStage?: FarmSetupStageKey;
  setupProgress?: number;
  handedOverAt?: string | null;
  client?: {
    id: string;
    name: string;
    code: string | null;
    phone?: string | null;
  } | null;
  geofenceRadiusMeters: number;
  boundaryGeoJson: string | null;
  surveyNumber?: string | null;
  village?: string | null;
  taluk?: string | null;
  district?: string | null;
  state?: string | null;
  pincode?: string | null;
  terrainType?: string | null;
  fencingType?: string | null;
  borewellCount?: number | null;
  borewellDepthFeet?: number | null;
  waterYieldGph?: number | null;
  electricitySupply?: string | null;
  soilPh?: string | null;
  soilEc?: string | null;
  soilOrganicCarbon?: string | null;
  proposedCrops?: string | null;
  contractValue?: string | null;
  targetHandoverDate?: string | null;
  plots: Plot[];
  incidents: Incident[];
  monitoring: Monitoring[];
  plotsTotal?: number;
  plotsTruncated?: boolean;
  incidentsTotal?: number;
  incidentsTruncated?: boolean;
};

const SETUP_STAGES = [
  {
    key: "SURVEY_SOIL_TEST",
    step: 1,
    title: "1. Survey & Soil Testing",
    shortTitle: "Survey & Soil",
    desc: "Topography, soil chemistry, EC/pH, and water lab analysis",
    defaultProgress: 20,
  },
  {
    key: "PLOT_DEMARCATION",
    step: 2,
    title: "2. Plot Demarcation",
    shortTitle: "Demarcation",
    desc: "Perimeter trenches, GPS boundaries, fencing, access roads",
    defaultProgress: 40,
  },
  {
    key: "BED_SOIL_PREP",
    step: 3,
    title: "3. Bed & Soil Prep",
    shortTitle: "Bed Prep",
    desc: "Deep ripping, rotavation, basal dose, raised bed shaping",
    defaultProgress: 60,
  },
  {
    key: "IRRIGATION_LAYOUT",
    step: 4,
    title: "4. Irrigation Layout",
    shortTitle: "Irrigation Setup",
    desc: "Mainlines, sub-mains, drip laterals, fertigation venturi",
    defaultProgress: 80,
  },
  {
    key: "HANDED_OVER",
    step: 5,
    title: "5. Handed Over & Live",
    shortTitle: "Handed Over",
    desc: "Agaate QA signoff, client farm admin unlocked",
    defaultProgress: 100,
  },
] as const;

export function FarmHubClient({ farm, role, canManage }: { farm: Farm; role: string; canManage: boolean }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<"plots" | "weather" | "team" | "signals" | "settings">("plots");
  const [showAddPlot, setShowAddPlot] = useState(false);
  const [selectedIncidentPhoto, setSelectedIncidentPhoto] = useState<string | null>(null);
  const [advancingStage, setAdvancingStage] = useState(false);
  const [handingOver, setHandingOver] = useState(false);

  const isSetup = farm.status === "SETUP";
  const hasPlots = farm.plots.length > 0;
  const hasCycles = farm.plots.some((p) => p.cropCycles.length > 0);
  const hasMilestones = farm.plots.some((p) => p.cropCycles.some((c) => c.milestones.length >= 4));

  const currentStageKey = farm.setupStage || "SURVEY_SOIL_TEST";
  const currentStageIndex = SETUP_STAGES.findIndex((s) => s.key === currentStageKey);
  const effectiveStageIndex = currentStageIndex === -1 ? 0 : currentStageIndex;
  const isHandedOver = farm.setupStage === "HANDED_OVER";
  const currentProgress = farm.setupProgress ?? SETUP_STAGES[effectiveStageIndex].defaultProgress;

  async function handleAdvanceStage(targetStageKey: string) {
    setAdvancingStage(true);
    try {
      const res = await fetch("/api/admin/setup-pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: farm.id,
          setupStage: targetStageKey,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to advance stage");
        return;
      }
      toast.success("Stage updated successfully!");
      router.refresh();
    } catch {
      toast.error("Network error updating stage");
    } finally {
      setAdvancingStage(false);
    }
  }

  async function handleHandover() {
    if (!confirm(`Confirm complete turnkey handover of ${farm.name} to ${farm.client?.name || farm.ownerName}? This marks the farm ACTIVE and unlocks Client Farm Admin access.`)) {
      return;
    }
    setHandingOver(true);
    try {
      const res = await fetch(`/api/admin/farms/${farm.id}/handover`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Handover failed");
        return;
      }
      toast.success(`Estate handed over successfully to ${farm.client?.name || "client"}!`);
      router.refresh();
    } catch {
      toast.error("Network error during handover");
    } finally {
      setHandingOver(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* COMMAND HEADER */}
      <div className="page-header">
        <div className="page-header-content">
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <StatusBadge status={farm.status} />
            {farm.setupStage && (
              <span className="badge badge-stone" style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                {farm.setupStage.replaceAll("_", " ")}
              </span>
            )}
            {farm.client && (
              <span className="badge badge-stone" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                <Icons.Users size={12} style={{ color: "var(--green)" }} />
                <span>CLIENT: <strong>{farm.client.name}</strong> ({farm.client.code})</span>
              </span>
            )}
            <span className="mono-label" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
              <Icons.MapPin size={13} color="var(--green)" />
              <span>{farm.location} &bull; {farm.geofenceRadiusMeters}M GEOFENCE &bull; {farm.plots.length} PLOTS</span>
            </span>
          </div>
          <h1 className="page-title">{farm.name}</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            <strong>{farm.ownerName}</strong> &bull; <span className="data">{farm.totalArea}</span> acres (<span className="data">{farm.cultivableArea}</span> cultivable) &bull; Water: {farm.waterSource}
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {canManage && isSetup && <ActivateFarmButton farmId={farm.id} />}
          {canManage && !isSetup && <FarmStatusControl farmId={farm.id} status={farm.status} />}
        </div>
      </div>

      {/* CADASTRAL, SOIL & HYDROLOGY SPECIFICATION STRIP */}
      {(farm.surveyNumber || farm.soilPh || farm.borewellCount != null || farm.village) && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            padding: "14px 18px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-sm)",
            fontSize: 12,
          }}
        >
          <div>
            <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>CADASTRAL SURVEY / KHASRA</div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
              {farm.surveyNumber ? `Sy/Khasra #${farm.surveyNumber}` : "Sy # Pending"}
            </div>
            {(farm.village || farm.district) && (
              <div className="muted" style={{ fontSize: 11 }}>
                {[farm.village, farm.taluk, farm.district, farm.state].filter(Boolean).join(", ")}
              </div>
            )}
          </div>

          <div>
            <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>SOIL SCIENCE BASELINE</div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
              pH {farm.soilPh || "7.0"} &bull; EC {farm.soilEc ? `${farm.soilEc} dS/m` : "Normal"}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              OC: {farm.soilOrganicCarbon ? `${farm.soilOrganicCarbon}%` : "0.55%"} &bull; {farm.terrainType || "Plain Gradient"}
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>HYDROLOGY & POWER GRID</div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
              {farm.borewellCount || 0} Borewells {farm.borewellDepthFeet ? `(${farm.borewellDepthFeet} ft)` : ""}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              {farm.waterYieldGph ? `${farm.waterYieldGph.toLocaleString()} GPH` : "Yield TBD"} &bull; {farm.electricitySupply || "3-Phase Power"}
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>CIVIL INFRA & COMMERCIAL</div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
              {farm.fencingType || "Perimeter Fencing"}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              {farm.contractValue ? `WO Value: ₹${Number(farm.contractValue).toLocaleString("en-IN")}` : "Turnkey SLA Contract"}
            </div>
          </div>
        </div>
      )}

      {/* TURNKEY INFRASTRUCTURE PIPELINE BANNER */}
      <div className="compact-card" style={{ padding: 20, gap: 16, border: "1px solid var(--line)", background: isHandedOver ? "var(--canvas)" : "var(--surface)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: isHandedOver ? "var(--green)" : "var(--amber)", display: "inline-block" }} />
            <span className="eyebrow" style={{ color: isHandedOver ? "var(--green-dark)" : "var(--ink)", margin: 0 }}>
              TURNKEY FARMLAND SETUP PIPELINE
            </span>
            <span className="badge" style={{ fontSize: 11, background: isHandedOver ? "rgba(46,125,50,0.1)" : "rgba(217,119,6,0.1)", color: isHandedOver ? "var(--green)" : "var(--amber)", border: "none" }}>
              {isHandedOver ? "100% Complete • Handed Over" : `${currentProgress}% Complete`}
            </span>
          </div>
          {farm.client && (
            <div className="muted" style={{ fontSize: 12 }}>
              Enterprise Client: <strong style={{ color: "var(--ink)" }}>{farm.client.name}</strong> ({farm.client.code})
            </div>
          )}
        </div>

        {/* 5-STAGE STEPS GRID */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
          {SETUP_STAGES.map((s, idx) => {
            const isDone = effectiveStageIndex > idx || isHandedOver;
            const isCurrent = effectiveStageIndex === idx && !isHandedOver;
            return (
              <div
                key={s.key}
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: isCurrent ? "2px solid var(--green)" : "1px solid var(--line)",
                  backgroundColor: isCurrent ? "rgba(46,125,50,0.04)" : isDone ? "var(--canvas)" : "var(--stone)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  position: "relative",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      backgroundColor: isDone ? "var(--green)" : isCurrent ? "var(--green)" : "var(--line)",
                      color: isDone || isCurrent ? "#fff" : "var(--muted)",
                      display: "grid",
                      placeItems: "center",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                    }}
                  >
                    {isDone ? "✓" : s.step}
                  </span>
                  <span
                    style={{
                      fontSize: 10,
                      fontFamily: "var(--font-mono)",
                      fontWeight: 700,
                      color: isDone ? "var(--green)" : isCurrent ? "var(--green-dark)" : "var(--muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    {isDone ? "Completed" : isCurrent ? "In Progress" : "Pending"}
                  </span>
                </div>
                <div style={{ fontSize: 12, fontWeight: 650, color: "var(--ink)" }}>{s.title}</div>
                <div className="muted" style={{ fontSize: 11, lineHeight: 1.3 }}>{s.desc}</div>
              </div>
            );
          })}
        </div>

        {/* SUPER ADMIN CONTROLS OR CLIENT REASSURANCE BAR */}
        {role === "SUPER_ADMIN" ? (
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 12,
              padding: "10px 14px",
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--stone)",
              border: "1px solid var(--line)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
              <Icons.Shield size={14} style={{ color: "var(--green)" }} />
              <span>
                <strong>Agaate Engineering Controls:</strong> Current Phase is{" "}
                <strong style={{ color: "var(--green-dark)" }}>
                  {SETUP_STAGES[effectiveStageIndex]?.title}
                </strong>
              </span>
            </div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {!isHandedOver && effectiveStageIndex < SETUP_STAGES.length - 1 && (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  disabled={advancingStage}
                  onClick={() => handleAdvanceStage(SETUP_STAGES[effectiveStageIndex + 1].key)}
                  style={{ borderRadius: "var(--radius-pill)" }}
                >
                  <Icons.ArrowRight size={13} />
                  <span>Advance to {SETUP_STAGES[effectiveStageIndex + 1].shortTitle}</span>
                </button>
              )}
              {!isHandedOver && (
                <button
                  type="button"
                  className="btn btn-green btn-sm"
                  disabled={handingOver}
                  onClick={handleHandover}
                  style={{ borderRadius: "var(--radius-pill)" }}
                >
                  <Icons.CheckCircle size={13} />
                  <span>{handingOver ? "Handing Over…" : "1-Click Handover to Client"}</span>
                </button>
              )}
              {isHandedOver && (
                <span className="muted" style={{ fontSize: 12 }}>
                  Handed over on {farm.handedOverAt ? new Date(farm.handedOverAt).toLocaleDateString() : "Record"}
                </span>
              )}
            </div>
          </div>
        ) : (
          !isHandedOver && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "10px 14px",
                borderRadius: "var(--radius-sm)",
                backgroundColor: "rgba(46,125,50,0.05)",
                border: "1px solid var(--line)",
                fontSize: 12,
                color: "var(--ink)",
              }}
            >
              <Icons.Layers size={15} style={{ color: "var(--green)" }} />
              <span>
                <strong>Agaate Turnkey Engineering Active:</strong> Site crews are executing Stage{" "}
                {effectiveStageIndex + 1} ({SETUP_STAGES[effectiveStageIndex]?.title}). You will receive full
                autonomous SaaS access upon irrigation testing &amp; final QA handover.
              </span>
            </div>
          )
        )}

        {/* AGRONOMY READINESS GATEKEEPER */}
        {isSetup && (
          <div style={{ borderTop: "1px dashed var(--line)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
            <div className="mono-label" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 700 }}>
              OPERATIONAL AGRONOMY READINESS GATEKEEPER
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 18, height: 18, border: "1px solid var(--line)", background: hasPlots ? "var(--green)" : "var(--stone)", color: hasPlots ? "#fff" : "var(--muted)", display: "grid", placeItems: "center", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, borderRadius: "50%" }}>
                  {hasPlots ? "✓" : "1"}
                </span>
                <span style={{ fontSize: 12, color: "var(--ink)" }}>1. Land Plot Configured ({farm.plots.length})</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 18, height: 18, border: "1px solid var(--line)", background: hasCycles ? "var(--green)" : "var(--stone)", color: hasCycles ? "#fff" : "var(--muted)", display: "grid", placeItems: "center", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, borderRadius: "50%" }}>
                  {hasCycles ? "✓" : "2"}
                </span>
                <span style={{ fontSize: 12, color: "var(--ink)" }}>2. Crop Cycle Planned</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 18, height: 18, border: "1px solid var(--line)", background: hasMilestones ? "var(--green)" : "var(--stone)", color: hasMilestones ? "#fff" : "var(--muted)", display: "grid", placeItems: "center", fontSize: 10, fontFamily: "var(--font-mono)", fontWeight: 700, borderRadius: "50%" }}>
                  {hasMilestones ? "✓" : "3"}
                </span>
                <span style={{ fontSize: 12, color: "var(--ink)" }}>3. Agronomy Milestones Scheduled</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEGMENTED TABS */}
      <div className="tabs-nav">
        <button type="button" className={`tab-btn ${tab === "plots" ? "active" : ""}`} onClick={() => setTab("plots")}>
          <Icons.Plot size={14} /><span>Plots &amp; Crops ({(farm.plotsTotal ?? farm.plots.length).toLocaleString()})</span>
        </button>
        <button type="button" className={`tab-btn ${tab === "weather" ? "active" : ""}`} onClick={() => setTab("weather")}>
          <Icons.Sun size={14} /><span>Agronomy &amp; Weather</span>
        </button>
        <button type="button" className={`tab-btn ${tab === "team" ? "active" : ""}`} onClick={() => setTab("team")}>
          <Icons.Users size={14} /><span>Team &amp; Access</span>
        </button>
        <button type="button" className={`tab-btn ${tab === "signals" ? "active" : ""}`} onClick={() => setTab("signals")}>
          <Icons.Activity size={14} /><span>Signals &amp; Incidents ({((farm.incidentsTotal ?? farm.incidents.length) + farm.monitoring.length).toLocaleString()})</span>
        </button>
        {canManage && (
          <button type="button" className={`tab-btn ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>
            <Icons.Settings size={14} /><span>Farm Settings</span>
          </button>
        )}
      </div>

      {/* TAB 1: PLOTS & CROPS */}
      {tab === "plots" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
            <div>
              <h2 className="section-title">Plots &amp; Precision Crop Cycles</h2>
              <p className="muted" style={{ marginTop: 2 }}>
                Manage plot acreage, irrigation systems, and launch crop cycles.
                {farm.plotsTruncated && ` Showing ${farm.plots.length} of ${farm.plotsTotal?.toLocaleString()} — use the Plots explorer with search for the full list.`}
              </p>
            </div>
            {canManage && (
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddPlot(!showAddPlot)}>
                  <Icons.Plus size={14} /><span>{showAddPlot ? "Close Form" : "Create New Plot"}</span>
                </button>
                <GridSplitForm farmId={farm.id} hasBoundary={!!farm.boundaryGeoJson} />
                <Link href={`/officer/boundary?farmId=${farm.id}`} className="btn btn-secondary btn-sm">
                  <Icons.MapPin size={14} /><span>Walk boundary</span>
                </Link>
              </div>
            )}
          </div>

          {showAddPlot && (
            <div style={{ background: "var(--canvas)", border: "1px solid var(--canvas)", padding: 20, borderRadius: "var(--radius-sm)" }}>
              <PlotForm
                farmId={farm.id}
                farmCenter={[Number(farm.latitude), Number(farm.longitude)]}
                farmBoundary={farm.boundaryGeoJson}
              />
            </div>
          )}

          {/* SPATIAL PLOT GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 18 }}>
            {farm.plots.map((plot) => (
              <article
                key={plot.id}
                className="compact-card hover-glow"
                style={{
                  padding: 24,
                  gap: 16,
                  borderRadius: "var(--radius-md)",
                  backgroundColor: "var(--canvas)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>{plot.name}</h3>
                    <div className="muted" style={{ fontSize: "13px", marginTop: 3 }}>
                      <strong style={{ color: "var(--ink)" }}>{plot.area}</strong> Acres &bull; {plot.soilType || "Soil Not Specified"}
                    </div>
                  </div>
                  <StatusBadge status={plot.status} />
                </div>

                {/* Irrigation tags */}
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {plot.irrigation.map((irr, idx) => (
                    <span
                      key={idx}
                      className="badge badge-muted"
                      style={{ fontSize: "11px", padding: "3px 9px" }}
                    >
                      {irr.type}
                    </span>
                  ))}
                </div>

                {/* Crop Cycles list */}
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="mono-label" style={{ color: "var(--muted)", fontWeight: 600 }}>Active Crop Cycles ({plot.cropCycles.length})</div>
                  {plot.cropCycles.map((cycle) => (
                    <Link
                      key={cycle.id}
                      href={`/plots/${plot.id}/crop-cycles/${cycle.id}`}
                      style={{
                        padding: "10px 14px",
                        borderRadius: "var(--radius-sm)",
                        backgroundColor: "var(--stone)",
                        textDecoration: "none",
                        color: "inherit",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        transition: "background-color 0.15s ease",
                      }}
                    >
                      <div>
                        <div style={{ fontWeight: 600, fontSize: "13px" }}>🌱 {cycle.cropName}</div>
                        <div className="muted" style={{ fontSize: "11px", marginTop: 2 }}>Started: {new Date(cycle.startDate).toLocaleDateString()}</div>
                      </div>
                      <StatusBadge status={cycle.status} />
                    </Link>
                  ))}
                  {!plot.cropCycles.length && <p className="muted" style={{ fontSize: "12px", margin: 0 }}>No active crop cycles in this plot.</p>}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
                  <Link
                    href={`/plots/${plot.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ borderRadius: "var(--radius-pill)", padding: "5px 14px" }}
                  >
                    <Icons.Edit size={13} />
                    <span>Inspect Plot</span>
                  </Link>
                  {canManage && (
                    <Link
                      href={`/plots/${plot.id}/crop-cycles/new`}
                      className="btn btn-green btn-sm"
                      style={{ borderRadius: "var(--radius-pill)", padding: "5px 14px" }}
                    >
                      <Icons.Plus size={13} />
                      <span>Plan Crop Cycle</span>
                    </Link>
                  )}
                </div>
              </article>
            ))}
          </div>

          {!farm.plots.length && !showAddPlot && (
            <EmptyState
              icon={<Icons.Plot size={24} />}
              title="No land plots configured"
              description="Create the first land plot to begin the farm operational setup."
              action={
                canManage && (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddPlot(true)}>
                    <Icons.Plus size={14} /><span>Create New Plot</span>
                  </button>
                )
              }
            />
          )}
        </section>
      )}

      {/* TAB 2: WEATHER */}
      {tab === "weather" && (
        <div style={{ maxWidth: 640 }}>
          <WeatherCard farmId={farm.id} />
        </div>
      )}

      {/* TAB 3: TEAM & ACCESS */}
      {tab === "team" && <FarmAccessManager farmId={farm.id} />}

      {/* TAB 4: SIGNALS & INCIDENTS */}
      {tab === "signals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="page-header" style={{ paddingBottom: 12 }}>
            <h2 className="section-title">Field Incidents &amp; Observations ({(farm.incidentsTotal ?? farm.incidents.length).toLocaleString()})</h2>
            {farm.incidentsTruncated && <p className="muted" style={{ fontSize: 12 }}>Showing the 50 most recent — filter the full history in the incidents registry.</p>}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {farm.incidents.map((inc) => (
              <div
                key={inc.id}
                className="compact-card hover-glow"
                style={{
                  padding: 20,
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-card)",
                  gap: 14,
                }}
              >
                <div style={{ display: "flex", gap: 16, alignItems: "flex-start" }}>
                  {/* Photo Thumbnail */}
                  {inc.imageUrl ? (
                    <div
                      style={{
                        width: 90,
                        height: 90,
                        minWidth: 90,
                        borderRadius: "var(--radius-xs)",
                        overflow: "hidden",
                        border: "1px solid var(--line)",
                        backgroundColor: "#000",
                        cursor: "pointer",
                        position: "relative",
                      }}
                      onClick={() => setSelectedIncidentPhoto(inc.imageUrl || null)}
                      title="Click to view full photo"
                    >
                      <img
                        src={inc.imageUrl}
                        alt={inc.type}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                      <span
                        style={{
                          position: "absolute",
                          bottom: 2,
                          right: 2,
                          backgroundColor: "rgba(0,0,0,0.65)",
                          color: "#fff",
                          borderRadius: 2,
                          padding: "1px 4px",
                          fontSize: 9,
                        }}
                      >
                        <Icons.Eye size={9} />
                      </span>
                    </div>
                  ) : (
                    <div
                      style={{
                        width: 90,
                        height: 90,
                        minWidth: 90,
                        borderRadius: "var(--radius-xs)",
                        border: "1px solid var(--canvas)",
                        backgroundColor: "var(--canvas)",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 4,
                        color: "var(--muted)",
                        fontSize: 10,
                      }}
                    >
                      <Icons.AlertTriangle size={20} style={{ color: "var(--amber)" }} />
                      <span>No Photo</span>
                    </div>
                  )}

                  <div style={{ display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <strong style={{ fontSize: "14px", color: inc.severity === "CRITICAL" ? "var(--red)" : "var(--ink)" }}>
                          {inc.type}
                        </strong>
                        {inc.severity && <PriorityBadge priority={inc.severity} />}
                        <span className="muted" style={{ fontSize: "11px" }}>
                          &bull; Level: {inc.level}
                        </span>
                      </div>
                      {canManage ? <IncidentStatusControl incidentId={inc.id} status={inc.status} /> : <StatusBadge status={inc.status} />}
                    </div>

                    <p style={{ margin: 0, fontSize: "13px", color: "var(--ink)" }}>{inc.description}</p>

                    <div className="muted" style={{ fontSize: "11px", display: "flex", gap: 12, flexWrap: "wrap" }}>
                      <span>Reported {new Date(inc.createdAt).toLocaleDateString()}</span>
                      {inc.impactPercent && (
                        <span style={{ color: "var(--amber)", fontWeight: 600 }}>
                          Yield Impact: {inc.impactPercent}%
                        </span>
                      )}
                      {inc.reporterName && <span>By {inc.reporterName}</span>}
                    </div>

                    <IncidentFollowUp incidentId={inc.id} />
                  </div>
                </div>
              </div>
            ))}
            {!farm.incidents.length && (
              <EmptyState
                icon={<Icons.Activity size={24} />}
                title="No field incidents reported"
                description="Field operations and crop monitoring signals are operating within standard parameters."
              />
            )}
          </div>
        </div>
      )}

      {/* PHOTO LIGHTBOX MODAL */}
      {selectedIncidentPhoto && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: "rgba(0,0,0,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 20,
          }}
          onClick={() => setSelectedIncidentPhoto(null)}
        >
          <div
            className="compact-card"
            style={{
              maxWidth: 600,
              width: "100%",
              padding: 16,
              gap: 12,
              backgroundColor: "var(--canvas)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontWeight: 600, fontSize: 14 }}>Field Evidence Photo</span>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={() => setSelectedIncidentPhoto(null)}
              >
                <Icons.X size={14} />
              </button>
            </div>
            <img
              src={selectedIncidentPhoto}
              alt="Incident evidence"
              style={{ width: "100%", maxHeight: "70vh", objectFit: "contain", borderRadius: "var(--radius-xs)" }}
            />
          </div>
        </div>
      )}

      {/* TAB 5: SETTINGS */}
      {tab === "settings" && canManage && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div style={{ background: "var(--canvas)", border: "1px solid var(--canvas)", padding: 24, borderRadius: "var(--radius-sm)" }}>
            <FarmEditForm farm={farm} />
          </div>
          <BoundaryHistory entityType="FARM" entityId={farm.id} canRestore={canManage} currentBoundary={farm.boundaryGeoJson} />
        </div>
      )}
    </div>
  );
}
