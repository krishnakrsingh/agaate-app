"use client";
import { FormEvent, useState, useEffect } from "react";
import { Icons } from "./icons";
import { PhotoUploadZone, PhotoItem, uploadEvidencePhotos } from "./photo-upload-zone";
import { useToast } from "./ui/toast";

type Cycle = { id: string; cropName: string };
type Plot = { id: string; name: string; cropCycles: Cycle[] };
type Farm = { id: string; name: string; plots: Plot[] };

const incidentTypes = [
  "Pest Damage",
  "Disease Infestation",
  "Nutrient Deficiency",
  "Water Stress",
  "Pump / Motor Failure",
  "Irrigation Leakage",
  "Chemical / Fertilizer Burn",
  "Frost / Heat Stress",
  "Trellis / Net Damage",
  "Labour Shortage",
  "Other Operational Hazard",
];

export function IncidentReportForm({
  initialFarmId,
  initialPlotId,
  initialCropCycleId,
  onSuccess,
  onCancel,
}: {
  initialFarmId?: string;
  initialPlotId?: string;
  initialCropCycleId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}) {
  const toast = useToast();
  const [farms, setFarms] = useState<Array<{ id: string; name: string }>>([]);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [farmId, setFarmId] = useState(initialFarmId || "");
  const [plotId, setPlotId] = useState(initialPlotId || "");
  const [cycleId, setCycleId] = useState(initialCropCycleId || "");

  const [incidentLevel, setIncidentLevel] = useState<"CROP" | "PLOT" | "FARM">("CROP");
  const [severity, setSeverity] = useState<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("HIGH");
  const [incidentType, setIncidentType] = useState(incidentTypes[0]);
  const [description, setDescription] = useState("");
  const [impactPercent, setImpactPercent] = useState<number | "">("");

  const [photos, setPhotos] = useState<PhotoItem[]>([]);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  // Load farms accessible to officer
  useEffect(() => {
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : []))
      .then((list) => {
        setFarms(list);
        if (!farmId && list.length > 0) setFarmId(list[0].id);
      });
  }, [farmId]);

  // Load selected farm plots & crop cycles
  useEffect(() => {
    if (!farmId) {
      setFarm(null);
      return;
    }
    fetch(`/api/farms/${farmId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((f) => {
        setFarm(f);
        if (initialPlotId) setPlotId(initialPlotId);
        if (initialCropCycleId) setCycleId(initialCropCycleId);
      });
  }, [farmId, initialPlotId, initialCropCycleId]);

  const activePlot = farm?.plots.find((p) => p.id === plotId);
  const availableCrops = activePlot?.cropCycles ?? [];

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!farmId) {
      setError("Please select a farm estate.");
      return;
    }
    if (incidentLevel === "PLOT" && !plotId) {
      setError("Please select the affected plot.");
      return;
    }
    if (incidentLevel === "CROP" && (!plotId || !cycleId)) {
      setError("Please select both the plot and active crop cycle.");
      return;
    }
    if (!description.trim()) {
      setError("Please provide details of the incident.");
      return;
    }

    setPending(true);
    setError("");
    setUploadProgress(null);

    try {
      // 1. Upload photos to S3 with progress updates
      let mediaIds: string[] = [];
      if (photos.length > 0) {
        mediaIds = await uploadEvidencePhotos(
          farmId,
          "INCIDENT_PHOTO",
          photos,
          (idx, total) => {
            setUploadProgress(`Securing evidence photo ${idx} of ${total} on S3…`);
          }
        );
      }

      setUploadProgress("Recording incident in central operations log…");

      // 2. Submit incident payload
      const payload = {
        farmId,
        plotId: incidentLevel !== "FARM" ? plotId || null : null,
        cropCycleId: incidentLevel === "CROP" ? cycleId || null : null,
        level: incidentLevel,
        type: incidentType,
        severity,
        description: description.trim(),
        impactPercent: impactPercent !== "" ? Number(impactPercent) : null,
        mediaIds,
      };

      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to submit field incident.");
      }

      toast.success("Field incident logged with photographic evidence.");
      setPhotos([]);
      setDescription("");
      setUploadProgress(null);
      onSuccess?.();
    } catch (err: any) {
      setError(err.message || "Failed to submit incident.");
      setUploadProgress(null);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="compact-card"
      style={{
        padding: 24,
        gap: 20,
        borderRadius: "var(--radius-md)",
        boxShadow: "var(--shadow-card)",
      }}
    >
      {/* HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--red)" }}>
            <span className="eyebrow-dot" style={{ backgroundColor: "var(--red)" }} />
            <span>FIELD HAZARD ESCALATION</span>
          </div>
          <h2 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 0", color: "var(--ink)" }}>
            Report Agricultural Field Incident
          </h2>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: 13 }}>
            Document crop distress, infrastructure failures, or operational hazards with real-time photographic evidence.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            className="btn btn-sm btn-secondary"
            onClick={onCancel}
            title="Cancel"
          >
            <Icons.X size={15} />
          </button>
        )}
      </div>

      {error && (
        <div className="alert alert-danger" style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Icons.AlertTriangle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* 1. SEVERITY LEVEL SELECTOR */}
      <div className="form-group" style={{ margin: 0 }}>
        <label style={{ fontWeight: 600, color: "var(--ink)" }}>Severity Level</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
          <button
            type="button"
            className={`btn ${severity === "CRITICAL" ? "btn-danger" : "btn-secondary"}`}
            style={{
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              border: severity === "CRITICAL" ? "2px solid var(--red)" : "1px solid var(--line)",
            }}
            onClick={() => setSeverity("CRITICAL")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
              <Icons.AlertTriangle size={14} /> CRITICAL
            </div>
            <span style={{ fontSize: 10, opacity: 0.8 }}>Immediate Ops Halt</span>
          </button>

          <button
            type="button"
            className={`btn ${severity === "HIGH" ? "btn-amber" : "btn-secondary"}`}
            style={{
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              border: severity === "HIGH" ? "2px solid var(--amber)" : "1px solid var(--line)",
            }}
            onClick={() => setSeverity("HIGH")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
              <Icons.AlertTriangle size={14} /> HIGH
            </div>
            <span style={{ fontSize: 10, opacity: 0.8 }}>Action in 24 Hours</span>
          </button>

          <button
            type="button"
            className={`btn ${severity === "MEDIUM" ? "btn-primary" : "btn-secondary"}`}
            style={{
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
            onClick={() => setSeverity("MEDIUM")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
              <Icons.Activity size={14} /> MEDIUM
            </div>
            <span style={{ fontSize: 10, opacity: 0.8 }}>Shift Monitoring</span>
          </button>

          <button
            type="button"
            className={`btn ${severity === "LOW" ? "btn-green" : "btn-secondary"}`}
            style={{
              padding: "8px 12px",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
            }}
            onClick={() => setSeverity("LOW")}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 4, fontWeight: 700 }}>
              <Icons.CheckCircle size={14} /> LOW
            </div>
            <span style={{ fontSize: 10, opacity: 0.8 }}>Routine Advisory</span>
          </button>
        </div>
      </div>

      {/* 2. OPERATIONAL SCOPE & TARGET */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 14,
          padding: 16,
          backgroundColor: "var(--canvas)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-xs)",
        }}
      >
        <div className="form-group" style={{ margin: 0 }}>
          <label>Scope Level</label>
          <select
            value={incidentLevel}
            onChange={(e: any) => setIncidentLevel(e.target.value)}
            className="input-field"
          >
            <option value="CROP">Crop Specific (Beds / Plantings)</option>
            <option value="PLOT">Plot Infrastructure (Pumps, Pipes, Soil)</option>
            <option value="FARM">Estate Wide (Main Power, Roads, Perimeter)</option>
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label>Target Estate</label>
          <select
            value={farmId}
            onChange={(e) => {
              setFarmId(e.target.value);
              setPlotId("");
              setCycleId("");
            }}
            className="input-field"
            required
          >
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {incidentLevel !== "FARM" && (
          <div className="form-group" style={{ margin: 0 }}>
            <label>Target Land Plot</label>
            <select
              value={plotId}
              onChange={(e) => {
                setPlotId(e.target.value);
                setCycleId("");
              }}
              className="input-field"
              required
            >
              <option value="">Select plot…</option>
              {farm?.plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {incidentLevel === "CROP" && (
          <div className="form-group" style={{ margin: 0 }}>
            <label>Active Crop Cycle</label>
            <select
              value={cycleId}
              onChange={(e) => setCycleId(e.target.value)}
              className="input-field"
              disabled={!availableCrops.length}
              required
            >
              <option value="">Select crop…</option>
              {availableCrops.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cropName}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* 3. CLASSIFICATION & ESTIMATED IMPACT */}
      <div className="two-column">
        <div className="form-group" style={{ margin: 0 }}>
          <label>Incident Classification</label>
          <select
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value)}
            className="input-field"
            required
          >
            {incidentTypes.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label>Estimated Yield / Area Impact (%)</label>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input
              type="range"
              min="0"
              max="100"
              step="5"
              value={impactPercent === "" ? 0 : impactPercent}
              onChange={(e) => setImpactPercent(Number(e.target.value))}
              style={{ flex: 1 }}
            />
            <input
              type="number"
              min="0"
              max="100"
              placeholder="e.g. 25"
              value={impactPercent}
              onChange={(e) =>
                setImpactPercent(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="input-field"
              style={{ width: 80, textAlign: "center" }}
            />
            <span style={{ fontSize: 13, color: "var(--muted)" }}>%</span>
          </div>
        </div>
      </div>

      {/* 4. DETAILS & IMMEDIATE MITIGATION */}
      <div className="form-group" style={{ margin: 0 }}>
        <label>Incident Details &amp; Mitigation Actions Taken</label>
        <textarea
          rows={3}
          className="input-field"
          placeholder="Describe symptoms, affected rows or acreage, probable cause, and any containment steps executed immediately."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
        />
      </div>

      {/* 5. REDESIGNED VISUAL EVIDENCE PHOTO UPLOAD */}
      <div
        style={{
          padding: 16,
          backgroundColor: "var(--canvas)",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-xs)",
        }}
      >
        <PhotoUploadZone
          farmId={farmId}
          kind="INCIDENT_PHOTO"
          maxPhotos={6}
          onPhotosChange={setPhotos}
          isUploading={pending}
        />
      </div>

      {/* UPLOAD PROGRESS NOTIFICATION */}
      {uploadProgress && (
        <div
          className="alert alert-info"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "10px 14px",
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            border: "1px solid var(--blue)",
          }}
        >
          <Icons.Refresh size={16} className="animate-spin" />
          <span style={{ fontSize: 13, color: "var(--ink)", fontWeight: 500 }}>
            {uploadProgress}
          </span>
        </div>
      )}

      {/* SUBMISSION FOOTER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid var(--line)",
          paddingTop: 16,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div className="muted" style={{ fontSize: 12 }}>
          {photos.length > 0 ? (
            <span style={{ color: "var(--green)" }}>
              ✓ {photos.length} evidence photo(s) ready to attach
            </span>
          ) : (
            <span>Attach photos to expedite agronomist diagnosis</span>
          )}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={pending}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="btn btn-danger"
            disabled={pending}
            style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 160 }}
          >
            <Icons.AlertTriangle size={16} />
            <span>{pending ? "Transmitting…" : "Submit Incident"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
