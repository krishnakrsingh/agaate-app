"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { PlotForm } from "@/components/plot-form";
import { GridSplitForm } from "@/components/grid-split-form";
import { BoundaryHistory } from "@/components/boundary-history";
import { PlotCoverageCard } from "@/components/plot-coverage-card";
import { TaskMapCard } from "@/components/task-map-card";
import { VisitRouteCard } from "@/components/visit-route-card";
import { WeatherCard } from "@/components/weather-card";
import { FarmAccessManager } from "@/components/farm-access-manager";
import { FarmEditForm } from "@/components/farm-edit-form";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { isBoundaryCorrupt, parseBoundary, toGeoJsonPolygon, type LngLat } from "@/lib/geo";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => (
    <div style={{ height: 340, display: "grid", placeItems: "center", background: "var(--canvas)", color: "var(--muted)", fontSize: 13 }}>
      Loading satellite telemetry map…
    </div>
  ),
});

export type FarmSetupStageKey =
  | "SURVEY_SOIL_TEST"
  | "PLOT_DEMARCATION"
  | "BED_SOIL_PREP"
  | "IRRIGATION_LAYOUT"
  | "HANDED_OVER";

const SETUP_STAGES = [
  { key: "SURVEY_SOIL_TEST", step: 1, title: "1. Survey & Soil Testing", shortTitle: "Survey & Soil" },
  { key: "PLOT_DEMARCATION", step: 2, title: "2. Plot Demarcation", shortTitle: "Demarcation" },
  { key: "BED_SOIL_PREP", step: 3, title: "3. Bed & Soil Prep", shortTitle: "Bed Prep" },
  { key: "IRRIGATION_LAYOUT", step: 4, title: "4. Irrigation Layout", shortTitle: "Irrigation Setup" },
  { key: "HANDED_OVER", step: 5, title: "5. Handed Over & Live", shortTitle: "Handed Over" },
] as const;

export function FarmCommandCenter({
  farm,
  role,
  canManage,
}: {
  farm: any;
  role: string;
  canManage: boolean;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialTab = (searchParams.get("tab") as any) || "plots";
  const [activeTab, setActiveTab] = useState<
    "plots" | "cycles" | "operations" | "access" | "boundaries" | "settings"
  >(
    ["plots", "cycles", "operations", "access", "boundaries", "settings"].includes(initialTab)
      ? initialTab
      : "plots"
  );

  const [showAddPlot, setShowAddPlot] = useState(false);
  const [advancingStage, setAdvancingStage] = useState(false);
  const [handingOver, setHandingOver] = useState(false);
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);

  const isSetup = farm.status === "SETUP";
  const currentStageKey = farm.setupStage || "SURVEY_SOIL_TEST";
  const currentStageIndex = SETUP_STAGES.findIndex((s) => s.key === currentStageKey);
  const effectiveStageIndex = currentStageIndex === -1 ? 0 : currentStageIndex;
  const isHandedOver = farm.setupStage === "HANDED_OVER";

  const farmRing: LngLat[] | null = parseBoundary(farm.boundaryGeoJson);
  const farmCenter: [number, number] = [Number(farm.latitude), Number(farm.longitude)];
  const [farmRingState, setFarmRingState] = useState<LngLat[] | null>(farmRing);
  const [savingFarmBoundary, setSavingFarmBoundary] = useState(false);

  const handleSaveFarmBoundary = async () => {
    if (farmRingState && farmRingState.length < 4) {
      toast.error("Draw at least 3 points (closed ring) before saving — incomplete shapes are not saved.");
      return;
    }
    setSavingFarmBoundary(true);
    try {
      const geoJsonString = farmRingState && farmRingState.length >= 4 ? toGeoJsonPolygon(farmRingState) : null;
      const res = await fetch(`/api/farms/${farm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boundaryGeoJson: geoJsonString }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to update estate boundary.");
      }
      const updated = await res.json();
      toast.success(
        geoJsonString
          ? `Estate boundary updated (${updated.measuredAcres || 0} acres)!`
          : "Estate boundary cleared."
      );
      router.refresh();
    } catch (err: any) {
      toast.error(err.message || "Failed to update boundary.");
    } finally {
      setSavingFarmBoundary(false);
    }
  };

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
      toast.success("Onboarding stage updated successfully.");
      router.refresh();
    } catch {
      toast.error("Network error updating stage.");
    } finally {
      setAdvancingStage(false);
    }
  }

  async function handleHandover() {
    if (
      !confirm(
        `Confirm formal turnkey handover of ${farm.name} to ${
          farm.client?.name || farm.ownerName
        }? This activates the estate and unlocks Farm Admin self-management.`
      )
    ) {
      return;
    }
    setHandingOver(true);
    try {
      const res = await fetch(`/api/admin/farms/${farm.id}/handover`, {
        method: "POST",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Handover failed.");
        return;
      }
      toast.success(`Estate handed over successfully to ${farm.client?.name || "client"}.`);
      router.refresh();
    } catch {
      toast.error("Network error during handover.");
    } finally {
      setHandingOver(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* 1. Institutional Header */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          padding: "20px 24px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
              <StatusBadge status={farm.status} />
              {farm.setupStage && (
                <span className="badge badge-stone" style={{ fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                  {farm.setupStage.replaceAll("_", " ")}
                </span>
              )}
              {farm.client && (
                <span className="badge badge-stone" style={{ display: "inline-flex", gap: 6, alignItems: "center" }}>
                  <Icons.Users size={12} color="var(--green)" />
                  <span>CLIENT: <strong>{farm.client.name}</strong> ({farm.client.code})</span>
                </span>
              )}
              <span className="mono-label" style={{ display: "inline-flex", gap: 6, alignItems: "center", fontSize: 11 }}>
                <Icons.MapPin size={12} color="var(--green)" />
                <span>{farm.location} &bull; {farm.geofenceRadiusMeters}M GEOFENCE &bull; {farm.plots.length} PLOTS</span>
              </span>
            </div>

            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
              {farm.name}
            </h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Owner: <strong>{farm.ownerName}</strong> &bull; Total: <span className="data">{farm.totalArea}</span> acres (<span className="data">{farm.cultivableArea}</span> cultivable) &bull; Water: {farm.waterSource}
            </p>
          </div>

          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
            {isSetup && !isHandedOver && effectiveStageIndex < SETUP_STAGES.length - 1 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={advancingStage}
                onClick={() => handleAdvanceStage(SETUP_STAGES[effectiveStageIndex + 1].key)}
              >
                <Icons.ArrowRight size={13} />
                <span>Advance to {SETUP_STAGES[effectiveStageIndex + 1].shortTitle}</span>
              </button>
            )}

            {isSetup && !isHandedOver && (
              <button
                type="button"
                className="btn btn-green btn-sm"
                disabled={handingOver}
                onClick={handleHandover}
              >
                <Icons.CheckCircle size={13} />
                <span>{handingOver ? "Handing Over…" : "1-Click Client Handover"}</span>
              </button>
            )}

            <Link href={`/officer/boundary?farmId=${farm.id}`} className="btn btn-secondary btn-sm">
              <Icons.Navigation size={13} />
              <span>Walk Boundary</span>
            </Link>
          </div>
        </div>

        {/* Cadastral, Soil Science & Hydrology Spec Strip */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: 12,
            padding: "12px 16px",
            background: "var(--canvas)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-sm)",
            fontSize: 12,
          }}
        >
          <div>
            <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>
              CADASTRAL / SURVEY #
            </div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
              {farm.surveyNumber ? `Sy/Khasra #${farm.surveyNumber}` : "Survey # Pending"}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              {[farm.village, farm.taluk, farm.district, farm.state].filter(Boolean).join(", ") || "—"}
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>
              SOIL SCIENCE
            </div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
              pH {farm.soilPh || "7.0"} &bull; EC {farm.soilEc ? `${farm.soilEc} dS/m` : "Normal"}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              OC: {farm.soilOrganicCarbon ? `${farm.soilOrganicCarbon}%` : "0.55%"} &bull; {farm.terrainType || "Plain"}
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>
              HYDROLOGY & POWER
            </div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
              {farm.borewellCount || 0} Borewells {farm.borewellDepthFeet ? `(${farm.borewellDepthFeet} ft)` : ""}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              {farm.waterYieldGph ? `${farm.waterYieldGph.toLocaleString()} GPH` : "Yield TBD"} &bull; {farm.electricitySupply || "3-Phase"}
            </div>
          </div>

          <div>
            <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>
              CIVIL INFRASTRUCTURE
            </div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
              {farm.fencingType || "Perimeter Fence"}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              {farm.contractValue ? `SLA Value: ₹${Number(farm.contractValue).toLocaleString("en-IN")}` : "Turnkey SLA"}
            </div>
          </div>
        </div>
      </div>

      {/* 2. Operational Navigation Tabs */}
      <div className="tabs-nav" style={{ margin: 0 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "plots" ? "active" : ""}`}
          onClick={() => setActiveTab("plots")}
        >
          <Icons.Plot size={14} />
          <span>Spatial &amp; Plots ({farm.plots.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "cycles" ? "active" : ""}`}
          onClick={() => setActiveTab("cycles")}
        >
          <Icons.Sun size={14} />
          <span>Agronomy &amp; Cycles</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "operations" ? "active" : ""}`}
          onClick={() => setActiveTab("operations")}
        >
          <Icons.ClipboardList size={14} />
          <span>Tasks &amp; Signals</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "access" ? "active" : ""}`}
          onClick={() => setActiveTab("access")}
        >
          <Icons.Users size={14} />
          <span>Team &amp; Access ({farm.access?.length || 0})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "boundaries" ? "active" : ""}`}
          onClick={() => setActiveTab("boundaries")}
        >
          <Icons.Shield size={14} />
          <span>Boundary History</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
          onClick={() => setActiveTab("settings")}
        >
          <Icons.Settings size={14} />
          <span>Estate Settings</span>
        </button>
      </div>

      {/* TAB 1: SPATIAL & PLOTS */}
      {activeTab === "plots" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Spatial Map & Actions Toolbar */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                  Interactive Estate Geospatial Map
                </h2>
                <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
                  Authoritative perimeter polygon with demarcated plot containment and field pins.
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowAddPlot(!showAddPlot)}
                >
                  <Icons.Plus size={13} />
                  <span>{showAddPlot ? "Close Plot Form" : "Demarcate New Plot"}</span>
                </button>
                <GridSplitForm farmId={farm.id} hasBoundary={!!farm.boundaryGeoJson} />
              </div>
            </div>

            {/* Satellite Map */}
            {isBoundaryCorrupt(farm.boundaryGeoJson) && (
              <div role="alert" style={{ padding: "10px 14px", fontSize: 12, color: "var(--amber)", background: "var(--amber-light)", border: "1px solid var(--amber)", borderRadius: "var(--radius-md)" }}>
                Stored fence is unreadable — redraw the estate perimeter and save.
              </div>
            )}
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--line)" }}>
              <GeoMap
                center={farmCenter}
                polygon={farmRingState}
                onChange={setFarmRingState}
                height={380}
                interactive={canManage}
                onSave={canManage ? handleSaveFarmBoundary : undefined}
                saveLabel="Save Estate Perimeter"
                isSaving={savingFarmBoundary}
                onClear={canManage ? () => setFarmRingState(null) : undefined}
              />
            </div>
          </div>

          {showAddPlot && (
            <div style={{ background: "var(--surface)", border: "1px solid var(--line)", padding: 20, borderRadius: "var(--radius-lg)" }}>
              <PlotForm
                farmId={farm.id}
                farmCenter={farmCenter}
                farmBoundary={farm.boundaryGeoJson}
              />
            </div>
          )}

          {/* Demarcated Plots Table */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                Demarcated Land Plots ({farm.plots.length})
              </h2>
            </div>

            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Plot Name</th>
                    <th>Acreage</th>
                    <th>Soil Type</th>
                    <th>Irrigation Systems</th>
                    <th>Active Crop Cycles</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Plot Cockpit</th>
                  </tr>
                </thead>
                <tbody>
                  {farm.plots.length === 0 ? (
                    <tr>
                      <td colSpan={7} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                        No plots demarcated yet. Use "Demarcate New Plot" or "Grid-Split" to configure land blocks.
                      </td>
                    </tr>
                  ) : (
                    farm.plots.map((plot: any) => (
                      <tr key={plot.id}>
                        <td>
                          <Link href={`/plots/${plot.id}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                            {plot.name}
                          </Link>
                        </td>
                        <td>
                          <span style={{ fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                            {plot.area} ac
                          </span>
                          {plot.measuredAcres && (
                            <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>
                              ({plot.measuredAcres} measured)
                            </span>
                          )}
                        </td>
                        <td>{plot.soilType || "Not Specified"}</td>
                        <td>
                          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                            {plot.irrigation.length > 0 ? (
                              plot.irrigation.map((irr: any, idx: number) => (
                                <span key={idx} className="badge badge-stone" style={{ fontSize: 10 }}>
                                  {irr.type}
                                </span>
                              ))
                            ) : (
                              <span className="muted" style={{ fontSize: 11 }}>—</span>
                            )}
                          </div>
                        </td>
                        <td>
                          {plot.cropCycles.length > 0 ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                              {plot.cropCycles.map((c: any) => (
                                <span key={c.id} style={{ fontSize: 12 }}>
                                  <strong>{c.cropName}</strong> &bull; {c.status}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="muted" style={{ fontSize: 11 }}>None</span>
                          )}
                        </td>
                        <td>
                          <StatusBadge status={plot.status} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link href={`/plots/${plot.id}`} className="btn btn-secondary btn-sm">
                            <span>Open Plot</span>
                            <Icons.ArrowRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 16 }}>
            <PlotCoverageCard farmId={farm.id} />
            <TaskMapCard farmId={farm.id} />
          </div>
        </section>
      )}

      {/* TAB 2: AGRONOMY & CYCLES */}
      {activeTab === "cycles" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <WeatherCard farmId={farm.id} />

          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              Active Precision Crop Cycles
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 14 }}>
              {farm.plots.flatMap((p: any) =>
                p.cropCycles.map((c: any) => (
                  <div
                    key={c.id}
                    style={{
                      padding: 16,
                      borderRadius: "var(--radius-md)",
                      background: "var(--canvas)",
                      border: "1px solid var(--hairline)",
                      display: "flex",
                      flexDirection: "column",
                      gap: 8,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 14, color: "var(--ink)" }}>{c.cropName}</div>
                        <div className="muted" style={{ fontSize: 12 }}>Plot: {p.name}</div>
                      </div>
                      <StatusBadge status={c.status} />
                    </div>

                    <div style={{ fontSize: 12, color: "var(--muted)" }}>
                      Started: {new Date(c.startDate).toLocaleDateString()}
                      {c.expectedFirstHarvestDate && ` &bull; Harvest: ${new Date(c.expectedFirstHarvestDate).toLocaleDateString()}`}
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
                      {c.varieties.map((v: any, idx: number) => (
                        <span key={idx} className="badge badge-stone" style={{ fontSize: 10 }}>
                          Var: {v.name}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/plots/${p.id}/crop-cycles/${c.id}`}
                      className="btn btn-secondary btn-sm"
                      style={{ marginTop: 8, alignSelf: "flex-start" }}
                    >
                      <span>Cycle Diagnostics</span>
                    </Link>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: OPERATIONS & TASKS */}
      {activeTab === "operations" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <VisitRouteCard farmId={farm.id} farmCenter={farmCenter} />

          {/* Incidents & Crop Monitoring */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              Recent Incidents &amp; Field Signals ({farm.incidents.length})
            </h2>

            {farm.incidents.length === 0 ? (
              <p className="muted" style={{ fontSize: 13, margin: 0 }}>No incidents reported for this farm.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {farm.incidents.map((inc: any) => (
                  <div
                    key={inc.id}
                    style={{
                      padding: "10px 14px",
                      borderRadius: "var(--radius-sm)",
                      background: "var(--canvas)",
                      border: "1px solid var(--hairline)",
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span className="badge badge-danger" style={{ fontSize: 10 }}>
                          {inc.severity || "INCIDENT"}
                        </span>
                        <strong style={{ fontSize: 13 }}>{inc.type}</strong>
                        <span className="muted" style={{ fontSize: 11 }}>({inc.level})</span>
                      </div>
                      <div className="muted" style={{ fontSize: 12, marginTop: 3 }}>
                        {inc.description} &bull; Reporter: {inc.reporterName}
                      </div>
                    </div>
                    <StatusBadge status={inc.status} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 4: TEAM & ACCESS */}
      {activeTab === "access" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}>
              Personnel &amp; Field Manager Authorizations
            </h2>
            <FarmAccessManager farmId={farm.id} />
          </div>
        </section>
      )}

      {/* TAB 5: BOUNDARY PROVENANCE & HISTORY */}
      {activeTab === "boundaries" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}>
              Immutable Boundary Version History &amp; GPS Provenance
            </h2>
            <BoundaryHistory
              entityType="FARM"
              entityId={farm.id}
              canRestore={canManage}
              currentBoundary={farm.boundaryGeoJson}
            />
          </div>
        </section>
      )}

      {/* TAB 6: ESTATE SETTINGS */}
      {activeTab === "settings" && canManage && (
        <section style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--line)",
              borderRadius: "var(--radius-lg)",
              padding: 20,
            }}
          >
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", marginBottom: 14 }}>
              Edit Estate Specifications &amp; Geofence Parameters
            </h2>
            <FarmEditForm farm={farm} />
          </div>
        </section>
      )}
    </div>
  );
}
