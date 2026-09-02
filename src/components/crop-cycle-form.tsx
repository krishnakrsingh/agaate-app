"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";
import { useToast } from "./ui/toast";

const iso = (days: number) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

export function CropCycleForm({ plotId, farmId, plotArea = 1 }: { plotId: string; farmId: string; plotArea?: number }) {
  const router = useRouter();
  const toast = useToast();
  const [step, setStep] = useState<1 | 2 | 3 | 4 | 5>(1);

  // Form State
  const [cropName, setCropName] = useState("");
  const [varieties, setVarieties] = useState("");
  const [startDate, setStartDate] = useState(iso(0));
  const [harvestDate, setHarvestDate] = useState(iso(90));
  const [establishmentType, setEstablishmentType] = useState<"NURSERY_TRANSPLANTATION" | "DIRECT_SOWING">("NURSERY_TRANSPLANTATION");

  // Infrastructure
  const [bedPrepEnabled, setBedPrepEnabled] = useState(false);
  const [bedWidthCm, setBedWidthCm] = useState<number | "">("");
  const [bedCenterDistanceCm, setBedCenterDistanceCm] = useState<number | "">("");
  const [bedsPerAcre, setBedsPerAcre] = useState<number | "">("");

  const [mulchEnabled, setMulchEnabled] = useState(false);
  const [mulchHolePattern, setMulchHolePattern] = useState<"SINGLE_LINE" | "DOUBLE_LINE_ZIGZAG">("SINGLE_LINE");
  const [plantDistanceCm, setPlantDistanceCm] = useState<number | "">("");
  const [plantsPerAcre, setPlantsPerAcre] = useState<number | "">("");

  // Milestones & Support
  const [landDate, setLandDate] = useState(iso(5));
  const [readinessDate, setReadinessDate] = useState(iso(12));
  const [executionDate, setExecutionDate] = useState(iso(18));
  const [supports, setSupports] = useState<Array<{ id: string; name: string; targetDate: string; remarks: string }>>([]);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  const readinessTitle = mulchEnabled ? "Mulching & TP / Sowing Readiness" : "TP / Sowing Readiness";
  const executionTitle = establishmentType === "NURSERY_TRANSPLANTATION" ? "Transplantation" : "Direct Sowing";
  const calculatedTotalBeds = bedsPerAcre ? (Number(bedsPerAcre) * plotArea).toFixed(0) : null;
  const calculatedTotalPlants = plantsPerAcre ? (Number(plantsPerAcre) * plotArea).toFixed(0) : null;

  function addPresetSupport(name: string) {
    if (supports.some((s) => s.name.toLowerCase() === name.toLowerCase())) return;
    setSupports((prev) => [...prev, { id: Math.random().toString(36).slice(2, 9), name, targetDate: iso(25), remarks: "" }]);
  }

  function validate(): boolean {
    setError("");
    if (step === 1 && (!cropName.trim() || !varieties.trim() || !startDate)) {
      setError("Please fill out Crop Name, at least one Variety, and Start Date.");
      return false;
    }
    return true;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;
    setPending(true);
    setError("");

    try {
      const varietyList = varieties.split(",").map((s) => s.trim()).filter(Boolean);
      const validSupports = supports.filter((s) => s.name.trim() && s.targetDate).map((s) => ({
        name: s.name.trim(), targetDate: s.targetDate, remarks: s.remarks.trim() || undefined,
      }));

      const res = await fetch(`/api/plots/${plotId}/crop-cycles`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cropName: cropName.trim(),
          varieties: varietyList,
          startDate,
          expectedFirstHarvestDate: harvestDate || null,
          establishmentType,
          bedPreparationEnabled: bedPrepEnabled,
          bedWidthCm: bedPrepEnabled && bedWidthCm ? Number(bedWidthCm) : null,
          bedCenterDistanceCm: bedPrepEnabled && bedCenterDistanceCm ? Number(bedCenterDistanceCm) : null,
          expectedBedsPerAcre: bedPrepEnabled && bedsPerAcre ? Number(bedsPerAcre) : null,
          mulchEnabled,
          mulchHolePattern: mulchEnabled ? mulchHolePattern : null,
          plantDistanceCm: mulchEnabled && plantDistanceCm ? Number(plantDistanceCm) : null,
          expectedPlantsPerAcre: mulchEnabled && plantsPerAcre ? Number(plantsPerAcre) : null,
          milestones: [
            { name: "Land Preparation", targetDate: landDate },
            { name: readinessTitle, targetDate: readinessDate },
            { name: executionTitle, targetDate: executionDate },
            ...(harvestDate ? [{ name: "First Harvest", targetDate: harvestDate }] : []),
            ...validSupports,
          ],
        }),
      });

      setPending(false);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body.error ?? "Failed to create crop cycle.");
        return;
      }

      toast.success(`Crop cycle launched for ${cropName}!`);
      router.replace(`/farms/${farmId}`);
      router.refresh();
    } catch {
      setPending(false);
      setError("Network error while launching crop cycle.");
    }
  }

  const steps = [
    { num: 1, label: "Crop & Varieties" },
    { num: 2, label: "Establishment" },
    { num: 3, label: "Bed & Mulching" },
    { num: 4, label: "Milestones" },
    { num: 5, label: "Review & Launch" },
  ];

  return (
    <article className="compact-card" style={{ padding: 24, gap: 20 }}>
      {/* Stepper Header */}
      <div className="tabs-nav">
        {steps.map((s) => (
          <button
            key={s.num}
            type="button"
            className={`tab-btn ${step === s.num ? "active" : ""}`}
            onClick={() => { if (validate()) setStep(s.num as any); }}
          >
            <span>Step {s.num}: {s.label}</span>
          </button>
        ))}
      </div>

      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 18 }}>
        {/* STEP 1: Crop & Varieties */}
        {step === 1 && (
          <div className="form-section" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="form-section-title">1. Crop Selection &amp; Timelines</div>
            <div className="two-column" style={{ marginTop: 12 }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Crop Name</label>
                <input value={cropName} onChange={(e) => setCropName(e.target.value)} placeholder="e.g., Tomato (Solanum lycopersicum)" required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Varieties (Comma Separated)</label>
                <input value={varieties} onChange={(e) => setVarieties(e.target.value)} placeholder="e.g., Arka Rakshak, Abhinav, Saaho 3251" required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Cycle Start Date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>Expected First Harvest Date (Optional)</label>
                <input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Establishment */}
        {step === 2 && (
          <div className="form-section" style={{ borderTop: "none", paddingTop: 0 }}>
            <div className="form-section-title">2. Establishment Method</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginTop: 12 }}>
              {[
                { type: "NURSERY_TRANSPLANTATION", title: "Nursery Transplantation", desc: "Seedlings raised in pro-trays and transplanted into beds." },
                { type: "DIRECT_SOWING", title: "Direct Sowing", desc: "Seeds placed directly into plot soil bed." },
              ].map((opt) => (
                <div
                  key={opt.type}
                  onClick={() => setEstablishmentType(opt.type as any)}
                  style={{
                    padding: 16,
                    borderRadius: "var(--radius-xs)",
                    border: `1px solid ${establishmentType === opt.type ? "var(--green)" : "var(--line)"}`,
                    background: establishmentType === opt.type ? "var(--green-light)" : "var(--stone)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <strong style={{ display: "block", color: "var(--ink)", marginBottom: 4, fontSize: "14px" }}>{opt.title}</strong>
                  <p className="muted" style={{ margin: 0, fontSize: "12px" }}>{opt.desc}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 3: Bed & Mulching */}
        {step === 3 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: "var(--stone)", padding: 16, borderRadius: "var(--radius-xs)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="check">
                <input type="checkbox" checked={bedPrepEnabled} onChange={(e) => setBedPrepEnabled(e.target.checked)} />
                <strong>Bed Preparation Required (Raised Bed Geometry)</strong>
              </label>
              {bedPrepEnabled && (
                <div className="two-column" style={{ marginTop: 8 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Bed Width (cm)</label>
                    <input type="number" value={bedWidthCm} onChange={(e) => setBedWidthCm(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 90" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Centre-to-Centre Distance (cm)</label>
                    <input type="number" value={bedCenterDistanceCm} onChange={(e) => setBedCenterDistanceCm(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 150" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Expected Beds / Acre</label>
                    <input type="number" value={bedsPerAcre} onChange={(e) => setBedsPerAcre(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 26" />
                  </div>
                  {calculatedTotalBeds && (
                    <div style={{ padding: 12, background: "var(--canvas)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", alignSelf: "end" }}>
                      <span className="mono-label">Estimated Total Beds</span>
                      <strong className="data" style={{ display: "block", fontSize: "16px", color: "var(--green)", marginTop: 4 }}>{calculatedTotalBeds} beds ({plotArea} acres)</strong>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div style={{ background: "var(--stone)", padding: 16, borderRadius: "var(--radius-xs)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12 }}>
              <label className="check">
                <input type="checkbox" checked={mulchEnabled} onChange={(e) => setMulchEnabled(e.target.checked)} />
                <strong>Mulch Film &amp; Population Density</strong>
              </label>
              {mulchEnabled && (
                <div className="two-column" style={{ marginTop: 8 }}>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Hole Pattern</label>
                    <select value={mulchHolePattern} onChange={(e) => setMulchHolePattern(e.target.value as any)}>
                      <option value="SINGLE_LINE">Single Line</option>
                      <option value="DOUBLE_LINE_ZIGZAG">Double Line Zigzag</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Plant Distance (cm)</label>
                    <input type="number" value={plantDistanceCm} onChange={(e) => setPlantDistanceCm(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 45" />
                  </div>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label>Expected Plants / Acre</label>
                    <input type="number" value={plantsPerAcre} onChange={(e) => setPlantsPerAcre(e.target.value ? Number(e.target.value) : "")} placeholder="e.g. 6000" />
                  </div>
                  {calculatedTotalPlants && (
                    <div style={{ padding: 12, background: "var(--canvas)", border: "1px solid var(--line)", borderRadius: "var(--radius-xs)", alignSelf: "end" }}>
                      <span className="mono-label">Estimated Population</span>
                      <strong className="data" style={{ display: "block", fontSize: "16px", color: "var(--green)", marginTop: 4 }}>{calculatedTotalPlants} plants ({plotArea} acres)</strong>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 4: Milestones & Support Activities */}
        {step === 4 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div className="two-column">
              <div className="form-group" style={{ margin: 0 }}>
                <label>1. Land Preparation Target</label>
                <input type="date" value={landDate} onChange={(e) => setLandDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>2. {readinessTitle}</label>
                <input type="date" value={readinessDate} onChange={(e) => setReadinessDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>3. {executionTitle}</label>
                <input type="date" value={executionDate} onChange={(e) => setExecutionDate(e.target.value)} required />
              </div>
              <div className="form-group" style={{ margin: 0 }}>
                <label>4. First Harvest (Projected)</label>
                <input type="date" value={harvestDate} onChange={(e) => setHarvestDate(e.target.value)} />
              </div>
            </div>

            {/* Support Activity Presets */}
            <div style={{ background: "var(--stone)", padding: 16, borderRadius: "var(--radius-xs)", border: "1px solid var(--line)", display: "flex", flexDirection: "column", gap: 12 }}>
              <div className="mono-label">Add Support Activities</div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["Crop Cover", "Bamboo Stacking", "Trellising", "Net Support", "Rope Support"].map((preset) => (
                  <button key={preset} type="button" className="btn btn-secondary btn-sm" onClick={() => addPresetSupport(preset)}>
                    + {preset}
                  </button>
                ))}
              </div>
              {supports.map((s) => (
                <div key={s.id} className="two-column" style={{ background: "var(--canvas)", padding: 12, borderRadius: "var(--radius-xs)", border: "1px solid var(--line)" }}>
                  <input value={s.name} onChange={(e) => setSupports((prev) => prev.map((x) => x.id === s.id ? { ...x, name: e.target.value } : x))} placeholder="Activity Name" />
                  <div style={{ display: "flex", gap: 8 }}>
                    <input type="date" value={s.targetDate} onChange={(e) => setSupports((prev) => prev.map((x) => x.id === s.id ? { ...x, targetDate: e.target.value } : x))} />
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setSupports((prev) => prev.filter((x) => x.id !== s.id))}><Icons.X size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* STEP 5: Review & Launch */}
        {step === 5 && (
          <div style={{ display: "flex", flexDirection: "column", gap: 12, background: "var(--stone)", padding: 20, borderRadius: "var(--radius-xs)", border: "1px solid var(--line)" }}>
            <h4 style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>Crop Plan Review</h4>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, fontSize: "13px" }}>
              <div><span className="mono-label">Crop:</span> <strong style={{ display: "block", marginTop: 2 }}>{cropName}</strong></div>
              <div><span className="mono-label">Varieties:</span> <strong style={{ display: "block", marginTop: 2 }}>{varieties}</strong></div>
              <div><span className="mono-label">Establishment:</span> <strong style={{ display: "block", marginTop: 2 }}>{establishmentType.replaceAll("_", " ")}</strong></div>
              <div><span className="mono-label">Start Date:</span> <strong className="data" style={{ display: "block", marginTop: 2 }}>{startDate}</strong></div>
              <div><span className="mono-label">Beds:</span> <strong className="data" style={{ display: "block", marginTop: 2 }}>{bedPrepEnabled ? `${calculatedTotalBeds ?? bedsPerAcre} beds` : "Direct"}</strong></div>
              <div><span className="mono-label">Plants:</span> <strong className="data" style={{ display: "block", marginTop: 2 }}>{mulchEnabled ? `${calculatedTotalPlants ?? plantsPerAcre} plants` : "Standard"}</strong></div>
            </div>
          </div>
        )}

        {error && <div className="error" role="alert"><Icons.AlertCircle size={16} /><span>{error}</span></div>}

        {/* Navigation Buttons */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--line)", paddingTop: 16 }}>
          {step > 1 ? (
            <button type="button" className="btn btn-secondary" onClick={() => setStep((s) => (s - 1) as any)}>
              <Icons.ArrowLeft size={14} /><span>Back</span>
            </button>
          ) : <div />}

          {step < 5 ? (
            <button type="button" className="btn btn-green" onClick={() => { if (validate()) setStep((s) => (s + 1) as any); }}>
              <span>Continue</span><Icons.ArrowRight size={14} />
            </button>
          ) : (
            <button type="submit" className="btn btn-green btn-lg" disabled={pending}>
              <Icons.Check size={16} /><span>{pending ? "Launching…" : "Launch Crop Cycle"}</span>
            </button>
          )}
        </div>
      </form>
    </article>
  );
}
