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

export interface TaskFormProps {
  initialDate?: string;
  initialFarmId?: string;
  initialPlotId?: string;
  initialCropCycleId?: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function TaskForm({
  initialDate,
  initialFarmId,
  initialPlotId,
  initialCropCycleId,
  onSuccess,
  onCancel,
}: TaskFormProps = {}) {
  const router = useRouter();
  const [farms, setFarms] = useState<Farm[]>([]);
  const [plots, setPlots] = useState<Plot[]>([]);
  const [access, setAccess] = useState<Access[]>([]);
  const [farmId, setFarmId] = useState(initialFarmId || "");
  const [plotId, setPlotId] = useState(initialPlotId || "");
  const [cropCycleId, setCropCycleId] = useState(initialCropCycleId || "");
  const [category, setCategory] = useState<string>("FERTIGATION");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [planDate, setPlanDate] = useState(() => initialDate || new Date().toISOString().slice(0, 10));

  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    fetch("/api/farms")
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((list: Farm[]) => {
        setFarms(list);
        if (!farmId && list.length > 0) {
          setFarmId(list[0].id);
        }
      })
      .catch(() => setError("Unable to load farms."));
  }, [farmId]);

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
        if (initialPlotId) setPlotId(initialPlotId);
        if (initialCropCycleId) setCropCycleId(initialCropCycleId);
      })
      .catch(() => setError("Unable to load farm planning data."));
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
        setError(body.error ?? "Failed to create activity.");
        return;
      }

      if (onSuccess) {
        onSuccess();
      } else {
        router.push("/tasks");
        router.refresh();
      }
    } catch {
      setPending(false);
      setError("Network error creating activity.");
    }
  }

  const selectedPlot = plots.find((p) => p.id === plotId);

  return (
    <form onSubmit={submit} className="card" style={{ padding: 28, display: "grid", gap: 20 }}>
      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      {/* Target Farm & Officer */}
      <div className="two-column">
        <div className="form-group" style={{ margin: 0 }}>
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

        <div className="form-group" style={{ margin: 0 }}>
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

        <div className="form-group" style={{ margin: 0 }}>
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

        <div className="form-group" style={{ margin: 0 }}>
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
        <div className="form-group" style={{ margin: 0 }}>
          <label>Execution Date (Within 7 Days)</label>
          <input
            name="date"
            type="date"
            value={planDate}
            onChange={(e) => setPlanDate(e.target.value)}
            required
          />
        </div>

        <div className="form-group" style={{ margin: 0 }}>
          <label>Priority Level</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 70px), 1fr))", gap: 6 }}>
            {["LOW", "MEDIUM", "HIGH", "URGENT"].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPriority(p)}
                style={{
                  padding: "8px 4px",
                  borderRadius: "var(--radius-xs)",
                  background: priority === p ? "var(--primary)" : "var(--soft-stone)",
                  color: priority === p ? "var(--on-primary)" : "var(--ink)",
                  border: `1px solid ${priority === p ? "var(--primary)" : "var(--hairline)"}`,
                  fontSize: 11,
                  fontWeight: 600,
                  fontFamily: "var(--font-mono)",
                  cursor: "pointer",
                }}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category Grid */}
      <div className="form-group" style={{ margin: 0 }}>
        <label>Activity Category (BRD §20)</label>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 8 }}>
          {categories.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                padding: "8px 12px",
                borderRadius: "var(--radius-xs)",
                background: category === cat.value ? "var(--primary)" : "var(--canvas)",
                color: category === cat.value ? "var(--on-primary)" : "var(--ink)",
                border: `1px solid ${category === cat.value ? "var(--primary)" : "var(--hairline)"}`,
                fontSize: 13,
                fontWeight: 500,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <Icons.Sprout size={14} />
              <span>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Title, Instructions, Description */}
      <div className="form-group" style={{ margin: 0 }}>
        <label>Activity Title</label>
        <input
          name="title"
          placeholder="e.g. 19:19:19 Drip Fertigation Cycle (Week 3)"
          required
        />
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Agronomist Guidance / Technical Instructions (Optional)</label>
        <input
          name="instructions"
          placeholder="e.g. Mix 2.5kg 19-19-19 in 200L tank; run venturi for 45 min"
        />
      </div>

      <div className="form-group" style={{ margin: 0 }}>
        <label>Detailed Description</label>
        <textarea
          name="description"
          placeholder="Explain field objectives, dose recommendations, and execution prerequisites…"
          rows={3}
          required
        />
      </div>

      <div style={{ display: "flex", gap: 12, justifyContent: "flex-end", marginTop: 8 }}>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={() => router.back()}
        >
          Cancel
        </button>
        <button
          type="submit"
          className="btn btn-primary"
          disabled={pending || !farmId}
        >
          <span>{pending ? "Dispatching…" : "Dispatch to Officer"}</span>
          <Icons.ArrowRight size={14} />
        </button>
      </div>
    </form>
  );
}
