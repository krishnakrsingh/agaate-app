"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { IncidentDrawer, type DrawerChanged } from "./incident-drawer";

export type HqIncident = {
  id: string;
  type: string;
  severity: string;
  pClass: "P0" | "P1" | "P2";
  status: string;
  farmId: string;
  farmName: string;
  clientName: string | null;
  plotName: string | null;
  cropName: string | null;
  reporterId: string;
  reporterName: string;
  reporterRole: string;
  createdAt: string;
  updatedAt: string;
  ageDays: number;
  ageLabel: string;
  slaBreached: boolean;
  followUpCount: number;
};

type Filters = {
  severity: string;
  status: string;
  type: string;
  farmQuery: string;
  from: string;
  to: string;
  search: string;
  sort: string;
};

const DEFAULTS: Filters = {
  severity: "ALL",
  status: "ALL",
  type: "",
  farmQuery: "",
  from: "",
  to: "",
  search: "",
  sort: "severity",
};

const PAGE_SIZE = 25;

function sevBadge(p: HqIncident["pClass"]): string {
  if (p === "P0") return "badge badge-danger";
  if (p === "P1") return "badge badge-amber";
  return "badge";
}

function statusBadge(s: string): string {
  if (s === "RESOLVED") return "badge badge-green";
  if (s === "ACKNOWLEDGED") return "badge badge-blue";
  return "badge";
}

const SEVERITY_LABELS: Record<string, string> = {
  ALL: "All severities",
  P0: "P0 — Critical",
  P1: "P1 — High",
  P2: "P2 — Medium / Low",
};

export function IncidentsCommand() {
  const [filters, setFilters] = useState<Filters>(DEFAULTS);
  const [applied, setApplied] = useState<Filters>(DEFAULTS);
  const [page, setPage] = useState(0);
  const [rows, setRows] = useState<HqIncident[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [drawerId, setDrawerId] = useState<string | null>(null);
  const [moreOpen, setMoreOpen] = useState(false);

  // Debounce text + select filters into one applied query; reset to page 1.
  useEffect(() => {
    const t = setTimeout(() => {
      setApplied(filters);
      setPage(0);
    }, 300);
    return () => clearTimeout(t);
  }, [filters]);

  useEffect(() => {
    const ctrl = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      const p = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(page * PAGE_SIZE),
        sort: applied.sort,
      });
      if (applied.severity !== "ALL") p.set("severity", applied.severity);
      if (applied.status !== "ALL") p.set("status", applied.status);
      if (applied.type.trim()) p.set("type", applied.type.trim());
      if (applied.farmQuery.trim()) p.set("farmQuery", applied.farmQuery.trim());
      if (applied.from) p.set("from", applied.from);
      if (applied.to) p.set("to", applied.to);
      if (applied.search.trim()) p.set("search", applied.search.trim());
      try {
        const res = await fetch(`/api/hq/incidents?${p.toString()}`, { signal: ctrl.signal });
        const body = await res.json().catch(() => []);
        if (!res.ok) {
          const msg =
            body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : "Unable to load incidents.";
          setError(msg);
          setRows([]);
          setTotal(0);
          return;
        }
        setRows(Array.isArray(body) ? body : []);
        setTotal(Number(res.headers.get("X-Total-Count") ?? (Array.isArray(body) ? body.length : 0)));
        setSelected(new Set());
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setError("Network error while loading incidents.");
          setRows([]);
          setTotal(0);
        }
      } finally {
        if (!ctrl.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => ctrl.abort();
  }, [applied, page]);

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function togglePage() {
    setSelected((prev) => {
      const allOnPage = rows.every((r) => prev.has(r.id));
      const next = new Set(prev);
      if (allOnPage) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => next.add(r.id));
      return next;
    });
  }

  async function bulk(status: "ACKNOWLEDGED" | "RESOLVED") {
    const ids = [...selected];
    if (!ids.length) return;
    setBulkBusy(true);
    setBulkMsg("");
    try {
      const res = await fetch("/api/incidents/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ incidentIds: ids, status, expectedCount: ids.length }),
      });
      const body = await res.json().catch(() => ({}));
      if (res.status === 409) {
        setBulkMsg("Selection changed while confirming. The list was refreshed — review and retry.");
        setApplied({ ...applied });
        setSelected(new Set());
        return;
      }
      if (!res.ok) {
        const msg =
          body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : "Bulk update failed.";
        setBulkMsg(msg);
        return;
      }
      setRows((prev) => prev.map((r) => (selected.has(r.id) ? { ...r, status } : r)));
      setSelected(new Set());
      setBulkMsg(`${(body as { updated?: number }).updated ?? ids.length} incident(s) marked ${status}.`);
    } catch {
      setBulkMsg("Network error during bulk update.");
    } finally {
      setBulkBusy(false);
    }
  }

  function applyDrawerChange(u: DrawerChanged) {
    setRows((prev) => prev.map((r) => (r.id === u.id ? { ...r, status: u.status, followUpCount: u.followUpCount } : r)));
  }

  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const from = total === 0 ? 0 : page * PAGE_SIZE + 1;
  const to = Math.min(total, page * PAGE_SIZE + rows.length);
  const allOnPage = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const set = (k: keyof Filters) => (v: string) => setFilters((f) => ({ ...f, [k]: v }));

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (filters.severity !== "ALL")
    chips.push({ key: "severity", label: `Severity: ${filters.severity}`, clear: () => set("severity")("ALL") });
  if (filters.status !== "ALL")
    chips.push({
      key: "status",
      label: `Status: ${filters.status.replaceAll("_", " ")}`,
      clear: () => set("status")("ALL"),
    });
  if (filters.type.trim()) chips.push({ key: "type", label: `Type: ${filters.type.trim()}`, clear: () => set("type")("") });
  if (filters.farmQuery.trim())
    chips.push({ key: "farm", label: `Farm / client: ${filters.farmQuery.trim()}`, clear: () => set("farmQuery")("") });
  if (filters.from || filters.to)
    chips.push({
      key: "dates",
      label: `Dates: ${filters.from || "…"} → ${filters.to || "…"}`,
      clear: () => setFilters((f) => ({ ...f, from: "", to: "" })),
    });

  return (
    <div className="dir-root">
      {/* Toolbar */}
      <div className="dir-toolbar">
        <div className="dir-search">
          <Icons.Search size={14} className="dir-search-icon" />
          <input
            className="input-field dir-search-input"
            value={filters.search}
            onChange={(e) => set("search")(e.target.value)}
            placeholder="Search incidents…"
            aria-label="Search incidents by ID, type or reporter"
          />
          {filters.search && (
            <button type="button" className="dir-search-clear" onClick={() => set("search")("")} aria-label="Clear search">
              <Icons.X size={13} />
            </button>
          )}
        </div>

        <div className="dir-controls">
          <select
            className="input-field dir-select"
            value={filters.severity}
            onChange={(e) => set("severity")(e.target.value)}
            aria-label="Filter by severity"
          >
            {Object.keys(SEVERITY_LABELS).map((s) => (
              <option key={s} value={s}>
                {SEVERITY_LABELS[s]}
              </option>
            ))}
          </select>

          <select
            className="input-field dir-select"
            value={filters.status}
            onChange={(e) => set("status")(e.target.value)}
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <option value="OPEN">Open</option>
            <option value="ACKNOWLEDGED">Acknowledged</option>
            <option value="RESOLVED">Resolved</option>
            <option value="CLOSED">Closed</option>
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
                  <label className="dir-popover-field">
                    Incident type
                    <input
                      className="input-field"
                      value={filters.type}
                      onChange={(e) => set("type")(e.target.value)}
                      placeholder="e.g. Pest Damage"
                    />
                  </label>
                  <label className="dir-popover-field">
                    Farm / client
                    <input
                      className="input-field"
                      value={filters.farmQuery}
                      onChange={(e) => set("farmQuery")(e.target.value)}
                      placeholder="Farm or client name"
                    />
                  </label>
                  <div className="dir-popover-field">
                    <span>Date range</span>
                    <div style={{ display: "flex", gap: 8 }}>
                      <input
                        type="date"
                        className="input-field"
                        aria-label="From date"
                        value={filters.from}
                        onChange={(e) => set("from")(e.target.value)}
                      />
                      <input
                        type="date"
                        className="input-field"
                        aria-label="To date"
                        value={filters.to}
                        min={filters.from || undefined}
                        onChange={(e) => set("to")(e.target.value)}
                      />
                    </div>
                  </div>
                  {chips.length > 0 && (
                    <>
                      <div className="dir-popover-divider" />
                      <button
                        type="button"
                        role="menuitem"
                        className="dir-popover-item danger"
                        onClick={() => {
                          setFilters(DEFAULTS);
                          setMoreOpen(false);
                        }}
                      >
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
            value={filters.sort}
            onChange={(e) => set("sort")(e.target.value)}
            aria-label="Sort incidents"
          >
            <option value="severity">Severity, then newest</option>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
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
          <button
            type="button"
            className="dir-chip-clear"
            onClick={() => {
              setFilters(DEFAULTS);
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Bulk bar */}
      {selected.size > 0 && (
        <div className="dir-bulkbar">
          <strong>{selected.size} selected</strong>
          <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => void bulk("ACKNOWLEDGED")}>
            Acknowledge
          </button>
          <button type="button" className="btn btn-primary btn-sm" disabled={bulkBusy} onClick={() => void bulk("RESOLVED")}>
            Resolve
          </button>
          <button type="button" className="dir-chip-clear" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
          {bulkBusy && <span className="dir-muted">Saving…</span>}
        </div>
      )}
      {bulkMsg && (
        <div className="dir-count" role="status">
          {bulkMsg}
        </div>
      )}

      {/* Count */}
      {!error && (
        <div className="dir-count">
          <strong>{total.toLocaleString()}</strong> incident{total === 1 ? "" : "s"}
          {chips.length > 0 ? " matching filters" : ""}
          {pages > 1 ? ` · Page ${page + 1} of ${pages}` : ""}
        </div>
      )}

      {/* Table */}
      <div className="dir-table-card">
        <div className="dir-table-scroll">
          <table className="dir-table">
            <thead>
              <tr>
                <th className="dir-check-col">
                  <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all on page" />
                </th>
                <th>Incident</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Farm</th>
                <th>Reporter</th>
                <th>Status</th>
                <th>Age / SLA</th>
                <th className="dir-num">Follow-ups</th>
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="dir-state-cell">
                    <Icons.Spinner size={16} className="spin" /> Loading incidents…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} className="dir-state-cell">
                    <div className="dir-state-title">Couldn’t load incidents</div>
                    <p className="dir-state-hint">{error}</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setApplied({ ...applied })}>
                      Retry
                    </button>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="dir-state-cell">
                    <div className="dir-state-title">No incidents found</div>
                    <p className="dir-state-hint">Try widening the date range or clearing the filters.</p>
                    {chips.length > 0 && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={() => setFilters(DEFAULTS)}>
                        Clear all
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr
                    key={r.id}
                    className="dir-row"
                    style={r.slaBreached ? { background: "var(--red-light)" } : undefined}
                  >
                    <td className="dir-check-col">
                      <input
                        type="checkbox"
                        checked={selected.has(r.id)}
                        onChange={() => toggle(r.id)}
                        aria-label={`Select ${r.id}`}
                      />
                    </td>
                    <td>
                      <div className="dir-identity">
                        <button
                          type="button"
                          className="dir-name"
                          title={r.id}
                          onClick={() => setDrawerId(r.id)}
                          style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                        >
                          {r.id.slice(-6).toUpperCase()}
                        </button>
                        <span className="dir-muted" style={{ fontSize: 11 }}>
                          {new Date(r.createdAt).toLocaleDateString()}
                          {r.plotName ? ` · ${r.plotName}` : ""}
                        </span>
                      </div>
                    </td>
                    <td style={{ maxWidth: 220 }}>{r.type}</td>
                    <td>
                      <span className={sevBadge(r.pClass)}>{r.pClass}</span>
                      <div className="dir-muted" style={{ fontSize: 11 }}>
                        {r.severity}
                      </div>
                    </td>
                    <td>
                      <Link href={`/farms/${r.farmId}`} className="dir-name" style={{ display: "inline" }}>
                        {r.farmName}
                      </Link>
                      {r.clientName && (
                        <div className="dir-muted" style={{ fontSize: 11 }}>
                          {r.clientName}
                        </div>
                      )}
                    </td>
                    <td>
                      <button
                        type="button"
                        className="dir-name"
                        title="Filter by this reporter"
                        onClick={() => set("search")(r.reporterName)}
                        style={{ background: "none", border: "none", padding: 0, cursor: "pointer", textAlign: "left" }}
                      >
                        {r.reporterName}
                      </button>
                      <div className="dir-muted" style={{ fontSize: 11 }}>
                        {r.reporterRole.replaceAll("_", " ")}
                      </div>
                    </td>
                    <td>
                      <span className={statusBadge(r.status)}>{r.status.replaceAll("_", " ")}</span>
                    </td>
                    <td>
                      {r.ageLabel}
                      {r.slaBreached && (
                        <div>
                          <span className="badge badge-danger">SLA breached</span>
                        </div>
                      )}
                    </td>
                    <td className="dir-num">{r.followUpCount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {!error && pages > 1 && (
        <div className="dir-pagination">
          <span>
            Showing {from}–{to} of {total.toLocaleString()}
          </span>
          <div className="dir-pagination-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page === 0 || loading}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
            >
              <Icons.ChevronLeft size={13} /> Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page + 1 >= pages || loading}
              onClick={() => setPage((p) => p + 1)}
            >
              Next <Icons.ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}

      {drawerId && (
        <IncidentDrawer incidentId={drawerId} onClose={() => setDrawerId(null)} onChanged={applyDrawerChange} />
      )}
    </div>
  );
}
