"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";

type Farm = { id: string; name: string };
type Plot = {
  id: string;
  name: string;
  status: string;
  cropCycles: { id: string; cropName: string; status: string }[];
};
type Access = { user: { id: string; name: string; role: string; active?: boolean } };

const categories = [
  { value: "FERTIGATION", label: "Fertigation", icon: "Droplet" },
  { value: "FOLIAR_NUTRITION", label: "Foliar Nutrition", icon: "Leaf" },
  { value: "SOIL_APPLICATION", label: "Soil Application", icon: "Layers" },
  { value: "PREVENTIVE_SPRAY", label: "Preventive Spray", icon: "Shield" },
  { value: "PEST_CONTROL", label: "Pest Control", icon: "AlertTriangle" },
  { value: "DISEASE_CONTROL", label: "Disease Control", icon: "AlertCircle" },
  { value: "CROP_MONITORING", label: "Crop Monitoring", icon: "Eye" },
  { value: "IRRIGATION_RECOMMENDATION", label: "Irrigation Setup", icon: "Droplet" },
  { value: "CULTURAL_PRACTICE", label: "Cultural Practice", icon: "Sprout" },
  { value: "CROP_SPECIFIC", label: "Crop-Specific Activity", icon: "Activity" },
] as const;

export function TaskForm() {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [access, setAccess] = useState<Access[]>([]);
  const [farmId, setFarmId] = useState("");
  const [plotId, setPlotId] = useState("");
  const [cropCycleId, setCropCycleId] = useState("");
  const [category, setCategory] = useState<string>("FERTIGATION");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [planDate, setPlanDate] = useState(() => new Date().toISOString().slice(0, 10));

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: Farm[]) => {
        setFarms(list);
        if (list.length > 0) {
          setFarmId(list[0].id);
        }
      })
      .catch(() => setError("Unable to load farms."));
  }, []);

  useEffect(() => {
    if (!farmId) {
      setPlots([]);
      setAccess([]);
      return;
    }
    fetch(`/api/farms/${farmId}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((f) => {
        setAccess(
          (f.access ?? []).filter(
            (a: Access) => a.user.role === "FARM_OFFICER" && a.user.active !== false
          )
        );
        setPlots(f.plots ?? []);
      })
      .catch(() => setError("Unable to load farm planning data."));
  }, [farmId]);

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
          farmId,
          date: planDate,
          plotId: plotId || null,
          cropCycleId: cropCycleId || null,
          category,
          title: f.get("title"),
          description: f.get("description"),
          instructions: f.get("instructions") || null,
          priority,
          assignedOfficerId: f.get("assignedOfficerId"),
        }),
      });
      setPending(false);

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Unable to plan activity. Ensure date is within rolling 7 days.");
        return;
      }

      router.replace("/tasks");
      router.refresh();
    } catch {
      setPending(false);
      setError("Network error.");
    }
  }

  const selectedPlot = plots.find((p) => p.id === plotId);

  return (
    <form className="card form" onSubmit={submit}>
      <div className="card-header">
        <div>
          <h2>Schedule Agronomy Activity</h2>
          <p className="muted" style={{ fontSize: "0.88rem" }}>
            Create tasks within the rolling 7-day window. Tasks instantly appear in the officer&apos;s daily queue.
          </p>
        </div>
      </div>

      {/* Farm & Assignment */}
      <div className="two-column">
        <div className="form-group">
          <label>Target Farm</label>
          <select
            name="farmId"
            value={farmId}
            onChange={(e) => {
              setFarmId(e.target.value);
              setPlotId("");
              setCropCycleId("");
            }}
            required
          >
            <option value="">Select target farm…</option>
            {farms.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Assigned Farm Officer</label>
          <select name="assignedOfficerId" required disabled={!farmId}>
            <option value="">Select officer…</option>
            {access.map((a) => (
              <option key={a.user.id} value={a.user.id}>
                {a.user.name}
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label>Plot (Optional)</label>
          <select
            name="plotId"
            value={plotId}
            onChange={(e) => {
              setPlotId(e.target.value);
              setCropCycleId("");
            }}
            disabled={!farmId}
          >
            <option value="">Farm-level activity</option>
            {plots
              .filter((p) => p.status !== "ARCHIVED")
              .map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
          </select>
        </div>

        <div className="form-group">
          <label>Crop Cycle (Optional)</label>
          <select
            name="cropCycleId"
            value={cropCycleId}
            onChange={(e) => setCropCycleId(e.target.value)}
            disabled={!selectedPlot}
          >
            <option value="">Plot-level activity</option>
            {selectedPlot?.cropCycles
              .filter((c) => c.status !== "CANCELLED")
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.cropName}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Date & Priority */}
      <div className="two-column">
        <div className="form-group">
          <label>Execution Date (Within 7 Days)</label>
          <input
            name="date"
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group">
          <label>Priority Level</label>
          <div className="choice-grid" style={{ gridTemplateColumns: "repeat(4, 1fr)" }}>
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <div
                key={p}
                className={`choice-card ${priority === p ? "selected" : ""}`}
                onClick={() => setPriority(p)}
                style={{ padding: "8px 6px", textAlign: "center" }}
              >
                <span className={`priority-tag ${p.toLowerCase()}`} style={{ justifyContent: "center" }}>
                  {p}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="form-group">
        <label>Activity Category (BRD §20)</label>
        <div className="choice-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))" }}>
          {categories.map((cat) => (
            <div
              key={cat.value}
              className={`choice-card ${category === cat.value ? "selected" : ""}`}
              onClick={() => setCategory(cat.value)}
              style={{ padding: "10px 12px" }}
            >
              <strong style={{ fontSize: "0.88rem" }}>{cat.label}</strong>
            </div>
          ))}
        </div>
      </div>

      <div className="form-group">
        <label>Activity Title</label>
        <input
          name="title"
          minLength={3}
          placeholder="e.g., Foliar spray of Micronutrients + Neem Oil 1500ppm"
          required
        />
      </div>

      <div className="form-group">
        <label>Description & Scope</label>
        <textarea
          name="description"
          minLength={3}
          placeholder="Detailed activity description, dosage, dilution ratio, spray pressure…"
          rows={2}
          required
        />
      </div>

      <div className="form-group">
        <label>Technical Instructions for Officer (Optional)</label>
        <textarea
          name="instructions"
          placeholder="Special notes, spray timings (early morning / late evening), safety equipment…"
          rows={2}
        />
      </div>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <button
        type="submit"
        className="btn btn-primary"
        disabled={pending || !farmId}
        style={{ padding: "14px 24px" }}
      >
        <Icons.Calendar size={18} />
        <span>{pending ? "Scheduling activity…" : "Assign & Publish to Field Queue"}</span>
      </button>
    </form>
  );
}
