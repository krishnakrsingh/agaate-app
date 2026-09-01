"use client";
/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
import { FormEvent, useEffect, useState } from "react";
import { Icons } from "./icons";

type Cycle = { id: string; cropName: string };
type Plot = { id: string; name: string; cropCycles: Cycle[] };
type Farm = { id: string; name: string; plots: Plot[] };

const incidentTypes = ["Disease Infestation", "Pest Damage", "Nutrient Deficiency", "Water Stress", "Pump / Motor Failure", "Irrigation Leakage", "Labour Shortage", "Other"];
const cropStages = ["Germination", "Establishment", "Vegetative", "Flowering", "Fruiting", "Harvesting"];

async function uploadPhotos(farmId: string, kind: "CROP_PHOTO" | "INCIDENT_PHOTO", files: FormDataEntryValue[]) {
  const ids: string[] = [];
  for (const file of files) {
    if (!(file instanceof File) || !file.size) continue;
    const signed = await fetch("/api/uploads/presign", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ farmId, kind, mimeType: file.type, sizeBytes: file.size }),
    });
    if (!signed.ok) throw new Error((await signed.json()).error ?? "Could not prepare upload.");
    const { uploadUrl, mediaId } = await signed.json();
    const stored = await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file });
    if (!stored.ok) throw new Error("Photo upload failed.");
    await fetch(`/api/uploads/${mediaId}/complete`, { method: "POST" });
    ids.push(mediaId);
  }
  return ids;
}

export function FieldReports({
  initialFarmId, initialPlotId, initialCropCycleId, initialTab = "monitoring", onSuccess, onCancel, hideTabs = false,
}: {
  initialFarmId?: string; initialPlotId?: string; initialCropCycleId?: string; initialTab?: "monitoring" | "incident";
  onSuccess?: () => void; onCancel?: () => void; hideTabs?: boolean;
} = {}) {
  const [farms, setFarms] = useState<Array<{ id: string; name: string }>>([]);
  const [farm, setFarm] = useState<Farm | null>(null);
  const [farmId, setFarmId] = useState(initialFarmId || "");
  const [plotId, setPlotId] = useState(initialPlotId || "");
  const [cycleId, setCycleId] = useState(initialCropCycleId || "");
  const [tab, setTab] = useState<"monitoring" | "incident">(initialTab);
  const [health, setHealth] = useState<"GOOD" | "POOR">("GOOD");
  const [incidentLevel, setIncidentLevel] = useState<"FARM" | "PLOT" | "CROP">("CROP");
  const [monitoringPhotos, setMonitoringPhotos] = useState<string[]>([]);
  const [incidentPhotos, setIncidentPhotos] = useState<string[]>([]);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/farms").then((r) => r.ok ? r.json() : []).then((list) => {
      setFarms(list);
      if (!farmId && list.length > 0) setFarmId(list[0].id);
    });
  }, [farmId]);

  useEffect(() => {
    if (!farmId) { setFarm(null); return; }
    fetch(`/api/farms/${farmId}`).then((r) => r.ok ? r.json() : null).then((f) => {
      setFarm(f);
      if (initialPlotId) setPlotId(initialPlotId);
      if (initialCropCycleId) setCycleId(initialCropCycleId);
    });
  }, [farmId, initialPlotId, initialCropCycleId]);

  const activePlot = farm?.plots.find((p) => p.id === plotId);
  const availableCrops = activePlot?.cropCycles ?? [];

  async function submitMonitoring(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      if (!farmId || !plotId || !cycleId) throw new Error("Select farm, plot, and crop cycle.");
      const photos = f.getAll("photos");
      if (!photos.length || !(photos[0] instanceof File) || !photos[0].size) {
        throw new Error("At least one crop photo is required.");
      }
      const mediaIds = await uploadPhotos(farmId, "CROP_PHOTO", photos);
      const res = await fetch("/api/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cropCycleId: cycleId,
          status: health,
          stage: f.get("stage"),
          impactPercent: health === "POOR" && f.get("impactPercent") ? Number(f.get("impactPercent")) : null,
          remarks: f.get("remarks") || null,
          mediaIds,
        }),
      });
      setPending(false);
      if (!res.ok) throw new Error((await res.json()).error ?? "Submission failed.");
      setMessage("Crop monitoring logged successfully.");
      setMonitoringPhotos([]);
      onSuccess?.();
    } catch (err: any) {
      setPending(false);
      setMessage(err.message ?? "Error submitting monitoring report.");
    }
  }

  async function submitIncident(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setMessage("");
    const f = new FormData(e.currentTarget);
    try {
      if (!farmId) throw new Error("Please select a farm.");
      const photos = f.getAll("photos");
      const mediaIds = await uploadPhotos(farmId, "INCIDENT_PHOTO", photos);
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId,
          plotId: incidentLevel !== "FARM" ? plotId || null : null,
          cropCycleId: incidentLevel === "CROP" ? cycleId || null : null,
          level: incidentLevel,
          type: f.get("type"),
          severity: f.get("severity") || null,
          description: f.get("description"),
          mediaIds,
        }),
      });
      setPending(false);
      if (!res.ok) throw new Error((await res.json()).error ?? "Incident submission failed.");
      setMessage("Field incident logged.");
      setIncidentPhotos([]);
      onSuccess?.();
    } catch (err: any) {
      setPending(false);
      setMessage(err.message ?? "Error submitting incident.");
    }
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      {!hideTabs && (
        <div className="tabs-nav" style={{ margin: 0 }}>
          <button type="button" className={`tab-btn ${tab === "monitoring" ? "active" : ""}`} onClick={() => setTab("monitoring")}>
            <Icons.Eye size={15} /><span>Daily Crop Health Monitoring</span>
          </button>
          <button type="button" className={`tab-btn ${tab === "incident" ? "active" : ""}`} onClick={() => setTab("incident")}>
            <Icons.AlertTriangle size={15} /><span>Report Field Incident</span>
          </button>
        </div>
      )}

      {/* Target Cascading Selects */}
      <div className="card" style={{ padding: 18, display: "grid", gap: 12 }}>
        <div className="two-column">
          <div className="form-group" style={{ margin: 0 }}>
            <label>Target Farm</label>
            <select value={farmId} onChange={(e) => { setFarmId(e.target.value); setPlotId(""); setCycleId(""); }} required>
              {farms.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Target Plot</label>
            <select value={plotId} onChange={(e) => { setPlotId(e.target.value); setCycleId(""); }} disabled={!farm?.plots?.length}>
              <option value="">Select plot…</option>
              {farm?.plots.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          {tab === "monitoring" && (
            <div className="form-group wide" style={{ margin: 0 }}>
              <label>Target Crop Cycle</label>
              <select value={cycleId} onChange={(e) => setCycleId(e.target.value)} disabled={!availableCrops.length} required>
                <option value="">Select crop cycle…</option>
                {availableCrops.map((c) => (<option key={c.id} value={c.id}>{c.cropName}</option>))}
              </select>
            </div>
          )}
        </div>
      </div>

      {message && <div className={message.includes("success") || message.includes("logged") ? "success-banner" : "error"} role="status"><span>{message}</span></div>}

      {/* FORM: MONITORING */}
      {tab === "monitoring" && (
        <form onSubmit={submitMonitoring} className="card" style={{ padding: 22, display: "grid", gap: 14 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Crop Health Condition</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              <button type="button" className={`btn ${health === "GOOD" ? "btn-primary" : "btn-secondary"}`} onClick={() => setHealth("GOOD")}>
                <Icons.CheckCircle size={16} /><span>Good / Healthy</span>
              </button>
              <button type="button" className={`btn ${health === "POOR" ? "btn-danger" : "btn-secondary"}`} onClick={() => setHealth("POOR")}>
                <Icons.AlertTriangle size={16} /><span>Poor / Distressed</span>
              </button>
            </div>
          </div>

          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Growth Stage</label>
              <select name="stage" required>{cropStages.map((s) => (<option key={s} value={s}>{s}</option>))}</select>
            </div>
            {health === "POOR" && (
              <div className="form-group" style={{ margin: 0 }}>
                <label>Estimated Yield Impact (%)</label>
                <input name="impactPercent" type="number" min="1" max="100" placeholder="e.g., 20" required />
              </div>
            )}
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Field Observations & Remarks</label>
            <textarea name="remarks" rows={2} placeholder="e.g. Excellent foliage, robust fruit setting observed." />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Evidence Photos (Required)</label>
            <input type="file" name="photos" accept="image/*" multiple onChange={(e) => setMonitoringPhotos(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))} required />
            {monitoringPhotos.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {monitoringPhotos.map((src, i) => (<img key={i} src={src} alt="preview" style={{ width: 60, height: 60, borderRadius: "var(--radius-sm)", objectFit: "cover" }} />))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
            <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
              <Icons.Check size={16} /><span>{pending ? "Logging…" : "Log Crop Health"}</span>
            </button>
          </div>
        </form>
      )}

      {/* FORM: INCIDENT */}
      {tab === "incident" && (
        <form onSubmit={submitIncident} className="card" style={{ padding: 22, display: "grid", gap: 14 }}>
          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}>
              <label>Incident Level</label>
              <select value={incidentLevel} onChange={(e: any) => setIncidentLevel(e.target.value)}>
                <option value="CROP">Crop Specific</option>
                <option value="PLOT">Plot Infrastructure</option>
                <option value="FARM">Estate Wide</option>
              </select>
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label>Severity</label>
              <select name="severity" defaultValue="HIGH">
                <option value="CRITICAL">Critical (Immediate Stop)</option>
                <option value="HIGH">High (Action Needed 24h)</option>
                <option value="MEDIUM">Medium</option>
                <option value="LOW">Low</option>
              </select>
            </div>
            <div className="form-group wide" style={{ margin: 0 }}>
              <label>Incident Classification</label>
              <select name="type" required>{incidentTypes.map((t) => (<option key={t} value={t}>{t}</option>))}</select>
            </div>
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Incident Details</label>
            <textarea name="description" rows={3} placeholder="Describe the issue, affected beds, and immediate mitigation." required />
          </div>

          <div className="form-group" style={{ margin: 0 }}>
            <label>Incident Evidence Photos (Optional)</label>
            <input type="file" name="photos" accept="image/*" multiple onChange={(e) => setIncidentPhotos(Array.from(e.target.files ?? []).map((f) => URL.createObjectURL(f)))} />
            {incidentPhotos.length > 0 && (
              <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                {incidentPhotos.map((src, i) => (<img key={i} src={src} alt="preview" style={{ width: 60, height: 60, borderRadius: "var(--radius-sm)", objectFit: "cover" }} />))}
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
            {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
            <button type="submit" className="btn btn-danger btn-lg" disabled={pending}>
              <Icons.AlertTriangle size={16} /><span>{pending ? "Logging…" : "Log Field Incident"}</span>
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
