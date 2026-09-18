"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { ChatThread } from "@modules/chat/ui/chat-thread";
import { ChatConversation, RefPlot, chatApi } from "@modules/chat/ui/chat-client";

type FarmOption = { id: string; name: string };
type RosterPerson = { userId: string; name: string; role: string | null; lead: boolean };
type RosterConversation = { id: string; subject: string | null; plotId: string | null; lastMessageAt: string };

export function OfficerChat({ currentUserId }: { currentUserId: string }) {
  const toast = useToast();
  const searchParams = useSearchParams();
  const [farms, setFarms] = useState<FarmOption[]>([]);
  const [farmId, setFarmId] = useState("");
  const [people, setPeople] = useState<RosterPerson[]>([]);
  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [plots, setPlots] = useState<RefPlot[]>([]);
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [rosterError, setRosterError] = useState("");

  useEffect(() => {
    fetch("/api/farms?limit=100")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => {
        const list: FarmOption[] = Array.isArray(d) ? d.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })) : [];
        setFarms(list);
        // Remember the officer's last farm — field users shouldn't re-pick daily.
        let saved: string | null = null;
        try {
          saved = localStorage.getItem("agaate_chat_farm");
        } catch {
          // ignore
        }
        if (list.length === 1) setFarmId(list[0].id);
        else if (saved && list.some((f) => f.id === saved)) setFarmId(saved);
      })
      .catch(() => setFarms([]))
      .finally(() => setLoading(false));
  }, []);

  const loadRoster = useCallback(async (fid: string, opts: { silent?: boolean } = {}) => {
    if (!opts.silent) setRosterError("");
    try {
      const [roster, convs] = await Promise.all([
        chatApi<{ people: RosterPerson[]; myConversations: RosterConversation[] }>(`/api/conversations/roster?farmId=${fid}`),
        chatApi<ChatConversation[]>(`/api/conversations?farmId=${fid}`),
      ]);
      setPeople(roster.people);
      setConversations(convs);
      const wanted = searchParams.get("conversation");
      if (wanted && convs.some((c) => c.id === wanted)) setSelectedId(wanted);
      else setSelectedId((prev) => (convs.some((c) => c.id === prev) ? prev : (convs[0]?.id ?? null)));
      // Plot/cycle options for tagging questions.
      const ctx = await chatApi<{ plots: { id: string; name: string; cycles: { id: string; cropName: string }[] }[] }>(
        convs[0] ? `/api/conversations/${convs[0].id}/context` : `/api/conversations/roster?farmId=${fid}`
      ).catch(() => null);
      if (ctx && "plots" in ctx) setPlots(ctx.plots);
      else setPlots([]);
    } catch (e) {
      if (!opts.silent) {
        setRosterError(e instanceof Error ? e.message : "Could not load farm chat.");
        toast.show(e instanceof Error ? e.message : "Could not load farm chat.", "error");
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const silentRefresh = useCallback((fid: string) => loadRoster(fid, { silent: true }), [loadRoster]);

  useEffect(() => {
    if (!farmId) return;
    const t = setTimeout(() => loadRoster(farmId), 0);
    return () => clearTimeout(t);
  }, [farmId, loadRoster]);

  // Keep tag options in sync with the open conversation's farm snapshot.
  useEffect(() => {
    if (!selectedId) return;
    const t = setTimeout(() => {
      fetch(`/api/conversations/${selectedId}/context`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.plots) setPlots(d.plots.map((p: { id: string; name: string; cycles: { id: string; cropName: string }[] }) => ({ id: p.id, name: p.name, cycles: p.cycles })));
      })
      .catch(() => {});
    }, 0);
    return () => clearTimeout(t);
  }, [selectedId]);

  const agronomists = useMemo(() => people.filter((p) => p.role === "AGRONOMIST"), [people]);
  const selected = useMemo(() => conversations.find((c) => c.id === selectedId) ?? null, [conversations, selectedId]);

  const pickFarm = (id: string) => {
    setFarmId(id);
    setSelectedId(null);
    try {
      if (id) localStorage.setItem("agaate_chat_farm", id);
    } catch {
      // ignore
    }
  };

  const startConversation = async (withUserId?: string) => {
    if (!farmId) {
      toast.show("Select a farm first.", "error");
      return;
    }
    const targets = withUserId ? [withUserId] : agronomists.map((a) => a.userId);
    if (!targets.length) {
      toast.show("No agronomist is assigned to this farm yet.", "error");
      return;
    }
    setStarting(true);
    try {
      const created = await chatApi<{ id: string; reused?: boolean }>("/api/conversations", {
        method: "POST",
        body: JSON.stringify({ farmId, participantIds: targets }),
      });
      if (created.reused) toast.show("Resumed your existing conversation.", "info");
      await loadRoster(farmId);
      setSelectedId(created.id);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not start conversation.", "error");
    } finally {
      setStarting(false);
    }
  };

  if (loading) return <p className="muted" style={{ fontSize: 13 }}>Loading your farms…</p>;
  if (!farms.length) {
    return (
      <div className="card" style={{ padding: 24, textAlign: "center" }}>
        <p className="muted" style={{ fontSize: 13, margin: 0 }}>You are not assigned to any farm yet — ask your farm owner or HQ.</p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "340px 1fr",
        height: "calc(100vh - 150px)",
        minHeight: "540px",
        background: "var(--surface-card)",
        border: "1px solid var(--hairline)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
      }}
      className="officer-chat-shell"
    >
      {/* Sidebar: farm, agronomist, threads */}
      <div
        className="officer-chat-pane"
        data-pane="side"
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
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div
              style={{
                width: 32, height: 32, borderRadius: 8,
                background: "var(--primary-subtle, rgba(22, 101, 52, 0.1))",
                color: "var(--primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}
            >
              <Icons.Stethoscope size={16} />
            </div>
            <div>
              <h2 style={{ fontSize: 15, fontWeight: 700, margin: 0, color: "var(--ink)" }}>Ask your agronomist</h2>
              <div style={{ fontSize: 11, color: "var(--muted)" }}>Photos, plots & field questions</div>
            </div>
          </div>
          <label style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
            Active Farm Estate
          </label>
          <select
            className="input"
            value={farmId}
            onChange={(e) => pickFarm(e.target.value)}
            style={{ width: "100%", marginTop: 4, padding: "8px 12px", fontSize: 13, fontWeight: 600, borderRadius: "var(--radius-md)" }}
          >
            <option value="">Select farm…</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        {farmId && !rosterError && (
          <div style={{ padding: "10px 16px", borderBottom: "1px solid var(--hairline)", background: "rgba(0,0,0,0.015)" }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: 6 }}>
              Your agronomist{agronomists.length > 1 ? "s" : ""}
            </div>
            {agronomists.length === 0 ? (
              <p className="muted" style={{ fontSize: 12, margin: 0 }}>None assigned yet — ask your farm owner or HQ.</p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {agronomists.map((a) => (
                  <div key={a.userId} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                      <span
                        style={{
                          width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                          background: "var(--green-tint)", color: "var(--green-ink)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 11, fontWeight: 700,
                        }}
                      >
                        {a.name.split(" ").map((w) => w[0]).slice(0, 2).join("")}
                      </span>
                      <div style={{ minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {a.name}
                        </div>
                        <div style={{ fontSize: 11, color: "var(--muted)" }}>{a.lead ? "Lead agronomist" : "Agronomist"}</div>
                      </div>
                    </div>
                    <button type="button" className="btn btn-primary btn-sm" onClick={() => startConversation(a.userId)} disabled={starting} style={{ fontSize: 12, flexShrink: 0 }}>
                      Chat
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column" }}>
          {!farmId ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <Icons.Farm size={28} style={{ color: "var(--muted)", opacity: 0.4, margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Select a farm estate</div>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>Your threads and agronomist appear here.</p>
            </div>
          ) : rosterError ? (
            <div style={{ padding: 24, textAlign: "center" }}>
              <p className="error" style={{ fontSize: 13 }}>{rosterError}</p>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => loadRoster(farmId)}>Retry</button>
            </div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: 32, textAlign: "center" }}>
              <Icons.Mail size={28} style={{ color: "var(--muted)", opacity: 0.4, margin: "0 auto 8px" }} />
              <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>No threads yet</div>
              <p style={{ fontSize: 12, color: "var(--muted)", marginTop: 4, marginBottom: 12 }}>Describe the issue, add photos, tag the plot.</p>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => startConversation()} disabled={starting || !agronomists.length} style={{ fontSize: 12 }}>
                {starting ? "Starting…" : "Ask your agronomist"}
              </button>
            </div>
          ) : (
            conversations.map((c) => {
              const isSelected = c.id === selectedId;
              const hasUnread = (c.unreadCount ?? 0) > 0;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedId(c.id)}
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
                      {c.subject || "Farm discussion"}
                    </div>
                    <span style={{ fontSize: 10, color: "var(--muted)", flexShrink: 0 }}>
                      {c.lastMessageAt ? new Date(c.lastMessageAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) : ""}
                    </span>
                  </div>
                  {c.lastMessage && (
                    <div
                      style={{
                        fontSize: 12, color: hasUnread ? "var(--ink)" : "var(--muted)", fontWeight: hasUnread ? 600 : 400,
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                      }}
                    >
                      {c.lastMessage.body}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Thread */}
      <div className="officer-chat-pane" data-pane="thread" style={{ display: "flex", flexDirection: "column", height: "100%", background: "var(--surface-card)" }}>
        {selected ? (
          <>
            <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between", background: "var(--surface-card)" }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {selected.subject || "Farm discussion"}
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
                <div style={{ fontSize: 12, color: "var(--muted)", marginTop: 2 }}>
                  {selected.participants.filter((p) => p.userId !== currentUserId).map((p) => p.name).join(", ")}
                </div>
              </div>
            </div>
            <div style={{ flex: 1, minHeight: 0, position: "relative" }}>
              <ChatThread
                key={selected.id}
                conversationId={selected.id}
                farmId={farmId}
                currentUserId={currentUserId}
                closed={selected.status === "CLOSED"}
                plots={plots}
                focusPlotId={selected.plotId}
                onSent={() => loadRoster(farmId)}
                onActivity={() => silentRefresh(farmId)}
              />
            </div>
          </>
        ) : (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 40, textAlign: "center", background: "var(--surface-canvas)" }}>
            <div
              style={{
                width: 64, height: 64, borderRadius: "50%", background: "var(--surface-card)",
                border: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "center",
                marginBottom: 16, color: "var(--primary)",
              }}
            >
              <Icons.Stethoscope size={32} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: "0 0 8px 0" }}>Talk to your agronomist</h3>
            <p style={{ maxWidth: 420, fontSize: 14, color: "var(--muted)", margin: "0 0 20px 0", lineHeight: 1.5 }}>
              Pick a thread — or start one with photos and plot context attached automatically.
            </p>
            {farmId && !rosterError && (
              <button type="button" className="btn btn-primary" onClick={() => startConversation()} disabled={starting || !agronomists.length} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                <Icons.Plus size={16} />
                <span>{starting ? "Starting…" : "Ask your agronomist"}</span>
              </button>
            )}
          </div>
        )}
      </div>

      <style>{`
        @media (max-width: 1023px) {
          .officer-chat-shell { grid-template-columns: 1fr !important; height: auto !important; min-height: 0 !important; }
          .officer-chat-shell > .officer-chat-pane[data-pane="side"] { border-right: none; border-bottom: 1px solid var(--hairline); max-height: 52vh; }
          .officer-chat-shell > .officer-chat-pane[data-pane="thread"] { min-height: 62vh; }
        }
      `}</style>
    </div>
  );
}
