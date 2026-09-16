"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Icons } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { parseBoundary, type LngLat } from "@modules/spatial/ui/geo";

const GeoMap = dynamic(() => import("@modules/spatial/ui/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => (
    <div
      style={{
        height: "100%",
        width: "100%",
        minHeight: 112,
        display: "grid",
        placeItems: "center",
        background: "var(--surface-strong)",
        color: "var(--muted)",
        fontSize: 11,
      }}
    >
      Loading map…
    </div>
  ),
});

interface FarmRow {
  id: string;
  name: string;
  ownerName: string;
  location: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
  surveyNumber?: string | null;
  village?: string | null;
  district?: string | null;
  state?: string | null;
  totalArea: string | number;
  cultivableArea: string | number;
  measuredAcres?: string | number | null;
  boundaryGeoJson?: string | null;
  status: string;
  setupStage?: string | null;
  targetHandoverDate?: string | null;
  updatedAt: string;
  client?: { id: string; name: string; code: string | null } | null;
  _count?: { plots: number; access: number };
  plots?: Array<{
    id: string;
    name?: string;
    area?: number;
    measuredAcres?: number | null;
    boundaryGeoJson?: string | null;
    status: string;
    cropCycles?: Array<{ id: string }>;
  }>;
}

const STAGE_LABELS: Record<string, string> = {
  SURVEY_SOIL_TEST: "Survey & Soil",
  PLOT_DEMARCATION: "Plot Demarcation",
  BED_SOIL_PREP: "Bed & Soil Prep",
  IRRIGATION_LAYOUT: "Irrigation Layout",
  HANDED_OVER: "Handed Over",
};

const STATUS_OPTIONS = ["SETUP", "ACTIVE", "INACTIVE", "COMPLETED"];
const STAGE_OPTIONS = Object.keys(STAGE_LABELS);

function slaRisks(f: FarmRow): string[] {
  const risks: string[] = [];
  const updated = new Date(f.updatedAt).getTime();
  if (f.status === "SETUP" && Number.isFinite(updated) && Date.now() - updated > 30 * 24 * 60 * 60 * 1000) {
    risks.push("Stalled >30d");
  }
  if (!f.boundaryGeoJson) risks.push("No boundary");
  const plotCount = f._count?.plots ?? f.plots?.length ?? 0;
  if (plotCount === 0) risks.push("No plots");
  if (f.setupStage !== "HANDED_OVER" && f.targetHandoverDate && new Date(f.targetHandoverDate).getTime() < Date.now()) {
    risks.push("Handover overdue");
  }
  return risks;
}

export { HqFarmRegistry as FarmRegistry, HqFarmRegistry as EstateRegistry };
export function HqFarmRegistry({ basePath = "/hq/farms" }: { basePath?: string } = {}) {
  const toast = useToast();
  const [farms, setFarms] = useState<FarmRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const limit = 20;

  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [expandedFarm, setExpandedFarm] = useState<FarmRow | null>(null);

  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [stageFilter, setStageFilter] = useState("ALL");
  const [boundaryFilter, setBoundaryFilter] = useState("ALL");
  const [stalledOnly, setStalledOnly] = useState(false);
  const [sortBy, setSortBy] = useState("updatedAt");
  const [clientId, setClientId] = useState("");
  const [clientQuery, setClientQuery] = useState("");
  const [clientOptions, setClientOptions] = useState<Array<{ id: string; name: string; code: string | null }>>([]);
  const [moreOpen, setMoreOpen] = useState(false);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkAction, setBulkAction] = useState<"STATUS" | "STAGE">("STAGE");
  const [bulkStatus, setBulkStatus] = useState("ACTIVE");
  const [bulkStage, setBulkStage] = useState("HANDED_OVER");
  const [bulkPending, setBulkPending] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    const q = clientQuery.trim();
    if (!q || clientId) {
      if (!q) {
        const clear = setTimeout(() => setClientOptions([]), 0);
        return () => clearTimeout(clear);
      }
      return;
    }
    const t = setTimeout(() => {
      fetch(`/api/admin/clients?search=${encodeURIComponent(q)}&limit=6`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => setClientOptions(d?.clients || []))
        .catch(() => setClientOptions([]));
    }, 250);
    return () => clearTimeout(t);
  }, [clientQuery, clientId]);

  const loadFarms = useCallback(() => {
    setLoading(true);
    setLoadError("");
    const params = new URLSearchParams({
      limit: String(limit),
      offset: String((page - 1) * limit),
      sortBy,
      sortOrder: sortBy === "name" ? "asc" : "desc",
      order: sortBy === "name" ? "asc" : "desc",
    });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (statusFilter !== "ALL") params.set("status", statusFilter);
    if (stageFilter !== "ALL") params.set("setupStage", stageFilter);
    if (boundaryFilter === "HAS_BOUNDARY") params.set("hasBoundary", "YES");
    else if (boundaryFilter === "NO_BOUNDARY") params.set("hasBoundary", "NO");
    if (stalledOnly) params.set("stalledOnly", "true");
    if (clientId) params.set("clientId", clientId);

    fetch(`/api/farms?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load farms.");
        const count = Number(res.headers.get("X-Total-Count")) || 0;
        const data = await res.json();
        setTotal(count);
        const rows: FarmRow[] = Array.isArray(data) ? data : [];
        setFarms(rows);
        setSelected(new Set());
      })
      .catch(() => {
        setFarms([]);
        setTotal(0);
        setLoadError("Unable to load farms. Check your connection and retry.");
      })
      .finally(() => setLoading(false));
  }, [debouncedSearch, statusFilter, stageFilter, boundaryFilter, stalledOnly, clientId, sortBy, page, limit]);

  useEffect(() => {
    const t = setTimeout(loadFarms, 0);
    return () => clearTimeout(t);
  }, [loadFarms]);

  // Keep selectedFarmId in sync with loaded farms
  useEffect(() => {
    const t = setTimeout(() => {
      if (farms.length > 0) {
        if (!selectedFarmId || !farms.some((f) => f.id === selectedFarmId)) {
          setSelectedFarmId(farms[0].id);
        }
      } else {
        setSelectedFarmId(null);
      }
    }, 0);
    return () => clearTimeout(t);
  }, [farms, selectedFarmId]);

  const selectedFarm = useMemo(() => {
    if (!farms.length) return null;
    return farms.find((f) => f.id === selectedFarmId) || farms[0];
  }, [farms, selectedFarmId]);

  const selectedRing = useMemo(() => {
    if (!selectedFarm?.boundaryGeoJson) return null;
    return parseBoundary(selectedFarm.boundaryGeoJson);
  }, [selectedFarm?.boundaryGeoJson]);

  const mapCenter = useMemo<[number, number]>(() => {
    if (!selectedFarm) return [12.9716, 77.5946];
    const lat = Number(selectedFarm.latitude);
    const lng = Number(selectedFarm.longitude);
    if (Number.isFinite(lat) && Number.isFinite(lng) && lat !== 0 && lng !== 0) {
      return [lat, lng];
    }
    return [12.9716, 77.5946];
  }, [selectedFarm]);

  const mapPins = useMemo(() => {
    if (!selectedFarm) return [];
    return [
      {
        key: selectedFarm.id,
        lat: mapCenter[0],
        lng: mapCenter[1],
        color: selectedRing ? "#16a34a" : "#d97706",
        label: selectedFarm.name,
      },
    ];
  }, [selectedFarm, mapCenter, selectedRing]);

  const applyPreset = (p: { search?: string; status?: string; stage?: string; boundary?: string; stalled?: boolean; sort?: string }) => {
    setSearch(p.search ?? "");
    setStatusFilter(p.status ?? "ALL");
    setStageFilter(p.stage ?? "ALL");
    setBoundaryFilter(p.boundary ?? "ALL");
    setStalledOnly(p.stalled ?? false);
    if (p.sort) setSortBy(p.sort);
    setClientId("");
    setClientQuery("");
    setPage(1);
  };

  const toggleSelect = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    setSelected(checked ? new Set(farms.map((f) => f.id)) : new Set());
  };

  async function applyBulk() {
    const farmIds = Array.from(selected);
    if (farmIds.length === 0) return;
    const target = bulkAction === "STATUS" ? `status ${bulkStatus}` : `stage ${bulkStage}`;
    if (!confirm(`Apply ${target} to ${farmIds.length} farm(s)?`)) return;
    setBulkPending(true);
    try {
      const res = await fetch("/api/farms/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmIds,
          action: bulkAction,
          ...(bulkAction === "STATUS" ? { status: bulkStatus } : { setupStage: bulkStage }),
          expectedCount: farmIds.length,
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        toast.error(body.error || "Bulk update failed.");
        return;
      }
      toast.success(
        `Updated ${body.updated} farm(s).${body.missing?.length ? ` Missing: ${body.missing.length}.` : ""}`
      );
      loadFarms();
    } catch {
      toast.error("Network error during bulk update.");
    } finally {
      setBulkPending(false);
    }
  }

  const totalPages = Math.ceil(total / limit) || 1;
  const allOnPageSelected = farms.length > 0 && farms.every((f) => selected.has(f.id));

  const chips: { key: string; label: string; clear: () => void }[] = [];
  if (statusFilter !== "ALL")
    chips.push({ key: "status", label: `Status: ${statusFilter}`, clear: () => { setStatusFilter("ALL"); setPage(1); } });
  if (boundaryFilter === "HAS_BOUNDARY")
    chips.push({ key: "boundary", label: "Boundary: Demarcated", clear: () => { setBoundaryFilter("ALL"); setPage(1); } });
  else if (boundaryFilter === "NO_BOUNDARY")
    chips.push({ key: "boundary", label: "Boundary: Needs boundary", clear: () => { setBoundaryFilter("ALL"); setPage(1); } });
  if (stalledOnly)
    chips.push({ key: "stalled", label: "Stalled >30d", clear: () => { setStalledOnly(false); setPage(1); } });

  return (
    <div className="dir-root">
      {/* ── Toolbar ── */}
      <div className="dir-toolbar">
        <div className="dir-search">
          <Icons.Search size={14} className="dir-search-icon" />
          <input
            className="input-field dir-search-input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search farms, IDs, survey #, client…"
            aria-label="Search farms"
          />
          {search && (
            <button type="button" className="dir-search-clear" onClick={() => setSearch("")} aria-label="Clear search">
              <Icons.X size={13} />
            </button>
          )}
        </div>

        <div className="dir-controls">
          <select
            className="input-field dir-select"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            aria-label="Filter by status"
          >
            <option value="ALL">All statuses</option>
            {STATUS_OPTIONS.map((s) => (<option key={s} value={s}>{s}</option>))}
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
                <div role="menu" className="dir-popover" onKeyDown={(e) => e.key === "Escape" && setMoreOpen(false)}>
                  <div className="dir-popover-label">Boundary</div>
                  {[
                    { value: "ALL", label: "All boundaries" },
                    { value: "HAS_BOUNDARY", label: "Demarcated" },
                    { value: "NO_BOUNDARY", label: "Needs boundary" },
                  ].map((b) => (
                    <button
                      key={b.value}
                      type="button"
                      role="menuitem"
                      className={`dir-popover-item ${boundaryFilter === b.value ? "active" : ""}`}
                      onClick={() => { setBoundaryFilter(b.value); setPage(1); setMoreOpen(false); }}
                    >
                      {boundaryFilter === b.value ? <Icons.Check size={13} /> : <span style={{ width: 13 }} />}
                      {b.label}
                    </button>
                  ))}
                  <div className="dir-popover-divider" />
                  <button
                    type="button"
                    role="menuitem"
                    className={`dir-popover-item ${stalledOnly ? "active" : ""}`}
                    onClick={() => { setStalledOnly((v) => !v); setPage(1); }}
                  >
                    {stalledOnly ? <Icons.Check size={13} /> : <span style={{ width: 13 }} />}
                    Stalled &gt;30d
                  </button>
                  {chips.length > 0 && (
                    <>
                      <div className="dir-popover-divider" />
                      <button
                        type="button"
                        role="menuitem"
                        className="dir-popover-item danger"
                        onClick={() => { applyPreset({}); setMoreOpen(false); }}
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
            onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
            aria-label="Sort farms"
          >
            <option value="updatedAt">Recent</option>
            <option value="createdAt">Newest</option>
            <option value="totalArea">Acreage</option>
            <option value="name">A–Z</option>
          </select>
        </div>

        {/* List/Grid toggle */}
        <div style={{ display: "inline-flex", background: "var(--surface-strong)", borderRadius: "var(--radius-sm)", border: "1px solid var(--hairline)", overflow: "hidden" }}>
          {(["list", "grid"] as const).map((mode) => (
            <button key={mode} type="button" onClick={() => setViewMode(mode)} title={`${mode} view`}
              style={{
                display: "flex", alignItems: "center", gap: 4, padding: "6px 10px", fontSize: 12,
                border: "none", cursor: "pointer",
                background: viewMode === mode ? "var(--surface-card)" : "transparent",
                color: viewMode === mode ? "var(--ink)" : "var(--muted)",
                fontWeight: viewMode === mode ? 600 : 400,
              }}
            >
              {mode === "list" ? <Icons.List size={13} /> : <Icons.Grid size={13} />}
              {mode === "list" ? "List" : "Grid"}
            </button>
          ))}
        </div>
      </div>

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
          <button type="button" className="dir-chip-clear" onClick={() => applyPreset({})}>
            Clear all
          </button>
        </div>
      )}


      {/* Bulk Action Toolbar */}
      {selected.size > 0 && (
        <div className="dir-bulkbar">
          <strong>{selected.size} selected</strong>
          <select
            className="input-field dir-select"
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as "STATUS" | "STAGE")}
            aria-label="Bulk action"
          >
            <option value="STAGE">Set stage</option>
            <option value="STATUS">Set status</option>
          </select>
          {bulkAction === "STATUS" ? (
            <select
              className="input-field dir-select"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              aria-label="Bulk status"
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="input-field dir-select"
              value={bulkStage}
              onChange={(e) => setBulkStage(e.target.value)}
              aria-label="Bulk stage"
            >
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="btn btn-primary btn-sm" disabled={bulkPending} onClick={applyBulk}>
            <span>{bulkPending ? "Applying…" : "Apply bulk change"}</span>
          </button>
          <button type="button" className="dir-chip-clear" onClick={() => setSelected(new Set())}>
            Clear selection
          </button>
        </div>
      )}

      {/* Count */}
      {!loading && !loadError && (
        <div className="dir-count">
          <strong>{total.toLocaleString()}</strong> estate{total === 1 ? "" : "s"}
          {chips.length > 0 ? " matching filters" : ""}
          {total > limit ? ` · Page ${page} of ${totalPages}` : ""}
        </div>
      )}

      {/* Loading and Error States */}
      {loading ? (
        <div className="dir-table-card">
          <div className="dir-state-cell">
            <Icons.Spinner size={16} className="spin" /> Loading farm portfolio…
          </div>
        </div>
      ) : loadError ? (
        <div className="dir-table-card">
          <div className="dir-state-cell">
            <div className="dir-state-title">Couldn’t load farms</div>
            <p className="dir-state-hint">{loadError}</p>
            <button type="button" className="btn btn-secondary btn-sm" onClick={loadFarms}>
              <span>Retry</span>
            </button>
          </div>
        </div>
      ) : farms.length === 0 ? (
        <div className="dir-table-card">
          <div className="dir-state-cell">
            <div className="dir-state-title">No farms found</div>
            <p className="dir-state-hint">Try changing your search or filters.</p>
            {chips.length > 0 && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => applyPreset({})}>
                Clear all
              </button>
            )}
          </div>
        </div>
      ) : (
        /* =========================================================================
           FARM FEED (List View vs Grid View)
           ========================================================================= */
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {viewMode === "list" ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {farms.map((farm) => {
                const hasBoundary = !!farm.boundaryGeoJson;
                const ring = parseBoundary(farm.boundaryGeoJson ?? null);
                const plotCount = farm._count?.plots ?? farm.plots?.length ?? 0;
                const risks = slaRisks(farm);
                const lat = Number(farm.latitude) || 12.9716;
                const lng = Number(farm.longitude) || 77.5946;
                const center: [number, number] = [lat, lng];

                return (
                  <article
                    key={farm.id}
                    className="farm-registry-card hover-glow"
                  >
                    <div className="farm-registry-card-main">
                      {/* Left: Square Satellite Map (112px x 112px on desktop, 80px on mobile) */}
                      <div
                        className="farm-registry-map-wrap"
                        onClick={() => setExpandedFarm(farm)}
                        title="Click to inspect satellite map"
                      >
                        <GeoMap
                          center={center}
                          polygon={ring}
                          compact
                          height={112}
                          interactive={false}
                        />

                        {/* Demarcation status overlay badge */}
                        <div
                          style={{
                            position: "absolute",
                            bottom: 4,
                            left: 4,
                            right: 4,
                            zIndex: 1000,
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            pointerEvents: "none",
                          }}
                        >
                          {hasBoundary ? (
                            <span
                              className="badge badge-green"
                              style={{
                                fontSize: 9,
                                padding: "2px 5px",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
                                backdropFilter: "blur(4px)",
                                fontWeight: 600,
                              }}
                            >
                              ✓ {farm.measuredAcres ? `${farm.measuredAcres} ac` : "Mapped"}
                            </span>
                          ) : (
                            <span
                              className="badge badge-amber"
                              style={{
                                fontSize: 9,
                                padding: "2px 5px",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
                                backdropFilter: "blur(4px)",
                                fontWeight: 600,
                              }}
                            >
                              ⚠️ Unmapped
                            </span>
                          )}

                          <span
                            style={{
                              background: "rgba(0,0,0,0.7)",
                              color: "#fff",
                              borderRadius: 3,
                              padding: "2px 4px",
                              fontSize: 8,
                              display: "inline-flex",
                              alignItems: "center",
                            }}
                          >
                            <Icons.Maximize2 size={8} />
                          </span>
                        </div>
                      </div>

                      {/* Right: Spacious Farm Information Hierarchy */}
                      <div className="farm-registry-info">
                        {/* Row 1: Checkbox, Farm Name, Survey #, Client, Location & Status */}
                        <div className="farm-registry-header">
                          <div className="farm-registry-title-area">
                            <input
                              type="checkbox"
                              checked={selected.has(farm.id)}
                              onChange={(e) => toggleSelect(farm.id, e.target.checked)}
                              aria-label={`Select ${farm.name}`}
                              style={{ cursor: "pointer", accentColor: "var(--ink)", width: 15, height: 15, flexShrink: 0 }}
                            />
                            <Link
                              href={`${basePath}/${farm.id}`}
                              className="farm-registry-name"
                              title={farm.name}
                            >
                              {farm.name}
                            </Link>
                            <span className="farm-registry-survey-tag">
                              {farm.surveyNumber ? `Survey #${farm.surveyNumber}` : `ID: ${farm.id.slice(0, 8)}`}
                            </span>
                            <span className="farm-registry-client-meta">
                              {farm.client?.name || farm.ownerName || "Private Estate"}
                              {farm.client?.code ? ` (${farm.client.code})` : ""}
                            </span>
                            <span className="farm-registry-loc-meta">
                              • {farm.location || "Location pending"}
                            </span>
                          </div>

                          <div className="farm-registry-badges">
                            {risks.includes("Stalled >30d") && (
                              <span className="badge badge-amber" style={{ fontSize: 10, padding: "2px 6px" }}>
                                Stalled &gt;30d
                              </span>
                            )}
                            <StatusBadge status={farm.status} />
                          </div>
                        </div>

                        {/* Row 2: Telemetry Metrics Strip (Desktop) */}
                        <div className="farm-registry-metrics-desktop">
                          <span>Claimed: <strong style={{ color: "var(--ink)" }}>{farm.totalArea} ac</strong></span>
                          <span>•</span>
                          <span>Cultivable: <strong style={{ color: "var(--ink)" }}>{farm.cultivableArea} ac</strong></span>
                          {farm.measuredAcres && (
                            <>
                              <span>•</span>
                              <span>Measured: <strong style={{ color: "var(--primary)" }}>{farm.measuredAcres} ac</strong></span>
                            </>
                          )}
                          <span>•</span>
                          <span>Plots: <strong style={{ color: "var(--ink)" }}>{plotCount}</strong></span>
                          {farm.setupStage && (
                            <>
                              <span>•</span>
                              <span>Stage: <strong style={{ color: "var(--ink)" }}>{STAGE_LABELS[farm.setupStage] ?? farm.setupStage}</strong></span>
                            </>
                          )}
                        </div>

                        {/* Row 3: Meta IDs & Action Buttons (Desktop) */}
                        <div className="farm-registry-footer-desktop">
                          <div className="farm-registry-meta-id">
                            <span className="mono-label" style={{ fontSize: 10 }}>ID: {farm.id}</span>
                            <span>•</span>
                            <span>Updated {new Date(farm.updatedAt).toLocaleDateString()}</span>
                          </div>

                          <div className="farm-registry-actions">
                            {!hasBoundary && (
                              <Link
                                href={`${basePath}/${farm.id}?tab=map`}
                                className="btn btn-secondary btn-sm"
                                style={{ fontSize: 11, padding: "3px 10px", height: 26, lineHeight: "20px" }}
                              >
                                <Icons.MapPin size={11} />
                                <span>Demarcate</span>
                              </Link>
                            )}
                            <button
                              type="button"
                              onClick={() => setExpandedFarm(farm)}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: 11, padding: "3px 10px", height: 26, lineHeight: "20px" }}
                              title="Inspect satellite map"
                            >
                              <Icons.Maximize2 size={11} />
                              <span>Inspect Map</span>
                            </button>
                            <Link
                              href={`${basePath}/${farm.id}`}
                              className="btn btn-primary btn-sm"
                              style={{ fontSize: 11, padding: "3px 12px", height: 26, lineHeight: "20px" }}
                            >
                              <span>Open 360</span>
                              <Icons.ArrowRight size={10} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Mobile-Only Full-Width Telemetry & Action Strip */}
                    <div className="farm-registry-mobile-body">
                      <div className="farm-registry-metrics-mobile">
                        <span>Claimed: <strong style={{ color: "var(--ink)" }}>{farm.totalArea} ac</strong></span>
                        <span>•</span>
                        <span>Cult: <strong style={{ color: "var(--ink)" }}>{farm.cultivableArea} ac</strong></span>
                        {farm.measuredAcres && (
                          <>
                            <span>•</span>
                            <span>Meas: <strong style={{ color: "var(--primary)" }}>{farm.measuredAcres} ac</strong></span>
                          </>
                        )}
                        <span>•</span>
                        <span>Plots: <strong style={{ color: "var(--ink)" }}>{plotCount}</strong></span>
                        {farm.setupStage && (
                          <>
                            <span>•</span>
                            <span>Stage: <strong style={{ color: "var(--ink)" }}>{STAGE_LABELS[farm.setupStage] ?? farm.setupStage}</strong></span>
                          </>
                        )}
                      </div>

                      <div className="farm-registry-footer-mobile">
                        <div className="farm-registry-meta-id">
                          <span className="mono-label" style={{ fontSize: 10 }}>ID: {farm.id}</span>
                          <span>Updated {new Date(farm.updatedAt).toLocaleDateString()}</span>
                        </div>

                        <div className="farm-registry-actions">
                          {!hasBoundary && (
                            <Link
                              href={`${basePath}/${farm.id}?tab=map`}
                              className="btn btn-secondary btn-sm"
                            >
                              <Icons.MapPin size={11} />
                              <span>Demarcate</span>
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedFarm(farm)}
                            className="btn btn-secondary btn-sm"
                            title="Inspect satellite map"
                          >
                            <Icons.Maximize2 size={11} />
                            <span>Inspect</span>
                          </button>
                          <Link
                            href={`${basePath}/${farm.id}`}
                            className="btn btn-primary btn-sm"
                          >
                            <span>Open 360</span>
                            <Icons.ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            /* =========================================================================
               GRID VIEW (Responsive multi-column card layout)
               ========================================================================= */
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                gap: 14,
              }}
            >
              {farms.map((farm) => {
                const hasBoundary = !!farm.boundaryGeoJson;
                const ring = parseBoundary(farm.boundaryGeoJson ?? null);
                const plotCount = farm._count?.plots ?? farm.plots?.length ?? 0;
                const risks = slaRisks(farm);
                const lat = Number(farm.latitude) || 12.9716;
                const lng = Number(farm.longitude) || 77.5946;
                const center: [number, number] = [lat, lng];

                return (
                  <article
                    key={farm.id}
                    className="hover-glow"
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-card)",
                      border: "1px solid var(--hairline)",
                      boxShadow: "var(--shadow-card)",
                      overflow: "hidden",
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    {/* Top: Satellite Map with strict 4px padding frame */}
                    <div style={{ padding: "4px 4px 0 4px" }}>
                      <div
                        style={{
                          height: 140,
                          width: "100%",
                          borderRadius: "calc(var(--radius-md) - 2px)",
                          overflow: "hidden",
                          position: "relative",
                          border: "1px solid var(--hairline)",
                          background: "var(--surface-strong)",
                          cursor: "pointer",
                        }}
                        onClick={() => setExpandedFarm(farm)}
                        title="Click to inspect satellite map"
                      >
                        <GeoMap
                          center={center}
                          polygon={ring}
                          compact
                          height={140}
                          interactive={false}
                        />

                        {/* Demarcation badge overlay */}
                        <div
                          style={{
                            position: "absolute",
                            top: 6,
                            left: 6,
                            zIndex: 1000,
                            pointerEvents: "none",
                          }}
                        >
                          {hasBoundary ? (
                            <span
                              className="badge badge-green"
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
                                backdropFilter: "blur(4px)",
                                fontWeight: 600,
                              }}
                            >
                              ✓ {farm.measuredAcres ? `${farm.measuredAcres} ac` : "Mapped"}
                            </span>
                          ) : (
                            <span
                              className="badge badge-amber"
                              style={{
                                fontSize: 10,
                                padding: "2px 6px",
                                boxShadow: "0 1px 4px rgba(0,0,0,0.35)",
                                backdropFilter: "blur(4px)",
                                fontWeight: 600,
                              }}
                            >
                              ⚠️ Needs Boundary
                            </span>
                          )}
                        </div>

                        <div
                          style={{
                            position: "absolute",
                            top: 6,
                            right: 6,
                            zIndex: 1000,
                            pointerEvents: "none",
                            background: "rgba(0,0,0,0.7)",
                            color: "#fff",
                            borderRadius: 4,
                            padding: "3px 6px",
                            fontSize: 9,
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                          }}
                        >
                          <Icons.Maximize2 size={9} />
                          <span>Inspect</span>
                        </div>
                      </div>
                    </div>

                    {/* Card Content */}
                    <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
                      {/* Identity Header */}
                      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0, flex: 1 }}>
                          <input
                            type="checkbox"
                            checked={selected.has(farm.id)}
                            onChange={(e) => toggleSelect(farm.id, e.target.checked)}
                            aria-label={`Select ${farm.name}`}
                            style={{ cursor: "pointer", accentColor: "var(--ink)", width: 14, height: 14, flexShrink: 0 }}
                          />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <Link
                              href={`${basePath}/${farm.id}`}
                              style={{
                                fontSize: 15,
                                fontWeight: 700,
                                color: "var(--ink)",
                                textDecoration: "none",
                                display: "block",
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                letterSpacing: "-0.015em",
                              }}
                              title={farm.name}
                            >
                              {farm.name}
                            </Link>
                            <div style={{ fontSize: 11, color: "var(--muted)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {farm.client?.name || farm.ownerName || "Private Estate"} • {farm.location || "Location pending"}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                          {risks.includes("Stalled >30d") && (
                            <span className="badge badge-amber" style={{ fontSize: 9, padding: "1px 5px" }}>
                              Stalled
                            </span>
                          )}
                          <StatusBadge status={farm.status} />
                        </div>
                      </div>

                      {/* Metrics Strip */}
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 6,
                          padding: "8px 10px",
                          background: "var(--canvas-soft)",
                          borderRadius: "var(--radius-sm)",
                          border: "1px solid var(--hairline)",
                          fontSize: 11,
                        }}
                      >
                        <div>
                          <span className="muted" style={{ display: "block", fontSize: 10 }}>Total / Cultivable</span>
                          <strong style={{ color: "var(--ink)" }}>{farm.totalArea} ac</strong>
                          <span className="muted"> / {farm.cultivableArea} ac</span>
                        </div>
                        <div>
                          <span className="muted" style={{ display: "block", fontSize: 10 }}>Plots / Stage</span>
                          <strong style={{ color: "var(--ink)" }}>{plotCount} plots</strong>
                          <span className="muted"> • {farm.setupStage ? (STAGE_LABELS[farm.setupStage] ?? farm.setupStage) : "Active"}</span>
                        </div>
                      </div>

                      {/* Card Footer: Meta & Action buttons */}
                      <div
                        style={{
                          marginTop: "auto",
                          paddingTop: 8,
                          borderTop: "1px solid var(--hairline)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 6,
                        }}
                      >
                        <span className="mono-label" style={{ fontSize: 10 }}>
                          {farm.surveyNumber ? `Survey #${farm.surveyNumber}` : `ID: ${farm.id.slice(0, 8)}`}
                        </span>

                        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                          {!hasBoundary && (
                            <Link
                              href={`${basePath}/${farm.id}?tab=map`}
                              className="btn btn-secondary btn-sm"
                              style={{ fontSize: 11, padding: "3px 8px", height: 26, lineHeight: "20px" }}
                              title="Demarcate boundary"
                            >
                              <Icons.MapPin size={11} />
                            </Link>
                          )}
                          <button
                            type="button"
                            onClick={() => setExpandedFarm(farm)}
                            className="btn btn-secondary btn-sm"
                            style={{ fontSize: 11, padding: "3px 8px", height: 26, lineHeight: "20px" }}
                            title="Inspect satellite map"
                          >
                            <Icons.Maximize2 size={11} />
                          </button>
                          <Link
                            href={`${basePath}/${farm.id}`}
                            className="btn btn-primary btn-sm"
                            style={{ fontSize: 11, padding: "3px 10px", height: 26, lineHeight: "20px" }}
                          >
                            <span>Open 360</span>
                            <Icons.ArrowRight size={10} />
                          </Link>
                        </div>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {/* Pagination Controls */}
          {total > limit && (
            <div className="dir-pagination">
              <span>
                Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of {total.toLocaleString()} estates
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
      )}

      {/* Interactive Satellite Lightbox / Demarcation Modal */}
      {expandedFarm && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            backdropFilter: "blur(6px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setExpandedFarm(null)}
        >
          <div
            style={{
              width: "min(920px, 95vw)",
              maxHeight: "90vh",
              backgroundColor: "var(--surface-card)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--hairline)",
              overflow: "hidden",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 20px 48px rgba(0,0,0,0.5)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                padding: "16px 20px",
                borderBottom: "1px solid var(--hairline)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--surface-strong)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
                    {expandedFarm.name}
                  </h3>
                  {expandedFarm.boundaryGeoJson ? (
                    <span className="badge badge-green" style={{ fontSize: 10 }}>✓ Demarcated</span>
                  ) : (
                    <span className="badge badge-amber" style={{ fontSize: 10 }}>⚠️ Demarcation Pending</span>
                  )}
                </div>
                <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
                  {expandedFarm.client?.name || expandedFarm.ownerName} &middot; {expandedFarm.location}
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setExpandedFarm(null)}
                style={{ padding: 6 }}
                aria-label="Close modal"
              >
                <Icons.X size={18} />
              </button>
            </div>

            <div style={{ height: 460, width: "100%", position: "relative" }}>
              <GeoMap
                center={[Number(expandedFarm.latitude) || 12.9716, Number(expandedFarm.longitude) || 77.5946]}
                polygon={parseBoundary(expandedFarm.boundaryGeoJson ?? null)}
                height={460}
                interactive={false}
              />
            </div>

            <div
              style={{
                padding: "14px 20px",
                borderTop: "1px solid var(--hairline)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                background: "var(--surface-strong)",
                flexWrap: "wrap",
                gap: 10,
              }}
            >
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Claimed: <strong style={{ color: "var(--ink)" }}>{expandedFarm.totalArea} ac</strong> &middot; Cultivable:{" "}
                <strong style={{ color: "var(--ink)" }}>{expandedFarm.cultivableArea} ac</strong>
                {expandedFarm.measuredAcres && (
                  <span> &middot; Measured: <strong style={{ color: "var(--primary)" }}>{expandedFarm.measuredAcres} ac</strong></span>
                )}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <Link
                  href={`${basePath}/${expandedFarm.id}?tab=map`}
                  className="btn btn-primary btn-sm"
                >
                  <Icons.MapPin size={12} />
                  <span>Demarcate / Edit Boundary &rarr;</span>
                </Link>
                <Link
                  href={`${basePath}/${expandedFarm.id}`}
                  className="btn btn-secondary btn-sm"
                >
                  <span>Open Farm 360</span>
                  <Icons.ArrowRight size={11} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
