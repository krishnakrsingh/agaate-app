"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Icons } from "@/components/icons";
import { MAX_FARMS, type FarmInput } from "./onboarding-schema";
import { emptyFarm } from "./onboarding-draft";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), { ssr: false });

const inp: React.CSSProperties = { width: "100%", height: "34px", fontSize: 13 };

function F({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 }}>{label}</label>
      {children}
      {error && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 3 }}>{error}</div>}
    </div>
  );
}

export function OnboardingStepFarms({ value, onChange, errors }: {
  value: FarmInput[]; onChange: (v: FarmInput[]) => void; errors: Record<string, string>;
}) {
  const [sel, setSel] = useState(0);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsErr, setGpsErr] = useState("");

  const idx = Math.min(sel, Math.max(0, value.length - 1));
  const cur = value[idx];

  const dupNames = useMemo(() => {
    const c = new Map<string, number>();
    for (const f of value) { const k = f.name.trim().toLowerCase(); if (k) c.set(k, (c.get(k) ?? 0) + 1); }
    return c;
  }, [value]);

  const patch = (i: number, p: Partial<FarmInput>) => onChange(value.map((f, j) => (j === i ? { ...f, ...p } : f)));
  const addRow = () => { if (value.length >= MAX_FARMS) return; onChange([...value, emptyFarm()]); setSel(value.length); };
  const removeRow = (i: number) => { onChange(value.filter((_, j) => j !== i)); setSel(0); };

  const gps = () => {
    setGpsErr("");
    if (!navigator.geolocation) { setGpsErr("Location not supported."); return; }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (p) => { patch(idx, { latitude: p.coords.latitude as unknown as number, longitude: p.coords.longitude as unknown as number }); setGpsBusy(false); },
      (e) => { setGpsBusy(false); setGpsErr(e.code === 1 ? "Permission denied." : "Location unavailable."); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const e = (i: number, f: string) => errors[`farms.${i}.${f}`];
  const lat = Number(cur?.latitude), lng = Number(cur?.longitude);
  const hasCoords = Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Farm tab strip */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)" }}>
            Farms <span style={{ fontWeight: 400 }}>{value.length}/{MAX_FARMS}</span>
          </span>
          <button type="button" className="btn btn-secondary btn-sm" onClick={addRow} disabled={value.length >= MAX_FARMS}>
            <Icons.Plus size={13} /><span>Add farm</span>
          </button>
        </div>

        {value.length === 0 ? (
          <div style={{ padding: "24px 0", textAlign: "center", borderTop: "1px solid var(--hairline)", borderBottom: "1px solid var(--hairline)", color: "var(--muted)", fontSize: 13 }}>
            No farms yet — add the first one above.
          </div>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
            {value.map((f, i) => {
              const hasErr = Object.keys(errors).some((k) => k.startsWith(`farms.${i}.`));
              const dup = f.name.trim() && (dupNames.get(f.name.trim().toLowerCase()) ?? 0) > 1;
              const active = i === idx;
              return (
                <button
                  key={f.rowId ?? i}
                  type="button"
                  onClick={() => setSel(i)}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: 6, height: 32, padding: "0 12px",
                    border: `1px solid ${active ? "var(--ink)" : hasErr ? "var(--semantic-error)" : "var(--hairline)"}`,
                    borderRadius: "var(--radius-pill)", background: active ? "var(--ink)" : "transparent",
                    color: active ? "#fff" : hasErr ? "var(--semantic-error)" : "var(--ink)",
                    fontSize: 12, fontWeight: 600, cursor: "pointer", transition: "all 0.1s",
                  }}
                >
                  <span>{f.name.trim() || `Farm ${i + 1}`}</span>
                  {(dup || hasErr) && <span style={{ opacity: 0.7 }}>⚠</span>}
                  <span
                    role="button"
                    aria-label={`Remove ${f.name || `Farm ${i + 1}`}`}
                    onClick={(ev) => { ev.stopPropagation(); removeRow(i); }}
                    style={{ cursor: "pointer", opacity: 0.6, fontSize: 11, marginLeft: 2 }}
                  >×</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Farm detail — split: fields left, map right */}
      {cur && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 280px", gap: 24, alignItems: "start" }}>

          {/* Left: fields in 2 sections */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 14 }}>Basic info</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 20px" }}>
                <F label="Farm name *" error={e(idx, "name")}>
                  <input style={inp} value={cur.name} maxLength={120} onChange={(ev) => patch(idx, { name: ev.target.value })} />
                </F>
                <F label="Location *" error={e(idx, "location")}>
                  <input style={inp} value={cur.location} maxLength={180} onChange={(ev) => patch(idx, { location: ev.target.value })} />
                </F>
                <F label="Water source *" error={e(idx, "waterSource")}>
                  <input style={inp} value={cur.waterSource} maxLength={300} placeholder="Borewell + farm pond" onChange={(ev) => patch(idx, { waterSource: ev.target.value })} />
                </F>
                <F label="Total area (ac) *" error={e(idx, "totalArea")}>
                  <input style={inp} type="number" step="0.01" min="0" value={cur.totalArea as unknown as string} onChange={(ev) => patch(idx, { totalArea: ev.target.value as unknown as number })} />
                </F>
                <F label="Cultivable area (ac) *" error={e(idx, "cultivableArea")}>
                  <input style={inp} type="number" step="0.01" min="0" value={cur.cultivableArea as unknown as string} onChange={(ev) => patch(idx, { cultivableArea: ev.target.value as unknown as number })} />
                </F>
                <F label="Soil type" error={e(idx, "soilType")}>
                  <input style={inp} value={cur.soilType ?? ""} maxLength={100} placeholder="Red sandy loam" onChange={(ev) => patch(idx, { soilType: ev.target.value })} />
                </F>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 14 }}>Land records</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px 20px" }}>
                <F label="Survey no." error={e(idx, "surveyNumber")}><input style={inp} value={cur.surveyNumber ?? ""} maxLength={100} onChange={(ev) => patch(idx, { surveyNumber: ev.target.value })} /></F>
                <F label="Village" error={e(idx, "village")}><input style={inp} value={cur.village ?? ""} maxLength={100} onChange={(ev) => patch(idx, { village: ev.target.value })} /></F>
                <F label="Taluk" error={e(idx, "taluk")}><input style={inp} value={cur.taluk ?? ""} maxLength={100} onChange={(ev) => patch(idx, { taluk: ev.target.value })} /></F>
                <F label="District" error={e(idx, "district")}><input style={inp} value={cur.district ?? ""} maxLength={100} onChange={(ev) => patch(idx, { district: ev.target.value })} /></F>
                <F label="State" error={e(idx, "state")}><input style={inp} value={cur.state ?? ""} maxLength={100} onChange={(ev) => patch(idx, { state: ev.target.value })} /></F>
              </div>
            </div>

            <div>
              <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 14 }}>GPS coordinates</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "12px 12px", alignItems: "end" }}>
                <F label="Latitude *" error={e(idx, "latitude")}>
                  <input style={inp} type="number" step="any" value={cur.latitude as unknown as string} onChange={(ev) => patch(idx, { latitude: ev.target.value as unknown as number })} />
                </F>
                <F label="Longitude *" error={e(idx, "longitude")}>
                  <input style={inp} type="number" step="any" value={cur.longitude as unknown as string} onChange={(ev) => patch(idx, { longitude: ev.target.value as unknown as number })} />
                </F>
                <button type="button" className="btn btn-secondary btn-sm" onClick={gps} disabled={gpsBusy} style={{ height: 34, alignSelf: "end", marginBottom: e(idx,"latitude") || e(idx,"longitude") ? 18 : 0 }}>
                  <Icons.MapPin size={13} /><span>{gpsBusy ? "…" : "GPS"}</span>
                </button>
              </div>
              {gpsErr && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 4 }}>{gpsErr}</div>}
            </div>
          </div>

          {/* Right: map */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)" }}>Map pin</div>
            {hasCoords ? (
              <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--hairline)" }}>
                <GeoMap center={[lat, lng]} polygon={null} onChange={() => undefined} interactive={false} height={300}
                  pins={[{ key: cur.rowId ?? String(idx), lat, lng, color: "#16a34a", label: cur.name.trim() || `Farm ${idx + 1}` }]} />
              </div>
            ) : (
              <div style={{ height: 140, border: "1.5px dashed var(--hairline-strong)", borderRadius: "var(--radius-md)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, color: "var(--muted)", textAlign: "center", padding: 16 }}>
                Enter lat/lng to preview map pin
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
