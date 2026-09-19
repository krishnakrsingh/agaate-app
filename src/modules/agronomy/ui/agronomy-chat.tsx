"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { ChatThread } from "@modules/chat/ui/chat-thread";
import { ChatConversation, RefPlot, chatApi } from "@modules/chat/ui/chat-client";
import { formatDate } from "@shared/format";
import { PlotDemarcateWizard } from "@modules/plots/ui/plot-demarcate-wizard";

// Real Geospatial Demarcation Map (Leaflet with ESRI Satellite Tiles & Real GeoJSON Plot Polygons)
const FarmDemarcationMap = dynamic(
  () => import("@modules/spatial/ui/farm-demarcation-map").then((m) => m.FarmDemarcationMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 380,
          display: "grid",
          placeItems: "center",
          backgroundColor: "#1e293b",
          color: "#94a3b8",
          borderRadius: 14,
          fontSize: 13,
        }}
      >
        <div style={{ textAlign: "center" }}>
          <Icons.Loader size={22} className="animate-spin" style={{ margin: "0 auto 8px" }} />
          <div>Loading geospatial demarcation layers &amp; satellite tiles…</div>
        </div>
      </div>
    ),
  }
);

type FarmDossier = {
  farm: {
    id: string;
    name: string;
    location: string;
    village: string | null;
    district: string | null;
    state: string | null;
    totalArea: unknown;
    cultivableArea: unknown;
    waterSource: string;
    soilType: string | null;
    soilPh: unknown;
    status: string;
    setupStage: string;
    boundaryGeoJson: string | null;
    latitude?: number | string | null;
    longitude?: number | string | null;
  };
  plots: {
    id: string;
    name: string;
    area: string;
    soilType: string | null;
    latitude?: number | null;
    longitude?: number | null;
    irrigationSetup: string | null;
    irrigationType: string | null;
    irrigationDetails?: string | null;
    valvesCount: number | null;
    status: string;
    boundaryGeoJson: string | null;
    cycles: {
      id: string;
      cropName: string;
      variety: string | null;
      status: string;
      startDate: string;
      expectedFirstHarvestDate: string | null;
      actualPlants?: string | null;
      latestStage: string | null;
      latestHealth: string | null;
      latestNote: string | null;
    }[];
  }[];
  openIncidents: {
    id: string;
    plotId: string | null;
    type: string;
    severity: string | null;
    status: string;
    createdAt: string;
    plot: { name: string } | null;
  }[];
  recentPrescriptions: {
    id: string;
    targetIssue: string;
    priority: string;
    status: string;
    applicationDate: string;
    plot: { name: string } | null;
    author: { name: string } | null;
  }[];
  activeTasks: {
    id: string;
    title: string;
    category: string;
    priority: string;
    status: string;
    dueDate: string;
    assignedOfficer: { id: string; name: string } | null;
  }[];
  people: {
    userId: string;
    canManage: boolean;
    name: string;
    role: string | null;
    phone: string | null;
  }[];
  focus: { plotId: string | null; cropCycleId: string | null };
};

type FarmOption = { id: string; name: string; location?: string | null };
type RosterPerson = { userId: string; name: string; role: string | null; lead: boolean };

const DAY_MS = 86_400_000;

function daysInGround(startIso: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(startIso).getTime()) / DAY_MS));
}

function seasonProgress(startIso: string, harvestIso: string | null): number | null {
  if (!harvestIso) return null;
  const span = new Date(harvestIso).getTime() - new Date(startIso).getTime();
  if (span <= 0) return null;
  return Math.min(1, Math.max(0, (Date.now() - new Date(startIso).getTime()) / span));
}

/** Smart string formatter that never damages authentic natural text */
function humanize(raw: string | null | undefined): string {
  if (!raw) return "—";
  // If it already has lower-case letters and spaces (not pure uppercase enum), preserve real text
  if (!raw.includes("_") && /[a-z]/.test(raw)) {
    return raw;
  }
  return raw
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

export function AgronomyChat({ currentUserId }: { currentUserId: string }) {
  const toast = useToast();
  const searchParams = useSearchParams();

  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [farmId, setFarmId] = useState("");
  const [people, setPeople] = useState<RosterPerson[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plots, setPlots] = useState<RefPlot[]>([]);
  const [dossier, setDossier] = useState<FarmDossier | null>(null);
  const [dossierLoading, setDossierLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [flashPlotId, setFlashPlotId] = useState<string | null>(null);
  const [focusedPlotId, setFocusedPlotId] = useState<string | null>(null);

  // Filters inside intelligence center
  const [plotSearchQuery, setPlotSearchQuery] = useState("");
  const [plotFilter, setPlotFilter] = useState<"ALL" | "PLANTED" | "STRESSED" | "FALLOW">("ALL");
  const [intelTab, setIntelTab] = useState<"INCIDENTS" | "PRESCRIPTIONS" | "TASKS" | "ROSTER">("INCIDENTS");

  // Mobile viewport view: "intel" (farm/crop command center) or "chat" (chat dock)
  const [mobileTab, setMobileTab] = useState<"intel" | "chat">("intel");

  // New-thread modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newParticipantId, setNewParticipantId] = useState("");
  const [newPlotId, setNewPlotId] = useState("");
  const [newFirstMessage, setNewFirstMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Demarcation Wizard state
  const [isDemarcateOpen, setIsDemarcateOpen] = useState(false);

  // Initial boot: fetch farms and recent conversations
  useEffect(() => {
    const t = setTimeout(() => {
      Promise.all([
        fetch("/api/farms?limit=100").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        chatApi<ChatConversation[]>("/api/conversations?status=OPEN").catch(() => []),
      ]).then(([data, openThreads]) => {
        const list: FarmOption[] = Array.isArray(data)
          ? data.map((f: { id: string; name: string; location?: string | null }) => ({
              id: f.id,
              name: f.name,
              location: f.location,
            }))
          : [];
        setFarms(list);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem("agaate_chat_farm");
        } catch {
          // ignore
        }
        const paramFarm = searchParams.get("farmId");
        const liveliest = openThreads.find((c) => list.some((f) => f.id === c.farmId))?.farmId ?? null;
        if (paramFarm && list.some((f) => f.id === paramFarm)) setFarmId(paramFarm);
        else if (saved && list.some((f) => f.id === saved)) setFarmId(saved);
        else if (liveliest) setFarmId(liveliest);
        else if (list.length > 0) setFarmId(list[0].id);
      }).finally(() => setLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [searchParams]);

  const loadEstate = useCallback(
    async (fid: string, opts: { silent?: boolean } = {}) => {
      try {
        const [roster, convs] = await Promise.all([
          chatApi<{ people: RosterPerson[] }>(`/api/conversations/roster?farmId=${fid}`),
          chatApi<ChatConversation[]>(`/api/conversations?farmId=${fid}`),
        ]);
        setPeople(roster.people);
        setConversations(convs);
        const wanted = searchParams.get("conversation");
        if (wanted && convs.some((c) => c.id === wanted)) setSelectedId(wanted);
        else setSelectedId((prev) => (convs.some((c) => c.id === prev) ? prev : (convs[0]?.id ?? null)));

        const plotsRes = await fetch(`/api/plots?farmId=${fid}&limit=50`).then((r) => (r.ok ? r.json() : [])).catch(() => []);
        setPlots(
          Array.isArray(plotsRes)
            ? plotsRes.map((p: { id: string; name: string; cycles?: { id: string; cropName: string }[] }) => ({
                id: p.id,
                name: p.name,
                cycles: p.cycles ?? [],
              }))
            : []
        );
      } catch (err) {
        if (!opts.silent) toast.show(err instanceof Error ? err.message : "Could not load estate chat.", "error");
      }
    },
    [searchParams, toast]
  );

  const silentRefresh = useCallback((fid: string) => loadEstate(fid, { silent: true }), [loadEstate]);

  useEffect(() => {
    if (!farmId) return;
    try {
      localStorage.setItem("agaate_chat_farm", farmId);
    } catch {
      // ignore
    }
    const t = setTimeout(() => loadEstate(farmId), 0);
    return () => clearTimeout(t);
  }, [farmId, loadEstate]);

  // Dossier follows active estate or selected conversation context
  useEffect(() => {
    const t = setTimeout(() => {
      const url = selectedId
        ? `/api/conversations/${selectedId}/context`
        : farmId
        ? `/api/farms/${farmId}/dossier`
        : null;
      if (!url) {
        setDossier(null);
        return;
      }
      setDossierLoading(true);
      fetch(url)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load farm dossier."))))
        .then((d) => setDossier(d))
        .catch((e) => {
          setDossier(null);
          toast.show(e.message, "error");
        })
        .finally(() => setDossierLoading(false));
    }, 0);
    return () => clearTimeout(t);
  }, [selectedId, farmId, toast]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const refPlots: RefPlot[] = useMemo(
    () =>
      (dossier?.plots ?? []).map((p) => ({
        id: p.id,
        name: p.name,
        cycles: p.cycles.map((c) => ({ id: c.id, cropName: c.cropName })),
      })),
    [dossier]
  );

  const officers = useMemo(() => people.filter((p) => p.role === "FARM_OFFICER"), [people]);

  const activeFarm = farms.find((f) => f.id === farmId);

  // Derived metrics from dossier
  const activeCrops = useMemo(
    () => (dossier?.plots ?? []).flatMap((p) => p.cycles.map((c) => ({ ...c, plotId: p.id, plotName: p.name }))),
    [dossier]
  );
  const stressedCrops = useMemo(() => activeCrops.filter((c) => c.latestHealth === "POOR"), [activeCrops]);
  const mappedPlots = useMemo(() => (dossier?.plots ?? []).filter((p) => p.boundaryGeoJson).length, [dossier]);

  // Filtered plots inside center workbench
  const filteredPlots = useMemo(() => {
    if (!dossier?.plots) return [];
    let list = dossier.plots;
    if (plotFilter === "PLANTED") {
      list = list.filter((p) => p.cycles.length > 0);
    } else if (plotFilter === "STRESSED") {
      list = list.filter((p) => p.cycles.some((c) => c.latestHealth === "POOR"));
    } else if (plotFilter === "FALLOW") {
      list = list.filter((p) => p.cycles.length === 0);
    }
    if (plotSearchQuery.trim()) {
      const q = plotSearchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.cycles.some((c) => c.cropName.toLowerCase().includes(q) || (c.variety && c.variety.toLowerCase().includes(q)))
      );
    }
    return list;
  }, [dossier?.plots, plotFilter, plotSearchQuery]);

  const scrollToPlot = useCallback((plotId: string) => {
    setFocusedPlotId(plotId);
    setMobileTab("intel");
    setTimeout(() => {
      document.getElementById(`agro-plot-card-${plotId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashPlotId(plotId);
      setTimeout(() => setFlashPlotId((f) => (f === plotId ? null : f)), 1800);
    }, 60);
  }, []);

  const tagPlotInChat = useCallback(
    (plotId: string) => {
      setFocusedPlotId(plotId);
      setMobileTab("chat");
      toast.show(`Tagged ${plots.find((p) => p.id === plotId)?.name ?? "plot"} for consultation.`, "info");
    },
    [plots, toast]
  );

  const jumpToRef = useCallback(
    (ref: { entityType: string; entityId: string }) => {
      if (!dossier) return;
      const plotId =
        ref.entityType === "PLOT"
          ? ref.entityId
          : ref.entityType === "CROP_CYCLE"
          ? dossier.plots.find((p) => p.cycles.some((c) => c.id === ref.entityId))?.id ?? null
          : null;
      if (plotId) scrollToPlot(plotId);
    },
    [dossier, scrollToPlot]
  );

  const openNewThread = (recipientId?: string, plotId?: string) => {
    if (!farmId) {
      toast.show("Select a farm estate first.", "error");
      return;
    }
    setNewParticipantId(recipientId ?? "");
    setNewSubject("");
    setNewPlotId(plotId ?? focusedPlotId ?? "");
    setNewFirstMessage("");
    setIsModalOpen(true);
  };

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;
    if (!newSubject.trim()) {
      toast.show("Please enter a subject topic.", "error");
      return;
    }
    if (!newParticipantId) {
      toast.show("Please select a field officer to consult.", "error");
      return;
    }
    setIsCreating(true);
    try {
      const created = await chatApi<{ id: string }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({
          farmId,
          subject: newSubject.trim(),
          participantIds: [newParticipantId],
          plotId: newPlotId || undefined,
        }),
      });
      if (newFirstMessage.trim()) {
        await chatApi(`/api/conversations/${created.id}/messages`, {
          method: "POST",
          body: JSON.stringify({
            clientMessageId: crypto.randomUUID(),
            body: newFirstMessage.trim(),
            refs: [],
            attachmentMediaIds: [],
          }),
        }).catch(() => {
          toast.show("Thread started, but the initial message failed to send — please resend.", "error");
        });
      }
      toast.show("Consultation thread started.", "success");
      setIsModalOpen(false);
      setNewSubject("");
      setNewFirstMessage("");
      setNewPlotId("");
      setNewParticipantId("");
      await loadEstate(farmId);
      setSelectedId(created.id);
      setMobileTab("chat");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not create thread.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const toggleStatus = async () => {
    if (!selected) return;
    try {
      const updated = await chatApi<{ status: string }>(`/api/conversations/${selected.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: selected.status === "OPEN" ? "CLOSED" : "OPEN" }),
      });
      setConversations((prev) => prev.map((c) => (c.id === selected.id ? { ...c, status: updated.status } : c)));
      toast.show(`Conversation marked ${updated.status.toLowerCase()}.`, "info");
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not update conversation.", "error");
    }
  };

  const selectedPlotName = selected?.plotId ? plots.find((p) => p.id === selected.plotId)?.name ?? null : null;
  const selectedCropName =
    selected?.plotId && selected?.cropCycleId
      ? plots.find((p) => p.id === selected.plotId)?.cycles.find((cy) => cy.id === selected.cropCycleId)?.cropName ?? null
      : null;

  const f = dossier?.farm;
  const place = f ? [f.village, f.district, f.state].filter(Boolean).join(", ") || f.location : "";

  // Authentic estate soil profile from farm record or plot records
  const primarySoil = useMemo(() => {
    if (f?.soilType) return `${f.soilType}${f.soilPh ? ` · pH ${String(f.soilPh)}` : ""}`;
    const firstPlotSoil = dossier?.plots.find((p) => p.soilType)?.soilType;
    if (firstPlotSoil) return firstPlotSoil;
    return "Soil testing pending";
  }, [f?.soilType, f?.soilPh, dossier?.plots]);

  const primaryIrrigation = useMemo(() => {
    if (f?.waterSource) return f.waterSource;
    const firstIrrigation = dossier?.plots.find((p) => p.irrigationType)?.irrigationType;
    if (firstIrrigation) return firstIrrigation;
    return "Standard flow";
  }, [f?.waterSource, dossier?.plots]);

  return (
    <div
      className="agro-workspace-root"
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 420px",
        height: "calc(100vh - 105px)",
        minHeight: "640px",
        background: "var(--surface-card)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Mobile Top Navigation Tabs */}
      <div className="agro-mobile-bar">
        <button
          type="button"
          onClick={() => setMobileTab("intel")}
          className={`btn btn-sm ${mobileTab === "intel" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Icons.Farm size={14} />
          <span>Farm &amp; Crops Intelligence</span>
        </button>
        <button
          type="button"
          onClick={() => setMobileTab("chat")}
          className={`btn btn-sm ${mobileTab === "chat" ? "btn-primary" : "btn-secondary"}`}
          style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}
        >
          <Icons.MessageSquare size={14} />
          <span>Field Messages {conversations.some((c) => (c.unreadCount ?? 0) > 0) ? "●" : ""}</span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* CENTER / WIDE PANE: Farm, Demarcation, Plot, and Crop Cycle Intelligence */}
      {/* ========================================================================= */}
      <section
        className={`agro-intel-pane${mobileTab === "intel" ? " mobile-active" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          overflowY: "auto",
          background: "var(--surface-canvas)",
          borderRight: "1px solid var(--hairline)",
        }}
      >
        {/* Estate Header & Switcher Banner */}
        <header
          style={{
            padding: "16px 20px",
            borderBottom: "1px solid var(--hairline)",
            background: "var(--surface-card)",
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "var(--radius-md)",
                  background: "var(--primary-subtle)",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                <Icons.Farm size={20} />
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h1 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--ink)", letterSpacing: "-0.2px" }}>
                    {f?.name ?? activeFarm?.name ?? "Agronomy Field Operations"}
                  </h1>
                  {f?.status && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 12,
                        background: f.status === "ACTIVE" ? "var(--green-tint)" : "var(--surface-strong)",
                        color: f.status === "ACTIVE" ? "var(--green-ink)" : "var(--muted)",
                        textTransform: "uppercase",
                      }}
                    >
                      {f.status}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 6 }}>
                  <Icons.MapPin size={12} />
                  <span>{place || activeFarm?.location || "India"}</span>
                  {f?.setupStage && (
                    <>
                      <span>•</span>
                      <span style={{ fontWeight: 500 }}>Stage: {humanize(f.setupStage)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Switch Estate Dropdown & Demarcate New Plot Action */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <label htmlFor="agro-estate-selector" style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", whiteSpace: "nowrap" }}>
                Active Estate:
              </label>
              <select
                id="agro-estate-selector"
                className="input"
                value={farmId}
                onChange={(e) => {
                  setFarmId(e.target.value);
                  setSelectedId(null);
                  setFocusedPlotId(null);
                }}
                style={{
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: "var(--radius-md)",
                  minWidth: 220,
                  background: "var(--surface-card)",
                }}
              >
                {farms.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.location ? `(${item.location})` : ""}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => setIsDemarcateOpen(true)}
                className="btn btn-primary btn-sm"
                style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "6px 12px", fontSize: 12 }}
              >
                <Icons.Plus size={14} />
                <span>Demarcate Plot</span>
              </button>
            </div>
          </div>

          {/* Quick Estate Metrics Ribbon */}
          {f && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                gap: 8,
                paddingTop: 8,
                borderTop: "1px solid var(--hairline)",
              }}
            >
              <div style={{ padding: "8px 10px", borderRadius: "var(--radius-md)", background: "var(--surface-canvas)", border: "1px solid var(--hairline)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Acreage &amp; Land</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
                  {String(f.cultivableArea ?? "—")} / {String(f.totalArea ?? "—")} ac
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={primarySoil}>
                  {primarySoil}
                </div>
              </div>

              <div style={{ padding: "8px 10px", borderRadius: "var(--radius-md)", background: "var(--surface-canvas)", border: "1px solid var(--hairline)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Irrigation &amp; Water</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={primaryIrrigation}>
                  {primaryIrrigation}
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                  {dossier?.plots.some((p) => p.irrigationType) ? "Automated drip networks" : "Standard flow"}
                </div>
              </div>

              <div style={{ padding: "8px 10px", borderRadius: "var(--radius-md)", background: "var(--surface-canvas)", border: "1px solid var(--hairline)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Plots Demarcated</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
                  {mappedPlots} / {dossier?.plots.length ?? 0} Mapped
                </div>
                <div style={{ fontSize: 11, color: mappedPlots === dossier?.plots.length ? "var(--green-ink)" : "var(--muted)", marginTop: 1 }}>
                  {dossier?.plots.length ? `${Math.round((mappedPlots / dossier.plots.length) * 100)}% Boundary GIS` : "No plots"}
                </div>
              </div>

              <div style={{ padding: "8px 10px", borderRadius: "var(--radius-md)", background: "var(--surface-canvas)", border: "1px solid var(--hairline)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Crop Health</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: stressedCrops.length > 0 ? "var(--red)" : "var(--green-ink)", marginTop: 2 }}>
                  {activeCrops.length} Active {activeCrops.length === 1 ? "Crop" : "Crops"}
                </div>
                <div style={{ fontSize: 11, color: stressedCrops.length > 0 ? "var(--red)" : "var(--muted)", marginTop: 1, fontWeight: stressedCrops.length > 0 ? 600 : 400 }}>
                  {stressedCrops.length > 0 ? `⚠️ ${stressedCrops.length} under stress` : "✓ All optimal"}
                </div>
              </div>

              <div style={{ padding: "8px 10px", borderRadius: "var(--radius-md)", background: "var(--surface-canvas)", border: "1px solid var(--hairline)" }}>
                <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase" }}>Clinical Triage</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: (dossier?.openIncidents.length ?? 0) > 0 ? "var(--amber)" : "var(--ink)", marginTop: 2 }}>
                  {dossier?.openIncidents.length ?? 0} Issues
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                  {dossier?.recentPrescriptions.length ?? 0} Rx directives
                </div>
              </div>
            </div>
          )}
        </header>

        {/* Scrollable Center Content */}
        <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 20 }}>
          {dossierLoading ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              <Icons.Loader size={24} className="animate-spin" style={{ margin: "0 auto 12px" }} />
              <div>Loading estate intelligence &amp; crop telemetry…</div>
            </div>
          ) : !dossier ? (
            <div style={{ padding: 48, textAlign: "center", color: "var(--muted)", fontSize: 14 }}>
              Select an estate to view its full agronomic intelligence.
            </div>
          ) : (
            <>
              {/* REAL Geospatial Demarcation Map Card with ESRI Satellite Tiles */}
              <div
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-lg)",
                  padding: "16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icons.Plot size={18} style={{ color: "var(--primary)" }} />
                    <div>
                      <h2 style={{ fontSize: 14, fontWeight: 700, margin: 0, color: "var(--ink)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Geospatial Demarcation Cadastre
                      </h2>
                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                        ESRI World Imagery · {mappedPlots} of {dossier.plots.length} plots delineated with GPS polygon boundaries
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setIsDemarcateOpen(true)}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 12, display: "inline-flex", alignItems: "center", gap: 5 }}
                    >
                      <Icons.Plus size={13} />
                      <span>Demarcate New Plot</span>
                    </button>
                    <Link
                      href="/plots"
                      target="_blank"
                      style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", display: "inline-flex", alignItems: "center", gap: 4 }}
                    >
                      <span>Full GIS Console</span>
                      <Icons.ChevronRight size={13} />
                    </Link>
                  </div>
                </div>

                {/* Satellite Leaflet Map Container */}
                <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--hairline)" }}>
                  <FarmDemarcationMap
                    farm={{
                      id: f?.id ?? farmId,
                      name: f?.name ?? activeFarm?.name ?? "Farm Estate",
                      latitude: f?.latitude || 12.5284,
                      longitude: f?.longitude || 77.8341,
                      totalArea: f?.totalArea ? Number(f.totalArea) : 16,
                      boundaryGeoJson: f?.boundaryGeoJson ?? null,
                    }}
                    plots={dossier.plots.map((p) => ({
                      id: p.id,
                      name: p.name,
                      area: p.area,
                      boundaryGeoJson: p.boundaryGeoJson,
                      status: p.status,
                      cropName: p.cycles[0]?.cropName,
                      variety: p.cycles[0]?.variety,
                      soilType: p.soilType,
                      irrigationType: p.irrigationType,
                    }))}
                    selectedPlotId={focusedPlotId}
                    onSelectPlot={(plotId) => scrollToPlot(plotId)}
                    height={380}
                  />
                </div>
              </div>

              {/* Plots & Crop Cycles Deep Explorer */}
              <div
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-lg)",
                  padding: "18px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 10, marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icons.Sprout size={18} style={{ color: "var(--primary)" }} />
                    <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                      Plots &amp; Crop Cycles ({dossier.plots.length} Plots)
                    </h2>
                  </div>

                  {/* Filter tabs & Search */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", background: "var(--surface-canvas)", borderRadius: "var(--radius-md)", padding: 2, border: "1px solid var(--hairline)" }}>
                      {(["ALL", "PLANTED", "STRESSED", "FALLOW"] as const).map((filterKey) => (
                        <button
                          key={filterKey}
                          type="button"
                          onClick={() => setPlotFilter(filterKey)}
                          style={{
                            padding: "4px 10px",
                            fontSize: 11,
                            fontWeight: 600,
                            borderRadius: "var(--radius-sm)",
                            border: "none",
                            background: plotFilter === filterKey ? "var(--surface-card)" : "transparent",
                            color: plotFilter === filterKey ? "var(--ink)" : "var(--muted)",
                            cursor: "pointer",
                            boxShadow: plotFilter === filterKey ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                          }}
                        >
                          {filterKey === "ALL"
                            ? `All (${dossier.plots.length})`
                            : filterKey === "PLANTED"
                            ? `Planted (${dossier.plots.filter((p) => p.cycles.length > 0).length})`
                            : filterKey === "STRESSED"
                            ? `Stressed (${dossier.plots.filter((p) => p.cycles.some((c) => c.latestHealth === "POOR")).length})`
                            : `Fallow (${dossier.plots.filter((p) => p.cycles.length === 0).length})`}
                        </button>
                      ))}
                    </div>

                    <div style={{ position: "relative" }}>
                      <Icons.Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
                      <input
                        type="text"
                        placeholder="Filter plot or crop..."
                        value={plotSearchQuery}
                        onChange={(e) => setPlotSearchQuery(e.target.value)}
                        style={{
                          padding: "5px 10px 5px 28px",
                          fontSize: 12,
                          borderRadius: "var(--radius-md)",
                          border: "1px solid var(--hairline)",
                          background: "var(--surface-canvas)",
                          color: "var(--ink)",
                          width: 170,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Plot Cards Grid / List */}
                <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                  {filteredPlots.length === 0 ? (
                    <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                      No plots match the selected filter.
                    </div>
                  ) : (
                    filteredPlots.map((p) => {
                      const isFocused = focusedPlotId === p.id || dossier.focus.plotId === p.id;
                      const isFlashed = flashPlotId === p.id;
                      const hasStress = p.cycles.some((c) => c.latestHealth === "POOR");

                      return (
                        <article
                          key={p.id}
                          id={`agro-plot-card-${p.id}`}
                          style={{
                            borderRadius: "var(--radius-lg)",
                            background: isFlashed ? "var(--green-tint)" : isFocused ? "var(--surface-strong)" : "var(--surface-canvas)",
                            border: `1px solid ${isFlashed || isFocused ? "var(--primary)" : "var(--hairline)"}`,
                            borderLeft: hasStress ? "4px solid var(--red)" : `1px solid ${isFocused ? "var(--primary)" : "var(--hairline)"}`,
                            padding: "16px",
                            transition: "all 0.2s ease",
                            scrollMarginTop: 16,
                          }}
                        >
                          {/* Plot Header */}
                          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <Link
                                  href={`/plots/${p.id}`}
                                  target="_blank"
                                  style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", display: "flex", alignItems: "center", gap: 4 }}
                                >
                                  <span>{p.name}</span>
                                  <Icons.ChevronRight size={14} style={{ color: "var(--muted)" }} />
                                </Link>
                                <span
                                  style={{
                                    fontSize: 10,
                                    fontWeight: 700,
                                    padding: "2px 6px",
                                    borderRadius: 4,
                                    background: p.boundaryGeoJson ? "var(--green-tint)" : "var(--surface-card)",
                                    color: p.boundaryGeoJson ? "var(--green-ink)" : "var(--muted)",
                                    border: "1px solid var(--hairline)",
                                  }}
                                >
                                  {p.boundaryGeoJson ? "GPS Demarcated" : "Unmapped"}
                                </span>
                                {isFocused && (
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "var(--primary-subtle)", color: "var(--primary)" }}>
                                    CHAT TARGET
                                  </span>
                                )}
                              </div>

                              <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                                <span style={{ fontWeight: 600, color: "var(--ink)" }}>{p.area} acres</span>
                                {p.irrigationType && (
                                  <>
                                    <span>•</span>
                                    <span style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                                      <Icons.Droplet size={12} />
                                      <span>{p.irrigationType}</span>
                                      {p.valvesCount != null ? ` (${p.valvesCount} valves)` : ""}
                                    </span>
                                  </>
                                )}
                                {p.soilType && (
                                  <>
                                    <span>•</span>
                                    <span style={{ color: "var(--ink)" }}>{p.soilType}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Plot Action Buttons */}
                            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => tagPlotInChat(p.id)}
                                style={{ fontSize: 11, padding: "4px 10px", display: "flex", alignItems: "center", gap: 4 }}
                                title="Set this plot as focus in consultation chat"
                              >
                                <Icons.MessageSquare size={12} />
                                <span>Discuss in Chat</span>
                              </button>
                              <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={() => openNewThread(undefined, p.id)}
                                style={{ fontSize: 11, padding: "4px 8px" }}
                                title="Start a fresh thread targeting this plot"
                              >
                                <Icons.Plus size={12} />
                                <span>New Thread</span>
                              </button>
                            </div>
                          </div>

                          {/* Crop Cycles inside Plot */}
                          {p.cycles.length === 0 ? (
                            <div style={{ marginTop: 12, padding: "10px 14px", borderRadius: "var(--radius-md)", background: "var(--surface-card)", border: "1px dashed var(--hairline)", fontSize: 12, color: "var(--muted)" }}>
                              🌾 Fallow land — No active crop cycle registered. Click &quot;Discuss in Chat&quot; to plan sowing with officers.
                            </div>
                          ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 12 }}>
                              {p.cycles.map((c) => {
                                const days = daysInGround(c.startDate);
                                const progress = seasonProgress(c.startDate, c.expectedFirstHarvestDate);
                                const isStressed = c.latestHealth === "POOR";

                                return (
                                  <div
                                    key={c.id}
                                    style={{
                                      padding: "12px 14px",
                                      borderRadius: "var(--radius-md)",
                                      background: "var(--surface-card)",
                                      border: "1px solid var(--hairline)",
                                      borderLeft: isStressed ? "3px solid var(--red)" : "3px solid var(--green-ink)",
                                    }}
                                  >
                                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 6 }}>
                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 14 }}>🌱</span>
                                        <Link
                                          href={`/plots/${p.id}/crop-cycles/${c.id}`}
                                          target="_blank"
                                          style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}
                                        >
                                          {c.cropName}
                                        </Link>
                                        <span
                                          style={{
                                            fontSize: 10,
                                            fontWeight: 600,
                                            padding: "2px 8px",
                                            borderRadius: 10,
                                            background: "var(--surface-canvas)",
                                            border: "1px solid var(--hairline)",
                                            color: "var(--ink)",
                                          }}
                                        >
                                          {c.latestStage ?? "Growth Stage Monitored"}
                                        </span>
                                      </div>

                                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink)" }}>Day {days} in ground</span>
                                        {isStressed ? (
                                          <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 4, background: "var(--red-light)", color: "var(--red)" }}>
                                            ⚠️ ATTENTION NEEDED
                                          </span>
                                        ) : (
                                          <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 4, background: "var(--green-tint)", color: "var(--green-ink)" }}>
                                            {c.latestHealth === "GOOD" ? "✓ OPTIMAL HEALTH" : "MONITORED"}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Varieties & Population details */}
                                    {c.variety && (
                                      <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                                        Varieties: <strong style={{ color: "var(--ink)" }}>{c.variety}</strong>
                                        {c.actualPlants && <span> • <strong>{Number(c.actualPlants).toLocaleString()}</strong> plants in ground</span>}
                                      </div>
                                    )}

                                    {/* Timeline & Growth Progress Bar */}
                                    <div style={{ marginTop: 8 }}>
                                      <div style={{ height: 6, borderRadius: 3, background: "var(--surface-canvas)", overflow: "hidden", border: "1px solid var(--hairline)" }}>
                                        <div
                                          style={{
                                            height: "100%",
                                            borderRadius: 3,
                                            width: `${Math.round((progress ?? 0.15) * 100)}%`,
                                            background: isStressed ? "var(--red)" : "var(--primary)",
                                            transition: "width 0.3s ease",
                                          }}
                                        />
                                      </div>
                                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--muted)", marginTop: 4 }}>
                                        <span>Sown: <strong>{formatDate(c.startDate)}</strong></span>
                                        <span>Estimated Harvest: <strong>{c.expectedFirstHarvestDate ? formatDate(c.expectedFirstHarvestDate) : "TBD"}</strong></span>
                                      </div>
                                    </div>

                                    {/* Agronomist Scouting Remark */}
                                    {c.latestNote && (
                                      <div
                                        style={{
                                          fontSize: 12,
                                          color: "var(--ink)",
                                          marginTop: 8,
                                          padding: "8px 12px",
                                          borderRadius: "var(--radius-sm)",
                                          background: "var(--surface-canvas)",
                                          borderLeft: isStressed ? "3px solid var(--red)" : "3px solid var(--green-ink)",
                                        }}
                                      >
                                        <div style={{ fontSize: 10, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", marginBottom: 2 }}>
                                          Latest Field Observation:
                                        </div>
                                        <div>&ldquo;{c.latestNote}&rdquo;</div>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </article>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Tabbed Agronomic Operations Hub: Incidents, Prescriptions, Tasks, Roster */}
              <div
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-lg)",
                  padding: "16px",
                }}
              >
                {/* Tabs */}
                <div style={{ display: "flex", alignItems: "center", borderBottom: "1px solid var(--hairline)", gap: 8, paddingBottom: 10, flexWrap: "wrap" }}>
                  {[
                    { key: "INCIDENTS" as const, label: `Clinical Issues (${dossier.openIncidents.length})`, icon: Icons.AlertTriangle },
                    { key: "PRESCRIPTIONS" as const, label: `Prescriptions (${dossier.recentPrescriptions.length})`, icon: Icons.Stethoscope },
                    { key: "TASKS" as const, label: `Field Tasks (${dossier.activeTasks.length})`, icon: Icons.ClipboardList },
                    { key: "ROSTER" as const, label: `Field Crew (${dossier.people.length})`, icon: Icons.Users },
                  ].map((tab) => {
                    const IconComponent = tab.icon;
                    const isActive = intelTab === tab.key;
                    return (
                      <button
                        key={tab.key}
                        type="button"
                        onClick={() => setIntelTab(tab.key)}
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "6px 12px",
                          borderRadius: "var(--radius-md)",
                          fontSize: 12,
                          fontWeight: isActive ? 700 : 500,
                          background: isActive ? "var(--surface-canvas)" : "transparent",
                          border: isActive ? "1px solid var(--hairline)" : "1px solid transparent",
                          color: isActive ? "var(--ink)" : "var(--muted)",
                          cursor: "pointer",
                        }}
                      >
                        <IconComponent size={14} style={{ color: isActive ? "var(--primary)" : "var(--muted)" }} />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Tab 1: Incidents */}
                {intelTab === "INCIDENTS" && (
                  <div style={{ marginTop: 12 }}>
                    {dossier.openIncidents.length === 0 ? (
                      <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                        ✓ No active clinical incidents or stress alerts logged on this estate.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {dossier.openIncidents.map((inc) => (
                          <div
                            key={inc.id}
                            style={{
                              padding: "10px 12px",
                              borderRadius: "var(--radius-md)",
                              background: "var(--surface-canvas)",
                              border: "1px solid var(--hairline)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <span style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                                  ⚠️ {humanize(inc.type)}
                                </span>
                                {inc.severity && (
                                  <span
                                    style={{
                                      fontSize: 10,
                                      fontWeight: 700,
                                      padding: "1px 6px",
                                      borderRadius: 4,
                                      background: inc.severity === "CRITICAL" ? "var(--red-light)" : "var(--amber-light)",
                                      color: inc.severity === "CRITICAL" ? "var(--red)" : "var(--amber)",
                                    }}
                                  >
                                    {humanize(inc.severity)}
                                  </span>
                                )}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                Plot: <strong>{inc.plot?.name ?? "Whole farm"}</strong> • Logged {formatDate(inc.createdAt)}
                              </div>
                            </div>

                            <Link
                              href={`/agronomy/diagnostics`}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: 11, padding: "4px 8px" }}
                            >
                              Diagnose ↗
                            </Link>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 2: Prescriptions */}
                {intelTab === "PRESCRIPTIONS" && (
                  <div style={{ marginTop: 12 }}>
                    {dossier.recentPrescriptions.length === 0 ? (
                      <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                        No prescriptions recorded recently for this estate.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {dossier.recentPrescriptions.map((rx) => (
                          <div
                            key={rx.id}
                            style={{
                              padding: "10px 12px",
                              borderRadius: "var(--radius-md)",
                              background: "var(--surface-canvas)",
                              border: "1px solid var(--hairline)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                                💊 {rx.targetIssue}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                Plot: <strong>{rx.plot?.name ?? "General"}</strong> • Priority: {humanize(rx.priority)} • Date: {formatDate(rx.applicationDate)}
                              </div>
                            </div>
                            <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 10, background: "var(--surface-card)", border: "1px solid var(--hairline)", color: "var(--ink)" }}>
                              {rx.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 3: Tasks */}
                {intelTab === "TASKS" && (
                  <div style={{ marginTop: 12 }}>
                    {dossier.activeTasks.length === 0 ? (
                      <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
                        No pending field tasks scheduled for this estate.
                      </div>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {dossier.activeTasks.map((t) => (
                          <div
                            key={t.id}
                            style={{
                              padding: "10px 12px",
                              borderRadius: "var(--radius-md)",
                              background: "var(--surface-canvas)",
                              border: "1px solid var(--hairline)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                              gap: 10,
                            }}
                          >
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                                {t.title}
                              </div>
                              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                                Assigned: <strong>{t.assignedOfficer?.name ?? "Unassigned"}</strong> • Due: {formatDate(t.dueDate)} • {humanize(t.category)}
                              </div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--primary)" }}>
                              {humanize(t.status)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Tab 4: Roster */}
                {intelTab === "ROSTER" && (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8 }}>
                      {dossier.people.map((person) => (
                        <div
                          key={person.userId}
                          style={{
                            padding: "10px 12px",
                            borderRadius: "var(--radius-md)",
                            background: "var(--surface-canvas)",
                            border: "1px solid var(--hairline)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 8,
                          }}
                        >
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)" }}>
                              {person.canManage ? "★ " : ""}{person.name}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                              {person.role?.replaceAll("_", " ") ?? "Staff"}
                              {person.phone ? ` • ${person.phone}` : ""}
                            </div>
                          </div>
                          {person.role === "FARM_OFFICER" && (
                            <button
                              type="button"
                              onClick={() => openNewThread(person.userId)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: 10, padding: "3px 6px" }}
                            >
                              Consult
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* ========================================================================= */}
      {/* RIGHT DOCK: Chat & Consultation Interface                                 */}
      {/* ========================================================================= */}
      <aside
        className={`agro-chat-dock${mobileTab === "chat" ? " mobile-active" : ""}`}
        style={{
          display: "flex",
          flexDirection: "column",
          height: "100%",
          background: "var(--surface-card)",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Chat Dock Header */}
        <div
          style={{
            padding: "14px 16px",
            borderBottom: "1px solid var(--hairline)",
            background: "var(--surface-card)",
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          {/* Active Thread Title & Status */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {selected ? selected.subject || "Consultation Thread" : "Field Messages"}
                </h3>
                {selected && (
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      padding: "2px 6px",
                      borderRadius: 10,
                      background: selected.status === "OPEN" ? "var(--green-tint)" : "var(--surface-strong)",
                      color: selected.status === "OPEN" ? "var(--green-ink)" : "var(--muted)",
                    }}
                  >
                    {selected.status}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {activeFarm?.name ?? "Current Estate"}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
              {selected && (
                <>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => farmId && silentRefresh(farmId)}
                    title="Refresh thread"
                    style={{ padding: 6 }}
                  >
                    <Icons.Refresh size={14} />
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={toggleStatus}
                    style={{ fontSize: 11, padding: "4px 8px" }}
                  >
                    {selected.status === "OPEN" ? "Close" : "Reopen"}
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Thread Switcher & "+ New Thread" Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <select
                className="input"
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(e.target.value || null)}
                style={{
                  width: "100%",
                  padding: "6px 8px",
                  fontSize: 12,
                  borderRadius: "var(--radius-md)",
                  background: "var(--surface-canvas)",
                }}
              >
                {conversations.length === 0 ? (
                  <option value="">No threads for this estate</option>
                ) : (
                  conversations.map((c) => (
                    <option key={c.id} value={c.id}>
                      {(c.unreadCount ?? 0) > 0 ? `● [${c.unreadCount} new] ` : ""}
                      {c.subject || "General Consultation"} (
                      {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : "New"}
                      )
                    </option>
                  ))
                )}
              </select>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openNewThread()}
              style={{ padding: "6px 10px", fontSize: 11, display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}
              title="Start a new consultation thread with a field officer"
            >
              <Icons.Plus size={13} />
              <span>New Thread</span>
            </button>
          </div>

          {/* Focused Context Bar (Plot / Crop Tagged) */}
          {(focusedPlotId || selectedPlotName) && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "4px 8px",
                borderRadius: "var(--radius-sm)",
                background: "var(--surface-canvas)",
                border: "1px solid var(--hairline)",
                fontSize: 11,
                color: "var(--ink)",
              }}
            >
              <span style={{ display: "flex", alignItems: "center", gap: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                <span>📍 Target:</span>
                <strong>{plots.find((p) => p.id === (focusedPlotId || selected?.plotId))?.name ?? selectedPlotName}</strong>
                {selectedCropName && <span>(🌱 {selectedCropName})</span>}
              </span>
              <button
                type="button"
                onClick={() => {
                  if (focusedPlotId) scrollToPlot(focusedPlotId);
                  else if (selected?.plotId) scrollToPlot(selected.plotId);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--primary)",
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "0 4px",
                  flexShrink: 0,
                }}
              >
                Inspect ↗
              </button>
            </div>
          )}
        </div>

        {/* Chat Thread Body */}
        <div style={{ flex: 1, minHeight: 0, position: "relative", display: "flex", flexDirection: "column" }}>
          {selected ? (
            <ChatThread
              key={selected.id}
              conversationId={selected.id}
              currentUserId={currentUserId}
              farmId={selected.farmId}
              plots={refPlots}
              focusPlotId={focusedPlotId || selected.plotId}
              onRefClick={jumpToRef}
              onSent={() => farmId && silentRefresh(farmId)}
              onActivity={() => farmId && silentRefresh(farmId)}
            />
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", background: "var(--surface-canvas)" }}>
              <div
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "var(--surface-card)",
                  border: "1px solid var(--hairline)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 12,
                  color: "var(--primary)",
                }}
              >
                <Icons.Mail size={24} />
              </div>
              <h4 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 6px", color: "var(--ink)" }}>
                {activeFarm ? activeFarm.name : "Select a Thread"}
              </h4>
              <p style={{ fontSize: 12, color: "var(--muted)", maxWidth: 280, margin: "0 0 16px", lineHeight: 1.4 }}>
                {conversations.length > 0
                  ? "Choose an active consultation from the dropdown above, or start a new thread to guide officers."
                  : "No threads found for this estate. Consult your on-site field officers to advise on crop health."}
              </p>
              <button
                type="button"
                className="btn btn-primary btn-sm"
                onClick={() => openNewThread()}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}
              >
                <Icons.Plus size={14} />
                <span>Start Consultation</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Visual Plot Demarcation Wizard Modal */}
      {isDemarcateOpen && (
        <PlotDemarcateWizard
          isOpen={isDemarcateOpen}
          onClose={() => setIsDemarcateOpen(false)}
          onSuccess={() => {
            setIsDemarcateOpen(false);
            if (farmId) {
              loadEstate(farmId);
              toast.show("Plot demarcated and cadastral map refreshed!", "success");
            }
          }}
          farms={farms.map((fm) => ({
            id: fm.id,
            name: fm.name,
            latitude: dossier?.farm.latitude || 12.5284,
            longitude: dossier?.farm.longitude || 77.8341,
            boundaryGeoJson: dossier?.farm.boundaryGeoJson,
            totalArea: dossier?.farm.totalArea ? Number(dossier.farm.totalArea) : 16,
          }))}
          initialFarmId={farmId}
        />
      )}

      {/* New Consultation Thread Modal */}
      {isModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(15, 23, 42, 0.65)",
            backdropFilter: "blur(4px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
          onClick={() => !isCreating && setIsModalOpen(false)}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "var(--surface-card)",
              borderRadius: "var(--radius-xl)",
              border: "1px solid var(--hairline)",
              boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--hairline)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--surface-canvas)",
              }}
            >
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>Start Consultation Thread</h3>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Estate: {activeFarm?.name ?? "Current Farm"}</div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setIsModalOpen(false)}
                disabled={isCreating}
                style={{ padding: 4 }}
              >
                <Icons.X size={18} />
              </button>
            </div>

            <form onSubmit={handleStartConversation} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Subject Topic *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Nutrient deficiency on Plot 1 north ridge"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="input"
                  style={{ width: "100%", fontSize: 13 }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Field Officer *
                </label>
                <select
                  required
                  value={newParticipantId}
                  onChange={(e) => setNewParticipantId(e.target.value)}
                  className="input"
                  style={{ width: "100%", fontSize: 13 }}
                >
                  <option value="">-- Choose on-site officer --</option>
                  {officers.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.name} {p.lead ? "(Lead Officer)" : "(Field Officer)"}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Link Specific Plot (Optional)
                </label>
                <select
                  value={newPlotId}
                  onChange={(e) => setNewPlotId(e.target.value)}
                  className="input"
                  style={{ width: "100%", fontSize: 13 }}
                >
                  <option value="">-- Entire Farm Estate --</option>
                  {plots.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Initial Directive / Advice (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Type opening diagnosis or instructions for the officer..."
                  value={newFirstMessage}
                  onChange={(e) => setNewFirstMessage(e.target.value)}
                  className="input"
                  style={{ width: "100%", fontSize: 13, resize: "none" }}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "flex-end",
                  gap: 10,
                  marginTop: 6,
                  paddingTop: 14,
                  borderTop: "1px solid var(--hairline)",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isCreating}
                  style={{ fontSize: 13 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={isCreating || !newSubject.trim() || !newParticipantId}
                  style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}
                >
                  {isCreating ? (
                    <>
                      <Icons.Loader size={14} className="animate-spin" />
                      <span>Starting...</span>
                    </>
                  ) : (
                    <>
                      <Icons.Send size={14} />
                      <span>Start Consultation</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .agro-mobile-bar { display: none; }
        @media (max-width: 1080px) {
          .agro-workspace-root {
            grid-template-columns: 1fr !important;
            height: auto !important;
            min-height: 0 !important;
          }
          .agro-mobile-bar {
            display: flex !important;
            gap: 8px;
            padding: 10px 14px;
            background: var(--surface-card);
            border-bottom: 1px solid var(--hairline);
          }
          .agro-intel-pane {
            display: none !important;
          }
          .agro-intel-pane.mobile-active {
            display: flex !important;
            height: auto !important;
            max-height: 80vh;
          }
          .agro-chat-dock {
            display: none !important;
          }
          .agro-chat-dock.mobile-active {
            display: flex !important;
            height: 75vh !important;
          }
        }
      `}</style>
    </div>
  );
}
