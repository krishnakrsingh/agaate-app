"use client";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { newRowId, type FarmInput, type PlotInput } from "./onboarding-schema";

const inp: React.CSSProperties = { width: "100%", height: "34px", fontSize: 13 };

export function OnboardingStepPlots({ plots, farms, onChange, errors }: {
  plots: PlotInput[]; farms: FarmInput[]; onChange: (v: PlotInput[]) => void; errors: Record<string, string>;
}) {
  const [farmRowId, setFarmRowId] = useState(farms[0]?.rowId ?? "");
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [soil, setSoil] = useState("");

  const farmId = farmRowId || farms[0]?.rowId || "";
  const activeFarm = farms.find((f) => f.rowId === farmId);

  const add = () => {
    if (!farmId || !name.trim() || !area) return;
    onChange([...plots, { rowId: newRowId(), farmRowId: farmId, name: name.trim(), area: area as unknown as number, soilType: soil.trim() || null }]);
    setName(""); setArea(""); setSoil("");
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
          <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 120px 160px auto", gap: "0 12px", alignItems: "end" }}>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 }}>Farm</label>
              <select style={inp} value={farmId} onChange={(e) => setFarmRowId(e.target.value)}>
                {farms.map((f, i) => <option key={f.rowId ?? i} value={f.rowId}>{f.name.trim() || `Farm ${i + 1}`}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 }}>Plot name *</label>
              <input style={inp} value={name} maxLength={100} placeholder="Block A" onChange={(e) => setName(e.target.value)} onKeyDown={onKey} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 }}>
                Area (ac){activeFarm && Number(activeFarm.cultivableArea) > 0 ? ` / ${Number(activeFarm.cultivableArea)}` : ""}
              </label>
              <input style={inp} type="number" step="0.01" min="0" value={area} onChange={(e) => setArea(e.target.value)} onKeyDown={onKey} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" as const, letterSpacing: "0.05em", marginBottom: 5 }}>Soil type</label>
              <input style={inp} value={soil} maxLength={100} placeholder="Black cotton" onChange={(e) => setSoil(e.target.value)} onKeyDown={onKey} />
            </div>
            <button type="button" className="btn btn-secondary btn-sm" onClick={add} disabled={!farmId || !name.trim() || !area} style={{ height: 34, alignSelf: "end" }}>
              <Icons.Plus size={13} /><span>Add</span>
            </button>
          </div>
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
                {["Plot", "Farm", "Area", "Soil", ""].map((h) => (
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
