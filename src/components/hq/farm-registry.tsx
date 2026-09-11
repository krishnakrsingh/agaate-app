"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { Icons } from "@/components/icons";
import { StatusBadge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/toast";
import { parseBoundary, type LngLat } from "@/lib/geo";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), {
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
      if (!q) setClientOptions([]);
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
    loadFarms();
  }, [loadFarms]);

  // Keep selectedFarmId in sync with loaded farms
  useEffect(() => {
    if (farms.length > 0) {
      if (!selectedFarmId || !farms.some((f) => f.id === selectedFarmId)) {
        setSelectedFarmId(farms[0].id);
      }
    } else {
      setSelectedFarmId(null);
    }
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

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {/* Sleek Farm Registry Toolbar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "8px 14px",
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-card)",
          flexWrap: "wrap",
        }}
      >
        {/* Left Side: Search + Filter Pills */}
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", flex: 1, minWidth: 260 }}>
          {/* Search Box */}
          <div style={{ position: "relative", width: 260, minWidth: 200, flexShrink: 0 }}>
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
              placeholder="Search farm, ID, survey #, client…"
              style={{ paddingLeft: 32, paddingRight: 24, width: "100%", fontSize: 13, height: 34 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: 8,
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

          {/* Quick Filter Pills */}
          <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              className={`btn btn-sm ${boundaryFilter === "ALL" && !stalledOnly && statusFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => applyPreset({})}
              style={{ fontSize: 12, padding: "4px 12px", height: 34 }}
            >
              All ({total.toLocaleString()})
            </button>
            <button
              type="button"
              className={`btn btn-sm ${boundaryFilter === "HAS_BOUNDARY" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => applyPreset({ boundary: "HAS_BOUNDARY" })}
              style={{ fontSize: 12, padding: "4px 12px", height: 34 }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--green-ink)", display: "inline-block", marginRight: 5 }} />
              Demarcated
            </button>
            <button
              type="button"
              className={`btn btn-sm ${boundaryFilter === "NO_BOUNDARY" ? "btn-primary" : "btn-secondary"}`}
              onClick={() => applyPreset({ boundary: "NO_BOUNDARY" })}
              style={{ fontSize: 12, padding: "4px 12px", height: 34 }}
            >
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)", display: "inline-block", marginRight: 5 }} />
              Needs Boundary
            </button>
            <button
              type="button"
              className={`btn btn-sm ${stalledOnly ? "btn-primary" : "btn-secondary"}`}
              onClick={() => applyPreset({ stalled: true })}
              style={{ fontSize: 12, padding: "4px 12px", height: 34 }}
            >
              Stalled &gt;30d
            </button>
          </div>
        </div>

        {/* Right Side: Status, Sort, View Toggle, Reset */}
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          <select
            className="input-field"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            style={{ width: "auto", fontSize: 12, height: 34, padding: "4px 10px" }}
          >
            <option value="ALL">All Status</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <select
            className="input-field"
            value={sortBy}
            onChange={(e) => {
              setSortBy(e.target.value);
              setPage(1);
            }}
            style={{ width: "auto", fontSize: 12, height: 34, padding: "4px 10px" }}
          >
            <option value="updatedAt">Sort: Recent</option>
            <option value="createdAt">Sort: Newest</option>
            <option value="totalArea">Sort: Acreage</option>
            <option value="name">Sort: A–Z</option>
          </select>

          {/* View Mode Toggle: List vs Grid */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              background: "var(--surface-strong)",
              padding: 2,
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--hairline)",
              height: 34,
              boxSizing: "border-box",
            }}
          >
            <button
              type="button"
              onClick={() => setViewMode("list")}
              title="List View"
              aria-label="List View"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: viewMode === "list" ? 600 : 400,
                borderRadius: "calc(var(--radius-sm) - 2px)",
                border: "none",
                cursor: "pointer",
                background: viewMode === "list" ? "var(--surface-card)" : "transparent",
                color: viewMode === "list" ? "var(--ink)" : "var(--muted)",
                boxShadow: viewMode === "list" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                height: "100%",
                transition: "all 0.15s ease",
              }}
            >
              <Icons.List size={13} />
              <span>List</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              title="Grid View"
              aria-label="Grid View"
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                padding: "4px 10px",
                fontSize: 12,
                fontWeight: viewMode === "grid" ? 600 : 400,
                borderRadius: "calc(var(--radius-sm) - 2px)",
                border: "none",
                cursor: "pointer",
                background: viewMode === "grid" ? "var(--surface-card)" : "transparent",
                color: viewMode === "grid" ? "var(--ink)" : "var(--muted)",
                boxShadow: viewMode === "grid" ? "0 1px 2px rgba(0,0,0,0.08)" : "none",
                height: "100%",
                transition: "all 0.15s ease",
              }}
            >
              <Icons.Grid size={13} />
              <span>Grid</span>
            </button>
          </div>

          {(search || statusFilter !== "ALL" || stageFilter !== "ALL" || boundaryFilter !== "ALL" || stalledOnly || clientId) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => applyPreset({})}
              style={{ fontSize: 12, padding: "4px 10px", height: 34 }}
              title="Reset all filters"
            >
              <Icons.X size={12} style={{ marginRight: 4 }} />
              <span>Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* Bulk Action Toolbar */}
      {selected.size > 0 && (
        <div
          style={{
            display: "flex",
            gap: 10,
            alignItems: "center",
            flexWrap: "wrap",
            padding: "12px 16px",
            background: "var(--canvas-soft)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            fontSize: 13,
          }}
        >
          <strong style={{ color: "var(--ink)" }}>{selected.size} selected</strong>
          <select
            className="input-field"
            value={bulkAction}
            onChange={(e) => setBulkAction(e.target.value as "STATUS" | "STAGE")}
            style={{ width: "auto", fontSize: 13, height: 34 }}
          >
            <option value="STAGE">Set stage</option>
            <option value="STATUS">Set status</option>
          </select>
          {bulkAction === "STATUS" ? (
            <select
              className="input-field"
              value={bulkStatus}
              onChange={(e) => setBulkStatus(e.target.value)}
              style={{ width: "auto", fontSize: 13, height: 34 }}
            >
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          ) : (
            <select
              className="input-field"
              value={bulkStage}
              onChange={(e) => setBulkStage(e.target.value)}
              style={{ width: "auto", fontSize: 13, height: 34 }}
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
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(new Set())}>
            <span>Clear selection</span>
          </button>
        </div>
      )}

      {/* Loading and Error States */}
      {loading ? (
        <div className="compact-card" style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
          Loading farm portfolio and geospatial layers…
        </div>
      ) : loadError ? (
        <div className="compact-card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>{loadError}</div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={loadFarms}>
            <span>Retry</span>
          </button>
        </div>
      ) : farms.length === 0 ? (
        <div className="compact-card" style={{ padding: 48, textAlign: "center" }}>
          <div style={{ fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>No farms match the selected filters</div>
          <p className="muted" style={{ fontSize: 13, margin: 0 }}>Try clearing filters or changing search keywords.</p>
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
                    className="hover-glow"
                    style={{
                      display: "flex",
                      flexDirection: "row",
                      alignItems: "center",
                      padding: 4, // STRICT 4px padding between map and bar boundary
                      borderRadius: "var(--radius-md)",
                      background: "var(--surface-card)",
                      border: "1px solid var(--hairline)",
                      boxShadow: "var(--shadow-card)",
                      gap: 14,
                      minHeight: 120,
                      transition: "border-color 0.15s ease, box-shadow 0.15s ease",
                    }}
                  >
                    {/* Left: Square Satellite Map (112px x 112px, 4px from top/left/bottom) */}
                    <div
                      style={{
                        width: 112,
                        height: 112,
                        minWidth: 112,
                        maxWidth: 112,
                        borderRadius: "var(--radius-sm)",
                        overflow: "hidden",
                        position: "relative",
                        border: "1px solid var(--hairline)",
                        background: "var(--surface-strong)",
                        flexShrink: 0,
                        cursor: "pointer",
                      }}
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
                    <div
                      style={{
                        flex: 1,
                        minWidth: 0,
                        paddingLeft: 4,
                        paddingRight: 14,
                        height: "100%",
                        minHeight: 112,
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "space-between",
                        paddingTop: 4,
                        paddingBottom: 4,
                        gap: 8,
                      }}
                    >
                      {/* Row 1: Checkbox, Farm Name, Survey #, Client, Location & Status */}
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, overflow: "hidden" }}>
                          <input
                            type="checkbox"
                            checked={selected.has(farm.id)}
                            onChange={(e) => toggleSelect(farm.id, e.target.checked)}
                            aria-label={`Select ${farm.name}`}
                            style={{ cursor: "pointer", accentColor: "var(--ink)", width: 15, height: 15, flexShrink: 0 }}
                          />
                          <Link
                            href={`${basePath}/${farm.id}`}
                            style={{
                              fontSize: 15,
                              fontWeight: 700,
                              color: "var(--ink)",
                              textDecoration: "none",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              letterSpacing: "-0.015em",
                            }}
                            title={farm.name}
                          >
                            {farm.name}
                          </Link>
                          <span
                            className="mono-label"
                            style={{
                              fontSize: 11,
                              padding: "2px 6px",
                              background: "var(--surface-strong)",
                              borderRadius: 4,
                              flexShrink: 0,
                            }}
                          >
                            {farm.surveyNumber ? `Survey #${farm.surveyNumber}` : `ID: ${farm.id.slice(0, 8)}`}
                          </span>
                          <span
                            style={{
                              fontSize: 12,
                              color: "var(--body-strong)",
                              fontWeight: 500,
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                            }}
                          >
                            {farm.client?.name || farm.ownerName || "Private Estate"}
                            {farm.client?.code ? ` (${farm.client.code})` : ""}
                          </span>
                          <span className="muted" style={{ fontSize: 12, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                            &bull; {farm.location || "Location pending"}
                          </span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                          {risks.includes("Stalled >30d") && (
                            <span className="badge badge-amber" style={{ fontSize: 10, padding: "2px 6px" }}>
                              Stalled &gt;30d
                            </span>
                          )}
                          <StatusBadge status={farm.status} />
                        </div>
                      </div>

                      {/* Row 2: Telemetry Metrics Strip */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 12,
                          fontSize: 12,
                          color: "var(--muted)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        <span>Claimed: <strong style={{ color: "var(--ink)" }}>{farm.totalArea} ac</strong></span>
                        <span>&bull;</span>
                        <span>Cultivable: <strong style={{ color: "var(--ink)" }}>{farm.cultivableArea} ac</strong></span>
                        {farm.measuredAcres && (
                          <>
                            <span>&bull;</span>
                            <span>Measured: <strong style={{ color: "var(--primary)" }}>{farm.measuredAcres} ac</strong></span>
                          </>
                        )}
                        <span>&bull;</span>
                        <span>Plots: <strong style={{ color: "var(--ink)" }}>{plotCount}</strong></span>
                        {farm.setupStage && (
                          <>
                            <span>&bull;</span>
                            <span>Stage: <strong style={{ color: "var(--ink)" }}>{STAGE_LABELS[farm.setupStage] ?? farm.setupStage}</strong></span>
                          </>
                        )}
                      </div>

                      {/* Row 3: Meta IDs & Action Buttons */}
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          gap: 10,
                          fontSize: 11,
                          color: "var(--muted)",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span className="mono-label" style={{ fontSize: 10 }}>ID: {farm.id}</span>
                          <span>&bull;</span>
                          <span>Updated {new Date(farm.updatedAt).toLocaleDateString()}</span>
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
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
                              {farm.client?.name || farm.ownerName || "Private Estate"} &bull; {farm.location || "Location pending"}
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
                          <span className="muted"> &bull; {farm.setupStage ? (STAGE_LABELS[farm.setupStage] ?? farm.setupStage) : "Active"}</span>
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
            <div
              style={{
                padding: "12px 16px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              <span>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total.toLocaleString()} estates
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
                <span style={{ alignSelf: "center" }}>
                  {page} / {totalPages}
                </span>
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
