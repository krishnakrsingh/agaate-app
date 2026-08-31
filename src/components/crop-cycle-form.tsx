"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";
import { useToast } from "./ui/toast";

const iso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function CropCycleForm({
  plotId,
  farmId,
  plotArea = 1,
}: {
  plotId: string;
  farmId: string;
  plotArea?: number;
}) {
  const router = useRouter();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [cropName, setCropName] = useState("");
  const [varieties, setVarieties] = useState("");
  const [startDate, setStartDate] = useState(iso(0));
  const [harvestDate, setHarvestDate] = useState(iso(90));
  const [establishmentType, setEstablishmentType] = useState<"NURSERY_TRANSPLANTATION" | "DIRECT_SOWING">("NURSERY_TRANSPLANTATION");

  // Infrastructure State
  const [bedPrepEnabled, setBedPrepEnabled] = useState(false);
  const [bedWidthCm, setBedWidthCm] = useState<number | "">("");
  const [bedCenterDistanceCm, setBedCenterDistanceCm] = useState<number | "">("");
  const [bedsPerAcre, setBedsPerAcre] = useState<number | "">("");

  const [mulchEnabled, setMulchEnabled] = useState(false);
  const [mulchHolePattern, setMulchHolePattern] = useState<"SINGLE_LINE" | "DOUBLE_LINE_ZIGZAG">("SINGLE_LINE");
  const [plantDistanceCm, setPlantDistanceCm] = useState<number | "">("");
  const [plantsPerAcre, setPlantsPerAcre] = useState<number | "">("");

  // Milestones State
  const [landDate, setLandDate] = useState(iso(5));
  const [readinessDate, setReadinessDate] = useState(iso(12));
  const [executionDate, setExecutionDate] = useState(iso(18));

  // Support Activities (BRD §13 presets)
  type SupportActivity = { id: string; name: string; targetDate: string; remarks: string };
  const [supportActivities, setSupportActivities] = useState<SupportActivity[]>([]);

  const SUPPORT_PRESETS = [
    "Crop Cover",
    "Bamboo Stacking",
    "Trellising",
    "Net Support",
    "Rope Support",
  ];

  function addPresetSupport(presetName: string) {
    if (supportActivities.some((s) => s.name.toLowerCase() === presetName.toLowerCase())) return;
    setSupportActivities((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2, 9), name: presetName, targetDate: iso(25), remarks: "" },
    ]);
  }

  function addCustomSupport() {
    setSupportActivities((prev) => [
      ...prev,
      { id: Math.random().toString(36).slice(2, 9), name: "", targetDate: iso(25), remarks: "" },
    ]);
  }

  function removeSupport(id: string) {
    setSupportActivities((prev) => prev.filter((s) => s.id !== id));
  }

  function updateSupport(id: string, field: "name" | "targetDate" | "remarks", value: string) {
    setSupportActivities((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  }

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  // Dynamic milestone names based on spec §12
  const readinessTitle = mulchEnabled
    ? "Mulching & TP / Sowing Readiness"
    : "TP / Sowing Readiness";
  const executionTitle =
    establishmentType === "NURSERY_TRANSPLANTATION" ? "Transplantation" : "Direct Sowing";

  // Calculations
  const calculatedTotalBeds = bedsPerAcre ? (Number(bedsPerAcre) * plotArea).toFixed(0) : null;
  const calculatedTotalPlants = plantsPerAcre ? (Number(plantsPerAcre) * plotArea).toFixed(0) : null;

  function validateStep(step: number): boolean {
    setError("");
    if (step === 1) {
      if (!cropName.trim()) {
        setError("Please enter the crop name.");
        return false;
      }
      if (!varieties.trim()) {
        setError("Please enter at least one crop variety.");
        return false;
      }
      if (!startDate) {
        setError("Please select the cycle start date.");
        return false;
      }
    }
    return true;
  }

  function nextStep() {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 5) as any);
    }
  }

  function prevStep() {
    setError("");
    setCurrentStep((prev) => Math.max(prev - 1, 1) as any);
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validateStep(1)) return;

    setPending(true);
    setError("");

    try {
      const varietyList = varieties
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const validSupports = supportActivities
        .filter((s) => s.name.trim() && s.targetDate)
        .map((s) => ({ name: s.name.trim(), targetDate: s.targetDate, remarks: s.remarks.trim() || undefined }));

      const res = await fetch(`/api/plots/${plotId}/crop-cycles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cropName: cropName.trim(),
          varieties: varietyList,
          startDate,
          expectedFirstHarvestDate: harvestDate || null,
          establishmentType,
          // Bed prep
          bedPreparationEnabled: bedPrepEnabled,
          bedWidthCm: bedPrepEnabled && bedWidthCm ? Number(bedWidthCm) : null,
          bedCenterDistanceCm: bedPrepEnabled && bedCenterDistanceCm ? Number(bedCenterDistanceCm) : null,
          expectedBedsPerAcre: bedPrepEnabled && bedsPerAcre ? Number(bedsPerAcre) : null,
          expectedTotalBeds: calculatedTotalBeds ? Number(calculatedTotalBeds) : null,
          // Mulch & Population
          mulchEnabled,
          mulchHolePattern: mulchEnabled ? mulchHolePattern : null,
          plantDistanceCm: mulchEnabled && plantDistanceCm ? Number(plantDistanceCm) : null,
          expectedPlantsPerAcre: mulchEnabled && plantsPerAcre ? Number(plantsPerAcre) : null,
          expectedPlants: calculatedTotalPlants ? Number(calculatedTotalPlants) : null,
          // System Milestones
          milestones: [
            { name: "Land Preparation", targetDate: landDate },
            { name: readinessTitle, targetDate: readinessDate },
            { name: executionTitle, targetDate: executionDate },
            { name: "First Harvest", targetDate: harvestDate },
          ],
          // Support Activities (BRD §13)
          supportActivities: validSupports,
        }),
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body.error ?? "Failed to create crop cycle.");
      }

      toast.success(`Crop cycle for ${cropName} launched successfully!`);
      router.push(`/farms/${farmId}`);
      router.refresh();
    } catch (err) {
      setPending(false);
      const msg = err instanceof Error ? err.message : "Submission failed.";
      setError(msg);
      toast.error(msg);
    }
  }

  const steps = [
    { num: 1, label: "Crop & Varieties" },
    { num: 2, label: "Establishment" },
    { num: 3, label: "Bed & Mulching" },
    { num: 4, label: "Milestones" },
    { num: 5, label: "Review & Launch" },
  ];

  return (
    <article className="card" style={{ padding: 28 }}>
      <div className="card-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            STEP {currentStep} OF 5 &bull; {steps[currentStep - 1].label}
          </div>
          <h2 style={{ margin: "4px 0 0" }}>4-Step Crop Cycle Wizard</h2>
        </div>
      </div>

      {/* Step Indicator Tabs */}
      <div className="tabs-nav" style={{ marginBottom: 20 }}>
        {steps.map((s) => {
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;

          return (
            <button
              key={s.num}
              type="button"
              onClick={() => {
                if (isDone) setCurrentStep(s.num as any);
              }}
              className={`tab-btn ${isActive ? "active" : ""}`}
            >
              <span className="mono-label" style={{ color: isActive ? "white" : "inherit" }}>
                {isDone ? "✓" : s.num}
              </span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* STEP 1: CROP & VARIETIES */}
      {currentStep === 1 && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Crop Name</label>
              <input
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder="e.g., Watermelon, Tomato, Chilli"
                required
                autoFocus
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Varieties (comma separated)</label>
              <input
                value={varieties}
                onChange={(e) => setVarieties(e.target.value)}
                placeholder="e.g., Arka Manik, Sugar Baby, Black Magic"
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Cycle Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Expected First Harvest Date</label>
              <input
                type="date"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
                required
              />
            </div>
          </div>
        </div>
      )}

      {/* STEP 2: ESTABLISHMENT METHOD */}
      {currentStep === 2 && (
        <div style={{ display: "grid", gap: 16 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Select Establishment Method (BRD §7)</label>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 220px), 1fr))", gap: 12, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setEstablishmentType("NURSERY_TRANSPLANTATION")}
                style={{
                  padding: "16px 18px",
                  borderRadius: "var(--radius-xs)",
                  background: establishmentType === "NURSERY_TRANSPLANTATION" ? "var(--primary)" : "var(--canvas)",
                  color: establishmentType === "NURSERY_TRANSPLANTATION" ? "var(--on-primary)" : "var(--ink)",
                  border: `1px solid ${establishmentType === "NURSERY_TRANSPLANTATION" ? "var(--primary)" : "var(--hairline)"}`,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.Sprout size={16} />
                  <strong style={{ fontSize: 14 }}>Nursery Transplantation</strong>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  Seedlings raised in nursery and transplanted to field beds.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEstablishmentType("DIRECT_SOWING")}
                style={{
                  padding: "16px 18px",
                  borderRadius: "var(--radius-xs)",
                  background: establishmentType === "DIRECT_SOWING" ? "var(--primary)" : "var(--canvas)",
                  color: establishmentType === "DIRECT_SOWING" ? "var(--on-primary)" : "var(--ink)",
                  border: `1px solid ${establishmentType === "DIRECT_SOWING" ? "var(--primary)" : "var(--hairline)"}`,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.Leaf size={16} />
                  <strong style={{ fontSize: 14 }}>Direct Sowing</strong>
                </div>
                <div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>
                  Seeds sown directly into plot soil / prepared beds.
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: BED & MULCHING PLANNING */}
      {currentStep === 3 && (
        <div style={{ display: "grid", gap: 20 }}>
          {/* Bed Prep */}
          <div style={{ background: "var(--soft-stone)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-xs)", padding: 18, display: "grid", gap: 12 }}>
            <div className="mono-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.Layers size={14} />
              <span>Bed Infrastructure Planning (BRD §9)</span>
            </div>

            <label className="check">
              <input
                type="checkbox"
                checked={bedPrepEnabled}
                onChange={(e) => setBedPrepEnabled(e.target.checked)}
              />
              <strong>Enable Raised Bed Preparation for this crop</strong>
            </label>

            {bedPrepEnabled && (
              <div className="two-column">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Bed Width (cm)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={bedWidthCm}
                    onChange={(e) => setBedWidthCm(e.target.value ? Number(e.target.value) : "")}
                    placeholder="90"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Centre-to-Centre Distance (cm)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={bedCenterDistanceCm}
                    onChange={(e) => setBedCenterDistanceCm(e.target.value ? Number(e.target.value) : "")}
                    placeholder="150"
                  />
                </div>

                <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
                  <label>Expected Bed Count per Acre</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={bedsPerAcre}
                    onChange={(e) => setBedsPerAcre(e.target.value ? Number(e.target.value) : "")}
                    placeholder="200"
                    required={bedPrepEnabled}
                  />
                  {calculatedTotalBeds && (
                    <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 6, fontWeight: 500 }}>
                      ✓ Calculated Total Beds: <strong>{calculatedTotalBeds} beds</strong> ({bedsPerAcre} beds/acre &times; {plotArea} acres)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mulching */}
          <div style={{ background: "var(--soft-stone)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-xs)", padding: 18, display: "grid", gap: 12 }}>
            <div className="mono-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.Layers size={14} />
              <span>Mulching Configuration (BRD §10)</span>
            </div>

            <label className="check">
              <input
                type="checkbox"
                checked={mulchEnabled}
                onChange={(e) => setMulchEnabled(e.target.checked)}
              />
              <strong>Enable Plastic Mulch Film & Spacing Pattern</strong>
            </label>

            {mulchEnabled && (
              <div className="two-column">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Hole Pattern</label>
                  <select
                    value={mulchHolePattern}
                    onChange={(e) => setMulchHolePattern(e.target.value as any)}
                  >
                    <option value="SINGLE_LINE">Single Line</option>
                    <option value="DOUBLE_LINE_ZIGZAG">Double Line (Zigzag)</option>
                  </select>
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label>Plant-to-Plant Distance (cm)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={plantDistanceCm}
                    onChange={(e) => setPlantDistanceCm(e.target.value ? Number(e.target.value) : "")}
                    placeholder="45"
                    required={mulchEnabled}
                  />
                </div>

                <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
                  <label>Expected Plant Count per Acre (BRD §11)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={plantsPerAcre}
                    onChange={(e) => setPlantsPerAcre(e.target.value ? Number(e.target.value) : "")}
                    placeholder="4500"
                    required={mulchEnabled}
                  />
                  {calculatedTotalPlants && (
                    <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 6, fontWeight: 500 }}>
                      ✓ Calculated Target Population: <strong>{calculatedTotalPlants} plants</strong> ({plantsPerAcre} plants/acre &times; {plotArea} acres)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 4: MILESTONES & SUPPORT ACTIVITIES */}
      {currentStep === 4 && (
        <div style={{ display: "grid", gap: 20 }}>
          <div style={{ background: "var(--soft-stone)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-xs)", padding: 18, display: "grid", gap: 12 }}>
            <div className="mono-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.Calendar size={14} />
              <span>4 Standard System Milestones (BRD §12)</span>
            </div>

            <div className="two-column">
              <div className="form-group" style={{ margin: 0 }}>
                <label>1. Land Preparation Date</label>
                <input
                  type="date"
                  value={landDate}
                  onChange={(e) => setLandDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>2. {readinessTitle} Date</label>
                <input
                  type="date"
                  value={readinessDate}
                  onChange={(e) => setReadinessDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>3. {executionTitle} Date</label>
                <input
                  type="date"
                  value={executionDate}
                  onChange={(e) => setExecutionDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>4. First Harvest Date</label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </div>

          {/* Optional Support Activities (BRD §13) */}
          <div style={{ background: "var(--canvas)", border: "1px solid var(--hairline)", borderRadius: "var(--radius-xs)", padding: 18, display: "grid", gap: 14 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
              <div className="mono-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icons.ClipboardList size={14} />
                <span>Additional Crop Support Activities (BRD §13)</span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={addCustomSupport}
                style={{ fontSize: 12 }}
              >
                + Add Custom Activity
              </button>
            </div>

            <p style={{ margin: 0, fontSize: 13, color: "var(--body-muted)" }}>
              Select from standard support presets or add custom requirements:
            </p>

            {/* Presets Chips */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {SUPPORT_PRESETS.map((preset) => {
                const isSelected = supportActivities.some((s) => s.name.toLowerCase() === preset.toLowerCase());
                return (
                  <button
                    key={preset}
                    type="button"
                    className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-secondary"}`}
                    onClick={() => {
                      if (isSelected) {
                        const match = supportActivities.find((s) => s.name.toLowerCase() === preset.toLowerCase());
                        if (match) removeSupport(match.id);
                      } else {
                        addPresetSupport(preset);
                      }
                    }}
                    style={{ fontSize: 12, borderRadius: "var(--radius-pill)" }}
                  >
                    {isSelected ? `✓ ${preset}` : `+ ${preset}`}
                  </button>
                );
              })}
            </div>

            {/* Selected Support Activities Inputs */}
            {supportActivities.length > 0 && (
              <div style={{ display: "grid", gap: 12, marginTop: 8 }}>
                {supportActivities.map((sa, idx) => (
                  <div
                    key={sa.id}
                    style={{
                      background: "var(--soft-stone)",
                      border: "1px solid var(--hairline)",
                      borderRadius: "var(--radius-xs)",
                      padding: 14,
                      display: "grid",
                      gap: 10,
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <span className="mono-label" style={{ fontWeight: 600 }}>
                        Support Requirement #{idx + 1}
                      </span>
                      <button
                        type="button"
                        className="btn btn-ghost"
                        onClick={() => removeSupport(sa.id)}
                        style={{ padding: 0, color: "var(--coral)", fontSize: 12 }}
                      >
                        Remove
                      </button>
                    </div>

                    <div className="two-column">
                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Activity Name</label>
                        <input
                          value={sa.name}
                          onChange={(e) => updateSupport(sa.id, "name", e.target.value)}
                          placeholder="e.g., Bamboo Stacking"
                          required
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0 }}>
                        <label>Target Date</label>
                        <input
                          type="date"
                          value={sa.targetDate}
                          onChange={(e) => updateSupport(sa.id, "targetDate", e.target.value)}
                          required
                        />
                      </div>

                      <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
                        <label>Remarks / Specifications (Optional)</label>
                        <input
                          value={sa.remarks}
                          onChange={(e) => updateSupport(sa.id, "remarks", e.target.value)}
                          placeholder="e.g., 6ft bamboo poles spaced at 10ft intervals"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW & CONFIRM */}
      {currentStep === 5 && (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              padding: 20,
              background: "var(--soft-stone)",
              borderRadius: "var(--radius-xs)",
              border: "1px solid var(--hairline)",
              display: "grid",
              gap: 14,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 16 }}>Summary Plan Review</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              <div>
                <span className="mono-label">Crop & Varieties</span>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                  {cropName} ({varieties})
                </div>
              </div>

              <div>
                <span className="mono-label">Establishment</span>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                  {establishmentType.replaceAll("_", " ")}
                </div>
              </div>

              <div>
                <span className="mono-label">Timeline</span>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                  {startDate} &rarr; {harvestDate}
                </div>
              </div>

              <div>
                <span className="mono-label">Plot Area</span>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginTop: 2 }}>
                  {plotArea} Acres
                </div>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 200px), 1fr))", gap: 12 }}>
              <div>
                <span className="mono-label">Bed Infrastructure</span>
                <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2 }}>
                  {bedPrepEnabled ? `${calculatedTotalBeds ?? "—"} Total Beds (${bedsPerAcre}/acre)` : "No beds configured"}
                </div>
              </div>

              <div>
                <span className="mono-label">Mulch & Plants</span>
                <div style={{ fontSize: 13, color: "var(--ink)", marginTop: 2 }}>
                  {mulchEnabled ? `${calculatedTotalPlants ?? "—"} Plants (${mulchHolePattern.replaceAll("_", " ")})` : "Direct sowing / No mulch"}
                </div>
              </div>
            </div>

            {supportActivities.filter((s) => s.name.trim()).length > 0 && (
              <div style={{ borderTop: "1px solid var(--hairline)", paddingTop: 12 }}>
                <span className="mono-label">Support Activities ({supportActivities.filter((s) => s.name.trim()).length})</span>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
                  {supportActivities.filter((s) => s.name.trim()).map((s) => (
                    <span
                      key={s.id}
                      style={{
                        fontSize: 12,
                        background: "var(--canvas)",
                        border: "1px solid var(--hairline)",
                        padding: "3px 8px",
                        borderRadius: "var(--radius-pill)",
                      }}
                    >
                      {s.name} ({s.targetDate})
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginTop: 24,
          paddingTop: 16,
          borderTop: "1px solid var(--hairline)",
        }}
      >
        <button
          type="button"
          className="btn btn-secondary btn-sm"
          onClick={prevStep}
          disabled={currentStep === 1 || pending}
        >
          <Icons.ArrowLeft size={14} />
          <span>Back</span>
        </button>

        {currentStep < 5 ? (
          <button
            type="button"
            className="btn btn-primary btn-sm"
            onClick={nextStep}
          >
            <span>Continue</span>
            <Icons.ArrowRight size={14} />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={pending}
            style={{ padding: "10px 24px" }}
          >
            <Icons.Check size={16} />
            <span>{pending ? "Launching…" : "Launch Crop Cycle"}</span>
          </button>
        )}
      </div>
    </article>
  );
}
