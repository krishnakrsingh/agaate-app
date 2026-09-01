"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";

type Plot = {
  id: string;
  farmId: string;
  name: string;
  area: string;
  latitude: string;
  longitude: string;
  soilType: string | null;
  status: string;
  irrigation: { type: string; details: string | null }[];
};

const options = ["Drip", "Rain Pipe", "Sprinkler", "Flood", "Other"] as const;

export function PlotEditForm({ plot }: { plot: Plot }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [lat, setLat] = useState(plot.latitude);
  const [lng, setLng] = useState(plot.longitude);

  const initialSelected = new Set(plot.irrigation.map((i) => i.type));
  const [selected, setSelected] = useState<Set<string>>(initialSelected);

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
    <article className="card" style={{ padding: 24 }}>
      <div className="card-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            PLOT CONFIGURATION
          </div>
          <h2 style={{ margin: "2px 0 0" }}>Edit Plot Details</h2>
        </div>
        <span className="status active">{plot.status}</span>
      </div>

      <form data-plot-edit onSubmit={save} style={{ display: "grid", gap: 16 }}>
        <div className="two-column">
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
                className="btn btn-ghost btn-sm"
                onClick={capture}
                style={{ fontSize: "0.75rem", padding: "0 4px", color: "var(--primary)" }}
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
          </div>
        </div>

        {/* Irrigation Setup */}
        <div style={{ background: "var(--card-muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 16, display: "grid", gap: 10 }}>
          <div className="mono-label" style={{ fontWeight: 700 }}>Irrigation Systems (Select all that apply)</div>
          <div style={{ display: "grid", gap: 8 }}>
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
                    background: "var(--card)",
                    borderRadius: "var(--radius-sm)",
                    border: `1px solid ${checked ? "var(--primary)" : "var(--border)"}`,
                  }}
                >
                  <label className="check" style={{ margin: 0, fontSize: "0.88rem" }}>
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
                    style={{ padding: "5px 10px", fontSize: "0.85rem" }}
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

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
          <button
            type="button"
            className="btn btn-danger btn-sm"
            onClick={archive}
            disabled={pending}
          >
            Archive Plot
          </button>

          <button type="submit" className="btn btn-primary" disabled={pending}>
            <span>{pending ? "Saving…" : "Save Plot Changes"}</span>
          </button>
        </div>
      </form>
    </article>
  );
}
