"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";

type Farm = {
  id: string;
  name: string;
  ownerName: string;
  location: string;
  address: string | null;
  latitude: string;
  longitude: string;
  totalArea: string;
  cultivableArea: string;
  waterSource: string;
  geofenceRadiusMeters: number;
};

export function FarmEditForm({ farm }: { farm: Farm }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [lat, setLat] = useState(farm.latitude);
  const [lng, setLng] = useState(farm.longitude);

  function capture() {
    if (!navigator.geolocation) {
      setError("This device cannot provide geolocation. Enter coordinates manually.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setSuccess("Current device GPS coordinates captured.");
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
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    const f = new FormData(e.currentTarget);
    const payload = {
      name: f.get("name"),
      ownerName: f.get("ownerName"),
      location: f.get("location"),
      address: f.get("address") || null,
      latitude: Number(f.get("latitude")),
      longitude: Number(f.get("longitude")),
      totalArea: Number(f.get("totalArea")),
      cultivableArea: Number(f.get("cultivableArea")),
      waterSource: f.get("waterSource"),
      geofenceRadiusMeters: Number(f.get("geofenceRadiusMeters")),
    };

    try {
      const r = await fetch(`/api/farms/${farm.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setPending(false);

      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        setError(body.error ?? "Unable to save farm.");
        return;
      }

      setSuccess("Farm details updated successfully.");
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
            <span>FARM CONFIGURATION</span>
          </div>
          <h2 className="section-title">Edit Farm Details: {farm.name}</h2>
        </div>
      </div>

      <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        <div>
          <div className="form-section-title">1. General Information</div>
          <div className="two-column" style={{ marginTop: 12 }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Farm Name</label>
              <input name="name" defaultValue={farm.name} required />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Client / Owner Name</label>
              <input name="ownerName" defaultValue={farm.ownerName} required />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Location (City / District)</label>
              <input name="location" defaultValue={farm.location} required />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Water Source</label>
              <input name="waterSource" defaultValue={farm.waterSource} required />
            </div>

            <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
              <label>Full Address</label>
              <input name="address" defaultValue={farm.address ?? ""} />
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="form-section-title">2. Geodata &amp; Acreage</div>
          <div className="two-column" style={{ marginTop: 12 }}>
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
              <label>Total Area (Acres)</label>
              <input name="totalArea" type="number" min="0.01" step="0.01" defaultValue={farm.totalArea} required />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Cultivable Area (Acres)</label>
              <input name="cultivableArea" type="number" min="0.01" step="0.01" defaultValue={farm.cultivableArea} required />
            </div>

            <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
              <label>Geofence Radius (Meters)</label>
              <input
                name="geofenceRadiusMeters"
                type="number"
                min="50"
                max="10000"
                defaultValue={farm.geofenceRadiusMeters}
                required
              />
            </div>
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
          <button type="submit" className="btn btn-green" disabled={pending}>
            <span>{pending ? "Saving…" : "Save Farm Changes"}</span>
          </button>
        </div>
      </form>
    </article>
  );
}
