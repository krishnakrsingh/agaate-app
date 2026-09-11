"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useServerList } from "@/components/data/use-server-list";
import { ServerTable } from "@/components/data/server-table";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Icons } from "@/components/icons";
import { useFarmSearch, useClientSearch } from "./people-drawers";
import { useOfficerSearch, shortId, dueLabel, overdueDays, isOpenStatus } from "./tasks-lookups";
import { TasksWorkload } from "./tasks-workload";
import { TaskDetailDrawer } from "./task-detail-drawer";

export type HqTask = {
  id: string;
  title: string;
  farmId: string;
  plotId: string | null;
  status: string;
  priority: string;
  dueDate: string;
  origin: string;
  createdAt: string;
  assignedOfficerId: string | null;
  farmName: string | null;
  clientName: string | null;
  plotName: string | null;
  officerName: string | null;
  workedBy: string[];
};

const STATUS_OPTIONS = ["ALL", "DRAFT", "ASSIGNED", "AVAILABLE", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"];
const PRIORITY_OPTIONS = ["ALL", "LOW", "MEDIUM", "HIGH", "URGENT"];
const SORT_OPTIONS = [
  { value: "due", label: "Due date" },
  { value: "priority", label: "Priority" },
  { value: "recent", label: "Recently created" },
];
const BULK_STATUSES = ["ASSIGNED", "IN_PROGRESS", "BLOCKED", "CANCELLED"];

type Lookup = { query: string; setQuery: (v: string) => void; results: { id: string; name: string }[]; clear: () => void };

function LookupInput({
  label,
  placeholder,
  lookup,
  onPick,
}: {
  label: string;
  placeholder: string;
  lookup: Lookup;
  onPick: (id: string, name: string) => void;
}) {
  return (
    <div style={{ position: "relative", minWidth: 200, flex: "1 1 200px" }}>
      <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>{label}</label>
      <input
        type="search"
        className="input-field"
        aria-label={label}
        placeholder={placeholder}
        value={lookup.query}
        onChange={(e) => lookup.setQuery(e.target.value)}
        style={{ height: 34, fontSize: 12 }}
      />
      {lookup.query.trim().length >= 1 && lookup.results.length > 0 && (
        <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden", position: "absolute", zIndex: 20, width: "100%", background: "var(--surface-card)", boxShadow: "0 8px 24px rgba(0,0,0,0.12)" }}>
          {lookup.results.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(o.id, o.name);
                  lookup.clear();
                }}
                style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "8px 12px", cursor: "pointer", fontSize: 12 }}
              >
                <strong>{o.name}</strong>
                <span style={{ color: "var(--muted)", fontFamily: "var(--font-mono)" }}> • {shortId(o.id)}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function PickedChip({ name, id, onClear }: { name: string; id: string; onClear: () => void }) {
  return (
    <div style={{ minWidth: 200, flex: "1 1 200px" }}>
      <div style={{ fontSize: 11, color: "var(--muted)", marginBottom: 4 }}>&nbsp;</div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--primary)", background: "var(--green-light)", borderRadius: 8, padding: "0 8px", height: 34 }}>
        <span style={{ fontSize: 12, fontWeight: 650, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{name}</span>
        <span style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }}>{shortId(id)}</span>
        <button type="button" onClick={onClear} aria-label={`Clear ${name}`} style={{ marginLeft: "auto", background: "none", border: "none", cursor: "pointer", padding: 2 }}>
          <Icons.X size={14} />
        </button>
      </div>
    </div>
  );
}

export function HqTasksLedger() {
  const toast = useToast();
  const [status, setStatus] = useState("ALL");
  const [priority, setPriority] = useState("ALL");
  const [sort, setSort] = useState("due");
  const [overdueOnly, setOverdueOnly] = useState(false);
  const [unassignedOnly, setUnassignedOnly] = useState(false);
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [farm, setFarm] = useState<{ id: string; name: string } | null>(null);
  const [client, setClient] = useState<{ id: string; name: string } | null>(null);
  const [officer, setOfficer] = useState<{ id: string; name: string } | null>(null);
  const [drawerTaskId, setDrawerTaskId] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState<null | "assign" | "status">(null);
  const [bulkOfficer, setBulkOfficer] = useState<{ id: string; name: string } | null>(null);
  const [bulkStatus, setBulkStatus] = useState("IN_PROGRESS");
  const [bulkBusy, setBulkBusy] = useState(false);

  const farmSearch = useFarmSearch(client?.id ?? null);
  const clientSearch = useClientSearch();
  const officerSearch = useOfficerSearch(farm?.id ?? null);
  const bulkOfficerSearch = useOfficerSearch(null);

  const extraParams = useMemo(() => {
    const p: Record<string, string> = { sort };
    if (status !== "ALL") p.status = status;
    if (priority !== "ALL") p.priority = priority;
    if (farm) p.farmId = farm.id;
    if (client) p.clientId = client.id;
    if (unassignedOnly) p.officerId = "UNASSIGNED";
    else if (officer) p.officerId = officer.id;
    if (overdueOnly) p.overdueOnly = "true";
    if (dateFrom) p.dateFrom = dateFrom;
    if (dateTo) p.dateTo = dateTo;
    return p;
  }, [sort, status, priority, farm, client, officer, unassignedOnly, overdueOnly, dateFrom, dateTo]);

  const list = useServerList<HqTask>("/api/hq/tasks", { initialLimit: 25, extraParams });
  const { selected, clearSelection } = list;

  async function runBulk() {
    const ids = [...selected];
    if (!ids.length) return;
    if (bulkMode === "assign" && !bulkOfficer) {
      toast.error("Pick an officer first.");
      return;
    }
    setBulkBusy(true);
    try {
      const r = await fetch("/api/tasks/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          taskIds: ids,
          action: bulkMode === "assign" ? "ASSIGN" : "STATUS",
          ...(bulkMode === "assign" ? { assignedOfficerId: bulkOfficer!.id } : { status: bulkStatus }),
          expectedCount: ids.length,
        }),
      });
      const body = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(body.error ?? "Bulk update failed.");
      toast.success(
        bulkMode === "assign"
          ? `${body.updated} task(s) assigned to ${bulkOfficer!.name}.`
          : `${body.updated} task(s) moved to ${bulkStatus}.`
      );
      if (body.missing?.length) toast.info(`${body.missing.length} row(s) no longer exist and were skipped.`);
      setBulkMode(null);
      setBulkOfficer(null);
      list.reload();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  }

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <TasksWorkload
        farmId={farm?.id ?? null}
        clientId={client?.id ?? null}
        selectedOfficerId={unassignedOnly ? null : (officer?.id ?? null)}
        onSelect={(o) => {
          setUnassignedOnly(false);
          setOfficer(o);
        }}
      />

      <div className="compact-card" style={{ padding: 16, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {farm ? (
          <PickedChip name={farm.name} id={farm.id} onClear={() => { setFarm(null); setOfficer(null); }} />
        ) : (
          <LookupInput label="Farm (search-as-type)" placeholder="Type farm name, village, owner…" lookup={farmSearch} onPick={(id, name) => { setFarm({ id, name }); setOfficer(null); }} />
        )}
        {client ? (
          <PickedChip name={client.name} id={client.id} onClear={() => setClient(null)} />
        ) : (
          <LookupInput label="Client (search-as-type)" placeholder="Type client name, code…" lookup={clientSearch} onPick={(id, name) => setClient({ id, name })} />
        )}
        {officer && !unassignedOnly ? (
          <PickedChip name={officer.name} id={officer.id} onClear={() => setOfficer(null)} />
        ) : (
          <LookupInput label="Officer (search-as-type)" placeholder="Type officer name, email…" lookup={officerSearch} onPick={(id, name) => { setUnassignedOnly(false); setOfficer({ id, name }); }} />
        )}
        <div style={{ minWidth: 140, flex: "0 1 auto" }}>
          <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Status</label>
          <select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)} style={{ height: 34, fontSize: 12, width: "100%" }}>
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 120, flex: "0 1 auto" }}>
          <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Priority</label>
          <select aria-label="Priority filter" value={priority} onChange={(e) => setPriority(e.target.value)} style={{ height: 34, fontSize: 12, width: "100%" }}>
            {PRIORITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
        <div style={{ minWidth: 150, flex: "0 1 auto" }}>
          <label style={{ fontSize: 11, color: "var(--muted)", display: "block", marginBottom: 4 }}>Sort</label>
          <select aria-label="Sort tasks" value={sort} onChange={(e) => setSort(e.target.value)} style={{ height: 34, fontSize: 12, width: "100%" }}>
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "flex-end", flexWrap: "wrap" }}>
          <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center", height: 34 }}>
            <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
            Overdue only
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center", height: 34 }}>
            <input type="checkbox" checked={unassignedOnly} onChange={(e) => { setUnassignedOnly(e.target.checked); if (e.target.checked) setOfficer(null); }} />
            Unassigned only
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center", height: 34 }}>
            Due from <input type="date" aria-label="Due from" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} style={{ height: 30, fontSize: 12 }} />
          </label>
          <label style={{ fontSize: 12, display: "flex", gap: 6, alignItems: "center", height: 34 }}>
            Due to <input type="date" aria-label="Due to" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} style={{ height: 30, fontSize: 12 }} />
          </label>
        </div>
      </div>

      <ServerTable<HqTask>
        columns={[
          {
            key: "task", header: "Task", render: (t) => (
              <div style={{ minWidth: 220 }}>
                <button
                  type="button"
                  onClick={() => setDrawerTaskId(t.id)}
                  title="Open task detail"
                  style={{ background: "none", border: "none", padding: 0, cursor: "pointer", fontWeight: 650, fontSize: 13, textAlign: "left", color: "var(--text-main)" }}
                >
                  {t.title}
                </button>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }} title={t.id}>{shortId(t.id)}</div>
              </div>
            ),
          },
          {
            key: "farm", header: "Farm", render: (t) => (
              <div style={{ minWidth: 150 }}>
                <Link href={`/farms/${t.farmId}?tab=tasks`} style={{ fontSize: 12, fontWeight: 600 }}>{t.farmName ?? "Unknown farm"}</Link>
                <div style={{ fontSize: 11, color: "var(--muted)", fontFamily: "var(--font-mono)" }} title={t.farmId}>{shortId(t.farmId)}</div>
                {t.clientName && <div style={{ fontSize: 11, color: "var(--muted)" }}>{t.clientName}</div>}
              </div>
            ),
          },
          {
            key: "plot", header: "Plot", render: (t) => (
              <span style={{ fontSize: 12 }} title={t.plotId ?? ""}>{t.plotName ?? (t.plotId ? shortId(t.plotId) : "—")}</span>
            ),
          },
          {
            key: "officer", header: "Officer", render: (t) => (
              <div style={{ minWidth: 130 }}>
                <div style={{ fontSize: 12 }}>{t.officerName ?? "Unassigned"}</div>
                {t.workedBy.length > 0 && t.workedBy[0] !== t.officerName && (
                  <div style={{ fontSize: 11, color: "var(--muted)" }}>worked: {t.workedBy.join(", ")}</div>
                )}
              </div>
            ),
          },
          { key: "status", header: "Status", render: (t) => <StatusBadge status={t.status} /> },
          { key: "priority", header: "Priority", render: (t) => <PriorityBadge priority={t.priority} /> },
          {
            key: "due", header: "Due", render: (t) => {
              const d = overdueDays(t.dueDate);
              const overdue = d != null && d > 0 && isOpenStatus(t.status);
              return (
                <div style={{ minWidth: 110 }}>
                  <div style={{ fontSize: 12, fontFamily: "var(--font-mono)" }}>{dueLabel(t.dueDate)}</div>
                  {overdue ? (
                    <div style={{ fontSize: 11, color: "var(--red)", fontWeight: 700 }}>{d}d overdue</div>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--muted)" }}>{d === 0 ? "due today" : " "}</div>
                  )}
                </div>
              );
            },
          },
          { key: "origin", header: "Origin", render: (t) => <span style={{ fontSize: 11, fontFamily: "var(--font-mono)", color: "var(--muted)" }}>{t.origin}</span> },
        ]}
        rows={list.rows}
        total={list.total}
        page={list.page}
        limit={list.limit}
        loading={list.loading}
        error={list.error}
        search={list.search}
        onSearch={list.setSearch}
        onPage={list.setPage}
        onLimit={list.setLimit}
        onRetry={list.reload}
        searchPlaceholder="Search title, description… (server-side)"
        emptyTitle="No tasks match"
        emptyHint="Adjust filters or search. The ledger loads one server page at a time — never the whole backlog."
        bulkBar={
          selected.size > 0 ? (
            <div style={{ display: "flex", gap: 8, alignItems: "center", padding: "10px 16px", background: "var(--amber-light)", borderBottom: "1px solid var(--amber-light)", flexWrap: "wrap" }}>
              <strong style={{ fontSize: 12 }}>{selected.size} selected</strong>
              <span style={{ fontSize: 11, color: "var(--muted)" }}>Bulk moves confirm the exact selection count and are permission-checked per farm.</span>
              <button type="button" className="btn btn-secondary" onClick={() => { setBulkOfficer(null); bulkOfficerSearch.clear(); setBulkMode("assign"); }} style={{ height: 30, fontSize: 12 }}>Assign officer</button>
              <button type="button" className="btn btn-secondary" onClick={() => setBulkMode("status")} style={{ height: 30, fontSize: 12 }}>Change status</button>
              <button type="button" className="btn btn-secondary" onClick={clearSelection} style={{ height: 30, fontSize: 12 }}>Clear</button>
            </div>
          ) : undefined
        }
        selected={selected}
        onToggleSelect={list.toggleSelect}
        onTogglePage={list.toggleSelectPage}
      />

      {bulkMode && (
        <div className="modal-overlay" onClick={() => setBulkMode(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 480, padding: 20 }}>
            <h3 style={{ margin: "0 0 8px", fontSize: 16 }}>
              {bulkMode === "assign" ? `Assign ${selected.size} task(s)` : `Move ${selected.size} task(s)`}
            </h3>
            {bulkMode === "assign" ? (
              <>
                {bulkOfficer ? (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13 }}>To <strong>{bulkOfficer.name}</strong></span>
                    <button type="button" className="btn btn-secondary" onClick={() => setBulkOfficer(null)} style={{ height: 28, fontSize: 12 }}>Change</button>
                  </div>
                ) : (
                  <div style={{ position: "relative", marginBottom: 8 }}>
                    <input
                      type="search"
                      className="input-field"
                      aria-label="Search officers"
                      placeholder="Type officer name, email, phone… (min 2 chars)"
                      value={bulkOfficerSearch.query}
                      onChange={(e) => bulkOfficerSearch.setQuery(e.target.value)}
                      style={{ height: 36, fontSize: 13 }}
                    />
                    {bulkOfficerSearch.query.trim().length >= 2 && bulkOfficerSearch.results.length > 0 && (
                      <ul style={{ listStyle: "none", margin: "4px 0 0", padding: 0, border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
                        {bulkOfficerSearch.results.map((o) => (
                          <li key={o.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setBulkOfficer({ id: o.id, name: o.name });
                                bulkOfficerSearch.clear();
                              }}
                              style={{ display: "block", width: "100%", textAlign: "left", background: "transparent", border: "none", padding: "8px 12px", cursor: "pointer", fontSize: 13 }}
                            >
                              <strong>{o.name}</strong>
                              {o.email && <span style={{ color: "var(--muted)" }}> • {o.email}</span>}
                            </button>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
                <p style={{ fontSize: 12, color: "var(--muted)" }}>Only active Farm Officers with access to each task&apos;s farm are eligible — the server re-checks every farm.</p>
              </>
            ) : (
              <>
                <label style={{ fontSize: 12, display: "block", marginBottom: 8 }}>
                  Target status
                  <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} style={{ height: 36, fontSize: 13, width: "100%", marginTop: 4 }}>
                    {BULK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </label>
                <p style={{ fontSize: 12, color: "var(--muted)" }}>COMPLETED is excluded — completion requires field evidence via the execution endpoint.</p>
              </>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
              <button type="button" className="btn btn-secondary" onClick={() => setBulkMode(null)}>Cancel</button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={bulkBusy || (bulkMode === "assign" && !bulkOfficer)}
                onClick={() => void runBulk()}
              >
                {bulkBusy ? "Working…" : `Confirm (${selected.size})`}
              </button>
            </div>
          </div>
        </div>
      )}

      <TaskDetailDrawer taskId={drawerTaskId} onClose={() => setDrawerTaskId(null)} onChanged={list.reload} />
    </section>
  );
}
