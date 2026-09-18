"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { ChatThread } from "@modules/chat/ui/chat-thread";
import { ChatConversation, RefPlot, chatApi } from "@modules/chat/ui/chat-client";

interface FarmOption {
  id: string;
  name: string;
  location?: string | null;
}

interface RosterPerson {
  userId: string;
  name: string;
  role: string | null;
  lead: boolean;
}

interface RosterConversation {
  id: string;
  subject: string | null;
  plotId: string | null;
  lastMessageAt: string;
}

interface OwnerChatProps {
  currentUserId: string;
  initialFarms?: FarmOption[];
}

export function OwnerChat({ currentUserId, initialFarms }: OwnerChatProps) {
  const toast = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [farms, setFarms] = useState<FarmOption[]>(initialFarms || []);
  const [farmId, setFarmId] = useState<string>("");
  const [people, setPeople] = useState<RosterPerson[]>([]);
  const [mine, setMine] = useState<RosterConversation[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plots, setPlots] = useState<RefPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // New conversation form state
  const [newSubject, setNewSubject] = useState("");
  const [newPlotId, setNewPlotId] = useState("");
  const [newCropCycleId, setNewCropCycleId] = useState("");
  const [newParticipantId, setNewParticipantId] = useState("");
  const [newFirstMessage, setNewFirstMessage] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Load user accessible farms
  useEffect(() => {
    fetch("/api/farms?limit=100")
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => {
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
          // ignore storage error
        }

        const paramFarm = searchParams.get("farmId");
        if (paramFarm && list.some((f) => f.id === paramFarm)) {
          setFarmId(paramFarm);
        } else if (saved && list.some((f) => f.id === saved)) {
          setFarmId(saved);
        } else if (list.length > 0) {
          setFarmId(list[0].id);
        }
      })
      .catch(() => setFarms([]))
      .finally(() => setLoading(false));
  }, [searchParams]);

  const loadFarmChat = useCallback(
    async (fid: string, opts: { silent?: boolean } = {}) => {
      try {
        const [roster, convs] = await Promise.all([
          chatApi<{ people: RosterPerson[]; myConversations: RosterConversation[] }>(
            `/api/conversations/roster?farmId=${fid}`
          ),
          chatApi<ChatConversation[]>(`/api/conversations?farmId=${fid}`),
        ]);
        setPeople(roster.people);
        setMine(roster.myConversations);
        setConversations(convs);

        const wanted = searchParams.get("conversation");
        if (wanted && convs.some((c) => c.id === wanted)) {
          setSelectedId(wanted);
        } else if (convs.length > 0) {
          setSelectedId((prev) => (convs.some((c) => c.id === prev) ? prev : convs[0].id));
        } else {
          setSelectedId(null);
        }

        // Fetch plots & crop cycle context
        const ctx = await chatApi<{ plots: RefPlot[] }>(
          convs[0] ? `/api/conversations/${convs[0].id}/context` : `/api/conversations/roster?farmId=${fid}`
        ).catch(() => null);

        if (ctx && "plots" in ctx && Array.isArray(ctx.plots)) {
          setPlots(ctx.plots);
        } else {
          // Fallback fetch plots
          fetch(`/api/plots?farmId=${fid}&limit=50`)
            .then((r) => (r.ok ? r.json() : []))
            .then((plotData) => {
              if (Array.isArray(plotData)) {
                setPlots(plotData.map((p) => ({ id: p.id, name: p.name, cycles: [] })));
              }
            })
            .catch(() => setPlots([]));
        }
      } catch (err) {
        if (!opts.silent) {
          toast.show(err instanceof Error ? err.message : "Failed to load farm communications", "error");
        }
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [searchParams]
  );

  useEffect(() => {
    if (!farmId) return;
    try {
      localStorage.setItem("agaate_chat_farm", farmId);
    } catch {
      // ignore
    }
    loadFarmChat(farmId);
  }, [farmId, loadFarmChat]);

  const selectedConversation = useMemo(
    () => conversations.find((c) => c.id === selectedId) || null,
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

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!farmId) return;
    if (!newSubject.trim()) {
      toast.show("Please enter a subject topic", "error");
      return;
    }
    if (!newParticipantId) {
      toast.show("Please select an Agronomist or Field Officer to consult", "error");
      return;
    }

    setIsCreating(true);
    try {
      const created = await chatApi<{ id: string }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({
          farmId,
          subject: newSubject.trim(),
          participantUserIds: [newParticipantId],
          plotId: newPlotId || undefined,
          cropCycleId: newCropCycleId || undefined,
          initialMessage: newFirstMessage.trim() || undefined,
        }),
      });

      toast.show("Consultation thread started", "success");
      setIsModalOpen(false);
      setNewSubject("");
      setNewFirstMessage("");
      setNewPlotId("");
      setNewCropCycleId("");
      setNewParticipantId("");

      await loadFarmChat(farmId);
      setSelectedId(created.id);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : "Could not create thread", "error");
    } finally {
      setIsCreating(false);
    }
  };

  const selectedPlotObj = plots.find((p) => p.id === newPlotId);

  return (
    <div
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
      {/* Sidebar: Farm Selection, Contacts & Threads */}
      <div
        style={{
          borderRight: "1px solid var(--hairline)",
          display: "flex",
          flexDirection: "column",
          background: "var(--surface-canvas)",
          height: "100%",
          overflow: "hidden",
        }}
      >
        {/* Top Header & Farm Selector */}
        <div style={{ padding: "16px", borderBottom: "1px solid var(--hairline)", background: "var(--surface-card)" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background: "var(--primary-subtle, rgba(22, 101, 52, 0.1))",
                  color: "var(--primary)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icons.MessageSquare size={16} />
              </div>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>Advisory & Ops Chat</h2>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>HQ Agronomists &amp; Field Crew</div>
              </div>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                if (people.length > 0 && !newParticipantId) {
                  setNewParticipantId(people[0].userId);
                }
                setIsModalOpen(true);
              }}
              style={{ padding: "6px 12px", fontSize: 12, display: "flex", alignItems: "center", gap: 4 }}
              title="Start a new advisory consultation thread"
            >
              <Icons.Plus size={14} />
              <span>New Thread</span>
            </button>
          </div>

          {/* Farm Switcher */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Active Farm Estate
            </label>
            <div style={{ position: "relative", marginTop: 4 }}>
              <select
                className="input"
                value={farmId}
                onChange={(e) => setFarmId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  fontSize: 13,
                  fontWeight: 600,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--hairline)",
                  background: "var(--surface-card)",
                  color: "var(--ink)",
                }}
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} {f.location ? `(${f.location})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Assigned Team Roster */}
        {people.length > 0 && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--hairline)", background: "rgba(0,0,0,0.015)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
              Assigned to this Estate
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {people.map((p) => {
                const isAgronomist = p.role === "AGRONOMIST";
                return (
                  <button
                    key={p.userId}
                    type="button"
                    onClick={() => {
                      setNewParticipantId(p.userId);
                      setNewSubject(`Consultation: ${p.name.split(" ")[0]}`);
                      setIsModalOpen(true);
                    }}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "4px 8px",
                      borderRadius: "16px",
                      fontSize: 11,
                      fontWeight: 500,
                      background: isAgronomist ? "var(--green-tint)" : "var(--surface-card)",
                      border: `1px solid ${isAgronomist ? "var(--hairline)" : "var(--hairline)"}`,
                      color: isAgronomist ? "var(--green-ink)" : "var(--ink)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                    title={`Click to consult ${p.name}`}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: isAgronomist ? "var(--green-ink)" : "var(--blue)",
                      }}
                    />
                    <span>{p.name}</span>
                    <span style={{ fontSize: 9, opacity: 0.7 }}>
                      {isAgronomist ? "Agronomist" : p.lead ? "Lead Officer" : "Officer"}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Thread Search Filter */}
        <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--hairline)" }}>
          <div style={{ position: "relative" }}>
            <Icons.Search
              size={13}
              style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)" }}
            />
            <input
              type="text"
              placeholder="Filter conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "6px 10px 6px 30px",
                fontSize: 12,
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--hairline)",
                background: "var(--surface-card)",
                color: "var(--ink)",
              }}
            />
          </div>
        </div>

        {/* Thread List with Clean Scrolling */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {loading ? (
            <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
              Loading farm conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <Icons.MessageSquare size={28} style={{ color: "var(--muted)", opacity: 0.4, margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>No active threads</div>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, marginBottom: 12 }}>
                Start a thread to ask agronomists or field officers questions about crops or plots.
              </p>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setIsModalOpen(true)}
                style={{ fontSize: 12 }}
              >
                + Start First Thread
              </button>
            </div>
          ) : (
            filteredConversations.map((c) => {
              const isSelected = c.id === selectedId;
              const hasUnread = c.unreadCount && c.unreadCount > 0;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--hairline)",
                    cursor: "pointer",
                    background: isSelected
                      ? "var(--surface-strong)"
                      : hasUnread
                        ? "var(--surface-strong)"
                        : "transparent",
                    borderLeft: isSelected ? "3px solid var(--primary)" : "3px solid transparent",
                    transition: "background 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 3 }}>
                    <div
                      style={{
                        fontSize: 13,
                        fontWeight: hasUnread || isSelected ? 700 : 500,
                        color: "var(--ink)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        maxWidth: "75%",
                      }}
                    >
                      {c.subject || "General Consultation"}
                    </div>
                    <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>
                      {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                    </span>
                  </div>

                  {c.lastMessage && (
                    <div
                      style={{
                        fontSize: 12,
                        color: hasUnread ? "var(--ink)" : "var(--muted)",
                        fontWeight: hasUnread ? 600 : 400,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                        marginBottom: 6,
                      }}
                    >
                      {c.lastMessage.body}
                    </div>
                  )}

                  {(() => {
                    const plotName = c.plotId ? plots.find((p) => p.id === c.plotId)?.name : null;
                    const cropName = c.plotId && c.cropCycleId
                      ? plots.find((p) => p.id === c.plotId)?.cycles.find((cy) => cy.id === c.cropCycleId)?.cropName
                      : null;
                    return (
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        {plotName && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "var(--surface-canvas)",
                              border: "1px solid var(--hairline)",
                              color: "var(--ink)",
                            }}
                          >
                            📍 {plotName}
                          </span>
                        )}
                        {cropName && (
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 600,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "var(--green-tint)",
                              color: "var(--green-ink)",
                            }}
                          >
                            🌱 {cropName}
                          </span>
                        )}
                        {hasUnread && (
                          <span
                            style={{
                              marginLeft: "auto",
                              width: 8,
                              height: 8,
                              borderRadius: "50%",
                              background: "var(--primary)",
                            }}
                          />
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Chat Thread Area */}
      <div style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--surface-card)" }}>
        {selectedConversation ? (
          <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
            {/* Thread Header */}
            <div
              style={{
                padding: "14px 20px",
                borderBottom: "1px solid var(--hairline)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                background: "var(--surface-card)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                    {selectedConversation.subject || "Consultation Thread"}
                  </h3>
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: 12,
                      background: selectedConversation.status === "OPEN" ? "var(--green-tint)" : "var(--surface-strong)",
                      color: selectedConversation.status === "OPEN" ? "var(--green-ink)" : "var(--muted)",
                    }}
                  >
                    {selectedConversation.status}
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4, fontSize: 12, color: "var(--muted)" }}>
                  <span>Estate: <strong>{farms.find((f) => f.id === farmId)?.name || "Active Farm"}</strong></span>
                  {(() => {
                    const plotName = selectedConversation.plotId ? plots.find((p) => p.id === selectedConversation.plotId)?.name : null;
                    const cropName = selectedConversation.plotId && selectedConversation.cropCycleId
                      ? plots.find((p) => p.id === selectedConversation.plotId)?.cycles.find((cy) => cy.id === selectedConversation.cropCycleId)?.cropName
                      : null;
                    return (
                      <>
                        {plotName && <span>• Plot: <strong>{plotName}</strong></span>}
                        {cropName && <span>• Crop: <strong>{cropName}</strong></span>}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => loadFarmChat(farmId, { silent: true })}
                  title="Refresh messages"
                >
                  <Icons.Refresh size={14} />
                </button>
              </div>
            </div>

            {/* Chat Thread Component */}
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
              <ChatThread
                conversationId={selectedConversation.id}
                currentUserId={currentUserId}
                farmId={farmId}
                plots={plots}
              />
            </div>
          </div>
        ) : (
          <div
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: 40,
              textAlign: "center",
              background: "var(--surface-canvas)",
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                background: "var(--surface-card)",
                border: "1px solid var(--hairline)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 16,
                color: "var(--primary)",
              }}
            >
              <Icons.MessageSquare size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px 0" }}>
              Agronomy &amp; Field Operations Console
            </h3>
            <p style={{ maxWidth: 420, fontSize: 14, color: "var(--muted)", margin: "0 0 20px 0", lineHeight: 1.5 }}>
              Select an ongoing thread from the sidebar or initiate a direct consultation with your assigned Agronomist or Field Officers.
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                if (people.length > 0 && !newParticipantId) setNewParticipantId(people[0].userId);
                setIsModalOpen(true);
              }}
              style={{ display: "flex", alignItems: "center", gap: 8 }}
            >
              <Icons.Plus size={16} />
              <span>Start New Consultation Thread</span>
            </button>
          </div>
        )}
      </div>

      {/* Zero-Scroll Compact Modal for Starting a Thread */}
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
            {/* Modal Header */}
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
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                  Start Consultation Thread
                </h3>
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  Farm: {farms.find((f) => f.id === farmId)?.name || "Current Farm"}
                </div>
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

            {/* Modal Form Body - Zero scroll, compact grid */}
            <form onSubmit={handleStartConversation} style={{ padding: "20px", display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Consultation Topic / Subject *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Pest control advisory for Plot 2, Irrigation rate check"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                  className="input"
                  style={{ width: "100%", fontSize: 13 }}
                  autoFocus
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Recipient Specialist *
                </label>
                <select
                  required
                  value={newParticipantId}
                  onChange={(e) => setNewParticipantId(e.target.value)}
                  className="input"
                  style={{ width: "100%", fontSize: 13 }}
                >
                  <option value="">-- Choose Agronomist or Officer --</option>
                  {people.map((p) => (
                    <option key={p.userId} value={p.userId}>
                      {p.name} ({p.role === "AGRONOMIST" ? "Agronomist" : p.lead ? "Lead Officer" : "Field Officer"})
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                    Link Plot (Optional)
                  </label>
                  <select
                    value={newPlotId}
                    onChange={(e) => {
                      setNewPlotId(e.target.value);
                      setNewCropCycleId("");
                    }}
                    className="input"
                    style={{ width: "100%", fontSize: 13 }}
                  >
                    <option value="">-- Entire Farm --</option>
                    {plots.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                    Crop Cycle (Optional)
                  </label>
                  <select
                    value={newCropCycleId}
                    onChange={(e) => setNewCropCycleId(e.target.value)}
                    disabled={!selectedPlotObj || selectedPlotObj.cycles.length === 0}
                    className="input"
                    style={{ width: "100%", fontSize: 13 }}
                  >
                    <option value="">-- Any Cycle --</option>
                    {selectedPlotObj?.cycles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.cropName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Initial Message (Optional)
                </label>
                <textarea
                  rows={3}
                  placeholder="Describe your question or observation for the team..."
                  value={newFirstMessage}
                  onChange={(e) => setNewFirstMessage(e.target.value)}
                  className="input"
                  style={{ width: "100%", fontSize: 13, resize: "none" }}
                />
              </div>

              {/* Modal Footer Controls */}
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
                      <span>Creating...</span>
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
    </div>
  );
}
