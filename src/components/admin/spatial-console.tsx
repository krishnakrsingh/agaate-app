"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Icons } from "@/components/icons";
import { parseBoundary, toGeoJsonPolygon, ringAcres, type LngLat } from "@/lib/geo";
import { useToast } from "@/components/ui/toast";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => (
    <div style={{ height: "100%", width: "100%", display: "grid", placeItems: "center", background: "var(--canvas)", color: "var(--muted)", fontSize: 13 }}>
      Loading satellite imagery &amp; geospatial layers…
    </div>
  ),
});

interface SpatialFarm {
  id: string;
  name: string;
  location: string;
  surveyNumber?: string | null;
  district?: string | null;
  latitude: number;
  longitude: number;
  totalArea: number;
  cultivableArea?: number | null;
  measuredAcres: number | null;
  boundaryGeoJson: string | null;
  status: string;
  setupStage: string | null;
  plotCount: number;
  plots: Array<{
    id: string;
    name: string;
    area: number;
    measuredAcres: number | null;
    boundaryGeoJson: string | null;
    status: string;
  }>;
}

interface FlaggedVersion {
  id: string;
  version: number;
  entityType: "FARM" | "PLOT";
  entityId: string;
  entityName: string;
  farmId: string;
  farmName: string;
  source: string;
  measuredAcres: number | null;
  prevAcres: number | null;
  deltaPercent: number | null;
  actorName: string | null;
  captureId: string | null;
  createdAt: string;
}

interface WalkTrackItem {
  id: string;
  entityType: string;
  entityId: string;
  quality: string;
  acres: number | null;
  samplesKept: number;
  samplesDropped: number;
  actorId: string | null;
  createdAt: string;
}

interface SpatialStats {
  totalEstates: number;
  demarcatedCount: number;
  flaggedCount: number;
}

export function SpatialConsole() {
  const toast = useToast();
  const [farms, setFarms] = useState<SpatialFarm[]>([]);
  const [flaggedVersions, setFlaggedVersions] = useState<FlaggedVersion[]>([]);
  const [recentWalks, setRecentWalks] = useState<WalkTrackItem[]>([]);
  const [stats, setStats] = useState<SpatialStats>({ totalEstates: 0, demarcatedCount: 0, flaggedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"demarcated" | "all" | "missing">("demarcated");
  const [selectedFarmId, setSelectedFarmId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"map" | "reviews" | "walks">("map");

  // Local editable boundary for the currently selected farm
  const [currentRing, setCurrentRing] = useState<LngLat[] | null>(null);
  const [savingBoundary, setSavingBoundary] = useState(false);

  const fetchFarms = useCallback((searchTerm: string, filterMode: string) => {
    setLoading(true);
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    params.set("filter", filterMode);
    params.set("limit", "50");

    fetch(`/api/admin/boundary-reviews?${params.toString()}`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Failed to load spatial portfolio.");
        return res.json();
      })
      .then((data) => {
        setFarms(data.farms || []);
        setFlaggedVersions(data.flaggedVersions || []);
        setRecentWalks(data.recentWalks || []);
        if (data.stats) {
          setStats(data.stats);
        }
        if (data.farms && data.farms.length > 0) {
          setSelectedFarmId((prev) => {
            const exists = data.farms.some((f: SpatialFarm) => f.id === prev);
            return exists ? prev : data.farms[0].id;
          });
        }
      })
      .catch((err) => setError(err.message || "Network error loading spatial data."))
      .finally(() => setLoading(false));
  }, []);

  // Debounced search trigger
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchFarms(search.trim(), filter);
    }, 250);
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [search, filter, fetchFarms]);

  // Keep local polygon ring in sync when selected farm changes
  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0] || null;

  useEffect(() => {
    if (selectedFarm?.boundaryGeoJson) {
      setCurrentRing(parseBoundary(selectedFarm.boundaryGeoJson));
    } else {
      setCurrentRing(null);
    }
  }, [selectedFarm?.id, selectedFarm?.boundaryGeoJson]);

  const centerCoords: [number, number] = selectedFarm
    ? [selectedFarm.latitude, selectedFarm.longitude]
    : [20.5937, 78.9629];

  const handleSaveBoundary = async () => {
    if (!selectedFarm) return;
    setSavingBoundary(true);
    try {
      const geoJsonString = currentRing && currentRing.length >= 4 ? toGeoJsonPolygon(currentRing) : null;
      const res = await fetch(`/api/farms/${selectedFarm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boundaryGeoJson: geoJsonString }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to persist estate boundary.");
      }

      const updated = await res.json();
      toast.success(
        geoJsonString
          ? `Boundary saved successfully (${updated.measuredAcres || 0} acres)!`
          : "Boundary cleared successfully."
      );

      // Update local farm record
      setFarms((prev) =>
        prev.map((f) =>
          f.id === selectedFarm.id
            ? {
                ...f,
                boundaryGeoJson: updated.boundaryGeoJson,
                measuredAcres: updated.measuredAcres ? Number(updated.measuredAcres) : null,
              }
            : f
        )
      );

      // Update stats count if demarcation changed
      if (!selectedFarm.boundaryGeoJson && geoJsonString) {
        setStats((prev) => ({ ...prev, demarcatedCount: prev.demarcatedCount + 1 }));
      } else if (selectedFarm.boundaryGeoJson && !geoJsonString) {
        setStats((prev) => ({ ...prev, demarcatedCount: Math.max(0, prev.demarcatedCount - 1) }));
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to save boundary.");
    } finally {
      setSavingBoundary(false);
    }
  };

  const calculatedAcres = currentRing ? ringAcres(currentRing) : 0;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* 1. Ultra-Compact Top Operational Toolbar (48px) */}
      <header
        style={{
          height: 48,
          minHeight: 48,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 16px",
          background: "var(--surface)",
          borderBottom: "1px solid var(--hairline)",
          zIndex: 20,
        }}
      >
        {/* Left: Branding & High-Level Counters */}
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "rgba(46,125,50,0.12)",
                color: "var(--green)",
                display: "grid",
                placeItems: "center",
              }}
            >
              <Icons.Navigation size={14} />
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              Spatial Console
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span className="badge badge-green" style={{ fontSize: 11, padding: "2px 8px" }}>
              {stats.demarcatedCount} Demarcated
            </span>
            <span className="badge badge-stone" style={{ fontSize: 11, padding: "2px 8px" }}>
              {stats.totalEstates.toLocaleString()} Total Estates
            </span>
            {stats.flaggedCount > 0 && (
              <span className="badge badge-red" style={{ fontSize: 11, padding: "2px 8px" }}>
                {stats.flaggedCount} Flagged
              </span>
            )}
          </div>
        </div>

        {/* Center: Primary Tab Switchers */}
        <div className="tabs-nav" style={{ margin: 0, gap: 4 }}>
          <button
            type="button"
            className={`tab-btn ${activeTab === "map" ? "active" : ""}`}
            onClick={() => setActiveTab("map")}
            style={{ padding: "4px 12px", fontSize: 12 }}
          >
            <Icons.Plot size={13} />
            <span>Satellite Studio</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === "reviews" ? "active" : ""}`}
            onClick={() => setActiveTab("reviews")}
            style={{ padding: "4px 12px", fontSize: 12 }}
          >
            <Icons.Shield size={13} />
            <span>Boundary Reviews ({flaggedVersions.length})</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeTab === "walks" ? "active" : ""}`}
            onClick={() => setActiveTab("walks")}
            style={{ padding: "4px 12px", fontSize: 12 }}
          >
            <Icons.Navigation size={13} />
            <span>GPS Walks ({recentWalks.length})</span>
          </button>
        </div>

        {/* Right: Selected Estate Deep-link */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {selectedFarm && (
            <Link
              href={`/farms/${selectedFarm.id}`}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: "4px 10px", height: 28 }}
            >
              <span>{selectedFarm.name}</span>
              <Icons.ArrowRight size={11} />
            </Link>
          )}
        </div>
      </header>

      {/* 2. Main Workstation Viewport Body (100% Remaining Height, Zero Page Scroll) */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>
        {error ? (
          <div style={{ padding: 32, margin: "auto", textAlign: "center", color: "var(--amber)" }}>
            {error}
          </div>
        ) : activeTab === "map" ? (
          /* TAB 1: SATELLITE STUDIO (LEFT DIRECTORY + RIGHT EDGE-TO-EDGE MAP) */
          <div style={{ display: "flex", width: "100%", height: "100%", overflow: "hidden" }}>
            {/* Left Sidebar: Fast Filterable Estate Directory */}
            <aside
              style={{
                width: 320,
                minWidth: 320,
                height: "100%",
                background: "var(--surface)",
                borderRight: "1px solid var(--hairline)",
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
                zIndex: 10,
              }}
            >
              {/* Search Bar with Instant Clear */}
              <div style={{ padding: "10px 12px", borderBottom: "1px solid var(--hairline)", display: "flex", gap: 6 }}>
                <div style={{ position: "relative", flex: 1 }}>
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search 25k estates, survey #…"
                    style={{
                      width: "100%",
                      fontSize: 12,
                      padding: "6px 26px 6px 10px",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--hairline)",
                      background: "var(--canvas-floor)",
                      color: "var(--ink)",
                    }}
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch("")}
                      style={{
                        position: "absolute",
                        right: 6,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--muted)",
                        fontSize: 12,
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>

              {/* Quick Filter Pills */}
              <div
                style={{
                  padding: "8px 12px",
                  display: "flex",
                  gap: 4,
                  borderBottom: "1px solid var(--hairline)",
                  background: "var(--canvas-soft)",
                }}
              >
                <button
                  type="button"
                  onClick={() => setFilter("demarcated")}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid",
                    borderColor: filter === "demarcated" ? "var(--green)" : "var(--hairline)",
                    background: filter === "demarcated" ? "var(--green)" : "var(--surface)",
                    color: filter === "demarcated" ? "#ffffff" : "var(--body)",
                    cursor: "pointer",
                  }}
                >
                  Demarcated ({stats.demarcatedCount})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("all")}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid",
                    borderColor: filter === "all" ? "var(--ink)" : "var(--hairline)",
                    background: filter === "all" ? "var(--ink)" : "var(--surface)",
                    color: filter === "all" ? "#ffffff" : "var(--body)",
                    cursor: "pointer",
                  }}
                >
                  All ({stats.totalEstates.toLocaleString()})
                </button>
                <button
                  type="button"
                  onClick={() => setFilter("missing")}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "4px 8px",
                    borderRadius: "4px",
                    border: "1px solid",
                    borderColor: filter === "missing" ? "var(--amber)" : "var(--hairline)",
                    background: filter === "missing" ? "var(--amber)" : "var(--surface)",
                    color: filter === "missing" ? "#ffffff" : "var(--body)",
                    cursor: "pointer",
                  }}
                >
                  Missing
                </button>
              </div>

              {/* Scrollable Estate Items List (Bounded for 60 FPS) */}
              <div style={{ flex: 1, overflowY: "auto" }}>
                {loading ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                    Querying portfolio…
                  </div>
                ) : farms.length === 0 ? (
                  <div style={{ padding: 24, textAlign: "center", color: "var(--muted)", fontSize: 12 }}>
                    No estates found matching query.
                  </div>
                ) : (
                  farms.map((f) => {
                    const isSelected = f.id === selectedFarm?.id;
                    const hasBoundary = !!f.boundaryGeoJson;

                    return (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setSelectedFarmId(f.id)}
                        style={{
                          width: "100%",
                          padding: "10px 14px",
                          border: "none",
                          borderBottom: "1px solid var(--hairline)",
                          background: isSelected ? "var(--surface-strong)" : "transparent",
                          borderLeft: isSelected ? "3px solid var(--green)" : "3px solid transparent",
                          textAlign: "left",
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: 2,
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6 }}>
                          <span
                            style={{
                              fontWeight: isSelected ? 700 : 500,
                              fontSize: 12,
                              color: "var(--ink)",
                              whiteSpace: "nowrap",
                              overflow: "hidden",
                              textOverflow: "ellipsis",
                              maxWidth: 190,
                            }}
                          >
                            {f.name}
                          </span>
                          {hasBoundary ? (
                            <span className="badge badge-green" style={{ fontSize: 10, padding: "1px 6px" }}>
                              {f.measuredAcres ? `${f.measuredAcres} ac` : "Demarcated"}
                            </span>
                          ) : (
                            <span className="badge badge-amber" style={{ fontSize: 10, padding: "1px 6px" }}>
                              No Fence
                            </span>
                          )}
                        </div>
                        <div className="muted" style={{ fontSize: 11, display: "flex", gap: 6 }}>
                          <span>{f.surveyNumber ? `Sy ${f.surveyNumber}` : f.location}</span>
                          <span>&bull;</span>
                          <span>{f.plotCount} plots</span>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </aside>

            {/* Right Main Panel: Full-Height Interactive Map with Floating HUD */}
            <main
              style={{
                flex: 1,
                height: "100%",
                position: "relative",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
              }}
            >
              {/* Floating Estate Metadata HUD */}
              {selectedFarm && (
                <div
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 140, // Left of satellite/map toggle
                    zIndex: 1000,
                    background: "rgba(255, 255, 255, 0.95)",
                    backdropFilter: "blur(8px)",
                    border: "1px solid var(--hairline)",
                    borderRadius: "var(--radius-sm)",
                    padding: "6px 14px",
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                    fontSize: 12,
                  }}
                >
                  <div>
                    <span style={{ fontWeight: 700, color: "var(--ink)" }}>{selectedFarm.name}</span>
                    <span className="muted" style={{ marginLeft: 6 }}>
                      {selectedFarm.surveyNumber ? `Sy: ${selectedFarm.surveyNumber}` : selectedFarm.location}
                    </span>
                  </div>

                  <div style={{ height: 14, width: 1, background: "var(--hairline)" }} />

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <span style={{ fontFamily: "var(--font-mono)", fontWeight: 600, color: "var(--green)" }}>
                      {calculatedAcres > 0
                        ? `${calculatedAcres.toFixed(2)} ac drawn`
                        : selectedFarm.measuredAcres
                        ? `${selectedFarm.measuredAcres} ac measured`
                        : `${selectedFarm.totalArea} ac claimed`}
                    </span>
                  </div>
                </div>
              )}

              {/* Edge-to-Edge Satellite Map */}
              <div style={{ flex: 1, width: "100%", height: "100%", position: "relative" }}>
                <GeoMap
                  center={centerCoords}
                  polygon={currentRing}
                  onChange={setCurrentRing}
                  height="100%"
                  interactive={true}
                  onSave={handleSaveBoundary}
                  saveLabel={selectedFarm?.boundaryGeoJson ? "Update Boundary" : "Save Boundary"}
                  isSaving={savingBoundary}
                  onClear={() => setCurrentRing(null)}
                />
              </div>
            </main>
          </div>
        ) : activeTab === "reviews" ? (
          /* TAB 2: BOUNDARY REVIEW QUEUE (FULL HEIGHT SCROLLABLE) */
          <div style={{ flex: 1, padding: 20, overflowY: "auto", background: "var(--canvas-floor)" }}>
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                maxWidth: 1200,
                margin: "0 auto",
              }}
            >
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hairline)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                  Flagged Geometry Revisions Requiring Administrative Review
                </h3>
                <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
                  Boundaries whose measured area changed beyond tolerance policy during GPS walk or manual drawing.
                </p>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ width: "100%", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Entity</th>
                      <th>Farm Context</th>
                      <th>Source</th>
                      <th>Area Delta</th>
                      <th>Actor</th>
                      <th>Timestamp</th>
                      <th style={{ textAlign: "right" }}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {flaggedVersions.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                          No flagged boundary discrepancies. All estate geometries comply with policy.
                        </td>
                      </tr>
                    ) : (
                      flaggedVersions.map((v) => (
                        <tr key={v.id}>
                          <td>
                            <span className="badge badge-stone" style={{ fontSize: 10, marginRight: 6 }}>
                              {v.entityType}
                            </span>
                            <strong>{v.entityName}</strong>
                          </td>
                          <td>
                            <Link href={`/farms/${v.farmId}`} style={{ color: "inherit", fontWeight: 500 }}>
                              {v.farmName}
                            </Link>
                          </td>
                          <td>
                            <span className="badge badge-muted" style={{ fontSize: 11 }}>
                              {v.source.replaceAll("_", " ")}
                            </span>
                          </td>
                          <td>
                            <span style={{ fontWeight: 600, color: "var(--amber)", fontFamily: "var(--font-mono)" }}>
                              {v.prevAcres != null ? `${v.prevAcres} → ` : ""}
                              {v.measuredAcres != null ? `${v.measuredAcres} ac` : "Deleted"}
                              {v.deltaPercent != null && ` (${v.deltaPercent > 0 ? "+" : ""}${v.deltaPercent.toFixed(1)}%)`}
                            </span>
                          </td>
                          <td className="muted" style={{ fontSize: 12 }}>
                            {v.actorName || "Field Officer"}
                          </td>
                          <td className="muted" style={{ fontSize: 12 }}>
                            {new Date(v.createdAt).toLocaleDateString()}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            <Link
                              href={`/farms/${v.farmId}?tab=boundaries`}
                              className="btn btn-secondary btn-sm"
                            >
                              <Icons.Maximize2 size={12} />
                              <span>Compare &amp; Restore</span>
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* TAB 3: GPS PERIMETER WALK TRACKS (FULL HEIGHT SCROLLABLE) */
          <div style={{ flex: 1, padding: 20, overflowY: "auto", background: "var(--canvas-floor)" }}>
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--hairline)",
                borderRadius: "var(--radius-lg)",
                overflow: "hidden",
                maxWidth: 1200,
                margin: "0 auto",
              }}
            >
              <div style={{ padding: "14px 20px", borderBottom: "1px solid var(--hairline)" }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0 }}>
                  Recent GPS Perimeter Walk Evidence
                </h3>
                <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
                  Retained raw GPS device samples, outlier filtering metrics, and quality ratings.
                </p>
              </div>

              <div style={{ overflowX: "auto" }}>
                <table className="table" style={{ width: "100%", fontSize: 13 }}>
                  <thead>
                    <tr>
                      <th>Capture ID</th>
                      <th>Entity Type</th>
                      <th>Quality Rating</th>
                      <th>Acreage Computed</th>
                      <th>Fixes Kept</th>
                      <th>Fixes Dropped</th>
                      <th>Recorded At</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentWalks.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                          No GPS perimeter walks recorded yet.
                        </td>
                      </tr>
                    ) : (
                      recentWalks.map((w) => (
                        <tr key={w.id}>
                          <td style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>
                            {w.id.slice(0, 16)}…
                          </td>
                          <td>
                            <span className="badge badge-stone" style={{ fontSize: 10 }}>
                              {w.entityType}
                            </span>
                          </td>
                          <td>
                            <span
                              className={`badge ${
                                w.quality === "GOOD" ? "badge-green" : "badge-amber"
                              }`}
                              style={{ fontSize: 11 }}
                            >
                              {w.quality}
                            </span>
                          </td>
                          <td style={{ fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                            {w.acres != null ? `${w.acres} ac` : "—"}
                          </td>
                          <td style={{ color: "var(--green)", fontWeight: 600, fontFamily: "var(--font-mono)" }}>
                            {w.samplesKept} fixes
                          </td>
                          <td style={{ color: w.samplesDropped > 0 ? "var(--amber)" : "var(--muted)", fontFamily: "var(--font-mono)" }}>
                            {w.samplesDropped} outliers
                          </td>
                          <td className="muted" style={{ fontSize: 12 }}>
                            {new Date(w.createdAt).toLocaleDateString()}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
