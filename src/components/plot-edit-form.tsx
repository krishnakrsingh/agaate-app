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
  const detailsMap = Object.fromEntries(
    plot.irrigation.map((i) => [i.type, i.details ?? ""])
  );

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
          <div className="eyebrow">PLOT CONFIGURATION</div>
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
              min="-90"
              max="90"
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
              min="-180"
              max="180"
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
            <label>Status</label>
            <select name="status" defaultValue={plot.status}>
              <option value="SETUP">Setup</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>
        </div>

        <div style={{ background: "var(--soft-stone)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-xs)", padding: 16, display: "grid", gap: 10 }}>
          <div className="mono-label">Irrigation Setup</div>
          <div style={{ display: "grid", gap: 8 }}>
            {options.map((type) => (
              <div
                key={type}
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 130px), 1fr))",
                  gap: 12,
                  alignItems: "center",
                  padding: "8px 12px",
                  background: "var(--canvas)",
                  borderRadius: "var(--radius-xs)",
                  border: `1px solid ${selected.has(type) ? "var(--ink)" : "var(--hairline)"}`,
                }}
              >
                <label className="check" style={{ margin: 0, fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(type)}
                    onChange={(e) => toggle(type, e.target.checked)}
                  />
                  <span>{type}</span>
                </label>
                <input
                  name={`irrigation_details_${type}`}
                  defaultValue={detailsMap[type] ?? ""}
                  placeholder={type === "Other" ? "Required for Other" : "Details (optional)"}
                  disabled={!selected.has(type)}
                  maxLength={300}
                  style={{ minHeight: 34, padding: "4px 10px", fontSize: 13 }}
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

        <div style={{ display: "flex", gap: 12, justifyContent: "space-between", flexWrap: "wrap", marginTop: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={pending}>
            <Icons.Check size={16} />
            <span>{pending ? "Saving…" : "Save Plot Changes"}</span>
          </button>

          <button
            type="button"
            className="btn btn-danger"
            onClick={archive}
            disabled={pending || plot.status === "ARCHIVED"}
          >
            <Icons.Trash size={16} />
            <span>Archive Plot</span>
          </button>
        </div>
      </form>
    </article>
  );
}
