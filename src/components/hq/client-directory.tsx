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
  const map: Record<string, { bg: string; color: string; border: string; label: string }> = {
    ACTIVE: {
      bg: "rgba(34, 197, 94, 0.12)",
      color: "#15803d",
      border: "rgba(34, 197, 94, 0.25)",
      label: "Active",
    },
    INACTIVE: {
      bg: "rgba(239, 68, 68, 0.12)",
      color: "#dc2626",
      border: "rgba(239, 68, 68, 0.25)",
      label: "Inactive",
    },
    SUSPENDED: {
      bg: "rgba(245, 158, 11, 0.12)",
      color: "#d97706",
      border: "rgba(245, 158, 11, 0.25)",
      label: "Suspended",
    },
  };
  const style = map[s] ?? {
    bg: "var(--surface-strong)",
    color: "var(--muted)",
    border: "var(--hairline)",
    label: s,
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 5,
        padding: "3px 9px",
        borderRadius: "9999px",
        fontSize: 11,
        fontWeight: 600,
        background: style.bg,
        color: style.color,
        border: `1px solid ${style.border}`,
        whiteSpace: "nowrap",
      }}
    >
      <span
        style={{
          width: 6,
          height: 6,
          borderRadius: "50%",
          background: style.color,
          display: "inline-block",
        }}
      />
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

    fetch(`/api/hq/clients?${params}`)
      .then(async (res) => {
        if (!res.ok)
          throw new Error(
            (await res.json().catch(() => null))?.error || "Failed to load clients."
          );
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

  const applyPreset = (
    p: Partial<{ search: string; status: string; state: string; sort: string }>
  ) => {
    setSearch(p.search ?? "");
    setStatusFilter(p.status ?? "ALL");
    setStateFilter(p.state ?? "");
    if (p.sort) setSortBy(p.sort);
    setPage(1);
  };

  const saveView = () => {
    const name = prompt("Save current filters as view:");
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

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < BULK_MAX) next.add(id);
      return next;
    });

  const togglePage = () =>
    setSelected((prev) => {
      const allOnPage = rows.length > 0 && rows.every((r) => prev.has(r.id));
      const next = new Set(prev);
      if (allOnPage) rows.forEach((r) => next.delete(r.id));
      else
        rows.forEach((r) => {
          if (next.size < BULK_MAX) next.add(r.id);
        });
      return next;
    });

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
  const filtersActive = !!search || statusFilter !== "ALL" || !!stateFilter || sortBy !== "name";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* ── Toolbar Controls Container ── */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg)",
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          {/* Search Input */}
          <div style={{ position: "relative", flex: 1, minWidth: 240, maxWidth: 380 }}>
            <input
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name, phone, or client code..."
              style={{
                paddingLeft: 34,
                width: "100%",
                fontSize: 13,
                height: 36,
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--hairline)",
                background: "var(--canvas-floor)",
              }}
            />
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
                pointerEvents: "none",
              }}
            >
              <Icons.Search size={14} />
            </span>
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                  padding: 0,
                }}
              >
                <Icons.X size={13} />
              </button>
            )}
          </div>

          {/* State Filter */}
          <input
            className="input-field"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            placeholder="Filter State..."
            style={{
              width: 130,
              fontSize: 13,
              height: 36,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--hairline)",
              background: "var(--canvas-floor)",
            }}
            title="Filter by state"
          />

          {/* Status Select */}
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{
              fontSize: 13,
              height: 36,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--hairline)",
              background: "var(--canvas-floor)",
              cursor: "pointer",
            }}
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
            <option value="SUSPENDED">Suspended Only</option>
          </select>

          {/* Sort Selector */}
          <select
            className="input-field"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            style={{
              fontSize: 13,
              height: 36,
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--hairline)",
              background: "var(--canvas-floor)",
              cursor: "pointer",
            }}
          >
            <option value="name">Sort: Name A–Z</option>
            <option value="farms">Sort: Most Farms</option>
            <option value="acreage">Sort: Most Acreage</option>
            <option value="recent">Sort: Recently Active</option>
          </select>

          <div style={{ display: "flex", gap: 6, marginLeft: "auto", alignItems: "center" }}>
            {filtersActive && (
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => applyPreset({})}
                style={{ borderRadius: "var(--radius-md)" }}
              >
                <Icons.X size={12} /> Clear
              </button>
            )}
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={saveView}
              style={{ borderRadius: "var(--radius-md)" }}
            >
              Save View
            </button>
          </div>
        </div>

        {/* Preset Pills */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
          {[
            { label: "All Clients", preset: {} },
            { label: "Largest Active", preset: { status: "ACTIVE", sort: "acreage" } },
            { label: "Inactive", preset: { status: "INACTIVE" } },
            { label: "Suspended", preset: { status: "SUSPENDED" } },
          ].map(({ label, preset }) => (
            <button
              key={label}
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => applyPreset(preset)}
              style={{ borderRadius: "var(--radius-pill)", fontSize: 12, padding: "3px 10px" }}
            >
              {label}
            </button>
          ))}

          {savedViews.map((sv) => (
            <span key={sv.name} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
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
                style={{ borderRadius: "var(--radius-pill)", fontSize: 12, padding: "3px 10px" }}
              >
                {sv.name}
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = savedViews.filter((x) => x.name !== sv.name);
                  setSavedViews(next);
                  try {
                    localStorage.setItem("hq-client-views-v1", JSON.stringify(next));
                  } catch {
                    /* unavailable */
                  }
                }}
                style={{
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                  display: "flex",
                  padding: 2,
                }}
                title={`Delete ${sv.name}`}
              >
                <Icons.X size={11} />
              </button>
            </span>
          ))}
        </div>
      </div>

      {/* ── Bulk Action Bar ── */}
      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            padding: "10px 16px",
            background: "var(--surface-strong)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
          }}
        >
          <strong style={{ color: "var(--ink)" }}>{selected.size} selected</strong>
          <span style={{ fontSize: 12, color: "var(--muted)" }}>max {BULK_MAX}</span>
          <button
            type="button"
            className="btn btn-green btn-sm"
            disabled={bulkBusy}
            onClick={() => bulkStatus("ACTIVE")}
          >
            Set Active
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={bulkBusy}
            onClick={() => bulkStatus("INACTIVE")}
          >
            Set Inactive
          </button>
          <button
            type="button"
            onClick={() => setSelected(new Set())}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "var(--muted)",
              fontSize: 12,
            }}
          >
            Clear Selection
          </button>
          {bulkMsg && <span style={{ fontSize: 12, color: "var(--muted)" }}>{bulkMsg}</span>}
        </div>
      )}

      {/* ── Result Count Bar ── */}
      {!loading && !error && (
        <div style={{ fontSize: 12, color: "var(--muted)", paddingLeft: 4 }}>
          <strong>{total.toLocaleString()}</strong> client{total !== 1 ? "s" : ""} registered
          {filtersActive ? " matching filters" : ""}
          {total > LIMIT ? ` • Page ${page} of ${totalPages}` : ""}
        </div>
      )}

      {/* ── Clean Client Table ── */}
      <div
        style={{
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          boxShadow: "var(--shadow-sm)",
        }}
      >
        <div style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          <table
            style={{
              width: "100%",
              minWidth: 720,
              fontSize: 13,
              borderCollapse: "collapse",
            }}
          >
            <thead>
              <tr
                style={{
                  background: "var(--canvas-floor)",
                  borderBottom: "1px solid var(--hairline)",
                }}
              >
                <th style={{ width: 40, padding: "10px 14px", textAlign: "center" }}>
                  <input
                    type="checkbox"
                    checked={rows.length > 0 && rows.every((r) => selected.has(r.id))}
                    onChange={togglePage}
                    aria-label="Select page"
                    style={{ cursor: "pointer" }}
                  />
                </th>
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Client & Account
                </th>
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Phone
                </th>
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "left",
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Location
                </th>
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Farms
                </th>
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Plots
                </th>
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Acreage
                </th>
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "center",
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Status
                </th>
                <th
                  style={{
                    padding: "10px 14px",
                    textAlign: "right",
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: "0.05em",
                    color: "var(--muted)",
                    textTransform: "uppercase",
                  }}
                >
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={9}
                    style={{ textAlign: "center", padding: 48, color: "var(--muted)" }}
                  >
                    Loading clients...
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 48 }}>
                    <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                      Could not load clients
                    </div>
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: "0 0 12px" }}>
                      {error}
                    </p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
                      Retry
                    </button>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 48 }}>
                    <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                      No clients match your filter
                    </div>
                    <p style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                      Try adjusting the search keyword or filter settings.
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((c) => (
                  <tr
                    key={c.id}
                    style={{
                      borderBottom: "1px solid var(--hairline)",
                      transition: "background 0.12s ease",
                    }}
                  >
                    <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "middle" }}>
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleOne(c.id)}
                        aria-label={`Select ${c.name}`}
                        style={{ cursor: "pointer" }}
                      />
                    </td>
                    <td style={{ padding: "12px 14px", verticalAlign: "middle" }}>
                      <Link
                        href={`/hq/clients/${c.id}`}
                        style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}
                      >
                        {c.name}
                      </Link>
                      {c.companyName && (
                        <div style={{ fontSize: 11, color: "var(--muted)", marginTop: 1 }}>
                          {c.companyName}
                        </div>
                      )}
                      <div
                        style={{
                          fontSize: 10,
                          color: "var(--muted)",
                          fontFamily: "var(--font-mono)",
                          marginTop: 1,
                        }}
                      >
                        {c.code}
                      </div>
                    </td>
                    <td style={{ padding: "12px 14px", verticalAlign: "middle", color: "var(--body)", fontSize: 12, whiteSpace: "nowrap" }}>
                      {c.phone ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                          <Icons.User size={12} style={{ color: "var(--muted)" }} />
                          <span>{c.phone}</span>
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "12px 14px", verticalAlign: "middle", whiteSpace: "nowrap" }}>
                      {c.state ? (
                        <span style={{ fontWeight: 500, color: "var(--ink)", fontSize: 12 }}>
                          {c.district ? `${c.district}, ${c.state}` : c.state}
                        </span>
                      ) : (
                        <span style={{ color: "var(--muted)" }}>—</span>
                      )}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        fontWeight: 600,
                        verticalAlign: "middle",
                      }}
                    >
                      {c.farmCount}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        fontWeight: 600,
                        verticalAlign: "middle",
                      }}
                    >
                      {c.plotCount}
                    </td>
                    <td
                      style={{
                        padding: "12px 14px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "var(--ink)",
                        verticalAlign: "middle",
                      }}
                    >
                      {c.totalAcreage.toFixed(1)} ac
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "center", verticalAlign: "middle" }}>
                      <StatusPill status={c.status} />
                    </td>
                    <td style={{ padding: "12px 14px", textAlign: "right", verticalAlign: "middle" }}>
                      <Link
                        href={`/hq/clients/${c.id}`}
                        className="btn btn-secondary btn-sm"
                        style={{ padding: "3px 10px", fontSize: 12, borderRadius: "var(--radius-md)" }}
                      >
                        <span>Inspect &rarr;</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {total > LIMIT && (
          <div
            style={{
              padding: "12px 16px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              borderTop: "1px solid var(--hairline)",
              fontSize: 12,
              color: "var(--muted)",
              background: "var(--canvas-floor)",
            }}
          >
            <span>
              Showing <strong>{(page - 1) * LIMIT + 1}</strong>&ndash;
              <strong>{Math.min(page * LIMIT, total)}</strong> of{" "}
              <strong>{total.toLocaleString()}</strong> clients
            </span>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                &larr; Prev
              </button>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next &rarr;
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
