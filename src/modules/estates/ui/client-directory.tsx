"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { ClientActionsMenu } from "./client-actions-menu";

interface ClientRow {
  id: string;
  code: string;
  name: string;
  companyName: string | null;
  phone: string | null;
  email: string | null;
  whatsappNo: string | null;
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

// Only the sort keys the backend actually supports.
const SORT_OPTIONS = [
  { value: "name", label: "Name A–Z" },
  { value: "farms", label: "Most farms" },
  { value: "acreage", label: "Largest area" },
  { value: "recent", label: "Last activity" },
];

type QuickView = { id: string; label: string; status: string; sort: string };

// Views are presets (status + sort), not filters.
const QUICK_VIEWS: QuickView[] = [
  { id: "all", label: "All clients", status: "ALL", sort: "name" },
  { id: "active", label: "Active", status: "ACTIVE", sort: "name" },
  { id: "inactive", label: "Inactive", status: "INACTIVE", sort: "name" },
  { id: "suspended", label: "Suspended", status: "SUSPENDED", sort: "name" },
  { id: "largest", label: "Largest active", status: "ACTIVE", sort: "acreage" },
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

function paginationItems(current: number, totalPages: number): (number | "gap")[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const items: (number | "gap")[] = [1];
  const start = Math.max(2, current - 1);
  const end = Math.min(totalPages - 1, current + 1);
  if (start > 2) items.push("gap");
  for (let p = start; p <= end; p += 1) items.push(p);
  if (end < totalPages - 1) items.push("gap");
  items.push(totalPages);
  return items;
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

function DeleteClientModal({
  client,
  onConfirm,
  onClose,
}: {
  client: {
    id: string;
    name: string;
    code?: string;
    district?: string | null;
    state?: string | null;
  };
  onConfirm: (id: string) => void | Promise<void>;
  onClose: () => void;
}) {
  const [input, setInput] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const confirmed = input.trim() === client.name.trim();

  useEffect(() => {
    setInput("");
    setError("");
    setDeleting(false);
  }, [client.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleDelete = async () => {
    if (!confirmed || deleting) return;
    setDeleting(true);
    setError("");
    try {
      await onConfirm(client.id);
      onClose();
    } catch {
      setError("Unable to delete client. Please try again.");
    } finally {
      setDeleting(false);
    }
  };

  const initials = client.name
    .split(" ")
    .filter(Boolean)
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const location = [client.district, client.state].filter(Boolean).join(", ");

  return (
    <div
      className="modal-overlay"
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        backdropFilter: "blur(8px)",
        WebkitBackdropFilter: "blur(8px)",
        backgroundColor: "rgba(12, 10, 9, 0.55)",
      }}
    >
      <div
        className="modal-content"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 470,
          padding: "20px 24px",
          borderRadius: 16,
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 10,
                backgroundColor: "var(--red-light)",
                display: "grid",
                placeItems: "center",
                flexShrink: 0,
                color: "var(--red)",
              }}
            >
              <Icons.Trash size={18} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: "var(--ink)", letterSpacing: "-0.01em" }}>
                Delete Client?
              </h3>
              <p style={{ margin: "1px 0 0", fontSize: 12.5, color: "var(--muted)", lineHeight: 1.4 }}>
                This will permanently delete this client and its associated data.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: "transparent",
              border: "none",
              color: "var(--muted)",
              width: 28,
              height: 28,
              borderRadius: "50%",
              cursor: "pointer",
              display: "grid",
              placeItems: "center",
              transition: "background 0.15s ease, color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--surface-strong)";
              e.currentTarget.style.color = "var(--ink)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.color = "var(--muted)";
            }}
            aria-label="Close"
          >
            <Icons.X size={16} />
          </button>
        </div>

        {/* Client Identity Row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 12px",
            backgroundColor: "var(--canvas-soft)",
            border: "1px solid var(--hairline)",
            borderRadius: 10,
            marginBottom: 16,
          }}
        >
          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "50%",
              backgroundColor: "var(--primary)",
              color: "var(--on-primary)",
              fontSize: 12,
              fontWeight: 600,
              display: "grid",
              placeItems: "center",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {client.name}
              </span>
              {client.code && (
                <span style={{ fontSize: 10, fontWeight: 600, padding: "1px 5px", borderRadius: 3, background: "var(--surface-strong)", color: "var(--muted)", fontFamily: "monospace", flexShrink: 0 }}>
                  {client.code}
                </span>
              )}
            </div>
            {location && (
              <div style={{ fontSize: 11.5, color: "var(--muted)", marginTop: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {location}
              </div>
            )}
          </div>
        </div>

        {/* Confirmation Instruction */}
        <div style={{ marginBottom: 14 }}>
          <label style={{ display: "block", fontSize: 12.5, color: "var(--body-strong)", marginBottom: 6, lineHeight: 1.4 }}>
            Type <span style={{ color: "var(--red)", fontWeight: 600 }}>{client.name}</span> to confirm.
          </label>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setError("");
            }}
            placeholder={`Type ${client.name} to confirm`}
            className="input-field"
            style={{
              width: "100%",
              borderRadius: 8,
              padding: "8px 12px",
              fontSize: 13.5,
              borderColor: confirmed ? "var(--red)" : "var(--hairline-strong)",
              boxShadow: confirmed ? "0 0 0 1px var(--red)" : "none",
              transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            }}
            disabled={deleting}
            aria-label={`Type ${client.name} to confirm deletion`}
          />
          {error && (
            <p style={{ fontSize: 12, color: "var(--red)", margin: "5px 0 0", display: "flex", alignItems: "center", gap: 4 }}>
              <Icons.AlertTriangle size={13} />
              {error}
            </p>
          )}
        </div>

        {/* Compact Warning */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "7px 10px",
            borderRadius: 8,
            backgroundColor: "var(--red-light)",
            border: "1px solid rgba(166, 59, 50, 0.12)",
            fontSize: 12,
            color: "var(--red)",
            marginBottom: 16,
          }}
        >
          <Icons.AlertTriangle size={13} style={{ flexShrink: 0 }} />
          <span>This action cannot be undone.</span>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            disabled={deleting}
            style={{
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              cursor: deleting ? "not-allowed" : "pointer",
              border: "1px solid var(--hairline)",
              backgroundColor: "var(--surface-card)",
              color: "var(--body-strong)",
              opacity: deleting ? 0.5 : 1,
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={!confirmed || deleting}
            style={{
              borderRadius: 8,
              padding: "7px 14px",
              fontSize: 13,
              fontWeight: 600,
              backgroundColor: confirmed ? "var(--semantic-error)" : "var(--surface-strong)",
              color: confirmed ? "#ffffff" : "var(--muted-soft)",
              border: confirmed ? "1px solid var(--semantic-error)" : "1px solid var(--hairline)",
              cursor: !confirmed || deleting ? "not-allowed" : "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              opacity: deleting ? 0.7 : 1,
            }}
          >
            {deleting ? (
              <>
                <Icons.Spinner size={14} className="spin" />
                Deleting…
              </>
            ) : (
              <>
                <Icons.Trash size={14} />
                Delete Client
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ClientDirectory({
  canWrite = false,
  canOnboard = false,
  canEditClient = false,
  canCreateFarm = false,
  canViewFarms = false,
}: {
  canWrite?: boolean;
  canOnboard?: boolean;
  canEditClient?: boolean;
  canCreateFarm?: boolean;
  canViewFarms?: boolean;
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

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string;
    name: string;
    code?: string;
    district?: string | null;
    state?: string | null;
  } | null>(null);

  const [filtersOpen, setFiltersOpen] = useState(false);
  const [draftState, setDraftState] = useState("");
  const [draftStatus, setDraftStatus] = useState("ALL");

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

  const applyView = (v: QuickView) => {
    setStatusFilter(v.status);
    setSortBy(v.sort);
    setPage(1);
  };

  const clearAll = () => {
    setSearch("");
    setStatusFilter("ALL");
    setStateFilter("");
    setPage(1);
  };

  const openFilters = () => {
    const next = !filtersOpen;
    if (next) {
      setDraftState(stateFilter);
      setDraftStatus(statusFilter);
    }
    setFiltersOpen(next);
  };

  const applyFilters = () => {
    setStateFilter(draftState);
    setStatusFilter(draftStatus);
    setPage(1);
    setFiltersOpen(false);
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
      setSelected(new Set());
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

  const exportSelected = () => {
    const chosen = rows.filter((r) => selected.has(r.id));
    if (chosen.length === 0) return;
    const header = ["Code", "Client", "Business", "Phone", "District", "State", "Status", "Farms", "Acreage"];
    const escape = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const csv = [
      header,
      ...chosen.map((r) => [
        r.code,
        r.name,
        r.companyName ?? "",
        r.phone ?? "",
        r.district ?? "",
        r.state ?? "",
        r.status,
        r.farmCount,
        r.totalAcreage.toFixed(1),
      ]),
    ]
      .map((line) => line.map(escape).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "agaate-clients-export.csv";
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${chosen.length} client(s) exported.`);
  };

  const openDeleteModal = (id: string) => {
    const row = rows.find((r) => r.id === id);
    if (!row) return;
    setDeleteTarget({
      id,
      name: row.name,
      code: row.code,
      district: row.district,
      state: row.state,
    });
    setShowDeleteModal(true);
  };

  const handleDeleteConfirm = async (id: string) => {
    try {
      const res = await fetch(`/api/hq/clients/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Could not delete client.");
      toast.success("Client deleted successfully.");
      load();
    } catch (e) {
      throw e;
    }
  };

  const totalPages = Math.ceil(total / LIMIT) || 1;
  // Search is a quick find; "filters" are the drawer axes (state + status).
  const filtersActive = !!search || statusFilter !== "ALL" || !!stateFilter;
  const drawerFilterCount =
    (statusFilter !== "ALL" ? 1 : 0) + (stateFilter.trim() ? 1 : 0);
  const allOnPageSelected = rows.length > 0 && rows.every((r) => selected.has(r.id));

  const activeView = useMemo(
    () => QUICK_VIEWS.find((v) => v.status === statusFilter && v.sort === sortBy)?.id ?? null,
    [statusFilter, sortBy]
  );

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

  const pageItems = useMemo(() => paginationItems(page, totalPages), [page, totalPages]);
  const bulkMode = canWrite && selected.size > 0;

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

      {/* ── Toolbar (or bulk toolbar when rows are selected) ── */}
      {bulkMode ? (
        <div className="dir-toolbar dir-bulkbar" role="toolbar" aria-label="Bulk actions">
          <strong>{selected.size} selected</strong>
          <span className="dir-bulk-max">max {BULK_MAX}</span>
          <div className="dir-bulk-actions">
            <button
              type="button"
              className="btn btn-primary btn-sm"
              disabled={bulkBusy}
              onClick={() => bulkStatus("ACTIVE")}
            >
              <Icons.Check size={13} /> Activate
            </button>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={bulkBusy}
              onClick={() => bulkStatus("INACTIVE")}
            >
              <Icons.X size={13} /> Deactivate
            </button>
            <button type="button" className="btn btn-secondary btn-sm" disabled={bulkBusy} onClick={exportSelected}>
              <Icons.Upload size={13} /> Export
            </button>
            <button type="button" className="dir-chip-clear" onClick={() => setSelected(new Set())}>
              Clear selection
            </button>
          </div>
        </div>
      ) : (
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

          <div className="dir-controls dir-controls-primary">
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
          </div>

          <div className="dir-popover-wrap">
            <button
              type="button"
              className={`btn btn-secondary btn-sm dir-more-btn ${filtersOpen ? "active" : ""}`}
              onClick={openFilters}
              aria-expanded={filtersOpen}
              aria-haspopup="dialog"
            >
              <Icons.SlidersHorizontal size={13} />
              <span>Filters</span>
              {drawerFilterCount > 0 && <span className="dir-filter-count">{drawerFilterCount}</span>}
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
                <div
                  role="dialog"
                  aria-label="Filters"
                  className="dir-popover dir-filters-panel"
                  onKeyDown={(e) => e.key === "Escape" && setFiltersOpen(false)}
                >
                  <div className="dir-filter-head">Filters</div>
                  <div className="dir-filter-body">
                    <div className="dir-filter-section">
                      <div className="dir-filter-title">Location</div>
                      <label className="dir-filter-field">
                        State
                        <input
                          className="input-field"
                          list="hq-dir-states"
                          value={draftState}
                          onChange={(e) => setDraftState(e.target.value)}
                          placeholder="Select state"
                        />
                      </label>
                    </div>
                    <div className="dir-filter-section">
                      <div className="dir-filter-title">Account</div>
                      <label className="dir-filter-field">
                        Status
                        <select
                          className="input-field"
                          value={draftStatus}
                          onChange={(e) => setDraftStatus(e.target.value)}
                        >
                          <option value="ALL">All statuses</option>
                          <option value="ACTIVE">Active</option>
                          <option value="INACTIVE">Inactive</option>
                          <option value="SUSPENDED">Suspended</option>
                        </select>
                      </label>
                    </div>
                  </div>
                  <div className="dir-filter-footer">
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => {
                        setDraftState("");
                        setDraftStatus("ALL");
                      }}
                    >
                      Clear all
                    </button>
                    <button type="button" className="btn btn-primary btn-sm" onClick={applyFilters}>
                      Apply filters
                    </button>
                  </div>
                </div>
              </>
            )}
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
      )}

      {/* ── Quick views (presets — not filters) ── */}
      {!bulkMode && (
        <div className="dir-viewbar" role="tablist" aria-label="Quick views">
          {QUICK_VIEWS.map((v) => (
            <button
              key={v.id}
              type="button"
              role="tab"
              aria-selected={activeView === v.id}
              className={`dir-view ${activeView === v.id ? "active" : ""}`}
              onClick={() => applyView(v)}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}

      {/* ── Active filters ── */}
      {activeChips.length > 0 && (
        <div className="dir-chips">
          <span className="dir-chips-label">Filters:</span>
          {activeChips.map((chip) => (
            <span key={chip.key} className="dir-chip">
              {chip.label}
              <button type="button" onClick={chip.onClear} aria-label={`Remove ${chip.label} filter`}>
                <Icons.X size={11} />
              </button>
            </span>
          ))}
          <button type="button" className="dir-chip-clear" onClick={clearAll}>
            Clear all
          </button>
        </div>
      )}

      {/* ── Result summary ── */}
      {!loading && !error && (
        <div className="dir-summary">
          <div className="dir-count">
            <strong>{total.toLocaleString()}</strong> client{total !== 1 ? "s" : ""}
            {filtersActive ? " matching your filters" : ""}
          </div>
          {totalPages > 1 && (
            <div className="dir-count-sub">
              Page {page} of {totalPages.toLocaleString()}
            </div>
          )}
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
                rows.map((c) => {
                  const business = c.companyName?.trim();
                  return (
                    <tr
                      key={c.id}
                      className="dir-row"
                      onClick={() => router.push(`/hq/clients/${c.id}`)}
                    >
                      <td className="dir-check-col" onClick={(e) => e.stopPropagation()}>
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
                            {business || c.name}
                          </Link>
                          {business && <div className="dir-sub">{c.name}</div>}
                          <div className="dir-code">{c.code}</div>
                        </div>
                      </td>
                      <td className="dir-contact-col">
                        {business && <span className="dir-contact-name">{c.name}</span>}
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
                          <span className="dir-loc">
                            {c.district && <span className="dir-loc-line">{c.district}</span>}
                            {c.state && <span className="dir-muted">{c.state}</span>}
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
                          <span className="dir-farms-acreage">{c.totalAcreage.toFixed(1)} ac</span>
                        )}
                      </td>
                      <td>
                        <StatusDot status={c.status} />
                      </td>
                      <td className="dir-activity-col">
                        <span title={fullTime(c.updatedAt)}>{relativeTime(c.updatedAt)}</span>
                      </td>
                      <td className="dir-actions-col" onClick={(e) => e.stopPropagation()}>
                        <ClientActionsMenu
                          client={c}
                          canEditClient={canEditClient}
                          canCreateFarm={canCreateFarm}
                          canViewFarms={canViewFarms}
                          canWrite={canWrite}
                          onStatusChange={(status) => patchStatus([c.id], status)}
                          onDelete={openDeleteModal}
                        />
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
          rows.map((c) => {
            const business = c.companyName?.trim();
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
                    {business || c.name}
                  </Link>
                  <StatusDot status={c.status} />
                </div>
                <div className="dir-card-meta">
                  <span className="dir-code">{c.code}</span>
                  {business && <span className="dir-muted">{c.name}</span>}
                  {(c.district || c.state) && (
                    <span className="dir-muted">
                      {[c.district, c.state].filter(Boolean).join(", ")}
                    </span>
                  )}
                </div>
                <div className="dir-card-grid">
                  <div>
                    <span className="dir-card-key">Contact</span>
                    {c.phone ? (
                      <a href={`tel:${c.phone}`} className="dir-phone">
                        {c.phone}
                      </a>
                    ) : (
                      <span className="dir-muted">—</span>
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
                    {c.totalAcreage > 0 && (
                      <span className="dir-farms-acreage">{c.totalAcreage.toFixed(1)} ac</span>
                    )}
                  </div>
                </div>
                <div className="dir-card-foot">
                  <span className="dir-muted" title={fullTime(c.updatedAt)}>
                    Active {relativeTime(c.updatedAt)}
                  </span>
                  <ClientActionsMenu
                    client={c}
                    canEditClient={canEditClient}
                    canCreateFarm={canCreateFarm}
                    canViewFarms={canViewFarms}
                    canWrite={canWrite}
                    onStatusChange={(status) => patchStatus([c.id], status)}
                    onDelete={openDeleteModal}
                  />
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
              className="dir-pager-arrow"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              aria-label="Previous page"
            >
              <Icons.ChevronLeft size={14} /> Previous
            </button>
            <div className="dir-pager">
              {pageItems.map((item, i) =>
                item === "gap" ? (
                  <span key={`gap-${i}`} className="dir-pager-gap">
                    …
                  </span>
                ) : (
                  <button
                    key={item}
                    type="button"
                    className={`dir-pager-btn ${item === page ? "active" : ""}`}
                    aria-current={item === page ? "page" : undefined}
                    onClick={() => setPage(item)}
                  >
                    {item}
                  </button>
                )
              )}
            </div>
            <button
              type="button"
              className="dir-pager-arrow"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              aria-label="Next page"
            >
              Next <Icons.ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
      {showDeleteModal && deleteTarget && (
        <DeleteClientModal
          client={deleteTarget}
          onConfirm={handleDeleteConfirm}
          onClose={() => setShowDeleteModal(false)}
        />
      )}
    </div>
  );
}
