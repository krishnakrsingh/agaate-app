"use client";
import { useState } from "react";
import Link from "next/link";
import { Icons } from "./icons";
import { PlotForm } from "./plot-form";
import { WeatherCard } from "./weather-card";
import { ManualWeatherForm } from "./manual-weather-form";
import { FarmAccessManager } from "./farm-access-manager";
import { FarmEditForm } from "./farm-edit-form";
import { ActivateFarmButton } from "./activate-farm-button";
import { FarmStatusControl } from "./farm-status-control";
import { IncidentFollowUp } from "./incident-followup";
import { IncidentStatusControl } from "./incident-status-control";
import { StatusBadge, PriorityBadge } from "./ui/badge";
import { EmptyState } from "./ui/empty-state";

type Milestone = { id: string; name: string; targetDate: string; status: string };
type CropCycle = { id: string; cropName: string; startDate: string; status: string; varieties: { name: string }[]; milestones: Milestone[] };
type Plot = { id: string; name: string; area: string; status: string; soilType: string | null; irrigation: { type: string; details: string | null }[]; cropCycles: CropCycle[] };
type Incident = { id: string; type: string; level: string; severity: string | null; status: string; description: string; impactPercent: string | null; createdAt: string; reporter?: { name: string } | null };
type Monitoring = { id: string; status: string; stage: string; impactPercent: string | null; remarks: string | null; createdAt: string; reporter?: { name: string } | null };
type Farm = {
  id: string; name: string; ownerName: string; location: string; address: string | null;
  latitude: string; longitude: string; totalArea: string; cultivableArea: string; waterSource: string;
  status: string; geofenceRadiusMeters: number; plots: Plot[]; incidents: Incident[]; monitoring: Monitoring[];
};

export function FarmHubClient({ farm, role, canManage }: { farm: Farm; role: string; canManage: boolean }) {
  const [tab, setTab] = useState<"plots" | "weather" | "team" | "signals" | "settings">("plots");
  const [showAddPlot, setShowAddPlot] = useState(false);

  const isSetup = farm.status === "SETUP";
  const hasPlots = farm.plots.length > 0;
  const hasCycles = farm.plots.some((p) => p.cropCycles.length > 0);
  const hasMilestones = farm.plots.some((p) => p.cropCycles.some((c) => c.milestones.length >= 4));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
      {/* COMMAND HEADER */}
      <div className="page-header">
        <div className="page-header-content">
          <div style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
            <StatusBadge status={farm.status} />
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

      {/* ACTIVATION PIPELINE BANNER */}
      {isSetup && (
        <div className="callout" style={{ gap: 12 }}>
          <div className="eyebrow" style={{ color: "var(--green-dark)" }}>
            <span className="eyebrow-dot" />
            <span>FARM ACTIVATION GATEKEEPER PIPELINE</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 22, height: 22, border: "1px solid var(--line-strong)", background: hasPlots ? "var(--green)" : "var(--canvas)", color: hasPlots ? "#fff" : "var(--ink)", display: "grid", placeItems: "center", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                {hasPlots ? "✓" : "1"}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 550, color: "var(--ink)" }}>1. Create Plot ({farm.plots.length})</span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 22, height: 22, border: "1px solid var(--line-strong)", background: hasCycles ? "var(--green)" : "var(--canvas)", color: hasCycles ? "#fff" : "var(--ink)", display: "grid", placeItems: "center", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                {hasCycles ? "✓" : "2"}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 550, color: "var(--ink)" }}>2. Plan Crop Cycle</span>
            </div>
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span style={{ width: 22, height: 22, border: "1px solid var(--line-strong)", background: hasMilestones ? "var(--green)" : "var(--canvas)", color: hasMilestones ? "#fff" : "var(--ink)", display: "grid", placeItems: "center", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 600 }}>
                {hasMilestones ? "✓" : "3"}
              </span>
              <span style={{ fontSize: "13px", fontWeight: 550, color: "var(--ink)" }}>3. Schedule 4 Milestones</span>
            </div>
          </div>
        </div>
      )}

      {/* SEGMENTED TABS */}
      <div className="tabs-nav">
        <button type="button" className={`tab-btn ${tab === "plots" ? "active" : ""}`} onClick={() => setTab("plots")}>
          <Icons.Plot size={14} /><span>Plots &amp; Crops ({farm.plots.length})</span>
        </button>
        <button type="button" className={`tab-btn ${tab === "weather" ? "active" : ""}`} onClick={() => setTab("weather")}>
          <Icons.Sun size={14} /><span>Agronomy &amp; Weather</span>
        </button>
        <button type="button" className={`tab-btn ${tab === "team" ? "active" : ""}`} onClick={() => setTab("team")}>
          <Icons.Users size={14} /><span>Team &amp; Access</span>
        </button>
        <button type="button" className={`tab-btn ${tab === "signals" ? "active" : ""}`} onClick={() => setTab("signals")}>
          <Icons.Activity size={14} /><span>Signals &amp; Incidents ({farm.incidents.length + farm.monitoring.length})</span>
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
              <p className="muted" style={{ marginTop: 2 }}>Manage plot acreage, irrigation systems, and launch crop cycles.</p>
            </div>
            {canManage && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddPlot(!showAddPlot)}>
                <Icons.Plus size={14} /><span>{showAddPlot ? "Close Form" : "Add Land Plot"}</span>
              </button>
            )}
          </div>

          {showAddPlot && (
            <div style={{ background: "var(--canvas)", border: "1px solid var(--line)", padding: 20, borderRadius: "var(--radius-sm)" }}>
              <PlotForm farmId={farm.id} />
            </div>
          )}

          {/* SPATIAL PLOT GRID */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))", gap: 16 }}>
            {farm.plots.map((plot) => (
              <article key={plot.id} className="compact-card" style={{ padding: 20, gap: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <h3 className="item-title">{plot.name}</h3>
                    <span className="muted" style={{ fontSize: "13px" }}>
                      <span className="data">{plot.area}</span> acres &bull; {plot.soilType || "Soil Not Specified"}
                    </span>
                  </div>
                  <StatusBadge status={plot.status} />
                </div>

                {/* Irrigation tags */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {plot.irrigation.map((irr, idx) => (
                    <span key={idx} className="mono-label" style={{ background: "var(--stone)", padding: "3px 8px", border: "1px solid var(--line)" }}>
                      {irr.type}
                    </span>
                  ))}
                </div>

                {/* Crop Cycles list */}
                <div style={{ borderTop: "1px solid var(--line)", paddingTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="mono-label" style={{ color: "var(--muted)" }}>Active Crop Cycles ({plot.cropCycles.length})</div>
                  {plot.cropCycles.map((cycle) => (
                    <Link
                      key={cycle.id}
                      href={`/plots/${plot.id}/crop-cycles/${cycle.id}`}
                      className="data-row"
                      style={{ padding: "10px 12px", minHeight: "auto", border: "1px solid var(--line)", textDecoration: "none", color: "inherit" }}
                    >
                      <div>
                        <div style={{ fontWeight: 550, fontSize: "13px" }}>🌱 {cycle.cropName}</div>
                        <div className="muted" style={{ fontSize: "11px" }}>Started: {new Date(cycle.startDate).toLocaleDateString()}</div>
                      </div>
                      <StatusBadge status={cycle.status} />
                    </Link>
                  ))}
                  {!plot.cropCycles.length && <p className="muted" style={{ fontSize: "12px", margin: 0 }}>No active crop cycles in this plot.</p>}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 12 }}>
                  <Link href={`/plots/${plot.id}`} className="btn btn-secondary btn-sm">
                    <Icons.Edit size={13} />
                    <span>Inspect Plot</span>
                  </Link>
                  {canManage && (
                    <Link href={`/plots/${plot.id}/crop-cycles/new`} className="btn btn-green btn-sm">
                      <Icons.Plus size={13} />
                      <span>Launch Crop Cycle</span>
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
                    <Icons.Plus size={14} /><span>Add Plot</span>
                  </button>
                )
              }
            />
          )}
        </section>
      )}

      {/* TAB 2: WEATHER & OVERRIDE */}
      {tab === "weather" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 20 }}>
          <WeatherCard farmId={farm.id} />
          {["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST"].includes(role) && <ManualWeatherForm farmId={farm.id} />}
        </div>
      )}

      {/* TAB 3: TEAM & ACCESS */}
      {tab === "team" && <FarmAccessManager farmId={farm.id} />}

      {/* TAB 4: SIGNALS & INCIDENTS */}
      {tab === "signals" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <div className="page-header" style={{ paddingBottom: 12 }}>
            <h2 className="section-title">Field Incidents &amp; Observations ({farm.incidents.length})</h2>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {farm.incidents.map((inc) => (
              <div
                key={inc.id}
                className="compact-card"
                style={{ padding: 16, borderLeft: inc.severity === "CRITICAL" ? "2px solid var(--red)" : "2px solid var(--amber)", gap: 10 }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <strong style={{ fontSize: "14px", color: inc.severity === "CRITICAL" ? "var(--red)" : "var(--ink)" }}>{inc.type}</strong>
                    {inc.severity && <PriorityBadge priority={inc.severity} />}
                  </div>
                  {canManage ? <IncidentStatusControl incidentId={inc.id} status={inc.status} /> : <StatusBadge status={inc.status} />}
                </div>
                <p style={{ margin: 0, fontSize: "13px" }}>{inc.description}</p>
                <IncidentFollowUp incidentId={inc.id} />
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

      {/* TAB 5: SETTINGS */}
      {tab === "settings" && canManage && (
        <div style={{ background: "var(--canvas)", border: "1px solid var(--line)", padding: 24, borderRadius: "var(--radius-sm)" }}>
          <FarmEditForm farm={farm} />
        </div>
      )}
    </div>
  );
}
