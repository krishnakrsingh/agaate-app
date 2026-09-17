"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

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

const LIMIT = 20;
const BULK_MAX = 50;

const STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh",
  "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab",
  "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh",
  "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh",
  "Lakshadweep", "Puducherry",
];

const SORT_OPTIONS = [
  { value: "name", label: "Name A–Z" },
  { value: "farms", label: "Most farms" },
  { value: "acreage", label: "Most acreage" },
  { value: "recent", label: "Recently active" },
];

const QUICK_VIEWS = [
  { label: "All clients", preset: {} },
  { label: "Largest active", preset: { status: "ACTIVE", sort: "acreage" } },
  { label: "Inactive", preset: { status: "INACTIVE" } },
  { label: "Suspended", preset: { status: "SUSPENDED" } },
];

const STATUS_META: Record<string, { label: string; color: string }> = {
  ACTIVE: { label: "Active", color: "var(--green-ink)" },
  INACTIVE: { label: "Inactive", color: "var(--red)" },
  SUSPENDED: { label: "Suspended", color: "var(--amber)" },
};

function statusMeta(status: string) {
  return STATUS_META[status.toUpperCase()] ?? { label: status, color: "var(--muted)" };
}

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "—";
  const diff = Date.now() - then;
  const hour = 3600000;
  const day = 86400000;
  if (diff < hour) return "Just now";
  if (diff < day) return `${Math.floor(diff / hour)}h ago`;
  if (diff < 7 * day) return `${Math.floor(diff / day)}d ago`;
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function fullTime(iso: string): string {
  const d = new Date(iso);
  return Number.isFinite(d.getTime()) ? d.toLocaleString() : "—";
}

function StatusDot({ status }: { status: string }) {
  const meta = statusMeta(status);
  return (
    <span className="dir-status" style={{ color: meta.color }}>
      <span className="dir-status-dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function ClientIdentity({ c }: { c: ClientRow }) {
  const primary = c.companyName?.trim() || c.name;
  return (
    <div className="dir-identity">
      <Link href={`/hq/clients/${c.id}`} className="dir-name" title={primary}>
        {primary}
      </Link>
      {c.companyName && c.name && c.name !== c.companyName && (
        <span className="dir-sub">{c.name}</span>
      )}
      <span className="dir-code">{c.code}</span>
    </div>
  );
}

export function ClientDirectory({
  canWrite = false,
  canOnboard = false,
  canEditClient = false,
  canCreateFarm = false,
}: {
  canWrite?: boolean;
  canOnboard?: boolean;
  canEditClient?: boolean;
  canCreateFarm?: boolean;
}) {
  const toast = useToast();
  const router = useRouter();
  const [rows, setRows] = useState<ClientRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stateFilter, setStateFilter] = useState("");
  const [debouncedState, setDebouncedState] = useState("");
  const [sortBy, setSortBy] = useState("name");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkBusy, setBulkBusy] = useState(false);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

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
    const t = setTimeout(load, 0);
    return () => clearTimeout(t);
  }, [load]);

  const applyPreset = (
    p: Partial<{ search: string; status: string; state: string; sort: string }>
  ) => {
    setSearch(p.search ?? "");
    setStatusFilter(p.status ?? "ALL");
    setStateFilter(p.state ?? "");
    if (p.sort) setSortBy(p.sort);
    setPage(1);
    setFiltersOpen(false);
  };

  const clearAll = () => applyPreset({});

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

  const patchStatus = async (ids: string[], status: "ACTIVE" | "INACTIVE") => {
    setBulkBusy(true);
    try {
      const res = await fetch("/api/hq/clients", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, status }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error || "Status update failed.");
      toast.success(
        ids.length === 1
          ? `Client set to ${status.toLowerCase()}.`
          : `Updated ${body.updated} client(s) to ${status}.`
      );
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Status update failed.");
    } finally {
      setBulkBusy(false);
    }
  };

  const bulkStatus = async (status: "ACTIVE" | "INACTIVE") => {
    const ids = Array.from(selected);
    if (ids.length === 0) return;
    await patchStatus(ids, status);
  };

  const copyCode = (code: string) => {
    setOpenMenuId(null);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(code).then(
        () => toast.success("Client code copied."),
        () => toast.error("Could not copy to clipboard.")
      );
    } else {
      toast.error("Clipboard unavailable in this browser.");
    }
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;
  const filtersActive = !!search || statusFilter !== "ALL" || !!stateFilter;
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const activeChips = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (stateFilter.trim())
      chips.push({ key: "state", label: `State: ${stateFilter.trim()}`, onClear: () => setStateFilter("") });
    if (statusFilter !== "ALL")
      chips.push({
        key: "status",
        label: `Status: ${statusMeta(statusFilter).label}`,
        onClear: () => setStatusFilter("ALL"),
      });
    return chips;
  }, [stateFilter, statusFilter]);

  return (
    <div className="dir-root">
      <datalist id="hq-dir-states">
        {STATES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* ── Header ── */}
      <header className="dir-header">
        <div className="dir-header-text">
          <h1 className="dir-title">Clients</h1>
          <p className="dir-subtitle">Manage clients, farms and their operations.</p>
        </div>
        {canOnboard && (
          <Link href="/hq/onboarding/new" className="btn btn-primary btn-sm dir-add-btn">
            <Icons.Plus size={14} />
            <span>Add Client</span>
          </Link>
        )}
      </header>

      {/* ── Toolbar ── */}
      <div className="dir-toolbar">
        <div className="dir-search">
          <Icons.Search size={14} className="dir-search-icon" />
          <input
            className="input-field dir-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            aria-label="Search clients by name, phone, code or business"
          />
          {search && (
            <button
              type="button"
              className="dir-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <Icons.X size={13} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm dir-filters-toggle"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          aria-expanded={mobileFiltersOpen}
        >
          <Icons.SlidersHorizontal size={13} />
          <span>Filters{activeChips.length ? ` (${activeChips.length})` : ""}</span>
        </button>

        <div className={`dir-controls collapsible ${mobileFiltersOpen ? "open" : ""}`}>
          <input
            className="input-field dir-select"
            list="hq-dir-states"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            placeholder="State"
            aria-label="Filter by state"
          />

          <select
            className="input-field dir-select"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
          </select>

          <div className="dir-popover-wrap">
            <button
              type="button"
              className={`btn btn-secondary btn-sm dir-more-btn ${filtersOpen ? "active" : ""}`}
              onClick={() => setFiltersOpen((v) => !v)}
              aria-expanded={filtersOpen}
              aria-haspopup="menu"
            >
              <Icons.SlidersHorizontal size={13} />
              <span>More filters</span>
              <Icons.ChevronDown size={12} />
            </button>
            {filtersOpen && (
              <>
                <button
                  type="button"
                  className="dir-popover-backdrop"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setFiltersOpen(false)}
                />
                <div role="menu" className="dir-popover" onKeyDown={(e) => e.key === "Escape" && setFiltersOpen(false)}>
                  <div className="dir-popover-label">Quick views</div>
                  {QUICK_VIEWS.map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      role="menuitem"
                      className="dir-popover-item"
                      onClick={() => applyPreset(v.preset)}
                    >
                      {v.label}
                    </button>
                  ))}
                  {filtersActive && (
                    <>
                      <div className="dir-popover-divider" />
                      <button
                        type="button"
                        role="menuitem"
                        className="dir-popover-item danger"
                        onClick={clearAll}
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
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            aria-label="Sort clients"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* ── Active filter chips ── */}
      {activeChips.length > 0 && (
        <div className="dir-chips">
          {activeChips.map((chip) => (
            <span key={chip.key} className="dir-chip">
              {chip.label}
              <button
                type="button"
                onClick={chip.onClear}
                aria-label={`Remove ${chip.label} filter`}
              >
                <Icons.X size={11} />
              </button>
            </span>
          ))}
          <button type="button" className="dir-chip-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {canWrite && selected.size > 0 && (
        <div className="dir-bulkbar">
          <strong>{selected.size} selected</strong>
          <span className="dir-bulk-max">max {BULK_MAX}</span>
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={bulkBusy}
            onClick={() => bulkStatus("ACTIVE")}
          >
            Set active
          </button>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={bulkBusy}
            onClick={() => bulkStatus("INACTIVE")}
          >
            Set inactive
          </button>
          <button type="button" className="dir-chip-clear" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {/* ── Count caption ── */}
      {!loading && !error && (
        <div className="dir-count">
          <strong>{total.toLocaleString()}</strong> client{total !== 1 ? "s" : ""}
          {filtersActive ? " matching filters" : ""}
          {total > LIMIT ? ` · Page ${page} of ${totalPages}` : ""}
        </div>
      )}

      {/* ── Desktop table ── */}
      <div className="dir-table-card">
        <div className="dir-table-scroll">
          <table className="dir-table">
            <thead>
              <tr>
                <th className="dir-check-col">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={togglePage}
                    aria-label="Select all clients on this page"
                  />
                </th>
                <th>Client</th>
                <th>Contact</th>
                <th>Location</th>
                <th className="dir-num">Farms</th>
                <th>Status</th>
                <th className="dir-activity-col">Last Activity</th>
                <th className="dir-actions-col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="dir-state-cell">
                    <Icons.Spinner size={16} className="spin" /> Loading clients…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="dir-state-cell">
                    <div className="dir-state-title">Couldn’t load clients</div>
                    <p className="dir-state-hint">{error}</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
                      Retry
                    </button>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="dir-state-cell">
                    <div className="dir-state-title">No clients found</div>
                    <p className="dir-state-hint">Try changing your search or filters.</p>
                    {filtersActive && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={clearAll}>
                        Clear all
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((c, index) => {
                  const menuOpen = openMenuId === c.id;
                  const isUp = rows.length > 2 && index >= rows.length - 2;
                  return (
                    <tr
                      key={c.id}
                      className="dir-row"
                      onClick={() => {
                        if (!menuOpen) router.push(`/hq/clients/${c.id}`);
                      }}
                    >
                      <td
                        className="dir-check-col"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleOne(c.id)}
                          aria-label={`Select ${c.name}`}
                        />
                      </td>
                      <td>
                        <div className="dir-client-cell">
                          <Link href={`/hq/clients/${c.id}`} className="dir-name">
                            {c.companyName?.trim() || c.name}
                          </Link>
                          {c.companyName?.trim() && (
                            <div className="dir-sub">{c.name}</div>
                          )}
                          <div className="dir-code">{c.code}</div>
                        </div>
                      </td>
                      <td className="dir-contact-col">
                        {c.companyName && c.name && (
                          <span className="dir-contact-name">{c.name}</span>
                        )}
                        {c.phone ? (
                          <a href={`tel:${c.phone}`} className="dir-phone" onClick={(e) => e.stopPropagation()}>
                            {c.phone}
                          </a>
                        ) : (
                          <span className="dir-muted">—</span>
                        )}
                      </td>
                      <td className="dir-loc-col">
                        {c.state || c.district ? (
                          <span>
                            {[c.district, c.state].filter(Boolean).join(", ")}
                          </span>
                        ) : (
                          <span className="dir-muted">—</span>
                        )}
                      </td>
                      <td className="dir-num">
                        <Link
                          href={`/hq/farms?clientId=${c.id}`}
                          className="dir-farms-link"
                          onClick={(e) => e.stopPropagation()}
                          title="View client farms"
                        >
                          {c.farmCount}
                          <span className="dir-farms-unit">
                            {c.farmCount === 1 ? "farm" : "farms"}
                          </span>
                        </Link>
                        {c.totalAcreage > 0 && (
                          <span className="dir-farms-acreage">
                            {c.totalAcreage.toFixed(1)} ac
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusDot status={c.status} />
                      </td>
                      <td className="dir-activity-col">
                        <span title={fullTime(c.updatedAt)}>{relativeTime(c.updatedAt)}</span>
                      </td>
                      <td className="dir-actions-col" onClick={(e) => e.stopPropagation()}>
                        <div className="dir-menu-wrap">
                          <button
                            type="button"
                            className="dir-kebab"
                            aria-haspopup="menu"
                            aria-expanded={menuOpen}
                            aria-label={`Actions for ${c.name}`}
                            onClick={() => setOpenMenuId(menuOpen ? null : c.id)}
                          >
                            <Icons.MoreVertical size={16} />
                          </button>
                          {menuOpen && (
                            <>
                              <button
                                type="button"
                                className="dir-popover-backdrop"
                                aria-hidden
                                tabIndex={-1}
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div
                                role="menu"
                                className={`dir-popover dir-menu ${isUp ? "dir-popover-up" : ""}`}
                                onKeyDown={(e) => e.key === "Escape" && setOpenMenuId(null)}
                              >
                                <Link
                                  role="menuitem"
                                  href={`/hq/clients/${c.id}`}
                                  className="dir-popover-item"
                                >
                                  <Icons.Eye size={13} /> View details
                                </Link>
                                {canOnboard && (
                                  <>
                                    <Link
                                      role="menuitem"
                                      href={`/hq/clients/${c.id}/edit`}
                                      className="dir-popover-item"
                                    >
                                      <Icons.Edit size={13} /> Edit client
                                    </Link>
                                    <Link
                                      role="menuitem"
                                      href={`/hq/clients/${c.id}/farms/new`}
                                      className="dir-popover-item"
                                    >
                                      <Icons.Plus size={13} /> Add farm
                                    </Link>
                                  </>
                                )}
                                <div className="dir-popover-divider" />
                                <div className="dir-popover-label">More actions</div>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="dir-popover-item"
                                  onClick={() => copyCode(c.code)}
                                >
                                  <Icons.Copy size={13} /> Copy client code
                                </button>
                                {canWrite && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="dir-popover-item"
                                    disabled={bulkBusy}
                                    onClick={() => {
                                      setOpenMenuId(null);
                                      void patchStatus([c.id], c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
                                    }}
                                  >
                                    {c.status === "ACTIVE" ? (
                                      <>
                                        <Icons.X size={13} /> Set inactive
                                      </>
                                    ) : (
                                      <>
                                        <Icons.Check size={13} /> Set active
                                      </>
                                    )}
                                  </button>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Mobile cards ── */}
      <div className="dir-cards">
        {loading ? (
          <div className="dir-card-state">Loading clients…</div>
        ) : error ? (
          <div className="dir-card-state">
            <div className="dir-state-title">Couldn’t load clients</div>
            <p className="dir-state-hint">{error}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="dir-card-state">
            <div className="dir-state-title">No clients found</div>
            <p className="dir-state-hint">Try changing your search or filters.</p>
            {filtersActive && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
        ) : (
          rows.map((c, index) => {
            const menuOpen = openMenuId === c.id;
            const isUp = rows.length > 2 && index >= rows.length - 2;
            return (
              <article key={c.id} className="dir-card">
                <div className="dir-card-head">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                    aria-label={`Select ${c.name}`}
                  />
                  <Link href={`/hq/clients/${c.id}`} className="dir-name">
                    {c.companyName?.trim() || c.name}
                  </Link>
                  <StatusDot status={c.status} />
                </div>
                <div className="dir-card-meta">
                  <span className="dir-code">{c.code}</span>
                  {(c.district || c.state) && (
                    <span className="dir-muted">
                      {[c.district, c.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
                <div className="dir-card-grid">
                  <div>
                    <span className="dir-card-key">Contact</span>
                    {c.companyName && <span className="dir-card-val">{c.name}</span>}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="dir-phone">
                        {c.phone}
                      </a>
                    )}
                  </div>
                  <div>
                    <span className="dir-card-key">Farms</span>
                    <Link href={`/hq/farms?clientId=${c.id}`} className="dir-farms-link">
                      {c.farmCount}
                      <span className="dir-farms-unit">
                        {c.farmCount === 1 ? "farm" : "farms"}
                      </span>
                    </Link>
                  </div>
                </div>
                <div className="dir-card-foot">
                  <span className="dir-muted" title={fullTime(c.updatedAt)}>
                    Active {relativeTime(c.updatedAt)}
                  </span>
                  <div className="dir-menu-wrap">
                    <button
                      type="button"
                      className="dir-kebab"
                      aria-haspopup="menu"
                      aria-expanded={menuOpen}
                      aria-label={`Actions for ${c.name}`}
                      onClick={() => setOpenMenuId(menuOpen ? null : c.id)}
                    >
                      <Icons.MoreVertical size={16} />
                    </button>
                    {menuOpen && (
                      <>
                        <button
                          type="button"
                          className="dir-popover-backdrop"
                          aria-hidden
                          tabIndex={-1}
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div
                          role="menu"
                          className={`dir-popover dir-menu ${isUp ? "dir-popover-up" : ""}`}
                          onKeyDown={(e) => e.key === "Escape" && setOpenMenuId(null)}
                        >
                          <Link role="menuitem" href={`/hq/clients/${c.id}`} className="dir-popover-item">
                            <Icons.Eye size={13} /> View details
                          </Link>
                          {canOnboard && (
                            <>
                              <Link
                                role="menuitem"
                                href={`/hq/clients/${c.id}/edit`}
                                className="dir-popover-item"
                              >
                                <Icons.Edit size={13} /> Edit client
                              </Link>
                              <Link
                                role="menuitem"
                                href={`/hq/clients/${c.id}/farms/new`}
                                className="dir-popover-item"
                              >
                                <Icons.Plus size={13} /> Add farm
                              </Link>
                            </>
                          )}
                          <div className="dir-popover-divider" />
                          <div className="dir-popover-label">More actions</div>
                          <button
                            type="button"
                            role="menuitem"
                            className="dir-popover-item"
                            onClick={() => copyCode(c.code)}
                          >
                            <Icons.Copy size={13} /> Copy client code
                          </button>
                          {canWrite && (
                            <button
                              type="button"
                              role="menuitem"
                              className="dir-popover-item"
                              disabled={bulkBusy}
                              onClick={() => {
                                setOpenMenuId(null);
                                void patchStatus([c.id], c.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
                              }}
                            >
                              {c.status === "ACTIVE" ? (
                                <>
                                  <Icons.X size={13} /> Set inactive
                                </>
                              ) : (
                                <>
                                  <Icons.Check size={13} /> Set active
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        )}
      </div>

      {/* ── Pagination ── */}
      {!loading && !error && total > LIMIT && (
        <div className="dir-pagination">
          <span>
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of{" "}
            {total.toLocaleString()}
          </span>
          <div className="dir-pagination-actions">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              <Icons.ChevronLeft size={13} /> Prev
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next <Icons.ChevronRight size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
