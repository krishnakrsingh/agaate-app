"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badge";

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

  useEffect(() => {
    setSavedViews(loadViews());
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedState(stateFilter.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [stateFilter]);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({
      limit: String(LIMIT),
      offset: String((page - 1) * LIMIT),
      sortBy,
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (debouncedState) params.set("state", debouncedState);

    fetch(`/api/hq/clients?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error || "Failed to load clients.");
        }
        return res.json();
      })
      .then((d) => {
        setRows(Array.isArray(d.clients) ? d.clients : []);
        setTotal(Number(d.total) || 0);
        setSelected(new Set());
      })
      .catch((e) => {
        setRows([]);
        setError(e instanceof Error ? e.message : "Failed to load clients.");
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch, statusFilter, debouncedState, sortBy, page]);

  useEffect(() => {
    load();
  }, [load]);

  const applyPreset = (p: Partial<{ search: string; status: string; state: string; sort: string }>) => {
    setSearch(p.search ?? "");
    setStatusFilter(p.status ?? "ALL");
    setStateFilter(p.state ?? "");
    if (p.sort) setSortBy(p.sort);
    setPage(1);
  };

  const saveView = () => {
    const name = prompt("Save current filters as view (e.g. Karnataka active):");
    if (!name?.trim()) return;
    const next = [
      ...savedViews,
      { name: name.trim(), v: { search, status: statusFilter, state: stateFilter, sort: sortBy } },
    ];
    setSavedViews(next);
    try {
      localStorage.setItem("hq-client-views-v1", JSON.stringify(next));
    } catch {
      /* storage unavailable */
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < BULK_MAX) next.add(id);
      return next;
    });
  };

  const togglePage = () => {
    setSelected((prev) => {
      const allOnPage = rows.every((r) => prev.has(r.id));
      const next = new Set(prev);
      if (allOnPage) rows.forEach((r) => next.delete(r.id));
      else rows.forEach((r) => { if (next.size < BULK_MAX) next.add(r.id); });
      return next;
    });
  };

  const bulkStatus = async (status: "ACTIVE" | "INACTIVE") => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    if (!confirm(`Set ${ids.length} client(s) to ${status}?`)) return;
    setBulkBusy(true);
    setBulkMsg(null);
    try {
      const res = await fetch("/api/hq/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Bulk update failed.");
      setBulkMsg(`Updated ${body.updated} client(s) to ${status}.`);
      load();
    } catch (e) {
      setBulkMsg(e instanceof Error ? e.message : "Bulk update failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;
  const filtersActive =
    !!search || statusFilter !== "ALL" || !!stateFilter || sortBy !== "name";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          padding: 16,
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1 }}>
          <div style={{ position: "relative", minWidth: 240, maxWidth: 360, flex: 1 }}>
            <Icons.Search
              size={14}
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search ID, name, code, phone, company..."
              style={{ paddingLeft: 32, width: "100%", fontSize: 13 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 8,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <Icons.X size={13} />
              </button>
            )}
          </div>

          <input
            className="input-field"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            placeholder="State (exact)"
            style={{ width: 140, fontSize: 13 }}
            title="Exact state match"
          />

          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: "auto", fontSize: 13 }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            className="input-field"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            style={{ width: "auto", fontSize: 13 }}
            title="Sort order"
          >
            <option value="name">Sort: Name A–Z</option>
            <option value="farms">Sort: Most farms</option>
            <option value="acreage">Sort: Most acreage</option>
            <option value="recent">Sort: Recently active</option>
          </select>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button type="button" className="btn btn-secondary btn-sm" onClick={saveView} title="Save current filters">
            <span>Save view</span>
          </button>
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
        <span className="muted" style={{ fontSize: 11 }}>VIEWS:</span>
        <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset({})}>
          <span>All</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => applyPreset({ status: "ACTIVE", sort: "acreage" })}
        >
          <span>Largest active</span>
        </button>
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={() => applyPreset({ status: "INACTIVE" })}
        >
          <span>Inactive</span>
        </button>
        {savedViews.map((sv) => (
          <span key={sv.name} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => {
                setSearch(sv.v.search);
                setStatusFilter(sv.v.status);
                setStateFilter(sv.v.state);
                setSortBy(sv.v.sort);
                setPage(1);
              }}
            >
              <span>{sv.name}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                const next = savedViews.filter((x) => x.name !== sv.name);
                setSavedViews(next);
                try {
                  localStorage.setItem("hq-client-views-v1", JSON.stringify(next));
                } catch {
                  /* storage unavailable */
                }
              }}
              style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)" }}
              title={`Delete view ${sv.name}`}
            >
              <Icons.X size={12} />
            </button>
          </span>
        ))}
        {filtersActive && (
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset({})}>
            <span>Clear</span>
            <Icons.X size={12} />
          </button>
        )}
      </div>

      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            padding: "10px 16px",
            background: "var(--surface)",
            border: "1px solid var(--line)",
            borderRadius: "var(--radius-lg)",
            fontSize: 13,
          }}
        >
          <strong>{selected.size} selected</strong>
          <span className="muted" style={{ fontSize: 12 }}>(max {BULK_MAX})</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={bulkBusy}
            onClick={() => bulkStatus("ACTIVE")}
          >
            <span>Set Active</span>
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={bulkBusy}
            onClick={() => bulkStatus("INACTIVE")}
          >
            <span>Set Inactive</span>
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            style={{ border: "none", background: "transparent", cursor: "pointer", color: "var(--muted)", fontSize: 12 }}
          >
            Clear selection
          </button>
          {bulkMsg && <span className="muted" style={{ fontSize: 12 }}>{bulkMsg}</span>}
        </div>
      )}

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
        }}
      >
        <div style={{ overflowX: "auto" }}>
          <table className="table" style={{ width: "100%", fontSize: 13 }}>
            <thead>
              <tr>
                <th style={{ width: 36 }}>
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                    onChange={togglePage}
                    aria-label="Select page"
                  />
                </th>
                <th>Client ID / Code</th>
                <th>Name / Company</th>
                <th>Phone</th>
                <th>State / District</th>
                <th>Farms</th>
                <th>Plots</th>
                <th>Officers</th>
                <th>Acreage</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}>
                    Loading client directory…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 48 }}>
                    <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                      Could not load clients
                    </div>
                    <p className="muted" style={{ fontSize: 12, margin: "0 0 12px" }}>{error}</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
                      <span>Retry</span>
                    </button>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ textAlign: "center", padding: 48 }}>
                    <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                      No clients match the selected criteria
                    </div>
                    <p className="muted" style={{ fontSize: 12, margin: 0 }}>
                      Try adjusting the search query, state, or status filter.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr key={c.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                        aria-label={`Select ${c.name}`}
                      />
                    </td>
                    <td>
                      <Link
                        href={`/hq/clients/${c.id}`}
                        style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none", fontFamily: "var(--font-mono)" }}
                        title={c.id}
                      >
                        {c.id.slice(-8).toUpperCase()}
                      </Link>
                      <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{c.code}</div>
                    </td>
                    <td>
                      <Link
                        href={`/hq/clients/${c.id}`}
                        style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}
                      >
                        {c.name}
                      </Link>
                      {c.companyName && (
                        <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>{c.companyName}</div>
                      )}
                    </td>
                    <td>{c.phone || "—"}</td>
                    <td>
                      <div style={{ color: "var(--ink)" }}>{c.state || "—"}</div>
                      {c.district && <div className="muted" style={{ fontSize: 11 }}>{c.district}</div>}
                    </td>
                    <td style={{ fontWeight: 600 }}>{c.farmCount}</td>
                    <td style={{ fontWeight: 600 }}>{c.plotCount}</td>
                    <td style={{ fontWeight: 600 }}>{c.officerCount}</td>
                    <td style={{ fontFamily: "var(--font-mono)" }}>{c.totalAcreage.toFixed(2)} ac</td>
                    <td>
                      <StatusBadge status={c.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {total > LIMIT && (
          <div
            style={{
              padding: "12px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid var(--line)",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            <span>
              Showing {(page - 1) * LIMIT + 1} to {Math.min(page * LIMIT, total)} of {total.toLocaleString()} clients
            </span>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
