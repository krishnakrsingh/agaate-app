"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MapContainer, TileLayer, CircleMarker, Popup, Polygon, Tooltip, useMap, useMapEvents } from "react-leaflet";
import * as L from "leaflet";
import "leaflet/dist/leaflet.css";

export interface PlatformFarm {
  id: string;
  name: string;
  status: string;
  clientId: string | null;
  clientName: string | null;
  lat: number;
  lng: number;
  hasBoundary: boolean;
  ring: [number, number][] | null;
  totalArea: number;
  measuredAcres: number | null;
  href: string;
}

export interface PlatformPlot {
  id: string;
  farmId: string;
  name: string;
  status: string;
  lat: number;
  lng: number;
  area: number;
  ring: [number, number][] | null;
}

export interface PlatformIncident {
  id: string;
  farmId: string;
  type: string;
  status: string;
  lat: number;
  lng: number;
  farmName: string | null;
}

export interface Viewport {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

const ESRI_IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTRIBUTION = "Tiles &copy; Esri &mdash; Source: Esri and its contributors";
const OSM_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
const OSM_ATTRIBUTION = "&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors";

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "#16a34a",
  SETUP: "#d97706",
  INACTIVE: "#78716c",
  COMPLETED: "#2563eb",
};

function colorFor(status: string): string {
  return STATUS_COLORS[status] ?? "#57534e";
}

function toLatLngs(ring: [number, number][]): L.LatLngExpression[] {
  return ring.map(([lng, lat]) => [lat, lng] as [number, number]);
}

/** Grid-cluster farms so dense viewports stay readable without a dep. */
function clusterKey(lat: number, lng: number, zoom: number): string {
  const cell = (360 / (256 * Math.pow(2, zoom))) * 64;
  return `${Math.floor(lat / cell)}:${Math.floor(lng / cell)}`;
}

function ViewportReporter({ onViewport }: { onViewport: (v: Viewport, zoom: number) => void }) {
  const ref = useRef(onViewport);
  ref.current = onViewport;
  const map = useMapEvents({
    moveend: () => {
      const b = map.getBounds();
      ref.current(
        { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() },
        map.getZoom()
      );
    },
  });
  useEffect(() => {
    const b = map.getBounds();
    ref.current(
      { minLat: b.getSouth(), maxLat: b.getNorth(), minLng: b.getWest(), maxLng: b.getEast() },
      map.getZoom()
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  return null;
}

function FlyTo({ target }: { target: { lat: number; lng: number; key: number } | null }) {
  const map = useMap();
  useEffect(() => {
    if (target) map.flyTo([target.lat, target.lng], Math.max(map.getZoom(), 13), { duration: 1.2 });
  }, [map, target]);
  return null;
}

export function PlatformMapLeaflet({
  farms,
  plots,
  incidents,
  taskCounts,
  showPlots,
  showIncidents,
  showTasks,
  base,
  flyTo,
  onViewport,
}: {
  farms: PlatformFarm[];
  plots: PlatformPlot[];
  incidents: PlatformIncident[];
  taskCounts: Record<string, number>;
  showPlots: boolean;
  showIncidents: boolean;
  showTasks: boolean;
  base: "sat" | "osm";
  flyTo: { lat: number; lng: number; key: number } | null;
  onViewport: (v: Viewport, zoom: number) => void;
}) {
  return (
    <MapContainer
      center={[23.0, 79.0]}
      zoom={5}
      style={{ height: "100%", width: "100%" }}
      attributionControl
    >
      {base === "sat" ? (
        <TileLayer url={ESRI_IMAGERY_URL} attribution={ESRI_ATTRIBUTION} maxZoom={19} />
      ) : (
        <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} />
      )}
      <ViewportReporter onViewport={onViewport} />
      <FlyTo target={flyTo} />
      <FarmPins farms={farms} taskCounts={taskCounts} showTasks={showTasks} />
      {farms.map((f) =>
        f.ring && f.ring.length > 2 ? (
          <Polygon
            key={`fb-${f.id}`}
            positions={toLatLngs(f.ring)}
            pathOptions={{ color: colorFor(f.status), weight: 1.5, fillOpacity: 0.08, interactive: false }}
          />
        ) : null
      )}
      {showPlots &&
        plots.map((p) =>
          p.ring && p.ring.length > 2 ? (
            <Polygon
              key={`pp-${p.id}`}
              positions={toLatLngs(p.ring)}
              pathOptions={{ color: "#2563eb", weight: 1, dashArray: "4 3", fillOpacity: 0.12, interactive: false }}
            />
          ) : null
        )}
      {showIncidents &&
        incidents.map((i) => (
          <CircleMarker
            key={`inc-${i.id}`}
            center={[i.lat, i.lng]}
            radius={6}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#dc2626", fillOpacity: 1 }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {i.type} · {i.farmName ?? i.farmId}
            </Tooltip>
            <Popup>
              <div style={{ fontSize: 13, lineHeight: 1.5 }}>
                <div style={{ fontWeight: 700 }}>{i.type}</div>
                <div>Status: {i.status}</div>
                <div>Farm: {i.farmName ?? i.farmId}</div>
                <Link href={`/farms/${i.farmId}?tab=operations`}>Open farm operations</Link>
              </div>
            </Popup>
          </CircleMarker>
        ))}
    </MapContainer>
  );
}

function FarmPins({
  farms,
  taskCounts,
  showTasks,
}: {
  farms: PlatformFarm[];
  taskCounts: Record<string, number>;
  showTasks: boolean;
}) {
  const map = useMap();
  const [zoom, setZoom] = useState(map.getZoom());
  useMapEvents({
    zoomend: () => setZoom(map.getZoom()),
    moveend: () => setZoom(map.getZoom()),
  });
  const groups = useMemo(() => {
    const byKey = new Map<string, { lat: number; lng: number; items: PlatformFarm[] }>();
    for (const f of farms) {
      const key = clusterKey(f.lat, f.lng, zoom);
      const g = byKey.get(key);
      if (g) {
        g.items.push(f);
        g.lat += f.lat;
        g.lng += f.lng;
      } else {
        byKey.set(key, { lat: f.lat, lng: f.lng, items: [f] });
      }
    }
    return [...byKey.values()].map((g) => ({
      lat: g.lat / g.items.length,
      lng: g.lng / g.items.length,
      items: g.items,
    }));
  }, [farms, zoom]);

  return (
    <>
      {groups.map((g, idx) =>
        g.items.length === 1 ? (
          <SingleFarmPin
            key={g.items[0].id}
            farm={g.items[0]}
            openTasks={taskCounts[g.items[0].id] ?? 0}
            showTasks={showTasks}
          />
        ) : (
          <CircleMarker
            key={`c-${idx}`}
            center={[g.lat, g.lng]}
            radius={12}
            pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#0c0a09", fillOpacity: 0.9 }}
            eventHandlers={{ click: () => map.setView([g.lat, g.lng], Math.min(map.getZoom() + 2, 18)) }}
          >
            <Tooltip direction="top" offset={[0, -12]} permanent>
              {g.items.length} farms
            </Tooltip>
          </CircleMarker>
        )
      )}
    </>
  );
}

function SingleFarmPin({ farm, openTasks, showTasks }: { farm: PlatformFarm; openTasks: number; showTasks: boolean }) {
  return (
    <CircleMarker
      center={[farm.lat, farm.lng]}
      radius={showTasks && openTasks > 0 ? 10 : 8}
      pathOptions={{
        color: showTasks && openTasks > 0 ? "#d97706" : "#ffffff",
        weight: 2,
        fillColor: colorFor(farm.status),
        fillOpacity: 1,
      }}
    >
      <Tooltip direction="top" offset={[0, -10]}>
        {farm.name}
        {showTasks && openTasks > 0 ? ` · ${openTasks} open tasks` : ""}
      </Tooltip>
      <Popup>
        <div style={{ fontSize: 13, lineHeight: 1.5, minWidth: 160 }}>
          <div style={{ color: "var(--muted)", fontSize: 11 }}>Farm ID: {farm.id}</div>
          <div style={{ fontWeight: 700 }}>{farm.name}</div>
          <div>Client: {farm.clientName ?? "—"}</div>
          <div>Status: {farm.status}</div>
          {showTasks ? <div>Open tasks: {openTasks}</div> : null}
          <Link href={farm.href}>Open Farm 360</Link>
        </div>
      </Popup>
    </CircleMarker>
  );
}
