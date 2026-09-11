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
import { formatDate, formatDateTime } from "@/lib/business";

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
  boundaryGeoJson?: string | null;
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
  client: {
    id: string;
    name: string;
    code: string | null;
    phone: string | null;
    email?: string | null;
    companyName?: string | null;
  } | null;
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

type TabKey =
  | "overview"
  | "map"
  | "tasks"
  | "incidents"
  | "onboarding"
  | "history"
  | "calendar"
  | "team"
  | "files"
  | "settings";

export function HqFarm360({ farm }: { farm: Farm360 }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const initialTab = (searchParams.get("tab") as TabKey) || "overview";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const [showPlotForm, setShowPlotForm] = useState(false);
  const [advancing, setAdvancing] = useState(false);
  const [handingOver, setHandingOver] = useState(false);
  const [savingBoundary, setSavingBoundary] = useState(false);

  // Filters for Tasks tab
  const [taskStatusFilter, setTaskStatusFilter] = useState("ALL");
  const [taskSearch, setTaskSearch] = useState("");

  // Filters for Incidents tab
  const [incidentStatusFilter, setIncidentStatusFilter] = useState("ALL");

  // Filters for History tab
  const [historyFilter, setHistoryFilter] = useState<"ALL" | "AUDIT" | "TASKS" | "INCIDENTS">("ALL");

  const farmCenter: [number, number] = useMemo(() => {
    const lat = Number(farm.latitude);
    const lng = Number(farm.longitude);
    return Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0
      ? [lat, lng]
      : [12.9716, 77.5946];
  }, [farm.latitude, farm.longitude]);

  const [farmRing, setFarmRing] = useState<LngLat[] | null>(() => parseBoundary(farm.boundaryGeoJson));

  const stageIndex = Math.max(
    0,
    SETUP_STAGES.findIndex((s) => s.key === farm.setupStage)
  );
  const isHandedOver = farm.setupStage === "HANDED_OVER";
  const daysStalled = Math.max(
    0,
    Math.floor((Date.now() - new Date(farm.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
  );

  // Chronological unified operational timeline
  const timeline = useMemo(() => {
    const items: Array<{
      id: string;
      at: string;
      type: "AUDIT" | "TASK" | "INCIDENT";
      label: string;
      detail: string;
      badge?: string;
    }> = [
      ...farm.auditTrail.map((a) => ({
        id: a.id,
        at: a.createdAt,
        type: "AUDIT" as const,
        label: `Audit: Farm ${a.action}`,
        detail: a.actor ? `Triggered by ${a.actor.name} (${a.actor.id})` : "Automated system update",
        badge: a.action,
      })),
      ...farm.tasks.map((t) => ({
        id: t.id,
        at: t.createdAt,
        type: "TASK" as const,
        label: `Task: ${t.title}`,
        detail: `Assigned to ${t.officer?.name || "Unassigned"} • Due ${formatDate(t.dueDate)}${t.plot ? ` • Plot ${t.plot.name}` : ""}`,
        badge: t.status,
      })),
      ...farm.incidents.map((i) => ({
        id: i.id,
        at: i.createdAt,
        type: "INCIDENT" as const,
        label: `Incident: ${i.type} (${i.severity || "UNG"} severity)`,
        detail: `${i.description} • Reported by ${i.reporter.name}${i.plot ? ` on Plot ${i.plot.name}` : ""}`,
        badge: i.severity || i.status,
      })),
    ];
    return items.sort((a, b) => (a.at < b.at ? 1 : -1));
  }, [farm.auditTrail, farm.tasks, farm.incidents]);

  const filteredTimeline = useMemo(() => {
    if (historyFilter === "ALL") return timeline;
    return timeline.filter((item) => {
      if (historyFilter === "AUDIT") return item.type === "AUDIT";
      if (historyFilter === "TASKS") return item.type === "TASK";
      if (historyFilter === "INCIDENTS") return item.type === "INCIDENT";
      return true;
    });
  }, [timeline, historyFilter]);

  const plotPins = useMemo(() => {
    return farm.plots
      .filter((p) => Number(p.latitude) && Number(p.longitude))
      .map((p) => ({
        key: p.id,
        lat: Number(p.latitude),
        lng: Number(p.longitude),
        color: p.status === "ACTIVE" ? "#166534" : "#854d0e",
        label: `${p.name} · ${p.area} ac · ${p.status}`,
      }));
  }, [farm.plots]);

  const activeCyclesCount = useMemo(() => {
    return farm.plots.reduce((acc, p) => acc + (p.activeCycles || 0), 0);
  }, [farm.plots]);

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
    if (!confirm(`Hand over ${farm.name} to ${farm.client?.name || farm.ownerName}? This activates live operations.`)) return;
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
      toast.success(geoJsonString ? `Boundary saved (${data.measuredAcres || 0} acres verified).` : "Boundary cleared.");
      router.refresh();
    } catch {
      toast.error("Network error saving boundary.");
    } finally {
      setSavingBoundary(false);
    }
  }

  // Filtered tasks for Tasks tab
  const filteredTasks = useMemo(() => {
    return farm.tasks.filter((t) => {
      if (taskStatusFilter === "OPEN" && (t.status === "COMPLETED" || t.status === "CANCELLED")) return false;
      if (taskStatusFilter === "COMPLETED" && t.status !== "COMPLETED") return false;
      if (taskStatusFilter === "CRITICAL" && t.priority !== "URGENT" && t.priority !== "HIGH") return false;
      if (taskSearch) {
        const q = taskSearch.toLowerCase();
        return (
          t.title.toLowerCase().includes(q) ||
          t.category.toLowerCase().includes(q) ||
          (t.officer?.name && t.officer.name.toLowerCase().includes(q)) ||
          (t.plot?.name && t.plot.name.toLowerCase().includes(q))
        );
      }
      return true;
    });
  }, [farm.tasks, taskStatusFilter, taskSearch]);

  // Filtered incidents for Incidents tab
  const filteredIncidents = useMemo(() => {
    return farm.incidents.filter((i) => {
      if (incidentStatusFilter === "OPEN" && i.status !== "OPEN") return false;
      if (incidentStatusFilter === "RESOLVED" && i.status !== "RESOLVED" && i.status !== "CLOSED") return false;
      return true;
    });
  }, [farm.incidents, incidentStatusFilter]);

  const tabsConfig: Array<{ key: TabKey; label: string; count?: number }> = [
    { key: "overview", label: "Cockpit" },
    { key: "map", label: "Plots & Spatial", count: farm.plotsTotal },
    { key: "tasks", label: "Field Tasks", count: farm.tasksOpen },
    { key: "incidents", label: "Incidents", count: farm.incidentsOpen },
    { key: "onboarding", label: "Client & Specs" },
    { key: "history", label: "History & Logs", count: timeline.length },
    { key: "calendar", label: "Calendar" },
    { key: "team", label: "Workforce", count: farm.access.length },
    { key: "files", label: "Media & Files", count: farm.filesTotal },
    { key: "settings", label: "Settings" },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
      {/* =========================================================================
         1. EXECUTIVE COMMAND HEADER
         ========================================================================= */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg)",
          padding: "18px 22px",
          boxShadow: "var(--shadow-card)",
          display: "flex",
          flexDirection: "column",
          gap: 14,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 14 }}>
          {/* Farm Title, Badges & Entity Subline */}
          <div style={{ minWidth: 280, flex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
              <StatusBadge status={farm.status} />

              <span
                className="badge badge-stone"
                style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.02em" }}
              >
                Stage {stageIndex + 1}/5: {SETUP_STAGES[stageIndex]?.label || (farm.setupStage ? farm.setupStage.replaceAll("_", " ") : "Setup")}
              </span>

              {farm.boundaryGeoJson ? (
                <span className="badge badge-green" style={{ fontSize: 11, fontWeight: 600 }}>
                  ✓ Demarcated ({farm.measuredAcres ? `${farm.measuredAcres} ac` : `${farm.totalArea} ac`})
                </span>
              ) : (
                <span className="badge badge-amber" style={{ fontSize: 11, fontWeight: 600 }}>
                  ⚠️ Boundary Demarcation Pending
                </span>
              )}

              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(farm.id);
                  toast.success("Farm ID copied to clipboard");
                }}
                className="mono-label"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 4,
                  background: "var(--surface-strong)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-sm)",
                  padding: "2px 8px",
                  fontSize: 11,
                  cursor: "pointer",
                  color: "var(--ink)",
                }}
                title={`Copy full ID: ${farm.id}`}
              >
                <span>ID: {farm.id.slice(0, 10)}…</span>
                <Icons.Copy size={10} />
              </button>
            </div>

            <h1
              style={{
                fontSize: 24,
                fontWeight: 700,
                color: "var(--ink)",
                margin: 0,
                letterSpacing: "-0.02em",
                lineHeight: 1.25,
              }}
            >
              {farm.name}
            </h1>

            {/* Subline: Client entity, Location, GPS, Survey number */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginTop: 6, fontSize: 12 }}>
              {farm.client ? (
                <Link
                  href={`/clients/${farm.client.id}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    color: "var(--ink)",
                    textDecoration: "none",
                    fontWeight: 600,
                  }}
                  title={farm.client.companyName || farm.client.name}
                >
                  <Icons.Shield size={13} style={{ color: "var(--primary)" }} />
                  <span>{farm.client.name}</span>
                  {farm.client.code && <span className="mono-label" style={{ fontSize: 10 }}>({farm.client.code})</span>}
                </Link>
              ) : (
                <span style={{ fontWeight: 500, color: "var(--body-strong)" }}>
                  Owner: {farm.ownerName || "Private Estate"}
                </span>
              )}

              <span className="muted">&bull;</span>

              <span className="muted" style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <Icons.MapPin size={12} />
                {[farm.village, farm.district, farm.state].filter(Boolean).join(", ") || farm.location}
              </span>

              <span className="muted">&bull;</span>

              <span className="mono-label" style={{ fontSize: 11, color: "var(--muted)" }}>
                {Number(farm.latitude).toFixed(4)}° N, {Number(farm.longitude).toFixed(4)}° E
              </span>

              <span className="muted">&bull;</span>

              <span className="mono-label" style={{ fontSize: 11 }}>
                {farm.surveyNumber ? `Survey #${farm.surveyNumber}` : "Survey # Pending"}
              </span>
            </div>
          </div>

          {/* Action Bar on Header Right */}
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", flexShrink: 0 }}>
            {!isHandedOver && stageIndex < SETUP_STAGES.length - 1 && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={advancing}
                onClick={() => advanceStage(SETUP_STAGES[stageIndex + 1].key)}
                style={{ fontSize: 12, height: 34 }}
              >
                <span>{advancing ? "Advancing…" : `Advance to ${SETUP_STAGES[stageIndex + 1].label}`}</span>
                <Icons.ArrowRight size={12} />
              </button>
            )}

            {!isHandedOver ? (
              <button
                type="button"
                className="btn btn-primary btn-sm"
                disabled={handingOver}
                onClick={handover}
                style={{ fontSize: 12, height: 34 }}
              >
                <Icons.CheckCircle size={13} />
                <span>{handingOver ? "Handing over…" : "Handover to Client"}</span>
              </button>
            ) : (
              <span
                className="badge badge-green"
                style={{ fontSize: 12, padding: "6px 12px", display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <Icons.Check size={12} />
                <span>Handed Over &amp; Active</span>
              </span>
            )}

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setActiveTab("settings")}
              style={{ fontSize: 12, height: 34 }}
              title="Edit farm parameters"
            >
              <Icons.Settings size={13} />
              <span>Edit Farm</span>
            </button>
          </div>
        </div>
      </div>

      {/* =========================================================================
         2. EXECUTIVE 4-PILLAR TELEMETRY RIBBON
         ========================================================================= */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 12,
        }}
      >
        {/* Pillar 1: Land & Boundary */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="eyebrow" style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>
              LAND &amp; BOUNDARY
            </span>
            <Icons.Layers size={13} style={{ color: "var(--muted)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
            {farm.totalArea} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>ac claimed</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Cultivable: <strong style={{ color: "var(--ink)" }}>{farm.cultivableArea} ac</strong> &bull;{" "}
            {farm.measuredAcres ? `${farm.measuredAcres} ac verified` : "Unmapped"}
          </div>
        </div>

        {/* Pillar 2: Plots & Agronomy */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="eyebrow" style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>
              PLOTS &amp; CROPS
            </span>
            <Icons.Plot size={13} style={{ color: "var(--muted)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
            {farm.plotsTotal} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>parcels</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Active cycles: <strong style={{ color: "var(--ink)" }}>{activeCyclesCount}</strong> &bull;{" "}
            {farm.waterSource || "Borewell & Drip"}
          </div>
        </div>

        {/* Pillar 3: Operations & Risks */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="eyebrow" style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>
              OPERATIONS &amp; RISK
            </span>
            <Icons.Activity size={13} style={{ color: "var(--muted)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: farm.incidentsOpen > 0 ? "var(--amber)" : "var(--ink)" }}>
            {farm.incidentsOpen > 0 ? `${farm.incidentsOpen} Incident${farm.incidentsOpen > 1 ? "s" : ""}` : "All Clear"}
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Tasks: <strong style={{ color: "var(--ink)" }}>{farm.tasksOpen} open</strong> / {farm.tasksTotal} &bull;{" "}
            Setup: {farm.setupProgress}%
          </div>
        </div>

        {/* Pillar 4: Workforce & Governance */}
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            padding: "14px 16px",
            boxShadow: "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            gap: 4,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span className="eyebrow" style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>
              WORKFORCE &amp; GEOFENCE
            </span>
            <Icons.Users size={13} style={{ color: "var(--muted)" }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}>
            {farm.access.length} <span style={{ fontSize: 14, fontWeight: 500, color: "var(--muted)" }}>personnel</span>
          </div>
          <div style={{ fontSize: 11, color: "var(--muted)" }}>
            Managers: <strong style={{ color: "var(--ink)" }}>{farm.access.filter((a) => a.canManage).length}</strong> &bull;{" "}
            {farm.geofenceRadiusMeters}m geofence
          </div>
        </div>
      </div>

      {/* =========================================================================
         3. MODULE NAVIGATION TABS
         ========================================================================= */}
      <div
        style={{
          display: "flex",
          gap: 6,
          background: "var(--surface-card)",
          padding: "6px 8px",
          borderRadius: "var(--radius-md)",
          border: "1px solid var(--hairline)",
          boxShadow: "var(--shadow-card)",
          overflowX: "auto",
          alignItems: "center",
        }}
      >
        {tabsConfig.map((t) => {
          const isActive = activeTab === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActiveTab(t.key)}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 14px",
                fontSize: 13,
                fontWeight: isActive ? 600 : 500,
                color: isActive ? "var(--ink)" : "var(--muted)",
                background: isActive ? "var(--surface-strong)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-sm)",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "all 0.15s ease",
              }}
            >
              <span>{t.label}</span>
              {t.count !== undefined && (
                <span
                  style={{
                    fontSize: 11,
                    padding: "1px 6px",
                    borderRadius: 10,
                    fontWeight: 600,
                    background:
                      t.key === "incidents" && t.count > 0
                        ? "var(--amber-light)"
                        : isActive
                          ? "var(--surface-card)"
                          : "var(--surface-strong)",
                    color:
                      t.key === "incidents" && t.count > 0
                        ? "var(--amber)"
                        : isActive
                          ? "var(--ink)"
                          : "var(--muted)",
                  }}
                >
                  {t.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      {/* =========================================================================
         4. MODULE CONTENT PANELS
         ========================================================================= */}

      {/* -------------------------------------------------------------------------
         TAB: COCKPIT (OVERVIEW)
         ------------------------------------------------------------------------- */}
      {activeTab === "overview" && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 14 }}>
          {/* Left Column: Spatial Digital Twin Cockpit */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  Spatial Digital Twin
                </h3>
                <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
                  Perimeter fence and internal plot zoning
                </p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setActiveTab("map")}
                style={{ fontSize: 11, padding: "3px 10px" }}
              >
                <Icons.Maximize2 size={11} />
                <span>Spatial Studio</span>
              </button>
            </div>

            {/* Satellite Map */}
            <div
              style={{
                height: 380,
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
                border: "1px solid var(--hairline)",
                position: "relative",
              }}
            >
              <GeoMap
                center={farmCenter}
                polygon={farmRing}
                pins={plotPins}
                height={380}
                interactive={false}
              />

              {/* Overlay badges */}
              <div
                style={{
                  position: "absolute",
                  bottom: 8,
                  left: 8,
                  zIndex: 1000,
                  display: "flex",
                  gap: 6,
                  pointerEvents: "none",
                }}
              >
                {farm.boundaryGeoJson ? (
                  <span
                    className="badge badge-green"
                    style={{ fontSize: 10, padding: "3px 8px", backdropFilter: "blur(4px)", fontWeight: 600 }}
                  >
                    ✓ {farm.measuredAcres ? `${farm.measuredAcres} ac` : `${farm.totalArea} ac`}
                  </span>
                ) : (
                  <span
                    className="badge badge-amber"
                    style={{ fontSize: 10, padding: "3px 8px", backdropFilter: "blur(4px)", fontWeight: 600 }}
                  >
                    ⚠️ Unmapped
                  </span>
                )}
                <span
                  style={{
                    background: "rgba(0,0,0,0.75)",
                    color: "#fff",
                    borderRadius: 4,
                    padding: "3px 8px",
                    fontSize: 10,
                  }}
                >
                  {farm.plotsTotal} Plots Plotted
                </span>
              </div>
            </div>

            {/* Quick Plot Mini-Cards */}
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="eyebrow" style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>
                  INTERNAL PARCELS ({farm.plots.length})
                </span>
                {farm.plots.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveTab("map")}
                    className="muted"
                    style={{ fontSize: 11, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    View all &rarr;
                  </button>
                )}
              </div>
              {farm.plots.length === 0 ? (
                <div style={{ padding: "14px", textAlign: "center", fontSize: 12, color: "var(--muted)", background: "var(--canvas-soft)", borderRadius: "var(--radius-sm)" }}>
                  No internal plots demarcated yet.{" "}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("map");
                      setShowPlotForm(true);
                    }}
                    style={{ color: "var(--primary)", border: "none", background: "none", cursor: "pointer", fontWeight: 600 }}
                  >
                    Demarcate first plot
                  </button>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 8 }}>
                  {farm.plots.slice(0, 4).map((p) => (
                    <Link
                      key={p.id}
                      href={`/plots/${p.id}`}
                      style={{
                        padding: "8px 10px",
                        background: "var(--canvas-soft)",
                        border: "1px solid var(--hairline)",
                        borderRadius: "var(--radius-sm)",
                        textDecoration: "none",
                        color: "inherit",
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                      }}
                    >
                      <div style={{ fontWeight: 600, fontSize: 12, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        {p.area} ac &bull; {p.status}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Operational Engine & Baseline Telemetry */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {/* Setup Pipeline Stepper */}
            <div
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                boxShadow: "var(--shadow-card)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  Setup Pipeline Progress
                </h3>
                <span className="mono-label" style={{ fontSize: 11, fontWeight: 600 }}>
                  {farm.setupProgress}% Complete
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ height: 6, background: "var(--surface-strong)", borderRadius: 3, overflow: "hidden" }}>
                <div
                  style={{
                    height: "100%",
                    width: `${farm.setupProgress}%`,
                    background: isHandedOver ? "var(--green-ink)" : "var(--primary)",
                    borderRadius: 3,
                    transition: "width 0.3s ease",
                  }}
                />
              </div>

              {/* 5-Step visual tracker */}
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginTop: 4 }}>
                {SETUP_STAGES.map((s, i) => {
                  const isDone = i < stageIndex;
                  const isCurrent = i === stageIndex;
                  return (
                    <button
                      key={s.key}
                      type="button"
                      disabled={advancing || isCurrent}
                      onClick={() => advanceStage(s.key)}
                      style={{
                        flex: 1,
                        minWidth: 85,
                        padding: "6px 8px",
                        borderRadius: "var(--radius-sm)",
                        fontSize: 11,
                        fontWeight: isCurrent ? 700 : 500,
                        border: "1px solid var(--hairline)",
                        cursor: isCurrent ? "default" : "pointer",
                        background: isDone
                          ? "var(--surface-strong)"
                          : isCurrent
                            ? "var(--surface-card)"
                            : "var(--canvas-soft)",
                        color: isCurrent ? "var(--ink)" : "var(--muted)",
                        textAlign: "center",
                      }}
                      title={`Move to stage: ${s.label}`}
                    >
                      {isDone ? "✓ " : `${i + 1}. `}
                      {s.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Baseline Soil & Hydrology Grid (Zero 'TBD' Clutter) */}
            <div
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                boxShadow: "var(--shadow-card)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  Agronomy &amp; Infrastructure Baseline
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("onboarding")}
                  className="muted"
                  style={{ fontSize: 11, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  Full details &rarr;
                </button>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12 }}>
                <div style={{ padding: "8px 10px", background: "var(--canvas-soft)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                  <span className="muted" style={{ display: "block", fontSize: 10 }}>Soil Classification</span>
                  <strong style={{ color: "var(--ink)" }}>{farm.soilType || "Not profiled"}</strong>
                </div>

                <div style={{ padding: "8px 10px", background: "var(--canvas-soft)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                  <span className="muted" style={{ display: "block", fontSize: 10 }}>pH / Electrical Cond.</span>
                  <strong style={{ color: "var(--ink)" }}>
                    {farm.soilPh ? `${farm.soilPh} pH` : "—"} / {farm.soilEc ? `${farm.soilEc} dS/m` : "—"}
                  </strong>
                </div>

                <div style={{ padding: "8px 10px", background: "var(--canvas-soft)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                  <span className="muted" style={{ display: "block", fontSize: 10 }}>Hydrology Supply</span>
                  <strong style={{ color: "var(--ink)" }}>
                    {farm.borewellCount ? `${farm.borewellCount} borewells` : "Surface source"}
                  </strong>
                </div>

                <div style={{ padding: "8px 10px", background: "var(--canvas-soft)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                  <span className="muted" style={{ display: "block", fontSize: 10 }}>Power &amp; Grid</span>
                  <strong style={{ color: "var(--ink)" }}>{farm.electricitySupply || "Standard Grid"}</strong>
                </div>
              </div>
            </div>

            {/* Active Incident Alert Banner (if any open) */}
            {farm.incidentsOpen > 0 && (
              <div
                style={{
                  background: "var(--amber-light)",
                  border: "1px solid var(--amber-light)",
                  borderRadius: "var(--radius-md)",
                  padding: "12px 14px",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                }}
              >
                <Icons.AlertTriangle size={18} style={{ color: "var(--amber)", flexShrink: 0, marginTop: 2 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <strong style={{ fontSize: 13, color: "var(--ink)" }}>
                      {farm.incidents[0]?.type || "Field Incident Open"}
                    </strong>
                    <span className="badge badge-amber" style={{ fontSize: 9 }}>
                      {farm.incidents[0]?.severity || "ACTION REQ"}
                    </span>
                  </div>
                  <p style={{ margin: "2px 0 6px", fontSize: 12, color: "var(--ink)" }}>
                    {farm.incidents[0]?.description || "Action requested by on-site field team."}
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab("incidents")}
                    style={{ fontSize: 11, fontWeight: 600, color: "var(--ink)", background: "none", border: "none", cursor: "pointer", padding: 0 }}
                  >
                    View in Incident Triage &rarr;
                  </button>
                </div>
              </div>
            )}

            {/* Upcoming Field Tasks Queue */}
            <div
              style={{
                background: "var(--surface-card)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-md)",
                padding: 16,
                boxShadow: "var(--shadow-card)",
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <h3 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  Upcoming Field Tasks
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveTab("tasks")}
                  className="muted"
                  style={{ fontSize: 11, background: "none", border: "none", cursor: "pointer", padding: 0 }}
                >
                  View all ({farm.tasksTotal}) &rarr;
                </button>
              </div>

              {farm.tasks.length === 0 ? (
                <div style={{ padding: "16px", textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
                  No active field tasks scheduled.
                </div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {farm.tasks.slice(0, 3).map((t) => (
                    <div
                      key={t.id}
                      style={{
                        padding: "8px 10px",
                        background: "var(--canvas-soft)",
                        border: "1px solid var(--hairline)",
                        borderRadius: "var(--radius-sm)",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        fontSize: 12,
                      }}
                    >
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontWeight: 600, color: "var(--ink)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                          {t.title}
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {t.category} &bull; Assigned: {t.officer?.name || "Unassigned"}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                        <span className="mono-label" style={{ fontSize: 10 }}>
                          Due {formatDate(t.dueDate)}
                        </span>
                        <StatusBadge status={t.status} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------------------
         TAB: PLOTS & SPATIAL STUDIO
         ------------------------------------------------------------------------- */}
      {activeTab === "map" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: 18,
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  Spatial Demarcation Studio
                </h3>
                <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
                  Draw or modify the perimeter boundary. Server automatically verifies GPS coordinates and recomputes acreage.
                </p>
              </div>

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={() => setShowPlotForm((v) => !v)}
                  style={{ fontSize: 12 }}
                >
                  <Icons.Plus size={13} />
                  <span>{showPlotForm ? "Close Plot Form" : "Demarcate New Plot"}</span>
                </button>
                <GridSplitForm farmId={farm.id} hasBoundary={!!farm.boundaryGeoJson} />
              </div>
            </div>

            <div
              style={{
                borderRadius: "var(--radius-sm)",
                overflow: "hidden",
                border: "1px solid var(--hairline)",
              }}
            >
              <GeoMap
                center={farmCenter}
                polygon={farmRing}
                onChange={setFarmRing}
                pins={plotPins}
                height={420}
                interactive
                onSave={saveBoundary}
                saveLabel="Save Boundary Polygon"
                isSaving={savingBoundary}
                onClear={() => setFarmRing(null)}
              />
            </div>
          </div>

          {showPlotForm && (
            <PlotForm
              farmId={farm.id}
              farmCenter={farmCenter}
              farmBoundary={farm.boundaryGeoJson}
            />
          )}

          {/* Plots Data Table */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--hairline)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                Internal Parcels ({farm.plotsTotal})
                {farm.plotsTruncated ? " — showing first 200" : ""}
              </h3>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Plot ID</th>
                    <th>Name</th>
                    <th>Acreage</th>
                    <th>Fence Status</th>
                    <th>Irrigation</th>
                    <th>Cycles</th>
                    <th>Status</th>
                    <th style={{ textAlign: "right" }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {farm.plots.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                        No plots demarcated yet. Click &quot;Demarcate New Plot&quot; above to create parcels.
                      </td>
                    </tr>
                  ) : (
                    farm.plots.map((p) => (
                      <tr key={p.id}>
                        <td className="mono-label" style={{ fontSize: 10 }} title={p.id}>
                          {p.id.slice(0, 10)}…
                        </td>
                        <td style={{ fontWeight: 600 }}>{p.name}</td>
                        <td style={{ fontFamily: "var(--font-mono)" }}>
                          {p.area} ac
                          {p.measuredAcres ? (
                            <span className="muted" style={{ fontSize: 11 }}>
                              {" "}
                              ({p.measuredAcres} verified)
                            </span>
                          ) : null}
                        </td>
                        <td>
                          {p.hasBoundary ? (
                            <span className="badge badge-green" style={{ fontSize: 10 }}>
                              Fenced
                            </span>
                          ) : (
                            <span className="badge badge-amber" style={{ fontSize: 10 }}>
                              No fence
                            </span>
                          )}
                        </td>
                        <td className="muted" style={{ fontSize: 12 }}>
                          {p.irrigation.join(", ") || "—"}
                        </td>
                        <td>{p.activeCycles}</td>
                        <td>
                          <StatusBadge status={p.status} />
                        </td>
                        <td style={{ textAlign: "right" }}>
                          <Link href={`/plots/${p.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: "3px 10px" }}>
                            <span>Open Plot</span>
                            <Icons.ArrowRight size={11} />
                          </Link>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: 16,
              boxShadow: "var(--shadow-card)",
            }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700, margin: "0 0 10px", color: "var(--ink)" }}>
              Boundary History &amp; GIS Audits
            </h3>
            <BoundaryHistory entityType="FARM" entityId={farm.id} canRestore currentBoundary={farm.boundaryGeoJson} />
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------------
         TAB: FIELD TASKS (What is being done on this farm)
         ------------------------------------------------------------------------- */}
      {activeTab === "tasks" && (
        <section
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            boxShadow: "var(--shadow-card)",
          }}
        >
          {/* Toolbar */}
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--hairline)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                Active Operations &amp; Workload ({farm.tasksOpen} open / {farm.tasksTotal} total)
              </h3>
              <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
                Field work orders, crop scouting, irrigation schedules, and agronomist prescriptions
              </p>
            </div>

            <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
              {/* Task search */}
              <input
                className="input-field"
                value={taskSearch}
                onChange={(e) => setTaskSearch(e.target.value)}
                placeholder="Search tasks, officers, plots…"
                style={{ width: 200, fontSize: 12, height: 32, padding: "2px 8px" }}
              />

              {/* Status filter pills */}
              <div style={{ display: "flex", gap: 4 }}>
                <button
                  type="button"
                  className={`btn btn-sm ${taskStatusFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setTaskStatusFilter("ALL")}
                  style={{ fontSize: 11, padding: "3px 8px", height: 32 }}
                >
                  All
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${taskStatusFilter === "OPEN" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setTaskStatusFilter("OPEN")}
                  style={{ fontSize: 11, padding: "3px 8px", height: 32 }}
                >
                  Open ({farm.tasksOpen})
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${taskStatusFilter === "CRITICAL" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setTaskStatusFilter("CRITICAL")}
                  style={{ fontSize: 11, padding: "3px 8px", height: 32 }}
                >
                  High Priority
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${taskStatusFilter === "COMPLETED" ? "btn-primary" : "btn-secondary"}`}
                  onClick={() => setTaskStatusFilter("COMPLETED")}
                  style={{ fontSize: 11, padding: "3px 8px", height: 32 }}
                >
                  Completed
                </button>
              </div>

              <Link href="/tasks" className="btn btn-secondary btn-sm" style={{ fontSize: 12, height: 32 }}>
                <span>Global Queue</span>
                <Icons.ArrowRight size={11} />
              </Link>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Task ID</th>
                  <th>Title &amp; Scope</th>
                  <th>Category</th>
                  <th>Priority</th>
                  <th>Assigned Officer</th>
                  <th>Status</th>
                  <th>Due Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                      No tasks found matching the filter criteria.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((t) => (
                    <tr key={t.id}>
                      <td className="mono-label" style={{ fontSize: 10 }} title={t.id}>
                        {t.id.slice(0, 10)}…
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--ink)" }}>{t.title}</div>
                        {t.plot && (
                          <div className="muted" style={{ fontSize: 11 }}>
                            Linked Plot: {t.plot.name}
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="badge badge-stone" style={{ fontSize: 10 }}>
                          {t.category}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`badge ${t.priority === "URGENT" || t.priority === "HIGH" ? "badge-danger" : "badge-stone"}`}
                          style={{ fontSize: 10 }}
                        >
                          {t.priority}
                        </span>
                      </td>
                      <td>
                        {t.officer ? (
                          <div>
                            <div style={{ fontWeight: 500 }}>{t.officer.name}</div>
                            <div className="mono-label" style={{ fontSize: 9 }}>{t.officer.id.slice(0, 8)}</div>
                          </div>
                        ) : (
                          <span className="muted">Unassigned</span>
                        )}
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                        {formatDate(t.dueDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------------
         TAB: INCIDENTS & RISK TRIAGE
         ------------------------------------------------------------------------- */}
      {activeTab === "incidents" && (
        <section
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div
            style={{
              padding: "14px 18px",
              borderBottom: "1px solid var(--hairline)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                Field Incidents &amp; Agronomy Triage ({farm.incidentsOpen} open / {farm.incidentsTotal} total)
              </h3>
              <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
                Pest infestations, crop disease reports, water stress telemetry, and follow-up resolutions
              </p>
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className={`btn btn-sm ${incidentStatusFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setIncidentStatusFilter("ALL")}
                style={{ fontSize: 11, padding: "3px 8px", height: 30 }}
              >
                All
              </button>
              <button
                type="button"
                className={`btn btn-sm ${incidentStatusFilter === "OPEN" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setIncidentStatusFilter("OPEN")}
                style={{ fontSize: 11, padding: "3px 8px", height: 30 }}
              >
                Open ({farm.incidentsOpen})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${incidentStatusFilter === "RESOLVED" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setIncidentStatusFilter("RESOLVED")}
                style={{ fontSize: 11, padding: "3px 8px", height: 30 }}
              >
                Resolved
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>Incident ID</th>
                  <th>Type &amp; Severity</th>
                  <th>Field Description</th>
                  <th>Reporter</th>
                  <th>Follow-ups</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                      No incidents recorded. Field health is fully nominal.
                    </td>
                  </tr>
                ) : (
                  filteredIncidents.map((i) => (
                    <tr key={i.id}>
                      <td className="mono-label" style={{ fontSize: 10 }} title={i.id}>
                        {i.id.slice(0, 10)}…
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          <span
                            className={`badge ${i.severity === "CRITICAL" || i.severity === "HIGH" ? "badge-danger" : "badge-amber"}`}
                            style={{ fontSize: 9 }}
                          >
                            {i.severity || "UNGRADED"}
                          </span>
                          <strong style={{ color: "var(--ink)" }}>{i.type}</strong>
                        </div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          Level: {i.level}{i.plot ? ` &bull; Plot: ${i.plot.name}` : ""}
                        </div>
                      </td>
                      <td>
                        <div style={{ color: "var(--ink)" }}>{i.description}</div>
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>
                          Reported: {formatDateTime(i.createdAt)}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{i.reporter.name}</div>
                        <div className="mono-label" style={{ fontSize: 9 }}>ID: {i.reporter.id.slice(0, 8)}</div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{i.followUpCount} actions</div>
                        {i.followUps.slice(0, 2).map((f) => (
                          <div key={f.id} className="muted" style={{ fontSize: 11 }}>
                            {f.action} — {f.author.name}
                          </div>
                        ))}
                      </td>
                      <td>
                        <StatusBadge status={i.status} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------------
         TAB: CLIENT & ONBOARDING BASELINE SPECS
         ------------------------------------------------------------------------- */}
      {activeTab === "onboarding" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {/* Client Relationship Card */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: 18,
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                Client Entity &amp; Ownership Profile
              </h3>
              {farm.client && (
                <Link href={`/clients/${farm.client.id}`} className="btn btn-secondary btn-sm" style={{ fontSize: 12 }}>
                  <span>Open Client 360</span>
                  <Icons.ArrowRight size={12} />
                </Link>
              )}
            </div>

            {farm.client ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, fontSize: 13 }}>
                <div style={{ padding: "10px 12px", background: "var(--canvas-soft)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                  <span className="muted" style={{ display: "block", fontSize: 10 }}>Client Name</span>
                  <strong style={{ color: "var(--ink)" }}>{farm.client.name}</strong>
                  {farm.client.code && <div className="mono-label" style={{ fontSize: 10 }}>Code: {farm.client.code}</div>}
                </div>

                <div style={{ padding: "10px 12px", background: "var(--canvas-soft)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                  <span className="muted" style={{ display: "block", fontSize: 10 }}>Organization / Entity</span>
                  <strong style={{ color: "var(--ink)" }}>{farm.client.companyName || "Private Estate Owner"}</strong>
                </div>

                <div style={{ padding: "10px 12px", background: "var(--canvas-soft)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                  <span className="muted" style={{ display: "block", fontSize: 10 }}>Direct Phone</span>
                  <strong style={{ color: "var(--ink)" }}>{farm.client.phone || "—"}</strong>
                </div>

                <div style={{ padding: "10px 12px", background: "var(--canvas-soft)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)" }}>
                  <span className="muted" style={{ display: "block", fontSize: 10 }}>Email</span>
                  <strong style={{ color: "var(--ink)" }}>{farm.client.email || "—"}</strong>
                </div>
              </div>
            ) : (
              <div style={{ padding: "12px", background: "var(--canvas-soft)", borderRadius: "var(--radius-sm)", fontSize: 13 }}>
                Owner: <strong>{farm.ownerName}</strong> (No linked corporate client record).
              </div>
            )}
          </div>

          {/* Onboarding Specs Matrix */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: 18,
              boxShadow: "var(--shadow-card)",
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
              Onboarding Survey &amp; Agricultural Specifications
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12 }}>
              {/* Box 1: Soil Chemistry & Profile */}
              <div style={{ padding: 14, background: "var(--canvas-soft)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="eyebrow" style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>
                  SOIL CHEMISTRY &amp; TERRAIN
                </span>
                <div style={{ fontSize: 13 }}>
                  <div>Type: <strong>{farm.soilType || "Not profiled"}</strong></div>
                  <div>Acidity: <strong>{farm.soilPh ? `${farm.soilPh} pH` : "Not measured"}</strong></div>
                  <div>Conductivity: <strong>{farm.soilEc ? `${farm.soilEc} dS/m` : "Not measured"}</strong></div>
                  <div>Organic Carbon: <strong>{farm.soilOrganicCarbon ? `${farm.soilOrganicCarbon}%` : "Not measured"}</strong></div>
                  <div>Terrain Gradient: <strong>{farm.terrainType || "Standard plain"}</strong></div>
                </div>
              </div>

              {/* Box 2: Hydrology & Power */}
              <div style={{ padding: 14, background: "var(--canvas-soft)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="eyebrow" style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>
                  HYDROLOGY &amp; POWER SOURCE
                </span>
                <div style={{ fontSize: 13 }}>
                  <div>Water Source: <strong>{farm.waterSource}</strong></div>
                  <div>Borewells: <strong>{farm.borewellCount ?? 0} borewells</strong></div>
                  <div>Average Depth: <strong>{farm.borewellDepthFeet ? `${farm.borewellDepthFeet} ft` : "—"}</strong></div>
                  <div>Yield Capacity: <strong>{farm.waterYieldGph ? `${farm.waterYieldGph.toLocaleString()} GPH` : "—"}</strong></div>
                  <div>Power Supply: <strong>{farm.electricitySupply || "3-Phase / Grid"}</strong></div>
                </div>
              </div>

              {/* Box 3: Commercial Terms & Legal Jurisdiction */}
              <div style={{ padding: 14, background: "var(--canvas-soft)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-sm)", display: "flex", flexDirection: "column", gap: 6 }}>
                <span className="eyebrow" style={{ fontSize: 10, color: "var(--muted)", margin: 0 }}>
                  COMMERCIAL &amp; JURISDICTION
                </span>
                <div style={{ fontSize: 13 }}>
                  <div>Contract Value: <strong>{farm.contractValue ? `₹${Number(farm.contractValue).toLocaleString("en-IN")}` : "Not booked"}</strong></div>
                  <div>Survey Number: <strong>{farm.surveyNumber || "Pending revenue survey"}</strong></div>
                  <div>Target Handover: <strong>{formatDate(farm.targetHandoverDate)}</strong></div>
                  <div>Handed Over: <strong>{formatDate(farm.handedOverAt)}</strong></div>
                  <div>Fencing: <strong>{farm.fencingType || "Standard perimeter"}</strong></div>
                  <div>Jurisdiction: <strong>{[farm.village, farm.taluk, farm.district, farm.state, farm.pincode].filter(Boolean).join(", ") || farm.location}</strong></div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------------
         TAB: WHOLE HISTORY & LOGS (Audit Trail & Activity)
         ------------------------------------------------------------------------- */}
      {activeTab === "history" && (
        <section
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            padding: 18,
            boxShadow: "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
            <div>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                Complete Farm Audit Trail &amp; Activity Stream ({filteredTimeline.length} entries)
              </h3>
              <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
                Immutable event history: setup stage transitions, perimeter saves, task executions, and incident follow-ups
              </p>
            </div>

            {/* Filter pills */}
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className={`btn btn-sm ${historyFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setHistoryFilter("ALL")}
                style={{ fontSize: 11, padding: "3px 8px", height: 30 }}
              >
                All Activity
              </button>
              <button
                type="button"
                className={`btn btn-sm ${historyFilter === "AUDIT" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setHistoryFilter("AUDIT")}
                style={{ fontSize: 11, padding: "3px 8px", height: 30 }}
              >
                Audit Logs ({farm.auditTrail.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${historyFilter === "TASKS" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setHistoryFilter("TASKS")}
                style={{ fontSize: 11, padding: "3px 8px", height: 30 }}
              >
                Tasks ({farm.tasks.length})
              </button>
              <button
                type="button"
                className={`btn btn-sm ${historyFilter === "INCIDENTS" ? "btn-primary" : "btn-secondary"}`}
                onClick={() => setHistoryFilter("INCIDENTS")}
                style={{ fontSize: 11, padding: "3px 8px", height: 30 }}
              >
                Incidents ({farm.incidents.length})
              </button>
            </div>
          </div>

          {filteredTimeline.length === 0 ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              No history events found for this filter.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {filteredTimeline.map((item) => (
                <div
                  key={`${item.type}-${item.id}`}
                  style={{
                    padding: "10px 14px",
                    background: "var(--canvas-soft)",
                    border: "1px solid var(--hairline)",
                    borderRadius: "var(--radius-sm)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    fontSize: 13,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                    <span
                      style={{
                        width: 8,
                        height: 8,
                        borderRadius: "50%",
                        flexShrink: 0,
                        background:
                          item.type === "AUDIT"
                            ? "var(--blue)"
                            : item.type === "INCIDENT"
                              ? "var(--amber)"
                              : "var(--green-ink)",
                      }}
                    />
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 600, color: "var(--ink)" }}>{item.label}</div>
                      <div className="muted" style={{ fontSize: 11 }}>
                        {item.detail}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    {item.badge && (
                      <span className="badge badge-stone" style={{ fontSize: 10 }}>
                        {item.badge}
                      </span>
                    )}
                    <span className="mono-label" style={{ fontSize: 11, color: "var(--muted)" }}>
                      {formatDateTime(item.at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* -------------------------------------------------------------------------
         TAB: CALENDAR
         ------------------------------------------------------------------------- */}
      {activeTab === "calendar" && (
        <section
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            padding: 18,
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ marginBottom: 14 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
              Farm Operations Calendar &amp; Agronomy Scheduling
            </h3>
            <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
              Operational calendar for {farm.name}: planned tasks, harvest cycles, visits, and milestones
            </p>
          </div>

          <HqCalendarPlatform
            farms={[
              {
                id: farm.id,
                name: farm.name,
                location: farm.location,
                clientId: farm.client?.id ?? null,
                clientName: farm.client?.name ?? null,
              },
            ]}
            clients={farm.client ? [{ id: farm.client.id, name: farm.client.name }] : []}
            initialFarmId={farm.id}
            initialClientId={farm.client?.id ?? ""}
            initialAnchor={new Date().toISOString().slice(0, 10)}
            initialView="month"
            lockFarmId={farm.id}
            hideHeader={true}
          />
        </section>
      )}

      {/* -------------------------------------------------------------------------
         TAB: WORKFORCE & TEAM
         ------------------------------------------------------------------------- */}
      {activeTab === "team" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              overflow: "hidden",
              boxShadow: "var(--shadow-card)",
            }}
          >
            <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--hairline)" }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                Assigned Operational Crew ({farm.access.length})
              </h3>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table className="table" style={{ width: "100%", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th>Access ID</th>
                    <th>User ID</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Platform Role</th>
                    <th>Farm Permission</th>
                  </tr>
                </thead>
                <tbody>
                  {farm.access.length === 0 ? (
                    <tr>
                      <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                        No personnel assigned to this estate yet. Use the Access Manager below to add officers.
                      </td>
                    </tr>
                  ) : (
                    farm.access.map((a) => (
                      <tr key={a.id}>
                        <td className="mono-label" style={{ fontSize: 10 }} title={a.id}>
                          {a.id.slice(0, 8)}…
                        </td>
                        <td className="mono-label" style={{ fontSize: 10 }} title={a.user.id}>
                          {a.user.id.slice(0, 8)}…
                        </td>
                        <td>
                          <div style={{ fontWeight: 600 }}>{a.user.name}</div>
                        </td>
                        <td className="muted" style={{ fontSize: 12 }}>
                          {a.user.email}
                        </td>
                        <td>
                          <span className="badge badge-stone" style={{ fontSize: 10 }}>
                            {a.user.role}
                          </span>
                        </td>
                        <td>
                          {a.canManage ? (
                            <span className="badge badge-green" style={{ fontSize: 10 }}>
                              Manager
                            </span>
                          ) : (
                            <span className="badge badge-stone" style={{ fontSize: 10 }}>
                              Officer
                            </span>
                          )}
                        </td>
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

      {/* -------------------------------------------------------------------------
         TAB: MEDIA & FILES
         ------------------------------------------------------------------------- */}
      {activeTab === "files" && (
        <section
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ padding: "14px 18px", borderBottom: "1px solid var(--hairline)" }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
              Media Assets, Soil Reports &amp; Field Evidence ({farm.filesTotal})
              {farm.filesTruncated ? " — showing recent 20" : ""}
            </h3>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th>File ID</th>
                  <th>Classification</th>
                  <th>Size</th>
                  <th>Linked Execution / Incident</th>
                  <th>Uploaded</th>
                  <th style={{ textAlign: "right" }}>Download</th>
                </tr>
              </thead>
              <tbody>
                {farm.files.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                      No documents or field media uploaded for this estate.
                    </td>
                  </tr>
                ) : (
                  farm.files.map((f) => (
                    <tr key={f.id}>
                      <td className="mono-label" style={{ fontSize: 10 }} title={f.storageKey}>
                        {f.id.slice(0, 10)}…
                      </td>
                      <td>
                        <span className="badge badge-stone" style={{ fontSize: 10 }}>
                          {f.kind}
                        </span>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {f.mimeType}
                        </div>
                      </td>
                      <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                        {(f.sizeBytes / 1024).toFixed(1)} KB
                      </td>
                      <td className="mono-label" style={{ fontSize: 10 }}>
                        {f.executionId ? `Task exec ${f.executionId.slice(0, 8)}` : ""}
                        {f.monitoringId ? `Monitoring ${f.monitoringId.slice(0, 8)}` : ""}
                        {f.incidentId ? `Incident ${f.incidentId.slice(0, 8)}` : ""}
                        {!f.executionId && !f.monitoringId && !f.incidentId ? "—" : ""}
                      </td>
                      <td style={{ fontSize: 12 }}>{formatDateTime(f.createdAt)}</td>
                      <td style={{ textAlign: "right" }}>
                        {f.url ? (
                          <a href={f.url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ fontSize: 11, padding: "3px 10px" }}>
                            <span>Download</span>
                          </a>
                        ) : (
                          <span className="muted" style={{ fontSize: 11 }}>
                            Unavailable
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* -------------------------------------------------------------------------
         TAB: SETTINGS & SPECIFICATIONS
         ------------------------------------------------------------------------- */}
      {activeTab === "settings" && (
        <section style={{ display: "flex", flexDirection: "column", gap: 14 }}>
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
          <div
            style={{
              padding: "10px 14px",
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            Registered: {formatDateTime(farm.createdAt)} &bull; Last updated: {formatDateTime(farm.updatedAt)} &bull; System ID: {farm.id}
          </div>
        </section>
      )}
    </div>
  );
}
