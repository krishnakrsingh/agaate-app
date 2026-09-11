"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";

interface ClientRow {
  id: string;
  code: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  state: string | null;
  district: string | null;
  status: string;
  updatedAt: string;
  farmCount: number;
  plotCount: number;
  officerCount: number;
  totalAcreage: number;
}

interface SavedView {
  name: string;
  v: { search: string; status: string; state: string; sort: string };
}

const LIMIT = 20;
const BULK_MAX = 50;

function loadViews(): SavedView[] {
  try {
    return JSON.parse(localStorage.getItem("hq-client-views-v1") || "[]");
  } catch {
    return [];
  }
}

function StatusPill({ status }: { status: string }) {
  const s = status.toUpperCase();
  const map: Record<string, { bg: string; color: string; label: string }> = {
    ACTIVE:    { bg: "rgba(34,197,94,0.12)",  color: "#16a34a", label: "Active" },
    INACTIVE:  { bg: "rgba(239,68,68,0.10)",  color: "#dc2626", label: "Inactive" },
    SUSPENDED: { bg: "rgba(234,179,8,0.13)",  color: "#b45309", label: "Suspended" },
  };
  const style = map[s] ?? { bg: "var(--surface-strong)", color: "var(--muted)", label: s };
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5,
      padding: "3px 9px", borderRadius: 99, fontSize: 11, fontWeight: 600,
      background: style.bg, color: style.color, letterSpacing: "0.02em",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: style.color, display: "inline-block" }} />
      {style.label}
    </span>
  );
}

export function ClientDirectory() {
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("");
  const [debouncedState, setDebouncedState] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState<string | null>(null);

  useEffect(() => { setSavedViews(loadViews()); }, []);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search.trim()); setPage(1); }, 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedState(stateFilter.trim()); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [stateFilter]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ limit: String(LIMIT), offset: String((page - 1) * LIMIT), sortBy });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (debouncedState) params.set("state", debouncedState);

    fetch(`/api/hq/clients?${params}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json().catch(() => null))?.error || "Failed to load clients.");
        return res.json();
      })
      .then((d) => { setRows(Array.isArray(d.clients) ? d.clients : []); setTotal(Number(d.total) || 0); setSelected(new Set()); })
      .catch((e) => { setRows([]); setError(e instanceof Error ? e.message : "Failed to load clients."); })
      .finally(() => setLoading(false));
  }, [debouncedSearch, statusFilter, debouncedState, sortBy, page]);

  useEffect(() => { load(); }, [load]);

  const applyPreset = (p: Partial<{ search: string; status: string; state: string; sort: string }>) => {
    setSearch(p.search ?? ""); setStatusFilter(p.status ?? "ALL"); setStateFilter(p.state ?? "");
    if (p.sort) setSortBy(p.sort); setPage(1);
  };

  const saveView = () => {
    const name = prompt("Save current filters as view:");
    if (!name?.trim()) return;
    const next = [...savedViews, { name: name.trim(), v: { search, status: statusFilter, state: stateFilter, sort: sortBy } }];
    setSavedViews(next);
    try { localStorage.setItem("hq-client-views-v1", JSON.stringify(next)); } catch { /* storage unavailable */ }
  };

  const toggleOne = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else if (next.size < BULK_MAX) next.add(id);
    return next;
  });

  const togglePage = () => setSelected((prev) => {
    const allOnPage = rows.every((r) => prev.has(r.id));
    const next = new Set(prev);
    if (allOnPage) rows.forEach((r) => next.delete(r.id));
    else rows.forEach((r) => { if (next.size < BULK_MAX) next.add(r.id); });
    return next;
  });

  const bulkStatus = async (status: "ACTIVE" | "INACTIVE") => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Set ${ids.length} client(s) to ${status}?`)) return;
    setBulkBusy(true); setBulkMsg(null);
    try {
      const res = await fetch("/api/hq/clients", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ids, status }) });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Bulk update failed.");
      setBulkMsg(`Updated ${body.updated} client(s) to ${status}.`);
      load();
    } catch (e) {
      setBulkMsg(e instanceof Error ? e.message : "Bulk update failed.");
    } finally { setBulkBusy(false); }
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;
  const filtersActive = !!search || statusFilter !== "ALL" || !!stateFilter || sortBy !== "name";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* ── Toolbar ── */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        {/* Search */}
        <div style={{ position: "relative", flexGrow: 1, flexShrink: 1, flexBasis: 220, maxWidth: 340 }}>
          <Icons.Search size={13} style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--muted)", pointerEvents: "none" }} />
          <input
            className="input-field"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, phone, code…"
            style={{ paddingLeft: 30, width: "100%", fontSize: 13 }}
          />
          {search && (
            <button type="button" onClick={() => setSearch("")} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", display: "flex" }}>
              <Icons.X size={12} />
            </button>
          )}
        </div>

        {/* State */}
        <input
          className="input-field"
          value={stateFilter}
          onChange={(e) => setStateFilter(e.target.value)}
          placeholder="State"
          style={{ width: 120, fontSize: 13 }}
          title="Exact state match"
        />

        {/* Status */}
        <select className="input-field" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }} style={{ width: "auto", fontSize: 13 }}>
          <option value="ALL">All statuses</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="SUSPENDED">Suspended</option>
        </select>

        {/* Sort */}
        <select className="input-field" value={sortBy} onChange={(e) => { setSortBy(e.target.value); setPage(1); }} style={{ width: "auto", fontSize: 13 }}>
          <option value="name">Name A–Z</option>
          <option value="farms">Most farms</option>
          <option value="acreage">Most acreage</option>
          <option value="recent">Recently active</option>
        </select>

        <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center" }}>
          {filtersActive && (
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset({})}>
              <Icons.X size={12} /> Clear
            </button>
          )}
          <button type="button" className="btn btn-secondary btn-sm" onClick={saveView}>Save view</button>
        </div>
      </div>

      {/* ── Quick views ── */}
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
        {[
          { label: "All", preset: {} },
          { label: "Largest active", preset: { status: "ACTIVE", sort: "acreage" } },
          { label: "Inactive", preset: { status: "INACTIVE" } },
        ].map(({ label, preset }) => (
          <button key={label} type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset(preset)}>
            {label}
          </button>
        ))}
        {savedViews.map((sv) => (
          <span key={sv.name} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => { setSearch(sv.v.search); setStatusFilter(sv.v.status); setStateFilter(sv.v.state); setSortBy(sv.v.sort); setPage(1); }}>
              {sv.name}
            </button>
            <button type="button" onClick={() => {
              const next = savedViews.filter((x) => x.name !== sv.name);
              setSavedViews(next);
              try { localStorage.setItem("hq-client-views-v1", JSON.stringify(next)); } catch { /* unavailable */ }
            }} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", display: "flex", padding: 2 }} title={`Delete ${sv.name}`}>
              <Icons.X size={11} />
            </button>
          </span>
        ))}
      </div>

      {/* ── Bulk action bar ── */}
      {selected.size > 0 && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", padding: "8px 14px", background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-md)", fontSize: 13 }}>
          <strong>{selected.size} selected</strong>
          <span className="muted" style={{ fontSize: 12 }}>max {BULK_MAX}</span>
          <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => bulkStatus("ACTIVE")}>Set Active</button>
          <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={() => bulkStatus("INACTIVE")}>Set Inactive</button>
          <button type="button" onClick={() => setSelected(new Set())} style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: 12 }}>Clear</button>
          {bulkMsg && <span className="muted" style={{ fontSize: 12 }}>{bulkMsg}</span>}
        </div>
      )}

      {/* ── Result count ── */}
      {!loading && !error && (
        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          {total.toLocaleString()} client{total !== 1 ? "s" : ""}
          {filtersActive ? " match your filters" : ""}
          {total > LIMIT ? ` — page ${page} of ${totalPages}` : ""}
        </div>
      )}

      {/* ── Table ── */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--line)", borderRadius: "var(--radius-lg)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table className="table" style={{ width: "100%", minWidth: 700, fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input type="checkbox" checked={rows.length > 0 && rows.every((r) => selected.has(r.id))} onChange={togglePage} aria-label="Select page" />
                </th>
                <th>Client</th>
                <th>Phone</th>
                <th>Location</th>
                <th style={{ textAlign: "right" }}>Farms</th>
                <th style={{ textAlign: "right" }}>Plots</th>
                <th style={{ textAlign: "right" }}>Acreage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>Loading…</td></tr>
              ) : error ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 48 }}>
                  <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Could not load clients</div>
                  <p className="muted" style={{ fontSize: 12, margin: "0 0 12px" }}>{error}</p>
                  <button type="button" className="btn btn-secondary btn-sm" onClick={load}>Retry</button>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={8} style={{ textAlign: "center", padding: 48 }}>
                  <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>No clients match</div>
                  <p className="muted" style={{ fontSize: 12, margin: 0 }}>Try adjusting the filters.</p>
                </td></tr>
              ) : rows.map((c) => (
                <tr key={c.id} style={{ cursor: "default" }}>
                  <td>
                    <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggleOne(c.id)} aria-label={`Select ${c.name}`} />
                  </td>
                  <td>
                    <Link href={`/hq/clients/${c.id}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                      {c.name}
                    </Link>
                    {c.companyName && <div className="muted" style={{ fontSize: 11 }}>{c.companyName}</div>}
                    <div className="muted" style={{ fontSize: 11, fontFamily: "var(--font-mono)" }}>{c.code}</div>
                  </td>
                  <td style={{ color: "var(--muted)", fontSize: 12 }}>{c.phone || "—"}</td>
                  <td>
                    {c.state ? <span>{c.state}</span> : <span className="muted">—</span>}
                    {c.district && <div className="muted" style={{ fontSize: 11 }}>{c.district}</div>}
                  </td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{c.farmCount}</td>
                  <td style={{ textAlign: "right", fontWeight: 600 }}>{c.plotCount}</td>
                  <td style={{ textAlign: "right", fontFamily: "var(--font-mono)", fontSize: 12 }}>{c.totalAcreage.toFixed(1)} ac</td>
                  <td><StatusPill status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {total > LIMIT && (
          <div style={{ padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", fontSize: 12, color: "var(--muted)" }}>
            <span>Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total.toLocaleString()}</span>
            <div style={{ display: "flex", gap: 6 }}>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>← Prev</button>
              <button type="button" className="btn btn-secondary btn-sm" disabled={page >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))}>Next →</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
