"use client";

import "./leaflet-safe";
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Polygon, useMap, Tooltip } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import { parseBoundary, ringAcres, type LngLat } from "@modules/spatial/ui/geo";
import { Icons } from "@/components/icons";

export interface DemarcationPlot {
  id: string;
  name: string;
  area?: number | string | null;
  boundaryGeoJson?: string | null;
  status?: string | null;
  cropName?: string | null;
  variety?: string | null;
  soilType?: string | null;
  irrigationType?: string | null;
}

export interface DemarcationFarm {
  id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  totalArea?: number | string | null;
  boundaryGeoJson?: string | null;
}

interface FarmDemarcationMapProps {
  farm: DemarcationFarm;
  plots: DemarcationPlot[];
  selectedPlotId?: string | null;
  onSelectPlot?: (plotId: string) => void;
  height?: string | number;
  interactive?: boolean;
}

const ESRI_IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTRIBUTION = "Tiles &copy; Esri &mdash; Source: Esri and its contributors";
const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors";

// Curated distinct colors for adjacent demarcated plots
const PLOT_COLOR_PALETTE = [
  { fill: "#15803d", stroke: "#166534", label: "Emerald" },
  { fill: "#1d4ed8", stroke: "#1e40af", label: "Blue" },
  { fill: "#b45309", stroke: "#92400e", label: "Amber" },
  { fill: "#7c3aed", stroke: "#6d28d9", label: "Purple" },
  { fill: "#be185d", stroke: "#9d174d", label: "Pink" },
  { fill: "#0f766e", stroke: "#115e59", label: "Teal" },
  { fill: "#c2410c", stroke: "#9a3412", label: "Orange" },
  { fill: "#4338ca", stroke: "#3730a3", label: "Indigo" },
];

function toLeafletCoords(ring: LngLat[]): [number, number][] {
  return ring.map(([lng, lat]) => [lat, lng]);
}

/** Fits bounds whenever the farm or plots change */
function MapBoundsController({
  farmRing,
  plotRings,
  farmCenter,
}: {
  farmRing: [number, number][] | null;
  plotRings: [number, number][][];
  farmCenter: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    const allPoints: [number, number][] = [];
    if (farmRing && farmRing.length > 0) {
      allPoints.push(...farmRing);
    }
    for (const pr of plotRings) {
      allPoints.push(...pr);
    }

    if (allPoints.length > 0) {
      const bounds = L.latLngBounds(allPoints);
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [40, 40], maxZoom: 18 });
        return;
      }
    }

    map.setView(farmCenter, 16);
  }, [map, farmRing, plotRings, farmCenter]);

  return null;
}

export function FarmDemarcationMap({
  farm,
  plots,
  selectedPlotId,
  onSelectPlot,
  height = 420,
  interactive = true,
}: FarmDemarcationMapProps) {
  const [baseLayer, setBaseLayer] = useState<"sat" | "osm">("sat");

  const farmCenter: [number, number] = useMemo(() => {
    const lat = Number(farm.latitude) || 12.5284;
    const lng = Number(farm.longitude) || 77.8341;
    return [lat, lng];
  }, [farm.latitude, farm.longitude]);

  // Farm perimeter boundary
  const farmRing = useMemo(() => {
    if (!farm.boundaryGeoJson) return null;
    const parsed = parseBoundary(farm.boundaryGeoJson);
    return parsed ? toLeafletCoords(parsed) : null;
  }, [farm.boundaryGeoJson]);

  // Individual plot polygons
  const parsedPlots = useMemo(() => {
    return plots.map((plot, idx) => {
      const parsed = plot.boundaryGeoJson ? parseBoundary(plot.boundaryGeoJson) : null;
      const coords = parsed ? toLeafletCoords(parsed) : null;
      const calculatedAcres = parsed ? ringAcres(parsed) : null;
      const colorScheme = PLOT_COLOR_PALETTE[idx % PLOT_COLOR_PALETTE.length];

      return {
        ...plot,
        coords,
        calculatedAcres,
        colorScheme,
      };
    });
  }, [plots]);

  const plotRings = useMemo(() => {
    return parsedPlots.map((p) => p.coords).filter((c): c is [number, number][] => !!c);
  }, [parsedPlots]);

  const totalDemarcatedAcres = useMemo(() => {
    return parsedPlots.reduce((acc, p) => acc + (p.calculatedAcres || Number(p.area) || 0), 0);
  }, [parsedPlots]);

  return (
    <div
      style={{
        position: "relative",
        height,
        width: "100%",
        borderRadius: "14px",
        overflow: "hidden",
        border: "1px solid var(--hairline, rgba(0,0,0,0.1))",
        boxShadow: "0 4px 20px -2px rgba(0,0,0,0.08)",
      }}
    >
      <MapContainer
        center={farmCenter}
        zoom={16}
        scrollWheelZoom={interactive}
        style={{ height: "100%", width: "100%", background: "#1e293b" }}
      >
        <TileLayer
          key={baseLayer}
          url={baseLayer === "sat" ? ESRI_IMAGERY_URL : OSM_URL}
          attribution={baseLayer === "sat" ? ESRI_ATTRIBUTION : OSM_ATTRIBUTION}
          maxZoom={19}
        />

        <MapBoundsController
          farmRing={farmRing}
          plotRings={plotRings}
          farmCenter={farmCenter}
        />

        {/* 1. Parent Farm Boundary (Dashed emerald outer fence) */}
        {farmRing && (
          <Polygon
            positions={farmRing}
            pathOptions={{
              color: "#15803d",
              weight: 3,
              dashArray: "6, 8",
              fillColor: "#166534",
              fillOpacity: 0.05,
            }}
          >
            <Tooltip permanent={false} direction="center" opacity={0.95}>
              <div style={{ padding: "2px 4px", fontSize: 12, fontWeight: 700 }}>
                {farm.name} (Perimeter Fence)
              </div>
            </Tooltip>
          </Polygon>
        )}

        {/* 2. All Demarcated Plots */}
        {parsedPlots.map((plot) => {
          if (!plot.coords) return null;
          const isSelected = selectedPlotId === plot.id;
          const acres = plot.calculatedAcres?.toFixed(2) || Number(plot.area || 0).toFixed(2);

          return (
            <Polygon
              key={plot.id}
              positions={plot.coords}
              pathOptions={{
                color: isSelected ? "#ffffff" : plot.colorScheme.stroke,
                weight: isSelected ? 3.5 : 2,
                fillColor: plot.colorScheme.fill,
                fillOpacity: isSelected ? 0.45 : 0.25,
              }}
              eventHandlers={{
                click: () => {
                  if (onSelectPlot) onSelectPlot(plot.id);
                },
              }}
            >
              <Tooltip sticky direction="top" opacity={0.95}>
                <div style={{ padding: "4px 6px", minWidth: 120 }}>
                  <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a" }}>
                    {plot.name}
                  </div>
                  <div style={{ fontSize: 11, color: "#475569", marginTop: 2 }}>
                    <span>{acres} Acres</span>
                    {plot.cropName && (
                      <span style={{ marginLeft: 6, color: "#059669", fontWeight: 600 }}>
                        &bull; {plot.cropName} {plot.variety ? `(${plot.variety})` : ""}
                      </span>
                    )}
                  </div>
                  {plot.irrigationType && (
                    <div style={{ fontSize: 10, color: "#64748b", marginTop: 2 }}>
                      Irrigation: {plot.irrigationType}
                    </div>
                  )}
                </div>
              </Tooltip>
            </Polygon>
          );
        })}
      </MapContainer>

      {/* Top Left: Layer & Demarcation Stats Pill */}
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 12,
          zIndex: 1000,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            color: "#ffffff",
            borderRadius: 8,
            padding: "6px 12px",
            fontSize: 12,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          }}
        >
          <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", backgroundColor: "#15803d" }} />
          <span>{plots.length} Demarcated Plots</span>
          <span style={{ opacity: 0.4 }}>|</span>
          <span style={{ color: "#86efac" }}>{totalDemarcatedAcres.toFixed(1)} ac Plotted</span>
        </div>

        {/* Base Layer Switcher */}
        <button
          type="button"
          onClick={() => setBaseLayer((l) => (l === "sat" ? "osm" : "sat"))}
          style={{
            backgroundColor: "rgba(15, 23, 42, 0.85)",
            backdropFilter: "blur(8px)",
            color: "#ffffff",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: 8,
            padding: "6px 10px",
            fontSize: 11,
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 5,
          }}
        >
          <Icons.Sun size={12} />
          <span>{baseLayer === "sat" ? "Street Map" : "Satellite"}</span>
        </button>
      </div>

      {/* Bottom Floating Legend */}
      <div
        style={{
          position: "absolute",
          bottom: 12,
          left: 12,
          right: 12,
          zIndex: 1000,
          backgroundColor: "rgba(15, 23, 42, 0.85)",
          backdropFilter: "blur(8px)",
          borderRadius: 8,
          padding: "8px 12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 8,
          fontSize: 11,
          color: "#e2e8f0",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14, overflowX: "auto", maxWidth: "80%" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
            <span style={{ display: "inline-block", width: 14, height: 2, borderBottom: "2px dashed #15803d" }} />
            <span>Farm Perimeter</span>
          </div>
          {parsedPlots.slice(0, 6).map((p) => (
            <div
              key={p.id}
              onClick={() => onSelectPlot && onSelectPlot(p.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                cursor: "pointer",
                padding: "2px 6px",
                borderRadius: 4,
                backgroundColor: selectedPlotId === p.id ? "rgba(255,255,255,0.15)" : "transparent",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  backgroundColor: p.colorScheme.fill,
                  border: `1px solid ${p.colorScheme.stroke}`,
                }}
              />
              <span style={{ fontWeight: selectedPlotId === p.id ? 700 : 500 }}>
                {p.name}
              </span>
            </div>
          ))}
          {parsedPlots.length > 6 && (
            <span style={{ color: "#94a3b8" }}>+{parsedPlots.length - 6} more</span>
          )}
        </div>

        <div style={{ color: "#94a3b8", fontSize: 10 }}>
          Click polygon to view details
        </div>
      </div>
    </div>
  );
}
