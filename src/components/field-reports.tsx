"use client";
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
        throw new Error(body.error ?? "Monitoring submission failed.");
      }

      formEl?.reset();
      setMonitoringPhotos([]);
      setMessage("Daily crop monitoring recorded & synchronized.");
      if (onSuccess) onSuccess();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Monitoring report failed.");
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
      if (incidentLevel === "PLOT" && !selectedPlotId) throw new Error("Please select a plot.");
      if (incidentLevel === "CROP" && !selectedCropCycleId) throw new Error("Please select a crop.");

      const photos = form.getAll("photos");
      const mediaIds = await uploadPhotos(selectedFarmId, "INCIDENT_PHOTO", photos);
      const customType = form.get("customType") ? String(form.get("customType")).trim() : "";
      const effectiveType = customType || incidentTypeInput || String(form.get("type"));

      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: selectedFarmId,
          level: incidentLevel,
          plotId: incidentLevel !== "FARM" ? selectedPlotId : null,
          cropCycleId: incidentLevel === "CROP" ? selectedCropCycleId : null,
          type: effectiveType,
          description: form.get("description"),
          severity: form.get("severity"),
          impactPercent: form.get("impactPercent") ? Number(form.get("impactPercent")) : null,
          mediaIds,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Incident report failed.");
      }

      formEl?.reset();
      setIncidentPhotos([]);
      setIncidentTypeInput("");
      setMessage("Incident recorded & transmitted to Farm Admin and Agronomist.");
      if (onSuccess) onSuccess();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Incident report failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      {/* Form Tabs */}
      {!hideTabs && (
        <div className="tabs-nav" style={{ marginBottom: 16 }}>
          <button
            type="button"
            className={`tab-btn ${activeFormTab === "monitoring" ? "active" : ""}`}
            onClick={() => {
              setActiveFormTab("monitoring");
              setMessage("");
            }}
          >
            <Icons.Sprout size={14} />
            <span>Daily Crop Monitoring</span>
          </button>

          <button
            type="button"
            className={`tab-btn ${activeFormTab === "incident" ? "active" : ""}`}
            onClick={() => {
              setActiveFormTab("incident");
              setMessage("");
            }}
          >
            <Icons.AlertTriangle size={14} />
            <span>Report Field Incident</span>
          </button>
        </div>
      )}

      {onCancel && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
          <button type="button" className="btn btn-sm btn-secondary" onClick={onCancel}>
            <Icons.X size={13} />
            <span>Close</span>
          </button>
        </div>
      )}

      {message && (
        <div
          className={
            message.includes("recorded") || message.includes("transmitted") || message.includes("synchronized")
              ? "success-banner"
              : "error"
          }
          role="status"
        >
          <span>{message}</span>
        </div>
      )}

      {/* FORM 1: DAILY CROP MONITORING */}
      {activeFormTab === "monitoring" && (
        <article className="card" style={{ padding: 24 }}>
          <div className="card-header">
            <div>
              <div className="eyebrow">MONITORING TELEMETRY</div>
              <h3 style={{ margin: "2px 0 0" }}>Daily Crop Health & Stage Capture</h3>
            </div>
          </div>

          <form onSubmit={handleMonitoringSubmit} style={{ display: "grid", gap: 16 }}>
            <div className="two-column">
              <div className="form-group" style={{ margin: 0 }}>
                <label>Assigned Farm</label>
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
                  disabled={!farm}
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

              <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
                <label>Active Crop Cycle</label>
                <select
                  value={selectedCropCycleId}
                  onChange={(e) => setSelectedCropCycleId(e.target.value)}
                  disabled={!selectedPlotId}
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
            </div>

            {/* Health Classification */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Crop Health Status</label>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                <button
                  type="button"
                  onClick={() => setHealthStatus("GOOD")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-xs)",
                    background: healthStatus === "GOOD" ? "var(--spotify-green-tint)" : "var(--mid-dark)",
                    border: `1px solid ${healthStatus === "GOOD" ? "rgba(30, 215, 96, 0.5)" : "var(--border-subtle)"}`,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icons.CheckCircle size={15} style={{ color: "var(--spotify-green)" }} />
                    <strong style={{ color: "var(--spotify-green)", fontSize: 13 }}>Good Crop Health</strong>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Vigorous growth, healthy canopy</div>
                </button>

                <button
                  type="button"
                  onClick={() => setHealthStatus("POOR")}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-xs)",
                    background: healthStatus === "POOR" ? "var(--negative-red-tint)" : "var(--mid-dark)",
                    border: `1px solid ${healthStatus === "POOR" ? "rgba(243, 114, 127, 0.5)" : "var(--border-subtle)"}`,
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <Icons.AlertTriangle size={15} style={{ color: "var(--negative-red)" }} />
                    <strong style={{ color: "var(--negative-red)", fontSize: 13 }}>Poor Crop Health</strong>
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>Yellowing, wilting, stress</div>
                </button>
              </div>
            </div>

            <div className="two-column">
              <div className="form-group" style={{ margin: 0 }}>
                <label>Crop Growth Stage</label>
                <select name="stage" defaultValue="Vegetative" required>
                  {cropStages.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {healthStatus === "POOR" && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Estimated Impact (%)</label>
                  <input
                    name="impactPercent"
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    placeholder="25"
                    required
                  />
                </div>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Crop Photos (Mandatory)</label>
              <input
                name="photos"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const urls = Array.from(e.target.files ?? []).map((file) =>
                    URL.createObjectURL(file)
                  );
                  setMonitoringPhotos(urls);
                }}
                required
              />

              {monitoringPhotos.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {monitoringPhotos.map((src, i) => (
                    <img
                      src={src}
                      alt="Preview"
                      key={i}
                      style={{ width: 56, height: 56, borderRadius: "var(--radius-xs)", objectFit: "cover", border: "1px solid var(--hairline)" }}
                    />
                  ))}
                </div>
              )}
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Remarks & Observations</label>
              <textarea
                name="remarks"
                maxLength={2000}
                placeholder="Describe field conditions, leaf coloration, pest presence…"
                rows={2}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-lg"
              disabled={pending || !selectedCropCycleId}
              style={{ width: "100%" }}
            >
              <span>{pending ? "Submitting…" : "Record Daily Monitoring"}</span>
              <Icons.ArrowRight size={14} />
            </button>
          </form>
        </article>
      )}

      {/* FORM 2: FIELD INCIDENT */}
      {activeFormTab === "incident" && (
        <article className="card" style={{ padding: 24 }}>
          <div className="card-header">
            <div>
              <div className="eyebrow" style={{ color: "var(--error)" }}>SIGNAL DISPATCH</div>
              <h3 style={{ margin: "2px 0 0" }}>Report Field Incident</h3>
            </div>
          </div>

          <form onSubmit={handleIncidentSubmit} style={{ display: "grid", gap: 16 }}>
            {/* Scope Level */}
            <div className="form-group" style={{ margin: 0 }}>
              <label>Incident Level</label>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                {(["FARM", "PLOT", "CROP"] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setIncidentLevel(lvl)}
                    style={{
                      padding: "8px 10px",
                      borderRadius: "var(--radius-xs)",
                      background: incidentLevel === lvl ? "var(--primary)" : "var(--soft-stone)",
                      color: incidentLevel === lvl ? "var(--on-primary)" : "var(--ink)",
                      border: `1px solid ${incidentLevel === lvl ? "var(--primary)" : "var(--hairline)"}`,
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    {lvl} Level
                  </button>
                ))}
              </div>
            </div>

            <div className="two-column">
              <div className="form-group" style={{ margin: 0 }}>
                <label>Farm</label>
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

              {incidentLevel !== "FARM" && (
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Plot</label>
                  <select
                    value={selectedPlotId}
                    onChange={(e) => {
                      setSelectedPlotId(e.target.value);
                      setSelectedCropCycleId("");
                    }}
                    disabled={!farm}
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
                <div className="form-group" style={{ margin: 0, gridColumn: "1 / -1" }}>
                  <label>Crop Cycle</label>
                  <select
                    value={selectedCropCycleId}
                    onChange={(e) => setSelectedCropCycleId(e.target.value)}
                    disabled={!selectedPlotId}
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

            <div className="two-column">
              <div className="form-group" style={{ margin: 0 }}>
                <label>Incident Type</label>
                <select
                  name="type"
                  value={incidentTypeInput}
                  onChange={(e) => setIncidentTypeInput(e.target.value)}
                  required
                >
                  <option value="">Select incident type…</option>
                  {incidentTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Severity Rating</label>
                <select name="severity" defaultValue="MEDIUM" required>
                  <option value="LOW">Low &bull; Minimal impact</option>
                  <option value="MEDIUM">Medium &bull; Requires attention</option>
                  <option value="HIGH">High &bull; Significant threat</option>
                  <option value="CRITICAL">Critical &bull; Immediate emergency</option>
                </select>
              </div>
            </div>

            {incidentTypeInput === "Other / Custom Incident" && (
              <div className="form-group" style={{ margin: 0 }}>
                <label>Specify Custom Incident Type</label>
                <input
                  name="customType"
                  placeholder="e.g., Pump starter burnt out, Frost damage, Rodent attack…"
                  required
                />
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label>Incident Description</label>
              <textarea
                name="description"
                placeholder="Explain the incident, affected bed count, root cause observations…"
                rows={3}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label>Evidence Photos (Optional)</label>
              <input
                name="photos"
                type="file"
                multiple
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => {
                  const urls = Array.from(e.target.files ?? []).map((file) =>
                    URL.createObjectURL(file)
                  );
                  setIncidentPhotos(urls);
                }}
              />
              {incidentPhotos.length > 0 && (
                <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
                  {incidentPhotos.map((src, i) => (
                    <img
                      src={src}
                      alt="Incident preview"
                      key={i}
                      style={{ width: 56, height: 56, borderRadius: "var(--radius-xs)", objectFit: "cover", border: "1px solid var(--hairline)" }}
                    />
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-danger btn-lg"
              disabled={pending}
              style={{ width: "100%" }}
            >
              <span>{pending ? "Transmitting…" : "Transmit Incident Report"}</span>
              <Icons.AlertTriangle size={14} />
            </button>
          </form>
        </article>
      )}
    </section>
  );
}
