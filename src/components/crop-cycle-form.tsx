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

  // Support Activities
  const [support1Name, setSupport1Name] = useState("");
  const [support1Date, setSupport1Date] = useState("");
  const [support2Name, setSupport2Name] = useState("");
  const [support2Date, setSupport2Date] = useState("");

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
    setPending(true);
    setError("");

    const supportActivities = [
      { name: support1Name.trim(), targetDate: support1Date, remarks: null },
      { name: support2Name.trim(), targetDate: support2Date, remarks: null },
    ].filter((x) => x.name && x.targetDate);

    const payload = {
      cropName: cropName.trim(),
      startDate,
      expectedFirstHarvestDate: harvestDate || null,
      establishmentType,
      varieties: varieties
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean),
      bedPreparationEnabled: bedPrepEnabled,
      bedWidthCm: bedWidthCm ? Number(bedWidthCm) : null,
      bedCenterDistanceCm: bedCenterDistanceCm ? Number(bedCenterDistanceCm) : null,
      expectedBedsPerAcre: bedsPerAcre ? Number(bedsPerAcre) : null,
      mulchEnabled,
      mulchHolePattern: mulchEnabled ? mulchHolePattern : null,
      plantDistanceCm: mulchEnabled && plantDistanceCm ? Number(plantDistanceCm) : null,
      expectedPlantsPerAcre: plantsPerAcre ? Number(plantsPerAcre) : null,
      milestones: [
        { name: "Land Preparation", targetDate: landDate },
        { name: readinessTitle, targetDate: readinessDate },
        { name: executionTitle, targetDate: executionDate },
        { name: "First Harvest", targetDate: harvestDate },
      ],
      supportActivities,
    };

    try {
      const res = await fetch(`/api/plots/${plotId}/crop-cycles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setPending(false);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const errMsg = body.error ?? body.details?.formErrors?.[0] ?? "Unable to create crop cycle.";
        setError(errMsg);
        toast.error(errMsg);
        return;
      }

      toast.success(`Crop cycle for ${cropName} successfully created!`);
      router.replace(`/farms/${farmId}`);
      router.refresh();
    } catch {
      setPending(false);
      setError("Network error submitting crop cycle.");
      toast.error("Network error submitting crop cycle.");
    }
  }

  const steps = [
    { num: 1, label: "Crop & Varieties" },
    { num: 2, label: "Establishment" },
    { num: 3, label: "Infrastructure" },
    { num: 4, label: "Milestones" },
    { num: 5, label: "Review & Confirm" },
  ];

  return (
    <article className="card" style={{ maxWidth: 840, margin: "0 auto" }}>
      <div className="card-header">
        <div>
          <div className="eyebrow">
            <span className="eyebrow-dot"></span>
            PLOT PLANNING WIZARD &bull; {plotArea} ACRES
          </div>
          <h2 style={{ margin: "4px 0 0", fontSize: "1.35rem" }}>Plan Crop Cycle</h2>
        </div>
      </div>

      {/* Wizard Step Progress Tracker */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          margin: "12px 0 24px",
          gap: 6,
          overflowX: "auto",
          paddingBottom: 4,
        }}
      >
        {steps.map((s) => {
          const isActive = currentStep === s.num;
          const isDone = currentStep > s.num;

          return (
            <div
              key={s.num}
              onClick={() => {
                if (isDone) setCurrentStep(s.num as any);
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                padding: "6px 10px",
                borderRadius: "var(--radius-sm)",
                background: isActive ? "var(--primary-50)" : isDone ? "var(--slate-100)" : "transparent",
                color: isActive ? "var(--primary-800)" : isDone ? "var(--slate-700)" : "var(--slate-400)",
                border: `1px solid ${isActive ? "var(--primary-200)" : "transparent"}`,
                cursor: isDone ? "pointer" : "default",
                fontSize: "0.8rem",
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: "var(--radius-full)",
                  background: isActive ? "var(--primary-700)" : isDone ? "var(--primary-500)" : "var(--slate-200)",
                  color: isActive || isDone ? "white" : "var(--slate-600)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.72rem",
                  fontWeight: 700,
                }}
              >
                {isDone ? "✓" : s.num}
              </span>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* =========================================================================
         STEP 1: CROP & VARIETIES
         ========================================================================= */}
      {currentStep === 1 && (
        <div className="form">
          <div className="two-column">
            <div className="form-group">
              <label>Crop Name</label>
              <input
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder="e.g., Watermelon, Tomato, Chilli"
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>Varieties (comma separated)</label>
              <input
                value={varieties}
                onChange={(e) => setVarieties(e.target.value)}
                placeholder="e.g., Arka Manik, Sugar Baby, Black Magic"
                required
              />
            </div>

            <div className="form-group">
              <label>Cycle Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
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

      {/* =========================================================================
         STEP 2: ESTABLISHMENT METHOD
         ========================================================================= */}
      {currentStep === 2 && (
        <div className="form">
          <div className="form-group">
            <label style={{ fontSize: "0.95rem" }}>Select Establishment Method (BRD §7)</label>
            <div className="choice-grid" style={{ gridTemplateColumns: "1fr 1fr", marginTop: 8 }}>
              <div
                className={`choice-card ${establishmentType === "NURSERY_TRANSPLANTATION" ? "selected" : ""}`}
                onClick={() => setEstablishmentType("NURSERY_TRANSPLANTATION")}
                style={{ padding: "16px 18px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.Sprout size={18} style={{ color: "var(--primary-600)" }} />
                  <strong style={{ fontSize: "1rem" }}>Nursery Transplantation</strong>
                </div>
                <small style={{ marginTop: 4 }}>Seedlings raised in nursery and transplanted to field beds.</small>
              </div>

              <div
                className={`choice-card ${establishmentType === "DIRECT_SOWING" ? "selected" : ""}`}
                onClick={() => setEstablishmentType("DIRECT_SOWING")}
                style={{ padding: "16px 18px" }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Icons.Leaf size={18} style={{ color: "var(--primary-600)" }} />
                  <strong style={{ fontSize: "1rem" }}>Direct Sowing</strong>
                </div>
                <small style={{ marginTop: 4 }}>Seeds sown directly into plot soil / prepared beds.</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
         STEP 3: BED & MULCHING PLANNING
         ========================================================================= */}
      {currentStep === 3 && (
        <div className="form">
          {/* Bed Prep */}
          <fieldset>
            <legend style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.Layers size={16} />
              <span>Bed Infrastructure Planning (BRD §9)</span>
            </legend>

            <label className="check">
              <input
                type="checkbox"
                checked={bedPrepEnabled}
                onChange={(e) => setBedPrepEnabled(e.target.checked)}
              />
              <strong>Enable Raised Bed Preparation for this crop</strong>
            </label>

            {bedPrepEnabled && (
              <div className="two-column" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label>Bed Width (cm)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={bedWidthCm}
                    onChange={(e) => setBedWidthCm(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g., 90"
                  />
                </div>

                <div className="form-group">
                  <label>Centre-to-Centre Distance (cm)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={bedCenterDistanceCm}
                    onChange={(e) => setBedCenterDistanceCm(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g., 150"
                  />
                </div>

                <div className="form-group wide">
                  <label>Expected Bed Count per Acre</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={bedsPerAcre}
                    onChange={(e) => setBedsPerAcre(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g., 200"
                    required={bedPrepEnabled}
                  />
                  {calculatedTotalBeds && (
                    <div className="hint" style={{ marginTop: 6, padding: "8px 12px", fontSize: "0.82rem" }}>
                      <Icons.CheckCircle size={14} />
                      <span>Calculated Expected Total Beds: <strong>{calculatedTotalBeds} beds</strong> ({bedsPerAcre} beds/acre &times; {plotArea} acres)</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </fieldset>

          {/* Mulching */}
          <fieldset>
            <legend style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.Layers size={16} />
              <span>Mulching Configuration (BRD §10)</span>
            </legend>

            <label className="check">
              <input
                type="checkbox"
                checked={mulchEnabled}
                onChange={(e) => setMulchEnabled(e.target.checked)}
              />
              <strong>Enable Plastic Mulch Film & Spacing Pattern</strong>
            </label>

            {mulchEnabled && (
              <div className="two-column" style={{ marginTop: 10 }}>
                <div className="form-group">
                  <label>Hole Pattern</label>
                  <select
                    value={mulchHolePattern}
                    onChange={(e) => setMulchHolePattern(e.target.value as any)}
                  >
                    <option value="SINGLE_LINE">Single Line</option>
                    <option value="DOUBLE_LINE_ZIGZAG">Double Line (Zigzag)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Plant-to-Plant Distance (cm)</label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={plantDistanceCm}
                    onChange={(e) => setPlantDistanceCm(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g., 45"
                    required={mulchEnabled}
                  />
                </div>

                <div className="form-group wide">
                  <label>Expected Plant Count per Acre (BRD §11)</label>
                  <input
                    type="number"
                    min="1"
                    step="0.1"
                    value={plantsPerAcre}
                    onChange={(e) => setPlantsPerAcre(e.target.value ? Number(e.target.value) : "")}
                    placeholder="e.g., 4500"
                    required={mulchEnabled}
                  />
                  {calculatedTotalPlants && (
                    <div className="hint" style={{ marginTop: 6, padding: "8px 12px", fontSize: "0.82rem" }}>
                      <Icons.CheckCircle size={14} />
                      <span>Calculated Expected Total Population: <strong>{calculatedTotalPlants} plants</strong> ({plantsPerAcre} plants/acre &times; {plotArea} acres)</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </fieldset>
        </div>
      )}

      {/* =========================================================================
         STEP 4: MILESTONES & SUPPORT ACTIVITIES
         ========================================================================= */}
      {currentStep === 4 && (
        <div className="form">
          <fieldset>
            <legend style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.Calendar size={16} />
              <span>4 Standard System Milestones (BRD §12)</span>
            </legend>

            <div className="two-column">
              <div className="form-group">
                <label>1. Land Preparation Date</label>
                <input
                  type="date"
                  value={landDate}
                  onChange={(e) => setLandDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>2. {readinessTitle} Date</label>
                <input
                  type="date"
                  value={readinessDate}
                  onChange={(e) => setReadinessDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>3. {executionTitle} Date</label>
                <input
                  type="date"
                  value={executionDate}
                  onChange={(e) => setExecutionDate(e.target.value)}
                  required
                />
              </div>

              <div className="form-group">
                <label>4. First Harvest Date</label>
                <input
                  type="date"
                  value={harvestDate}
                  onChange={(e) => setHarvestDate(e.target.value)}
                  required
                />
              </div>
            </div>
          </fieldset>

          {/* Optional Support Activities */}
          <fieldset>
            <legend style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <Icons.ClipboardList size={16} />
              <span>Support Agronomy Activities (BRD §13 - Optional)</span>
            </legend>

            <div className="two-column">
              <div className="form-group">
                <label>Support Activity 1</label>
                <input
                  value={support1Name}
                  onChange={(e) => setSupport1Name(e.target.value)}
                  placeholder="e.g., Basal DAP + FYM Application"
                />
              </div>
              <div className="form-group">
                <label>Target Date</label>
                <input
                  type="date"
                  value={support1Date}
                  onChange={(e) => setSupport1Date(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label>Support Activity 2</label>
                <input
                  value={support2Name}
                  onChange={(e) => setSupport2Name(e.target.value)}
                  placeholder="e.g., Drip Line Pressure Flush"
                />
              </div>
              <div className="form-group">
                <label>Target Date</label>
                <input
                  type="date"
                  value={support2Date}
                  onChange={(e) => setSupport2Date(e.target.value)}
                />
              </div>
            </div>
          </fieldset>
        </div>
      )}

      {/* =========================================================================
         STEP 5: REVIEW & CONFIRM
         ========================================================================= */}
      {currentStep === 5 && (
        <div style={{ display: "grid", gap: 16 }}>
          <div
            style={{
              padding: "16px 20px",
              background: "var(--slate-50)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
              display: "grid",
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: "1.1rem" }}>Summary Review</h3>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 10, fontSize: "0.88rem" }}>
              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>Crop & Varieties</span>
                <strong>{cropName}</strong> ({varieties})
              </div>

              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>Establishment</span>
                <strong>{establishmentType.replaceAll("_", " ")}</strong>
              </div>

              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>Timeline</span>
                <strong>{startDate}</strong> to <strong>{harvestDate}</strong>
              </div>

              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>Plot Area</span>
                <strong>{plotArea} Acres</strong>
              </div>
            </div>

            <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: 10, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, fontSize: "0.85rem" }}>
              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>Bed Infrastructure</span>
                <span>{bedPrepEnabled ? `${calculatedTotalBeds ?? "—"} Total Beds (${bedsPerAcre}/acre)` : "No beds configured"}</span>
              </div>

              <div>
                <span className="muted" style={{ display: "block", fontSize: "0.75rem", textTransform: "uppercase" }}>Mulch & Plants</span>
                <span>{mulchEnabled ? `${calculatedTotalPlants ?? "—"} Plants (${mulchHolePattern.replaceAll("_", " ")})` : "Direct sowing / No mulch"}</span>
              </div>
            </div>
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
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        <button
          type="button"
          className="btn btn-secondary"
          onClick={prevStep}
          disabled={currentStep === 1 || pending}
          style={{ minHeight: 44 }}
        >
          <Icons.ArrowLeft size={16} />
          <span>Back</span>
        </button>

        {currentStep < 5 ? (
          <button
            type="button"
            className="btn btn-primary"
            onClick={nextStep}
            style={{ minHeight: 44 }}
          >
            <span>Continue</span>
            <Icons.ArrowRight size={16} />
          </button>
        ) : (
          <button
            type="button"
            className="btn btn-primary"
            onClick={submit}
            disabled={pending}
            style={{ minHeight: 44, padding: "10px 24px" }}
          >
            <Icons.Check size={18} />
            <span>{pending ? "Creating Crop Plan…" : "Confirm & Launch Cycle"}</span>
          </button>
        )}
      </div>
    </article>
  );
}
