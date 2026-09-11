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
        minHeight: 120,
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
  const [viewMode, setViewMode] = useState<"bars" | "table">("bars");
  const [mapPosition, setMapPosition] = useState<"left" | "right">("left");
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
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {/* 1. Sleek Search & Quick Filter Bar */}
      <div
        className="compact-card"
        style={{
          padding: "14px 18px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          {/* Search Box */}
          <div style={{ position: "relative", minWidth: 280, flex: 1 }}>
            <Icons.Search
              size={15}
              style={{
                position: "absolute",
                left: 12,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--muted)",
              }}
            />
            <input
              className="input-field"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search farm name, ID, survey #, location, client…"
              style={{ paddingLeft: 36, width: "100%", fontSize: 14 }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                aria-label="Clear search"
                style={{
                  position: "absolute",
                  right: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  color: "var(--muted)",
                }}
              >
                <Icons.X size={14} />
              </button>
            )}
          </div>

          {/* Compact Dropdown Filters */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto", fontSize: 13, height: 38 }}
            >
              <option value="ALL">All Statuses</option>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>

            <select
              className="input-field"
              value={stageFilter}
              onChange={(e) => {
                setStageFilter(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto", fontSize: 13, height: 38 }}
            >
              <option value="ALL">All Stages</option>
              {STAGE_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {STAGE_LABELS[s]}
                </option>
              ))}
            </select>

            <select
              className="input-field"
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setPage(1);
              }}
              style={{ width: "auto", fontSize: 13, height: 38 }}
            >
              <option value="updatedAt">Sort: Recently updated</option>
              <option value="createdAt">Sort: Newest intake</option>
              <option value="totalArea">Sort: Largest acreage</option>
              <option value="name">Sort: Name A–Z</option>
            </select>

            {/* View Mode Switcher */}
            <div
              style={{
                display: "inline-flex",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-pill)",
                overflow: "hidden",
                background: "var(--surface-strong)",
                padding: 2,
              }}
            >
              <button
                type="button"
                onClick={() => setViewMode("bars")}
                style={{
                  border: "none",
                  background: viewMode === "bars" ? "var(--surface-card)" : "transparent",
                  color: viewMode === "bars" ? "var(--ink)" : "var(--muted)",
                  fontWeight: viewMode === "bars" ? 600 : 500,
                  fontSize: 12,
                  padding: "5px 12px",
                  borderRadius: "var(--radius-pill)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Icons.Layers size={13} />
                <span>Bar Feed</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("table")}
                style={{
                  border: "none",
                  background: viewMode === "table" ? "var(--surface-card)" : "transparent",
                  color: viewMode === "table" ? "var(--ink)" : "var(--muted)",
                  fontWeight: viewMode === "table" ? 600 : 500,
                  fontSize: 12,
                  padding: "5px 12px",
                  borderRadius: "var(--radius-pill)",
                  cursor: "pointer",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Icons.Plot size={13} />
                <span>Table</span>
              </button>
            </div>

            {/* Map Position Switcher for Bar Feed */}
            {viewMode === "bars" && (
              <div
                style={{
                  display: "inline-flex",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-pill)",
                  overflow: "hidden",
                  background: "var(--surface-strong)",
                  padding: 2,
                }}
                title="Map position inside bar"
              >
                <button
                  type="button"
                  onClick={() => setMapPosition("left")}
                  style={{
                    border: "none",
                    background: mapPosition === "left" ? "var(--surface-card)" : "transparent",
                    color: mapPosition === "left" ? "var(--ink)" : "var(--muted)",
                    fontWeight: mapPosition === "left" ? 600 : 500,
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: "var(--radius-pill)",
                    cursor: "pointer",
                  }}
                >
                  Map: Left
                </button>
                <button
                  type="button"
                  onClick={() => setMapPosition("right")}
                  style={{
                    border: "none",
                    background: mapPosition === "right" ? "var(--surface-card)" : "transparent",
                    color: mapPosition === "right" ? "var(--ink)" : "var(--muted)",
                    fontWeight: mapPosition === "right" ? 600 : 500,
                    fontSize: 11,
                    padding: "4px 8px",
                    borderRadius: "var(--radius-pill)",
                    cursor: "pointer",
                  }}
                >
                  Right
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Preset Filter Pills */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", paddingTop: 4 }}>
          <span className="muted" style={{ fontSize: 11, fontWeight: 600, letterSpacing: 0.5 }}>
            QUICK VIEWS:
          </span>
          <button
            type="button"
            className={`btn btn-sm ${boundaryFilter === "ALL" && !stalledOnly && statusFilter === "ALL" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => applyPreset({})}
            style={{ fontSize: 12, padding: "4px 12px" }}
          >
            All Estates ({total.toLocaleString()})
          </button>
          <button
            type="button"
            className={`btn btn-sm ${boundaryFilter === "HAS_BOUNDARY" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => applyPreset({ boundary: "HAS_BOUNDARY" })}
            style={{ fontSize: 12, padding: "4px 12px" }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--semantic-success)", display: "inline-block", marginRight: 4 }} />
            Demarcated
          </button>
          <button
            type="button"
            className={`btn btn-sm ${boundaryFilter === "NO_BOUNDARY" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => applyPreset({ boundary: "NO_BOUNDARY" })}
            style={{ fontSize: 12, padding: "4px 12px" }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--amber)", display: "inline-block", marginRight: 4 }} />
            Needs Boundary (25k)
          </button>
          <button
            type="button"
            className={`btn btn-sm ${stalledOnly ? "btn-primary" : "btn-secondary"}`}
            onClick={() => applyPreset({ stalled: true })}
            style={{ fontSize: 12, padding: "4px 12px" }}
          >
            Stalled &gt;30d
          </button>
          <button
            type="button"
            className={`btn btn-sm ${statusFilter === "ACTIVE" ? "btn-primary" : "btn-secondary"}`}
            onClick={() => applyPreset({ status: "ACTIVE" })}
            style={{ fontSize: 12, padding: "4px 12px" }}
          >
            Active Only
          </button>
          {(search || statusFilter !== "ALL" || stageFilter !== "ALL" || boundaryFilter !== "ALL" || stalledOnly || clientId) && (
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => applyPreset({})}
              style={{ fontSize: 12, padding: "4px 10px", marginLeft: "auto" }}
            >
              Reset Filters
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
      ) : viewMode === "split" ? (
        /* =========================================================================
           MODE 1: PRO SPLIT VIEW (Bar-Type List on Left + Square Map on Right)
           ========================================================================= */
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
            gap: 20,
            alignItems: "start",
          }}
        >
          {/* Left Column: Bar-Type Feed */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {farms.map((farm) => {
              const isSelected = selectedFarm?.id === farm.id;
              const hasBoundary = !!farm.boundaryGeoJson;
              const plotCount = farm._count?.plots ?? farm.plots?.length ?? 0;
              const risks = slaRisks(farm);

              return (
                <div
                  key={farm.id}
                  onClick={() => setSelectedFarmId(farm.id)}
                  className="hover-glow"
                  style={{
                    padding: "14px 16px",
                    background: isSelected ? "var(--canvas-soft)" : "var(--surface-card)",
                    border: isSelected ? "1.5px solid var(--primary)" : "1px solid var(--hairline)",
                    borderRadius: "var(--radius-md)",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    transition: "border-color 0.12s ease, background 0.12s ease",
                  }}
                >
                  {/* Top Bar: Name & Badges */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--ink)" }}>
                          {farm.name}
                        </span>
                        <span className="mono-label" style={{ fontSize: 10 }}>
                          {farm.surveyNumber ? `Sy #${farm.surveyNumber}` : `ID: ${farm.id.slice(0, 10)}…`}
                        </span>
                      </div>
                      <div className="muted" style={{ fontSize: 13, marginTop: 2 }}>
                        {farm.client?.name ? (
                          <span style={{ fontWeight: 500 }}>
                            {farm.client.name} {farm.client.code ? `(${farm.client.code})` : ""} &middot;{" "}
                          </span>
                        ) : farm.ownerName ? (
                          <span>{farm.ownerName} &middot; </span>
                        ) : null}
                        <span>{farm.location}</span>
                      </div>
                    </div>

                    <div style={{ display: "flex", gap: 6, flexShrink: 0, alignItems: "center" }}>
                      {hasBoundary ? (
                        <span className="badge badge-green" style={{ fontSize: 11, padding: "3px 8px" }}>
                          ✓ {farm.measuredAcres ? `${farm.measuredAcres} ac` : "Demarcated"}
                        </span>
                      ) : (
                        <span className="badge badge-amber" style={{ fontSize: 11, padding: "3px 8px" }}>
                          ⚠️ Unmapped
                        </span>
                      )}
                      <StatusBadge status={farm.status} />
                    </div>
                  </div>

                  {/* Bottom Bar: Quick Telemetry & Action */}
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                      fontSize: 12,
                      borderTop: "1px solid var(--hairline-soft)",
                      paddingTop: 8,
                      marginTop: 2,
                    }}
                  >
                    <div style={{ display: "flex", gap: 12, flexWrap: "wrap", color: "var(--muted)" }}>
                      <span>
                        Area: <strong style={{ color: "var(--ink)" }}>{farm.totalArea} ac</strong>
                      </span>
                      <span>
                        Plots: <strong style={{ color: "var(--ink)" }}>{plotCount}</strong>
                      </span>
                      {farm.setupStage && (
                        <span>
                          Stage: <strong style={{ color: "var(--ink)" }}>{STAGE_LABELS[farm.setupStage] ?? farm.setupStage}</strong>
                        </span>
                      )}
                      {risks.includes("Stalled >30d") && (
                        <span className="badge badge-amber" style={{ fontSize: 10 }}>
                          Stalled &gt;30d
                        </span>
                      )}
                    </div>

                    <Link
                      href={`${basePath}/${farm.id}`}
                      onClick={(e) => e.stopPropagation()}
                      className="btn btn-secondary btn-sm"
                      style={{ fontSize: 11, padding: "3px 10px" }}
                    >
                      <span>Open 360</span>
                      <Icons.ArrowRight size={10} />
                    </Link>
                  </div>
                </div>
              );
            })}

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

          {/* Right Column: Square-Type Map Card (Sticky) */}
          <div
            className="compact-card"
            style={{
              padding: 0,
              overflow: "hidden",
              position: "sticky",
              top: 24,
              display: "flex",
              flexDirection: "column",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {selectedFarm ? (
              <>
                {/* Header inside Map Card */}
                <div
                  style={{
                    padding: "14px 18px",
                    borderBottom: "1px solid var(--hairline)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 12,
                    background: "var(--canvas-soft)",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <h2
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          margin: 0,
                          color: "var(--ink)",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {selectedFarm.name}
                      </h2>
                      {selectedRing ? (
                        <span className="badge badge-green" style={{ fontSize: 10 }}>
                          ✓ Cadastral Boundary Plotted
                        </span>
                      ) : (
                        <span className="badge badge-amber" style={{ fontSize: 10 }}>
                          ⚠️ No Boundary Drawn
                        </span>
                      )}
                    </div>
                    <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                      {selectedFarm.client?.name || selectedFarm.ownerName} &middot; {selectedFarm.location}
                    </div>
                  </div>

                  <Link
                    href={`/hq/farms/${selectedFarm.id}`}
                    className="btn btn-secondary btn-sm"
                    style={{ flexShrink: 0, fontSize: 12, padding: "5px 12px" }}
                  >
                    <span>Farm 360</span>
                    <Icons.ArrowRight size={12} />
                  </Link>
                </div>

                {/* Square Map Viewer Canvas */}
                <div
                  style={{
                    width: "100%",
                    height: 440,
                    position: "relative",
                    background: "var(--surface-card)",
                  }}
                >
                  <GeoMap
                    center={mapCenter}
                    polygon={selectedRing}
                    onChange={() => {}}
                    height="100%"
                    interactive={false}
                    pins={mapPins}
                  />

                  {/* Warning Overlay when Boundary is Missing */}
                  {!selectedRing && (
                    <div
                      style={{
                        position: "absolute",
                        bottom: 12,
                        left: 12,
                        right: 12,
                        zIndex: 1000,
                        background: "rgba(255, 255, 255, 0.95)",
                        backdropFilter: "blur(8px)",
                        border: "1px solid var(--hairline)",
                        borderRadius: "var(--radius-md)",
                        padding: "10px 14px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 10,
                        boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
                      }}
                    >
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                          ⚠️ Cadastral boundary walk pending
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          Coordinates: {mapCenter[0].toFixed(4)}° N, {mapCenter[1].toFixed(4)}° E
                        </div>
                      </div>
                      <Link
                        href={`${basePath}/${selectedFarm.id}?tab=map`}
                        className="btn btn-primary btn-sm"
                        style={{ fontSize: 11, padding: "4px 10px", whiteSpace: "nowrap" }}
                      >
                        Demarcate on Map &rarr;
                      </Link>
                    </div>
                  )}
                </div>

                {/* Bottom Stats Footer */}
                <div
                  style={{
                    padding: "12px 18px",
                    borderTop: "1px solid var(--hairline)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    fontSize: 12,
                    background: "var(--canvas-soft)",
                    flexWrap: "wrap",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", gap: 14 }}>
                    <div>
                      <span className="muted">Claimed: </span>
                      <strong style={{ color: "var(--ink)" }}>{selectedFarm.totalArea} ac</strong>
                    </div>
                    <div>
                      <span className="muted">Cultivable: </span>
                      <strong style={{ color: "var(--ink)" }}>{selectedFarm.cultivableArea} ac</strong>
                    </div>
                    {selectedFarm.measuredAcres && (
                      <div>
                        <span className="muted">Measured: </span>
                        <strong style={{ color: "var(--primary)" }}>{selectedFarm.measuredAcres} ac</strong>
                      </div>
                    )}
                  </div>
                  <div className="muted">
                    Plots: <strong>{selectedFarm._count?.plots ?? selectedFarm.plots?.length ?? 0}</strong>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>
                Select a farm from the list to preview its map location and boundary.
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =========================================================================
           MODE 2: DATA TABLE VIEW (Full Width Spreadsheet)
           ========================================================================= */
        <div style={{ background: "var(--surface-card)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="table" style={{ width: "100%", fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input
                      type="checkbox"
                      checked={allOnPageSelected}
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      aria-label="Select all farms"
                    />
                  </th>
                  <th>Farm</th>
                  <th>Client</th>
                  <th>Location</th>
                  <th>Acreage</th>
                  <th>Plots</th>
                  <th>Boundary</th>
                  <th>State / Stage</th>
                  <th>SLA Risk</th>
                  <th style={{ textAlign: "right" }}>Farm 360</th>
                </tr>
              </thead>
              <tbody>
                {farms.map((farm) => {
                  const hasBoundary = !!farm.boundaryGeoJson;
                  const plotCount = farm._count?.plots ?? farm.plots?.length ?? 0;
                  const risks = slaRisks(farm);

                  return (
                    <tr key={farm.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.has(farm.id)}
                          onChange={(e) => toggleSelect(farm.id, e.target.checked)}
                          aria-label={`Select farm ${farm.name}`}
                        />
                      </td>
                      <td>
                        <Link href={`/hq/farms/${farm.id}`} style={{ fontWeight: 600, color: "var(--ink)", textDecoration: "none" }}>
                          {farm.name}
                        </Link>
                        <div className="mono-label" style={{ fontSize: 10, marginTop: 2 }}>
                          {farm.surveyNumber ? `Sy #${farm.surveyNumber}` : `ID: ${farm.id.slice(0, 10)}…`}
                        </div>
                      </td>
                      <td>
                        {farm.client ? (
                          <div>
                            <span style={{ fontWeight: 500, color: "var(--ink)" }}>{farm.client.name}</span>
                            {farm.client.code && (
                              <span className="badge" style={{ fontSize: 10, marginLeft: 6 }}>
                                {farm.client.code}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="muted">{farm.ownerName}</span>
                        )}
                      </td>
                      <td>
                        <div style={{ color: "var(--ink)" }}>{farm.location}</div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {[farm.district, farm.state].filter(Boolean).join(", ") || "—"}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                          {farm.totalArea} ac
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>
                          {farm.cultivableArea} ac cultivable
                        </div>
                      </td>
                      <td>
                        <span style={{ fontWeight: 600, color: "var(--ink)" }}>{plotCount}</span>
                      </td>
                      <td>
                        {hasBoundary ? (
                          <span className="badge badge-green" style={{ fontSize: 11 }}>
                            ✓ {farm.measuredAcres ? `${farm.measuredAcres} ac` : "Demarcated"}
                          </span>
                        ) : (
                          <span className="badge badge-amber" style={{ fontSize: 11 }}>
                            Missing
                          </span>
                        )}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                          <StatusBadge status={farm.status} />
                          {farm.setupStage && (
                            <span className="badge" style={{ fontSize: 10 }}>
                              {(STAGE_LABELS[farm.setupStage] || farm.setupStage).toUpperCase()}
                            </span>
                          )}
                        </div>
                      </td>
                      <td>
                        {risks.length === 0 ? (
                          <span className="badge badge-green" style={{ fontSize: 11 }}>
                            On track
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: 11 }}>
                            {risks[0]}
                          </span>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <Link href={`${basePath}/${farm.id}`} className="btn btn-secondary btn-sm" style={{ textDecoration: "none" }}>
                          <span>Open 360</span>
                          <Icons.ArrowRight size={12} />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {total > limit && (
            <div
              style={{
                padding: "12px 20px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                borderTop: "1px solid var(--hairline)",
                fontSize: 12,
                color: "var(--muted)",
              }}
            >
              <span>
                Showing {(page - 1) * limit + 1} to {Math.min(page * limit, total)} of {total.toLocaleString()} farms
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
                  Page {page} of {totalPages}
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
    </div>
  );
}
