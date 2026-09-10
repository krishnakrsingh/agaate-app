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

const irrigationOptions = ["Drip", "Rain Pipe", "Sprinkler", "Flood", "Other"] as const;

const INDIA_CENTER: [number, number] = [20.59, 78.96];

export function PlotForm({
  farmId,
  farmCenter,
  farmBoundary,
}: {
  farmId: string;
  /** [lat,lng] focus for the fence map (falls back to India center). */
  farmCenter?: [number, number] | null;
  /** Farm boundary GeoJSON string (any accepted form) shown as reference fence. */
  farmBoundary?: string | null;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(["Drip"]));

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [ring, setRing] = useState<LngLat[] | null>(null);

  const center = useMemo<[number, number]>(() => {
    if (farmCenter && Number.isFinite(farmCenter[0]) && Number.isFinite(farmCenter[1])) return farmCenter;
    const la = Number(lat);
    const ln = Number(lng);
    if (Number.isFinite(la) && Number.isFinite(ln)) return [la, ln];
    return INDIA_CENTER;
  }, [farmCenter, lat, lng]);
  const reference = useMemo(() => parseBoundary(farmBoundary ?? null), [farmBoundary]);
  const drawnAcres = ring ? ringAcres(ring) : 0;

  const capture = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported on this device. Enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(String(p.coords.latitude));
        setLng(String(p.coords.longitude));
        setSuccess("Captured current device coordinates.");
        setError("");
      },
      (err) =>
        setError(
          err.code === 1
            ? "Location permission was denied. Enter coordinates manually."
            : err.code === 3
            ? "Location timed out. Try again or enter coordinates manually."
            : "Location is unavailable. Enter coordinates manually."
        ),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  function toggle(type: string, checked: boolean) {
    setSelected((prev) => {
      const n = new Set(prev);
      if (checked) n.add(type);
      else n.delete(type);
      return n;
    });
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    const formEl = e.currentTarget;
    const f = new FormData(formEl);
    const irrigation = Array.from(selected).map((type) => ({
      type,
      details: (String(f.get(`irrigation_details_${type}`) ?? "").trim() || null) as string | null,
    }));

    if (!irrigation.length) {
      setPending(false);
      setError("Select at least one irrigation type.");
      return;
    }

    const payload = {
      name: f.get("name"),
      area: Number(f.get("area")),
      latitude: Number(f.get("latitude")),
      longitude: Number(f.get("longitude")),
      soilType: f.get("soilType") || null,
      // Drawn fence: server validates containment + sets acres from geometry.
      boundary: ring ? toGeoJsonPolygon(ring) : undefined,
      irrigation,
    };

    try {
      const res = await fetch(`/api/farms/${farmId}/plots`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setPending(false);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Unable to add plot.");
        return;
      }

      setSuccess("Plot added successfully.");
      formEl?.reset();
      setSelected(new Set(["Drip"]));
      setRing(null);
      window.location.reload();
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
            <span>PLOT REGISTRATION</span>
          </div>
          <h2 className="section-title">Create Plot on this Farm</h2>
        </div>
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div className="form-section-title">1. Plot Boundary &amp; Soil</div>
          <div className="two-column" style={{ marginTop: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Plot Name / Identifier</label>
              <input name="name" placeholder="e.g., Plot 1 - North Sector" required />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Plot Area (Acres){ring ? " — set from fence" : ""}</label>
              <input
                name="area"
                type="number"
                step="0.01"
                min="0.01"
                placeholder="e.g., 2.5"
                required={!ring}
                disabled={!!ring}
                title={ring ? `Server sets area from drawn fence (${drawnAcres.toFixed(2)} ac)` : undefined}
              />
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
                min="-90"
                max="90"
                placeholder="e.g., 12.9716"
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
                min="-180"
                max="180"
                placeholder="e.g., 77.5946"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
              <label>Soil Type (Optional)</label>
              <input name="soilType" placeholder="e.g., Red Sandy Loam (pH 6.8)" />
            </div>

            <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 6 }}>
                <label style={{ margin: 0 }}>Fence on Satellite (Optional)</label>
                <span style={{ fontSize: 12, color: "var(--muted)" }}>
                  {ring
                    ? `Drawn ${drawnAcres.toFixed(2)} ac — must sit inside the green farm fence`
                    : farmBoundary
                      ? "Draw inside the green farm fence — server sets acres from geometry"
                      : "Satellite draw — server sets acres from geometry"}
                </span>
              </div>
              <div style={{ marginTop: 8 }}>
                <GeoMap center={center} polygon={ring} onChange={setRing} reference={reference} height={300} />
              </div>
            </div>
          </div>
        </div>

        {/* Irrigation Setup */}
        <div className="form-section">
          <div className="form-section-title">2. Irrigation Setup</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 12 }}>
            {irrigationOptions.map((type) => (
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
                  border: `1px solid ${selected.has(type) ? "var(--green)" : "var(--line)"}`,
                }}
              >
                <label className="check" style={{ margin: 0, fontSize: "13px" }}>
                  <input
                    type="checkbox"
                    checked={selected.has(type)}
                    onChange={(e) => toggle(type, e.target.checked)}
                  />
                  <span>{type}</span>
                </label>
                <input
                  name={`irrigation_details_${type}`}
                  placeholder={type === "Other" ? "Required: Specify details" : "Optional details (spacing, flow)"}
                  disabled={!selected.has(type)}
                  maxLength={300}
                  style={{ minHeight: 36, padding: "5px 10px", fontSize: "13px" }}
                />
              </div>
            ))}
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

        <div style={{ display: "flex", justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 14 }}>
          <button type="submit" className="btn btn-green btn-lg" disabled={pending}>
            <Icons.Plus size={16} />
            <span>{pending ? "Adding plot…" : "Save Plot to Farm"}</span>
          </button>
        </div>
      </form>
    </article>
  );
}
