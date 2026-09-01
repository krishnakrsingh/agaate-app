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
    <div style={{ display: "grid", gap: 20 }}>
      {/* COMMAND HEADER */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <StatusBadge status={farm.status} />
              <span className="mono-label" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <Icons.MapPin size={13} />
                <span>{farm.location} &bull; {farm.geofenceRadiusMeters}m geofence &bull; {farm.plots.length} plots</span>
              </span>
            </div>
            <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.1rem)", margin: "0 0 6px" }}>{farm.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              <strong>{farm.ownerName}</strong> &bull; {farm.totalArea} acres ({farm.cultivableArea} cultivable) &bull; Water: {farm.waterSource}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {canManage && isSetup && <ActivateFarmButton farmId={farm.id} />}
            {canManage && !isSetup && <FarmStatusControl farmId={farm.id} status={farm.status} />}
          </div>
        </div>

        {/* ACTIVATION PIPELINE BANNER */}
        {isSetup && (
          <div style={{ marginTop: 18, background: "var(--primary-light)", border: "1px solid var(--primary-border)", borderRadius: "var(--radius-md)", padding: 16, display: "grid", gap: 10 }}>
            <div className="eyebrow"><span className="eyebrow-dot" />FARM ACTIVATION PIPELINE</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: hasPlots ? "var(--primary)" : "var(--border)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>{hasPlots ? "✓" : "1"}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>1. Create Plot ({farm.plots.length})</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: hasCycles ? "var(--primary)" : "var(--border)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>{hasCycles ? "✓" : "2"}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>2. Plan Crop Cycle</span>
              </div>
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <span style={{ width: 20, height: 20, borderRadius: "50%", background: hasMilestones ? "var(--primary)" : "var(--border)", color: "#fff", display: "grid", placeItems: "center", fontSize: 11, fontWeight: 700 }}>{hasMilestones ? "✓" : "3"}</span>
                <span style={{ fontSize: "0.85rem", fontWeight: 600 }}>3. Schedule 4 Milestones</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SEGMENTED TABS */}
      <div className="tabs-nav" style={{ margin: 0 }}>
        <button type="button" className={`tab-btn ${tab === "plots" ? "active" : ""}`} onClick={() => setTab("plots")}>
          <Icons.Plot size={14} /><span>Plots & Crops ({farm.plots.length})</span>
        </button>
        <button type="button" className={`tab-btn ${tab === "weather" ? "active" : ""}`} onClick={() => setTab("weather")}>
          <Icons.Sun size={14} /><span>Agronomy & Weather</span>
        </button>
        <button type="button" className={`tab-btn ${tab === "team" ? "active" : ""}`} onClick={() => setTab("team")}>
          <Icons.Users size={14} /><span>Team & Access</span>
        </button>
        <button type="button" className={`tab-btn ${tab === "signals" ? "active" : ""}`} onClick={() => setTab("signals")}>
          <Icons.Activity size={14} /><span>Signals & Incidents ({farm.incidents.length + farm.monitoring.length})</span>
        </button>
        {canManage && (
          <button type="button" className={`tab-btn ${tab === "settings" ? "active" : ""}`} onClick={() => setTab("settings")}>
            <Icons.Settings size={14} /><span>Farm Settings</span>
          </button>
        )}
      </div>

      {/* TAB 1: PLOTS & CROPS */}
      {tab === "plots" && (
        <section style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ margin: 0 }}>Plots & Precision Crop Cycles</h3>
              <p className="muted" style={{ margin: "2px 0 0" }}>Manage plot acreage, irrigation systems, and launch crop cycles.</p>
            </div>
            {canManage && (
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowAddPlot(!showAddPlot)}>
                <Icons.Plus size={14} /><span>{showAddPlot ? "Close" : "Add Plot"}</span>
              </button>
            )}
          </div>

          {showAddPlot && <PlotForm farmId={farm.id} />}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
            {farm.plots.map((plot) => (
              <article key={plot.id} className="card" style={{ padding: 20, display: "grid", gap: 14 }}>
                <div className="card-header" style={{ margin: 0 }}>
                  <div>
                    <h4 style={{ margin: 0, fontSize: "1.1rem" }}>{plot.name}</h4>
                    <span className="muted" style={{ fontSize: "0.82rem" }}>{plot.area} acres &bull; {plot.soilType || "Soil Not Specified"}</span>
                  </div>
                  <span className={`status ${plot.status.toLowerCase()}`}>{plot.status}</span>
                </div>

                {/* Irrigation tags */}
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {plot.irrigation.map((irr, idx) => (
                    <span key={idx} className="mono-label" style={{ background: "var(--card-muted)", padding: "2px 8px", borderRadius: "var(--radius-xs)" }}>
                      {irr.type}
                    </span>
                  ))}
                </div>

                {/* Crop Cycles list */}
                <div style={{ background: "var(--card-muted)", padding: 12, borderRadius: "var(--radius-sm)", display: "grid", gap: 8 }}>
                  <div className="mono-label">Active Crop Cycles ({plot.cropCycles.length})</div>
                  {plot.cropCycles.map((cycle) => (
                    <Link
                      key={cycle.id}
                      href={`/plots/${plot.id}/crop-cycles/${cycle.id}`}
                      style={{ padding: "8px 10px", background: "var(--card)", borderRadius: "var(--radius-xs)", border: "1px solid var(--border)", display: "flex", justifyContent: "space-between", alignItems: "center", textDecoration: "none", color: "inherit" }}
                    >
                      <div>
                        <strong>🌱 {cycle.cropName}</strong>
                        <div className="muted" style={{ fontSize: "0.75rem" }}>Started: {new Date(cycle.startDate).toLocaleDateString()}</div>
                      </div>
                      <StatusBadge status={cycle.status} />
                    </Link>
                  ))}
                  {!plot.cropCycles.length && <p className="muted" style={{ fontSize: "0.82rem", margin: 0 }}>No active crop cycles.</p>}
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <Link href={`/plots/${plot.id}`} className="btn btn-secondary btn-sm"><Icons.Edit size={13} /><span>Edit Plot</span></Link>
                  {canManage && (
                    <Link href={`/plots/${plot.id}/crop-cycles/new`} className="btn btn-primary btn-sm"><Icons.Plus size={13} /><span>Launch Crop Cycle</span></Link>
                  )}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {/* TAB 2: WEATHER & OVERRIDE */}
      {tab === "weather" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
          <WeatherCard farmId={farm.id} />
          {["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST"].includes(role) && <ManualWeatherForm farmId={farm.id} />}
        </div>
      )}

      {/* TAB 3: TEAM & ACCESS */}
      {tab === "team" && <FarmAccessManager farmId={farm.id} />}

      {/* TAB 4: SIGNALS & INCIDENTS */}
      {tab === "signals" && (
        <div style={{ display: "grid", gap: 16 }}>
          <article className="card" style={{ padding: 20 }}>
            <h3 style={{ margin: "0 0 12px" }}>Field Incidents ({farm.incidents.length})</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {farm.incidents.map((inc) => (
                <div key={inc.id} style={{ padding: 14, background: "var(--card-muted)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "grid", gap: 8 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <strong style={{ color: "var(--danger-text)" }}>{inc.type}</strong>
                      {inc.severity && <PriorityBadge priority={inc.severity} />}
                    </div>
                    {canManage ? <IncidentStatusControl incidentId={inc.id} status={inc.status} /> : <StatusBadge status={inc.status} />}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.88rem" }}>{inc.description}</p>
                  <IncidentFollowUp incidentId={inc.id} />
                </div>
              ))}
              {!farm.incidents.length && <p className="muted" style={{ margin: 0 }}>No incidents reported.</p>}
            </div>
          </article>
        </div>
      )}

      {/* TAB 5: SETTINGS */}
      {tab === "settings" && canManage && <FarmEditForm farm={farm} />}
    </div>
  );
}
