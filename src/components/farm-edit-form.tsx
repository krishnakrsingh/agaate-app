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

  function capture() {
    if (!navigator.geolocation) {
      setError("This device cannot provide geolocation.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = document.querySelector("[name=latitude]") as HTMLInputElement;
        const lon = document.querySelector("[name=longitude]") as HTMLInputElement;
        if (lat) lat.value = String(pos.coords.latitude);
        if (lon) lon.value = String(pos.coords.longitude);
        setSuccess("Current device GPS coordinates captured.");
      },
      () => setError("Location capture failed. Please enter coordinates manually."),
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
    <article className="card">
      <div className="card-header">
        <div>
          <h3>Edit Farm Details</h3>
          <p className="muted" style={{ fontSize: "0.88rem" }}>
            Update farm boundary coordinates, cultivable area, and geofence radius.
          </p>
        </div>
      </div>

      <form className="form two-column" onSubmit={save}>
        <div className="form-group">
          <label>Farm name</label>
          <input name="name" defaultValue={farm.name} required />
        </div>

        <div className="form-group">
          <label>Client / Owner name</label>
          <input name="ownerName" defaultValue={farm.ownerName} required />
        </div>

        <div className="form-group">
          <label>Location (City / District)</label>
          <input name="location" defaultValue={farm.location} required />
        </div>

        <div className="form-group">
          <label>Water source</label>
          <input name="waterSource" defaultValue={farm.waterSource} required />
        </div>

        <div className="form-group wide">
          <label>Full address</label>
          <input name="address" defaultValue={farm.address ?? ""} />
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
          <input name="latitude" type="number" step="any" defaultValue={farm.latitude} required />
        </div>

        <div className="form-group">
          <label>Longitude</label>
          <input name="longitude" type="number" step="any" defaultValue={farm.longitude} required />
        </div>

        <div className="form-group">
          <label>Total area (acres)</label>
          <input name="totalArea" type="number" min="0.01" step="0.01" defaultValue={farm.totalArea} required />
        </div>

        <div className="form-group">
          <label>Cultivable area (acres)</label>
          <input name="cultivableArea" type="number" min="0.01" step="0.01" defaultValue={farm.cultivableArea} required />
        </div>

        <div className="form-group wide">
          <label>Geofence validation radius (meters)</label>
          <input
            name="geofenceRadiusMeters"
            type="number"
            min="50"
            max="10000"
            defaultValue={farm.geofenceRadiusMeters}
            required
          />
          <small className="muted">
            Officers clocking attendance beyond this radius generate an exception for Farm Admin review.
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

        <button type="submit" className="btn btn-primary wide" disabled={pending}>
          {pending ? "Saving changes…" : "Save Farm Details"}
        </button>
      </form>
    </article>
  );
}
