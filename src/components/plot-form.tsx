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
    <article className="card" style={{ padding: 24 }}>
      <div className="card-header">
        <div>
          <div className="eyebrow">PLOT REGISTRATION</div>
          <h3 style={{ margin: "2px 0 0" }}>Create Plot on this Farm</h3>
        </div>
      </div>

      <form onSubmit={submit} style={{ display: "grid", gap: 16 }}>
        <div className="two-column">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Plot Name / Identifier</label>
            <input name="name" placeholder="e.g., Plot 1 - North Sector" required />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Plot Area (Acres)</label>
            <input name="area" type="number" step="0.01" min="0.01" placeholder="e.g., 2.5" required />
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
        </div>

        {/* Irrigation Setup */}
        <div style={{ background: "var(--soft-stone)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-xs)", padding: 16, display: "grid", gap: 10 }}>
          <div className="mono-label">Irrigation Setup (Select all that apply)</div>
          <div style={{ display: "grid", gap: 8 }}>
            {irrigationOptions.map((type) => (
              <div
                key={type}
                style={{
                  display: "grid",
                  gridTemplateColumns: "130px 1fr",
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
                  placeholder={type === "Other" ? "Required: Specify irrigation details" : "Optional details (flow rate, spacing, etc.)"}
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

        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button type="submit" className="btn btn-primary" disabled={pending} style={{ padding: "10px 24px" }}>
            <Icons.Plus size={16} />
            <span>{pending ? "Adding plot…" : "Save Plot to Farm"}</span>
          </button>
        </div>
      </form>
    </article>
  );
}
