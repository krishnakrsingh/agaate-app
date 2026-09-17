"use client";

import { useEffect, useMemo, useRef } from "react";
import Link from "next/link";
import * as L from "leaflet";
import { MapContainer, TileLayer, CircleMarker, Tooltip, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type ClientMapPin = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: string;
  /** Pre-formatted coordinates, e.g. "12.7218° N, 76.6501° E". */
  coord?: string;
};

const ESRI_IMAGERY_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTRIBUTION = "Tiles &copy; Esri &mdash; Source: Esri and its contributors";

const MARKER_GREEN = "#16a34a";
const MARKER_AMBER = "#d97706";

type Cluster = { key: string; lat: number; lng: number; items: ClientMapPin[] };

/**
 * Grid clustering keeps the map readable when a client has many estates.
 * Below the threshold each farm keeps its own marker; above it, pins within
 * ~2km collapse into a count marker. No plugin dependency.
 */
function buildClusters(pins: ClientMapPin[]): Cluster[] {
  if (pins.length <= 15) {
    return pins.map((p) => ({ key: p.id, lat: p.lat, lng: p.lng, items: [p] }));
  }
  const THRESHOLD = 0.02;
  const clusters: Cluster[] = [];
  for (const p of pins) {
    const c = clusters.find(
      (g) => Math.abs(g.lat - p.lat) <= THRESHOLD && Math.abs(g.lng - p.lng) <= THRESHOLD
    );
    if (c) {
      c.items.push(p);
      c.lat = (c.lat * (c.items.length - 1) + p.lat) / c.items.length;
      c.lng = (c.lng * (c.items.length - 1) + p.lng) / c.items.length;
    } else {
      clusters.push({ key: p.id, lat: p.lat, lng: p.lng, items: [p] });
    }
  }
  return clusters;
}

function MapController({
  pins,
  focusId,
  fitToken,
}: {
  pins: ClientMapPin[];
  focusId: string | null;
  fitToken: number;
}) {
  const map = useMap();

  // Fit all locations whenever the parent bumps the fit token.
  useEffect(() => {
    if (pins.length === 0) return;
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitToken]);

  // Focus a single farm pin selected from the list.
  useEffect(() => {
    if (!focusId) return;
    const p = pins.find((x) => x.id === focusId);
    if (!p) return;
    map.flyTo([p.lat, p.lng], Math.max(map.getZoom(), 14), { duration: 0.5 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusId]);

  return null;
}

function PinMarker({
  pin,
  selected,
  onSelect,
}: {
  pin: ClientMapPin;
  selected: boolean;
  onSelect?: (id: string) => void;
}) {
  const ref = useRef<L.CircleMarker | null>(null);
  const active = pin.status === "ACTIVE";
  const fill = active ? MARKER_GREEN : MARKER_AMBER;

  // Open the detail popup for the selected marker (list click or marker click).
  useEffect(() => {
    const layer = ref.current;
    if (!layer) return;
    if (selected) layer.openPopup();
    else layer.closePopup();
  }, [selected]);

  return (
    <>
      {selected && (
        <CircleMarker
          center={[pin.lat, pin.lng]}
          radius={18}
          interactive={false}
          pathOptions={{
            color: MARKER_GREEN,
            weight: 2,
            opacity: 0.4,
            fillColor: MARKER_GREEN,
            fillOpacity: 0.12,
          }}
        />
      )}
      <CircleMarker
        ref={ref}
        center={[pin.lat, pin.lng]}
        radius={selected ? 11 : 8}
        pathOptions={{
          color: "#ffffff",
          weight: selected ? 3 : 2,
          fillColor: fill,
          fillOpacity: 1,
        }}
        eventHandlers={{ click: () => onSelect?.(pin.id) }}
      >
        <Tooltip direction="top" offset={[0, selected ? -12 : -8]}>
          {pin.name}
        </Tooltip>
        <Popup closeButton={false} offset={[0, -10]} autoPan>
          <div className="c360-map-popup">
            <div className="c360-map-popup-name">{pin.name}</div>
            <div className="c360-map-popup-status">{pin.status.replaceAll("_", " ")}</div>
            <div className="c360-map-popup-coord">{pin.coord}</div>
            <Link href={`/hq/farms/${pin.id}`} className="c360-map-popup-link">
              View Estate →
            </Link>
          </div>
        </Popup>
      </CircleMarker>
    </>
  );
}

function Pins({
  clusters,
  focusedId,
  onSelect,
}: {
  clusters: Cluster[];
  focusedId: string | null;
  onSelect?: (id: string) => void;
}) {
  const map = useMap();

  // Keep the focused pin out of its cluster so it always renders individually.
  const allPins = clusters.flatMap((c) => c.items);
  const focused = focusedId ? allPins.find((p) => p.id === focusedId) ?? null : null;
  const visible = clusters
    .map((c) => ({ ...c, items: focused ? c.items.filter((p) => p.id !== focusedId) : c.items }))
    .filter((c) => c.items.length > 0);

  return (
    <>
      {visible.map((c) => {
        if (c.items.length > 1) {
          return (
            <CircleMarker
              key={`cluster-${c.key}`}
              center={[c.lat, c.lng]}
              radius={Math.min(22, 12 + c.items.length * 1.2)}
              pathOptions={{ color: "#ffffff", weight: 2, fillColor: "#292524", fillOpacity: 0.92 }}
              eventHandlers={{
                click: () => map.setView([c.lat, c.lng], Math.min(map.getZoom() + 2, 17)),
              }}
            >
              <Tooltip direction="top" offset={[0, -4]}>
                {`${c.items.length} farm locations — zoom in`}
              </Tooltip>
            </CircleMarker>
          );
        }
        const p = c.items[0];
        return <PinMarker key={p.id} pin={p} selected={false} onSelect={onSelect} />;
      })}
      {focused && <PinMarker key={`focus-${focused.id}`} pin={focused} selected onSelect={onSelect} />}
    </>
  );
}

export function ClientFarmsMap({
  pins,
  focusId,
  fitToken,
  onSelectPin,
}: {
  pins: ClientMapPin[];
  focusId: string | null;
  fitToken: number;
  onSelectPin?: (id: string) => void;
}) {
  const valid = useMemo(
    () => pins.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lng)),
    [pins]
  );
  const clusters = useMemo(() => buildClusters(valid), [valid]);
  const center: [number, number] =
    valid.length > 0 ? [valid[0].lat, valid[0].lng] : [20.5937, 78.9629];

  return (
    <div className="c360-map">
      <MapContainer
        center={center}
        zoom={valid.length ? 12 : 5}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer url={ESRI_IMAGERY_URL} attribution={ESRI_ATTRIBUTION} maxZoom={19} />
        <MapController pins={valid} focusId={focusId} fitToken={fitToken} />
        <Pins clusters={clusters} focusedId={focusId} onSelect={onSelectPin} />
      </MapContainer>
    </div>
  );
}

export default ClientFarmsMap;
