"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { GeoMapPin } from "./map/geo-map";
import type { LngLat } from "@/lib/geo";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => <div style={{ height: 260, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13 }}>Map loading…</div>,
});

interface RouteStop {
  plotId: string;
  name: string;
  status: "MISSED" | "NEVER";
  lat: number;
  lng: number;
  legMeters: number;
}

/**
 * Walking order over unvisited plots: ordered stops, leg distances, total,
 * and the path drawn on the map. Unfenced plots are listed, never routed.
 */
export function VisitRouteCard({ farmId, farmCenter }: { farmId: string; farmCenter: [number, number] | null }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [stops, setStops] = useState<RouteStop[]>([]);
  const [unroutable, setUnroutable] = useState<{ plotId: string; name: string }[]>([]);
  const [totalMeters, setTotalMeters] = useState(0);
  const [planned, setPlanned] = useState(false);

  async function plan(useGps: boolean) {
    setLoading(true);
    setError("");
    let qs = "";
    if (useGps) {
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 })
        );
        qs = `&fromLat=${pos.coords.latitude}&fromLng=${pos.coords.longitude}`;
      } catch {
        setError("No GPS fix — planning from farm center instead.");
      }
    }
    try {
      const res = await fetch(`/api/farms/${farmId}/visit-route?days=14${qs}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? "Route planning failed.");
      setStops(body.stops ?? []);
      setUnroutable(body.unroutable ?? []);
      setTotalMeters(body.totalMeters ?? 0);
      setPlanned(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Route planning failed.");
    } finally {
      setLoading(false);
    }
  }

  const pins: GeoMapPin[] = stops.map((s, i) => ({
    key: s.plotId,
    lat: s.lat,
    lng: s.lng,
    color: s.status === "NEVER" ? "#a63b32" : "#9a6818",
    label: `${i + 1}. ${s.name}`,
  }));
  const path: LngLat[] | null = stops.length > 1 ? stops.map((s) => [s.lng, s.lat] as LngLat) : null;

  return (
    <div className="card" style={{ padding: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <strong style={{ fontSize: 14 }}>Walking Route</strong>
        {!open ? (
          <button type="button" className="btn btn-sm" onClick={() => { setOpen(true); void plan(false); }}>
            Plan my visits
          </button>
        ) : (
          <span style={{ display: "flex", gap: 6 }}>
            <button type="button" className="btn btn-sm" disabled={loading} onClick={() => void plan(true)}>
              {loading ? "Planning…" : "Start from my GPS"}
            </button>
            <button type="button" className="btn btn-sm" onClick={() => setOpen(false)}>
              Close
            </button>
          </span>
        )}
      </div>
      {error && <div className="error" role="alert" style={{ marginTop: 8 }}><span>{error}</span></div>}
      {open && planned && (
        <div style={{ marginTop: 10 }}>
          <p className="muted" style={{ fontSize: 12.5, margin: "0 0 8px" }}>
            {stops.length === 0
              ? "Nothing to visit — every fenced plot was seen recently."
              : `${stops.length} stop${stops.length === 1 ? "" : "s"} · ~${totalMeters >= 1000 ? `${(totalMeters / 1000).toFixed(1)} km` : `${totalMeters} m`} walking`}
            {unroutable.length > 0 && ` · ${unroutable.length} unfenced not routable`}
          </p>
          {stops.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <GeoMap
                center={farmCenter ?? [20.59, 78.96]}
                polygon={null}
                onChange={() => undefined}
                interactive={false}
                pins={pins}
                track={path}
                height={260}
              />
            </div>
          )}
          {stops.map((s, i) => (
            <div className="list-row" key={s.plotId}>
              <span style={{ flex: 1 }}>
                <b>{i + 1}. <Link href={`/plots/${s.plotId}`}>{s.name}</Link></b>
                <br />
                <small style={{ color: "var(--muted)" }}>
                  {i === 0 ? "start" : `+${s.legMeters}m`} · {s.status === "NEVER" ? "never visited" : "missed lately"}
                </small>
              </span>
              <span className={`badge ${s.status === "NEVER" ? "badge-danger" : "badge-amber"}`}>{s.status}</span>
            </div>
          ))}
          {unroutable.map((u) => (
            <div className="list-row" key={u.plotId}>
              <span style={{ flex: 1 }}>
                <Link href={`/plots/${u.plotId}`}>{u.name}</Link>
                <br />
                <small style={{ color: "var(--muted)" }}>no fence drawn — map it first</small>
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
