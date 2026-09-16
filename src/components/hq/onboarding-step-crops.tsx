"use client";
import { useState } from "react";
import { Icons } from "@/components/icons";
import { newRowId, type PlotInput, type CropInput, type FarmInput } from "./onboarding-schema";
import { emptyCrop } from "./onboarding-draft";

const POPULAR_CROPS = [
  "Tomato (Arka Rakshak)",
  "Chilli (Sitara / Teja)",
  "Capsicum (Indra)",
  "Cucumber (English / Dutch)",
  "Banana (Grand Naine)",
  "Pomegranate (Bhagwa)",
  "Papaya (Red Lady 786)",
  "Marigold (Orange / Yellow)",
];

export function OnboardingStepCrops({
  crops,
  plots,
  farms,
  onChange,
  errors,
}: {
  crops: CropInput[];
  plots: PlotInput[];
  farms: FarmInput[];
  onChange: (v: CropInput[]) => void;
  errors: Record<string, string>;
}) {
  const [activePlotId, setActivePlotId] = useState<string>(plots[0]?.rowId ?? "");
  const [isAdding, setIsAdding] = useState(false);
  const [editingCropId, setEditingCropId] = useState<string | null>(null);

  // Form states
  const [cropName, setCropName] = useState("Tomato (Arka Rakshak)");
  const [plantingMethod, setPlantingMethod] = useState("Nursery Transplantation");
  const [spacing, setSpacing] = useState("60cm x 45cm");
  const [basalDose, setBasalDose] = useState("50kg DAP + 100kg Neem Cake / Acre");
  const [mulching, setMulching] = useState("Silver-Black 25 micron");
  const [plantingDate, setPlantingDate] = useState(new Date().toISOString().slice(0, 10));
  const [expectedHarvestDate, setExpectedHarvestDate] = useState(
    new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)
  );
  const [keyDates, setKeyDates] = useState("First fertigation at Day 7, Flowering spray at Day 35");
  const [formErr, setFormErr] = useState("");

  const resetForm = () => {
    setCropName("Tomato (Arka Rakshak)");
    setPlantingMethod("Nursery Transplantation");
    setSpacing("60cm x 45cm");
    setBasalDose("50kg DAP + 100kg Neem Cake / Acre");
    setMulching("Silver-Black 25 micron");
    setPlantingDate(new Date().toISOString().slice(0, 10));
    setExpectedHarvestDate(new Date(Date.now() + 85 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10));
    setKeyDates("First fertigation at Day 7, Flowering spray at Day 35");
    setFormErr("");
    setEditingCropId(null);
    setIsAdding(false);
  };

  const startAddForPlot = (plotRowId: string) => {
    setActivePlotId(plotRowId);
    resetForm();
    setIsAdding(true);
  };

  const startEdit = (crop: CropInput) => {
    setEditingCropId(crop.rowId ?? null);
    setActivePlotId(crop.plotRowId);
    setCropName(crop.cropName);
    setPlantingMethod(crop.plantingMethod ?? "Nursery Transplantation");
    setSpacing(crop.spacing ?? "");
    setBasalDose(crop.basalDose ?? "");
    setMulching(crop.mulching ?? "Silver-Black 25 micron");
    setPlantingDate(crop.plantingDate ?? new Date().toISOString().slice(0, 10));
    setExpectedHarvestDate(crop.expectedHarvestDate ?? "");
    setKeyDates(crop.keyDates ?? "");
    setIsAdding(true);
  };

  const saveCrop = () => {
    if (!cropName.trim()) {
      setFormErr("Crop name is required.");
      return;
    }
    if (!activePlotId) {
      setFormErr("Please select a target plot for this crop.");
      return;
    }

    if (editingCropId) {
      onChange(
        crops.map((c) =>
          c.rowId === editingCropId
            ? {
                ...c,
                plotRowId: activePlotId,
                cropName: cropName.trim(),
                plantingMethod,
                spacing,
                basalDose,
                mulching,
                plantingDate,
                expectedHarvestDate,
                keyDates,
              }
            : c
        )
      );
    } else {
      const newC: CropInput = {
        rowId: newRowId(),
        plotRowId: activePlotId,
        cropName: cropName.trim(),
        plantingMethod,
        spacing,
        basalDose,
        mulching,
        plantingDate,
        expectedHarvestDate,
        keyDates,
      };
      onChange([...crops, newC]);
    }
    resetForm();
  };

  const removeCrop = (rowId?: string) => {
    if (!rowId) return;
    onChange(crops.filter((c) => c.rowId !== rowId));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "14px 20px",
          background: "var(--surface-card)",
          border: "1px solid var(--hairline)",
          borderRadius: "var(--radius-md)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Crop Schedules & Cycles
          </div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)", marginTop: 2 }}>
            Assign crops to each demarcated plot · {crops.length} Crop{crops.length === 1 ? "" : "s"} Scheduled
          </div>
        </div>

        <div style={{ fontSize: 12, color: "var(--muted)" }}>
          Plots defined: <strong>{plots.length}</strong>
        </div>
      </div>

      {plots.length === 0 ? (
        <div
          style={{
            padding: "36px 20px",
            textAlign: "center",
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            color: "var(--muted)",
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 8 }}>🌱</div>
          <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>No plots available yet</div>
          <div style={{ fontSize: 12, marginTop: 4 }}>
            Please go back to Step 4 and add at least one plot to assign crops.
          </div>
        </div>
      ) : (
        /* Plots & Assigned Crops Grid */
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {plots.map((p, pIndex) => {
            const fHolder = farms.find((f) => f.rowId === p.farmRowId);
            const plotCrops = crops.filter((c) => c.plotRowId === p.rowId);

            return (
              <div
                key={p.rowId ?? pIndex}
                style={{
                  background: "var(--surface-card)",
                  border: "1px solid var(--hairline)",
                  borderRadius: "var(--radius-md)",
                  padding: "18px 22px",
                  boxShadow: "var(--shadow-card)",
                  display: "flex",
                  flexDirection: "column",
                  gap: 14,
                }}
              >
                {/* Plot Context Bar */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 10, borderBottom: "1px solid var(--hairline)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span
                      style={{
                        width: 28,
                        height: 28,
                        borderRadius: 6,
                        background: "var(--surface-strong)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 13,
                        fontWeight: 700,
                      }}
                    >
                      {pIndex + 1}
                    </span>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
                        {p.name} <span style={{ fontSize: 12, fontWeight: 500, color: "var(--muted)" }}>({p.area} Acres)</span>
                      </div>
                      <div style={{ fontSize: 11, color: "var(--muted)" }}>
                        Hierarchy: {fHolder?.name || "Farm"} → {p.name}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={() => startAddForPlot(p.rowId ?? "")}
                    style={{ fontSize: 11, height: 28, gap: 4 }}
                  >
                    <Icons.Plus size={12} />
                    <span>+ Add Crop to {p.name}</span>
                  </button>
                </div>

                {/* Crop Cards for this plot */}
                {plotCrops.length === 0 ? (
                  <div style={{ padding: "14px", background: "var(--surface-strong)", borderRadius: 8, textAlign: "center", fontSize: 12, color: "var(--muted)" }}>
                    No crop assigned to this plot yet. Click "+ Add Crop" above.
                  </div>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 12 }}>
                    {plotCrops.map((c) => (
                      <div
                        key={c.rowId}
                        style={{
                          background: "var(--surface-strong)",
                          border: "1px solid var(--hairline)",
                          borderRadius: 8,
                          padding: "14px 16px",
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "space-between",
                          gap: 10,
                        }}
                      >
                        <div>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                            <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>{c.cropName}</span>
                            <span
                              style={{
                                fontSize: 10,
                                fontWeight: 700,
                                padding: "2px 7px",
                                borderRadius: 10,
                                background: "var(--green-light, #dcfce7)",
                                color: "var(--green, #15803d)",
                              }}
                            >
                              {c.plantingMethod || "Planting"}
                            </span>
                          </div>

                          <div style={{ marginTop: 8, fontSize: 11.5, color: "var(--muted)", display: "flex", flexDirection: "column", gap: 3 }}>
                            <div>📏 Spacing: <span style={{ color: "var(--ink)" }}>{c.spacing || "Standard"}</span></div>
                            <div>🌱 Mulch: <span style={{ color: "var(--ink)" }}>{c.mulching || "None"}</span></div>
                            <div>📅 Planting: <span style={{ color: "var(--ink)" }}>{c.plantingDate || "Immediate"}</span></div>
                            <div>🌾 Est. Harvest: <span style={{ color: "var(--ink)" }}>{c.expectedHarvestDate || "TBD"}</span></div>
                          </div>
                        </div>

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: 6, paddingTop: 8, borderTop: "1px solid var(--hairline)" }}>
                          <button
                            type="button"
                            className="btn btn-secondary btn-sm"
                            onClick={() => startEdit(c)}
                            style={{ height: 26, padding: "0 8px", fontSize: 11 }}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => removeCrop(c.rowId)}
                            style={{ height: 26, padding: "0 6px", fontSize: 11, color: "var(--semantic-error)" }}
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Crop Modal Card */}
      {isAdding && (
        <div
          style={{
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderLeft: "4px solid var(--green, #15803d)",
            borderRadius: "var(--radius-md)",
            padding: "22px 24px",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
            <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--ink)" }}>
              {editingCropId ? "Edit Crop Plan" : "Add Crop Plan to Plot"}
            </h3>
            <button type="button" className="btn btn-ghost btn-sm" onClick={resetForm} style={{ fontSize: 11 }}>
              Cancel
            </button>
          </div>

          {/* Quick Suggestions */}
          <div style={{ marginBottom: 14 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase" }}>
              Quick Suggestions:
            </span>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 6 }}>
              {POPULAR_CROPS.map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => setCropName(name)}
                  style={{
                    background: cropName === name ? "var(--green-light, #dcfce7)" : "var(--surface-strong)",
                    color: cropName === name ? "var(--green, #15803d)" : "var(--ink)",
                    border: `1px solid ${cropName === name ? "var(--green, #86efac)" : "var(--hairline)"}`,
                    borderRadius: 14,
                    fontSize: 11,
                    fontWeight: 600,
                    padding: "3px 10px",
                    cursor: "pointer",
                  }}
                >
                  {name}
                </button>
              ))}
            </div>
          </div>

          <div className="ob-grid-3">
            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Target Plot *
              </label>
              <select
                className="input-field"
                value={activePlotId}
                onChange={(e) => setActivePlotId(e.target.value)}
                style={{ borderRadius: 8 }}
              >
                {plots.map((p) => (
                  <option key={p.rowId} value={p.rowId}>
                    {p.name} ({p.area} Ac)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Crop Name & Variety *
              </label>
              <input
                className="input-field"
                value={cropName}
                maxLength={120}
                placeholder="e.g., Tomato (Arka Rakshak)"
                onChange={(e) => setCropName(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Planting Method
              </label>
              <select
                className="input-field"
                value={plantingMethod}
                onChange={(e) => setPlantingMethod(e.target.value)}
                style={{ borderRadius: 8 }}
              >
                <option value="Nursery Transplantation">Nursery Transplantation</option>
                <option value="Direct Sowing">Direct Sowing</option>
                <option value="Tissue Culture">Tissue Culture</option>
                <option value="Ratoon / Stolon">Ratoon / Stolon</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Spacing (Plant × Row)
              </label>
              <input
                className="input-field"
                value={spacing}
                maxLength={100}
                placeholder="e.g., 60cm × 45cm"
                onChange={(e) => setSpacing(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Mulching Material
              </label>
              <select
                className="input-field"
                value={mulching}
                onChange={(e) => setMulching(e.target.value)}
                style={{ borderRadius: 8 }}
              >
                <option value="Silver-Black 25 micron">Silver-Black 25 micron</option>
                <option value="Black 30 micron">Black 30 micron</option>
                <option value="Organic Straw / Husk">Organic Straw / Husk</option>
                <option value="None">None (Bare Soil)</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Basal Dose
              </label>
              <input
                className="input-field"
                value={basalDose}
                maxLength={200}
                placeholder="e.g., DAP 50kg + Neem Cake 100kg"
                onChange={(e) => setBasalDose(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Planting Date
              </label>
              <input
                className="input-field"
                type="date"
                value={plantingDate}
                onChange={(e) => setPlantingDate(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Expected Harvest Date
              </label>
              <input
                className="input-field"
                type="date"
                value={expectedHarvestDate}
                onChange={(e) => setExpectedHarvestDate(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>

            <div>
              <label style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--muted)", textTransform: "uppercase", marginBottom: 5 }}>
                Key Notes / Milestones
              </label>
              <input
                className="input-field"
                value={keyDates}
                maxLength={300}
                placeholder="e.g., First fertigation at Day 7"
                onChange={(e) => setKeyDates(e.target.value)}
                style={{ borderRadius: 8 }}
              />
            </div>
          </div>

          {formErr && (
            <div role="alert" style={{ fontSize: 11, color: "var(--semantic-error)", marginTop: 10 }}>
              {formErr}
            </div>
          )}

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 16 }}>
            <button type="button" className="btn btn-secondary btn-sm" onClick={resetForm} style={{ height: 32, padding: "0 14px" }}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={saveCrop} style={{ height: 32, padding: "0 18px" }}>
              {editingCropId ? "Update Crop Plan" : "Assign Crop"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
