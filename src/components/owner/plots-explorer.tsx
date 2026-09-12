"use client";
import { useState, FormEvent, useMemo } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";
import { parseBoundary, ringAcres, toGeoJsonPolygon } from "@/lib/geo";
import { ringWithinRing } from "@/lib/geo-core";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => <div style={{ height: 220, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13 }}>Map loading…</div>,
});

type Plot = {
  id: string;
  name: string;
  area: string;
  soilType?: string | null;
  status: string;
  latitude: string;
  longitude: string;
  irrigation: { id: string; type: string; details?: string | null }[];
  cropCycles: {
    id: string;
    cropName: string;
    variety?: string | null;
    status: string;
    startDate: string;
    endDate?: string | null;
  }[];
  farmName?: string;
  farmId?: string;
};

type Farm = {
  id: string;
  name: string;
  cultivableArea: string;
  totalArea: string;
  latitude: string;
  longitude: string;
  boundaryGeoJson?: string | null;
  plots: Plot[];
};

export function PlotsExplorer({ farms }: { farms: Farm[] }) {
  const router = useRouter();
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [showAddModal, setShowAddModal] = useState(false);
  const [pending, setPending] = useState(false);
  const [fence, setFence] = useState<[number, number][] | null>(null);
  const [showFence, setShowFence] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CULTIVATED" | "FALLOW">("ALL");
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const isAll = selectedFarmId === "ALL";
  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];

  // All plots across scope
  const allScopedPlots: (Plot & { farmName: string; farmId: string })[] = useMemo(() => {
    if (isAll) {
      return farms.flatMap((f) =>
        f.plots.map((p) => ({
          ...p,
          farmName: f.name,
          farmId: f.id,
        }))
      );
    }
    return (selectedFarm?.plots || []).map((p) => ({
      ...p,
      farmName: selectedFarm.name,
      farmId: selectedFarm.id,
    }));
  }, [isAll, selectedFarm, farms]);

  // Filtered plots
  const filteredPlots = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allScopedPlots.filter((plot) => {
      const activeCycle = plot.cropCycles.find((c) => c.status === "ACTIVE");
      const matchesSearch =
        !q ||
        plot.name.toLowerCase().includes(q) ||
        plot.farmName.toLowerCase().includes(q) ||
        (plot.soilType && plot.soilType.toLowerCase().includes(q)) ||
        (activeCycle && activeCycle.cropName.toLowerCase().includes(q));

      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "CULTIVATED" && !!activeCycle) ||
        (statusFilter === "FALLOW" && !activeCycle);

      return matchesSearch && matchesStatus;
    });
  }, [allScopedPlots, searchQuery, statusFilter]);

  const totalPlotArea = allScopedPlots.reduce((acc, p) => acc + Number(p.area), 0);
  const activeCropsCount = allScopedPlots.reduce(
    (acc, p) => acc + p.cropCycles.filter((c) => c.status === "ACTIVE").length,
    0
  );

  const scopeCultivableArea = isAll
    ? farms.reduce((acc, f) => acc + Number(f.cultivableArea || 0), 0)
    : Number(selectedFarm?.cultivableArea || 0);

  const farmRing = useMemo(
    () => parseBoundary(selectedFarm?.boundaryGeoJson ?? null),
    [selectedFarm?.boundaryGeoJson]
  );
  const fenceAcres = fence && fence.length >= 4 ? (() => { try { return ringAcres(fence); } catch { return 0; } })() : 0;
  const fenceOutside = fence && fence.length >= 4 && farmRing && farmRing.length >= 4
    ? (() => { try { return !ringWithinRing(fence, farmRing); } catch { return true; } })()
    : false;

  const openAddModal = () => { setFence(null); setShowFence(false); setShowAddModal(true); };

  if (!selectedFarm && farms.length === 0) {
    return (
      <div className="card" style={{ padding: 48, textAlign: "center" }}>
        <Icons.AlertTriangle size={32} style={{ color: "var(--amber)", margin: "0 auto 12px" }} />
        <p className="muted" style={{ fontSize: 13, margin: "0 0 16px" }}>No farm assigned to your account.</p>
        <Link className="btn btn-secondary btn-sm" href="/farms/new">Onboard a farm</Link>
      </div>
    );
  }

  const handleCreatePlot = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isAll || !selectedFarm?.id) {
      // ponytail: never silently use farms[0] — force explicit estate choice
      toast.show("Select a specific estate before creating a plot", "error");
      return;
    }
    if (fence && fence.length < 4) {
      toast.show("Incomplete fence — finish the polygon or clear it.", "error");
      return;
    }
    if (fenceOutside) {
      toast.show("Plot fence must lie inside the estate fence.", "error");
      return;
    }
    setPending(true);
    const form = new FormData(e.currentTarget);
    const targetFarmId = selectedFarm.id;

    const body = {
      name: form.get("name"),
      area: Number(form.get("area")),
      latitude: Number(form.get("latitude") || selectedFarm.latitude),
      longitude: Number(form.get("longitude") || selectedFarm.longitude),
      soilType: form.get("soilType") || null,
      boundary: fence && fence.length >= 4 ? toGeoJsonPolygon(fence) : undefined,
      irrigation: [
        {
          type: form.get("irrigationType") || "Drip",
          details: form.get("irrigationDetails") || null,
        },
      ],
    };

    try {
      const res = await fetch(`/api/farms/${targetFarmId}/plots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || err.message || "Failed to create plot");
      }

      toast.show(fence ? `Plot created (${fenceAcres.toFixed(2)} ac verified)` : "New plot created successfully", "success");
      setShowAddModal(false);
      setFence(null);
      setShowFence(false);
      router.refresh();
    } catch (err: any) {
      toast.show(err.message || "Error creating plot", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      {/* Header */}
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "12px 16px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Layers size={20} style={{ color: "var(--green)" }} />
              Estate Plots &amp; Crop Registry
            </h2>
            <span className="badge badge-green font-mono">{allScopedPlots.length} Parcels</span>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
            Browse demarcated land zones, soil characteristics, irrigation telemetry, and active crop stages.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {farms.length > 1 && (
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="input-field"
              style={{ fontSize: 12, padding: "6px 12px", width: "auto" }}
            >
              <option value="ALL">All Estates Portfolio ({farms.length} Estates)</option>
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={openAddModal}
            className="btn btn-sm btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 14px" }}
          >
            <Icons.Plus size={14} />
            Demarcate Plot
          </button>
        </div>
      </div>

      {/* Farm Acreage KPI */}
      <div className="metric-summary-row">
        <div className="metric-summary-item">
          <span className="metric-label">Total Demarcated Zones</span>
          <div className="metric-value font-mono">
            {allScopedPlots.length} <span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>parcels</span>
          </div>
          <div className="metric-sub">
            {isAll ? `Across ${farms.length} client estates` : `Allocated within ${selectedFarm.name}`}
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Area Utilization</span>
          <div className="metric-value font-mono" style={{ color: "var(--green)" }}>
            {totalPlotArea.toFixed(1)} / {scopeCultivableArea.toFixed(1)}{" "}
            <span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>Acres</span>
          </div>
          <div className="metric-sub">
            {Math.round((totalPlotArea / (scopeCultivableArea || 1)) * 100)}% cultivable area mapped
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Active Plantings</span>
          <div className="metric-value font-mono" style={{ color: "var(--green)" }}>
            {activeCropsCount} <span style={{ fontSize: 12, fontWeight: 400, color: "var(--muted)" }}>in ground</span>
          </div>
          <div className="metric-sub">Managed under active agronomy cycles</div>
        </div>
      </div>

      {/* Toolbar: Search, Status Filters, View Mode */}
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 16px",
        }}
      >
        <div style={{ display: "flex", gap: 4, backgroundColor: "var(--stone)", padding: 3, borderRadius: "var(--radius-sm)" }}>
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`btn btn-sm ${statusFilter === "ALL" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: 11, padding: "4px 8px" }}
          >
            All ({allScopedPlots.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("CULTIVATED")}
            className={`btn btn-sm ${statusFilter === "CULTIVATED" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: 11, padding: "4px 8px" }}
          >
            Cultivated ({activeCropsCount})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("FALLOW")}
            className={`btn btn-sm ${statusFilter === "FALLOW" ? "btn-primary" : "btn-ghost"}`}
            style={{ fontSize: 11, padding: "4px 8px" }}
          >
            Fallow ({allScopedPlots.length - activeCropsCount})
          </button>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ position: "relative", width: 220 }}>
            <input
              type="text"
              placeholder="Search plots, crops, soils…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ width: "100%", fontSize: 12, padding: "5px 24px 5px 10px" }}
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                style={{ position: "absolute", right: 8, top: 7, background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 0 }}
              >
                &times;
              </button>
            )}
          </div>

          <div style={{ display: "flex", gap: 3, backgroundColor: "var(--stone)", padding: 3, borderRadius: "var(--radius-sm)" }}>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`btn btn-sm ${viewMode === "grid" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "4px 8px" }}
              title="Card Grid View"
            >
              <Icons.Layers size={13} />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`btn btn-sm ${viewMode === "table" ? "btn-primary" : "btn-ghost"}`}
              style={{ padding: "4px 8px" }}
              title="Dense Data Table View"
            >
              <Icons.ClipboardList size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Plots Display */}
      {filteredPlots.length === 0 ? (
        <div className="card" style={{ padding: 48, textAlign: "center" }}>
          <Icons.Layers size={32} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: "0 0 4px" }}>No matching plots found</h3>
          <p className="muted" style={{ fontSize: 12, maxWidth: 360, margin: "0 auto" }}>
            Try adjusting your search query or demarcate a new parcel for your estate.
          </p>
        </div>
      ) : viewMode === "grid" ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
          {filteredPlots.map((plot) => {
            const activeCycle = plot.cropCycles.find((c) => c.status === "ACTIVE");

            return (
              <div
                key={plot.id}
                className="compact-card"
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  padding: 18,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--canvas)",
                  backgroundColor: "var(--canvas)",
                  gap: 12,
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8, marginBottom: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, color: "var(--ink)", margin: 0 }}>{plot.name}</h3>
                      {isAll && (
                        <span className="muted" style={{ fontSize: 11 }}>{plot.farmName}</span>
                      )}
                    </div>
                    <span className={`badge ${activeCycle ? "badge-green" : "badge-muted"} font-mono`} style={{ fontSize: 9 }}>
                      {activeCycle ? "CULTIVATED" : "FALLOW"}
                    </span>
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, fontSize: 12, padding: "8px 0", borderTop: "1px solid var(--stone)", borderBottom: "1px solid var(--stone)", marginBottom: 10 }}>
                    <div>
                      <span className="muted" style={{ fontSize: 10, display: "block" }}>Area</span>
                      <strong style={{ fontFamily: "monospace", color: "var(--ink)" }}>{Number(plot.area)} Acres</strong>
                    </div>
                    <div>
                      <span className="muted" style={{ fontSize: 10, display: "block" }}>Soil Type</span>
                      <span style={{ color: "var(--ink)" }}>{plot.soilType || "Not specified"}</span>
                    </div>
                    <div>
                      <span className="muted" style={{ fontSize: 10, display: "block" }}>Irrigation</span>
                      <span style={{ color: "var(--ink)" }}>
                        {plot.irrigation.map((i) => i.type).join(", ") || "None"}
                      </span>
                    </div>
                    <div>
                      <span className="muted" style={{ fontSize: 10, display: "block" }}>GPS Center</span>
                      <span className="muted font-mono" style={{ fontSize: 11 }}>
                        {Number(plot.latitude).toFixed(3)}, {Number(plot.longitude).toFixed(3)}
                      </span>
                    </div>
                  </div>

                  {/* Active Crop Details */}
                  {activeCycle ? (
                    <div style={{ padding: 10, borderRadius: "var(--radius-xs)", backgroundColor: "var(--stone)", fontSize: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <strong style={{ color: "var(--green)" }}>{activeCycle.cropName}</strong>
                        {activeCycle.variety && (
                          <span className="muted" style={{ fontSize: 11 }}>({activeCycle.variety})</span>
                        )}
                      </div>
                      <div className="muted" style={{ fontSize: 11, display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                        <span>Planted: {formatDate(activeCycle.startDate)}</span>
                        {activeCycle.endDate && <span>Est: {formatDate(activeCycle.endDate)}</span>}
                      </div>
                    </div>
                  ) : (
                    <div style={{ padding: 8, borderRadius: "var(--radius-xs)", backgroundColor: "var(--stone)", fontSize: 11, color: "var(--muted)", textAlign: "center" }}>
                      No active crop cycle in ground.
                    </div>
                  )}
                </div>

                <div style={{ paddingTop: 10, borderTop: "1px solid var(--line)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <Link
                    href={`/plots/${plot.id}`}
                    className="btn btn-sm btn-ghost"
                    style={{ fontSize: 11, padding: "4px 6px", color: "var(--muted)" }}
                  >
                    Configure &rarr;
                  </Link>

                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Link
                      href={`/plots/${plot.id}/crop-cycles/new`}
                      className="btn btn-sm btn-secondary"
                      style={{ fontSize: 11, padding: "3px 8px" }}
                    >
                      New Cycle
                    </Link>
                    <Link
                      href="/owner/harvest"
                      className="btn btn-sm btn-primary"
                      style={{ fontSize: 11, padding: "3px 8px" }}
                    >
                      Harvests
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Dense Table View */
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Plot / Zone</th>
                  {isAll && <th style={{ textAlign: "left" }}>Estate</th>}
                  <th style={{ textAlign: "right" }}>Area</th>
                  <th style={{ textAlign: "left" }}>Status</th>
                  <th style={{ textAlign: "left" }}>Active Crop</th>
                  <th style={{ textAlign: "left" }}>Soil &amp; Irrigation</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredPlots.map((plot) => {
                  const activeCycle = plot.cropCycles.find((c) => c.status === "ACTIVE");
                  return (
                    <tr key={plot.id}>
                      <td style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {plot.name}
                      </td>
                      {isAll && (
                        <td className="muted">
                          {plot.farmName}
                        </td>
                      )}
                      <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--ink)" }}>
                        {Number(plot.area)} Ac
                      </td>
                      <td>
                        <span className={`badge ${activeCycle ? "badge-green" : "badge-muted"} font-mono`} style={{ fontSize: 9 }}>
                          {activeCycle ? "CULTIVATED" : "FALLOW"}
                        </span>
                      </td>
                      <td>
                        {activeCycle ? (
                          <div>
                            <strong style={{ color: "var(--green)" }}>{activeCycle.cropName}</strong>
                            {activeCycle.variety && (
                              <span className="muted" style={{ fontSize: 11, marginLeft: 4 }}>({activeCycle.variety})</span>
                            )}
                          </div>
                        ) : (
                          <span className="muted">None</span>
                        )}
                      </td>
                      <td className="muted" style={{ fontSize: 11 }}>
                        {plot.soilType || "Standard"} &bull; {plot.irrigation[0]?.type || "Drip"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <div style={{ display: "inline-flex", gap: 6 }}>
                          <Link
                            href={`/plots/${plot.id}`}
                            className="btn btn-sm btn-secondary"
                            style={{ fontSize: 11, padding: "2px 8px" }}
                          >
                            Edit
                          </Link>
                          <Link
                            href={`/plots/${plot.id}/crop-cycles/new`}
                            className="btn btn-sm btn-primary"
                            style={{ fontSize: 11, padding: "2px 8px" }}
                          >
                            Plant
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Plot Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: 480, padding: 24, boxShadow: "var(--shadow-modal)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Layers size={18} style={{ color: "var(--green)" }} />
                Demarcate New Plot on {selectedFarm.name}
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreatePlot} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Plot Identifier / Zone Name *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="e.g. Block 4A - Alfonso Orchards"
                  className="input-field"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Demarcated Area (Acres) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="area"
                  required
                  placeholder="e.g. 5.5"
                  className="input-field"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                    Soil Texture
                  </label>
                  <select
                    name="soilType"
                    className="input-field"
                    style={{ width: "100%" }}
                  >
                    <option value="RED_LOAMY">Red Loamy</option>
                    <option value="BLACK_CLAY">Black Cotton / Clay</option>
                    <option value="SANDY_LOAM">Sandy Loam</option>
                    <option value="ALLUVIAL">Alluvial Soil</option>
                    <option value="LATERITE">Laterite Soil</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                    Irrigation System
                  </label>
                  <select
                    name="irrigationType"
                    className="input-field"
                    style={{ width: "100%" }}
                  >
                    <option value="Drip">Drip Irrigation</option>
                    <option value="Rain Pipe">Rain Pipe</option>
                    <option value="Sprinkler">Micro Sprinkler</option>
                    <option value="Flood">Canal / Basin Flood</option>
                    <option value="Other">Natural Rainfed / Other</option>
                  </select>
                </div>
              </div>

              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)" }}>
                    Fence (optional){fenceAcres > 0 ? ` · ${fenceAcres.toFixed(2)} ac verified` : ""}
                  </label>
                  {fence && (
                    <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setFence(null)}>
                      Clear
                    </button>
                  )}
                </div>
                {!showFence ? (
                  <button type="button" className="btn btn-secondary btn-sm" style={{ width: "100%", fontSize: 12 }} onClick={() => setShowFence(true)}>
                    {farmRing ? "Draw fence inside estate boundary" : "Draw fence (draw estate fence first for containment check)"}
                  </button>
                ) : (
                  <div style={{ border: "1px solid var(--line)", borderRadius: 8, overflow: "hidden" }}>
                    <GeoMap
                      center={[Number(selectedFarm.latitude) || 20.59, Number(selectedFarm.longitude) || 78.96]}
                      polygon={fence}
                      onChange={setFence}
                      reference={farmRing}
                      interactive
                      height={220}
                    />
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", fontSize: 12, color: "var(--muted)" }}>
                      <span>
                        {fence && fence.length >= 4
                          ? `${fenceAcres.toFixed(2)} ac${fenceOutside ? " — outside estate fence, redraw inside" : " — verified area applies on save"}`
                          : "Trace the plot inside the dashed estate fence."}
                      </span>
                      <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => { setShowFence(false); setFence(null); }}>
                        Hide
                      </button>
                    </div>
                  </div>
                )}
                {fenceOutside && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 4 }}>Plot fence must lie completely inside the estate fence.</div>}
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-sm btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending || fenceOutside}
                  className="btn btn-sm btn-primary"
                >
                  {pending ? "Creating Plot..." : "Confirm & Save Plot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
