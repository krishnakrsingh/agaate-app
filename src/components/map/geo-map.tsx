"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, useMap } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";
import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { ringAcres, type LngLat } from "@/lib/geo";

/**
 * Props for {@link GeoMap}.
 *
 * - `center` is `[lat, lng]` (Leaflet order) — the initial map focus.
 * - `polygon` is a `[lng, lat]` ring (GeoJSON order, as returned by
 *   `parseBoundary`), or null when nothing is drawn yet.
 */
export interface GeoMapPin {
  key: string;
  lat: number;
  lng: number;
  /** Fill color (use app-palette literals, e.g. #16a34a). */
  color: string;
  label: string;
}

export interface GeoMapProps {
  center: [number, number];
  polygon: LngLat[] | null;
  onChange: (ring: LngLat[] | null) => void;
  height?: number;
  /**
   * Optional status pins (task map, route stops). CircleMarkers only —
   * no icon assets. Non-interactive except tooltips.
   */
  pins?: GeoMapPin[] | null;
  /**
   * Optional background fence (e.g. the parent farm boundary while drawing
   * a plot). Rendered dashed + non-interactive; never edited or emitted.
   */
  reference?: LngLat[] | null;
  /**
   * Optional live GPS track (perimeter-walk capture). Rendered as a plain
   * polyline with a start dot; never editable, never emitted.
   */
  track?: LngLat[] | null;
  /**
   * When false, Geoman editing controls are not installed: the polygon is
   * display-only (history preview). Defaults to true.
   */
  interactive?: boolean;
}

const ESRI_IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTRIBUTION = "Tiles &copy; Esri &mdash; Source: Esri and its contributors";
const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors";

type BaseLayer = "sat" | "osm";

function toLatLngs(ring: LngLat[]): L.LatLngExpression[] {
  return ring.map(([lng, lat]) => [lat, lng] as [number, number]);
}

/** Reads a Leaflet polygon layer back into a closed [lng,lat] ring. */
function layerToRing(layer: L.Layer): LngLat[] | null {
  const poly = layer as L.Polygon;
  if (typeof poly.getLatLngs !== "function") return null;
  const raw = poly.getLatLngs() as L.LatLng[][] | L.LatLng[][];
  const outer = (Array.isArray(raw[0]) ? raw[0] : raw) as L.LatLng[];
  if (!Array.isArray(outer) || outer.length === 0) return null;
  const ring: LngLat[] = outer.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    ring.push([first[0], first[1]]);
  }
  return ring;
}

/**
 * Wires Geoman draw/edit/delete for a SINGLE polygon and mirrors external
 * `polygon` prop changes onto the map (with fitBounds).
 */
function GeomanController({
  polygon,
  onChange,
  interactive,
}: {
  polygon: LngLat[] | null;
  onChange: (ring: LngLat[] | null) => void;
  interactive: boolean;
}) {
  const map = useMap();
  const layerRef = useRef<L.Polygon | null>(null);
  const appliedKeyRef = useRef<string>("__init__");
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  // Install Geoman controls + map-level event wiring once per map instance.
  // Read-only mode (history preview) skips controls entirely.
  useEffect(() => {
    if (!interactive) return;
    map.pm.addControls({
      position: "topleft",
      drawPolygon: true,
      drawMarker: false,
      drawCircleMarker: false,
      drawPolyline: false,
      drawRectangle: false,
      drawCircle: false,
      drawText: false,
      editMode: true,
      dragMode: true,
      cutPolygon: false,
      removalMode: true,
      rotateMode: false,
    });

    const emitFromLayer = (layer: L.Layer) => {
      const ring = layerToRing(layer);
      appliedKeyRef.current = JSON.stringify(ring);
      onChangeRef.current(ring);
    };

    const attachLayerListeners = (layer: L.Polygon) => {
      layer.on("pm:update", (e) => emitFromLayer(e.layer));
      layer.on("pm:dragend", (e) => emitFromLayer(e.layer));
      layer.on("pm:change", (e) => emitFromLayer(e.layer));
    };

    const onCreate: L.PM.CreateEventHandler = (e) => {
      if (e.shape !== "Polygon") {
        map.removeLayer(e.layer);
        return;
      }
      if (layerRef.current) {
        map.removeLayer(layerRef.current);
      }
      const created = e.layer as L.Polygon;
      layerRef.current = created;
      attachLayerListeners(created);
      // Single-polygon UX: exit draw mode after the shape is finished.
      map.pm.disableDraw();
      emitFromLayer(created);
    };

    const onRemove: L.PM.RemoveEventHandler = (e) => {
      if (layerRef.current && e.layer === layerRef.current) {
        layerRef.current = null;
        appliedKeyRef.current = JSON.stringify(null);
        onChangeRef.current(null);
      }
    };

    map.on("pm:create", onCreate);
    map.on("pm:remove", onRemove);
    return () => {
      map.off("pm:create", onCreate);
      map.off("pm:remove", onRemove);
      map.pm.removeControls();
    };
  }, [map, interactive]);

  // Mirror EXTERNAL polygon changes onto the map (skip our own echoes).
  // In read-only mode the layer is display-only: no Geoman listeners, so a
  // future caller can never receive edits from a preview map.
  useEffect(() => {
    const key = JSON.stringify(polygon);
    if (key === appliedKeyRef.current) return;
    appliedKeyRef.current = key;

    if (layerRef.current) {
      map.removeLayer(layerRef.current);
      layerRef.current = null;
    }
    if (polygon && polygon.length > 0) {
      const layer = L.polygon(toLatLngs(polygon), interactive ? {} : { interactive: false });
      layer.addTo(map);
      if (interactive) {
        layer.on("pm:update", (e) => {
          const ring = layerToRing(e.layer);
          appliedKeyRef.current = JSON.stringify(ring);
          onChangeRef.current(ring);
        });
        layer.on("pm:dragend", (e) => {
          const ring = layerToRing(e.layer);
          appliedKeyRef.current = JSON.stringify(ring);
          onChangeRef.current(ring);
        });
        layer.on("pm:change", (e) => {
          const ring = layerToRing(e.layer);
          appliedKeyRef.current = JSON.stringify(ring);
          onChangeRef.current(ring);
        });
      }
      layerRef.current = layer;
      const bounds = layer.getBounds();
      if (bounds.isValid()) {
        map.fitBounds(bounds, { padding: [16, 16] });
      }
    }
  }, [map, polygon, interactive]);

  return null;
}

/** Recenter when `center` moves and no polygon is on screen. */
function Recenter({ center, hasPolygon }: { center: [number, number]; hasPolygon: boolean }) {  const map = useMap();
  const prevRef = useRef<string>(JSON.stringify(center));
  useEffect(() => {
    const key = JSON.stringify(center);
    if (key === prevRef.current) return;
    prevRef.current = key;
    if (!hasPolygon) {
      map.setView([center[0], center[1]], map.getZoom());
    }
  }, [map, center, hasPolygon]);
  return null;
}

/**
 * Background fence layer (parent farm boundary while drawing a plot).
 * Dashed, non-interactive, never edited. Fits bounds on first show when no
 * editable polygon is on screen.
 */
function ReferenceLayer({ ring, fitWhenIdle }: { ring: LngLat[] | null; fitWhenIdle: boolean }) {
  const map = useMap();
  const fittedRef = useRef<string>("");
  useEffect(() => {
    const key = JSON.stringify(ring);
    // Always re-render the layer; only auto-fit the first time (idle).
    if (fittedRef.current === `layer:${key}`) return;
    fittedRef.current = `layer:${key}`;
    const layer = (map as unknown as { __refLayer?: L.Polyline }).__refLayer;
    if (layer) {
      map.removeLayer(layer);
      (map as unknown as { __refLayer?: L.Polyline }).__refLayer = undefined;
    }
    if (ring && ring.length > 2) {
      // Literal matches --semantic-success (design-guard approved token
      // value); Leaflet path options cannot consume CSS var() here.
      const line = L.polyline(toLatLngs(ring), {
        color: "#16a34a",
        weight: 2,
        dashArray: "7 6",
        interactive: false,
      });
      line.addTo(map);
      (map as unknown as { __refLayer?: L.Polyline }).__refLayer = line;
      if (fitWhenIdle) {
        const bounds = line.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(ring), fitWhenIdle]);
  return null;
}

/**
 * Live GPS track layer (perimeter-walk capture). Plain white polyline +
 * green start dot, both non-interactive. No Leaflet marker icons (bundler).
 */
function TrackLayer({ track }: { track: LngLat[] | null }) {
  const map = useMap();
  useEffect(() => {
    const key = JSON.stringify(track);
    const holder = map as unknown as { __trackLayers?: L.Layer[] };
    for (const l of holder.__trackLayers ?? []) map.removeLayer(l);
    holder.__trackLayers = [];
    if (track && track.length > 1) {
      const latlngs = toLatLngs(track);
      const line = L.polyline(latlngs, { color: "#ffffff", weight: 4, opacity: 0.95, interactive: false });
      const halo = L.polyline(latlngs, { color: "#0c0a09", weight: 7, opacity: 0.55, interactive: false });
      const [slng, slat] = track[0];
      const dot = L.circleMarker([slat, slng], {
        radius: 7, color: "#ffffff", weight: 2, fillColor: "#16a34a", fillOpacity: 1, interactive: false,
      });
      halo.addTo(map);
      line.addTo(map);
      dot.addTo(map);
      holder.__trackLayers = [halo, line, dot];
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(track)]);
  return null;
}

/**
 * Status pins layer (task map, route stops). CircleMarkers with tooltips —
 * no icon assets, non-draggable, click-through except tooltip.
 */
function PinsLayer({ pins }: { pins: GeoMapPin[] | null }) {
  const map = useMap();
  useEffect(() => {
    const holder = map as unknown as { __pinLayers?: L.Layer[] };
    for (const l of holder.__pinLayers ?? []) map.removeLayer(l);
    holder.__pinLayers = [];
    if (pins && pins.length > 0) {
      const layers = pins
        .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng))
        .map((p) => {
          const m = L.circleMarker([p.lat, p.lng], {
            radius: 9,
            color: "#ffffff",
            weight: 2,
            fillColor: p.color,
            fillOpacity: 1,
            interactive: true,
          });
          m.bindTooltip(p.label, { direction: "top", offset: [0, -10] });
          m.addTo(map);
          return m;
        });
      holder.__pinLayers = layers;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, JSON.stringify(pins)]);
  return null;
}

/**
 * Real OpenStreetMap-based parcel map (client-side only).
 *
 * IMPORTANT: import via `next/dynamic` with `{ ssr: false }`. This component
 * also renders a placeholder until it is mounted in the browser.
 *
 * ```tsx
 * const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), { ssr: false });
 * <GeoMap center={[13.08, 77.59]} polygon={ring} onChange={setRing} height={360} />
 * ```
 */
export function GeoMap({ center, polygon, onChange, height = 360, reference = null, track = null, interactive = true, pins = null }: GeoMapProps) {
  // Client-side only: never render Leaflet during SSR.
  const [isClient, setIsClient] = useState(false);
  useEffect(() => {
    setIsClient(true);
  }, []);
  const [base, setBase] = useState<BaseLayer>("sat");

  const acres = useMemo(() => (polygon ? ringAcres(polygon) : 0), [polygon]);
  const pointCount = polygon ? Math.max(0, polygon.length - 1) : 0;

  if (typeof window === "undefined" || !isClient) {
    return (
      <div
        style={{
          height,
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          color: "var(--muted)",
          fontSize: 13,
        }}
      >
        Map loading…
      </div>
    );
  }

  const toggleBtn = (active: boolean): React.CSSProperties => ({
    border: "1px solid var(--hairline)",
    background: active ? "var(--ink)" : "var(--surface-card)",
    color: active ? "var(--surface-card)" : "var(--ink)",
    fontSize: 12,
    fontWeight: 600,
    padding: "6px 10px",
    cursor: "pointer",
  });

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <MapContainer
        center={[center[0], center[1]]}
        zoom={15}
        style={{ height: "100%", width: "100%" }}
        attributionControl
      >
        {base === "sat" ? (
          <TileLayer url={ESRI_IMAGERY_URL} attribution={ESRI_ATTRIBUTION} maxZoom={19} />
        ) : (
          <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />
        )}
        <GeomanController polygon={polygon} onChange={onChange} interactive={interactive} />
        <ReferenceLayer ring={reference} fitWhenIdle={polygon === null && !track && !pins} />
        <TrackLayer track={track} />
        <PinsLayer pins={pins} />
        <Recenter center={center} hasPolygon={polygon !== null} />
      </MapContainer>

      <div
        style={{
          position: "absolute",
          top: 10,
          right: 10,
          zIndex: 1000,
          display: "flex",
          gap: 6,
        }}
      >
        <button type="button" style={toggleBtn(base === "sat")} onClick={() => setBase("sat")}>
          Satellite
        </button>
        <button type="button" style={toggleBtn(base === "osm")} onClick={() => setBase("osm")}>
          Map
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          left: 10,
          bottom: 10,
          zIndex: 1000,
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          color: "var(--ink)",
          fontSize: 12,
          fontWeight: 600,
          padding: "6px 10px",
        }}
      >
        {polygon ? `${acres.toFixed(2)} acres · ${pointCount} pts` : "Draw a polygon to measure acreage"}
      </div>
    </div>
  );
}
