"use client";

import { useCallback, useEffect, useState } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { ChatThread } from "@modules/chat/ui/chat-thread";
import { ChatConversation, chatApi } from "@modules/chat/ui/chat-client";

const PAGE_SIZE = 25;

type FarmChip = { farmId: string; canManage: boolean; farm: { id: string; name: string; location: string; status: string } };
type Agronomist = {
  id: string; name: string; email: string; phone: string | null; active: boolean; createdAt: string;
  farms: FarmChip[];
  leadFarms: FarmChip[];
  workload: { openConversations: number; unreadMessages: number; pendingNotifications: number; prescriptions30d: number; openCreatedTasks: number };
};
type FarmOption = { id: string; name: string };

function Workload({ w }: { w: Agronomist["workload"] }) {
  return (
    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", fontSize: 12 }}>
      <span className="role-badge role-agronomist" title="Open conversations">{w.openConversations} chats</span>
      {w.unreadMessages > 0 && <span className="role-badge role-agronomist" title="Unread messages">{w.unreadMessages} unread</span>}
      <span className="muted" title="Prescriptions in last 30 days">{w.prescriptions30d} Rx/30d</span>
      <span className="muted" title="Created tasks still open">{w.openCreatedTasks} open tasks</span>
    </div>
  );
}

export function AgronomistConsole({ currentUserId }: { currentUserId: string }) {
  const toast = useToast();
  const [rows, setRows] = useState<Agronomist[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [active, setActive] = useState("ALL");
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<Agronomist | null>(null);
  const [tab, setTab] = useState<"overview" | "farms" | "messages">("overview");
  // Farm assignment editor
  const [allFarms, setAllFarms] = useState<FarmOption[]>([]);
  const [farmSearch, setFarmSearch] = useState("");
  const [assigned, setAssigned] = useState<Set<string>>(new Set());
  const [leads, setLeads] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  // Inspect conversations
  const [threads, setThreads] = useState<ChatConversation[]>([]);
  const [threadId, setThreadId] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebounced(search.trim());
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String((page - 1) * PAGE_SIZE) });
      if (debounced) params.set("search", debounced);
      if (active !== "ALL") params.set("active", active);
      const res = await fetch(`/api/agronomists?${params.toString()}`);
      if (!res.ok) throw new Error("Could not load agronomists.");
      const data = await res.json();
      setRows(data);
      setTotal(Number(res.headers.get("X-Total-Count") ?? data.length));
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not load agronomists.", "error");
    } finally {
      setLoading(false);
    }
  }, [page, debounced, active, toast]);

  useEffect(() => {
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const openDetail = (a: Agronomist) => {
    setSelected(a);
    setTab("overview");
    setAssigned(new Set(a.farms.map((f) => f.farmId)));
    setLeads(new Set(a.leadFarms.map((f) => f.farmId)));
    setThreadId(null);
    setThreads([]);
  };

  useEffect(() => {
    if (!selected) return;
    fetch("/api/farms?limit=200")
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => setAllFarms(Array.isArray(d) ? d.map((f: { id: string; name: string }) => ({ id: f.id, name: f.name })) : []))
      .catch(() => setAllFarms([]));
    chatApi<ChatConversation[]>(`/api/conversations?userId=${selected.id}`)
      .then((d) => {
        setThreads(d);
        if (d.length) setThreadId(d[0].id);
      })
      .catch(() => setThreads([]));
  }, [selected]);

  // Open threads that would lose a side if these farms are removed.
  const impactedOpenThreads = (removeIds: string[]) =>
    threads.filter((t) => t.status === "OPEN" && t.farmId && removeIds.includes(t.farmId));

  const saveAssignments = async () => {
    if (!selected) return;
    const removed = selected.farms.map((f) => f.farmId).filter((id) => !assigned.has(id));
    const impacted = impactedOpenThreads(removed);
    if (impacted.length && !window.confirm(
      `Removing ${removed.length} farm${removed.length === 1 ? "" : "s"} will lock ${selected.name} out of ${impacted.length} open conversation${impacted.length === 1 ? "" : "s"} (history stays for the other side). Continue?`
    )) return;
    setSaving(true);
    try {
      const farmIds = [...assigned];
      const managesFarmIds = [...leads].filter((id) => assigned.has(id));
      const res = await fetch(`/api/users/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ farmIds, managesFarmIds }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Could not save assignments.");
      }
      toast.show("Assignments saved.", "success");
      load();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not save assignments.", "error");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (!selected || selected.id === currentUserId) return;
    if (selected.active) {
      const open = threads.filter((t) => t.status === "OPEN").length;
      if (open && !window.confirm(
        `Deactivating ${selected.name} locks them out of ${open} open conversation${open === 1 ? "" : "s"} (history stays for the other side). Continue?`
      )) return;
    }
    try {
      const res = await fetch(`/api/users/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ active: !selected.active }),
      });
      if (!res.ok) throw new Error("Could not update status.");
      setSelected({ ...selected, active: !selected.active });
      load();
    } catch (e) {
      toast.show(e instanceof Error ? e.message : "Could not update status.", "error");
    }
  };

  const filteredFarms = allFarms.filter((f) => !farmSearch.trim() || f.name.toLowerCase().includes(farmSearch.trim().toLowerCase())).slice(0, 60);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <input className="input" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, email, phone…" style={{ flex: "2 1 220px" }} />
        <select className="input" value={active} onChange={(e) => { setActive(e.target.value); setPage(1); }}>
          <option value="ALL">All statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </select>
      </div>

      {loading ? (
        <p className="muted">Loading agronomists…</p>
      ) : rows.length === 0 ? (
        <div className="card" style={{ padding: 24, textAlign: "center" }}>
          <p className="muted">No agronomists found. Create them under Internal Team → People.</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => openDetail(a)}
              style={{ textAlign: "left", border: "1px solid var(--line)", borderRadius: 10, padding: "10px 12px", background: "var(--card, #fff)", cursor: "pointer", display: "flex", flexDirection: "column", gap: 6 }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <strong style={{ fontSize: 14 }}>{a.name}</strong>
                <span className="dir-status" style={{ color: a.active ? "var(--green-ink)" : "var(--muted)", fontSize: 12 }}>
                  {a.active ? "Active" : "Inactive"}
                </span>
              </div>
              <div className="muted" style={{ fontSize: 12 }}>{a.email}{a.phone ? ` · ${a.phone}` : ""}</div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
                {a.farms.length === 0 && <span className="muted" style={{ fontSize: 12 }}>No farm assignments</span>}
                {a.farms.slice(0, 6).map((f) => (
                  <span key={f.farmId} className="role-badge role-agronomist" title={f.canManage ? "Lead agronomist" : "Assigned"}>
                    {f.canManage ? "★ " : ""}{f.farm.name}
                  </span>
                ))}
                {a.farms.length > 6 && <span className="muted" style={{ fontSize: 12 }}>+{a.farms.length - 6} more</span>}
              </div>
              <Workload w={a.workload} />
            </button>
          ))}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, alignItems: "center", justifyContent: "center" }}>
        <button type="button" className="btn btn-sm btn-secondary" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</button>
        <span className="muted" style={{ fontSize: 12 }}>Page {page} of {pages} · {total} total</span>
        <button type="button" className="btn btn-sm btn-secondary" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>

      {selected && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 60, display: "flex", justifyContent: "flex-end" }} onClick={() => setSelected(null)}>
          <div
            role="dialog"
            aria-label={`Agronomist ${selected.name}`}
            onClick={(e) => e.stopPropagation()}
            style={{ width: "min(560px, 100%)", background: "var(--bg, #fff)", height: "100%", overflowY: "auto", padding: 16, display: "flex", flexDirection: "column", gap: 12 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 18 }}>{selected.name}</h2>
                <div className="muted" style={{ fontSize: 12 }}>{selected.email}{selected.phone ? ` · ${selected.phone}` : ""}</div>
              </div>
              <button type="button" className="btn btn-sm btn-secondary" onClick={() => setSelected(null)} aria-label="Close">
                <Icons.X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              {(["overview", "farms", "messages"] as const).map((t) => (
                <button key={t} type="button" className={`btn btn-sm ${tab === t ? "btn-primary" : "btn-secondary"}`} onClick={() => setTab(t)}>
                  {t === "overview" ? "Overview" : t === "farms" ? `Farms (${assigned.size})` : `Messages (${threads.length})`}
                </button>
              ))}
            </div>

            {tab === "overview" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <Workload w={selected.workload} />
                <div>
                  <h4 style={{ margin: "0 0 6px", fontSize: 13 }}>Assigned farms</h4>
                  {selected.farms.length === 0 ? (
                    <p className="muted">None — assign farms under the Farms tab.</p>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {selected.farms.map((f) => (
                        <div key={f.farmId} style={{ fontSize: 13 }}>{f.canManage ? "★ " : ""}{f.farm.name} <span className="muted">· {f.farm.location} · {f.farm.status}</span></div>
                      ))}
                    </div>
                  )}
                </div>
                {selected.id !== currentUserId && (
                  <button type="button" className="btn btn-sm btn-secondary" onClick={toggleActive} style={{ alignSelf: "flex-start" }}>
                    {selected.active ? "Deactivate" : "Reactivate"}
                  </button>
                )}
              </div>
            )}

            {tab === "farms" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {!selected.active && (
                  <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                    {selected.name} is inactive and cannot use chat until reactivated — assignments saved now take effect on reactivation.
                  </p>
                )}
                <input className="input" value={farmSearch} onChange={(e) => setFarmSearch(e.target.value)} placeholder="Filter farms…" />
                <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 320, overflowY: "auto" }}>
                  {filteredFarms.map((f) => {
                    const on = assigned.has(f.id);
                    const lead = leads.has(f.id);
                    return (
                      <label key={f.id} style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13, border: "1px solid var(--line)", borderRadius: 8, padding: "6px 8px" }}>
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() => {
                            setAssigned((prev) => {
                              const next = new Set(prev);
                              if (next.has(f.id)) {
                                next.delete(f.id);
                                setLeads((lp) => {
                                  const nl = new Set(lp);
                                  nl.delete(f.id);
                                  return nl;
                                });
                              } else next.add(f.id);
                              return next;
                            });
                          }}
                        />
                        <span style={{ flex: 1 }}>{f.name}</span>
                        {on && (
                          <button
                            type="button"
                            className={`btn btn-sm ${lead ? "btn-primary" : "btn-secondary"}`}
                            title="Lead agronomist for this farm"
                            onClick={(e) => {
                              e.preventDefault();
                              setLeads((prev) => {
                                const next = new Set(prev);
                                if (next.has(f.id)) next.delete(f.id);
                                else next.add(f.id);
                                return next;
                              });
                            }}
                          >
                            {lead ? "★ Lead" : "Lead"}
                          </button>
                        )}
                      </label>
                    );
                  })}
                </div>
                <button type="button" className="btn btn-sm btn-primary" onClick={saveAssignments} disabled={saving} style={{ alignSelf: "flex-start" }}>
                  {saving ? "Saving…" : "Save assignments"}
                </button>
              </div>
            )}

            {tab === "messages" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 0 }}>
                {threads.length === 0 ? (
                  <p className="muted">No conversations yet.</p>
                ) : (
                  <>
                    <select className="input" value={threadId ?? ""} onChange={(e) => setThreadId(e.target.value)}>
                      {threads.map((t) => (
                        <option key={t.id} value={t.id}>{t.subject || t.farmName} · {t.status}</option>
                      ))}
                    </select>
                    {threadId && (
                      <div style={{ border: "1px solid var(--line)", borderRadius: 10, height: 420, overflow: "hidden" }}>
                        <ChatThread
                          key={threadId}
                          conversationId={threadId}
                          farmId={threads.find((t) => t.id === threadId)?.farmId ?? ""}
                          currentUserId={currentUserId}
                          readOnly
                        />
                      </div>
                    )}
                    <p className="muted" style={{ fontSize: 12 }}>Read-only inspection. Officers and agronomists reply from their own consoles.</p>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
