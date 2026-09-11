"use client";
import { FormEvent, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";
import { parseBoundary, toGeoJsonPolygon, ringAcres, type LngLat } from "@/lib/geo";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => <div style={{ height: 300, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13 }}>Map loading…</div>,
});

const INDIA_CENTER: [number, number] = [20.59, 78.96];

type Plot = {
  id: string;
  farmId: string;
  name: string;
  area: string;
  latitude: string;
  longitude: string;
  soilType: string | null;
  status: string;
  boundaryGeoJson?: string | null;
  measuredAcres?: string | number | null;
  irrigation: { type: string; details: string | null }[];
};

const options = ["Drip", "Rain Pipe", "Sprinkler", "Flood", "Other"] as const;

export function PlotEditForm({
  plot,
  farmBoundary,
  farmCenter,
}: {
  plot: Plot;
  farmBoundary?: string | null;
  farmCenter?: [number, number] | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [lat, setLat] = useState(plot.latitude);
  const [lng, setLng] = useState(plot.longitude);

  const initialSelected = new Set(plot.irrigation.map((i) => i.type));
  const [selected, setSelected] = useState<Set<string>>(initialSelected);

  const [ring, setRing] = useState<LngLat[] | null>(() => parseBoundary(plot.boundaryGeoJson ?? null));
  const [ringDirty, setRingDirty] = useState(false);
  const onRingChange = (r: LngLat[] | null) => {
    setRing(r);
    setRingDirty(true);
  };

  const center = useMemo<[number, number]>(() => {
    if (farmCenter && Number.isFinite(farmCenter[0]) && Number.isFinite(farmCenter[1])) return farmCenter;
    const la = Number(lat);
    const ln = Number(lng);
    if (Number.isFinite(la) && Number.isFinite(ln)) return [la, ln];
    return INDIA_CENTER;
  }, [farmCenter, lat, lng]);
  const reference = useMemo(() => parseBoundary(farmBoundary ?? null), [farmBoundary]);

  function capture() {
    if (!navigator.geolocation) {
      setError("This device does not provide geolocation. Enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLat(String(position.coords.latitude));
        setLng(String(position.coords.longitude));
        setSuccess("Captured current device coordinates.");
      },
      (reason) =>
        setError(
          reason.code === 1
            ? "Location permission was denied. Enter coordinates manually."
            : reason.code === 3
            ? "Location timed out. Try again or enter coordinates manually."
            : "Location is unavailable. Enter coordinates manually."
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  function toggle(type: string, checked: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (checked) n.add(type);
      else n.delete(type);
      return n;
    });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    const f = new FormData(event.currentTarget);
    const irrigation = Array.from(selected).map((type) => ({
      type,
      details: (String(f.get(`irrigation_details_${type}`) ?? "").trim() || null) as string | null,
    }));

    if (!irrigation.length) {
      setPending(false);
      setError("Select at least one irrigation type.");
      return;
    }

    try {
      const response = await fetch(`/api/plots/${plot.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.get("name"),
          area: Number(f.get("area")),
          latitude: Number(f.get("latitude")),
          longitude: Number(f.get("longitude")),
          soilType: f.get("soilType") || null,
          status: f.get("status"),
          // Fence edited only when touched: omitted = keep, null = clear.
          ...(ringDirty ? { boundary: ring ? toGeoJsonPolygon(ring) : null } : {}),
          irrigation,
        }),
      });
      setPending(false);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Unable to update plot.");
        return;
      }

      setSuccess("Plot saved successfully.");
      router.refresh();
    } catch {
      setPending(false);
      setError("Network error.");
    }
  }

  async function archive() {
    if (!confirm(`Are you sure you want to archive "${plot.name}"?`)) return;

    setPending(true);
    setError("");
    setSuccess("");

    try {
      const response = await fetch(`/api/plots/${plot.id}`, { method: "DELETE" });
      setPending(false);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Unable to archive plot.");
        return;
      }

      router.replace(`/farms/${plot.farmId}`);
      router.refresh();
    } catch {
      setPending(false);
      setError("Network error.");
    }
  }

  return (
    <article className="compact-card" style={{ padding: 24, gap: 18 }}>
      <div className="page-header" style={{ paddingBottom: 12 }}>
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>PLOT CONFIGURATION</span>
          </div>
          <h2 className="section-title">Edit Plot Details: {plot.name}</h2>
        </div>
        <span className="status active">{plot.status}</span>
      </div>

      <form data-plot-edit onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div className="form-section-title">1. Plot Boundary &amp; State</div>
          <div className="two-column" style={{ marginTop: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Plot Name</label>
              <input name="name" defaultValue={plot.name} required />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Area (Acres)</label>
              <input name="area" type="number" min="0.01" step="0.01" defaultValue={plot.area} required />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <label>Latitude</label>
                <button
                  type="button"
                  className="text-action"
                  onClick={capture}
                  style={{ fontSize: "11px" }}
                >
                  + Capture GPS
                </button>
              </div>
              <input
                name="latitude"
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Longitude</label>
              <input
                name="longitude"
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Soil Type</label>
              <input name="soilType" defaultValue={plot.soilType ?? ""} placeholder="e.g., Red Loam" />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Plot Status</label>
              <select name="status" defaultValue={plot.status}>
                <option value="ACTIVE">Active</option>
                <option value="FALLOW">Fallow</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                <label style={{ margin: 0 }}>Fence on Satellite</label>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {plot.measuredAcres ? `Server-measured ${plot.measuredAcres} ac · ` : ""}
                  {ring && ringDirty
                    ? `redrawn ${ringAcres(ring).toFixed(2)} ac — saving sets acres from fence`
                    : "redraw to move the fence (must stay inside the green farm fence)"}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <GeoMap center={center} polygon={ring} onChange={onRingChange} reference={reference} height={300} />
              </div>
              {ring && (
                <button
                  type="button"
                  className="text-action"
                  style={{ fontSize: 12, marginTop: 6 }}
                  onClick={() => onRingChange(null)}
                >
                  Remove fence (keep point location)
                </button>
              )}
            </div>
          </div>
        </div>
        </div>

        {/* Irrigation Setup */}
        <div className="form-section">
          <div className="form-section-title">2. Irrigation Systems</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {options.map((type) => {
              const checked = selected.has(type);
              return (
                <div
                  key={type}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 140px), 1fr))",
                    gap: 12,
                    alignItems: "center",
                    padding: "8px 12px",
                    background: "var(--canvas)",
                    borderRadius: "var(--radius-xs)",
                    border: `1px solid ${checked ? "var(--green)" : "var(--line)"}`,
                  }}
                >
                  <label className="check" style={{ margin: 0, fontSize: "13px" }}>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => toggle(type, e.target.checked)}
                    />
                    <span>{type}</span>
                  </label>
                  <input
                    name={`irrigation_details_${type}`}
                    defaultValue={plot.irrigation.find((i) => i.type === type)?.details ?? ""}
                    placeholder={type === "Other" ? "Required details" : "Optional details"}
                    disabled={!checked}
                    style={{ minHeight: 36, padding: "5px 10px", fontSize: "13px" }}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {error && (
          <div className="error" role="alert">
            <Icons.AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="success-banner" role="status">
            <Icons.CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={archive}
            disabled={pending}
          >
            Archive Plot
          </button>

          <button type="submit" className="btn btn-green" disabled={pending}>
            <span>{pending ? "Saving…" : "Save Plot Changes"}</span>
          </button>
        </div>
      </form>
    </article>
  );
}
