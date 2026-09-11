"use client";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { newRowId, type FarmInput, type PlotInput } from "./onboarding-schema";

const inputStyle = { width: "100%" } as const;

export function OnboardingStepPlots({
  plots,
  farms,
  onChange,
  errors,
}: {
  plots: PlotInput[];
  farms: FarmInput[];
  onChange: (v: PlotInput[]) => void;
  errors: Record<string, string>;
}) {
  const [farmRowId, setFarmRowId] = useState(farms[0]?.rowId ?? "");
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [soilType, setSoilType] = useState("");

  const activeFarmId = farmRowId || farms[0]?.rowId || "";
  const activeFarm = farms.find((f) => f.rowId === activeFarmId);

  const quickAdd = () => {
    if (!activeFarmId || !name.trim() || !area) return;
    onChange([...plots, { rowId: newRowId(), farmRowId: activeFarmId, name: name.trim(), area: area as unknown as number, soilType: soilType.trim() || null }]);
    setName("");
    setArea("");
  };

  const err = (i: number, field: string) => errors[`plots.${i}.${field}`];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div className="section-block">
        <div className="form-section-title">Step 3. Plots per farm (optional quick-add)</div>
        <p className="muted" style={{ fontSize: 13, marginTop: 0 }}>
          Skip this step if plot demarcation happens later in the field. Plot names must be unique within a farm.
        </p>
        {farms.length === 0 ? (
          <p className="muted" style={{ fontSize: 13 }}>Add at least one farm in Step 2 before adding plots.</p>
        ) : (
          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Farm</label>
              <select style={inputStyle} value={activeFarmId} onChange={(e) => setFarmRowId(e.target.value)}>
                {farms.map((f, i) => (
                  <option key={f.rowId ?? i} value={f.rowId}>
                    Farm {i + 1}: {f.name.trim() || "Unnamed farm"}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Plot name</label>
              <input style={inputStyle} value={name} maxLength={100} placeholder="e.g., Block A" onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Area (acres){activeFarm && Number(activeFarm.cultivableArea) > 0 ? ` — farm limit ${Number(activeFarm.cultivableArea)}` : ""}</label>
              <input style={inputStyle} type="number" step="0.01" min="0" value={area} onChange={(e) => setArea(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Soil type (optional)</label>
              <input style={inputStyle} value={soilType} maxLength={100} placeholder="e.g., Black cotton" onChange={(e) => setSoilType(e.target.value)} />
            </div>
          </div>
        )}
        {farms.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-secondary" onClick={quickAdd} disabled={!activeFarmId || !name.trim() || !area}>
              <Icons.Plus size={15} />
              <span>Add plot{activeFarm ? ` to ${activeFarm.name.trim() || "farm"}` : ""}</span>
            </button>
          </div>
        )}
      </div>

      {plots.length > 0 && (
        <div className="section-block">
          <div className="form-section-title">Queued plots ({plots.length})</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {plots.map((p, i) => {
              const farmIndex = farms.findIndex((f) => f.rowId === p.farmRowId);
              const rowErr = err(i, "name") || err(i, "area") || err(i, "farmRowId");
              return (
                <div key={p.rowId ?? i} style={{ display: "flex", alignItems: "center", gap: 8, border: "1px solid var(--hairline)", padding: "8px 10px", background: "var(--surface-card)", flexWrap: "wrap" }}>
                  <span style={{ fontSize: 13, flex: 1, minWidth: 140 }}>
                    <strong>{p.name}</strong>
                    <span className="muted"> — {Number(p.area)} ac — {farmIndex >= 0 ? `Farm ${farmIndex + 1}` : "Missing farm"}</span>
                    {p.soilType ? <span className="muted"> — {p.soilType}</span> : null}
                  </span>
                  {rowErr && (
                    <span role="alert" style={{ fontSize: 12, color: "var(--semantic-error)" }}>
                      {rowErr}
                    </span>
                  )}
                  <button type="button" className="btn btn-secondary btn-sm" onClick={() => onChange(plots.filter((_, j) => j !== i))} aria-label={`Remove plot ${p.name}`}>
                    <Icons.Trash size={14} />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
