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

export function FieldReports() {
  const [farms, setFarms] = useState<Pick<Farm, "id" | "name">[]>([]);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [selectedFarmId, setSelectedFarmId] = useState("");
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [selectedCropCycleId, setSelectedCropCycleId] = useState("");

  const [activeFormTab, setActiveFormTab] = useState<"monitoring" | "incident">("monitoring");
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
      .then((list: Pick<Farm, "id" | "name">[]) => {
        setFarms(list);
        if (list.length > 0) {
          handleFarmSelect(list[0].id);
        }
      })
      .catch(() => setMessage("Unable to load assigned farms."));
  }, []);

  async function handleFarmSelect(id: string) {
    setSelectedFarmId(id);
    setSelectedPlotId("");
    setSelectedCropCycleId("");
    setFarm(null);
    if (!id) return;
    try {
      const r = await fetch(`/api/farms/${id}`);
      if (r.ok) {
        const data = await r.json();
        setFarm(data);
        if (data.plots?.length > 0) {
          setSelectedPlotId(data.plots[0].id);
          if (data.plots[0].cropCycles?.length > 0) {
            setSelectedCropCycleId(data.plots[0].cropCycles[0].id);
          }
        }
      } else {
        setMessage("Unable to load farm plots.");
      }
    } catch {
      setMessage("Network error loading farm.");
    }
  }

  const selectedPlot = farm?.plots.find((p) => p.id === selectedPlotId);
  const availableCrops = selectedPlot?.cropCycles ?? [];

  async function handleMonitoringSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const formEl = event.currentTarget;
    const form = new FormData(formEl);

    try {
      const mediaIds = await uploadPhotos(selectedFarmId, "CROP_PHOTO", form.getAll("photos"));
      if (!mediaIds.length) throw new Error("At least one crop photo is mandatory (BRD §24).");

      const response = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: selectedFarmId,
          plotId: selectedPlotId,
          cropCycleId: selectedCropCycleId,
          status: healthStatus,
          stage: form.get("stage"),
          impactPercent: healthStatus === "POOR" ? Number(form.get("impactPercent")) : null,
          remarks: form.get("remarks") || null,
          mediaIds,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.error ?? "Monitoring update failed.");
      }

      formEl?.reset();
      setMonitoringPhotos([]);
      setMessage("Daily crop monitoring update recorded & synchronized with agronomy.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Monitoring update failed.");
    } finally {
      setPending(false);
    }
  }

  async function handleIncidentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    const formEl = event.currentTarget;
    const form = new FormData(formEl);

    try {
      const mediaIds = await uploadPhotos(selectedFarmId, "INCIDENT_PHOTO", form.getAll("photos"));
      const response = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: selectedFarmId,
          level: incidentLevel,
          plotId: incidentLevel === "FARM" ? null : selectedPlotId,
          cropCycleId: incidentLevel === "CROP" ? selectedCropCycleId : null,
          type: incidentTypeInput || form.get("type"),
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
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Incident report failed.");
    } finally {
      setPending(false);
    }
  }

  return (
    <section>
      {/* Form Tabs */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeFormTab === "monitoring" ? "active" : ""}`}
          onClick={() => {
            setActiveFormTab("monitoring");
            setMessage("");
          }}
        >
          <Icons.Sprout size={16} />
          <span>Daily Crop Monitoring (BRD §24)</span>
        </button>

        <button
          type="button"
          className={`tab-btn ${activeFormTab === "incident" ? "active" : ""}`}
          onClick={() => {
            setActiveFormTab("incident");
            setMessage("");
          }}
        >
          <Icons.AlertTriangle size={16} />
          <span>Report Field Incident (BRD §26)</span>
        </button>
      </div>

      {message && (
        <div
          className={
            message.includes("recorded") || message.includes("transmitted") || message.includes("synchronized")
              ? "hint"
              : "error"
          }
          role="status"
        >
          {message.includes("recorded") || message.includes("transmitted") || message.includes("synchronized") ? (
            <Icons.CheckCircle size={18} />
          ) : (
            <Icons.AlertCircle size={18} />
          )}
          <span>{message}</span>
        </div>
      )}

      {/* FORM 1: DAILY CROP MONITORING */}
      {activeFormTab === "monitoring" && (
        <article className="card">
          <div className="card-header">
            <div>
              <h3>Daily Crop Health & Stage Capture</h3>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Mandatory daily visual monitoring update for active crop cycles (BRD §24 & §25).
              </p>
            </div>
          </div>

          <form className="form" onSubmit={handleMonitoringSubmit}>
            <div className="two-column">
              <div className="form-group">
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

              <div className="form-group">
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

              <div className="form-group wide">
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

            {/* Health Classification Cards */}
            <div className="form-group">
              <label>Crop Health Status</label>
              <div className="choice-grid">
                <div
                  className={`choice-card ${healthStatus === "GOOD" ? "selected" : ""}`}
                  onClick={() => setHealthStatus("GOOD")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icons.CheckCircle size={18} style={{ color: "var(--primary-600)" }} />
                    <strong style={{ color: "var(--primary-800)" }}>Good Crop Health</strong>
                  </div>
                  <small>Vigorous growth, healthy foliage, normal canopy</small>
                </div>

                <div
                  className={`choice-card ${healthStatus === "POOR" ? "selected-danger" : ""}`}
                  onClick={() => setHealthStatus("POOR")}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <Icons.AlertTriangle size={18} style={{ color: "var(--danger-red)" }} />
                    <strong style={{ color: "var(--danger-red)" }}>Poor Crop Health</strong>
                  </div>
                  <small>Yellowing, wilting, pest stress, stunted growth</small>
                </div>
              </div>
            </div>

            <div className="two-column">
              <div className="form-group">
                <label>Crop Growth Stage (BRD §25)</label>
                <select name="stage" defaultValue="Vegetative" required>
                  {cropStages.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {healthStatus === "POOR" && (
                <div className="form-group">
                  <label>Estimated Impact Percentage (%)</label>
                  <input
                    name="impactPercent"
                    type="number"
                    min="1"
                    max="100"
                    step="0.1"
                    placeholder="e.g., 25"
                    required={healthStatus === "POOR"}
                  />
                  <small className="muted">Required for poor crop status</small>
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Crop Photos (Mandatory &bull; At least 1 photo)</label>
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
                <div className="upload-previews">
                  {monitoringPhotos.map((src, i) => (
                    <div className="upload-preview-item" key={i}>
                      <img src={src} alt="Monitoring preview" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="form-group">
              <label>Remarks & Observations</label>
              <textarea
                name="remarks"
                maxLength={2000}
                placeholder="Describe field conditions, leaf coloration, pest presence, soil moisture…"
                rows={3}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending || !selectedCropCycleId}
              style={{ width: "100%", padding: "14px 20px" }}
            >
              <Icons.Check size={18} />
              <span>{pending ? "Uploading photos & recording…" : "Submit Daily Monitoring"}</span>
            </button>
          </form>
        </article>
      )}

      {/* FORM 2: REPORT INCIDENT */}
      {activeFormTab === "incident" && (
        <article className="card">
          <div className="card-header">
            <div>
              <h3>Report Field Incident</h3>
              <p className="muted" style={{ fontSize: "0.85rem" }}>
                Report pests, infrastructure failures, water stress, or positive best practices (BRD §26 & §27).
              </p>
            </div>
          </div>

          <form className="form" onSubmit={handleIncidentSubmit}>
            <div className="form-group">
              <label>Incident Level</label>
              <div className="choice-grid" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
                <div
                  className={`choice-card ${incidentLevel === "FARM" ? "selected" : ""}`}
                  onClick={() => setIncidentLevel("FARM")}
                >
                  <strong>Farm Level</strong>
                  <small>Motor, pump, power, labour</small>
                </div>

                <div
                  className={`choice-card ${incidentLevel === "PLOT" ? "selected" : ""}`}
                  onClick={() => setIncidentLevel("PLOT")}
                >
                  <strong>Plot Level</strong>
                  <small>Irrigation leak, soil issue</small>
                </div>

                <div
                  className={`choice-card ${incidentLevel === "CROP" ? "selected" : ""}`}
                  onClick={() => setIncidentLevel("CROP")}
                >
                  <strong>Crop Level</strong>
                  <small>Disease, pest, nutrition</small>
                </div>
              </div>
            </div>

            <div className="two-column">
              <div className="form-group">
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
                <div className="form-group">
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
                <div className="form-group wide">
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

            {/* Quick Incident Type Suggestions */}
            <div className="form-group">
              <label>Incident Type</label>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
                {incidentTypes.map((type) => (
                  <button
                    key={type}
                    type="button"
                    className="btn btn-sm btn-secondary"
                    onClick={() => setIncidentTypeInput(type)}
                    style={{
                      fontSize: "0.78rem",
                      background: incidentTypeInput === type ? "var(--primary-50)" : "white",
                      borderColor: incidentTypeInput === type ? "var(--primary-500)" : "var(--border-subtle)",
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
              <input
                name="type"
                value={incidentTypeInput}
                onChange={(e) => setIncidentTypeInput(e.target.value)}
                placeholder="Select suggestion above or type custom incident title…"
                required
              />
            </div>

            <div className="two-column">
              <div className="form-group">
                <label>Severity</label>
                <select name="severity" defaultValue="MEDIUM">
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="CRITICAL">Critical</option>
                </select>
              </div>

              <div className="form-group">
                <label>Estimated Impact % (Optional)</label>
                <input name="impactPercent" type="number" min="0" max="100" step="0.1" placeholder="e.g., 15" />
              </div>
            </div>

            <div className="form-group">
              <label>Description & Scope</label>
              <textarea
                name="description"
                minLength={5}
                maxLength={2000}
                placeholder="Detailed description of the issue or positive observation…"
                rows={3}
                required
              />
            </div>

            <div className="form-group">
              <label>Incident Photos (Optional)</label>
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
                <div className="upload-previews">
                  {incidentPhotos.map((src, i) => (
                    <div className="upload-preview-item" key={i}>
                      <img src={src} alt="Incident preview" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              disabled={pending || !selectedFarmId}
              style={{ width: "100%", padding: "14px 20px" }}
            >
              <Icons.AlertTriangle size={18} />
              <span>{pending ? "Transmitting incident…" : "Transmit Incident to Agronomist"}</span>
            </button>
          </form>
        </article>
      )}
    </section>
  );
}
