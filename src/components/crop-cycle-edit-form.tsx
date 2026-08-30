"use client";
import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";

type Cycle = {
  id: string;
  cropName: string;
  startDate: string;
  expectedFirstHarvestDate: string | null;
  establishmentType: string;
  bedPreparationEnabled: boolean;
  bedWidthCm: string | null;
  bedCenterDistanceCm: string | null;
  expectedBedsPerAcre: string | null;
  mulchEnabled: boolean;
  mulchHolePattern: string | null;
  plantDistanceCm: string | null;
  expectedPlantsPerAcre: string | null;
  varieties: { name: string }[];
  milestones: { id: string; name: string; targetDate: string; remarks: string | null }[];
};

const dateValue = (value: string | null) =>
  value ? new Date(value).toISOString().slice(0, 10) : "";

export function CropCycleEditForm({
  plotId,
  cycleId,
  farmId,
}: {
  plotId: string;
  cycleId: string;
  farmId: string;
}) {
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [mulchEnabled, setMulchEnabled] = useState(false);
  const [bedPrepEnabled, setBedPrepEnabled] = useState(false);

  useEffect(() => {
    fetch(`/api/plots/${plotId}/crop-cycles/${cycleId}`)
      .then(async (r) => {
        if (!r.ok) throw new Error((await r.json()).error ?? "Unable to load crop cycle.");
        return r.json();
      })
      .then((data: Cycle) => {
        setCycle(data);
        setMulchEnabled(data.mulchEnabled);
        setBedPrepEnabled(data.bedPreparationEnabled);
      })
      .catch((e) => setError(e.message));
  }, [plotId, cycleId]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cycle) return;
    setPending(true);
    setError("");
    const f = new FormData(event.currentTarget);

    const newEstablishment = String(f.get("establishmentType"));
    const newMulch = mulchEnabled;
    const dynamicReadiness = newMulch
      ? "Mulching & TP / Sowing Readiness"
      : "TP / Sowing Readiness";
    const dynamicExecution =
      newEstablishment === "NURSERY_TRANSPLANTATION" ? "Transplantation" : "Direct Sowing";

    const milestoneIds = cycle.milestones.map((m) => m.id);
    const milestones = milestoneIds
      .map((id, index) => {
        let name = String(f.get(`milestoneName${index}`));
        if (name === "TP / Sowing Readiness" || name === "Mulching & TP / Sowing Readiness")
          name = dynamicReadiness;
        if (name === "Transplantation" || name === "Direct Sowing") name = dynamicExecution;
        return {
          id,
          name,
          targetDate: f.get(`milestoneDate${index}`),
          remarks: f.get(`milestoneRemarks${index}`) || null,
          remove: f.get(`removeMilestone${index}`) === "on",
        };
      })
      .filter((m) => !m.remove)
      .map(({ remove, ...m }) => m);

    try {
      const response = await fetch(`/api/plots/${plotId}/crop-cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cropName: f.get("cropName"),
          startDate: f.get("startDate"),
          expectedFirstHarvestDate: f.get("harvestDate") || null,
          establishmentType: f.get("establishmentType"),
          varieties: String(f.get("varieties"))
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean),
          bedPreparationEnabled: bedPrepEnabled,
          bedWidthCm: f.get("bedWidthCm") ? Number(f.get("bedWidthCm")) : null,
          bedCenterDistanceCm: f.get("bedCenterDistanceCm")
            ? Number(f.get("bedCenterDistanceCm"))
            : null,
          expectedBedsPerAcre: f.get("expectedBedsPerAcre")
            ? Number(f.get("expectedBedsPerAcre"))
            : null,
          mulchEnabled,
          mulchHolePattern: mulchEnabled ? f.get("mulchHolePattern") : null,
          plantDistanceCm: f.get("plantDistanceCm") ? Number(f.get("plantDistanceCm")) : null,
          expectedPlantsPerAcre: f.get("expectedPlantsPerAcre")
            ? Number(f.get("expectedPlantsPerAcre"))
            : null,
          milestones,
        }),
      });
      setPending(false);

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error ?? "Unable to save crop cycle.");
        return;
      }

      router.replace(`/farms/${farmId}`);
      router.refresh();
    } catch {
      setPending(false);
      setError("Network error.");
    }
  }

  if (!cycle) {
    return (
      <div className="card">
        <p className={error ? "error" : "hint"}>{error || "Loading crop cycle configuration…"}</p>
      </div>
    );
  }

  return (
    <form className="card form" onSubmit={submit}>
      <div className="card-header">
        <div>
          <h2>Edit Crop Cycle & Milestones</h2>
          <p className="muted" style={{ fontSize: "0.88rem" }}>
            Update variety assignments, mulch settings, and target dates.
          </p>
        </div>
      </div>

      <div className="two-column">
        <div className="form-group">
          <label>Crop name</label>
          <input name="cropName" defaultValue={cycle.cropName} required />
        </div>

        <div className="form-group">
          <label>Varieties (comma separated)</label>
          <input
            name="varieties"
            defaultValue={cycle.varieties.map((v) => v.name).join(", ")}
            required
          />
        </div>

        <div className="form-group">
          <label>Cycle start date</label>
          <input
            name="startDate"
            type="date"
            defaultValue={dateValue(cycle.startDate)}
            required
          />
        </div>

        <div className="form-group">
          <label>Expected first harvest date</label>
          <input
            name="harvestDate"
            type="date"
            defaultValue={dateValue(cycle.expectedFirstHarvestDate)}
          />
        </div>

        <div className="form-group">
          <label>Establishment type</label>
          <select name="establishmentType" defaultValue={cycle.establishmentType}>
            <option value="NURSERY_TRANSPLANTATION">Nursery Transplantation</option>
            <option value="DIRECT_SOWING">Direct Sowing</option>
          </select>
        </div>

        <div className="form-group">
          <label>Expected plants / acre</label>
          <input
            name="expectedPlantsPerAcre"
            type="number"
            min="1"
            step="1"
            defaultValue={cycle.expectedPlantsPerAcre ?? ""}
          />
        </div>
      </div>

      <fieldset>
        <legend>Bed Preparation</legend>
        <label className="check">
          <input
            name="bedPreparationEnabled"
            type="checkbox"
            checked={bedPrepEnabled}
            onChange={(e) => setBedPrepEnabled(e.target.checked)}
          />
          <strong>Required for this cycle</strong>
        </label>

        {bedPrepEnabled && (
          <div className="two-column" style={{ marginTop: 8 }}>
            <div className="form-group">
              <label>Bed width (cm)</label>
              <input
                name="bedWidthCm"
                type="number"
                min="0.1"
                step="0.1"
                defaultValue={cycle.bedWidthCm ?? ""}
              />
            </div>

            <div className="form-group">
              <label>Centre-to-centre (cm)</label>
              <input
                name="bedCenterDistanceCm"
                type="number"
                min="0.1"
                step="0.1"
                defaultValue={cycle.bedCenterDistanceCm ?? ""}
              />
            </div>

            <div className="form-group wide">
              <label>Expected beds / acre</label>
              <input
                name="expectedBedsPerAcre"
                type="number"
                min="1"
                step="0.1"
                defaultValue={cycle.expectedBedsPerAcre ?? ""}
              />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Mulching</legend>
        <label className="check">
          <input
            name="mulchEnabled"
            type="checkbox"
            checked={mulchEnabled}
            onChange={(e) => setMulchEnabled(e.target.checked)}
          />
          <strong>Enabled</strong>
        </label>

        {mulchEnabled && (
          <div className="two-column" style={{ marginTop: 8 }}>
            <div className="form-group">
              <label>Hole pattern</label>
              <select name="mulchHolePattern" defaultValue={cycle.mulchHolePattern ?? "SINGLE_LINE"}>
                <option value="SINGLE_LINE">Single line</option>
                <option value="DOUBLE_LINE_ZIGZAG">Double line zigzag</option>
              </select>
            </div>

            <div className="form-group">
              <label>Plant distance (cm)</label>
              <input
                name="plantDistanceCm"
                type="number"
                min="0.1"
                step="0.1"
                defaultValue={cycle.plantDistanceCm ?? ""}
              />
            </div>
          </div>
        )}
      </fieldset>

      <fieldset>
        <legend>Milestones Schedule</legend>
        <div style={{ display: "grid", gap: 12 }}>
          {cycle.milestones.map((m, index) => (
            <div
              key={m.id}
              className="two-column"
              style={{
                padding: "12px 14px",
                background: "white",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <div className="form-group">
                <label>Milestone Name</label>
                <input name={`milestoneName${index}`} defaultValue={m.name} required />
              </div>

              <div className="form-group">
                <label>Target Date</label>
                <input
                  name={`milestoneDate${index}`}
                  type="date"
                  defaultValue={dateValue(m.targetDate)}
                  required
                />
              </div>

              <div className="form-group wide">
                <label>Remarks</label>
                <input name={`milestoneRemarks${index}`} defaultValue={m.remarks ?? ""} />
              </div>

              <div className="wide">
                <label className="check" style={{ color: "var(--danger-red)" }}>
                  <input name={`removeMilestone${index}`} type="checkbox" />
                  <span>Remove this milestone on save</span>
                </label>
              </div>
            </div>
          ))}
        </div>
      </fieldset>

      {error && (
        <div className="error" role="alert">
          <Icons.AlertCircle size={16} />
          <span>{error}</span>
        </div>
      )}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        <Icons.Check size={16} />
        <span>{pending ? "Saving…" : "Save Crop Cycle Changes"}</span>
      </button>
    </form>
  );
}
