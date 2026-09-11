"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="card" style={{ gap: 12 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: 10 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Severity</label>
            <select value={filters.severity} onChange={(e) => set("severity")(e.target.value)}>
              <option value="ALL">All severities</option>
              <option value="P0">P0 — Critical</option>
              <option value="P1">P1 — High</option>
              <option value="P2">P2 — Medium / Low</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Status</label>
            <select value={filters.status} onChange={(e) => set("status")(e.target.value)}>
              <option value="ALL">All statuses</option>
              <option value="OPEN">Open</option>
              <option value="ACKNOWLEDGED">Acknowledged</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Type</label>
            <input value={filters.type} onChange={(e) => set("type")(e.target.value)} placeholder="e.g. Pest Damage" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Farm / Client</label>
            <input value={filters.farmQuery} onChange={(e) => set("farmQuery")(e.target.value)} placeholder="Farm or client name" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>From</label>
            <input type="date" value={filters.from} onChange={(e) => set("from")(e.target.value)} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>To</label>
            <input type="date" value={filters.to} onChange={(e) => set("to")(e.target.value)} min={filters.from || undefined} />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Search</label>
            <input value={filters.search} onChange={(e) => set("search")(e.target.value)} placeholder="ID, type, reporter…" />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Sort</label>
            <select value={filters.sort} onChange={(e) => set("sort")(e.target.value)}>
              <option value="severity">Severity, then newest</option>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setFilters(DEFAULTS)}>
            Reset filters
          </button>
          <span className="muted" style={{ fontSize: "0.8rem" }}>
            Showing {from}–{to} of {total}
          </span>
        </div>
      </div>

      {selected.size > 0 && (
        <div className="callout" style={{ flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 10 }}>
          <strong>{selected.size} selected</strong>
          <button type="button" className="btn btn-sm btn-secondary" disabled={bulkBusy} onClick={() => void bulk("ACKNOWLEDGED")}>
            Acknowledge
          </button>
          <button type="button" className="btn btn-sm btn-primary" disabled={bulkBusy} onClick={() => void bulk("RESOLVED")}>
            Resolve
          </button>
          <button type="button" className="btn btn-sm btn-ghost" disabled={bulkBusy} onClick={() => setSelected(new Set())}>
            Clear
          </button>
          {bulkBusy && <span className="muted">Saving…</span>}
        </div>
      )}
      {bulkMsg && (
        <div className="hint">
          <span>{bulkMsg}</span>
        </div>
      )}

      {error && (
        <div className="error">
          <span>{error}</span>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setApplied({ ...applied })}>
            Retry
          </button>
        </div>
      )}

      {!error && loading && rows.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">Loading incidents…</div>
        </div>
      )}

      {!error && !loading && rows.length === 0 && (
        <div className="empty-state">
          <div className="empty-state-title">No incidents match these filters</div>
          <p className="empty-state-desc">Try widening the date range or clearing the search.</p>
          <button type="button" className="btn btn-sm btn-secondary" onClick={() => setFilters(DEFAULTS)}>
            Reset filters
          </button>
        </div>
      )}

      {rows.length > 0 && (
        <div className="table-container">
          <table className="data-table">
            <thead>
              <tr>
                <th>
                  <input type="checkbox" checked={allOnPage} onChange={togglePage} aria-label="Select all on page" />
                </th>
                <th>Incident ID</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Farm</th>
                <th>Reporter</th>
                <th>Status</th>
                <th>Age / SLA</th>
                <th>Follow-ups</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} style={r.slaBreached ? { background: "var(--red-light)" } : undefined}>
                  <td>
                    <input type="checkbox" checked={selected.has(r.id)} onChange={() => toggle(r.id)} aria-label={`Select ${r.id}`} />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-link"
                      title={r.id}
                      onClick={() => setDrawerId(r.id)}
                      style={{ fontSize: "0.85rem" }}
                    >
                      {r.id.slice(-6).toUpperCase()}
                    </button>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>
                      {new Date(r.createdAt).toLocaleDateString()}
                      {r.plotName ? ` · ${r.plotName}` : ""}
                    </div>
                  </td>
                  <td style={{ maxWidth: 220 }}>{r.type}</td>
                  <td>
                    <span className={sevBadge(r.pClass)}>{r.pClass}</span>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{r.severity}</div>
                  </td>
                  <td>
                    <Link href={`/farms/${r.farmId}`}>{r.farmName}</Link>
                    {r.clientName && <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{r.clientName}</div>}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="btn-link"
                      title="Filter by this reporter"
                      onClick={() => setFilters((f) => ({ ...f, search: r.reporterName }))}
                      style={{ fontSize: "0.85rem" }}
                    >
                      {r.reporterName}
                    </button>
                    <div style={{ fontSize: "0.72rem", color: "var(--text-muted)" }}>{r.reporterRole.replaceAll("_", " ")}</div>
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
                  <td>{r.followUpCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {pages > 1 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "flex-end" }}>
          <span className="muted" style={{ fontSize: "0.82rem" }}>
            Page {page + 1} of {pages}
          </span>
          <button type="button" className="btn btn-sm btn-secondary" disabled={page === 0 || loading} onClick={() => setPage((p) => Math.max(0, p - 1))}>
            Previous
          </button>
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            disabled={page + 1 >= pages || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      )}

      {drawerId && (
        <IncidentDrawer incidentId={drawerId} onClose={() => setDrawerId(null)} onChanged={applyDrawerChange} />
      )}
    </div>
  );
}
