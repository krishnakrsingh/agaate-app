"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";

const irrigationOptions = ["Drip", "Rain Pipe", "Sprinkler", "Flood", "Other"] as const;

export function PlotForm({ farmId }: { farmId: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [pending, setPending] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set(["Drip"]));

  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const capture = () => {
    if (!navigator.geolocation) {
      setError("Location is not supported on this device.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLat(String(p.coords.latitude));
        setLng(String(p.coords.longitude));
        setSuccess("Captured current device coordinates.");
      },
      () => setError("Location could not be captured. Please enter coordinates manually."),
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
      router.refresh();
      formEl?.reset();
      setSelected(new Set(["Drip"]));
    } catch {
      setPending(false);
      setError("Network error.");
    }
  }

  return (
    <article className="card" style={{ border: "2px solid var(--primary-200)", background: "#ffffff" }}>
      <div className="card-header">
        <div>
          <h3>Create Plot on this Farm</h3>
          <p className="muted" style={{ fontSize: "0.85rem" }}>
            Add a designated plot area, GPS location, and irrigation configuration.
          </p>
        </div>
      </div>

      <form className="form two-column" onSubmit={submit}>
        <div className="form-group">
          <label>Plot name / number</label>
          <input name="name" placeholder="e.g., Plot 1 - North Sector" required />
        </div>

        <div className="form-group">
          <label>Plot area (acres)</label>
          <input name="area" type="number" step="0.01" min="0.01" placeholder="e.g., 2.5" required />
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
            placeholder="e.g., 12.9716"
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
            placeholder="e.g., 77.5946"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            required
          />
        </div>

        <div className="form-group wide">
          <label>Soil type (optional)</label>
          <input name="soilType" placeholder="e.g., Red Sandy Loam, Black Cotton Soil" />
        </div>

        <fieldset className="wide">
          <legend>Irrigation Setup (select all that apply)</legend>
          <div style={{ display: "grid", gap: 10 }}>
            {irrigationOptions.map((type) => (
              <div
                key={type}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr",
                  gap: 12,
                  alignItems: "center",
                  padding: "6px 10px",
                  background: selected.has(type) ? "var(--primary-50)" : "white",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${selected.has(type) ? "var(--primary-200)" : "var(--border-subtle)"}`,
                }}
              >
                <label className="check" style={{ margin: 0 }}>
                  <input
                    type="checkbox"
                    checked={selected.has(type)}
                    onChange={(e) => toggle(type, e.target.checked)}
                  />
                  <span>{type}</span>
                </label>
                <input
                  name={`irrigation_details_${type}`}
                  placeholder={type === "Other" ? "Required: Specify irrigation details" : "Optional details (flow rate, spacing, etc.)"}
                  disabled={!selected.has(type)}
                  maxLength={300}
                  style={{ padding: "6px 10px", fontSize: "0.85rem" }}
                />
              </div>
            ))}
          </div>
        </fieldset>

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
          <Icons.Plus size={16} />
          <span>{pending ? "Adding plot…" : "Save Plot to Farm"}</span>
        </button>
      </form>
    </article>
  );
}
