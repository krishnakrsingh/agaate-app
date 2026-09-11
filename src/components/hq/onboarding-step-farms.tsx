"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Icons } from "@/components/icons";
import { MAX_FARMS, type FarmInput } from "./onboarding-schema";
import { emptyFarm } from "./onboarding-draft";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), { ssr: false });

const inputStyle = { width: "100%" } as const;

function RowField({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div className="form-group" style={{ margin: 0 }}>
      <label>{label}</label>
      {children}
      {error && (
        <span role="alert" style={{ color: "var(--semantic-error)", fontSize: 12 }}>
          {error}
        </span>
      )}
    </div>
  );
}

export function OnboardingStepFarms({
  value,
  onChange,
  errors,
}: {
  value: FarmInput[];
  onChange: (v: FarmInput[]) => void;
  errors: Record<string, string>;
}) {
  const [selected, setSelected] = useState(0);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState("");

  const clamped = Math.min(selected, Math.max(0, value.length - 1));
  const current = value[clamped];

  const duplicateNames = useMemo(() => {
    const counts = new Map<string, number>();
    for (const f of value) {
      const k = f.name.trim().toLowerCase();
      if (k) counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    return counts;
  }, [value]);

  const patch = (index: number, p: Partial<FarmInput>) => {
    onChange(value.map((f, i) => (i === index ? { ...f, ...p } : f)));
  };

  const addRow = () => {
    if (value.length >= MAX_FARMS) return;
    onChange([...value, emptyFarm()]);
    setSelected(value.length);
  };

  const removeRow = (index: number) => {
    onChange(value.filter((_, i) => i !== index));
    setSelected(0);
  };

  const captureGps = () => {
    setGpsError("");
    if (!navigator.geolocation) {
      setGpsError("Location is not supported on this device. Enter coordinates manually.");
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        patch(clamped, { latitude: pos.coords.latitude as unknown as number, longitude: pos.coords.longitude as unknown as number });
        setGpsBusy(false);
      },
      (err) => {
        setGpsBusy(false);
        setGpsError(
          err.code === 1 ? "Location permission was denied. Enter coordinates manually." : "Location is unavailable. Enter coordinates manually."
        );
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const err = (i: number, field: string) => errors[`farms.${i}.${field}`];
  const lat = Number(current?.latitude);
  const lng = Number(current?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="section-block">
        <div className="form-section-title">Step 2. Farms bulk add ({value.length}/{MAX_FARMS})</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Add one row per farm. Select a row to edit its details and pin its location on the map.
        </p>
        {value.length === 0 && <p className="muted" style={{ fontSize: 13 }}>No farms yet. Use the button below to add the first farm row. Zero farms is allowed but flagged at review.</p>}
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {value.map((f, i) => {
            const rowErrors = Object.keys(errors).filter((k) => k.startsWith(`farms.${i}.`));
            const dup = f.name.trim() && (duplicateNames.get(f.name.trim().toLowerCase()) ?? 0) > 1;
            return (
              <div
                key={f.rowId ?? i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  border: `1px solid ${i === clamped ? "var(--ink)" : "var(--hairline)"}`,
                  padding: "8px 10px",
                  background: "var(--surface-card)",
                }}
              >
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => setSelected(i)} aria-pressed={i === clamped}>
                  Farm {i + 1}
                </button>
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
                  {f.name.trim() || <span className="muted">Unnamed farm</span>}
                  {f.location.trim() ? <span className="muted"> — {f.location.trim()}</span> : null}
                </span>
                {dup && <span style={{ fontSize: 12, color: "var(--amber)" }}>Duplicate name</span>}
                {rowErrors.length > 0 && (
                  <span role="alert" style={{ fontSize: 12, color: "var(--semantic-error)" }}>
                    {rowErrors.length} issue{rowErrors.length > 1 ? "s" : ""}
                  </span>
                )}
                <button type="button" className="btn btn-secondary btn-sm" onClick={() => removeRow(i)} aria-label={`Remove farm ${i + 1}`}>
                  <Icons.Trash size={14} />
                </button>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button type="button" className="btn btn-secondary" onClick={addRow} disabled={value.length >= MAX_FARMS}>
            <Icons.Plus size={15} />
            <span>Add farm row</span>
          </button>
          {value.length >= MAX_FARMS && <span className="muted" style={{ fontSize: 12 }}>Cap of {MAX_FARMS} farms reached for one onboarding.</span>}
        </div>
      </div>

      {current && (
        <div className="section-block" key={current.rowId ?? clamped}>
          <div className="form-section-title">Farm {clamped + 1} details</div>
          <div className="two-column">
            <RowField label="Farm name" error={err(clamped, "name")}>
              <input style={inputStyle} value={current.name} maxLength={120} onChange={(e) => patch(clamped, { name: e.target.value })} />
            </RowField>
            <RowField label="Location (village / town)" error={err(clamped, "location")}>
              <input style={inputStyle} value={current.location} maxLength={180} onChange={(e) => patch(clamped, { location: e.target.value })} />
            </RowField>
            <RowField label="Latitude" error={err(clamped, "latitude")}>
              <input style={inputStyle} type="number" step="any" value={current.latitude as unknown as string} onChange={(e) => patch(clamped, { latitude: e.target.value as unknown as number })} />
            </RowField>
            <RowField label="Longitude" error={err(clamped, "longitude")}>
              <input style={inputStyle} type="number" step="any" value={current.longitude as unknown as string} onChange={(e) => patch(clamped, { longitude: e.target.value as unknown as number })} />
            </RowField>
            <RowField label="Total area (acres)" error={err(clamped, "totalArea")}>
              <input style={inputStyle} type="number" step="0.01" min="0" value={current.totalArea as unknown as string} onChange={(e) => patch(clamped, { totalArea: e.target.value as unknown as number })} />
            </RowField>
            <RowField label="Cultivable area (acres)" error={err(clamped, "cultivableArea")}>
              <input style={inputStyle} type="number" step="0.01" min="0" value={current.cultivableArea as unknown as string} onChange={(e) => patch(clamped, { cultivableArea: e.target.value as unknown as number })} />
            </RowField>
            <RowField label="Water source" error={err(clamped, "waterSource")}>
              <input style={inputStyle} value={current.waterSource} maxLength={300} placeholder="e.g., Borewell + farm pond" onChange={(e) => patch(clamped, { waterSource: e.target.value })} />
            </RowField>
            <RowField label="Survey number" error={err(clamped, "surveyNumber")}>
              <input style={inputStyle} value={current.surveyNumber ?? ""} maxLength={100} onChange={(e) => patch(clamped, { surveyNumber: e.target.value })} />
            </RowField>
            <RowField label="Village" error={err(clamped, "village")}>
              <input style={inputStyle} value={current.village ?? ""} maxLength={100} onChange={(e) => patch(clamped, { village: e.target.value })} />
            </RowField>
            <RowField label="Taluk" error={err(clamped, "taluk")}>
              <input style={inputStyle} value={current.taluk ?? ""} maxLength={100} onChange={(e) => patch(clamped, { taluk: e.target.value })} />
            </RowField>
            <RowField label="District" error={err(clamped, "district")}>
              <input style={inputStyle} value={current.district ?? ""} maxLength={100} onChange={(e) => patch(clamped, { district: e.target.value })} />
            </RowField>
            <RowField label="State" error={err(clamped, "state")}>
              <input style={inputStyle} value={current.state ?? ""} maxLength={100} onChange={(e) => patch(clamped, { state: e.target.value })} />
            </RowField>
            <RowField label="Soil type (optional)" error={err(clamped, "soilType")}>
              <input style={inputStyle} value={current.soilType ?? ""} maxLength={100} placeholder="e.g., Red sandy loam" onChange={(e) => patch(clamped, { soilType: e.target.value })} />
            </RowField>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12, alignItems: "center", flexWrap: "wrap" }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={captureGps} disabled={gpsBusy}>
              <Icons.MapPin size={14} />
              <span>{gpsBusy ? "Capturing…" : "Use device GPS"}</span>
            </button>
            {gpsError && (
              <span role="alert" style={{ fontSize: 12, color: "var(--semantic-error)" }}>
                {gpsError}
              </span>
            )}
          </div>
          <div style={{ marginTop: 12 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, marginBottom: 6 }}>Map pin</label>
            {hasCoords ? (
              <GeoMap
                center={[lat, lng]}
                polygon={null}
                onChange={() => undefined}
                interactive={false}
                height={260}
                pins={[{ key: current.rowId ?? String(clamped), lat, lng, color: "#16a34a", label: current.name.trim() || `Farm ${clamped + 1}` }]}
              />
            ) : (
              <div className="muted" style={{ fontSize: 13, border: "1px dashed var(--hairline-strong)", padding: 16, textAlign: "center" }}>
                Enter a valid latitude and longitude to preview the pin.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
