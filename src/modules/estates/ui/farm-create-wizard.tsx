"use client";

import { useState } from "react";
import { StepWizard, WizardStep } from "@/components/ui/step-wizard";
import { useToast } from "@/components/ui/toast";

interface FarmCreateWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (newFarmId: string) => void;
  clientName?: string;
}

const WIZARD_STEPS: WizardStep[] = [
  { id: "identity", label: "Identity & Location", description: "Estate name and regional jurisdiction" },
  { id: "land", label: "Land & Soil Profile", description: "Acreage breakdown and soil taxonomy" },
  { id: "water", label: "Water & Power", description: "Borewells, irrigation source, and electricity" },
  { id: "review", label: "Coordinates & Review", description: "GPS centroid and final verification" },
];

export function FarmCreateWizard({ isOpen, onClose, onSuccess, clientName }: FarmCreateWizardProps) {
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 1: Identity & Location
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState(clientName || "");
  const [surveyNumber, setSurveyNumber] = useState("");
  const [state, setState] = useState("Tamil Nadu");
  const [district, setDistrict] = useState("Hosur");
  const [location, setLocation] = useState("Hosur, Tamil Nadu");

  // Step 2: Land & Soil Profile
  const [totalArea, setTotalArea] = useState<number | "">(20);
  const [cultivableArea, setCultivableArea] = useState<number | "">(18);
  const [soilType, setSoilType] = useState("Red Sandy Loam");

  // Step 3: Water & Power
  const [waterSource, setWaterSource] = useState("2x Borewells + Rainwater Harvesting Pond");
  const [borewellCount, setBorewellCount] = useState<number | "">(2);
  const [electricitySupply, setElectricitySupply] = useState("THREE_PHASE_GRID");

  // Step 4: Coordinates & GPS Centroid
  const [latitude, setLatitude] = useState<number | "">(12.5284);
  const [longitude, setLongitude] = useState<number | "">(77.8341);

  if (!isOpen) return null;

  const validateStep = (stepIdx: number): boolean => {
    setError(null);
    if (stepIdx === 0) {
      if (!name.trim()) {
        setError("Please provide an estate name.");
        return false;
      }
      if (!ownerName.trim()) {
        setError("Please provide owner or client company name.");
        return false;
      }
      if (!district.trim() || !state.trim()) {
        setError("District and state are required.");
        return false;
      }
    } else if (stepIdx === 1) {
      const tot = Number(totalArea);
      const cult = Number(cultivableArea);
      if (!tot || tot <= 0) {
        setError("Total acreage must be greater than 0.");
        return false;
      }
      if (!cult || cult <= 0) {
        setError("Cultivable acreage must be greater than 0.");
        return false;
      }
      if (cult > tot) {
        setError("Cultivable area cannot exceed total area.");
        return false;
      }
    } else if (stepIdx === 2) {
      if (!waterSource.trim()) {
        setError("Please specify the primary water source.");
        return false;
      }
    } else if (stepIdx === 3) {
      const lat = Number(latitude);
      const lng = Number(longitude);
      if (isNaN(lat) || lat < -90 || lat > 90 || isNaN(lng) || lng < -180 || lng > 180) {
        setError("Please enter valid GPS coordinates (Latitude -90..90, Longitude -180..180).");
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
        name: name.trim(),
        ownerName: ownerName.trim(),
        location: location.trim() || `${district}, ${state}`,
        state: state.trim(),
        district: district.trim(),
        surveyNumber: surveyNumber.trim() || undefined,
        totalArea: Number(totalArea),
        cultivableArea: Number(cultivableArea),
        soilType: soilType.trim() || undefined,
        waterSource: waterSource.trim(),
        borewellCount: borewellCount !== "" ? Number(borewellCount) : undefined,
        electricitySupply: electricitySupply || undefined,
        latitude: Number(latitude),
        longitude: Number(longitude),
        geofenceRadiusMeters: 500,
      };

      const res = await fetch("/api/farms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create farm estate.");
      }

      toast.success("Farm estate established successfully!");
      onSuccess(data.id);
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred while creating the estate.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <StepWizard
      title="Establish New Farm Estate"
      subtitle="Register an agricultural estate parcel under your management"
      steps={WIZARD_STEPS}
      currentStep={currentStep}
      onStepChange={handleStepChange}
      onClose={onClose}
      onSubmit={handleSubmit}
      submitLabel="Establish Estate"
      isSubmitting={isSubmitting}
      maxWidth="640px"
    >
      {error && (
        <div
          style={{
            padding: "10px 14px",
            backgroundColor: "var(--red-light)",
            color: "var(--red)",
            borderRadius: 8,
            fontSize: 13,
            marginBottom: 16,
            fontWeight: 500,
          }}
        >
          {error}
        </div>
      )}

      {/* Step 1: Identity & Location */}
      {currentStep === 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
              Estate Name *
            </label>
            <input
              type="text"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sahyadri Organic Valley Estate"
              autoFocus
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Owner / Client Name *
              </label>
              <input
                type="text"
                className="input"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                placeholder="Owner entity name"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Survey / Khasra No.
              </label>
              <input
                type="text"
                className="input"
                value={surveyNumber}
                onChange={(e) => setSurveyNumber(e.target.value)}
                placeholder="e.g. Sy. No. 42/1B"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                State *
              </label>
              <input
                type="text"
                className="input"
                value={state}
                onChange={(e) => {
                  setState(e.target.value);
                  setLocation(`${district}, ${e.target.value}`);
                }}
                placeholder="e.g. Maharashtra"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                District / Region *
              </label>
              <input
                type="text"
                className="input"
                value={district}
                onChange={(e) => {
                  setDistrict(e.target.value);
                  setLocation(`${e.target.value}, ${state}`);
                }}
                placeholder="e.g. Nashik"
              />
            </div>
          </div>
        </div>
      )}

      {/* Step 2: Land & Acreage */}
      {currentStep === 1 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Total Area (Acres) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="input"
                value={totalArea}
                onChange={(e) => setTotalArea(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="Total perimeter acres"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Cultivable Area (Acres) *
              </label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                className="input"
                value={cultivableArea}
                onChange={(e) => setCultivableArea(e.target.value ? parseFloat(e.target.value) : "")}
                placeholder="Arable / net bed acreage"
              />
            </div>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
              Soil Taxonomy &amp; Texture
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
              <option value="Loamy Sand">Loamy Sand (Nursery / Polyhouse blend)</option>
            </select>
          </div>

          <div
            style={{
              padding: 12,
              backgroundColor: "var(--canvas-subtle, rgba(0,0,0,0.03))",
              borderRadius: 8,
              border: "1px dashed var(--hairline, rgba(0,0,0,0.15))",
              fontSize: 12,
              color: "var(--muted)",
            }}
          >
            💡 <strong>Note on Demarcation:</strong> After establishing the estate, individual plots can be demarcated visually on satellite maps or walked via field GPS.
          </div>
        </div>
      )}

      {/* Step 3: Water & Power Infrastructure */}
      {currentStep === 2 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
              Primary Water Source *
            </label>
            <input
              type="text"
              className="input"
              value={waterSource}
              onChange={(e) => setWaterSource(e.target.value)}
              placeholder="e.g. 2x 20HP Borewells + 250kL Pond"
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Active Borewells / Pumps
              </label>
              <input
                type="number"
                min="0"
                className="input"
                value={borewellCount}
                onChange={(e) => setBorewellCount(e.target.value ? parseInt(e.target.value) : "")}
                placeholder="Number of borewells"
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Power Supply Connection
              </label>
              <select
                className="input"
                value={electricitySupply}
                onChange={(e) => setElectricitySupply(e.target.value)}
              >
                <option value="THREE_PHASE_GRID">Dedicated 3-Phase Agricultural Grid</option>
                <option value="SOLAR_HYBRID">Solar Powered Pump + Hybrid Inverter</option>
                <option value="SINGLE_PHASE">Single Phase + Generator Backup</option>
                <option value="OFF_GRID_GENERATOR">Off-grid Diesel Generator</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Step 4: Coordinates & Review */}
      {currentStep === 3 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Centroid Latitude *
              </label>
              <input
                type="number"
                step="0.0001"
                className="input"
                value={latitude}
                onChange={(e) => setLatitude(e.target.value ? parseFloat(e.target.value) : "")}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink-secondary)", marginBottom: 6 }}>
                Centroid Longitude *
              </label>
              <input
                type="number"
                step="0.0001"
                className="input"
                value={longitude}
                onChange={(e) => setLongitude(e.target.value ? parseFloat(e.target.value) : "")}
              />
            </div>
          </div>

          {/* Quick Summary Card */}
          <div
            style={{
              padding: 14,
              backgroundColor: "var(--canvas-subtle, rgba(0,0,0,0.02))",
              border: "1px solid var(--hairline, rgba(0,0,0,0.1))",
              borderRadius: 10,
              display: "flex",
              flexDirection: "column",
              gap: 8,
              fontSize: 13,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Estate Name:</span>
              <strong style={{ color: "var(--ink)" }}>{name || "—"}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Jurisdiction:</span>
              <span>{district}, {state}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Acreage:</span>
              <strong style={{ color: "var(--emerald-strong)" }}>
                {cultivableArea} ac cultivable / {totalArea} ac total
              </strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--muted)" }}>Water &amp; Power:</span>
              <span>{waterSource} ({electricitySupply.replace("_", " ")})</span>
            </div>
          </div>
        </div>
      )}
    </StepWizard>
  );
}
