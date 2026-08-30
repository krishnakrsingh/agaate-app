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
import { EvidenceGallery } from "./evidence-gallery";

type Milestone = {
  id: string;
  name: string;
  targetDate: string;
  status: string;
  completedAt?: string | null;
};

type CropCycle = {
  id: string;
  cropName: string;
  startDate: string;
  expectedFirstHarvestDate: string | null;
  establishmentType: string;
  status: string;
  bedPreparationEnabled: boolean;
  expectedBedsPerAcre: string | null;
  expectedTotalBeds: string | null;
  actualBedsCreated: string | null;
  mulchEnabled: boolean;
  mulchHolePattern: string | null;
  plantDistanceCm: string | null;
  expectedPlantsPerAcre: string | null;
  expectedPlants: string | null;
  actualPlants: string | null;
  varieties: { name: string }[];
  milestones: Milestone[];
};

type Plot = {
  id: string;
  name: string;
  area: string;
  status: string;
  soilType: string | null;
  latitude: string;
  longitude: string;
  irrigation: { type: string; details: string | null }[];
  cropCycles: CropCycle[];
};

type Incident = {
  id: string;
  type: string;
  level: string;
  severity: string | null;
  status: string;
  description: string;
  impactPercent: string | null;
  createdAt: string;
  reporter?: { name: string } | null;
  media?: { id: string }[];
};

type Monitoring = {
  id: string;
  status: string;
  stage: string;
  impactPercent: string | null;
  remarks: string | null;
  createdAt: string;
  reporter?: { name: string } | null;
  media?: { id: string }[];
};

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
  geofenceRadiusMeters: number;
  plots: Plot[];
  incidents: Incident[];
  monitoring: Monitoring[];
  access: { id: string; user: { id: string; name: string; email: string; role: string } }[];
};

export function FarmHubClient({
  farm,
  role,
  canManage,
}: {
  farm: Farm;
  role: string;
  canManage: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"plots" | "weather" | "team" | "signals" | "settings">("plots");
  const [showAddPlot, setShowAddPlot] = useState(false);

  const isSetup = farm.status === "SETUP";
  const hasPlots = farm.plots.length > 0;
  const hasActiveCycles = farm.plots.some((p) => p.cropCycles.length > 0);
  const hasMilestones = farm.plots.some((p) =>
    p.cropCycles.some((c) => c.milestones.length >= 4)
  );

  return (
    <div style={{ display: "grid", gap: 24 }}>
      {/* Farm Command Header */}
      <div
        className="card"
        style={{
          border: "1px solid var(--border-subtle)",
          padding: "24px",
          marginBottom: 0,
          background: "var(--bg-card)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <span className={`status ${farm.status.toLowerCase()}`}>
                ● {farm.status}
              </span>
              <span style={{ fontSize: "0.85rem", color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <Icons.MapPin size={14} />
                <span>{farm.location}</span>
              </span>
            </div>

            <h1 style={{ fontSize: "1.8rem", margin: "4px 0 6px" }}>{farm.name}</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.92rem", margin: 0 }}>
              Owner: <strong>{farm.ownerName}</strong> &bull; Total Area: <strong>{farm.totalArea} acres</strong> ({farm.cultivableArea} cultivable) &bull; Water: {farm.waterSource}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
            {canManage && isSetup && (
              <ActivateFarmButton farmId={farm.id} />
            )}

            {canManage && !isSetup && (
              <FarmStatusControl farmId={farm.id} status={farm.status} />
            )}
          </div>
        </div>

        {/* Onboarding Pipeline Banner for SETUP Farms */}
        {isSetup && (
          <div
            style={{
              marginTop: 18,
              paddingTop: 16,
              borderTop: "1px solid var(--border-subtle)",
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: "0.85rem", color: "var(--harvest-dark)", fontWeight: 700, textTransform: "uppercase" }}>
              <Icons.Sparkles size={14} style={{ color: "var(--harvest-amber)" }} />
              <span>Farm Activation Onboarding Pipeline (BRD §4 & §5)</span>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              <div style={{ padding: "10px 14px", background: hasPlots ? "var(--primary-50)" : "var(--slate-100)", borderRadius: "var(--radius-sm)", border: `1px solid ${hasPlots ? "var(--primary-200)" : "var(--border-subtle)"}` }}>
                <div style={{ fontSize: "0.85rem", color: hasPlots ? "var(--primary-800)" : "var(--slate-600)", display: "flex", alignItems: "center", gap: 6 }}>
                  {hasPlots ? <Icons.CheckCircle size={14} /> : <Icons.AlertCircle size={14} />}
                  <strong>1. Add Plot ({farm.plots.length})</strong>
                </div>
              </div>

              <div style={{ padding: "10px 14px", background: hasActiveCycles ? "var(--primary-50)" : "var(--slate-100)", borderRadius: "var(--radius-sm)", border: `1px solid ${hasActiveCycles ? "var(--primary-200)" : "var(--border-subtle)"}` }}>
                <div style={{ fontSize: "0.85rem", color: hasActiveCycles ? "var(--primary-800)" : "var(--slate-600)", display: "flex", alignItems: "center", gap: 6 }}>
                  {hasActiveCycles ? <Icons.CheckCircle size={14} /> : <Icons.AlertCircle size={14} />}
                  <strong>2. Plan Crop Cycle</strong>
                </div>
              </div>

              <div style={{ padding: "10px 14px", background: hasMilestones ? "var(--primary-50)" : "var(--slate-100)", borderRadius: "var(--radius-sm)", border: `1px solid ${hasMilestones ? "var(--primary-200)" : "var(--border-subtle)"}` }}>
                <div style={{ fontSize: "0.85rem", color: hasMilestones ? "var(--primary-800)" : "var(--slate-600)", display: "flex", alignItems: "center", gap: 6 }}>
                  {hasMilestones ? <Icons.CheckCircle size={14} /> : <Icons.AlertCircle size={14} />}
                  <strong>3. 4 Standard Milestones</strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modern Navigation Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 0 }}>
        <button
          type="button"
          className={`tab-btn ${activeTab === "plots" ? "active" : ""}`}
          onClick={() => setActiveTab("plots")}
        >
          <Icons.Layers size={16} />
          <span>Plots & Crops ({farm.plots.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "weather" ? "active" : ""}`}
          onClick={() => setActiveTab("weather")}
        >
          <Icons.Sun size={16} />
          <span>Agronomy & Weather</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "team" ? "active" : ""}`}
          onClick={() => setActiveTab("team")}
        >
          <Icons.Users size={16} />
          <span>Team & Access</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "signals" ? "active" : ""}`}
          onClick={() => setActiveTab("signals")}
        >
          <Icons.Activity size={16} />
          <span>Signals & Incidents ({farm.incidents.length + farm.monitoring.length})</span>
        </button>

        {canManage && (
          <button
            type="button"
            className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Icons.Settings size={16} />
            <span>Farm Settings</span>
          </button>
        )}
      </div>

      {/* TAB 1: PLOTS & CROPS */}
      {activeTab === "plots" && (
        <section style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ fontSize: "1.25rem", margin: 0 }}>Managed Plots & Crop Cycles</h2>
              <p className="muted" style={{ fontSize: "0.85rem", margin: "2px 0 0" }}>
                Total acreage: <strong>{farm.plots.reduce((acc, p) => acc + Number(p.area), 0).toFixed(2)} acres</strong>
              </p>
            </div>

            {canManage && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => setShowAddPlot(!showAddPlot)}
              >
                {showAddPlot ? <Icons.X size={16} /> : <Icons.Plus size={16} />}
                <span>{showAddPlot ? "Close Form" : "Create New Plot"}</span>
              </button>
            )}
          </div>

          {showAddPlot && canManage && <PlotForm farmId={farm.id} />}

          {/* Plots Grid */}
          <div style={{ display: "grid", gap: 16 }}>
            {farm.plots.map((plot) => (
              <article className="card" key={plot.id} style={{ margin: 0 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6 }}>
                      <h3 style={{ margin: 0, fontSize: "1.2rem" }}>{plot.name}</h3>
                      <span className={`status ${plot.status.toLowerCase()}`}>{plot.status}</span>
                      <span style={{ fontSize: "0.85rem", fontWeight: 700, color: "var(--primary-800)" }}>
                        {plot.area} Acres
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span className="muted" style={{ fontSize: "0.82rem" }}>
                        Soil: {plot.soilType || "Not specified"} &bull; GPS: ({plot.latitude}, {plot.longitude})
                      </span>
                    </div>

                    {/* Irrigation Chips */}
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                      {plot.irrigation.map((ir) => (
                        <span
                          key={ir.type}
                          style={{
                            padding: "3px 8px",
                            borderRadius: "var(--radius-sm)",
                            background: "var(--sky-light)",
                            color: "var(--sky-blue)",
                            border: "1px solid var(--sky-border)",
                            fontSize: "0.78rem",
                            fontWeight: 600,
                          }}
                        >
                          💧 {ir.type} {ir.details ? `(${ir.details})` : ""}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    {canManage && (
                      <>
                        <Link href={`/plots/${plot.id}`} className="btn btn-sm btn-secondary">
                          <Icons.Edit size={13} />
                          <span>Edit Plot</span>
                        </Link>

                        <Link href={`/plots/${plot.id}/crop-cycles/new`} className="btn btn-sm btn-primary">
                          <Icons.Plus size={13} />
                          <span>Plan Crop</span>
                        </Link>
                      </>
                    )}
                  </div>
                </div>

                {/* Crop Cycles within Plot */}
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border-subtle)", display: "grid", gap: 12 }}>
                  {plot.cropCycles.map((cycle) => (
                    <div
                      key={cycle.id}
                      style={{
                        padding: "16px",
                        background: "var(--slate-50)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border-subtle)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <strong style={{ fontSize: "1.1rem", color: "var(--primary-900)" }}>
                              🌱 {cycle.cropName}
                            </strong>
                            <span className={`status ${cycle.status.toLowerCase()}`}>{cycle.status}</span>
                            <span className="role-badge agronomist" style={{ fontSize: "0.68rem" }}>
                              {cycle.establishmentType.replaceAll("_", " ")}
                            </span>
                          </div>

                          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0" }}>
                            Varieties: <strong>{cycle.varieties.map((v) => v.name).join(", ") || "Standard"}</strong> &bull; Start: {new Date(cycle.startDate).toLocaleDateString()} &bull; Harvest Target: {cycle.expectedFirstHarvestDate ? new Date(cycle.expectedFirstHarvestDate).toLocaleDateString() : "TBD"}
                          </p>
                        </div>

                        {canManage && (
                          <Link href={`/plots/${plot.id}/crop-cycles/${cycle.id}/edit`} className="btn btn-sm btn-secondary">
                            <Icons.Edit size={13} />
                            <span>Edit Milestones</span>
                          </Link>
                        )}
                      </div>

                      {/* Bed & Plant Variance Telemetry */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginTop: 12 }}>
                        {cycle.bedPreparationEnabled && (
                          <div style={{ padding: "8px 10px", background: "white", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                              Beds (Expected / Actual)
                            </span>
                            <strong style={{ fontSize: "0.95rem" }}>
                              {cycle.expectedTotalBeds ?? "—"} / {cycle.actualBedsCreated ?? "Pending"}
                            </strong>
                          </div>
                        )}

                        <div style={{ padding: "8px 10px", background: "white", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                          <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                            Plants (Target / Actual)
                          </span>
                          <strong style={{ fontSize: "0.95rem" }}>
                            {cycle.expectedPlants ? Number(cycle.expectedPlants).toLocaleString() : "—"} / {cycle.actualPlants ? Number(cycle.actualPlants).toLocaleString() : "Pending"}
                          </strong>
                        </div>

                        {cycle.mulchEnabled && (
                          <div style={{ padding: "8px 10px", background: "white", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-subtle)" }}>
                            <span style={{ fontSize: "0.72rem", color: "var(--text-muted)", display: "block" }}>
                              Mulching Setup
                            </span>
                            <strong style={{ fontSize: "0.85rem" }}>
                              {cycle.mulchHolePattern?.replaceAll("_", " ")} ({cycle.plantDistanceCm}cm)
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Milestone Roadmap */}
                      <div style={{ marginTop: 14 }}>
                        <span style={{ fontSize: "0.78rem", fontWeight: 700, textTransform: "uppercase", color: "var(--text-muted)", display: "block", marginBottom: 6 }}>
                          Standard Milestone Schedule
                        </span>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8 }}>
                          {cycle.milestones.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                padding: "8px 10px",
                                background: m.status === "COMPLETED" ? "var(--primary-50)" : "white",
                                border: `1px solid ${m.status === "COMPLETED" ? "var(--primary-200)" : "var(--border-subtle)"}`,
                                borderRadius: "var(--radius-sm)",
                                fontSize: "0.82rem",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong>{m.name}</strong>
                                <span className={`status ${m.status.toLowerCase()}`} style={{ fontSize: "0.65rem", padding: "1px 5px" }}>
                                  {m.status}
                                </span>
                              </div>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginTop: 2 }}>
                                Target: {new Date(m.targetDate).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {!plot.cropCycles.length && (
                    <div className="empty" style={{ padding: 14 }}>
                      <p style={{ margin: 0, fontSize: "0.85rem" }}>
                        No active crop cycle planned for this plot.
                      </p>
                      {canManage && (
                        <Link href={`/plots/${plot.id}/crop-cycles/new`} className="btn btn-sm btn-primary" style={{ marginTop: 8 }}>
                          <Icons.Plus size={14} />
                          <span>Plan First Crop Cycle</span>
                        </Link>
                      )}
                    </div>
                  )}
                </div>
              </article>
            ))}

            {!farm.plots.length && (
              <div className="empty">
                <div className="empty-icon">
                  <Icons.Layers size={24} />
                </div>
                <h3>No Plots Defined</h3>
                <p>Create plots with boundary coordinates and irrigation infrastructure to begin crop planning.</p>
                {canManage && (
                  <button type="button" className="btn btn-primary" onClick={() => setShowAddPlot(true)}>
                    <Icons.Plus size={16} />
                    <span>Add First Plot</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* TAB 2: AGRONOMY & WEATHER */}
      {activeTab === "weather" && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
          <WeatherCard farmId={farm.id} />
          <ManualWeatherForm farmId={farm.id} />
        </section>
      )}

      {/* TAB 3: TEAM & ACCESS */}
      {activeTab === "team" && (
        <section>
          <FarmAccessManager farmId={farm.id} />
        </section>
      )}

      {/* TAB 4: FIELD SIGNALS & INCIDENTS */}
      {activeTab === "signals" && (
        <section style={{ display: "grid", gap: 16 }}>
          {/* Crop Monitoring */}
          <article className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div>
                <h3>Daily Crop Health Telemetry</h3>
                <p className="muted" style={{ fontSize: "0.85rem" }}>
                  Verified field observation logs submitted by assigned Farm Officers.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 10 }}>
              {farm.monitoring.map((m) => (
                <div
                  key={m.id}
                  style={{
                    padding: "12px 14px",
                    background: m.status === "POOR" ? "var(--danger-light)" : "var(--primary-50)",
                    border: `1px solid ${m.status === "POOR" ? "var(--danger-border)" : "var(--primary-200)"}`,
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ color: m.status === "POOR" ? "var(--danger-red)" : "var(--primary-800)" }}>
                        {m.status === "GOOD" ? "🟢 Good Health" : "🔴 Poor Health"} &bull; Stage: {m.stage}
                      </strong>
                      {m.impactPercent && (
                        <span className="priority-tag high">
                          {m.impactPercent}% Impact
                        </span>
                      )}
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>
                      {new Date(m.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {m.remarks && <p style={{ margin: "6px 0 0", fontSize: "0.88rem" }}>{m.remarks}</p>}
                  {m.media && m.media.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <EvidenceGallery mediaIds={m.media.map((x) => x.id)} />
                    </div>
                  )}
                </div>
              ))}

              {!farm.monitoring.length && (
                <div className="empty" style={{ padding: 16 }}>
                  <p style={{ margin: 0 }}>No daily monitoring reports submitted yet.</p>
                </div>
              )}
            </div>
          </article>

          {/* Incidents */}
          <article className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div>
                <h3>Field Incidents & Corrective Actions</h3>
                <p className="muted" style={{ fontSize: "0.85rem" }}>
                  Pests, infrastructure issues, and Agronomist treatment instructions.
                </p>
              </div>
            </div>

            <div style={{ display: "grid", gap: 12 }}>
              {farm.incidents.map((inc) => (
                <div
                  key={inc.id}
                  style={{
                    padding: "14px",
                    background: "white",
                    border: "1px solid var(--border-strong)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                        <strong style={{ fontSize: "1.05rem" }}>{inc.type}</strong>
                        <span className={`priority-tag ${(inc.severity ?? "MEDIUM").toLowerCase()}`}>{inc.severity ?? "MEDIUM"}</span>
                        <span style={{ fontSize: "0.72rem", background: "var(--slate-100)", padding: "2px 6px", borderRadius: 4 }}>
                          {inc.level} Level
                        </span>
                      </div>
                      <p style={{ fontSize: "0.88rem", margin: "2px 0 0", color: "var(--text-main)" }}>
                        {inc.description}
                      </p>
                    </div>

                    <IncidentStatusControl incidentId={inc.id} status={inc.status} />
                  </div>

                  {inc.media && inc.media.length > 0 && (
                    <div style={{ marginTop: 8 }}>
                      <EvidenceGallery mediaIds={inc.media.map((x) => x.id)} />
                    </div>
                  )}

                  <IncidentFollowUp incidentId={inc.id} />
                </div>
              ))}

              {!farm.incidents.length && (
                <div className="empty" style={{ padding: 16 }}>
                  <p style={{ margin: 0 }}>No incidents reported on this farm.</p>
                </div>
              )}
            </div>
          </article>
        </section>
      )}

      {/* TAB 5: FARM SETTINGS */}
      {activeTab === "settings" && canManage && (
        <section>
          <FarmEditForm farm={farm} />
        </section>
      )}
    </div>
  );
}
