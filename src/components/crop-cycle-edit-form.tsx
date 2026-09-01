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

const dateVal = (val: string | null) => (val ? new Date(val).toISOString().slice(0, 10) : "");

export function CropCycleEditForm({ plotId, cycleId, farmId }: { plotId: string; cycleId: string; farmId: string }) {
  const router = useRouter();
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [mulchEnabled, setMulchEnabled] = useState(false);
  const [bedPrepEnabled, setBedPrepEnabled] = useState(false);
  const [extras, setExtras] = useState<Array<{ tempId: string; name: string; targetDate: string; remarks: string }>>([]);

  useEffect(() => {
    fetch(`/api/plots/${plotId}/crop-cycles/${cycleId}`)
      .then(async (r) => { if (!r.ok) throw new Error((await r.json()).error ?? "Unable to load cycle"); return r.json(); })
      .then((data: Cycle) => { setCycle(data); setMulchEnabled(data.mulchEnabled); setBedPrepEnabled(data.bedPreparationEnabled); })
      .catch((e) => setError(e.message));
  }, [plotId, cycleId]);

  function addExtra(name = "") {
    setExtras((prev) => [...prev, { tempId: Math.random().toString(36).slice(2, 9), name, targetDate: new Date().toISOString().slice(0, 10), remarks: "" }]);
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cycle) return;
    setPending(true);
    setError("");
    const f = new FormData(e.currentTarget);
    const est = String(f.get("establishmentType"));
    const readiness = mulchEnabled ? "Mulching & TP / Sowing Readiness" : "TP / Sowing Readiness";
    const execution = est === "NURSERY_TRANSPLANTATION" ? "Transplantation" : "Direct Sowing";

    const existing = cycle.milestones.map((m, idx) => {
      let name = String(f.get(`milestoneName${idx}`));
      if (name.includes("Readiness")) name = readiness;
      if (name === "Transplantation" || name === "Direct Sowing") name = execution;
      return { id: m.id, name, targetDate: f.get(`milestoneDate${idx}`), remarks: f.get(`milestoneRemarks${idx}`) || null, remove: f.get(`removeMilestone${idx}`) === "on" };
    }).filter((m) => !m.remove).map(({ remove, ...m }) => m);

    const newMilestones = extras.filter((m) => m.name.trim() && m.targetDate).map((m) => ({ name: m.name.trim(), targetDate: m.targetDate, remarks: m.remarks.trim() || null }));

    try {
      const res = await fetch(`/api/plots/${plotId}/crop-cycles/${cycleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cropName: f.get("cropName"),
          startDate: f.get("startDate"),
          expectedFirstHarvestDate: f.get("harvestDate") || null,
          establishmentType: est,
          varieties: String(f.get("varieties")).split(",").map((v) => v.trim()).filter(Boolean),
          bedPreparationEnabled: bedPrepEnabled,
          bedWidthCm: f.get("bedWidthCm") ? Number(f.get("bedWidthCm")) : null,
          bedCenterDistanceCm: f.get("bedCenterDistanceCm") ? Number(f.get("bedCenterDistanceCm")) : null,
          expectedBedsPerAcre: f.get("expectedBedsPerAcre") ? Number(f.get("expectedBedsPerAcre")) : null,
          mulchEnabled,
          mulchHolePattern: mulchEnabled ? f.get("mulchHolePattern") : null,
          plantDistanceCm: f.get("plantDistanceCm") ? Number(f.get("plantDistanceCm")) : null,
          expectedPlantsPerAcre: f.get("expectedPlantsPerAcre") ? Number(f.get("expectedPlantsPerAcre")) : null,
          milestones: [...existing, ...newMilestones],
        }),
      });
      setPending(false);
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error ?? "Unable to save crop cycle.");
        return;
      }
      router.replace(`/farms/${farmId}`);
      router.refresh();
    } catch {
      setPending(false);
      setError("Network error.");
    }
  }

  if (!cycle) return <div className="card"><p className={error ? "error" : "muted"}>{error || "Loading crop cycle…"}</p></div>;

  return (
    <form className="card" onSubmit={submit} style={{ padding: 24, display: "grid", gap: 16 }}>
      <div className="card-header">
        <div>
          <h2 style={{ margin: 0 }}>Edit Crop Cycle & Milestones</h2>
          <p className="muted" style={{ margin: "2px 0 0" }}>Update variety assignments, mulch settings, and milestone targets.</p>
        </div>
      </div>

      <div className="two-column">
        <div className="form-group" style={{ margin: 0 }}><label>Crop Name</label><input name="cropName" defaultValue={cycle.cropName} required /></div>
        <div className="form-group" style={{ margin: 0 }}><label>Varieties (Comma Separated)</label><input name="varieties" defaultValue={cycle.varieties.map((v) => v.name).join(", ")} required /></div>
        <div className="form-group" style={{ margin: 0 }}><label>Start Date</label><input name="startDate" type="date" defaultValue={dateVal(cycle.startDate)} required /></div>
        <div className="form-group" style={{ margin: 0 }}><label>First Harvest Date</label><input name="harvestDate" type="date" defaultValue={dateVal(cycle.expectedFirstHarvestDate)} /></div>
        <div className="form-group" style={{ margin: 0 }}>
          <label>Establishment</label>
          <select name="establishmentType" defaultValue={cycle.establishmentType}>
            <option value="NURSERY_TRANSPLANTATION">Nursery Transplantation</option>
            <option value="DIRECT_SOWING">Direct Sowing</option>
          </select>
        </div>
        <div className="form-group" style={{ margin: 0 }}><label>Plants / Acre</label><input name="expectedPlantsPerAcre" type="number" defaultValue={cycle.expectedPlantsPerAcre ?? ""} /></div>
      </div>

      {/* Bed Prep */}
      <div style={{ background: "var(--card-muted)", padding: 14, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "grid", gap: 8 }}>
        <label className="check"><input type="checkbox" checked={bedPrepEnabled} onChange={(e) => setBedPrepEnabled(e.target.checked)} /><strong>Bed Preparation Required</strong></label>
        {bedPrepEnabled && (
          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}><label>Bed Width (cm)</label><input name="bedWidthCm" type="number" step="0.1" defaultValue={cycle.bedWidthCm ?? ""} /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Centre-to-Centre (cm)</label><input name="bedCenterDistanceCm" type="number" step="0.1" defaultValue={cycle.bedCenterDistanceCm ?? ""} /></div>
            <div className="form-group wide" style={{ margin: 0 }}><label>Expected Beds / Acre</label><input name="expectedBedsPerAcre" type="number" step="0.1" defaultValue={cycle.expectedBedsPerAcre ?? ""} /></div>
          </div>
        )}
      </div>

      {/* Mulching */}
      <div style={{ background: "var(--card-muted)", padding: 14, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "grid", gap: 8 }}>
        <label className="check"><input type="checkbox" checked={mulchEnabled} onChange={(e) => setMulchEnabled(e.target.checked)} /><strong>Mulch Film Enabled</strong></label>
        {mulchEnabled && (
          <div className="two-column">
            <div className="form-group" style={{ margin: 0 }}><label>Hole Pattern</label><select name="mulchHolePattern" defaultValue={cycle.mulchHolePattern ?? "SINGLE_LINE"}><option value="SINGLE_LINE">Single Line</option><option value="DOUBLE_LINE_ZIGZAG">Double Line Zigzag</option></select></div>
            <div className="form-group" style={{ margin: 0 }}><label>Plant Distance (cm)</label><input name="plantDistanceCm" type="number" step="0.1" defaultValue={cycle.plantDistanceCm ?? ""} /></div>
          </div>
        )}
      </div>

      {/* Milestones & Presets */}
      <div style={{ background: "var(--card-muted)", padding: 14, borderRadius: "var(--radius-sm)", border: "1px solid var(--border)", display: "grid", gap: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 6 }}>
          <strong style={{ fontSize: "0.9rem" }}>Milestone Schedule & Support Activities</strong>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["Crop Cover", "Bamboo Stacking", "Trellising", "Net Support", "Rope Support"].map((preset) => (
              <button key={preset} type="button" className="btn btn-secondary btn-sm" onClick={() => addExtra(preset)}>+ {preset}</button>
            ))}
            <button key="custom-milestone-btn" type="button" className="btn btn-primary btn-sm" onClick={() => addExtra("")}>+ Custom</button>
          </div>
        </div>

        {cycle.milestones.map((m, idx) => (
          <div key={m.id} className="two-column" style={{ background: "var(--card)", padding: 10, borderRadius: "var(--radius-xs)", border: "1px solid var(--border)" }}>
            <div className="form-group" style={{ margin: 0 }}><label>Milestone</label><input name={`milestoneName${idx}`} defaultValue={m.name} required /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Target Date</label><input name={`milestoneDate${idx}`} type="date" defaultValue={dateVal(m.targetDate)} required /></div>
            <div className="form-group wide" style={{ margin: 0 }}><label>Remarks</label><input name={`milestoneRemarks${idx}`} defaultValue={m.remarks ?? ""} /></div>
            <label className="check wide" style={{ color: "var(--danger-text)" }}><input name={`removeMilestone${idx}`} type="checkbox" /><span>Remove on save</span></label>
          </div>
        ))}

        {extras.map((extra) => (
          <div key={extra.tempId} className="two-column" style={{ background: "var(--primary-light)", padding: 10, borderRadius: "var(--radius-xs)", border: "1px solid var(--primary-border)" }}>
            <div className="form-group" style={{ margin: 0 }}><label>New Activity</label><input value={extra.name} onChange={(e) => setExtras((prev) => prev.map((x) => x.tempId === extra.tempId ? { ...x, name: e.target.value } : x))} placeholder="Activity Name" required /></div>
            <div className="form-group" style={{ margin: 0 }}><label>Target Date</label><input type="date" value={extra.targetDate} onChange={(e) => setExtras((prev) => prev.map((x) => x.tempId === extra.tempId ? { ...x, targetDate: e.target.value } : x))} required /></div>
            <div className="form-group wide" style={{ margin: 0 }}><label>Remarks</label><input value={extra.remarks} onChange={(e) => setExtras((prev) => prev.map((x) => x.tempId === extra.tempId ? { ...x, remarks: e.target.value } : x))} placeholder="Instructions" /></div>
            <div className="wide" style={{ display: "flex", justifyContent: "flex-end" }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => setExtras((prev) => prev.filter((x) => x.tempId !== extra.tempId))}><Icons.Trash size={13} /><span>Cancel</span></button></div>
          </div>
        ))}
      </div>

      {error && <div className="error" role="alert"><Icons.AlertCircle size={16} /><span>{error}</span></div>}

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button type="submit" className="btn btn-primary btn-lg" disabled={pending}>
          <Icons.Check size={16} /><span>{pending ? "Saving…" : "Save Crop Cycle Changes"}</span>
        </button>
      </div>
    </form>
  );
}
