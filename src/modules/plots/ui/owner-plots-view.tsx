"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Icons } from "@/components/icons";
import { PlotDemarcateWizard } from "./plot-demarcate-wizard";
import { CropCycleWizard } from "@modules/crops/ui/crop-cycle-wizard";

const FarmDemarcationMap = dynamic(
  () => import("@modules/spatial/ui/farm-demarcation-map").then((m) => m.FarmDemarcationMap),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          height: 380,
          display: "grid",
          placeItems: "center",
          backgroundColor: "#1e293b",
          color: "#94a3b8",
          borderRadius: 14,
          fontSize: 13,
        }}
      >
        Loading geospatial demarcation layers &amp; satellite tiles…
      </div>
    ),
  }
);

export interface OwnerPlotData {
  id: string;
  name: string;
  area: number | string;
  boundaryGeoJson?: string | null;
  status: string;
  soilType?: string | null;
  irrigationType?: string | null;
  farmId: string;
  farmName: string;
  activeCrop?: {
    id: string;
    cropName: string;
    variety?: string | null;
    status: string;
    startDate: string;
    harvestDate?: string | null;
  } | null;
}

export interface OwnerPlotFarm {
  id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  totalArea: number | string;
  cultivableArea: number | string;
  boundaryGeoJson?: string | null;
  plots: OwnerPlotData[];
}

interface OwnerPlotsViewProps {
  farms: OwnerPlotFarm[];
  initialFarmId?: string;
}

export function OwnerPlotsView({ farms, initialFarmId }: OwnerPlotsViewProps) {
  const router = useRouter();
  const [selectedFarmId, setSelectedFarmId] = useState(
    initialFarmId && farms.some((f) => f.id === initialFarmId)
      ? initialFarmId
      : farms[0]?.id || ""
  );
  const [selectedPlotId, setSelectedPlotId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<"ALL" | "CULTIVATED" | "FALLOW">("ALL");
  const [search, setSearch] = useState("");
  const [isDemarcateOpen, setIsDemarcateOpen] = useState(false);
  const [isCycleWizardOpen, setIsCycleWizardOpen] = useState(false);
  const [targetCyclePlotId, setTargetCyclePlotId] = useState<string | undefined>(undefined);

  const activeFarm = useMemo(() => {
    return farms.find((f) => f.id === selectedFarmId) || farms[0];
  }, [farms, selectedFarmId]);

  const activePlots = useMemo(() => {
    return activeFarm ? activeFarm.plots : [];
  }, [activeFarm]);

  const filteredPlots = useMemo(() => {
    return activePlots.filter((p) => {
      const matchesSearch =
        !search.trim() ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        (p.activeCrop && p.activeCrop.cropName.toLowerCase().includes(search.toLowerCase())) ||
        (p.soilType && p.soilType.toLowerCase().includes(search.toLowerCase()));

      const hasActive = !!p.activeCrop;
      const matchesStatus =
        statusFilter === "ALL" ||
        (statusFilter === "CULTIVATED" && hasActive) ||
        (statusFilter === "FALLOW" && !hasActive);

      return matchesSearch && matchesStatus;
    });
  }, [activePlots, search, statusFilter]);

  // Total mapped acreage of current farm's plots
  const totalPlotAcres = useMemo(() => {
    return activePlots.reduce((acc, p) => acc + Number(p.area || 0), 0);
  }, [activePlots]);

  const allPlotsForCycleWizard = useMemo(() => {
    return farms.flatMap((f) =>
      f.plots.map((p) => ({
        id: p.id,
        name: p.name,
        area: p.area,
        farmId: f.id,
        farmName: f.name,
      }))
    );
  }, [farms]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Top Header & Farm Estate Selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          padding: "20px 24px",
          backgroundColor: "var(--surface-card, #ffffff)",
          borderRadius: 14,
          border: "1px solid var(--hairline, rgba(0,0,0,0.1))",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
              Land &amp; Plot Demarcation
            </h1>
            {activeFarm && (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  padding: "2px 8px",
                  borderRadius: 999,
                  backgroundColor: "var(--green-tint)",
                  color: "var(--green-ink)",
                }}
              >
                {activePlots.length} Plots Delineated
              </span>
            )}
          </div>
          <p style={{ fontSize: 13, color: "var(--muted)", margin: "4px 0 0" }}>
            Visual multi-polygon cadastral layout, soil classification, and irrigation networks.
          </p>
        </div>

        {/* Estate Selector & Demarcate Button */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
          {farms.length > 1 && (
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--muted)" }}>Estate:</span>
              <select
                className="input"
                value={selectedFarmId}
                onChange={(e) => {
                  setSelectedFarmId(e.target.value);
                  setSelectedPlotId(null);
                }}
                style={{ width: 220, height: 38, fontWeight: 600 }}
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} ({f.totalArea} ac)
                  </option>
                ))}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsDemarcateOpen(true)}
            className="btn btn-primary"
            style={{ display: "inline-flex", alignItems: "center", gap: 8, height: 38 }}
          >
            <Icons.Plus size={16} />
            <span>Demarcate New Plot</span>
          </button>
        </div>
      </div>

      {/* Interactive Demarcation Map Section */}
      {activeFarm && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
              <Icons.Plot size={16} style={{ color: "var(--emerald-strong)" }} />
              <span>{activeFarm.name} — Demarcation Cadastre</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Acreage mapped: <strong>{totalPlotAcres.toFixed(1)}</strong> of <strong>{activeFarm.cultivableArea} ac</strong> cultivable
            </div>
          </div>

          <FarmDemarcationMap
            farm={{
              id: activeFarm.id,
              name: activeFarm.name,
              latitude: activeFarm.latitude,
              longitude: activeFarm.longitude,
              boundaryGeoJson: activeFarm.boundaryGeoJson,
              totalArea: activeFarm.totalArea,
            }}
            plots={activePlots.map((p) => ({
              id: p.id,
              name: p.name,
              area: p.area,
              boundaryGeoJson: p.boundaryGeoJson,
              status: p.status,
              cropName: p.activeCrop?.cropName,
              variety: p.activeCrop?.variety,
              soilType: p.soilType,
              irrigationType: p.irrigationType,
            }))}
            selectedPlotId={selectedPlotId}
            onSelectPlot={(id) => setSelectedPlotId(id)}
            height={400}
          />
        </div>
      )}

      {/* Plots Filter Bar & Search */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 10,
        }}
      >
        <div style={{ flex: 1, minWidth: 260, position: "relative" }}>
          <input
            type="text"
            className="input"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search plots by name, active crop, soil type…"
            style={{ paddingLeft: 36 }}
          />
          <div
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--muted)",
              pointerEvents: "none",
            }}
          >
            <Icons.Search size={16} />
          </div>
        </div>

        {/* Status Pill Filters */}
        <div style={{ display: "flex", gap: 6 }}>
          {(["ALL", "CULTIVATED", "FALLOW"] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={statusFilter === st ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
              style={{ textTransform: "capitalize", fontSize: 12 }}
            >
              {st.toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Grid of Plots */}
      {filteredPlots.length === 0 ? (
        <div
          style={{
            padding: "40px 24px",
            textAlign: "center",
            backgroundColor: "var(--surface-card, #ffffff)",
            borderRadius: 14,
            border: "1px dashed var(--hairline)",
            color: "var(--muted)",
          }}
        >
          <Icons.Plot size={32} style={{ margin: "0 auto 10px", opacity: 0.4 }} />
          <h3 style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", margin: "0 0 4px" }}>
            No plots found
          </h3>
          <p style={{ fontSize: 13, margin: 0 }}>
            {activePlots.length === 0
              ? "This farm estate does not have any demarcated plots yet. Click 'Demarcate New Plot' to begin."
              : "No plots match your active filters."}
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
            gap: 16,
          }}
        >
          {filteredPlots.map((plot) => {
            const isSelected = selectedPlotId === plot.id;
            return (
              <div
                key={plot.id}
                style={{
                  backgroundColor: "var(--surface-card, #ffffff)",
                  borderRadius: 14,
                  border: isSelected
                    ? "2px solid var(--primary)"
                    : "1px solid var(--hairline)",
                  padding: "18px 20px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: 12,
                  boxShadow: isSelected ? "0 0 0 3px var(--hairline-strong)" : "0 2px 6px rgba(0,0,0,0.02)",
                  transition: "all 0.15s ease",
                }}
              >
                <div>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 8 }}>
                    <div>
                      <h3 style={{ fontSize: 16, fontWeight: 700, margin: "0 0 3px", color: "var(--ink)" }}>
                        {plot.name}
                      </h3>
                      <div style={{ fontSize: 12, color: "var(--muted)" }}>
                        {plot.soilType || "Arable Parcel"}
                      </div>
                    </div>

                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: 6,
                        backgroundColor: "var(--green-tint)",
                        color: "var(--green-ink)",
                      }}
                    >
                      {plot.area} ac
                    </span>
                  </div>

                  {/* Active Crop Info */}
                  <div
                    style={{
                      margin: "12px 0",
                      padding: "10px 12px",
                      borderRadius: 8,
                      backgroundColor: plot.activeCrop
                        ? "var(--green-tint)"
                        : "var(--surface-strong)",
                      border: "1px solid var(--hairline)",
                      fontSize: 12,
                    }}
                  >
                    {plot.activeCrop ? (
                      <div>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: "var(--emerald-strong)" }}>
                            🌱 {plot.activeCrop.cropName} ({plot.activeCrop.variety || "Standard"})
                          </span>
                          <span style={{ fontSize: 10, fontWeight: 600, color: "var(--muted)" }}>
                            ACTIVE
                          </span>
                        </div>
                        <div style={{ color: "var(--muted)", fontSize: 11 }}>
                          Planted: {new Date(plot.activeCrop.startDate).toLocaleDateString()}
                          {plot.activeCrop.harvestDate && (
                            <span> &bull; Est. Harvest: {new Date(plot.activeCrop.harvestDate).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ color: "var(--muted)" }}>No Active Crop Cycle</span>
                        <button
                          type="button"
                          onClick={() => {
                            setTargetCyclePlotId(plot.id);
                            setIsCycleWizardOpen(true);
                          }}
                          className="btn btn-secondary btn-sm"
                          style={{ fontSize: 11, padding: "2px 8px", height: 26 }}
                        >
                          + Start Cycle
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Irrigation Badge */}
                  {plot.irrigationType && (
                    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}>
                      <span>💧 Irrigation:</span>
                      <strong style={{ color: "var(--ink)" }}>{plot.irrigationType}</strong>
                    </div>
                  )}
                </div>

                {/* Footer Actions */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    paddingTop: 10,
                    borderTop: "1px solid var(--hairline)",
                    fontSize: 12,
                  }}
                >
                  <button
                    type="button"
                    onClick={() => setSelectedPlotId(plot.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: isSelected ? "var(--emerald-strong)" : "var(--primary-hover, #0284c7)",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Icons.Navigation size={12} />
                    <span>{isSelected ? "Focused on Map" : "Highlight on Map"}</span>
                  </button>

                  <Link
                    href={`/owner/operations?plotId=${plot.id}`}
                    style={{
                      color: "var(--muted)",
                      textDecoration: "none",
                      fontSize: 12,
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <span>Tasks</span>
                    <Icons.ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Multi-Step Zero-Scroll Demarcation Wizard */}
      <PlotDemarcateWizard
        isOpen={isDemarcateOpen}
        onClose={() => setIsDemarcateOpen(false)}
        onSuccess={() => {
          router.refresh();
        }}
        farms={farms.map((f) => ({
          id: f.id,
          name: f.name,
          latitude: f.latitude,
          longitude: f.longitude,
          boundaryGeoJson: f.boundaryGeoJson,
          totalArea: f.totalArea,
        }))}
        initialFarmId={selectedFarmId}
      />

      {/* Multi-Step Zero-Scroll Crop Cycle Wizard */}
      <CropCycleWizard
        isOpen={isCycleWizardOpen}
        onClose={() => {
          setIsCycleWizardOpen(false);
          setTargetCyclePlotId(undefined);
        }}
        onSuccess={() => {
          router.refresh();
        }}
        plots={allPlotsForCycleWizard}
        initialPlotId={targetCyclePlotId}
      />
    </div>
  );
}
