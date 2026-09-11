"use client";

import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { PlotForm } from "@/components/plot-form";
import { GridSplitForm } from "@/components/grid-split-form";
import { BoundaryHistory } from "@/components/boundary-history";
import { FarmAccessManager } from "@/components/farm-access-manager";
import { FarmEditForm } from "@/components/farm-edit-form";
import { parseBoundary, toGeoJsonPolygon, type LngLat } from "@/lib/geo";
import { HqCalendarPlatform } from "@/components/hq/calendar-platform";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => (
    <div style={{ height: 340, display: "grid", placeItems: "center", background: "var(--canvas)", color: "var(--muted)", fontSize: 13 }}>
      Loading farm map…
    </div>
  ),
});

export interface Farm360Plot {
  id: string;
  name: string;
  area: string;
  measuredAcres: string | null;
  status: string;
  soilType: string | null;
  hasBoundary: boolean;
  latitude: string;
  longitude: string;
  irrigation: string[];
  activeCycles: number;
}

export interface Farm360Task {
  id: string;
  title: string;
  category: string;
  priority: string;
  status: string;
  dueDate: string;
  createdAt: string;
  officer: { id: string; name: string } | null;
  plot: { id: string; name: string } | null;
}

export interface Farm360Incident {
  id: string;
  type: string;
  level: string;
  severity: string | null;
  status: string;
  description: string;
  createdAt: string;
  reporter: { id: string; name: string };
  plot: { id: string; name: string } | null;
  followUpCount: number;
  followUps: Array<{
    id: string;
    action: string;
    remarks: string | null;
    createdAt: string;
    author: { id: string; name: string };
  }>;
}

export interface Farm360 {
  id: string;
  name: string;
  ownerName: string;
  location: string;
  latitude: string;
  longitude: string;
  totalArea: string;
  cultivableArea: string;
  waterSource: string;
  status: string;
  setupStage: string;
  setupProgress: number;
  handedOverAt: string | null;
  targetHandoverDate: string | null;
  surveyNumber: string | null;
  village: string | null;
  taluk: string | null;
  district: string | null;
  state: string | null;
  pincode: string | null;
  soilType: string | null;
  soilPh: string | null;
  soilEc: string | null;
  soilOrganicCarbon: string | null;
  terrainType: string | null;
  fencingType: string | null;
  borewellCount: number | null;
  borewellDepthFeet: number | null;
  waterYieldGph: number | null;
  electricitySupply: string | null;
  proposedCrops: string | null;
  contractValue: string | null;
  boundaryGeoJson: string | null;
  measuredAcres: string | null;
  geofenceRadiusMeters: number;
  updatedAt: string;
  createdAt: string;
  client: { id: string; name: string; code: string | null; phone: string | null } | null;
  plots: Farm360Plot[];
  plotsTotal: number;
  plotsTruncated: boolean;
  tasks: Farm360Task[];
  tasksTotal: number;
  tasksOpen: number;
  tasksTruncated: boolean;
  incidents: Farm360Incident[];
  incidentsTotal: number;
  incidentsOpen: number;
  incidentsTruncated: boolean;
  access: Array<{ id: string; canManage: boolean; user: { id: string; name: string; email: string; role: string } }>;
  plans: Array<{ id: string; planDate: string }>;
  auditTrail: Array<{
    id: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: string;
    actor: { id: string; name: string } | null;
  }>;
  files: Array<{
    id: string;
    storageKey: string;
    kind: string;
    mimeType: string;
    sizeBytes: number;
    executionId: string | null;
    monitoringId: string | null;
    incidentId: string | null;
    createdAt: string;
    url: string | null;
  }>;
  filesTotal: number;
  filesTruncated: boolean;
}

const SETUP_STAGES = [
  { key: "SURVEY_SOIL_TEST", label: "Survey & Soil" },
  { key: "PLOT_DEMARCATION", label: "Plot Demarcation" },
  { key: "BED_SOIL_PREP", label: "Bed & Soil Prep" },
  { key: "IRRIGATION_LAYOUT", label: "Irrigation Layout" },
  { key: "HANDED_OVER", label: "Handed Over" },
] as const;

type TabKey = "overview" | "map" | "tasks" | "incidents" | "team" | "history" | "files" | "settings";

const TABS: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "map", label: "Map & Plots" },
  { key: "tasks", label: "Tasks" },
  { key: "incidents", label: "Incidents" },
  { key: "team", label: "Team" },
  { key: "history", label: "Calendar / History" },
  { key: "files", label: "Files" },
  { key: "settings", label: "Settings" },
];

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString();
}

function fmtDateTime(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString();
}

export function HqFarm360({ farm }: { farm: Farm360 }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialTab = (searchParams.get("tab") as TabKey) || "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(
    TABS.some((t) => t.key === initialTab) ? initialTab : "overview"
  );
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [handingOver, setHandingOver] = useState(false);
  const [savingBoundary, setSavingBoundary] = useState(false);

  const farmCenter: [number, number] = useMemo(() => {
    const lat = Number(farm.latitude);
    const lng = Number(farm.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) ? [lat, lng] : [20.59, 78.96];
  }, [farm.latitude, farm.longitude]);

  const [farmRing, setFarmRing] = useState<LngLat[] | null>(() => parseBoundary(farm.boundaryGeoJson));

  const stageIndex = Math.max(0, SETUP_STAGES.findIndex((s) => s.key === farm.setupStage));
  const isHandedOver = farm.setupStage === "HANDED_OVER";
  const daysStalled = Math.max(0, Math.floor((Date.now() - new Date(farm.updatedAt).getTime()) / (1000 * 60 * 60 * 24)));

  const timeline = useMemo(() => {
    const items: Array<{ at: string; label: string; detail: string }> = [
      ...farm.auditTrail.map((a) => ({
        at: a.createdAt,
        label: `Farm ${a.action}`,
        detail: a.actor ? `by ${a.actor.name} (${a.actor.id})` : "by system",
      })),
      ...farm.tasks.map((t) => ({
        at: t.createdAt,
        label: `Task planned: ${t.title}`,
        detail: `Task ID ${t.id} • due ${fmtDate(t.dueDate)} • ${t.status}`,
      })),
      ...farm.incidents.map((i) => ({
        at: i.createdAt,
        label: `Incident: ${i.type}`,
        detail: `Incident ID ${i.id} • ${i.severity || "ungraded"} • reported by ${i.reporter.name}`,
      })),
    ];
    return items.sort((a, b) => (a.at < b.at ? 1 : -1)).slice(0, 30);
  }, [farm.auditTrail, farm.tasks, farm.incidents]);

  async function advanceStage(targetStage: string) {
    setAdvancing(true);
    try {
      const res = await fetch("/api/admin/setup-pipeline", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmId: farm.id, setupStage: targetStage }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Failed to update stage.");
        return;
      }
      toast.success("Setup stage updated.");
      router.refresh();
    } catch {
      toast.error("Network error updating stage.");
    } finally {
      setAdvancing(false);
    }
  }

  async function handover() {
    if (!confirm(`Hand over ${farm.name} to ${farm.client?.name || farm.ownerName}? This activates the farm.`)) return;
    setHandingOver(true);
    try {
      const res = await fetch(`/api/admin/farms/${farm.id}/handover`, { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data.error || "Handover failed.");
        return;
      }
      toast.success("Farm handed over and activated.");
      router.refresh();
    } catch {
      toast.error("Network error during handover.");
    } finally {
      setHandingOver(false);
    }
  }

  async function saveBoundary() {
    setSavingBoundary(true);
    try {
      const geoJsonString = farmRing && farmRing.length >= 4 ? toGeoJsonPolygon(farmRing) : null;
      const res = await fetch(`/api/farms/${farm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boundaryGeoJson: geoJsonString }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(data.error || "Failed to save boundary.");
        return;
      }
      toast.success(geoJsonString ? `Boundary saved (${data.measuredAcres || 0} acres).` : "Boundary cleared.");
      router.refresh();
    } catch {
      toast.error("Network error saving boundary.");
    } finally {
      setSavingBoundary(false);
    }
  }

  const kpis = [
    { label: "Plots", value: String(farm.plotsTotal), sub: `${farm.totalArea} ac total` },
    { label: "Open tasks", value: String(farm.tasksOpen), sub: `${farm.tasksTotal} total` },
    { label: "Open incidents", value: String(farm.incidentsOpen), sub: `${farm.incidentsTotal} total` },
    { label: "Officers", value: String(farm.access.length), sub: farm.access.filter((a) => a.canManage).length + " managers" },
    { label: "Setup progress", value: `${farm.setupProgress}%`, sub: isHandedOver ? "Handed over" : `Stalled ${daysStalled}d` },
    { label: "Files", value: String(farm.filesTotal), sub: farm.measuredAcres ? `${farm.measuredAcres} ac measured` : "Unmeasured" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: "20px 24px", display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="mono-label" style={{ fontSize: 11 }} title={farm.id}>Farm ID: {farm.id}</div>
            <h1 style={{ fontSize: 24, fontWeight: 700, color: "var(--ink)", margin: "2px 0 0" }}>{farm.name}</h1>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8, alignItems: "center" }}>
              <StatusBadge status={farm.status} />
              <span className="badge badge-stone" style={{ fontSize: 11 }}>{farm.setupStage.replaceAll("_", " ")}</span>
              {farm.client ? (
                <Link href={`/clients/${farm.client.id}`} className="badge badge-stone" style={{ fontSize: 11, textDecoration: "none" }} title={farm.client.id}>
                  Client: {farm.client.name}{farm.client.code ? ` (${farm.client.code})` : ""} • ID {farm.client.id}
                </Link>
              ) : (
                <span className="muted" style={{ fontSize: 12 }}>Owner: {farm.ownerName} (no linked client)</span>
              )}
            </div>
            <p className="muted" style={{ margin: "8px 0 0", fontSize: 12 }}>
              {[farm.village, farm.taluk, farm.district, farm.state, farm.pincode].filter(Boolean).join(", ") || farm.location}
              {farm.surveyNumber ? ` • Survey #${farm.surveyNumber}` : " • Survey # Pending"}
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {!isHandedOver && stageIndex < SETUP_STAGES.length - 1 && (
              <button type="button" className="btn btn-secondary btn-sm" disabled={advancing}
                onClick={() => advanceStage(SETUP_STAGES[stageIndex + 1].key)}>
                <span>{advancing ? "Updating…" : `Advance to ${SETUP_STAGES[stageIndex + 1].label}`}</span>
              </button>
            )}
            {!isHandedOver && (
              <button type="button" className="btn btn-green btn-sm" disabled={handingOver} onClick={handover}>
                <span>{handingOver ? "Handing over…" : "Handover to client"}</span>
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, padding: "12px 16px", background: "var(--canvas)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", fontSize: 12 }}>
          <div>
            <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>SOIL</div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
              {farm.soilType || "Not specified"} • pH {farm.soilPh || "—"} • EC {farm.soilEc ? `${farm.soilEc} dS/m` : "—"}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>OC: {farm.soilOrganicCarbon ? `${farm.soilOrganicCarbon}%` : "—"} • {farm.terrainType || "Terrain TBD"}</div>
          </div>
          <div>
            <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>HYDROLOGY & POWER</div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
              {farm.borewellCount ?? 0} borewells{farm.borewellDepthFeet ? ` (${farm.borewellDepthFeet} ft)` : ""}
            </div>
            <div className="muted" style={{ fontSize: 11 }}>
              {farm.waterYieldGph ? `${farm.waterYieldGph.toLocaleString()} GPH` : "Yield TBD"} • {farm.waterSource} • {farm.electricitySupply || "Power TBD"}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>COMMERCIAL</div>
            <div style={{ fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>{farm.fencingType || "Fence TBD"}</div>
            <div className="muted" style={{ fontSize: 11 }}>
              {farm.contractValue ? `Contract ₹${Number(farm.contractValue).toLocaleString("en-IN")}` : "Value TBD"}
              {farm.targetHandoverDate ? ` • Target ${fmtDate(farm.targetHandoverDate)}` : ""}
              {farm.handedOverAt ? ` • Handed over ${fmtDate(farm.handedOverAt)}` : ""}
            </div>
          </div>
        </div>
      </div>

      <div className="tabs-nav" style={{ margin: 0, display: "flex", gap: 4, flexWrap: "wrap" }}>
        {TABS.map((t) => (
          <button key={t.key} type="button" className={`tab-btn ${activeTab === t.key ? "active" : ""}`} onClick={() => setActiveTab(t.key)}>
            <span>
              {t.label}
              {t.key === "map" ? ` (${farm.plotsTotal})` : ""}
              {t.key === "tasks" ? ` (${farm.tasksOpen}/${farm.tasksTotal})` : ""}
              {t.key === "incidents" ? ` (${farm.incidentsOpen}/${farm.incidentsTotal})` : ""}
              {t.key === "team" ? ` (${farm.access.length})` : ""}
              {t.key === "files" ? ` (${farm.filesTotal})` : ""}
            </span>
          </button>
        ))}
      </div>

      {activeTab === "overview" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 12 }}>
            {kpis.map((k) => (
              <div key={k.label} style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", padding: "14px 16px" }}>
                <div className="eyebrow" style={{ fontSize: 9, color: "var(--muted)", margin: 0 }}>{k.label.toUpperCase()}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", marginTop: 4 }}>{k.value}</div>
                <div className="muted" style={{ fontSize: 11 }}>{k.sub}</div>
              </div>
            ))}
          </div>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: "0 0 12px" }}>Setup pipeline</h2>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {SETUP_STAGES.map((s, i) => (
                <button key={s.key} type="button" disabled={advancing || i === stageIndex}
                  onClick={() => advanceStage(s.key)} title={i === stageIndex ? "Current stage" : `Move to ${s.label}`}
                  style={{
                    padding: "8px 14px", borderRadius: "var(--radius-sm)", fontSize: 12, fontWeight: 600,
                    border: "1px solid var(--line)", cursor: i === stageIndex ? "default" : "pointer",
                    background: i < stageIndex ? "var(--semantic-success)" : i === stageIndex ? "var(--ink)" : "var(--canvas)",
                    color: i <= stageIndex ? "#fff" : "var(--ink)",
                  }}>
                  {i + 1}. {s.label}{i === stageIndex ? " (current)" : ""}
                </button>
              ))}
            </div>
            {!isHandedOver && (
              <div style={{ marginTop: 14 }}>
                <button type="button" className="btn btn-green btn-sm" disabled={handingOver} onClick={handover}>
                  <Icons.CheckCircle size={13} />
                  <span>{handingOver ? "Handing over…" : "Handover to client (activates farm)"}</span>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {activeTab === "map" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Farm boundary</h2>
                <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>Draw or edit the perimeter fence, then save. Server recomputes acreage.</p>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" className="btn btn-primary btn-sm" onClick={() => setShowPlotForm((v) => !v)}>
                  <Icons.Plus size={13} />
                  <span>{showPlotForm ? "Close plot form" : "Demarcate plot"}</span>
                </button>
                <GridSplitForm farmId={farm.id} hasBoundary={!!farm.boundaryGeoJson} />
              </div>
            </div>
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--line)" }}>
              <GeoMap center={farmCenter} polygon={farmRing} onChange={setFarmRing} height={380}
                interactive onSave={saveBoundary} saveLabel="Save farm boundary" isSaving={savingBoundary}
                onClear={() => setFarmRing(null)} />
            </div>
          </div>

          {showPlotForm && <PlotForm farmId={farm.id} farmCenter={farmCenter} farmBoundary={farm.boundaryGeoJson} />}

          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                Plots ({farm.plotsTotal}){farm.plotsTruncated ? " — showing first 200" : ""}
              </h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr><th>Plot ID</th><th>Name</th><th>Area</th><th>Boundary</th><th>Irrigation</th><th>Cycles</th><th>Status</th><th style={{ textAlign: "right" }}>Open</th></tr>
                </thead>
                <tbody>
                  {farm.plots.length === 0 ? (
                    <tr><td colSpan={8} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>No plots demarcated yet.</td></tr>
                  ) : (
                    farm.plots.map((p) => (
                      <tr key={p.id}>
                        <td className="mono-label" style={{ fontSize: 10 }} title={p.id}>{p.id}</td>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>
                          {p.area} ac{p.measuredAcres ? <span className="muted" style={{ fontSize: 11 }}> ({p.measuredAcres} measured)</span> : null}
                        </td>
                        <td>{p.hasBoundary ? <span className="badge badge-green" style={{ fontSize: 10 }}>Fenced</span> : <span className="badge badge-amber" style={{ fontSize: 10 }}>No fence</span>}</td>
                        <td className="muted" style={{ fontSize: 12 }}>{p.irrigation.join(", ") || "—"}</td>
                        <td>{p.activeCycles}</td>
                        <td><StatusBadge status={p.status} /></td>
                        <td style={{ textAlign: "right" }}>
                          <Link href={`/plots/${p.id}`} className="btn btn-secondary btn-sm"><span>Open</span><Icons.ArrowRight size={12} /></Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: 20 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: "0 0 12px" }}>Boundary history</h2>
            <BoundaryHistory entityType="FARM" entityId={farm.id} canRestore currentBoundary={farm.boundaryGeoJson} />
          </div>
        </section>
      )}

      {activeTab === "tasks" && (
        <section style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              Farm tasks ({farm.tasksOpen} open / {farm.tasksTotal} total){farm.tasksTruncated ? " — recent 50" : ""}
            </h2>
            <Link href="/tasks" className="btn btn-secondary btn-sm"><span>Open HQ tasks queue</span><Icons.ArrowRight size={12} /></Link>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead><tr><th>Task ID</th><th>Title</th><th>Officer</th><th>Status</th><th>Due</th></tr></thead>
              <tbody>
                {farm.tasks.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>No tasks on this farm.</td></tr>
                ) : (
                  farm.tasks.map((t) => (
                    <tr key={t.id}>
                      <td className="mono-label" style={{ fontSize: 10 }} title={t.id}>{t.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{t.title}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{t.category} • {t.priority}{t.plot ? ` • Plot ${t.plot.name}` : ""}</div>
                        {t.officer && <div className="mono-label" style={{ fontSize: 10 }}>User ID: {t.officer.id}</div>}
                      </td>
                      <td>{t.officer ? t.officer.name : <span className="muted">Unassigned</span>}</td>
                      <td><StatusBadge status={t.status} /></td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{fmtDate(t.dueDate)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "incidents" && (
        <section style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              Incidents ({farm.incidentsOpen} open / {farm.incidentsTotal} total){farm.incidentsTruncated ? " — recent 50" : ""}
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead><tr><th>Incident ID</th><th>Type / Severity</th><th>Reporter</th><th>Follow-ups</th><th>Status</th></tr></thead>
              <tbody>
                {farm.incidents.length === 0 ? (
                  <tr><td colSpan={5} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>No incidents reported.</td></tr>
                ) : (
                  farm.incidents.map((i) => (
                    <tr key={i.id}>
                      <td className="mono-label" style={{ fontSize: 10 }} title={i.id}>{i.id}</td>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                          <span className="badge badge-danger" style={{ fontSize: 10 }}>{i.severity || "UNGRADED"}</span>
                          <strong>{i.type}</strong>
                          <span className="muted" style={{ fontSize: 11 }}>({i.level})</span>
                        </div>
                        <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>{i.description}</div>
                        <div className="muted" style={{ fontSize: 11 }}>{fmtDateTime(i.createdAt)}{i.plot ? ` • Plot ${i.plot.name} (${i.plot.id})` : ""}</div>
                      </td>
                      <td>
                        <div>{i.reporter.name}</div>
                        <div className="mono-label" style={{ fontSize: 10 }}>User ID: {i.reporter.id}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{i.followUpCount}</div>
                        {i.followUps.slice(0, 2).map((f) => (
                          <div key={f.id} className="muted" style={{ fontSize: 11 }}>
                            {f.action} — {f.author.name}, {fmtDate(f.createdAt)}
                          </div>
                        ))}
                      </td>
                      <td><StatusBadge status={i.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "team" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
              <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>Assigned team ({farm.access.length})</h2>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", fontSize: 13 }}>
                <thead><tr><th>Access ID</th><th>User ID</th><th>Name</th><th>Role</th><th>Can manage</th></tr></thead>
                <tbody>
                  {farm.access.length === 0 ? (
                    <tr><td colSpan={5} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>Nobody assigned yet.</td></tr>
                  ) : (
                    farm.access.map((a) => (
                      <tr key={a.id}>
                        <td className="mono-label" style={{ fontSize: 10 }} title={a.id}>{a.id}</td>
                        <td className="mono-label" style={{ fontSize: 10 }} title={a.user.id}>{a.user.id}</td>
                        <td><div style={{ fontWeight: 600 }}>{a.user.name}</div><div className="muted" style={{ fontSize: 11 }}>{a.user.email}</div></td>
                        <td>{a.user.role}</td>
                        <td>{a.canManage ? <span className="badge badge-green" style={{ fontSize: 10 }}>Manager</span> : <span className="badge badge-stone" style={{ fontSize: 10 }}>Officer</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          <FarmAccessManager farmId={farm.id} />
        </section>
      )}

      {activeTab === "history" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", padding: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Farm Calendar & History</h2>
              <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
                Full operational history for {farm.name}: tasks, incidents, harvests, crop monitoring, and the Officer Lens (who worked on what).
              </p>
            </div>
            <HqCalendarPlatform
              farms={[{ id: farm.id, name: farm.name, location: farm.location, clientId: farm.client?.id ?? null, clientName: farm.client?.name ?? null }]}
              clients={farm.client ? [{ id: farm.client.id, name: farm.client.name }] : []}
              initialFarmId={farm.id}
              initialClientId={farm.client?.id ?? ""}
              initialAnchor={new Date().toISOString().slice(0, 10)}
              initialView="month"
              lockFarmId={farm.id}
              hideHeader={true}
            />
          </div>
        </section>
      )}

      {activeTab === "files" && (
        <section style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)" }}>
            <h2 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: 0 }}>
              Files ({farm.filesTotal}){farm.filesTruncated ? " — recent 20" : ""}
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead><tr><th>File ID</th><th>Kind</th><th>Size</th><th>Linked to</th><th>Uploaded</th><th style={{ textAlign: "right" }}>Download</th></tr></thead>
              <tbody>
                {farm.files.length === 0 ? (
                  <tr><td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>No files attached to this farm.</td></tr>
                ) : (
                  farm.files.map((f) => (
                    <tr key={f.id}>
                      <td className="mono-label" style={{ fontSize: 10 }} title={f.storageKey}>{f.id}</td>
                      <td><span className="badge badge-stone" style={{ fontSize: 10 }}>{f.kind}</span><div className="muted" style={{ fontSize: 11 }}>{f.mimeType}</div></td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{(f.sizeBytes / 1024).toFixed(1)} KB</td>
                      <td className="mono-label" style={{ fontSize: 10 }}>
                        {f.executionId ? `Task exec ${f.executionId}` : ""}
                        {f.monitoringId ? `Monitoring ${f.monitoringId}` : ""}
                        {f.incidentId ? `Incident ${f.incidentId}` : ""}
                        {!f.executionId && !f.monitoringId && !f.incidentId ? "—" : ""}
                      </td>
                      <td style={{ fontSize: 12 }}>{fmtDateTime(f.createdAt)}</td>
                      <td style={{ textAlign: "right" }}>
                        {f.url ? <a href={f.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm"><span>Download</span></a>
                          : <span className="muted" style={{ fontSize: 11 }}>Unavailable</span>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {activeTab === "settings" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <FarmEditForm
            farm={{
              id: farm.id,
              name: farm.name,
              ownerName: farm.ownerName,
              location: farm.location,
              address: null,
              latitude: farm.latitude,
              longitude: farm.longitude,
              totalArea: farm.totalArea,
              cultivableArea: farm.cultivableArea,
              waterSource: farm.waterSource,
              geofenceRadiusMeters: farm.geofenceRadiusMeters,
            }}
          />
          <div className="muted" style={{ fontSize: 12 }}>
            Created {fmtDateTime(farm.createdAt)} • Last updated {fmtDateTime(farm.updatedAt)} • Farm ID {farm.id}
          </div>
        </section>
      )}
    </div>
  );
}
