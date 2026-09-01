"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
import { FormEvent, useEffect, useState } from "react";
import { Icons } from "./icons";

type Cycle = { id: string; cropName: string };
type Plot = { id: string; name: string; cropCycles: Cycle[] };
type Farm = { id: string; name: string; plots: Plot[] };

const incidentTypes = [
  "Disease Infestation",
  "Pest Damage",
  "Nutrient Deficiency",
  "Water Stress",
  "Motor / Pump Failure",
  "Electricity Failure",
  "Irrigation Leakage",
  "Labour Shortage",
  "Excellent Crop Health",
  "High Fruit Setting",
  "Other / Custom Incident",
];

const cropStages = [
  "Germination",
  "Establishment",
  "Vegetative",
  "Flowering",
  "Fruiting",
  "Harvesting",
];

async function uploadPhotos(
  farmId: string,
  kind: "CROP_PHOTO" | "INCIDENT_PHOTO",
  files: FormDataEntryValue[]
) {
  const ids: string[] = [];
  for (const file of files) {
    if (!(file instanceof File) || !file.size) continue;
    const signed = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        farmId,
        kind,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    });
    if (!signed.ok)
      throw new Error((await signed.json()).error ?? "Could not prepare upload.");
    const item = await signed.json();
    const stored = await fetch(item.uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": file.type },
      body: file,
    });
    if (!stored.ok) throw new Error("Photo upload failed.");
    const confirmed = await fetch(`/api/uploads/${item.mediaId}/complete`, {
      method: "POST",
    });
    if (!confirmed.ok)
      throw new Error((await confirmed.json()).error ?? "Photo upload verification failed.");
    ids.push(item.mediaId);
  }
  return ids;
}

export interface FieldReportsProps {
  initialFarmId?: string;
  initialPlotId?: string;
  initialCropCycleId?: string;
  initialTab?: "monitoring" | "incident";
  onSuccess?: () => void;
  onCancel?: () => void;
  hideTabs?: boolean;
}

export function FieldReports({
  initialFarmId,
  initialPlotId,
  initialCropCycleId,
  initialTab = "monitoring",
  onSuccess,
  onCancel,
  hideTabs = false,
}: FieldReportsProps = {}) {
  const [farms, setFarms] = useState<Pick<Farm, "id" | "name">[]>([]);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState(initialFarmId || "");
  const [selectedPlotId, setSelectedPlotId] = useState(initialPlotId || "");
  const [selectedCropCycleId, setSelectedCropCycleId] = useState(initialCropCycleId || "");

  const [activeFormTab, setActiveFormTab] = useState<"monitoring" | "incident">(initialTab);
  const [healthStatus, setHealthStatus] = useState<"GOOD" | "POOR">("GOOD");
  const [incidentLevel, setIncidentLevel] = useState<"FARM" | "PLOT" | "CROP">("CROP");
  const [incidentTypeInput, setIncidentTypeInput] = useState("");

  const [monitoringPhotos, setMonitoringPhotos] = useState<string[]>([]);
  const [incidentPhotos, setIncidentPhotos] = useState<string[]>([]);

  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((fList: Farm[]) => {
        setFarms(fList);
        if (!selectedFarmId && fList.length > 0) {
          setSelectedFarmId(fList[0].id);
        }
      })
      .catch(() => setMessage("Failed to load farms."));
  }, [selectedFarmId]);

  useEffect(() => {
    if (!selectedFarmId) {
      setFarm(null);
      return;
    }
    fetch(`/api/farms/${selectedFarmId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((f: Farm) => {
        setFarm(f);
        if (initialPlotId) setSelectedPlotId(initialPlotId);
        if (initialCropCycleId) setSelectedCropCycleId(initialCropCycleId);
      })
      .catch(() => setMessage("Failed to load plots for selected farm."));
  }, [selectedFarmId, initialPlotId, initialCropCycleId]);

  function handleFarmSelect(id: string) {
    setSelectedFarmId(id);
    setSelectedPlotId("");
    setSelectedCropCycleId("");
  }

  const activePlot = farm?.plots.find((p) => p.id === selectedPlotId);
  const availableCrops = activePlot?.cropCycles ?? [];

  async function handleMonitoringSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    try {
      if (!selectedFarmId) throw new Error("Please select a farm.");
      if (!selectedPlotId) throw new Error("Please select a plot.");
      if (!selectedCropCycleId) throw new Error("Please select an active crop cycle.");

      const photos = form.getAll("photos");
      if (!photos.length || !(photos[0] instanceof File) || !photos[0].size) {
        throw new Error("At least one crop photo is required for daily monitoring.");
      }

      const mediaIds = await uploadPhotos(selectedFarmId, "CROP_PHOTO", photos);

      const impactVal = form.get("impactPercent");
      const impactPercent = impactVal ? Number(impactVal) : null;

      const response = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: selectedFarmId,
          plotId: selectedPlotId,
          cropCycleId: selectedCropCycleId,
          status: healthStatus,
          stage: form.get("stage"),
          impactPercent,
          remarks: form.get("remarks") || null,
          mediaIds,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save daily monitoring report.");
      }

      formEl.reset();
      setMonitoringPhotos([]);
      setMessage("✓ Daily crop monitoring report recorded successfully!");
      if (onSuccess) onSuccess();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Monitoring report submission failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleIncidentSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    const formEl = e.currentTarget;
    const form = new FormData(formEl);

    try {
      if (!selectedFarmId) throw new Error("Please select a farm.");

      const photos = form.getAll("photos");
      const mediaIds = await uploadPhotos(selectedFarmId, "INCIDENT_PHOTO", photos);

      const impactVal = form.get("impactPercent");
      const impactPercent = impactVal ? Number(impactVal) : null;

      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: selectedFarmId,
          plotId: selectedPlotId || null,
          cropCycleId: selectedCropCycleId || null,
          type: incidentTypeInput || form.get("type"),
          level: incidentLevel,
          severity: form.get("severity") || null,
          description: form.get("description"),
          impactPercent,
          mediaIds,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to log field incident.");
      }

      formEl.reset();
      setIncidentPhotos([]);
      setIncidentTypeInput("");
      setMessage("✓ Field incident logged and routed to Agronomist!");
      if (onSuccess) onSuccess();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Incident report submission failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <article className="card" style={{ padding: 24, display: "grid", gap: 18 }}>
      {/* Header with Switcher Tabs */}
      {!hideTabs && (
        <div className="tabs-nav">
          <button
            type="button"
            className={`tab-btn ${activeFormTab === "monitoring" ? "active" : ""}`}
            onClick={() => setActiveFormTab("monitoring")}
          >
            <Icons.Camera size={14} />
            <span>Daily Crop Monitoring (BRD §22)</span>
          </button>
          <button
            type="button"
            className={`tab-btn ${activeFormTab === "incident" ? "active" : ""}`}
            onClick={() => setActiveFormTab("incident")}
          >
            <Icons.AlertTriangle size={14} />
            <span>Field Incidents (BRD §24)</span>
          </button>
        </div>
      )}

      {message && (
        <div className={message.startsWith("✓") ? "success-banner" : "error"} role="alert">
          <span>{message}</span>
        </div>
      )}

      {/* ── FORM 1: DAILY CROP HEALTH MONITORING ── */}
      {activeFormTab === "monitoring" && (
        <form onSubmit={handleMonitoringSubmit} style={{ display: "grid", gap: 16 }}>
          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Target Farm Location</label>
              <select
                value={selectedFarmId}
                onChange={(e) => handleFarmSelect(e.target.value)}
                required
              >
                <option value="">Select farm…</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Plot</label>
              <select
                value={selectedPlotId}
                onChange={(e) => {
                  setSelectedPlotId(e.target.value);
                  setSelectedCropCycleId("");
                }}
                required
                disabled={!selectedFarmId}
              >
                <option value="">Select plot…</option>
                {farm?.plots.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Active Crop Cycle</label>
              <select
                value={selectedCropCycleId}
                onChange={(e) => setSelectedCropCycleId(e.target.value)}
                required
                disabled={!selectedPlotId || !availableCrops.length}
              >
                <option value="">Select crop…</option>
                {availableCrops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cropName}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Growth Stage</label>
              <select name="stage" required>
                {cropStages.map((stage) => (
                  <option key={stage} value={stage}>
                    {stage}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Good vs Poor Toggle */}
          <div className="form-group" style={{ margin: 0 }}>
            <label>Crop Health Status</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 4 }}>
              <button
                type="button"
                onClick={() => setHealthStatus("GOOD")}
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: healthStatus === "GOOD" ? "var(--success-light)" : "var(--card-muted)",
                  color: healthStatus === "GOOD" ? "var(--success-text)" : "var(--text-muted)",
                  border: `1px solid ${healthStatus === "GOOD" ? "var(--success-border)" : "var(--border)"}`,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🟢 Good / Normal Health
              </button>
              <button
                type="button"
                onClick={() => setHealthStatus("POOR")}
                style={{
                  padding: "12px 14px",
                  borderRadius: "var(--radius-sm)",
                  background: healthStatus === "POOR" ? "var(--danger-light)" : "var(--card-muted)",
                  color: healthStatus === "POOR" ? "var(--danger-text)" : "var(--text-muted)",
                  border: `1px solid ${healthStatus === "POOR" ? "var(--danger-border)" : "var(--border)"}`,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                🔴 Poor Health / Issues Detected
              </button>
            </div>
          </div>

          {healthStatus === "POOR" && (
            <div className="form-group" style={{ margin: 0 }}>
              <label>Estimated Area / Crop Impact (%)</label>
              <input
                name="impactPercent"
                type="number"
                min="1"
                max="100"
                placeholder="e.g. 15"
                required={healthStatus === "POOR"}
              />
            </div>
          )}

          {/* Photo Evidence Upload */}
          <div className="form-group" style={{ margin: 0 }}>
            <label>Daily Crop Photo (Mandatory)</label>
            <input
              type="file"
              name="photos"
              accept="image/jpeg,image/png,image/webp"
              multiple
              required
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setMonitoringPhotos(files.map((f) => URL.createObjectURL(f)));
              }}
            />
            {monitoringPhotos.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {monitoringPhotos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Preview ${i + 1}`}
                    style={{ width: 56, height: 56, borderRadius: "var(--radius-xs)", objectFit: "cover", border: "1px solid var(--border)" }}
                  />
                ))}
              </div>
            )}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Visual Field Notes & Observations</label>
            <textarea
              name="remarks"
              maxLength={2000}
              placeholder="Describe canopy cover, leaf color, weed pressure, or moisture level…"
              rows={2}
            />
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {onCancel && (
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending || !selectedCropCycleId}
            >
              {pending ? "Saving Observation…" : "Submit Daily Monitoring"}
            </button>
          </div>
        </form>
      )}

      {/* ── FORM 2: FIELD INCIDENT REPORTING ── */}
      {activeFormTab === "incident" && (
        <form onSubmit={handleIncidentSubmit} style={{ display: "grid", gap: 16 }}>
          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Target Farm</label>
              <select
                value={selectedFarmId}
                onChange={(e) => handleFarmSelect(e.target.value)}
                required
              >
                <option value="">Select farm…</option>
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Incident Scope Level</label>
              <select
                value={incidentLevel}
                onChange={(e) => setIncidentLevel(e.target.value as any)}
                required
              >
                <option value="FARM">Farm Level (e.g. Pump, Weather, Power)</option>
                <option value="PLOT">Plot Level (e.g. Irrigation, Drainage)</option>
                <option value="CROP">Crop Level (e.g. Pest, Disease, Foliage)</option>
              </select>
            </div>

            {incidentLevel !== "FARM" && (
              <div className="form-group" style={{ margin: 0 }}>
                <label>Plot</label>
                <select
                  value={selectedPlotId}
                  onChange={(e) => {
                    setSelectedPlotId(e.target.value);
                    setSelectedCropCycleId("");
                  }}
                  required={incidentLevel === "PLOT" || incidentLevel === "CROP"}
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
                <label>Crop Cycle</label>
                <select
                  value={selectedCropCycleId}
                  onChange={(e) => setSelectedCropCycleId(e.target.value)}
                  required={incidentLevel === "CROP"}
                  disabled={!selectedPlotId || !availableCrops.length}
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

            <div className="form-group" style={{ margin: 0 }}>
              <label>Severity Rating</label>
              <select name="severity" defaultValue="MEDIUM" required>
                <option value="LOW">Low (Monitor during routine rounds)</option>
                <option value="MEDIUM">Medium (Requires attention within 48h)</option>
                <option value="HIGH">High (Urgent agronomist prescription needed)</option>
                <option value="CRITICAL">Critical (Immediate action to prevent crop loss)</option>
              </select>
            </div>
          </div>

          {/* Quick Incident Types */}
          <div className="form-group" style={{ margin: 0 }}>
            <label>Incident Type Preset (or type custom below)</label>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 4 }}>
              {incidentTypes.map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setIncidentTypeInput(type)}
                  className="btn btn-sm btn-ghost"
                  style={{
                    background: incidentTypeInput === type ? "var(--primary-light)" : "var(--card-muted)",
                    color: incidentTypeInput === type ? "var(--primary)" : "var(--text-main)",
                    border: `1px solid ${incidentTypeInput === type ? "var(--primary)" : "var(--border)"}`,
                    fontSize: "0.78rem",
                  }}
                >
                  {type}
                </button>
              ))}
            </div>
            <input
              name="type"
              placeholder="e.g. Aphid infestation, Drip lateral puncture"
              value={incidentTypeInput}
              onChange={(e) => setIncidentTypeInput(e.target.value)}
              required
              style={{ marginTop: 8 }}
            />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Incident Description & Scope</label>
            <textarea
              name="description"
              maxLength={2000}
              placeholder="Describe symptoms, affected rows, or mechanical breakdown details…"
              rows={3}
              required
            />
          </div>

          {/* Incident Photos */}
          <div className="form-group" style={{ margin: 0 }}>
            <label>Photo Evidence (Recommended)</label>
            <input
              type="file"
              name="photos"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={(e) => {
                const files = Array.from(e.target.files ?? []);
                setIncidentPhotos(files.map((f) => URL.createObjectURL(f)));
              }}
            />
            {incidentPhotos.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                {incidentPhotos.map((url, i) => (
                  <img
                    key={i}
                    src={url}
                    alt={`Incident preview ${i + 1}`}
                    style={{ width: 56, height: 56, borderRadius: "var(--radius-xs)", objectFit: "cover", border: "1px solid var(--border)" }}
                  />
                ))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {onCancel && (
              <button type="button" className="btn btn-secondary" onClick={onCancel}>
                Cancel
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending || !selectedFarmId}
            >
              {pending ? "Logging Incident…" : "Submit Incident Report"}
            </button>
          </div>
        </form>
      )}
    </article>
  );
}
