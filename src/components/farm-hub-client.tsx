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
import { StatusBadge, PriorityBadge } from "./ui/badge";

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
    <div style={{ display: "grid", gap: 20 }}>
      {/* ── COMMAND HEADER ── */}
      <div className="card" style={{ padding: 24 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 16 }}>
          <div style={{ minWidth: 0, flex: "1 1 440px" }}>
            <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, flexWrap: "wrap" }}>
              <StatusBadge status={farm.status} />
              <span className="mono-label" style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
                <Icons.MapPin size={13} />
                <span>{farm.location} &bull; {farm.geofenceRadiusMeters}m geofence &bull; {farm.plots.length} plots</span>
              </span>
            </div>

            <h1 style={{ fontSize: "clamp(1.5rem, 3.5vw, 2.1rem)", margin: "0 0 6px" }}>{farm.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              <strong>{farm.ownerName}</strong> &bull; {farm.totalArea} acres total ({farm.cultivableArea} cultivable) &bull; Water: {farm.waterSource}
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

        {/* ── ONBOARDING ACTIVATION PIPELINE (WHEN IN SETUP) ── */}
        {isSetup && (
          <div style={{
            marginTop: 18,
            background: "var(--primary-light)",
            border: "1px solid var(--primary-border)",
            borderRadius: "var(--radius-md)",
            padding: 16,
            display: "grid",
            gap: 10,
          }}>
            <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: "0.78rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase", color: "var(--primary)" }}>
              <Icons.Sparkles size={15} />
              <span>Farm Activation Pipeline &bull; 3 Prerequisites Required (BRD §4)</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10 }}>
              {[
                { ok: hasPlots, label: `1. Add Plot (${farm.plots.length})` },
                { ok: hasActiveCycles, label: "2. Plan Crop Cycle" },
                { ok: hasMilestones, label: "3. Auto Milestones (4)" },
              ].map((s) => (
                <div key={s.label} style={{
                  padding: "10px 14px",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${s.ok ? "var(--success-border)" : "var(--border)"}`,
                  background: s.ok ? "var(--success-light)" : "var(--card)",
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: s.ok ? "var(--success-text)" : "var(--text-muted)",
                }}>
                  {s.ok ? <Icons.CheckCircle size={16} style={{ color: "var(--success)" }} /> : <Icons.AlertCircle size={16} />}
                  <span>{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── SEGMENTED NAVIGATION TABS ── */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === "plots" ? "active" : ""}`}
          onClick={() => setActiveTab("plots")}
        >
          <Icons.Layers size={15} />
          <span>Plots & Crops ({farm.plots.length})</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "weather" ? "active" : ""}`}
          onClick={() => setActiveTab("weather")}
        >
          <Icons.Sun size={15} />
          <span>Agronomy & Weather</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "team" ? "active" : ""}`}
          onClick={() => setActiveTab("team")}
        >
          <Icons.Users size={15} />
          <span>Team & Access</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeTab === "signals" ? "active" : ""}`}
          onClick={() => setActiveTab("signals")}
        >
          <Icons.Activity size={15} />
          <span>Signals & Incidents ({farm.incidents.length + farm.monitoring.length})</span>
        </button>

        {canManage && (
          <button
            type="button"
            className={`tab-btn ${activeTab === "settings" ? "active" : ""}`}
            onClick={() => setActiveTab("settings")}
          >
            <Icons.Settings size={15} />
            <span>Farm Settings</span>
          </button>
        )}
      </div>

      {/* ── TAB 1: PLOTS & CROPS ── */}
      {activeTab === "plots" && (
        <section style={{ display: "grid", gap: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h2 style={{ fontSize: "1.2rem", margin: 0 }}>Managed Plots & Crop Cycles</h2>
              <p className="muted" style={{ margin: "2px 0 0" }}>
                Total acreage: <strong>{farm.plots.reduce((acc, p) => acc + Number(p.area), 0).toFixed(2)} acres</strong>
              </p>
            </div>

            {canManage && (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => setShowAddPlot(!showAddPlot)}
              >
                {showAddPlot ? <Icons.X size={15} /> : <Icons.Plus size={15} />}
                <span>{showAddPlot ? "Close Form" : "Create New Plot"}</span>
              </button>
            )}
          </div>

          {showAddPlot && canManage && <PlotForm farmId={farm.id} />}

          {/* Plots Grid */}
          <div style={{ display: "grid", gap: 16 }}>
            {farm.plots.map((plot) => (
              <article className="card" key={plot.id} style={{ margin: 0, padding: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
                  <div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 6, flexWrap: "wrap" }}>
                      <h3 style={{ margin: 0, fontSize: "1.15rem" }}>{plot.name}</h3>
                      <StatusBadge status={plot.status} />
                      <span className="mono-label" style={{ fontWeight: 700, color: "var(--primary)" }}>
                        {plot.area} Acres
                      </span>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <span className="muted" style={{ fontSize: "0.82rem" }}>
                        Soil: <strong>{plot.soilType || "Not specified"}</strong> &bull; GPS: ({plot.latitude}, {plot.longitude})
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
                            background: "var(--info-light)",
                            color: "var(--info-text)",
                            border: "1px solid var(--info-border)",
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
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--border)", display: "grid", gap: 12 }}>
                  {plot.cropCycles.map((cycle) => (
                    <div
                      key={cycle.id}
                      style={{
                        padding: "16px",
                        background: "var(--card-muted)",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid var(--border)",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 10 }}>
                        <div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <Link href={`/plots/${plot.id}/crop-cycles/${cycle.id}`} style={{ textDecoration: "none" }}>
                              <strong style={{ fontSize: "1.05rem", color: "var(--text-main)" }}>
                                🌱 {cycle.cropName}
                              </strong>
                            </Link>
                            <StatusBadge status={cycle.status} />
                            <span className="mono-label" style={{ background: "var(--card)", padding: "2px 8px", borderRadius: "var(--radius-xs)" }}>
                              {cycle.establishmentType.replaceAll("_", " ")}
                            </span>
                          </div>

                          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", margin: "4px 0" }}>
                            Varieties: <strong>{cycle.varieties.map((v) => v.name).join(", ") || "Standard"}</strong> &bull; Start: {new Date(cycle.startDate).toLocaleDateString()} &bull; Harvest Target: {cycle.expectedFirstHarvestDate ? new Date(cycle.expectedFirstHarvestDate).toLocaleDateString() : "TBD"}
                          </p>
                        </div>

                        <div style={{ display: "flex", gap: 8 }}>
                          <Link href={`/plots/${plot.id}/crop-cycles/${cycle.id}`} className="btn btn-sm btn-outline">
                            <span>Inspect Cycle</span>
                            <Icons.ArrowRight size={12} />
                          </Link>

                          {canManage && (
                            <Link href={`/plots/${plot.id}/crop-cycles/${cycle.id}/edit`} className="btn btn-sm btn-secondary">
                              <Icons.Edit size={13} />
                              <span>Edit Milestones</span>
                            </Link>
                          )}
                        </div>
                      </div>

                      {/* Bed & Plant Population Telemetry */}
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 8, marginTop: 12 }}>
                        {cycle.bedPreparationEnabled && (
                          <div style={{ padding: "8px 12px", background: "var(--card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                            <span className="mono-label" style={{ display: "block" }}>
                              Beds (Expected / Actual)
                            </span>
                            <strong style={{ fontSize: "0.95rem" }}>
                              {cycle.expectedTotalBeds ?? "—"} / {cycle.actualBedsCreated ?? "Pending"}
                            </strong>
                          </div>
                        )}

                        <div style={{ padding: "8px 12px", background: "var(--card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                          <span className="mono-label" style={{ display: "block" }}>
                            Plants (Target / Actual)
                          </span>
                          <strong style={{ fontSize: "0.95rem" }}>
                            {cycle.expectedPlants ? Number(cycle.expectedPlants).toLocaleString() : "—"} / {cycle.actualPlants ? Number(cycle.actualPlants).toLocaleString() : "Pending"}
                          </strong>
                        </div>

                        {cycle.mulchEnabled && (
                          <div style={{ padding: "8px 12px", background: "var(--card)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                            <span className="mono-label" style={{ display: "block" }}>
                              Mulching Configuration
                            </span>
                            <strong style={{ fontSize: "0.85rem" }}>
                              {cycle.mulchHolePattern?.replaceAll("_", " ")} ({cycle.plantDistanceCm}cm)
                            </strong>
                          </div>
                        )}
                      </div>

                      {/* Milestone Roadmap */}
                      <div style={{ marginTop: 14 }}>
                        <span className="mono-label" style={{ display: "block", marginBottom: 6, fontWeight: 700 }}>
                          Standard Milestone Schedule
                        </span>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(170px, 1fr))", gap: 8 }}>
                          {cycle.milestones.map((m) => (
                            <div
                              key={m.id}
                              style={{
                                padding: "8px 10px",
                                background: m.status === "COMPLETED" ? "var(--success-light)" : "var(--card)",
                                border: `1px solid ${m.status === "COMPLETED" ? "var(--success-border)" : "var(--border)"}`,
                                borderRadius: "var(--radius-sm)",
                                fontSize: "0.82rem",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <strong>{m.name}</strong>
                                <StatusBadge status={m.status} />
                              </div>
                              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", display: "block", marginTop: 3 }}>
                                Target: {new Date(m.targetDate).toLocaleDateString()}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}

                  {!plot.cropCycles.length && (
                    <div style={{ padding: "16px", textAlign: "center", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                      <p className="muted" style={{ margin: "0 0 8px", fontSize: "0.88rem" }}>
                        No active crop cycle planned for this plot.
                      </p>
                      {canManage && (
                        <Link href={`/plots/${plot.id}/crop-cycles/new`} className="btn btn-sm btn-primary">
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
              <div style={{ padding: "40px 20px", textAlign: "center", background: "var(--card)", borderRadius: "var(--radius-md)", border: "1px solid var(--border)" }}>
                <div style={{ width: 44, height: 44, borderRadius: "var(--radius-sm)", background: "var(--card-muted)", margin: "0 auto 12px", display: "grid", placeItems: "center" }}>
                  <Icons.Layers size={22} style={{ color: "var(--text-muted)" }} />
                </div>
                <h3>No Plots Defined</h3>
                <p className="muted" style={{ maxWidth: 400, margin: "4px auto 16px" }}>
                  Create plots with boundary coordinates and irrigation infrastructure to begin crop planning.
                </p>
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

      {/* ── TAB 2: AGRONOMY & WEATHER ── */}
      {activeTab === "weather" && (
        <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16, alignItems: "start" }}>
          <WeatherCard farmId={farm.id} />
          <ManualWeatherForm farmId={farm.id} />
        </section>
      )}

      {/* ── TAB 3: TEAM & ACCESS ── */}
      {activeTab === "team" && (
        <section>
          <FarmAccessManager farmId={farm.id} />
        </section>
      )}

      {/* ── TAB 4: FIELD SIGNALS & INCIDENTS ── */}
      {activeTab === "signals" && (
        <section style={{ display: "grid", gap: 16 }}>
          {/* Crop Monitoring */}
          <article className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div>
                <h3 style={{ margin: 0 }}>Daily Crop Health Telemetry</h3>
                <p className="muted" style={{ margin: "2px 0 0" }}>
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
                    background: m.status === "POOR" ? "var(--danger-light)" : "var(--success-light)",
                    border: `1px solid ${m.status === "POOR" ? "var(--danger-border)" : "var(--success-border)"}`,
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <strong style={{ color: m.status === "POOR" ? "var(--danger-text)" : "var(--success-text)" }}>
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
                <div style={{ padding: 16, textAlign: "center", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                  <p className="muted" style={{ margin: 0 }}>No daily monitoring reports submitted yet.</p>
                </div>
              )}
            </div>
          </article>

          {/* Incidents */}
          <article className="card" style={{ margin: 0 }}>
            <div className="card-header">
              <div>
                <h3 style={{ margin: 0 }}>Field Incidents & Corrective Actions</h3>
                <p className="muted" style={{ margin: "2px 0 0" }}>
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
                    background: "var(--card)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius-md)",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <div style={{ display: "flex", gap: 6, alignItems: "center", marginBottom: 4 }}>
                        <strong style={{ fontSize: "1.05rem" }}>{inc.type}</strong>
                        <PriorityBadge priority={inc.severity ?? "MEDIUM"} />
                        <span className="mono-label" style={{ background: "var(--card-muted)", padding: "2px 6px", borderRadius: 4 }}>
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
                <div style={{ padding: 16, textAlign: "center", background: "var(--card-muted)", borderRadius: "var(--radius-sm)" }}>
                  <p className="muted" style={{ margin: 0 }}>No incidents reported on this farm.</p>
                </div>
              )}
            </div>
          </article>
        </section>
      )}

      {/* ── TAB 5: FARM SETTINGS ── */}
      {activeTab === "settings" && canManage && (
        <section>
          <FarmEditForm farm={farm} />
        </section>
      )}
    </div>
  );
}
