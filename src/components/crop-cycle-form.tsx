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
    <article className="card" style={{ padding: 24 }}>
      <div className="card-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            STEP {currentStep} OF 5 &bull; {steps[currentStep - 1].label}
          </div>
          <h2 style={{ margin: "2px 0 0" }}>Crop Cycle Planning Wizard</h2>
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
              <span className="mono-label" style={{ color: isActive ? "inherit" : "var(--text-muted)", fontWeight: 700 }}>
                {isDone ? "✓" : s.num}
              </span>
              <span>{s.label}</span>
            </button>
          );
        })}
      </div>

      {error && (
        <div className="error" role="alert" style={{ marginBottom: 16 }}>
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
                  borderRadius: "var(--radius-sm)",
                  background: establishmentType === "NURSERY_TRANSPLANTATION" ? "var(--primary)" : "var(--card-muted)",
                  color: establishmentType === "NURSERY_TRANSPLANTATION" ? "var(--on-primary)" : "var(--text-main)",
                  border: `1px solid ${establishmentType === "NURSERY_TRANSPLANTATION" ? "var(--primary)" : "var(--border)"}`,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.Sprout size={16} />
                  <strong style={{ fontSize: "0.95rem" }}>Nursery Transplantation</strong>
                </div>
                <div style={{ fontSize: "0.8rem", opacity: 0.85, marginTop: 4 }}>
                  Seedlings raised in nursery trays and transplanted to field beds.
                </div>
              </button>

              <button
                type="button"
                onClick={() => setEstablishmentType("DIRECT_SOWING")}
                style={{
                  padding: "16px 18px",
                  borderRadius: "var(--radius-sm)",
                  background: establishmentType === "DIRECT_SOWING" ? "var(--primary)" : "var(--card-muted)",
                  color: establishmentType === "DIRECT_SOWING" ? "var(--on-primary)" : "var(--text-main)",
                  border: `1px solid ${establishmentType === "DIRECT_SOWING" ? "var(--primary)" : "var(--border)"}`,
                  textAlign: "left",
                  cursor: "pointer",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.Leaf size={16} />
                  <strong style={{ fontSize: "0.95rem" }}>Direct Sowing</strong>
                </div>
                <div style={{ fontSize: "0.8rem", opacity: 0.85, marginTop: 4 }}>
                  Seeds sown directly into plot soil or prepared beds.
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
          <div style={{ background: "var(--card-muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 18, display: "grid", gap: 12 }}>
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
                    <div style={{ fontSize: "0.85rem", color: "var(--success-text)", marginTop: 6, fontWeight: 600 }}>
                      ✓ Calculated Total Beds: <strong>{calculatedTotalBeds} beds</strong> ({bedsPerAcre} beds/acre &times; {plotArea} acres)
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Mulching */}
          <div style={{ background: "var(--card-muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 18, display: "grid", gap: 12 }}>
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
                    <div style={{ fontSize: "0.85rem", color: "var(--success-text)", marginTop: 6, fontWeight: 600 }}>
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
          <div style={{ background: "var(--card-muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 18, display: "grid", gap: 12 }}>
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
                <label>2. {readinessTitle}</label>
                <input
                  type="date"
                  value={readinessDate}
                  onChange={(e) => setReadinessDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>3. {executionTitle}</label>
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

          {/* Support Activities */}
          <div style={{ background: "var(--card-muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 18, display: "grid", gap: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div className="mono-label" style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Icons.Layers size={14} />
                <span>Support Activities (BRD §13 Optional)</span>
              </div>

              <button
                type="button"
                className="btn btn-sm btn-secondary"
                onClick={addCustomSupport}
              >
                <Icons.Plus size={13} />
                <span>Add Custom</span>
              </button>
            </div>

            {/* Quick Presets */}
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {SUPPORT_PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => addPresetSupport(preset)}
                  className="btn btn-sm btn-ghost"
                  style={{ background: "var(--card)", border: "1px solid var(--border)", fontSize: "0.78rem" }}
                >
                  + {preset}
                </button>
              ))}
            </div>

            {/* Support Activities List */}
            {supportActivities.map((s) => (
              <div key={s.id} style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr 2fr auto", gap: 8, alignItems: "center", background: "var(--card)", padding: 10, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)" }}>
                <input
                  placeholder="Activity Name"
                  value={s.name}
                  onChange={(e) => updateSupport(s.id, "name", e.target.value)}
                  style={{ padding: "6px 8px", fontSize: "0.85rem" }}
                />
                <input
                  type="date"
                  value={s.targetDate}
                  onChange={(e) => updateSupport(s.id, "targetDate", e.target.value)}
                  style={{ padding: "6px 8px", fontSize: "0.85rem" }}
                />
                <input
                  placeholder="Technical instructions (optional)"
                  value={s.remarks}
                  onChange={(e) => updateSupport(s.id, "remarks", e.target.value)}
                  style={{ padding: "6px 8px", fontSize: "0.85rem" }}
                />
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => removeSupport(s.id)}
                  style={{ padding: "4px 8px" }}
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* STEP 5: REVIEW & LAUNCH */}
      {currentStep === 5 && (
        <div style={{ display: "grid", gap: 16 }}>
          <div style={{ background: "var(--card-muted)", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", padding: 18, display: "grid", gap: 10 }}>
            <h3 style={{ margin: 0 }}>Crop Cycle Specification Summary</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, fontSize: "0.88rem" }}>
              <div><strong>Crop:</strong> {cropName}</div>
              <div><strong>Varieties:</strong> {varieties}</div>
              <div><strong>Establishment:</strong> {establishmentType.replaceAll("_", " ")}</div>
              <div><strong>Plot Area:</strong> {plotArea} Acres</div>
              {bedPrepEnabled && <div><strong>Beds Target:</strong> {calculatedTotalBeds} beds</div>}
              {mulchEnabled && <div><strong>Plants Target:</strong> {calculatedTotalPlants} plants</div>}
            </div>
          </div>
        </div>
      )}

      {/* Navigation Controls */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 24, paddingTop: 16, borderTop: "1px solid var(--border)" }}>
        {currentStep > 1 ? (
          <button type="button" className="btn btn-secondary" onClick={prevStep}>
            <Icons.ArrowLeft size={15} />
            <span>Previous</span>
          </button>
        ) : (
          <button type="button" className="btn btn-secondary" onClick={() => router.back()}>
            Cancel
          </button>
        )}

        {currentStep < 5 ? (
          <button type="button" className="btn btn-primary" onClick={nextStep}>
            <span>Next Step</span>
            <Icons.ArrowRight size={15} />
          </button>
        ) : (
          <button type="button" className="btn btn-primary" onClick={submit} disabled={pending}>
            <Icons.CheckCircle size={16} />
            <span>{pending ? "Launching Cycle…" : "Launch Crop Cycle"}</span>
          </button>
        )}
      </div>
    </article>
  );
}
