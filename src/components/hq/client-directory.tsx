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
    <span className="client-status" style={{ color: meta.color }}>
      <span className="client-status-dot" style={{ background: meta.color }} />
      {meta.label}
    </span>
  );
}

function ClientIdentity({ c }: { c: ClientRow }) {
  const primary = c.companyName?.trim() || c.name;
  return (
    <div className="client-identity">
      <Link href={`/hq/clients/${c.id}`} className="client-name" title={primary}>
        {primary}
      </Link>
      {c.companyName && c.name && c.name !== c.companyName && (
        <span className="client-sub">{c.name}</span>
      )}
      <span className="client-code">{c.code}</span>
    </div>
  );
}

export function ClientDirectory({
  canWrite = false,
  canOnboard = false,
}: {
  canWrite?: boolean;
  canOnboard?: boolean;
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
    <div className="client-dir">
      <datalist id="hq-client-states">
        {STATES.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>

      {/* ── Header ── */}
      <header className="client-header">
        <div className="client-header-text">
          <h1 className="client-title">Clients</h1>
          <p className="client-subtitle">Manage clients, farms and their operations.</p>
        </div>
        {canOnboard && (
          <Link href="/hq/onboarding/new" className="btn btn-primary btn-sm client-add-btn">
            <Icons.Plus size={14} />
            <span>Add Client</span>
          </Link>
        )}
      </header>

      {/* ── Toolbar ── */}
      <div className="client-toolbar">
        <div className="client-search">
          <Icons.Search size={14} className="client-search-icon" />
          <input
            className="input-field client-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients…"
            aria-label="Search clients by name, phone, code or business"
          />
          {search && (
            <button
              type="button"
              className="client-search-clear"
              onClick={() => setSearch("")}
              aria-label="Clear search"
            >
              <Icons.X size={13} />
            </button>
          )}
        </div>

        <button
          type="button"
          className="btn btn-secondary btn-sm client-filters-toggle"
          onClick={() => setMobileFiltersOpen((v) => !v)}
          aria-expanded={mobileFiltersOpen}
        >
          <Icons.SlidersHorizontal size={13} />
          <span>Filters{activeChips.length ? ` (${activeChips.length})` : ""}</span>
        </button>

        <div className={`client-controls ${mobileFiltersOpen ? "open" : ""}`}>
          <input
            className="input-field client-select"
            list="hq-client-states"
            value={stateFilter}
            onChange={(e) => setStateFilter(e.target.value)}
            placeholder="State"
            aria-label="Filter by state"
          />

          <select
            className="input-field client-select"
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

          <div className="client-popover-wrap">
            <button
              type="button"
              className={`btn btn-secondary btn-sm client-more-btn ${filtersOpen ? "active" : ""}`}
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
                  className="client-popover-backdrop"
                  aria-hidden
                  tabIndex={-1}
                  onClick={() => setFiltersOpen(false)}
                />
                <div role="menu" className="client-popover" onKeyDown={(e) => e.key === "Escape" && setFiltersOpen(false)}>
                  <div className="client-popover-label">Quick views</div>
                  {QUICK_VIEWS.map((v) => (
                    <button
                      key={v.label}
                      type="button"
                      role="menuitem"
                      className="client-popover-item"
                      onClick={() => applyPreset(v.preset)}
                    >
                      {v.label}
                    </button>
                  ))}
                  {filtersActive && (
                    <>
                      <div className="client-popover-divider" />
                      <button
                        type="button"
                        role="menuitem"
                        className="client-popover-item danger"
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

        <div className="client-sort">
          <span className="client-sort-label">Sort:</span>
          <select
            className="input-field client-select"
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
        <div className="client-chips">
          {activeChips.map((chip) => (
            <span key={chip.key} className="client-chip">
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
          <button type="button" className="client-chip-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {/* ── Bulk action bar ── */}
      {canWrite && selected.size > 0 && (
        <div className="client-bulkbar">
          <strong>{selected.size} selected</strong>
          <span className="client-bulk-max">max {BULK_MAX}</span>
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
          <button type="button" className="client-chip-clear" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {/* ── Count caption ── */}
      {!loading && !error && (
        <div className="client-count">
          <strong>{total.toLocaleString()}</strong> client{total !== 1 ? "s" : ""}
          {filtersActive ? " matching filters" : ""}
          {total > LIMIT ? ` · Page ${page} of ${totalPages}` : ""}
        </div>
      )}

      {/* ── Desktop table ── */}
      <div className="client-table-card">
        <div className="client-table-scroll">
          <table className="client-table">
            <thead>
              <tr>
                <th className="client-check-col">
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
                <th className="client-num">Farms</th>
                <th>Status</th>
                <th className="client-activity-col">Last Activity</th>
                <th className="client-actions-col" aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="client-state-cell">
                    <Icons.Spinner size={16} className="spin" /> Loading clients…
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={8} className="client-state-cell">
                    <div className="client-state-title">Couldn’t load clients</div>
                    <p className="client-state-hint">{error}</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
                      Retry
                    </button>
                  </td>
                </tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="client-state-cell">
                    <div className="client-state-title">No clients found</div>
                    <p className="client-state-hint">Try changing your search or filters.</p>
                    {filtersActive && (
                      <button type="button" className="btn btn-secondary btn-sm" onClick={clearAll}>
                        Clear all
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                rows.map((c) => {
                  const menuOpen = openMenuId === c.id;
                  return (
                    <tr
                      key={c.id}
                      className="client-row"
                      onClick={() => {
                        if (!menuOpen) router.push(`/hq/clients/${c.id}`);
                      }}
                    >
                      <td
                        className="client-check-col"
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
                        <ClientIdentity c={c} />
                      </td>
                      <td className="client-contact-col">
                        {c.companyName && c.name && (
                          <span className="client-contact-name">{c.name}</span>
                        )}
                        {c.phone ? (
                          <a href={`tel:${c.phone}`} className="client-phone" onClick={(e) => e.stopPropagation()}>
                            {c.phone}
                          </a>
                        ) : (
                          <span className="client-muted">—</span>
                        )}
                      </td>
                      <td className="client-loc-col">
                        {c.state || c.district ? (
                          <span>
                            {[c.district, c.state].filter(Boolean).join(", ")}
                          </span>
                        ) : (
                          <span className="client-muted">—</span>
                        )}
                      </td>
                      <td className="client-num">
                        <Link
                          href={`/hq/farms?clientId=${c.id}`}
                          className="client-farms-link"
                          onClick={(e) => e.stopPropagation()}
                          title="View client farms"
                        >
                          {c.farmCount}
                          <span className="client-farms-unit">
                            {c.farmCount === 1 ? "farm" : "farms"}
                          </span>
                        </Link>
                        {c.totalAcreage > 0 && (
                          <span className="client-farms-acreage">
                            {c.totalAcreage.toFixed(1)} ac
                          </span>
                        )}
                      </td>
                      <td>
                        <StatusDot status={c.status} />
                      </td>
                      <td className="client-activity-col">
                        <span title={fullTime(c.updatedAt)}>{relativeTime(c.updatedAt)}</span>
                      </td>
                      <td className="client-actions-col" onClick={(e) => e.stopPropagation()}>
                        <div className="client-menu-wrap">
                          <button
                            type="button"
                            className="client-kebab"
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
                                className="client-popover-backdrop"
                                aria-hidden
                                tabIndex={-1}
                                onClick={() => setOpenMenuId(null)}
                              />
                              <div
                                role="menu"
                                className="client-popover client-menu"
                                onKeyDown={(e) => e.key === "Escape" && setOpenMenuId(null)}
                              >
                                <Link
                                  role="menuitem"
                                  href={`/hq/clients/${c.id}`}
                                  className="client-popover-item"
                                >
                                  <Icons.Eye size={13} /> View details
                                </Link>
                                {canOnboard && (
                                  <>
                                    <Link
                                      role="menuitem"
                                      href={`/hq/onboarding/new?clientId=${c.id}`}
                                      className="client-popover-item"
                                    >
                                      <Icons.Edit size={13} /> Edit client
                                    </Link>
                                    <Link
                                      role="menuitem"
                                      href={`/hq/onboarding/new?clientId=${c.id}`}
                                      className="client-popover-item"
                                    >
                                      <Icons.Plus size={13} /> Add farm
                                    </Link>
                                  </>
                                )}
                                <div className="client-popover-divider" />
                                <div className="client-popover-label">More actions</div>
                                <button
                                  type="button"
                                  role="menuitem"
                                  className="client-popover-item"
                                  onClick={() => copyCode(c.code)}
                                >
                                  <Icons.Copy size={13} /> Copy client code
                                </button>
                                {canWrite && (
                                  <button
                                    type="button"
                                    role="menuitem"
                                    className="client-popover-item"
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
      <div className="client-cards">
        {loading ? (
          <div className="client-card-state">Loading clients…</div>
        ) : error ? (
          <div className="client-card-state">
            <div className="client-state-title">Couldn’t load clients</div>
            <p className="client-state-hint">{error}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={load}>
              Retry
            </button>
          </div>
        ) : rows.length === 0 ? (
          <div className="client-card-state">
            <div className="client-state-title">No clients found</div>
            <p className="client-state-hint">Try changing your search or filters.</p>
            {filtersActive && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={clearAll}>
                Clear all
              </button>
            )}
          </div>
        ) : (
          rows.map((c) => {
            const menuOpen = openMenuId === c.id;
            return (
              <article key={c.id} className="client-card">
                <div className="client-card-head">
                  <input
                    type="checkbox"
                    checked={selected.has(c.id)}
                    onChange={() => toggleOne(c.id)}
                    aria-label={`Select ${c.name}`}
                  />
                  <Link href={`/hq/clients/${c.id}`} className="client-name">
                    {c.companyName?.trim() || c.name}
                  </Link>
                  <StatusDot status={c.status} />
                </div>
                <div className="client-card-meta">
                  <span className="client-code">{c.code}</span>
                  {(c.district || c.state) && (
                    <span className="client-muted">
                      {[c.district, c.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
                <div className="client-card-grid">
                  <div>
                    <span className="client-card-key">Contact</span>
                    {c.companyName && <span className="client-card-val">{c.name}</span>}
                    {c.phone && (
                      <a href={`tel:${c.phone}`} className="client-phone">
                        {c.phone}
                      </a>
                    )}
                  </div>
                  <div>
                    <span className="client-card-key">Farms</span>
                    <Link href={`/hq/farms?clientId=${c.id}`} className="client-farms-link">
                      {c.farmCount}
                      <span className="client-farms-unit">
                        {c.farmCount === 1 ? "farm" : "farms"}
                      </span>
                    </Link>
                  </div>
                </div>
                <div className="client-card-foot">
                  <span className="client-muted" title={fullTime(c.updatedAt)}>
                    Active {relativeTime(c.updatedAt)}
                  </span>
                  <div className="client-menu-wrap">
                    <button
                      type="button"
                      className="client-kebab"
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
                          className="client-popover-backdrop"
                          aria-hidden
                          tabIndex={-1}
                          onClick={() => setOpenMenuId(null)}
                        />
                        <div
                          role="menu"
                          className="client-popover client-menu"
                          onKeyDown={(e) => e.key === "Escape" && setOpenMenuId(null)}
                        >
                          <Link role="menuitem" href={`/hq/clients/${c.id}`} className="client-popover-item">
                            <Icons.Eye size={13} /> View details
                          </Link>
                          {canOnboard && (
                            <>
                              <Link
                                role="menuitem"
                                href={`/hq/onboarding/new?clientId=${c.id}`}
                                className="client-popover-item"
                              >
                                <Icons.Edit size={13} /> Edit client
                              </Link>
                              <Link
                                role="menuitem"
                                href={`/hq/onboarding/new?clientId=${c.id}`}
                                className="client-popover-item"
                              >
                                <Icons.Plus size={13} /> Add farm
                              </Link>
                            </>
                          )}
                          <div className="client-popover-divider" />
                          <div className="client-popover-label">More actions</div>
                          <button
                            type="button"
                            role="menuitem"
                            className="client-popover-item"
                            onClick={() => copyCode(c.code)}
                          >
                            <Icons.Copy size={13} /> Copy client code
                          </button>
                          {canWrite && (
                            <button
                              type="button"
                              role="menuitem"
                              className="client-popover-item"
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
        <div className="client-pagination">
          <span>
            Showing {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of{" "}
            {total.toLocaleString()}
          </span>
          <div className="client-pagination-actions">
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
