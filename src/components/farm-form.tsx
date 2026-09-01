"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";

export function FarmForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  function capture() {
    if (!navigator.geolocation) {
      setError("Location is not supported on this device. Enter coordinates manually.");
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

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    setSuccess("");

    const f = new FormData(e.currentTarget);
    const payload = Object.fromEntries(f);
    for (const key of ["latitude", "longitude", "totalArea", "cultivableArea", "geofenceRadiusMeters"]) {
      (payload as Record<string, unknown>)[key] = Number(f.get(key));
    }

    try {
      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setPending(false);

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body.error ?? "Unable to create farm.");
        return;
      }

      router.replace(`/farms/${body.id}`);
      router.refresh();
    } catch {
      setPending(false);
      setError("Network error.");
    }
  }

  return (
    <article className="card" style={{ padding: 28 }}>
      <div className="card-header">
        <div>
          <div className="eyebrow">ESTATE ONBOARDING</div>
          <h2 style={{ margin: "2px 0 0" }}>Setup New Farm Property</h2>
        </div>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
        <div className="two-column">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Farm Name</label>
            <input name="name" placeholder="e.g., Greenfield Agro Farms" required maxLength={120} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Client / Owner Name</label>
            <input name="ownerName" placeholder="e.g., Ramesh Patel" required maxLength={120} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Location (City / District)</label>
            <input name="location" placeholder="e.g., Hosur, Krishnagiri" required maxLength={180} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Primary Water Source</label>
            <input name="waterSource" placeholder="e.g., Borewell (20 HP) + Farm Pond" required maxLength={180} />
          </div>

          <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
            <label>Full Address / Landmark</label>
            <input name="address" placeholder="Survey No. 42/1, Denkanikottai Road…" maxLength={500} />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <label>Latitude</label>
              <button
                type="button"
                onClick={capture}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--action-blue)",
                  fontSize: 11,
                  padding: 0,
                  cursor: "pointer",
                  fontFamily: "var(--font-mono)",
                  textTransform: "uppercase",
                }}
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
              placeholder="e.g., 12.5284"
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
              placeholder="e.g., 77.8341"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              required
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Total Farm Area (Acres)</label>
            <input name="totalArea" type="number" step="0.01" min="0.01" placeholder="e.g., 10.0" required />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Cultivable Area (Acres)</label>
            <input name="cultivableArea" type="number" step="0.01" min="0.01" placeholder="e.g., 8.5" required />
          </div>

          <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
            <label>Geofence Radius (Meters)</label>
            <input
              name="geofenceRadiusMeters"
              type="number"
              defaultValue="500"
              min="50"
              max="10000"
              required
            />
            <small className="muted" style={{ display: "block", marginTop: 4 }}>
              Used for automatic selfie attendance validation. Default is 500m around coordinates.
            </small>
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

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={pending} style={{ padding: "12px 28px" }}>
            <Icons.Plus size={16} />
            <span>{pending ? "Creating farm record…" : "Create Setup Farm Record"}</span>
          </button>
        </div>
      </form>
    </article>
  );
}
