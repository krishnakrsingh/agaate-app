"use client";

import { useState, useMemo } from "react";
import { StepWizard, WizardStep } from "@/components/ui/step-wizard";
import { useToast } from "@/components/ui/toast";

export interface CropCycleTargetPlot {
  id: string;
  name: string;
  area: number | string;
  farmId: string;
  farmName: string;
}

interface CropCycleWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newCycleId: string) => void;
  plots: CropCycleTargetPlot[];
  initialPlotId?: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: "crop", label: "Crop & Variety", description: "Select plot and commercial crop variety" },
  { id: "method", label: "Agronomy Method", description: "Bed preparation and mulching parameters" },
  { id: "timeline", label: "Milestone Dates", description: "Sowing, vegetative, and harvest timeline" },
  { id: "review", label: "Review & Launch", description: "Verify production schedule" },
];

function offsetIsoDate(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

export function CropCycleWizard({
  isOpen,
  onClose,
  onSuccess,
  plots,
  initialPlotId,
}: CropCycleWizardProps) {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Target Plot & Crop
  const [selectedPlotId, setSelectedPlotId] = useState(initialPlotId || plots[0]?.id || "");
  const [cropName, setCropName] = useState("Tomato");
  const [variety, setVariety] = useState("Shivam F1 Hybrid");
  const [establishmentType, setEstablishmentType] = useState<"NURSERY_TRANSPLANTATION" | "DIRECT_SOWING">("NURSERY_TRANSPLANTATION");

  // Step 2: Bed Preparation & Mulch
  const [bedPreparationEnabled, setBedPreparationEnabled] = useState(true);
  const [bedsPerAcre, setBedsPerAcre] = useState<number | "">(42);
  const [mulchEnabled, setMulchEnabled] = useState(true);
  const [mulchHolePattern, setMulchHolePattern] = useState<"SINGLE_LINE" | "DOUBLE_LINE_ZIGZAG">("DOUBLE_LINE_ZIGZAG");
  const [plantDistanceCm, setPlantDistanceCm] = useState<number | "">(45);
  const [plantsPerAcre, setPlantsPerAcre] = useState<number | "">(8500);

  // Step 3: Dates & Milestones
  const [startDate, setStartDate] = useState(offsetIsoDate(0));
  const [landPrepDate, setLandPrepDate] = useState(offsetIsoDate(5));
  const [transplantDate, setTransplantDate] = useState(offsetIsoDate(18));
  const [harvestDate, setHarvestDate] = useState(offsetIsoDate(75));

  const activePlot = useMemo(() => {
    return plots.find((p) => p.id === selectedPlotId) || plots[0];
  }, [plots, selectedPlotId]);

  if (!isOpen) return null;

  const validateStep = (stepIdx: number): boolean => {
    setError(null);
    if (stepIdx === 0) {
      if (!selectedPlotId) {
        setError("Please select a target production plot.");
        return false;
      }
      if (!cropName.trim()) {
        setError("Please specify the crop name (e.g. Tomato, Bell Pepper).");
        return false;
      }
      if (!variety.trim()) {
        setError("Please specify at least one crop variety or hybrid code.");
        return false;
      }
    } else if (stepIdx === 1) {
      if (bedPreparationEnabled && (!bedsPerAcre || Number(bedsPerAcre) <= 0)) {
        setError("Please provide estimated beds per acre.");
        return false;
      }
      if (mulchEnabled && (!plantDistanceCm || Number(plantDistanceCm) <= 0)) {
        setError("Plant-to-plant distance is required when mulching is enabled.");
        return false;
      }
    } else if (stepIdx === 2) {
      if (!startDate || !harvestDate) {
        setError("Start date and estimated first harvest date are required.");
        return false;
      }
    }
    return true;
  };

  const handleStepChange = (nextStep: number) => {
    if (nextStep > currentStep) {
      if (!validateStep(currentStep)) return;
    }
    setCurrentStep(nextStep);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        cropName: cropName.trim(),
        startDate: new Date(startDate).toISOString(),
        expectedFirstHarvestDate: harvestDate ? new Date(harvestDate).toISOString() : null,
        establishmentType,
        varieties: [variety.trim()],
        bedPreparationEnabled,
        expectedBedsPerAcre: bedPreparationEnabled ? Number(bedsPerAcre) : null,
        mulchEnabled,
        mulchHolePattern: mulchEnabled ? mulchHolePattern : null,
        plantDistanceCm: mulchEnabled ? Number(plantDistanceCm) : null,
        expectedPlantsPerAcre: mulchEnabled && plantsPerAcre ? Number(plantsPerAcre) : null,
        milestones: [
          {
            name: "Land Preparation & Deep Tillage",
            targetDate: new Date(landPrepDate).toISOString(),
            remarks: "Basal application and furrow preparation",
          },
          {
            name: establishmentType === "NURSERY_TRANSPLANTATION" ? "Transplantation Readiness" : "Sowing Bed Readiness",
            targetDate: new Date(transplantDate).toISOString(),
            remarks: "Drip line testing and mulch laying",
          },
          {
            name: "First Flush Harvest & Grading",
            targetDate: new Date(harvestDate).toISOString(),
            remarks: "Commercial picking and market dispatch",
          },
        ],
        supportActivities: [],
      };

      const res = await fetch(`/api/plots/${selectedPlotId}/crop-cycles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize crop cycle.");
      }

      toast.success(`Crop cycle for ${cropName} launched on ${activePlot?.name}!`);
      onSuccess(data.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while launching crop cycle.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StepWizard
      title="Start New Crop Production Cycle"
      subtitle={`Deploying agronomy protocol for ${activePlot?.name || "selected plot"}`}
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Launch Crop Cycle"
      isSubmitting={isSubmitting}
      maxWidth="680px"
    >
      {error && (
        <div
          style={{
            padding: "10px 14px",
            backgroundColor: "var(--red-light)",
            color: "var(--red)",
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 14,
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* Step 1: Crop & Variety */}
      {currentStep === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
              Target Land Plot *
            </label>
            <select
              value={selectedPlotId}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              className="input"
              style={{ width: "100%", fontSize: 13 }}
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.area} acres) · {p.farmName}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                Commercial Crop *
              </label>
              <input
                type="text"
                value={cropName}
                onChange={(e) => setCropName(e.target.value)}
                placeholder="e.g. Tomato, Capsicum, Maize"
                className="input"
                style={{ width: "100%", fontSize: 13 }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                Primary Variety *
              </label>
              <input
                type="text"
                value={variety}
                onChange={(e) => setVariety(e.target.value)}
                placeholder="e.g. Shivam F1, Indra, Syngenta 1057"
                className="input"
                style={{ width: "100%", fontSize: 13 }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
              Establishment Method
            </label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button
                type="button"
                onClick={() => setEstablishmentType("NURSERY_TRANSPLANTATION")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: establishmentType === "NURSERY_TRANSPLANTATION"
                    ? "2px solid var(--primary)"
                    : "1px solid var(--hairline)",
                  backgroundColor: establishmentType === "NURSERY_TRANSPLANTATION"
                    ? "var(--green-tint)"
                    : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Nursery Seedlings</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>Plug tray transplantation</div>
              </button>

              <button
                type="button"
                onClick={() => setEstablishmentType("DIRECT_SOWING")}
                style={{
                  padding: "10px 14px",
                  borderRadius: 8,
                  border: establishmentType === "DIRECT_SOWING"
                    ? "2px solid var(--primary)"
                    : "1px solid var(--hairline)",
                  backgroundColor: establishmentType === "DIRECT_SOWING"
                    ? "var(--green-tint)"
                    : "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Direct Sowing</div>
                <div style={{ fontSize: 11, color: "var(--muted)" }}>In-field seed drilling / broadcasting</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Bed Preparation & Mulching */}
      {currentStep === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={bedPreparationEnabled}
                  onChange={(e) => setBedPreparationEnabled(e.target.checked)}
                />
                <span>Raised Bed Preparation</span>
              </label>
              <input
                type="number"
                className="input"
                value={bedsPerAcre}
                onChange={(e) => setBedsPerAcre(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="Beds per acre"
                disabled={!bedPreparationEnabled}
              />
            </div>

            <div>
              <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
                <input
                  type="checkbox"
                  checked={mulchEnabled}
                  onChange={(e) => setMulchEnabled(e.target.checked)}
                />
                <span>Plastic Mulch Film</span>
              </label>
              <select
                className="input"
                value={mulchHolePattern}
                onChange={(e) => setMulchHolePattern(e.target.value as any)}
                disabled={!mulchEnabled}
              >
                <option value="DOUBLE_LINE_ZIGZAG">Double-Line Zigzag Pattern</option>
                <option value="SINGLE_LINE">Single-Line Center Pattern</option>
              </select>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Plant Spacing (cm)
              </label>
              <input
                type="number"
                className="input"
                value={plantDistanceCm}
                onChange={(e) => setPlantDistanceCm(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="e.g. 45 cm"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Target Population / Acre
              </label>
              <input
                type="number"
                className="input"
                value={plantsPerAcre}
                onChange={(e) => setPlantsPerAcre(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="e.g. 8500 plants"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Milestone Dates */}
      {currentStep === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Cycle Start Date *
              </label>
              <input
                type="date"
                className="input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Land Preparation Deadline
              </label>
              <input
                type="date"
                className="input"
                value={landPrepDate}
                onChange={(e) => setLandPrepDate(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Transplantation / Sowing Date
              </label>
              <input
                type="date"
                className="input"
                value={transplantDate}
                onChange={(e) => setTransplantDate(e.target.value)}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Target First Harvest Date *
              </label>
              <input
                type="date"
                className="input"
                value={harvestDate}
                onChange={(e) => setHarvestDate(e.target.value)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Review & Summary */}
      {currentStep === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div
            style={{
              padding: 16,
              backgroundColor: "var(--canvas-subtle, rgba(0,0,0,0.02))",
              border: "1px solid var(--hairline, rgba(0,0,0,0.1))",
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Target Plot:</span>
              <strong>{activePlot?.farmName} &rarr; {activePlot?.name} ({activePlot?.area} ac)</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Crop &amp; Variety:</span>
              <strong style={{ color: "var(--emerald-strong)" }}>{cropName} ({variety})</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Establishment:</span>
              <span>{establishmentType === "NURSERY_TRANSPLANTATION" ? "Nursery Seedling Plug" : "Direct Seed Sowing"}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Density:</span>
              <span>{plantsPerAcre} plants/ac &bull; {plantDistanceCm}cm spacing</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Expected First Harvest:</span>
              <strong>{harvestDate}</strong>
            </div>
          </div>
        </div>
      )}
    </StepWizard>
  );
}
