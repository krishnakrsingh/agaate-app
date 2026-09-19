"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { PhotoUploadZone, PhotoItem, uploadEvidencePhotos } from "@/components/photo-upload-zone";
import {
  ChatMessage,
  ChatRef,
  RefPlot,
  OutboxItem,
  chatApi,
  enqueueOutbox,
  formatChatTime,
  loadOutbox,
  markOutboxStatus,
  newClientMessageId,
  removeOutboxItem,
  useChatPolling,
  useDraft,
} from "./chat-client";

const POLL_MS = 2500;

function formatBytes(n: number): string {
  if (!n) return "";
  return n > 1024 * 1024 ? `${(n / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`;
}

function AttachmentItem({ mediaId, kind, sizeBytes }: { mediaId: string; kind: string; sizeBytes: number }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let alive = true;
    const t = setTimeout(() => {
      setFailed(false);
      fetch(`/api/media/${mediaId}/url`)
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("load failed"))))
        .then((d) => {
          if (alive && d?.url) setUrl(d.url);
          else if (alive) setFailed(true);
        })
        .catch(() => {
          if (alive) setFailed(true);
        });
    }, 0);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [mediaId, attempt]);
  if (failed) {
    return (
      <span style={{ fontSize: 12 }}>
        <span className="error">Photo failed to load. </span>
        <button type="button" className="btn btn-sm btn-secondary" onClick={() => setAttempt((a) => a + 1)}>Retry</button>
      </span>
    );
  }
  if (!url) return <span className="muted" style={{ fontSize: 12 }}>Loading {kind.toLowerCase().replace(/_/g, " ")}…</span>;
  return (
    <span style={{ display: "inline-block" }}>
      <a href={url} target="_blank" rel="noreferrer">
        <img src={url} alt={kind} style={{ maxWidth: 220, maxHeight: 180, borderRadius: 8, border: "1px solid var(--hairline)" }} />
      </a>
      {sizeBytes > 0 && <span className="muted" style={{ display: "block", fontSize: 11 }}>{formatBytes(sizeBytes)}</span>}
    </span>
  );
}

function AttachmentGallery({ items }: { items: { id: string; kind: string; sizeBytes: number }[] }) {
  if (!items.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
      {items.map((a) => (
        <AttachmentItem key={a.id} mediaId={a.id} kind={a.kind} sizeBytes={a.sizeBytes} />
      ))}
    </div>
  );
}

function RefChips({ refs, onRefClick }: { refs: ChatRef[]; onRefClick?: (ref: ChatRef) => void }) {
  if (!refs.length) return null;
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 6 }}>
      {refs.map((r, i) =>
        onRefClick && (r.entityType === "PLOT" || r.entityType === "CROP_CYCLE") ? (
          <button
            key={r.id ?? i}
            type="button"
            className="role-badge role-agronomist"
            title={`Jump to ${r.label ?? r.entityType}`}
            onClick={() => onRefClick(r)}
            style={{ cursor: "pointer" }}
          >
            {r.label ?? r.entityType} ↗
          </button>
        ) : (
          <span key={r.id ?? i} className="role-badge role-agronomist" title={`${r.entityType} · ${r.entityId}`}>
            {r.label ?? r.entityType}
          </span>
        )
      )}
    </div>
  );
}

type Props = {
  conversationId: string;
  farmId: string;
  currentUserId: string;
  closed?: boolean;
  readOnly?: boolean;
  plots?: RefPlot[];
  /** Pre-selected plot scope of the conversation — offered as a one-tap tag. */
  focusPlotId?: string | null;
  /** Fired for clickable PLOT / CROP_CYCLE chips (agronomist jumps to context). */
  onRefClick?: (ref: ChatRef) => void;
  onSent?: () => void;
  /** Fired after incoming messages are marked read — parent refreshes badges silently. */
  onActivity?: () => void;
};

export function ChatThread({ conversationId, farmId, currentUserId, closed, readOnly, plots = [], focusPlotId, onRefClick, onSent, onActivity }: Props) {
  const toast = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [text, setText, clearText] = useDraft(conversationId);
  const [sending, setSending] = useState(false);
  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [pendingRefs, setPendingRefs] = useState<{ entityType: ChatRef["entityType"]; entityId: string; label?: string | null }[]>([]);
  const [refPlotId, setRefPlotId] = useState("");
  const [refCycleId, setRefCycleId] = useState("");
  const [outbox, setOutbox] = useState<OutboxItem[]>(() => loadOutbox(conversationId));
  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<ChatMessage[]>([]);
  const onActivityRef = useRef(onActivity);
  useEffect(() => {
    messagesRef.current = messages;
    onActivityRef.current = onActivity;
  });

  const scrollBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, []);

  const markRead = useCallback(
    async (messageId?: string) => {
      try {
        await chatApi(`/api/conversations/${conversationId}/read`, {
          method: "PATCH",
          body: JSON.stringify(messageId ? { messageId } : {}),
        });
        onActivityRef.current?.();
      } catch {
        // read receipts are best-effort
      }
    },
    [conversationId]
  );

  const load = useCallback(
    async (opts: { silent?: boolean; after?: string } = {}) => {
      if (!opts.silent) setLoading(true);
      setError("");
      try {
        const latest = messagesRef.current[messagesRef.current.length - 1];
        const after = opts.after ?? latest?.id;
        if (opts.silent && !after && messagesRef.current.length) {
          // Have history; poll only for newer.
        }
        const params = new URLSearchParams({ limit: "30" });
        if (after && (opts.silent || opts.after)) params.set("after", after);
        const data = await chatApi<{ messages: ChatMessage[]; hasMore: boolean }>(
          `/api/conversations/${conversationId}/messages?${params.toString()}`
        );
        if (opts.silent || opts.after) {
          if (data.messages.length) {
            setMessages((prev) => {
              const known = new Set(prev.map((m) => m.id));
              const fresh = data.messages.filter((m) => !known.has(m.id));
              if (!fresh.length) return prev;
              // Drop outbox echoes that just landed on the server.
              for (const m of fresh) removeOutboxItem(conversationId, m.clientMessageId);
              setOutbox(loadOutbox(conversationId));
              setTimeout(scrollBottom, 50);
              return [...prev, ...fresh];
            });
            const last = data.messages[data.messages.length - 1];
            if (last.senderId !== currentUserId) markRead(last.id);
          }
        } else {
          setMessages(data.messages);
          setHasMore(data.hasMore);
          setTimeout(scrollBottom, 50);
          const last = data.messages[data.messages.length - 1];
          if (last) markRead(last.id);
          else markRead();
        }
      } catch (e) {
        if (!opts.silent) setError(e instanceof Error ? e.message : "Could not load messages.");
      } finally {
        if (!opts.silent) setLoading(false);
      }
    },
    [conversationId, currentUserId, markRead, scrollBottom]
  );

  // Fresh conversation → reset state.
  useEffect(() => {
    const t = setTimeout(() => {
      setMessages([]);
      setHasMore(false);
      setOutbox(loadOutbox(conversationId));
      setPendingRefs([]);
      setPhotos([]);
      setShowCamera(false);
      setUploadProgress(null);
      load();
    }, 0);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const [isRealtime, setIsRealtime] = useState(false);

  // Real-time SSE push stream: instant message delivery (<50ms)
  useEffect(() => {
    if (typeof window === "undefined" || !conversationId) return;

    let es: EventSource | null = null;
    let reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

    function connect() {
      try {
        es = new EventSource(`/api/conversations/${conversationId}/stream`);

        es.addEventListener("ready", () => {
          setIsRealtime(true);
        });

        es.addEventListener("message", (event) => {
          try {
            const msg: ChatMessage = JSON.parse(event.data);
            if (!msg || !msg.id) return;

            setMessages((prev) => {
              const exists = prev.some(
                (m) => m.id === msg.id || (m.clientMessageId && m.clientMessageId === msg.clientMessageId)
              );
              if (exists) {
                // Update if edited or status changed
                return prev.map((m) =>
                  m.id === msg.id || (m.clientMessageId && m.clientMessageId === msg.clientMessageId) ? msg : m
                );
              }
              removeOutboxItem(conversationId, msg.clientMessageId);
              setOutbox(loadOutbox(conversationId));
              setTimeout(scrollBottom, 40);
              return [...prev, msg];
            });

            if (msg.senderId !== currentUserId) {
              markRead(msg.id);
            }
            onActivityRef.current?.();
          } catch (err) {
            console.error("SSE message parse failed:", err);
          }
        });

        es.onerror = () => {
          setIsRealtime(false);
          es?.close();
          // Attempt reconnect after 3 seconds
          reconnectTimeout = setTimeout(connect, 3000);
        };
      } catch {
        setIsRealtime(false);
      }
    }

    connect();

    return () => {
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      setIsRealtime(false);
      es?.close();
    };
  }, [conversationId, currentUserId, markRead, scrollBottom]);

  useChatPolling(!readOnly && !closed, POLL_MS, () => load({ silent: true }));

  const loadOlder = async () => {
    const oldest = messagesRef.current[0];
    if (!oldest || loadingMore) return;
    setLoadingMore(true);
    try {
      const data = await chatApi<{ messages: ChatMessage[]; hasMore: boolean }>(
        `/api/conversations/${conversationId}/messages?limit=30&before=${oldest.id}`
      );
      setMessages((prev) => [...data.messages, ...prev]);
      setHasMore(data.hasMore);
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not load older messages.", "error");
    } finally {
      setLoadingMore(false);
    }
  };

  const postItem = async (item: OutboxItem): Promise<boolean> => {
    markOutboxStatus(conversationId, item.clientMessageId, "SENDING");
    setOutbox(loadOutbox(conversationId));
    try {
      const sent = await chatApi<ChatMessage>(`/api/conversations/${conversationId}/messages`, {
        method: "POST",
        body: JSON.stringify({
          clientMessageId: item.clientMessageId,
          body: item.body,
          refs: item.refs,
          attachmentMediaIds: item.attachmentMediaIds,
        }),
      });
      removeOutboxItem(conversationId, item.clientMessageId);
      setOutbox(loadOutbox(conversationId));
      setMessages((prev) => {
        if (prev.some((m) => m.id === sent.id)) return prev;
        return [...prev, sent];
      });
      setTimeout(scrollBottom, 50);
      markRead(sent.id);
      return true;
    } catch (e) {
      markOutboxStatus(conversationId, item.clientMessageId, "FAILED", e instanceof Error ? e.message : "Send failed.");
      setOutbox(loadOutbox(conversationId));
      return false;
    }
  };

  const retryOutbox = async () => {
    const items = loadOutbox(conversationId).filter((i) => i.status !== "SENDING");
    for (const item of items) {
      await postItem(item);
    }
  };

  const handleSend = async () => {
    const body = text.trim();
    if (!body && !photos.length) return;
    if (sending || closed || readOnly) return;
    setSending(true);
    try {
      let mediaIds: string[] = [];
      if (photos.length) {
        setUploadProgress(`Uploading photo 1 of ${photos.length}…`);
        mediaIds = await uploadEvidencePhotos(farmId, "CROP_PHOTO", photos, (i, total) =>
          setUploadProgress(`Uploading photo ${i} of ${total}…`)
        );
        setUploadProgress(null);
      }
      const item: OutboxItem = {
        clientMessageId: newClientMessageId(),
        body: body || "(photo)",
        refs: pendingRefs,
        attachmentMediaIds: mediaIds,
        status: "QUEUED",
        queuedAt: Date.now(),
      };
      enqueueOutbox(conversationId, item);
      setOutbox(loadOutbox(conversationId));
      clearText();
      setPendingRefs([]);
      setPhotos([]);
      setShowCamera(false);
      const ok = await postItem(item);
      if (!ok) toast.show("Message queued — will retry. Tap Retry to send now.", "info");
      onSent?.();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not send message.", "error");
    } finally {
      setUploadProgress(null);
      setSending(false);
    }
  };

  const focusPlot = focusPlotId ? plots.find((p) => p.id === focusPlotId) : undefined;
  const tagFocusPlot = () => {
    if (!focusPlot) return;
    setPendingRefs((prev) =>
      prev.some((r) => r.entityId === focusPlot.id) ? prev : [...prev, { entityType: "PLOT", entityId: focusPlot.id, label: `Plot · ${focusPlot.name}` }]
    );
  };

  const addPlotRef = () => {
    if (!refPlotId) return;
    const plot = plots.find((p) => p.id === refPlotId);
    if (!plot) return;
    if (refCycleId) {
      const cycle = plot.cycles.find((c) => c.id === refCycleId);
      if (!cycle) return;
      setPendingRefs((prev) =>
        prev.some((r) => r.entityId === cycle.id) ? prev : [...prev, { entityType: "CROP_CYCLE", entityId: cycle.id, label: `${cycle.cropName} · ${plot.name}` }]
      );
    } else {
      setPendingRefs((prev) =>
        prev.some((r) => r.entityId === plot.id) ? prev : [...prev, { entityType: "PLOT", entityId: plot.id, label: `Plot · ${plot.name}` }]
      );
    }
    setRefPlotId("");
    setRefCycleId("");
  };

  const failed = outbox.filter((i) => i.status === "FAILED");
  const queued = outbox.filter((i) => i.status !== "FAILED");

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Live Sync Status Bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "4px 16px",
          background: "var(--surface-canvas)",
          borderBottom: "1px solid var(--hairline)",
          fontSize: 10,
          color: "var(--muted)",
        }}
      >
        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              backgroundColor: isRealtime ? "var(--green-ink)" : "var(--amber)",
              boxShadow: isRealtime ? "0 0 6px var(--green-ink)" : "none",
            }}
          />
          <span style={{ fontWeight: 600 }}>{isRealtime ? "Live Real-Time Stream (Instant Push)" : "Active Sync (Adaptive Polling)"}</span>
        </span>
        <span>Secure Agronomy Consultation</span>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: "auto", padding: "12px 16px 4px", display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
        {loading && <p className="muted" style={{ fontSize: 13 }}>Loading conversation…</p>}
        {error && (
          <div style={{ textAlign: "center", padding: "16px 12px" }}>
            <p className="error" style={{ fontSize: 13 }}>{error}</p>
            <button type="button" className="btn btn-sm btn-secondary" onClick={() => load()}>Retry</button>
          </div>
        )}
        {!loading && !error && hasMore && (
          <button type="button" className="btn btn-sm btn-secondary" onClick={loadOlder} disabled={loadingMore} style={{ alignSelf: "center" }}>
            {loadingMore ? "Loading…" : "Load older messages"}
          </button>
        )}
        {!loading && !error && messages.length === 0 && queued.length === 0 && failed.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 12px" }}>
            <p className="muted" style={{ fontSize: 13, margin: 0 }}>No messages yet. The farm dossier travels with the thread — no need to re-explain plots or crops.</p>
          </div>
        )}
        {messages.map((m) => {
          const mine = m.senderId === currentUserId;
          return (
            <div key={m.id} style={{ display: "flex", justifyContent: mine ? "flex-end" : "flex-start" }}>
              <div
                style={{
                  maxWidth: "85%",
                  background: mine ? "var(--green-tint)" : "var(--surface-card)",
                  border: mine ? "1px solid transparent" : "1px solid var(--hairline)",
                  borderRadius: 12,
                  padding: "8px 12px",
                }}
              >
                {!mine && <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 2, color: "var(--green-ink)" }}>{m.senderName}</div>}
                {m.deleted ? (
                  <span className="muted" style={{ fontSize: 13, fontStyle: "italic" }}>Message deleted</span>
                ) : (
                  <div style={{ fontSize: 14, color: "var(--ink)", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{m.body}</div>
                )}
                <AttachmentGallery items={m.attachments?.length ? m.attachments : m.attachment ? [m.attachment] : []} />
                <RefChips refs={m.refs} onRefClick={onRefClick} />
                <div className="muted" style={{ fontSize: 11, marginTop: 4, textAlign: "right" }}>{formatChatTime(m.createdAt)}</div>
              </div>
            </div>
          );
        })}
        {/* Outbox echoes */}
        {queued.map((q) => (
          <div key={q.clientMessageId} style={{ display: "flex", justifyContent: "flex-end", opacity: 0.75 }}>
            <div style={{ maxWidth: "85%", background: "var(--green-tint)", border: "1px dashed var(--hairline)", borderRadius: 12, padding: "8px 12px", fontSize: 14, color: "var(--ink)" }}>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{q.body}</div>
              <div className="muted" style={{ fontSize: 11, marginTop: 4, textAlign: "right" }}>Sending…</div>
            </div>
          </div>
        ))}
        {failed.map((q) => (
          <div key={q.clientMessageId} style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ maxWidth: "85%", background: "var(--red-light)", border: "1px solid var(--red-light)", borderRadius: 12, padding: "8px 12px", fontSize: 14, color: "var(--ink)" }}>
              <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{q.body}</div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginTop: 4 }}>
                <div className="error" style={{ fontSize: 11 }}>{q.error ?? "Send failed."}</div>
                <button
                  type="button"
                  onClick={() => {
                    removeOutboxItem(conversationId, q.clientMessageId);
                    setOutbox(loadOutbox(conversationId));
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--muted)",
                    fontSize: 11,
                    cursor: "pointer",
                    textDecoration: "underline",
                    padding: 0,
                  }}
                  title="Discard failed message"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      {!readOnly && (
        <div style={{ borderTop: "1px solid var(--hairline)", padding: "10px 16px", display: "flex", flexDirection: "column", gap: 8, background: "var(--surface-card)" }}>
          {closed ? (
            <p className="muted" style={{ fontSize: 13, textAlign: "center" }}>This conversation is closed.</p>
          ) : (
            <>
              {failed.length > 0 && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, alignSelf: "flex-start" }}>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={retryOutbox}>
                    Retry {failed.length} failed message{failed.length === 1 ? "" : "s"}
                  </button>
                  <button
                    type="button"
                    className="btn btn-sm btn-link"
                    onClick={() => {
                      for (const item of failed) {
                        removeOutboxItem(conversationId, item.clientMessageId);
                      }
                      setOutbox(loadOutbox(conversationId));
                    }}
                    style={{ fontSize: 12, color: "var(--muted)" }}
                  >
                    Clear
                  </button>
                </div>
              )}
              {focusPlot && !pendingRefs.some((r) => r.entityId === focusPlot.id) && (
                <div>
                  <button type="button" className="btn btn-sm btn-secondary" onClick={tagFocusPlot} title="Tag the plot this conversation is about">
                    Tag {focusPlot.name}
                  </button>
                </div>
              )}
              {uploadProgress && <p className="muted" style={{ fontSize: 12, margin: 0 }}>{uploadProgress}</p>}
              {plots.length > 0 && (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <select className="input" value={refPlotId} onChange={(e) => { setRefPlotId(e.target.value); setRefCycleId(""); }} style={{ flex: "1 1 140px" }}>
                    <option value="">Tag plot…</option>
                    {plots.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  {refPlotId && plots.find((p) => p.id === refPlotId)?.cycles.length ? (
                    <select className="input" value={refCycleId} onChange={(e) => setRefCycleId(e.target.value)} style={{ flex: "1 1 140px" }}>
                      <option value="">Whole plot</option>
                      {plots.find((p) => p.id === refPlotId)!.cycles.map((c) => (
                        <option key={c.id} value={c.id}>{c.cropName}</option>
                      ))}
                    </select>
                  ) : null}
                  {refPlotId && (
                    <button type="button" className="btn btn-sm btn-secondary" onClick={addPlotRef}>Tag</button>
                  )}
                </div>
              )}
              {pendingRefs.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                  {pendingRefs.map((r) => (
                    <button
                      key={r.entityId}
                      type="button"
                      className="role-badge role-agronomist"
                      title="Remove tag"
                      onClick={() => setPendingRefs((prev) => prev.filter((x) => x.entityId !== r.entityId))}
                    >
                      {r.label ?? r.entityId} ✕
                    </button>
                  ))}
                </div>
              )}
              {(showCamera || photos.length > 0) && (
                <PhotoUploadZone farmId={farmId} kind="CROP_PHOTO" maxPhotos={3} onPhotosChange={setPhotos} isUploading={sending} />
              )}
              <div style={{ display: "flex", gap: 6, alignItems: "flex-end" }}>
                <button
                  type="button"
                  className="btn btn-sm btn-secondary"
                  onClick={() => setShowCamera((v) => !v)}
                  title="Attach crop photo"
                  aria-label="Attach crop photo"
                >
                  <Icons.Camera size={16} />
                </button>
                <textarea
                  className="input"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Reply with advice, dosage, or a follow-up question…"
                  rows={2}
                  style={{ flex: 1, resize: "vertical" }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                />
                <button type="button" className="btn btn-sm btn-primary" onClick={handleSend} disabled={sending || (!text.trim() && !photos.length)}>
                  {sending ? "…" : "Send"}
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
