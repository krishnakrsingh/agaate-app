"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { StepWizard, WizardStep } from "@/components/ui/step-wizard";
import { useToast } from "@/components/ui/toast";
import { ringAcres, toGeoJsonPolygon, type LngLat } from "@modules/spatial/ui/geo";
import { Icons } from "@/components/icons";

const GeoMap = dynamic(() => import("@modules/spatial/ui/geo-map").then((m) => m.GeoMap), {
  ssr: false,
  loading: () => (
    <div style={{ height: 260, display: "grid", placeItems: "center", color: "var(--muted)", fontSize: 13 }}>
      Loading satellite imagery for demarcation…
    </div>
  ),
});

export interface DemarcationTargetFarm {
  id: string;
  name: string;
  latitude: number | string;
  longitude: number | string;
  boundaryGeoJson?: string | null;
  totalArea?: number | string | null;
}

interface PlotDemarcateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newPlotId: string) => void;
  farms: DemarcationTargetFarm[];
  initialFarmId?: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: "identity", label: "Plot Identity", description: "Select estate and name parcel" },
  { id: "soil", label: "Soil & Irrigation", description: "Agronomy foundation and water network" },
  { id: "boundary", label: "Visual Demarcation", description: "Draw or adjust plot boundary on map" },
  { id: "review", label: "Review & Activate", description: "Final inspection and registration" },
];

export function PlotDemarcateWizard({
  isOpen,
  onClose,
  onSuccess,
  farms,
  initialFarmId,
}: PlotDemarcateWizardProps) {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Target Farm & Plot Identity
  const [selectedFarmId, setSelectedFarmId] = useState(initialFarmId || farms[0]?.id || "");
  const [name, setName] = useState("");
  const [declaredArea, setDeclaredArea] = useState<number | "">(4.0);

  // Step 2: Soil & Irrigation
  const [soilType, setSoilType] = useState("Red Sandy Loam");
  const [irrigationType, setIrrigationType] = useState("DRIP");
  const [irrigationDetails, setIrrigationDetails] = useState("Pressure-compensated inline drippers (1.2 LPH)");

  // Step 3: Spatial Boundary
  const [polygon, setPolygon] = useState<LngLat[] | null>(null);

  const activeFarm = useMemo(() => {
    return farms.find((f) => f.id === selectedFarmId) || farms[0];
  }, [farms, selectedFarmId]);

  const farmCenter: [number, number] = useMemo(() => {
    const lat = Number(activeFarm?.latitude) || 12.5284;
    const lng = Number(activeFarm?.longitude) || 77.8341;
    return [lat, lng];
  }, [activeFarm]);

  // Generate a starter rectangular boundary near the centroid if none drawn
  const generatePresetBoundary = () => {
    const lat = farmCenter[0];
    const lng = farmCenter[1];
    const offset = 0.0015; // ~3.5 acres rectangular polygon
    const preset: LngLat[] = [
      [lng - offset, lat - offset],
      [lng + offset, lat - offset],
      [lng + offset, lat + offset],
      [lng - offset, lat + offset],
      [lng - offset, lat - offset],
    ];
    setPolygon(preset);
  };

  const calculatedAcres = useMemo(() => {
    if (!polygon || polygon.length < 3) return null;
    return ringAcres(polygon);
  }, [polygon]);

  if (!isOpen) return null;

  const validateStep = (stepIdx: number): boolean => {
    setError(null);
    if (stepIdx === 0) {
      if (!selectedFarmId) {
        setError("Please select a target farm estate.");
        return false;
      }
      if (!name.trim()) {
        setError("Please enter a name for the plot (e.g. Plot 1 - North Polyhouse).");
        return false;
      }
      if (!declaredArea || Number(declaredArea) <= 0) {
        setError("Target plot acreage must be greater than 0.");
        return false;
      }
    } else if (stepIdx === 1) {
      if (!irrigationType) {
        setError("Please select an irrigation system.");
        return false;
      }
    }
    return true;
  };

  const handleStepChange = (nextStep: number) => {
    if (nextStep > currentStep) {
      if (!validateStep(currentStep)) return;
      if (nextStep === 2 && !polygon) {
        generatePresetBoundary();
      }
    }
    setCurrentStep(nextStep);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;
    setIsSubmitting(true);
    setError(null);

    try {
      const finalArea = calculatedAcres || Number(declaredArea);
      const boundaryGeoJson = polygon && polygon.length >= 4 ? toGeoJsonPolygon(polygon) : null;

      const payload = {
        farmId: selectedFarmId,
        name: name.trim(),
        area: finalArea,
        soilType: soilType || undefined,
        boundaryGeoJson: boundaryGeoJson || undefined,
        boundary: polygon && polygon.length >= 4 ? polygon : undefined,
        latitude: farmCenter[0],
        longitude: farmCenter[1],
        status: "ACTIVE",
        irrigation: [
          {
            type: irrigationType,
            details: irrigationDetails.trim() || undefined,
          },
        ],
      };

      const res = await fetch("/api/plots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to demarcate and save plot.");
      }

      toast.success(`Plot "${name}" demarcated and activated!`);
      onSuccess(data.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while creating the plot.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StepWizard
      title="Demarcate New Plot Parcel"
      subtitle={`Delineating a dedicated production zone within ${activeFarm?.name || "your estate"}`}
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Demarcate &amp; Save Plot"
      isSubmitting={isSubmitting}
      maxWidth="760px"
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

      {/* Step 1: Target Farm & Plot Identity */}
      {currentStep === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
              Parent Farm Estate *
            </label>
            <select
              className="input"
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name} ({f.totalArea ? `${f.totalArea} ac` : "Estate"})
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Plot Identifier / Name *
              </label>
              <input
                type="text"
                className="input"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Plot 3 - High Density Tomato"
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Estimated Area (Acres) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="input"
                value={declaredArea}
                onChange={(e) => setDeclaredArea(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="4.0"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Soil & Irrigation Infrastructure */}
      {currentStep === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
              Plot Soil Classification
            </label>
            <select
              className="input"
              value={soilType}
              onChange={(e) => setSoilType(e.target.value)}
            >
              <option value="Red Sandy Loam">Red Sandy Loam (High Draining)</option>
              <option value="Black Cotton Clay">Black Cotton Clay (High Moisture Retention)</option>
              <option value="Alluvial Silt Loam">Alluvial Silt Loam (Fertile Riverbed)</option>
              <option value="Laterite Heavy Soil">Laterite Heavy Soil (Acidic/High Iron)</option>
              <option value="Loamy Sand">Loamy Sand (Specialized Nursery)</option>
            </select>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Irrigation Delivery System *
              </label>
              <select
                className="input"
                value={irrigationType}
                onChange={(e) => setIrrigationType(e.target.value)}
              >
                <option value="DRIP">Drip Irrigation (Automated Fertigation)</option>
                <option value="SPRINKLER">Micro-Sprinklers / Overhead</option>
                <option value="FLOOD">Furrow / Flood Canal</option>
                <option value="MANUAL">Manual Hose / Rainfed</option>
              </select>
            </div>

            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Emitter / Network Specification
              </label>
              <input
                type="text"
                className="input"
                value={irrigationDetails}
                onChange={(e) => setIrrigationDetails(e.target.value)}
                placeholder="e.g. 1.2 LPH inline drippers"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Interactive Visual Demarcation */}
      {currentStep === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>
              Drag vertices to adjust perimeter, or redraw polygon.
            </div>
            {calculatedAcres && (
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--green-ink)",
                  backgroundColor: "var(--green-tint)",
                  padding: "2px 8px",
                  borderRadius: 6,
                }}
              >
                Mapped: {calculatedAcres.toFixed(2)} Acres
              </div>
            )}
          </div>

          <div style={{ height: 280, borderRadius: 10, overflow: "hidden", border: "1px solid var(--hairline)" }}>
            <GeoMap
              center={farmCenter}
              polygon={polygon}
              onChange={(ring) => setPolygon(ring)}
              interactive={true}
              height={280}
            />
          </div>

          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
            <button
              type="button"
              onClick={generatePresetBoundary}
              className="btn btn-secondary btn-sm"
              style={{ fontSize: 11, padding: "4px 8px" }}
            >
              Reset to Centroid Boundary
            </button>
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
              <span style={{ color: "var(--muted)" }}>Target Estate:</span>
              <strong>{activeFarm?.name}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Plot Name:</span>
              <strong style={{ color: "var(--ink)" }}>{name}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Acreage:</span>
              <strong style={{ color: "var(--emerald-strong)" }}>
                {calculatedAcres ? `${calculatedAcres.toFixed(2)} Acres (Polygon Mapped)` : `${declaredArea} Acres`}
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Soil &amp; Irrigation:</span>
              <span>{soilType} &bull; {irrigationType}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Perimeter Demarcation:</span>
              <span style={{ color: polygon ? "var(--emerald-strong)" : "var(--muted)", fontWeight: 600 }}>
                {polygon ? `✓ ${polygon.length - 1} GPS Vertices Defined` : "Point Centroid"}
              </span>
            </div>
          </div>
        </div>
      )}
    </StepWizard>
  );
}
