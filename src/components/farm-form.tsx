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
      setError("Location is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude));
        setLng(String(pos.coords.longitude));
        setSuccess("Current device GPS coordinates captured.");
      },
      () => setError("Location capture failed. Please enter coordinates manually."),
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
    <article className="card">
      <div className="card-header">
        <div>
          <h2>Setup New Farm Property</h2>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Add boundary coordinates, cultivable acreage, and water infrastructure.
          </p>
        </div>
      </div>

      <form className="form two-column" onSubmit={submit}>
        <div className="form-group">
          <label>Farm Name</label>
          <input name="name" placeholder="e.g., Greenfield Agro Farms" required maxLength={120} />
        </div>

        <div className="form-group">
          <label>Client / Owner Name</label>
          <input name="ownerName" placeholder="e.g., Ramesh Patel" required maxLength={120} />
        </div>

        <div className="form-group">
          <label>Location (City / District)</label>
          <input name="location" placeholder="e.g., Hosur, Krishnagiri" required maxLength={180} />
        </div>

        <div className="form-group">
          <label>Primary Water Source</label>
          <input name="waterSource" placeholder="e.g., Borewell (20 HP) + Farm Pond" required maxLength={180} />
        </div>

        <div className="form-group wide">
          <label>Full Address / Landmark</label>
          <input name="address" placeholder="Survey No. 42/1, Denkanikottai Road…" maxLength={500} />
        </div>

        <div className="form-group">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label>Latitude</label>
            <button
              type="button"
              onClick={capture}
              style={{
                background: "none",
                border: "none",
                color: "var(--primary-700)",
                fontSize: "0.78rem",
                padding: 0,
                boxShadow: "none",
                cursor: "pointer",
              }}
            >
              Capture GPS
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

        <div className="form-group">
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

        <div className="form-group">
          <label>Total Farm Area (acres)</label>
          <input name="totalArea" type="number" step="0.01" min="0.01" placeholder="e.g., 10.0" required />
        </div>

        <div className="form-group">
          <label>Cultivable Area (acres)</label>
          <input name="cultivableArea" type="number" step="0.01" min="0.01" placeholder="e.g., 8.5" required />
        </div>

        <div className="form-group wide">
          <label>Geofence Radius (meters)</label>
          <input
            name="geofenceRadiusMeters"
            type="number"
            defaultValue="500"
            min="50"
            max="10000"
            required
          />
          <small className="muted">
            Used for automatic selfie attendance validation. Default is 500m around coordinates.
          </small>
        </div>

        {error && (
          <div className="error wide" role="alert">
            <Icons.AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="hint wide" role="status">
            <Icons.CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}

        <button type="submit" className="btn btn-primary wide" disabled={pending} style={{ padding: "14px 20px" }}>
          <Icons.Plus size={18} />
          <span>{pending ? "Creating farm record…" : "Create Setup Farm Record"}</span>
        </button>
      </form>
    </article>
  );
}
