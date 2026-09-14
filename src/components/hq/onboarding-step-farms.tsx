"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Icons } from "@/components/icons";
import { MAX_FARMS, type FarmInput } from "./onboarding-schema";
import { emptyFarm } from "./onboarding-draft";
import { ringAcres } from "@/lib/geo";
import { representativePoint } from "@/lib/geo-core";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), { ssr: false });

/* inp retired: global .input-field */

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
  const patchRing = (i: number, ring: [number, number][] | null) => {
    const f = value[i];
    if (!f) return;
    // Autofill GPS from the drawn fence centroid when coords are empty.
    let { latitude, longitude } = f;
    if (ring && ring.length >= 4 && !Number.isFinite(Number(latitude))) {
      try {
        const c = representativePoint(ring as [number, number][]);
        if (c) { longitude = c[0] as unknown as number; latitude = c[1] as unknown as number; }
      } catch { /* keep manual coords */ }
    }
    onChange(value.map((x, j) => (j === i ? { ...x, boundaryRing: ring, latitude, longitude } : x)));
  };
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
  const ring = (cur?.boundaryRing ?? null) as [number, number][] | null;
  const ringAcresLive = ring && ring.length >= 4 ? (() => { try { return ringAcres(ring); } catch { return 0; } })() : 0;
  const mapCenter: [number, number] = hasCoords ? [lat, lng] : [20.59, 78.96];

  return (
    <div className="ob-section">

      {/* Farm tab strip */}
      <div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
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
        <div className="ob-farm-grid">

          {/* Left: fields in cards */}
          <div className="ob-section">
            <div style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: "18px 20px",
              boxShadow: "var(--shadow-card)"
            }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--primary)" }} />
                  <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>
                    Basic Estate Information
                  </span>
                </div>
                <span style={{ fontSize: 11, color: "var(--muted)" }}>Step 2 of 5</span>
              </div>
              <div className="ob-grid-3">
                <F label="Farm name *" error={e(idx, "name")}>
                  <input className="input-field" value={cur.name} maxLength={120} placeholder="e.g., North Valley Estate" onChange={(ev) => patch(idx, { name: ev.target.value })} style={{ borderRadius: 8 }} />
                </F>
                <F label="Location *" error={e(idx, "location")}>
                  <input className="input-field" value={cur.location} maxLength={180} placeholder="e.g., Near Hoskote Gate" onChange={(ev) => patch(idx, { location: ev.target.value })} style={{ borderRadius: 8 }} />
                </F>
                <F label="Water source *" error={e(idx, "waterSource")}>
                  <input className="input-field" value={cur.waterSource} maxLength={300} placeholder="e.g., Borewell + farm pond" onChange={(ev) => patch(idx, { waterSource: ev.target.value })} style={{ borderRadius: 8 }} />
                </F>
                <F label="Total area (ac) *" error={e(idx, "totalArea")}>
                  <input className="input-field" type="number" step="0.01" min="0" value={cur.totalArea as unknown as string} placeholder="12.5" onChange={(ev) => patch(idx, { totalArea: ev.target.value as unknown as number })} style={{ borderRadius: 8 }} />
                </F>
                <F label="Cultivable area (ac) *" error={e(idx, "cultivableArea")}>
                  <input className="input-field" type="number" step="0.01" min="0" value={cur.cultivableArea as unknown as string} placeholder="10.0" onChange={(ev) => patch(idx, { cultivableArea: ev.target.value as unknown as number })} style={{ borderRadius: 8 }} />
                </F>
                <F label="Soil type" error={e(idx, "soilType")}>
                  <input className="input-field" value={cur.soilType ?? ""} maxLength={100} placeholder="e.g., Red sandy loam" onChange={(ev) => patch(idx, { soilType: ev.target.value })} style={{ borderRadius: 8 }} />
                </F>
              </div>
            </div>

            {/* Land records accordion card */}
            <details open={["surveyNumber","village","taluk","district","state"].some((f) => e(idx, f))} style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: "14px 18px",
              boxShadow: "var(--shadow-card)"
            }}>
              <summary style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "space-between", userSelect: "none" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 6, background: "var(--surface-strong)", border: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Icons.FileText size={13} style={{ color: "var(--ink)" }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: "var(--ink)", letterSpacing: "0.05em" }}>Land Records & Cadastral (Optional)</div>
                    <div style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", textTransform: "none", letterSpacing: "normal", marginTop: 1 }}>Survey, Village, Taluk & District Details</div>
                  </div>
                </div>
                <div style={{ width: 24, height: 24, borderRadius: "50%", background: "var(--surface-strong)", border: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Icons.ChevronDown size={13} className="ob-chevron" style={{ color: "var(--ink)", transition: "transform 0.2s ease" }} />
                </div>
              </summary>
              <div className="ob-grid-3" style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid var(--hairline)" }}>
                <F label="Survey no." error={e(idx, "surveyNumber")}><input className="input-field" value={cur.surveyNumber ?? ""} maxLength={100} placeholder="e.g., 42/1A" onChange={(ev) => patch(idx, { surveyNumber: ev.target.value })} style={{ borderRadius: 8 }} /></F>
                <F label="Village" error={e(idx, "village")}><input className="input-field" value={cur.village ?? ""} maxLength={100} placeholder="e.g., Solur" onChange={(ev) => patch(idx, { village: ev.target.value })} style={{ borderRadius: 8 }} /></F>
                <F label="Taluk" error={e(idx, "taluk")}><input className="input-field" value={cur.taluk ?? ""} maxLength={100} placeholder="e.g., Magadi" onChange={(ev) => patch(idx, { taluk: ev.target.value })} style={{ borderRadius: 8 }} /></F>
                <F label="District" error={e(idx, "district")}><input className="input-field" value={cur.district ?? ""} maxLength={100} placeholder="e.g., Ramanagara" onChange={(ev) => patch(idx, { district: ev.target.value })} style={{ borderRadius: 8 }} /></F>
                <F label="State" error={e(idx, "state")}><input className="input-field" value={cur.state ?? ""} maxLength={100} placeholder="e.g., Karnataka" onChange={(ev) => patch(idx, { state: ev.target.value })} style={{ borderRadius: 8 }} /></F>
              </div>
            </details>

            {/* GPS coordinates card */}
            <div style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-md)",
              padding: "16px 20px",
              boxShadow: "var(--shadow-card)"
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <Icons.MapPin size={14} style={{ color: "var(--primary)" }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "var(--ink)" }}>
                  Geographic Coordinates
                </span>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: "10px 12px", alignItems: "end" }}>
                <F label="Latitude *" error={e(idx, "latitude")}>
                  <input className="input-field" type="number" step="any" value={cur.latitude as unknown as string} placeholder="13.1234" onChange={(ev) => patch(idx, { latitude: ev.target.value as unknown as number })} style={{ borderRadius: 8 }} />
                </F>
                <F label="Longitude *" error={e(idx, "longitude")}>
                  <input className="input-field" type="number" step="any" value={cur.longitude as unknown as string} placeholder="77.5678" onChange={(ev) => patch(idx, { longitude: ev.target.value as unknown as number })} style={{ borderRadius: 8 }} />
                </F>
                <button type="button" className="btn btn-secondary btn-sm" onClick={gps} disabled={gpsBusy} style={{ height: 38, padding: "0 14px", alignSelf: "end", gap: 6 }}>
                  <Icons.MapPin size={13} /><span>{gpsBusy ? "Locating…" : "Current GPS"}</span>
                </button>
              </div>
              {gpsErr && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 6 }}>{gpsErr}</div>}
            </div>
          </div>

          {/* Right: demarcation map card */}
          <div style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            padding: "16px 18px",
            boxShadow: "var(--shadow-card)",
            display: "flex",
            flexDirection: "column",
            gap: 10
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981" }} />
                <span style={{ fontSize: 11.5, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: "var(--ink)" }}>
                  Demarcation Map{ringAcresLive > 0 ? ` · ${ringAcresLive.toFixed(2)} ac` : ""}
                </span>
              </div>
              {ring && (
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, color: "var(--muted)", padding: "2px 8px" }} onClick={() => patchRing(idx, null)}>
                  Clear fence
                </button>
              )}
            </div>
            <div style={{ borderRadius: "var(--radius-md)", overflow: "hidden", border: "1px solid var(--hairline)" }}>
              <GeoMap center={mapCenter} polygon={ring} onChange={(r) => patchRing(idx, r)} interactive height={240}
                pins={!ring && hasCoords ? [{ key: cur.rowId ?? String(idx), lat, lng, color: "#16a34a", label: cur.name.trim() || `Farm ${idx + 1}` }] : null} />
            </div>
            <div style={{ fontSize: 11.5, color: "var(--muted)", lineHeight: 1.4 }}>
              {ring ? "✓ Boundary fence drawn — verified acreage applies on activation." : hasCoords ? "Draw the estate fence, or keep the GPS pin for now." : "Enter lat/lng, use GPS button, or draw boundary directly."}
            </div>
            {e(idx, "boundaryRing") && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)" }}>{e(idx, "boundaryRing")}</div>}
          </div>
        </div>
      )}
    </div>
  );
}
