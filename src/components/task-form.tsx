"use client";
/* eslint-disable react-hooks/set-state-in-effect */
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";

type Farm = { id: string; name: string };
type Plot = { id: string; name: string; status: string; cropCycles: { id: string; cropName: string; status: string }[] };
type Access = { user: { id: string; name: string; role: string; active?: boolean } };

const categories = [
  "FERTIGATION", "FOLIAR_NUTRITION", "SOIL_APPLICATION", "PREVENTIVE_SPRAY",
  "PEST_CONTROL", "DISEASE_CONTROL", "CROP_MONITORING", "IRRIGATION_RECOMMENDATION", "CULTURAL_PRACTICE", "CROP_SPECIFIC",
];

export function TaskForm({
  initialDate, initialFarmId, initialPlotId, initialCropCycleId, onSuccess, onCancel,
}: {
  initialDate?: string; initialFarmId?: string; initialPlotId?: string; initialCropCycleId?: string;
  onSuccess?: () => void; onCancel?: () => void;
} = {}) {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [access, setAccess] = useState<Access[]>([]);
  const [farmId, setFarmId] = useState(initialFarmId || "");
  const [plotId, setPlotId] = useState(initialPlotId || "");
  const [cropCycleId, setCropCycleId] = useState(initialCropCycleId || "");
  const [category, setCategory] = useState("FERTIGATION");
  const [priority, setPriority] = useState("MEDIUM");
  const [planDate, setPlanDate] = useState(() => initialDate || new Date().toISOString().slice(0, 10));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/farms").then((r) => r.ok ? r.json() : []).then((list) => {
      setFarms(list);
      if (!farmId && list.length > 0) setFarmId(list[0].id);
    });
  }, [farmId]);

  useEffect(() => {
    if (!farmId) { setPlots([]); setAccess([]); return; }
    fetch(`/api/farms/${farmId}`).then((r) => r.ok ? r.json() : null).then((f) => {
      if (!f) return;
      setAccess((f.access ?? []).filter((a: Access) => a.user.role === "FARM_OFFICER" && a.user.active !== false));
      setPlots(f.plots ?? []);
      if (initialPlotId) setPlotId(initialPlotId);
      if (initialCropCycleId) setCropCycleId(initialCropCycleId);
    });
  }, [farmId, initialPlotId, initialCropCycleId]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    setError("");
    const f = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId, date: planDate, plotId: plotId || null, cropCycleId: cropCycleId || null,
          category, title: f.get("title"), description: f.get("description"), instructions: f.get("instructions") || null,
          priority, assignedOfficerId: f.get("assignedOfficerId"),
        }),
      });
      setPending(false);
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Failed to create activity.");
      if (onSuccess) onSuccess();
      else { router.push("/tasks"); router.refresh(); }
    } catch (err: any) {
      setPending(false);
      setError(err.message ?? "Network error.");
    }
  }

  const selectedPlot = plots.find((p) => p.id === plotId);

  return (
    <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <div>
        <div className="form-section-title">1. Target Location &amp; Assignment</div>
        <div className="two-column" style={{ marginTop: 12 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Target Farm</label>
            <select value={farmId} onChange={(e) => { setFarmId(e.target.value); setPlotId(""); setCropCycleId(""); }} required>
              {farms.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Assign to Officer</label>
            <select name="assignedOfficerId" required>
              <option value="">Select Farm Officer…</option>
              {access.map((a) => (<option key={a.user.id} value={a.user.id}>{a.user.name}</option>))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Target Plot (Optional)</label>
            <select value={plotId} onChange={(e) => { setPlotId(e.target.value); setCropCycleId(""); }}>
              <option value="">Farm Wide (No Specific Plot)</option>
              {plots.map((p) => (<option key={p.id} value={p.id}>{p.name}</option>))}
            </select>
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Target Crop Cycle (Optional)</label>
            <select value={cropCycleId} onChange={(e) => setCropCycleId(e.target.value)} disabled={!selectedPlot?.cropCycles?.length}>
              <option value="">Plot Wide</option>
              {selectedPlot?.cropCycles?.map((c) => (<option key={c.id} value={c.id}>{c.cropName}</option>))}
            </select>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="form-section-title">2. Activity Specification</div>
        <div className="two-column" style={{ marginTop: 12 }}>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Execution Date</label>
            <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} required />
          </div>
          <div className="form-group" style={{ margin: 0 }}>
            <label>Priority</label>
            <select value={priority} onChange={(e) => setPriority(e.target.value)}>
              <option value="LOW">Low</option>
              <option value="MEDIUM">Medium</option>
              <option value="HIGH">High</option>
              <option value="URGENT">Urgent</option>
            </select>
          </div>
        </div>

        <div className="form-group" style={{ margin: 0, marginTop: 12 }}>
          <label>Activity Category</label>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((c) => (<option key={c} value={c}>{c.replaceAll("_", " ")}</option>))}
          </select>
        </div>

        <div className="form-group" style={{ margin: 0, marginTop: 12 }}>
          <label>Activity Title</label>
          <input name="title" placeholder="e.g. 19:19:19 Drip Fertigation - 2.5 kg/acre" required />
        </div>

        <div className="form-group" style={{ margin: 0, marginTop: 12 }}>
          <label>Task Instructions &amp; Description</label>
          <textarea name="description" rows={2} placeholder="Explain steps for field officer execution." required />
        </div>

        <div className="form-group" style={{ margin: 0, marginTop: 12 }}>
          <label>Agronomist Guidance &amp; Mixing Instructions</label>
          <textarea name="instructions" rows={2} placeholder="e.g. Dissolve completely in tank B; check pH 6.2 before injection." />
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", borderTop: "1px solid var(--line)", paddingTop: 16 }}>
        {onCancel && <button type="button" className="btn btn-secondary" onClick={onCancel}>Cancel</button>}
        <button type="submit" className="btn btn-green btn-lg" disabled={pending}>
          <Icons.Check size={16} />
          <span>{pending ? "Scheduling…" : "Dispatch Activity"}</span>
        </button>
      </div>
    </form>
  );
}
