"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { ChatThread } from "@modules/chat/ui/chat-thread";
import { ChatConversation, RefPlot, chatApi } from "@modules/chat/ui/chat-client";
import { formatDate } from "@shared/format";
import { FarmMap } from "@modules/agronomy/ui/farm-map";

type FarmDossier = {
  farm: {
    id: string; name: string; location: string; village: string | null; district: string | null; state: string | null;
    totalArea: unknown; cultivableArea: unknown; waterSource: string; soilType: string | null; soilPh: unknown;
    status: string; setupStage: string; boundaryGeoJson: string | null;
  };
  plots: {
    id: string; name: string; area: string; soilType: string | null; irrigationSetup: string | null;
    irrigationType: string | null; valvesCount: number | null; status: string; boundaryGeoJson: string | null;
    cycles: {
      id: string; cropName: string; variety: string | null; status: string; startDate: string;
      expectedFirstHarvestDate: string | null; latestStage: string | null; latestHealth: string | null; latestNote: string | null;
    }[];
  }[];
  openIncidents: { id: string; plotId: string | null; type: string; severity: string | null; status: string; createdAt: string; plot: { name: string } | null }[];
  recentPrescriptions: { id: string; targetIssue: string; priority: string; status: string; applicationDate: string; plot: { name: string } | null; author: { name: string } | null }[];
  activeTasks: { id: string; title: string; category: string; priority: string; status: string; dueDate: string; assignedOfficer: { id: string; name: string } | null }[];
  people: { userId: string; canManage: boolean; name: string; role: string | null; phone: string | null }[];
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

const label11: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px",
};

/** "BOREWELL_AND_DRIP" → "Borewell and drip". Raw enums leak from the DB. */
function humanize(raw: string | null | undefined): string {
  if (!raw) return "—";
  return raw
    .split("_")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ")
    .replace(/\bAc\b/g, "ac");
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
  const [searchQuery, setSearchQuery] = useState("");
  const [flashPlotId, setFlashPlotId] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"chats" | "farm" | "chat">("chats");

  // New-thread modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newSubject, setNewSubject] = useState("");
  const [newParticipantId, setNewParticipantId] = useState("");
  const [newPlotId, setNewPlotId] = useState("");
  const [newFirstMessage, setNewFirstMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);

  // Boot: farms → pick param / saved / liveliest estate (most recent open thread).
  useEffect(() => {
    const t = setTimeout(() => {
      Promise.all([
        fetch("/api/farms?limit=100").then((r) => (r.ok ? r.json() : [])).catch(() => []),
        chatApi<ChatConversation[]>("/api/conversations?status=OPEN").catch(() => []),
      ]).then(([data, openThreads]) => {
        const list: FarmOption[] = Array.isArray(data)
          ? data.map((f: { id: string; name: string; location?: string | null }) => ({ id: f.id, name: f.name, location: f.location }))
          : [];
        setFarms(list);
        let saved: string | null = null;
        try {
          saved = localStorage.getItem("agaate_chat_farm");
        } catch {
          // ignore storage error
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEstate = useCallback(async (fid: string, opts: { silent?: boolean } = {}) => {
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
          ? plotsRes.map((p: { id: string; name: string; cycles?: { id: string; cropName: string }[] }) => ({ id: p.id, name: p.name, cycles: p.cycles ?? [] }))
          : []
      );
    } catch (err) {
      if (!opts.silent) toast.show(err instanceof Error ? err.message : "Could not load estate chat.", "error");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Dossier follows the selected thread; falls back to the bare estate.
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, farmId]);

  const selected = useMemo(
    () => conversations.find((c) => c.id === selectedId) ?? null,
    [conversations, selectedId]
  );

  const filteredConversations = useMemo(() => {
    if (!searchQuery.trim()) return conversations;
    const q = searchQuery.toLowerCase();
    return conversations.filter(
      (c) =>
        (c.subject && c.subject.toLowerCase().includes(q)) ||
        (c.lastMessage && c.lastMessage.body.toLowerCase().includes(q))
    );
  }, [conversations, searchQuery]);

  const unreadTotal = useMemo(() => conversations.reduce((s, c) => s + (c.unreadCount ?? 0), 0), [conversations]);

  const refPlots: RefPlot[] = useMemo(
    () => (dossier?.plots ?? []).map((p) => ({ id: p.id, name: p.name, cycles: p.cycles.map((c) => ({ id: c.id, cropName: c.cropName })) })),
    [dossier]
  );

  const officers = useMemo(() => people.filter((p) => p.role === "FARM_OFFICER"), [people]);

  const scrollToPlot = useCallback((plotId: string) => {
    setMobileTab("farm");
    setTimeout(() => {
      document.getElementById(`ctx-plot-${plotId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashPlotId(plotId);
      setTimeout(() => setFlashPlotId((f) => (f === plotId ? null : f)), 1600);
    }, 60);
  }, []);

  const jumpToRef = useCallback((ref: { entityType: string; entityId: string }) => {
    if (!dossier) return;
    const plotId =
      ref.entityType === "PLOT"
        ? ref.entityId
        : ref.entityType === "CROP_CYCLE"
          ? (dossier.plots.find((p) => p.cycles.some((c) => c.id === ref.entityId))?.id ?? null)
          : null;
    if (plotId) scrollToPlot(plotId);
  }, [dossier, scrollToPlot]);

  const openNewThread = (recipientId?: string) => {
    if (!farmId) {
      toast.show("Select a farm estate first.", "error");
      return;
    }
    setNewParticipantId(recipientId ?? "");
    setNewSubject(recipientId ? "" : newSubject);
    setNewPlotId("");
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
          toast.show("Thread started, but the first message did not send — please resend it.", "error");
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
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not update conversation.", "error");
    }
  };

  const scrollToPlotSafe = useCallback((plotId: string) => {
    setMobileTab("farm");
    setTimeout(() => {
      document.getElementById(`ctx-plot-${plotId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      setFlashPlotId(plotId);
      setTimeout(() => setFlashPlotId((f) => (f === plotId ? null : f)), 1600);
    }, 60);
  }, []);

  const selectedPlotName = selected?.plotId ? plots.find((p) => p.id === selected.plotId)?.name ?? null : null;
  const selectedCropName =
    selected?.plotId && selected?.cropCycleId
      ? (plots.find((p) => p.id === selected.plotId)?.cycles.find((cy) => cy.id === selected.cropCycleId)?.cropName ?? null)
      : null;
  const activeFarm = farms.find((f) => f.id === farmId);

  return (
    <div
      className="agro-chat-shell"
      style={{
        display: "grid",
        gridTemplateColumns: "360px 1fr",
        height: "calc(100vh - 110px)",
        minHeight: "560px",
        background: "var(--surface-card)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
    >
      {/* Sidebar: estate, roster, threads */}
      <div
        className={`agro-chat-pane${mobileTab === "chats" ? " mobile-show" : ""}`}
        data-pane="chats"
        style={{
          borderRight: "1px solid var(--hairline)",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface-canvas)",
          height: "100%",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "16px", borderBottom: "1px solid var(--hairline)", background: "var(--surface-card)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  background: "var(--primary-subtle, rgba(22, 101, 52, 0.1))",
                  color: "var(--primary)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}
              >
                <Icons.Mail size={16} />
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>Field Messages</h2>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>
                  {unreadTotal > 0 ? `${unreadTotal} unread across threads` : "Officer threads & crop context"}
                </div>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => openNewThread()}
              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
              title="Start a new thread with a field officer"
            >
              <Icons.Plus size={14} />
              <span>New Thread</span>
            </button>
          </div>

          <div>
            <label style={label11} htmlFor="agro-estate-select">Active Farm Estate</label>
            <select
              id="agro-estate-select"
              className="input"
              value={farmId}
              onChange={(e) => { setFarmId(e.target.value); setSelectedId(null); }}
              style={{ width: "100%", marginTop: 4, padding: "8px 12px", fontSize: 13, fontWeight: 600, borderRadius: "var(--radius-md)" }}
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} {f.location ? `(${f.location})` : ""}
                </option>
              ))}
            </select>
          </div>
        </div>

        {officers.length > 0 && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--hairline)", background: "rgba(0,0,0,0.015)" }}>
            <div style={{ ...label11, marginBottom: 6 }}>Officers on this estate</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {officers.map((p) => (
                <button
                  key={p.userId}
                  type="button"
                  onClick={() => openNewThread(p.userId)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6,
                    padding: "4px 8px", borderRadius: "16px", fontSize: 11, fontWeight: 500,
                    background: "var(--surface-card)", border: "1px solid var(--hairline)", color: "var(--ink)",
                    cursor: "pointer",
                  }}
                  title={`Click to consult ${p.name}`}
                >
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--blue)" }} />
                  <span>{p.name}</span>
                  <span style={{ fontSize: 9, opacity: 0.7 }}>{p.lead ? "Lead Officer" : "Officer"}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ position: "relative" }}>
            <Icons.Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }} />
            <input
              type="text"
              placeholder="Filter conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%", padding: "6px 10px 6px 30px", fontSize: 12,
                borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)",
                background: "var(--surface-card)", color: "var(--ink)",
              }}
            />
          </div>
        </div>

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading threads...</div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <Icons.Mail size={28} style={{ color: "var(--muted)", opacity: 0.4, margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>No active threads</div>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, marginBottom: 12 }}>
                {farmId ? "Start a thread to answer this estate's officers." : "Pick an estate above to see its threads."}
              </p>
              {farmId && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => openNewThread()} style={{ fontSize: 12 }}>
                  + Start First Thread
                </button>
              )}
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.id === selectedId;
              const hasUnread = (c.unreadCount ?? 0) > 0;
              const plotName = c.plotId ? plots.find((p) => p.id === c.plotId)?.name : null;
              const cropName = c.plotId && c.cropCycleId
                ? plots.find((p) => p.id === c.plotId)?.cycles.find((cy) => cy.id === c.cropCycleId)?.cropName
                : null;
              return (
                <div
                  key={c.id}
                  onClick={() => { setSelectedId(c.id); setMobileTab("chat"); }}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--hairline)",
                    cursor: "pointer",
                    background: isSelected || hasUnread ? "var(--surface-strong)" : "transparent",
                    borderLeft: isSelected ? "3px solid var(--primary)" : "3px solid transparent",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 3 }}>
                    <div
                      style={{
                        fontSize: 13, fontWeight: hasUnread || isSelected ? 700 : 500, color: "var(--ink)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "70%",
                      }}
                    >
                      {c.subject || "General Consultation"}
                    </div>
                    <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {hasUnread && (
                        <span style={{ fontSize: 10, fontWeight: 700, color: "var(--primary)" }}>{c.unreadCount} new</span>
                      )}
                      <span style={{ fontSize: 10, color: "var(--muted)" }}>
                        {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                      </span>
                    </span>
                  </div>
                  {c.lastMessage && (
                    <div
                      style={{
                        fontSize: 12, color: hasUnread ? "var(--ink)" : "var(--muted)", fontWeight: hasUnread ? 600 : 400,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 6,
                      }}
                    >
                      {c.lastMessage.body}
                    </div>
                  )}
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    {plotName && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "var(--surface-canvas)", border: "1px solid var(--hairline)", color: "var(--ink)" }}>
                        📍 {plotName}
                      </span>
                    )}
                    {cropName && (
                      <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "var(--green-tint)", color: "var(--green-ink)" }}>
                        🌱 {cropName}
                      </span>
                    )}
                    {hasUnread && (
                      <span style={{ marginLeft: "auto", width: 8, height: 8, borderRadius: "50%", background: "var(--primary)" }} />
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: chat + farm dossier */}
      <div className="agro-chat-pane" data-pane="chatfarm" style={{ display: "flex", height: "100%", overflow: "hidden", background: "var(--surface-card)" }}>
        {selected ? (
          <>
            <div className={`agro-threadwrap${mobileTab === "chat" ? " mobile-show" : ""}`} style={{ flex: "1 1 0", minWidth: 0, display: "flex", flexDirection: "column", height: "100%" }}>
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-card)" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {selected.subject || "Consultation Thread"}
                    </h3>
                    <span
                      style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12, flexShrink: 0,
                        background: selected.status === "OPEN" ? "var(--green-tint)" : "var(--surface-strong)",
                        color: selected.status === "OPEN" ? "var(--green-ink)" : "var(--muted)",
                      }}
                    >
                      {selected.status}
                    </span>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4, fontSize: 12, color: "var(--muted)", flexWrap: "wrap" }}>
                    <span>Estate: <strong>{activeFarm?.name ?? selected.farmName}</strong></span>
                    {selectedPlotName && <span>• Plot: <strong>{selectedPlotName}</strong></span>}
                    {selectedCropName && <span>• Crop: <strong>{selectedCropName}</strong></span>}
                  </div>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => farmId && silentRefresh(farmId)} title="Refresh messages">
                    <Icons.Refresh size={14} />
                  </button>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={toggleStatus}>
                    {selected.status === "OPEN" ? "Close" : "Reopen"}
                  </button>
                </div>
              </div>
              <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
                <ChatThread
                  key={selected.id}
                  conversationId={selected.id}
                  currentUserId={currentUserId}
                  farmId={selected.farmId}
                  plots={refPlots}
                  focusPlotId={selected.plotId}
                  onRefClick={jumpToRef}
                  onSent={() => farmId && silentRefresh(farmId)}
                  onActivity={() => farmId && silentRefresh(farmId)}
                />
              </div>
            </div>
            <FarmDossierPanel
              dossier={dossier}
              loading={dossierLoading}
              flashPlotId={flashPlotId}
              onPlotClick={scrollToPlotSafe}
              mobileShow={mobileTab === "farm"}
            />
          </>
        ) : (
          <div className={`agro-emptythread${mobileTab === "chats" ? "" : " mobile-show"}`} style={{ flex: 1, overflowY: "auto", padding: 24, background: "var(--surface-canvas)" }}>
            <div style={{ textAlign: "center", padding: "24px 0 8px" }}>
              <div
                style={{
                  width: 64, height: 64, borderRadius: "50%", background: "var(--surface-card)",
                  border: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "center",
                  margin: "0 auto 16px", color: "var(--primary)",
                }}
              >
                <Icons.Mail size={32} />
              </div>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px 0" }}>
                {activeFarm ? activeFarm.name : "Field Messages"}
              </h3>
              <p style={{ maxWidth: 460, fontSize: 14, color: "var(--muted)", margin: "0 auto 20px", lineHeight: 1.5 }}>
                Select a thread to answer it with this estate&apos;s live dossier beside you — or start a new consultation below.
              </p>
              {farmId && (
                <button type="button" className="btn btn-primary" onClick={() => openNewThread()} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <Icons.Plus size={16} />
                  <span>Start New Consultation Thread</span>
                </button>
              )}
            </div>
            <div style={{ maxWidth: 860, margin: "12px auto 0" }}>
              <FarmDossierPanel dossier={dossier} loading={dossierLoading} flashPlotId={flashPlotId} onPlotClick={scrollToPlotSafe} mobileShow />
            </div>
          </div>
        )}
      </div>

      {/* Mobile tabs */}
      <div className="agro-mobile-tabs">
        {(["chats", "farm", "chat"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setMobileTab(t)}
            className={`btn btn-sm ${mobileTab === t ? "btn-primary" : "btn-secondary"}`}
          >
            {t === "chats" ? "Threads" : t === "farm" ? "Estate" : "Chat"}
          </button>
        ))}
      </div>

      {/* New-thread modal */}
      {isModalOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 9999, backgroundColor: "rgba(15, 23, 42, 0.65)", backdropFilter: "blur(4px)", display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
          onClick={() => !isCreating && setIsModalOpen(false)}
        >
          <div
            style={{ width: "100%", maxWidth: 520, background: "var(--surface-card)", borderRadius: "var(--radius-xl)", border: "1px solid var(--hairline)", boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.2)", display: "flex", flexDirection: "column", overflow: "hidden" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-canvas)" }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>Start Consultation Thread</h3>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>Estate: {activeFarm?.name ?? "Current Farm"}</div>
              </div>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIsModalOpen(false)} disabled={isCreating} style={{ padding: 4 }}>
                <Icons.X size={18} />
              </button>
            </div>
            <form onSubmit={handleStartConversation} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Subject *</label>
                <input type="text" required placeholder="e.g. Yellowing on Plot 1 north ridge" value={newSubject} onChange={(e) => setNewSubject(e.target.value)} className="input" style={{ width: "100%", fontSize: 13 }} autoFocus />
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Field officer *</label>
                <select required value={newParticipantId} onChange={(e) => setNewParticipantId(e.target.value)} className="input" style={{ width: "100%", fontSize: 13 }}>
                  <option value="">-- Choose officer --</option>
                  {officers.map((p) => (
                    <option key={p.userId} value={p.userId}>{p.name}{p.lead ? " (Lead)" : ""}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Link plot (optional)</label>
                <select value={newPlotId} onChange={(e) => setNewPlotId(e.target.value)} className="input" style={{ width: "100%", fontSize: 13 }}>
                  <option value="">-- Entire estate --</option>
                  {plots.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>First message (optional)</label>
                <textarea rows={3} placeholder="Opening note for the officer..." value={newFirstMessage} onChange={(e) => setNewFirstMessage(e.target.value)} className="input" style={{ width: "100%", fontSize: 13, resize: "none" }} />
              </div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 10, marginTop: 6, paddingTop: 14, borderTop: "1px solid var(--hairline)" }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsModalOpen(false)} disabled={isCreating} style={{ fontSize: 13 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={isCreating || !newSubject.trim() || !newParticipantId} style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}>
                  {isCreating ? (
                    <><Icons.Loader size={14} className="animate-spin" /><span>Creating...</span></>
                  ) : (
                    <><Icons.Send size={14} /><span>Start Consultation</span></>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .agro-mobile-tabs { display: none; }
        .agro-dossier { display: flex; flex-direction: column; }
        @media (max-width: 1023px) {
          .agro-chat-shell { grid-template-columns: 1fr !important; height: auto !important; min-height: 0 !important; }
          .agro-chat-shell > .agro-chat-pane[data-pane="chats"] { display: none; border-right: none; border-bottom: 1px solid var(--hairline); max-height: 60vh; }
          .agro-chat-shell > .agro-chat-pane[data-pane="chats"].mobile-show { display: flex; }
          .agro-chat-shell > div[data-pane="chatfarm"] { flex-direction: column; }
          .agro-chat-shell .agro-threadwrap { display: none; }
          .agro-chat-shell .agro-threadwrap.mobile-show { display: flex; min-height: 60vh; }
          .agro-chat-shell .agro-emptythread { display: none; }
          .agro-chat-shell .agro-emptythread.mobile-show { display: block; }
          .agro-dossier { display: none; }
          .agro-dossier.mobile-show { display: flex; width: auto !important; border-left: none !important; border-top: 1px solid var(--hairline); max-height: none; }
          .agro-mobile-tabs { display: flex !important; gap: 8px; padding: 10px 12px 0; }
        }
      `}</style>
    </div>
  );
}

/** Right-side estate dossier: overview, demarcation map, plots, issues, work, people. */
function FarmDossierPanel({
  dossier, loading, flashPlotId, onPlotClick, mobileShow,
}: {
  dossier: FarmDossier | null;
  loading: boolean;
  flashPlotId: string | null;
  onPlotClick: (plotId: string) => void;
  mobileShow?: boolean;
}) {
  const activeCrops = useMemo(
    () => (dossier?.plots ?? []).flatMap((p) => p.cycles.map((c) => ({ ...c, plotId: p.id, plotName: p.name }))),
    [dossier]
  );
  const stressedCount = activeCrops.filter((c) => c.latestHealth === "POOR").length;
  const mappedPlots = (dossier?.plots ?? []).filter((p) => p.boundaryGeoJson).length;

  if (loading) {
    return (
      <div className={`agro-dossier${mobileShow ? " mobile-show" : ""}`} style={dossierStyle}>
        <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading estate dossier…</div>
      </div>
    );
  }
  if (!dossier) {
    return (
      <div className={`agro-dossier${mobileShow ? " mobile-show" : ""}`} style={dossierStyle}>
        <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Select an estate to see its dossier.</div>
      </div>
    );
  }

  const f = dossier.farm;
  const place = [f.village, f.district, f.state].filter(Boolean).join(", ") || f.location;

  return (
    <div className={`agro-dossier${mobileShow ? " mobile-show" : ""}`} style={dossierStyle}>
      {/* Estate overview */}
      <section style={cardStyle}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.Farm size={15} style={{ color: "var(--primary)" }} />
              <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>{f.name}</h3>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 4 }}>
              <Icons.MapPin size={12} />
              {place}
            </div>
          </div>
          <span
            style={{
              fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 12, flexShrink: 0,
              background: f.status === "ACTIVE" ? "var(--green-tint)" : "var(--surface-strong)",
              color: f.status === "ACTIVE" ? "var(--green-ink)" : "var(--muted)",
            }}
          >
            {f.status}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginTop: 12 }}>
          {[
            { label: "Cultivable", value: `${String(f.cultivableArea)} / ${String(f.totalArea)} ac` },
            { label: "Water", value: humanize(f.waterSource) },
            { label: "Soil", value: f.soilType ? `${humanize(f.soilType)}${f.soilPh ? ` · pH ${String(f.soilPh)}` : ""}` : "—" },
          ].map((s) => (
            <div key={s.label} style={{ borderRadius: "var(--radius-md)", background: "var(--surface-canvas)", border: "1px solid var(--hairline)", padding: "8px 10px", minWidth: 0 }}>
              <div style={label11}>{s.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", marginTop: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={s.value}>
                {s.value}
              </div>
            </div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 10, paddingTop: 10, borderTop: "1px solid var(--hairline)", flexWrap: "wrap" }}>
          <DossierStat value={dossier.plots.length} label={dossier.plots.length === 1 ? "plot" : "plots"} />
          <DossierStat value={activeCrops.length} label={activeCrops.length === 1 ? "crop" : "crops"} alert={stressedCount} alertLabel="stressed" />
          <DossierStat value={dossier.openIncidents.length} label={dossier.openIncidents.length === 1 ? "issue" : "issues"} />
          <DossierStat value={dossier.activeTasks.length} label={dossier.activeTasks.length === 1 ? "task" : "tasks"} />
        </div>
      </section>

      {/* Demarcation map */}
      <section style={cardStyle}>
        <SectionTitle icon={<Icons.Plot size={13} />} text={`Demarcation · ${mappedPlots}/${dossier.plots.length} plots mapped`} />
        <div style={{ marginTop: 8 }}>
          <FarmMap
            farmGeoJson={f.boundaryGeoJson}
            plots={dossier.plots.map((p) => ({
              id: p.id,
              name: p.name,
              boundaryGeoJson: p.boundaryGeoJson,
              stressed: p.cycles.some((c) => c.latestHealth === "POOR"),
            }))}
            focusPlotId={dossier.focus.plotId}
            flashPlotId={flashPlotId}
            onPlotClick={onPlotClick}
          />
        </div>
      </section>

      {/* Plots & crops */}
      <section style={cardStyle}>
        <SectionTitle icon={<Icons.Sprout size={13} />} text={`Plots & crops · ${dossier.plots.length}`} />
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 8 }}>
          {dossier.plots.map((p) => {
            const isFocus = dossier.focus.plotId === p.id;
            const flashed = flashPlotId === p.id;
            return (
              <article
                key={p.id}
                id={`ctx-plot-${p.id}`}
                style={{
                  borderRadius: "var(--radius-md)",
                  background: flashed ? "var(--green-tint)" : "var(--surface-canvas)",
                  border: `1px solid ${flashed || isFocus ? "var(--primary)" : "var(--hairline)"}`,
                  padding: "10px 12px",
                  transition: "background 0.3s ease",
                  scrollMarginTop: 12,
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                  <Link href={`/plots/${p.id}`} target="_blank" style={{ fontSize: 13, fontWeight: 700, color: "var(--ink)" }}>
                    {p.name} ↗
                  </Link>
                  <span style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                    {isFocus && (
                      <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "var(--green-tint)", color: "var(--green-ink)" }}>
                        IN TALK
                      </span>
                    )}
                    <span style={{ fontSize: 10, color: "var(--muted)" }}>{p.status}</span>
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2, display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                  <span>{p.area} ac</span>
                  <span>·</span>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 3 }}>
                    <Icons.Droplet size={11} />
                    {humanize(p.irrigationType) === "—" ? "Rainfed" : humanize(p.irrigationType)}{p.valvesCount != null ? ` · ${p.valvesCount} valves` : ""}
                  </span>
                  {p.soilType && (<><span>·</span><span>{humanize(p.soilType)}</span></>)}
                </div>
                {p.cycles.length === 0 ? (
                  <div style={{ fontSize: 12, color: "var(--muted)", fontStyle: "italic", marginTop: 6 }}>Fallow — no crop growing</div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}>
                    {p.cycles.map((c) => {
                      const days = daysInGround(c.startDate);
                      const progress = seasonProgress(c.startDate, c.expectedFirstHarvestDate);
                      return (
                        <div key={c.id}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <Link href={`/plots/${p.id}/crop-cycles/${c.id}`} target="_blank" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                              🌱 {c.cropName}
                            </Link>
                            {c.latestHealth === "POOR" ? (
                              <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 6px", borderRadius: 4, background: "var(--red-light)", color: "var(--red)" }}>STRESS</span>
                            ) : (
                              <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 6px", borderRadius: 4, background: "var(--green-tint)", color: "var(--green-ink)" }}>
                                {c.latestHealth === "GOOD" ? "OPTIMAL" : "UNCHECKED"}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 2 }}>
                            {c.variety ? `${c.variety} · ` : ""}{c.latestStage ?? "Stage unknown"} · <strong style={{ color: "var(--ink)" }}>Day {days}</strong>
                          </div>
                          <div style={{ height: 6, borderRadius: 3, background: "var(--surface-strong)", overflow: "hidden", marginTop: 6 }}>
                            <div
                              style={{
                                height: "100%",
                                borderRadius: 3,
                                width: `${Math.round((progress ?? 0.12) * 100)}%`,
                                background: c.latestHealth === "POOR" ? "var(--red)" : "var(--primary)",
                              }}
                            />
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "var(--muted)", marginTop: 3 }}>
                            <span>Sown {formatDate(c.startDate)}</span>
                            <span>{c.expectedFirstHarvestDate ? `Harvest ~${formatDate(c.expectedFirstHarvestDate)}` : c.status}</span>
                          </div>
                          {c.latestNote && (
                            <div style={{ fontSize: 11, color: "var(--muted)", fontStyle: "italic", marginTop: 4, borderLeft: "2px solid var(--hairline)", paddingLeft: 6 }}>
                              “{c.latestNote}”
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </article>
            );
          })}
        </div>
      </section>

      {dossier.openIncidents.length > 0 && (
        <section style={cardStyle}>
          <SectionTitle icon={<Icons.AlertTriangle size={13} />} text={`Open issues · ${dossier.openIncidents.length}`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {dossier.openIncidents.map((i) => (
              <div key={i.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  ⚠️ {humanize(i.type)}{i.plot ? <span style={{ color: "var(--muted)" }}> · {i.plot.name}</span> : null}
                  {i.severity ? <span style={{ color: "var(--muted)" }}> · {humanize(i.severity)}</span> : null}
                </span>
                <Link href="/agronomy/diagnostics" style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", flexShrink: 0 }}>
                  Diagnose
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {dossier.activeTasks.length > 0 && (
        <section style={cardStyle}>
          <SectionTitle icon={<Icons.ClipboardList size={13} />} text={`Field work · ${dossier.activeTasks.length}`} />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {dossier.activeTasks.map((t) => (
              <div key={t.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, fontSize: 13 }}>
                <span style={{ color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {t.title}{t.assignedOfficer ? <span style={{ color: "var(--muted)" }}> · {t.assignedOfficer.name}</span> : null}
                </span>
                <Link href="/tasks" style={{ fontSize: 12, fontWeight: 600, color: "var(--primary)", flexShrink: 0 }}>
                  {humanize(t.status)}
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {dossier.recentPrescriptions.length > 0 && (
        <section style={cardStyle}>
          <SectionTitle icon={<Icons.Stethoscope size={13} />} text="Recent prescriptions" />
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 8 }}>
            {dossier.recentPrescriptions.map((r) => (
              <div key={r.id} style={{ fontSize: 13, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                💊 {r.targetIssue}
                <span style={{ color: "var(--muted)" }}>{r.plot ? ` · ${r.plot.name}` : ""} · {humanize(r.priority)}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section style={cardStyle}>
        <SectionTitle icon={<Icons.Users size={13} />} text="People on this estate" />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
          {dossier.people.map((p) => (
            <span
              key={p.userId}
              style={{ fontSize: 11, fontWeight: 500, padding: "4px 8px", borderRadius: 16, background: "var(--surface-canvas)", border: "1px solid var(--hairline)", color: "var(--ink)" }}
            >
              {p.canManage ? "★ " : ""}{p.name}
              <span style={{ opacity: 0.7 }}> · {p.role?.replaceAll("_", " ")}</span>
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}

const dossierStyle: React.CSSProperties = {
  width: 360,
  flexShrink: 0,
  borderLeft: "1px solid var(--hairline)",
  background: "var(--surface-canvas)",
  overflowY: "auto",
  height: "100%",
  padding: 12,
  gap: 10,
};

const cardStyle: React.CSSProperties = {
  background: "var(--surface-card)",
  border: "1px solid var(--hairline)",
  borderRadius: "var(--radius-lg)",
  padding: 12,
};

function SectionTitle({ icon, text }: { icon: React.ReactNode; text: string }) {
  return (
    <h4 style={{ margin: 0, fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", display: "flex", alignItems: "center", gap: 5 }}>
      {icon}
      {text}
    </h4>
  );
}

function DossierStat({ value, label, alert, alertLabel }: { value: number; label: string; alert?: number; alertLabel?: string }) {
  return (
    <span style={{ fontSize: 12, color: alert ? "var(--red)" : "var(--muted)" }}>
      <strong style={{ color: alert ? "var(--red)" : "var(--ink)" }}>{value}</strong> {label}
      {alert ? <strong> · {alert} {alertLabel}</strong> : null}
    </span>
  );
}

