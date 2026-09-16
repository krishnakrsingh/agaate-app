"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useServerList } from "@/components/data/use-server-list";
import { StatusBadge, PriorityBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { Icons } from "@/components/icons";
import { useFarmSearch, useClientSearch } from "@modules/people/ui/people-drawers";
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
    <div style={{ position: "relative" }}>
      <label className="dir-popover-field-label">{label}</label>
      <input
        type="search"
        className="input-field"
        aria-label={label}
        placeholder={placeholder}
        value={lookup.query}
        onChange={(e) => lookup.setQuery(e.target.value)}
        style={{ height: 34, minHeight: 34, fontSize: 13 }}
      />
      {lookup.query.trim().length >= 1 && lookup.results.length > 0 && (
        <ul className="dir-lookup-list">
          {lookup.results.map((o) => (
            <li key={o.id}>
              <button
                type="button"
                onClick={() => {
                  onPick(o.id, o.name);
                  lookup.clear();
                }}
                className="dir-lookup-item"
              >
                <strong>{o.name}</strong>
                <span className="dir-code"> • {shortId(o.id)}</span>
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
    <div style={{ position: "relative" }}>
      <label className="dir-popover-field-label">&nbsp;</label>
      <div className="dir-picked">
        <span className="dir-name" style={{ fontSize: 12 }}>
          {name}
        </span>
        <span className="dir-code">{shortId(id)}</span>
        <button type="button" onClick={onClear} aria-label={`Clear ${name}`} className="dir-picked-clear">
          <Icons.X size={13} />
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
  const [moreOpen, setMoreOpen] = useState(false);

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

  function resetFilters() {
    setStatus("ALL");
    setPriority("ALL");
    setFarm(null);
    setClient(null);
    setOfficer(null);
    setUnassignedOnly(false);
    setOverdueOnly(false);
    setDateFrom("");
    setDateTo("");
  }

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (status !== "ALL") chips.push({ key: "status", label: `Status: ${status}`, clear: () => setStatus("ALL") });
  if (priority !== "ALL") chips.push({ key: "priority", label: `Priority: ${priority}`, clear: () => setPriority("ALL") });
  if (farm) chips.push({ key: "farm", label: `Farm: ${farm.name}`, clear: () => { setFarm(null); setOfficer(null); } });
  if (client) chips.push({ key: "client", label: `Client: ${client.name}`, clear: () => setClient(null) });
  if (officer && !unassignedOnly) chips.push({ key: "officer", label: `Officer: ${officer.name}`, clear: () => setOfficer(null) });
  if (unassignedOnly) chips.push({ key: "unassigned", label: "Unassigned only", clear: () => setUnassignedOnly(false) });
  if (overdueOnly) chips.push({ key: "overdue", label: "Overdue only", clear: () => setOverdueOnly(false) });
  if (dateFrom || dateTo)
    chips.push({
      key: "dates",
      label: `Due: ${dateFrom || "…"} → ${dateTo || "…"}`,
      clear: () => { setDateFrom(""); setDateTo(""); },
    });

  const total = list.total ?? 0;
  const totalPages = list.total != null ? Math.max(1, Math.ceil(list.total / list.limit)) : 1;
  const from = list.rows.length ? (list.page - 1) * list.limit + 1 : 0;
  const to = (list.page - 1) * list.limit + list.rows.length;
  const allOnPage = list.rows.length > 0 && list.rows.every((r) => selected.has(r.id));

  return (
    <section className="dir-root">
      <TasksWorkload
        farmId={farm?.id ?? null}
        clientId={client?.id ?? null}
        selectedOfficerId={unassignedOnly ? null : (officer?.id ?? null)}
        onSelect={(o) => {
          setUnassignedOnly(false);
          setOfficer(o);
        }}
      />

      {/* Toolbar */}
      <div className="dir-toolbar">
        <div className="dir-search">
          <Icons.Search size={14} className="dir-search-icon" />
          <input
            className="input-field dir-search-input"
            value={list.search}
            onChange={(e) => list.setSearch(e.target.value)}
            placeholder="Search tasks…"
            aria-label="Search tasks by title or description"
          />
          {list.search && (
            <button type="button" className="dir-search-clear" onClick={() => list.setSearch("")} aria-label="Clear search">
              <Icons.X size={13} />
            </button>
          )}
        </div>

        <div className="dir-controls">
          <select
            className="input-field dir-select"
            aria-label="Status filter"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <select
            className="input-field dir-select"
            aria-label="Priority filter"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            {PRIORITY_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <div className="dir-popover-wrap">
            <button
              type="button"
              className={`btn btn-secondary btn-sm dir-more-btn ${moreOpen ? "active" : ""}`}
              onClick={() => setMoreOpen((v) => !v)}
              aria-expanded={moreOpen}
              aria-haspopup="menu"
            >
              <Icons.SlidersHorizontal size={13} />
              <span>More filters</span>
              <Icons.ChevronDown size={12} />
            </button>
            {moreOpen && (
              <>
                <button
                  type="button"
                  className="dir-popover-backdrop"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setMoreOpen(false)}
                />
                <div role="menu" className="dir-popover dir-popover-wide" onKeyDown={(e) => e.key === "Escape" && setMoreOpen(false)}>
                  <div className="dir-popover-body">
                    {farm ? (
                      <PickedChip name={farm.name} id={farm.id} onClear={() => { setFarm(null); setOfficer(null); }} />
                    ) : (
                      <LookupInput
                        label="Farm"
                        placeholder="Type farm name, village, owner…"
                        lookup={farmSearch}
                        onPick={(id, name) => { setFarm({ id, name }); setOfficer(null); }}
                      />
                    )}
                    {client ? (
                      <PickedChip name={client.name} id={client.id} onClear={() => setClient(null)} />
                    ) : (
                      <LookupInput
                        label="Client"
                        placeholder="Type client name, code…"
                        lookup={clientSearch}
                        onPick={(id, name) => setClient({ id, name })}
                      />
                    )}
                    {officer && !unassignedOnly ? (
                      <PickedChip name={officer.name} id={officer.id} onClear={() => setOfficer(null)} />
                    ) : (
                      <LookupInput
                        label="Officer"
                        placeholder="Type officer name, email…"
                        lookup={officerSearch}
                        onPick={(id, name) => { setUnassignedOnly(false); setOfficer({ id, name }); }}
                      />
                    )}

                    <div style={{ display: "flex", gap: 16, flexWrap: "wrap", paddingTop: 2 }}>
                      <label className="dir-check">
                        <input type="checkbox" checked={overdueOnly} onChange={(e) => setOverdueOnly(e.target.checked)} />
                        Overdue only
                      </label>
                      <label className="dir-check">
                        <input
                          type="checkbox"
                          checked={unassignedOnly}
                          onChange={(e) => { setUnassignedOnly(e.target.checked); if (e.target.checked) setOfficer(null); }}
                        />
                        Unassigned only
                      </label>
                    </div>

                    <div className="dir-popover-field">
                      <span>Due date range</span>
                      <div style={{ display: "flex", gap: 8 }}>
                        <input
                          type="date"
                          className="input-field"
                          aria-label="Due from"
                          value={dateFrom}
                          max={dateTo || undefined}
                          onChange={(e) => setDateFrom(e.target.value)}
                        />
                        <input
                          type="date"
                          className="input-field"
                          aria-label="Due to"
                          value={dateTo}
                          min={dateFrom || undefined}
                          onChange={(e) => setDateTo(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                  {chips.length > 0 && (
                    <>
                      <div className="dir-popover-divider" />
                      <button type="button" role="menuitem" className="dir-popover-item danger" onClick={resetFilters}>
                        <Icons.X size={13} /> Reset all filters
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        <div className="dir-sort">
          <span className="dir-sort-label">Sort:</span>
          <select
            className="input-field dir-select"
            aria-label="Sort tasks"
            value={sort}
            onChange={(e) => setSort(e.target.value)}
          >
            {SORT_OPTIONS.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        </div>
      </div>

      {/* Active filter chips */}
      {chips.length > 0 && (
        <div className="dir-chips">
          {chips.map((chip) => (
            <span key={chip.key} className="dir-chip">
              {chip.label}
              <button type="button" onClick={chip.clear} aria-label={`Remove ${chip.label} filter`}>
                <Icons.X size={11} />
              </button>
            </span>
          ))}
          <button type="button" className="dir-chip-clear" onClick={resetFilters}>
            Clear all
          </button>
        </div>
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="dir-bulkbar">
          <strong>{selected.size} selected</strong>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => { setBulkOfficer(null); bulkOfficerSearch.clear(); setBulkMode("assign"); }}
          >
            Assign officer
          </button>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setBulkMode("status")}>
            Change status
          </button>
          <button type="button" className="dir-chip-clear" onClick={clearSelection}>
            Clear selection
          </button>
        </div>
      )}

      {/* Count */}
      {!list.error && (
        <div className="dir-count">
          <strong>{total.toLocaleString()}</strong> task{total === 1 ? "" : "s"}
          {chips.length > 0 ? " matching filters" : ""}
          {totalPages > 1 ? ` · Page ${list.page} of ${totalPages}` : ""}
        </div>
      )}

      {/* Table */}
      <div className="dir-table-card">
        <div className="dir-table-scroll">
          <table className="dir-table">
            <thead>
              <tr>
                <th className="dir-check-col">
                  <input
                    type="checkbox"
                    aria-label="Select page"
                    checked={allOnPage}
                    onChange={() => list.toggleSelectPage(list.rows.map((r) => r.id))}
                  />
                </th>
                <th>Task</th>
                <th>Farm</th>
                <th>Plot</th>
                <th>Officer</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Due</th>
                <th>Origin</th>
              </tr>
            </thead>
            <tbody>
              {list.loading && list.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="dir-state-cell">
                    <Icons.Spinner size={16} className="spin" /> Loading tasks…
                  </td>
                </tr>
              ) : list.error ? (
                <tr>
                  <td colSpan={9} className="dir-state-cell">
                    <div className="dir-state-title">Couldn’t load tasks</div>
                    <p className="dir-state-hint">{list.error}</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={list.reload}>
                      Retry
                    </button>
                  </td>
                </tr>
              ) : list.rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="dir-state-cell">
                    <div className="dir-state-title">No tasks found</div>
                    <p className="dir-state-hint">Try changing your search or filters.</p>
                    {chips.length > 0 && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>
                        Clear all
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                list.rows.map((t) => {
                  const d = overdueDays(t.dueDate);
                  const overdue = d != null && d > 0 && isOpenStatus(t.status);
                  return (
                    <tr key={t.id} className="dir-row">
                      <td className="dir-check-col">
                        <input
                          type="checkbox"
                          aria-label="Select row"
                          checked={selected.has(t.id)}
                          onChange={() => list.toggleSelect(t.id)}
                        />
                      </td>
                      <td>
                        <div className="dir-identity">
                          <button
                            type="button"
                            className="dir-name"
                            title="Open task detail"
                            onClick={() => setDrawerTaskId(t.id)}
                            style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                          >
                            {t.title}
                          </button>
                          <span className="dir-code" title={t.id}>
                            {shortId(t.id)}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="dir-identity">
                          <Link href={`/farms/${t.farmId}?tab=tasks`} className="dir-name">
                            {t.farmName ?? "Unknown farm"}
                          </Link>
                          <span className="dir-muted-soft" style={{ fontSize: 11 }}>
                            {t.clientName ?? shortId(t.farmId)}
                          </span>
                        </div>
                      </td>
                      <td className="dir-muted" style={{ fontSize: 12 }}>
                        {t.plotName ?? (t.plotId ? shortId(t.plotId) : "—")}
                      </td>
                      <td>
                        <div className="dir-identity">
                          <span className="dir-sub" style={{ color: "var(--ink)" }}>
                            {t.officerName ?? "Unassigned"}
                          </span>
                          {t.workedBy.length > 0 && t.workedBy[0] !== t.officerName && (
                            <span className="dir-muted-soft" style={{ fontSize: 11 }}>
                              worked: {t.workedBy.join(", ")}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        <StatusBadge status={t.status} />
                      </td>
                      <td>
                        <PriorityBadge priority={t.priority} />
                      </td>
                      <td>
                        <div className="dir-identity">
                          <span className="dir-code" style={{ fontSize: 12, color: "var(--ink)" }}>
                            {dueLabel(t.dueDate)}
                          </span>
                          {overdue ? (
                            <span style={{ fontSize: 11, color: "var(--red)", fontWeight: 700 }}>{d}d overdue</span>
                          ) : (
                            <span className="dir-muted-soft" style={{ fontSize: 11 }}>
                              {d === 0 ? "due today" : ""}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="dir-muted-soft" style={{ fontSize: 11 }}>
                        {t.origin}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!list.error && totalPages > 1 && (
        <div className="dir-pagination">
          <span>
            Showing {from}–{to} of {total.toLocaleString()}
          </span>
          <div className="dir-pagination-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={list.page <= 1}
              onClick={() => list.setPage(list.page - 1)}
            >
              <Icons.ChevronLeft size={13} /> Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={list.total != null && list.page >= totalPages}
              onClick={() => list.setPage(list.page + 1)}
            >
              Next <Icons.ChevronRight size={13} />
            </button>
            <select
              className="input-field dir-select"
              aria-label="Rows per page"
              value={list.limit}
              onChange={(e) => list.setLimit(Number(e.target.value))}
            >
              {[10, 25, 50, 100].map((n) => <option key={n} value={n}>{n} / page</option>)}
            </select>
          </div>
        </div>
      )}

      {/* Bulk modal */}
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
                      <ul className="dir-lookup-list">
                        {bulkOfficerSearch.results.map((o) => (
                          <li key={o.id}>
                            <button
                              type="button"
                              onClick={() => {
                                setBulkOfficer({ id: o.id, name: o.name });
                                bulkOfficerSearch.clear();
                              }}
                              className="dir-lookup-item"
                            >
                              <strong>{o.name}</strong>
                              {o.email && <span className="dir-muted"> • {o.email}</span>}
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
