"use client";
import { FormEvent, useState, useEffect } from "react";
import { Icons } from "./icons";
import { PhotoUploadZone, PhotoItem, uploadEvidencePhotos } from "./photo-upload-zone";
import { useToast } from "./ui/toast";

type Cycle = { id: string; cropName: string };
type Plot = { id: string; name: string; cropCycles: Cycle[] };
type Farm = { id: string; name: string; plots: Plot[] };

const CATEGORIES = [
  { id: "pest", label: "Pest / Disease", icon: "🐛", defaultType: "Pest Damage" },
  { id: "irrigation", label: "Irrigation / Pipe", icon: "💧", defaultType: "Irrigation Leakage" },
  { id: "equipment", label: "Motor / Power", icon: "⚡", defaultType: "Pump / Motor Failure" },
  { id: "crop", label: "Crop Distress", icon: "🌱", defaultType: "Nutrient Deficiency" },
  { id: "trellis", label: "Trellis / Net", icon: "🏗", defaultType: "Trellis / Net Damage" },
  { id: "other", label: "Other Hazard", icon: "⚠️", defaultType: "Other Operational Hazard" },
];

const ALL_TYPES = [
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

  // Category and Type
  const [selectedCategory, setSelectedCategory] = useState("pest");
  const [incidentType, setIncidentType] = useState("Pest Damage");

  // Severity
  const [severity, setSeverity] = useState<"CRITICAL" | "HIGH" | "MEDIUM" | "LOW">("HIGH");

  // Content
  const [description, setDescription] = useState("");
  const [affectsCrop, setAffectsCrop] = useState(true);
  const [impactPercent, setImpactPercent] = useState<number | "">("");

  // Photos & Progress
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

  // When plot changes, auto-select first active crop cycle if available
  useEffect(() => {
    if (availableCrops.length > 0) {
      setCycleId(availableCrops[0].id);
      setAffectsCrop(true);
    } else {
      setCycleId("");
      setAffectsCrop(false);
    }
  }, [plotId, availableCrops.length]);

  const handleCategorySelect = (catId: string) => {
    setSelectedCategory(catId);
    const cat = CATEGORIES.find((c) => c.id === catId);
    if (cat) {
      setIncidentType(cat.defaultType);
      if (catId === "irrigation" || catId === "equipment" || catId === "trellis") {
        setAffectsCrop(false);
      } else {
        if (availableCrops.length > 0) setAffectsCrop(true);
      }
    }
  };

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!farmId) {
      setError("Please select a farm estate.");
      return;
    }

    if (!description.trim()) {
      setError("Please describe what occurred in the field.");
      return;
    }

    // Determine backend relational level:
    // 1. If no plot or "FARM_WIDE" -> level: "FARM", plotId: null, cropCycleId: null
    // 2. If plot selected:
    //    - If affectsCrop && cycleId -> level: "CROP", plotId: plotId, cropCycleId: cycleId
    //    - Otherwise -> level: "PLOT", plotId: plotId, cropCycleId: null
    let level: "FARM" | "PLOT" | "CROP" = "FARM";
    let finalPlotId: string | null = null;
    let finalCropCycleId: string | null = null;

    if (plotId && plotId !== "FARM_WIDE") {
      finalPlotId = plotId;
      if (affectsCrop && cycleId) {
        level = "CROP";
        finalCropCycleId = cycleId;
      } else {
        level = "PLOT";
        finalCropCycleId = null;
      }
    }

    setPending(true);
    setError("");
    setUploadProgress(null);

    try {
      // 1. Upload photos with resilient direct/S3 fallback
      let mediaIds: string[] = [];
      if (photos.length > 0) {
        mediaIds = await uploadEvidencePhotos(
          farmId,
          "INCIDENT_PHOTO",
          photos,
          (idx, total) => {
            setUploadProgress(`Securing evidence photo ${idx} of ${total}…`);
          }
        );
      }

      setUploadProgress("Transmitting incident to central command…");

      // 2. Submit incident payload
      const payload = {
        farmId,
        plotId: finalPlotId,
        cropCycleId: finalCropCycleId,
        level,
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
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 14,
        padding: "16px 18px",
        borderRadius: "16px",
        border: "1px solid var(--line)",
        backgroundColor: "var(--card)",
        boxShadow: "var(--shadow-sm)",
      }}
    >
      {/* 1. COMPACT HEADER */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 5, marginBottom: 2 }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", backgroundColor: "var(--red)" }} />
            <span style={{ fontSize: "11px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--red)" }}>
              FIELD HAZARD ESCALATION
            </span>
          </div>
          <h2 style={{ fontSize: "17px", fontWeight: 750, color: "var(--ink)", margin: 0, lineHeight: 1.2 }}>
            Report Field Incident
          </h2>
          <p className="muted" style={{ margin: "2px 0 0", fontSize: "12px" }}>
            Snap evidence photos, tag location, and notify agronomy.
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={onCancel}
            style={{
              width: 32,
              height: 32,
              padding: 0,
              borderRadius: "9999px",
              display: "grid",
              placeItems: "center",
            }}
            title="Cancel"
          >
            <Icons.X size={14} />
          </button>
        )}
      </div>

      {error && (
        <div
          className="alert alert-danger"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            fontSize: "12px",
            borderRadius: "10px",
          }}
        >
          <Icons.AlertTriangle size={14} />
          <span>{error}</span>
        </div>
      )}

      {/* 2. CAMERA-FIRST PHOTO EVIDENCE ZONE */}
      <div
        style={{
          padding: "12px",
          backgroundColor: "var(--canvas)",
          border: "1px solid var(--line)",
          borderRadius: "12px",
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

      {/* 3. QUICK 1-TAP CATEGORY CHIPS */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
            Incident Category
          </label>
          <span className="muted" style={{ fontSize: "11px" }}>Tap to select</span>
        </div>

        <div
          style={{
            display: "flex",
            gap: 6,
            overflowX: "auto",
            padding: "2px 0",
            scrollbarWidth: "none",
            WebkitOverflowScrolling: "touch",
          }}
        >
          {CATEGORIES.map((cat) => {
            const active = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                style={{
                  padding: "6px 12px",
                  fontSize: "12px",
                  fontWeight: active ? 700 : 500,
                  borderRadius: "9999px",
                  border: active ? "1px solid var(--ink)" : "1px solid var(--line)",
                  backgroundColor: active ? "var(--ink)" : "var(--canvas)",
                  color: active ? "var(--canvas)" : "var(--ink)",
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  transition: "all 0.12s ease",
                  flexShrink: 0,
                }}
              >
                <span>{cat.icon}</span>
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Detailed classification picker */}
        <select
          value={incidentType}
          onChange={(e) => setIncidentType(e.target.value)}
          className="input-field"
          style={{ height: "34px", fontSize: "12px", borderRadius: "8px", marginTop: 2 }}
          required
        >
          {ALL_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
      </div>

      {/* 4. DETAILS & IMMEDIATE MITIGATION */}
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
          Observations &amp; Immediate Action Taken
        </label>
        <textarea
          rows={3}
          className="input-field"
          placeholder="Describe symptoms, affected rows or acreage, probable cause, and any containment steps executed immediately..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          style={{ fontSize: "12.5px", borderRadius: "10px", lineHeight: 1.4 }}
          required
        />
      </div>

      {/* 5. LOCATION (SMART RELATIONAL MAPPING) */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px",
          backgroundColor: "var(--canvas)",
          border: "1px solid var(--line)",
          borderRadius: "12px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
            Location &amp; Affected Area
          </span>
          {activePlot && availableCrops.length > 0 && affectsCrop && (
            <span
              style={{
                fontSize: "10.5px",
                fontWeight: 700,
                color: "var(--green-dark)",
                backgroundColor: "var(--green-light)",
                padding: "2px 8px",
                borderRadius: "9999px",
              }}
            >
              🌱 Linked: {availableCrops.find((c) => c.id === cycleId)?.cropName || availableCrops[0].cropName}
            </span>
          )}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: farms.length > 1 ? "1fr 1fr" : "1fr", gap: 8 }}>
          {farms.length > 1 && (
            <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              <span className="muted" style={{ fontSize: "11px" }}>Estate</span>
              <select
                value={farmId}
                onChange={(e) => {
                  setFarmId(e.target.value);
                  setPlotId("");
                  setCycleId("");
                }}
                className="input-field"
                style={{ height: "32px", fontSize: "12px", borderRadius: "8px" }}
                required
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
            <span className="muted" style={{ fontSize: "11px" }}>Affected Plot / Facility</span>
            <select
              value={plotId}
              onChange={(e) => setPlotId(e.target.value)}
              className="input-field"
              style={{ height: "32px", fontSize: "12px", borderRadius: "8px" }}
            >
              <option value="">General / Entire Farm Infrastructure</option>
              {farm?.plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* If plot has crop, allow toggling whether it damages crop or infrastructure only */}
        {plotId && availableCrops.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 2 }}>
            <span className="muted" style={{ fontSize: "11.5px" }}>Crop Impact:</span>
            <div style={{ display: "inline-flex", gap: 4 }}>
              <button
                type="button"
                onClick={() => setAffectsCrop(true)}
                style={{
                  padding: "3px 9px",
                  fontSize: "11px",
                  fontWeight: affectsCrop ? 700 : 500,
                  borderRadius: "9999px",
                  border: affectsCrop ? "1px solid var(--green)" : "1px solid var(--line)",
                  backgroundColor: affectsCrop ? "var(--green-light)" : "var(--card)",
                  color: affectsCrop ? "var(--green-dark)" : "var(--muted)",
                  cursor: "pointer",
                }}
              >
                Crop Affected
              </button>
              <button
                type="button"
                onClick={() => setAffectsCrop(false)}
                style={{
                  padding: "3px 9px",
                  fontSize: "11px",
                  fontWeight: !affectsCrop ? 700 : 500,
                  borderRadius: "9999px",
                  border: !affectsCrop ? "1px solid var(--ink)" : "1px solid var(--line)",
                  backgroundColor: !affectsCrop ? "var(--stone)" : "var(--card)",
                  color: !affectsCrop ? "var(--ink)" : "var(--muted)",
                  cursor: "pointer",
                }}
              >
                Infrastructure Only
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 6. COMPACT SEVERITY SELECTOR (36PX CAPSULE BUTTONS) */}
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <label style={{ fontSize: "12px", fontWeight: 700, color: "var(--ink)" }}>
            Severity Level
          </label>
          <span className="muted" style={{ fontSize: "11px" }}>
            {severity === "CRITICAL"
              ? "Immediate ops halt"
              : severity === "HIGH"
              ? "Action within 24h"
              : severity === "MEDIUM"
              ? "Monitor within shift"
              : "Routine advisory"}
          </span>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 6 }}>
          {[
            { key: "LOW", label: "Low", icon: "🟢", color: "var(--green)", bg: "var(--green-light)" },
            { key: "MEDIUM", label: "Medium", icon: "🟡", color: "var(--ink)", bg: "var(--stone)" },
            { key: "HIGH", label: "High", icon: "🟠", color: "var(--amber)", bg: "var(--amber-light)" },
            { key: "CRITICAL", label: "Critical", icon: "🔴", color: "var(--red)", bg: "var(--red-light)" },
          ].map((s) => {
            const active = severity === s.key;
            return (
              <button
                key={s.key}
                type="button"
                onClick={() => setSeverity(s.key as any)}
                style={{
                  height: 36,
                  borderRadius: "9999px",
                  fontSize: "12px",
                  fontWeight: active ? 750 : 500,
                  border: active ? `1.5px solid ${s.color}` : "1px solid var(--line)",
                  backgroundColor: active ? s.bg : "var(--canvas)",
                  color: active ? (s.key === "CRITICAL" ? "var(--red)" : "var(--ink)") : "var(--muted)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 4,
                  cursor: "pointer",
                  transition: "all 0.12s ease",
                }}
              >
                <span>{s.icon}</span>
                <span>{s.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. OPTIONAL COLLAPSIBLE DETAILS (AREA / YIELD LOSS) */}
      <details style={{ fontSize: "12px" }}>
        <summary
          style={{
            cursor: "pointer",
            fontWeight: 600,
            color: "var(--muted)",
            userSelect: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <span>💡 Optional: Estimated Area / Yield Impact %</span>
        </summary>
        <div
          style={{
            marginTop: 6,
            padding: "10px 12px",
            borderRadius: "10px",
            backgroundColor: "var(--canvas)",
            border: "1px solid var(--line)",
            display: "flex",
            flexDirection: "column",
            gap: 8,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span className="muted" style={{ fontSize: "11px" }}>Quick Presets:</span>
            {[10, 25, 50, 75].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => setImpactPercent(pct)}
                style={{
                  padding: "2px 8px",
                  fontSize: "11px",
                  fontWeight: impactPercent === pct ? 700 : 500,
                  borderRadius: "9999px",
                  border: impactPercent === pct ? "1px solid var(--ink)" : "1px solid var(--line)",
                  backgroundColor: impactPercent === pct ? "var(--ink)" : "var(--card)",
                  color: impactPercent === pct ? "var(--canvas)" : "var(--ink)",
                  cursor: "pointer",
                }}
              >
                {pct}%
              </button>
            ))}
            <input
              type="number"
              min="0"
              max="100"
              placeholder="Custom %"
              value={impactPercent}
              onChange={(e) =>
                setImpactPercent(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="input-field"
              style={{ width: 84, height: 28, textAlign: "center", fontSize: "11.5px", borderRadius: "6px" }}
            />
          </div>
        </div>
      </details>

      {/* UPLOAD PROGRESS NOTIFICATION */}
      {uploadProgress && (
        <div
          className="alert alert-info"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "8px 12px",
            fontSize: "12px",
            borderRadius: "10px",
          }}
        >
          <Icons.Refresh size={14} className="animate-spin" />
          <span style={{ fontWeight: 550 }}>{uploadProgress}</span>
        </div>
      )}

      {/* 8. SUBMISSION FOOTER */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderTop: "1px solid var(--line)",
          paddingTop: 12,
          gap: 10,
        }}
      >
        <span className="muted" style={{ fontSize: "11.5px" }}>
          {photos.length > 0 ? (
            <span style={{ color: "var(--green-dark)", fontWeight: 600 }}>
              ✓ {photos.length} photo(s) attached
            </span>
          ) : (
            "Photos recommended"
          )}
        </span>

        <div style={{ display: "flex", gap: 8 }}>
          {onCancel && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onCancel}
              disabled={pending}
              style={{
                borderRadius: "9999px",
                height: 36,
                padding: "0 14px",
                fontSize: "12px",
                fontWeight: 600,
              }}
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            className="btn btn-danger"
            disabled={pending}
            style={{
              borderRadius: "9999px",
              height: 36,
              padding: "0 18px",
              fontSize: "12.5px",
              fontWeight: 700,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 2px 8px rgba(239, 68, 68, 0.25)",
            }}
          >
            <Icons.AlertTriangle size={15} />
            <span>{pending ? "Transmitting…" : "Submit Incident Report"}</span>
          </button>
        </div>
      </div>
    </form>
  );
}
