"use client";
import { useState } from "react";
import Link from "next/link";
import { Icons } from "./icons";
import { PlotForm } from "./plot-form";
import { WeatherCard } from "./weather-card";
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
type Farm = {
  id: string; name: string; ownerName: string; location: string; address: string | null;
  latitude: string; longitude: string; totalArea: string; cultivableArea: string; waterSource: string;
  status: string; geofenceRadiusMeters: number; plots: Plot[]; incidents: Incident[]; monitoring: Monitoring[];
};

export function FarmHubClient({ farm, role, canManage }: { farm: Farm; role: string; canManage: boolean }) {
  const [tab, setTab] = useState<"plots" | "weather" | "team" | "signals" | "settings">("plots");
  const [showAddPlot, setShowAddPlot] = useState(false);
  const [selectedIncidentPhoto, setSelectedIncidentPhoto] = useState<string | null>(null);

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
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 18 }}>
            {farm.plots.map((plot) => (
              <article
                key={plot.id}
                className="compact-card hover-glow"
                style={{
                  padding: 24,
                  gap: 16,
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-card)",
                  backgroundColor: "var(--canvas)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
                  <div>
                    <h3 style={{ fontSize: "17px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>{plot.name}</h3>
                    <div className="muted" style={{ fontSize: "13px", marginTop: 3 }}>
                      <strong style={{ color: "var(--ink)" }}>{plot.area}</strong> acres &bull; {plot.soilType || "Soil Not Specified"}
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
            <h2 className="section-title">Field Incidents &amp; Observations ({farm.incidents.length})</h2>
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
                        border: "1px solid var(--line)",
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
        <div style={{ background: "var(--canvas)", border: "1px solid var(--line)", padding: 24, borderRadius: "var(--radius-sm)" }}>
          <FarmEditForm farm={farm} />
        </div>
      )}
    </div>
  );
}
