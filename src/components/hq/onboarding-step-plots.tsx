"use client";
import { useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { Icons } from "@/components/icons";
import { newRowId, type FarmInput, type PlotInput } from "./onboarding-schema";
import { ringAcres } from "@/lib/geo";
import { ringWithinRing } from "@/lib/geo-core";

const GeoMap = dynamic(() => import("@/components/map/geo-map").then((m) => m.GeoMap), { ssr: false });

/* inp retired: global .input-field */

export function OnboardingStepPlots({ plots, farms, onChange, errors }: {
  plots: PlotInput[]; farms: FarmInput[]; onChange: (v: PlotInput[]) => void; errors: Record<string, string>;
}) {
  const [farmRowId, setFarmRowId] = useState(farms[0]?.rowId ?? "");
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [soil, setSoil] = useState("");
  const [fence, setFence] = useState<[number, number][] | null>(null);
  const [showFence, setShowFence] = useState(false);

  const farmId = farmRowId || farms[0]?.rowId || "";
  const activeFarm = farms.find((f) => f.rowId === farmId);
  const farmRing = useMemo(() => (activeFarm?.boundaryRing ?? null) as [number, number][] | null, [activeFarm?.boundaryRing]);
  const fenceAcres = fence && fence.length >= 4 ? (() => { try { return ringAcres(fence); } catch { return 0; } })() : 0;
  const fenceOutside = fence && fence.length >= 4 && farmRing && farmRing.length >= 4
    ? (() => { try { return !ringWithinRing(fence, farmRing); } catch { return true; } })()
    : false;
  const flat = Number(activeFarm?.latitude), flng = Number(activeFarm?.longitude);
  const farmCenter: [number, number] = Number.isFinite(flat) && Number.isFinite(flng) ? [flat, flng] : [20.59, 78.96];

  const add = () => {
    if (!farmId || !name.trim() || !area) return;
    if (fence && (fence.length < 4 || fenceOutside)) return;
    onChange([...plots, { rowId: newRowId(), farmRowId: farmId, name: name.trim(), area: area as unknown as number, soilType: soil.trim() || null, boundaryRing: fence }]);
    setName(""); setArea(""); setSoil(""); setFence(null); setShowFence(false);
  };
  const onKey = (e: React.KeyboardEvent) => e.key === "Enter" && add();
  const e = (i: number, f: string) => errors[`plots.${i}.${f}`];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

      {/* Quick-add row */}
      <div>
        <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 14 }}>Add plot</div>
        {farms.length === 0 ? (
          <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>Add at least one farm first.</p>
        ) : (
          <>
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 120px 160px auto", gap: "0 12px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 }}>Farm</label>
              <select className="input-field" value={farmId} onChange={(e) => setFarmRowId(e.target.value)}>
                {farms.map((f, i) => <option key={f.rowId ?? i} value={f.rowId}>{f.name.trim() || `Farm ${i + 1}`}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 }}>Plot name *</label>
              <input className="input-field" value={name} maxLength={100} placeholder="Block A" onChange={(e) => setName(e.target.value)} onKeyDown={onKey} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 }}>
                Area (ac){activeFarm && Number(activeFarm.cultivableArea) > 0 ? ` / ${Number(activeFarm.cultivableArea)}` : ""}
              </label>
              <input className="input-field" type="number" step="0.01" min="0" value={area} onChange={(e) => setArea(e.target.value)} onKeyDown={onKey} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 }}>Soil type</label>
              <input className="input-field" value={soil} maxLength={100} placeholder="Black cotton" onChange={(e) => setSoil(e.target.value)} onKeyDown={onKey} />
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={add} disabled={!farmId || !name.trim() || !area || fenceOutside} style={{ height: 34, alignSelf: "end" }}>
              <Icons.Plus size={13} /><span>Add</span>
            </button>
          </div>
          {farms.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {!showFence ? (
                <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 12, color: "var(--muted)" }} onClick={() => setShowFence(true)}>
                  + Draw fence (optional{farmRing ? ` — ${(() => { try { return ringAcres(farmRing).toFixed(1); } catch { return "?"; } })()} ac farm` : ", draw farm fence first for containment check"})
                </button>
              ) : (
                <div style={{ border: "1px solid var(--hairline)", borderRadius: "var(--radius-md)", overflow: "hidden", marginTop: 4 }}>
                  <GeoMap
                    center={farmCenter}
                    polygon={fence}
                    onChange={setFence}
                    reference={farmRing}
                    interactive
                    height={240}
                  />
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 10px", fontSize: 12, color: "var(--muted)" }}>
                    <span>
                      {fence && fence.length >= 4
                        ? `${fenceAcres.toFixed(2)} ac${fenceOutside ? " — outside farm fence, redraw inside" : " — verified area applies on activation"}`
                        : "Trace the plot inside the dashed farm fence."}
                    </span>
                    <span style={{ display: "flex", gap: 8 }}>
                      {fence && <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => setFence(null)}>Clear</button>}
                      <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11 }} onClick={() => { setShowFence(false); setFence(null); }}>Hide</button>
                    </span>
                  </div>
                </div>
              )}
              {fenceOutside && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 4 }}>Plot fence must lie completely inside its farm fence.</div>}
            </div>
          )}
          </>
        )}
      </div>

      {/* Plot list */}
      {plots.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase" as const, letterSpacing: "0.07em", color: "var(--muted)", marginBottom: 10 }}>
            Queued plots <span style={{ fontWeight: 400 }}>({plots.length})</span>
          </div>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--hairline)" }}>
                {["Plot", "Farm", "Area", "Fence", "Soil", ""].map((h) => (
                  <th key={h} style={{ padding: "5px 8px 8px", textAlign: "left", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {plots.map((p, i) => {
                const fi = farms.findIndex((f) => f.rowId === p.farmRowId);
                const fn = fi >= 0 ? (farms[fi].name.trim() || `Farm ${fi + 1}`) : "—";
                const rowErr = e(i, "name") || e(i, "area") || e(i, "farmRowId");
                return (
                  <tr key={p.rowId ?? i} style={{ borderBottom: "1px solid var(--hairline)" }}>
                    <td style={{ padding: "8px", fontWeight: 600 }}>
                      {p.name}
                      {rowErr && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 2 }}>{rowErr}</div>}
                    </td>
                    <td style={{ padding: "8px", color: "var(--muted)" }}>{fn}</td>
                    <td style={{ padding: "8px", fontFamily: "var(--font-mono)" }}>{Number(p.area)} ac</td>
                    <td style={{ padding: "8px", fontSize: 12, color: (p.boundaryRing?.length ?? 0) >= 4 ? "var(--green)" : "var(--muted-soft)" }}>
                      {(p.boundaryRing?.length ?? 0) >= 4 ? `Fenced · ${(() => { try { return ringAcres(p.boundaryRing as [number, number][]).toFixed(2); } catch { return "?"; } })()} ac` : "Pin only"}
                      {(e(i, "boundaryRing")) && <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 2 }}>{e(i, "boundaryRing")}</div>}
                    </td>
                    <td style={{ padding: "8px", color: "var(--muted-soft)" }}>{p.soilType || "—"}</td>
                    <td style={{ padding: "8px", textAlign: "right" }}>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(plots.filter((_, j) => j !== i))} aria-label={`Remove ${p.name}`} style={{ color: "var(--muted)" }}>
                        <Icons.Trash size={12} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {plots.length === 0 && farms.length > 0 && (
        <p style={{ fontSize: 13, color: "var(--muted)", margin: 0 }}>
          No plots yet — this step is optional. Demarcation can happen in the field.
        </p>
      )}
    </div>
  );
}
