"use client";
import { useState, useEffect, FormEvent } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";
import { downloadCsv } from "@/lib/export";

type Farm = {
  id: string;
  name: string;
};

type MusterRecord = {
  id: string;
  musterDate: string;
  totalLabourers: number;
  maleCount?: number | null;
  femaleCount?: number | null;
  hoursPerShift: string;
  dailyWageRate?: string | null;
  totalWageCost?: string | null;
  contractorName?: string | null;
  notes?: string | null;
  farm: { name: string };
  recordedBy: { name: string };
};

export function MobileCrewMuster({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [musterDate, setMusterDate] = useState(new Date().toISOString().slice(0, 10));
  const [totalLabourers, setTotalLabourers] = useState("10");
  const [maleCount, setMaleCount] = useState("4");
  const [femaleCount, setFemaleCount] = useState("6");
  const [hoursPerShift, setHoursPerShift] = useState("8");
  const [dailyWageRate, setDailyWageRate] = useState("450");
  const [contractorName, setContractorName] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [records, setRecords] = useState<MusterRecord[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRecords = async () => {
    if (!selectedFarmId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crew?farmId=${selectedFarmId}`);
      if (res.ok) setRecords(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadRecords();
  }, [selectedFarmId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setPending(true);
    try {
      const body = {
        farmId: selectedFarmId,
        musterDate,
        totalLabourers: Number(totalLabourers),
        maleCount: maleCount ? Number(maleCount) : null,
        femaleCount: femaleCount ? Number(femaleCount) : null,
        hoursPerShift: Number(hoursPerShift),
        dailyWageRate: dailyWageRate ? Number(dailyWageRate) : null,
        contractorName: contractorName || null,
        notes: notes || null,
      };

      const res = await fetch("/api/crew", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to log crew muster");
      }

      toast.show("Crew muster & daily wage recorded!", "success");
      setNotes("");
      void loadRecords();
    } catch (err: any) {
      toast.show(err.message || "Failed to log muster", "error");
    } finally {
      setPending(false);
    }
  };

  const calculatedTotalSpend = (Number(totalLabourers) || 0) * (Number(dailyWageRate) || 0);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Main Form */}
      <form onSubmit={handleSubmit} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Farm & Date */}
        <div style={{ display: "grid", gridTemplateColumns: farms.length > 1 ? "1fr 1fr" : "1fr", gap: 12 }}>
          {farms.length > 1 && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Farm</label>
              <select
                value={selectedFarmId}
                onChange={(e) => setSelectedFarmId(e.target.value)}
                className="input-field"
                style={{ width: "100%" }}
              >
                {farms.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Muster Date *</label>
            <input
              type="date"
              value={musterDate}
              onChange={(e) => setMusterDate(e.target.value)}
              required
              className="input-field"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Tactile Total Labourers Stepper */}
        <div style={{ background: "var(--stone)", padding: "16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--stone)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)" }}>
              Total Field Hands Today *
            </label>
            <span style={{ fontSize: "11px", color: "var(--muted)", fontWeight: 500 }}>
              Morning roll call
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTotalLabourers(String(Math.max(1, (Number(totalLabourers) || 1) - 1)))}
              style={{ width: 48, height: 48, fontSize: "22px", fontWeight: 700, borderRadius: "var(--radius-sm)" }}
            >
              &minus;
            </button>
            <input
              type="number"
              min="1"
              value={totalLabourers}
              onChange={(e) => setTotalLabourers(e.target.value)}
              required
              className="input-field"
              style={{
                width: 90,
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: "24px",
                fontWeight: 800,
                height: 48,
                backgroundColor: "var(--canvas)",
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setTotalLabourers(String((Number(totalLabourers) || 0) + 1))}
              style={{ width: 48, height: 48, fontSize: "22px", fontWeight: 700, borderRadius: "var(--radius-sm)" }}
            >
              +
            </button>
          </div>

          {/* Quick Accelerators */}
          <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 10 }}>
            {[1, 5, 10].map((step) => (
              <button
                key={step}
                type="button"
                onClick={() => setTotalLabourers(String((Number(totalLabourers) || 0) + step))}
                style={{
                  fontSize: "12px",
                  padding: "4px 12px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--line)",
                  background: "var(--canvas)",
                  color: "var(--ink)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                +{step} Workers
              </button>
            ))}
          </div>
        </div>

        {/* Male & Female Breakdown */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ background: "var(--canvas)", padding: "12px", borderRadius: "var(--radius-xs)", border: "1px solid var(--canvas)" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--ink)", marginBottom: 6 }}>
              Male Workers
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setMaleCount(String(Math.max(0, (Number(maleCount) || 0) - 1)))}
                style={{ width: 34, height: 34, padding: 0, fontSize: "16px", fontWeight: 700 }}
              >
                &minus;
              </button>
              <input
                type="number"
                min="0"
                value={maleCount}
                onChange={(e) => setMaleCount(e.target.value)}
                className="input-field"
                style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "16px", height: 34 }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setMaleCount(String((Number(maleCount) || 0) + 1))}
                style={{ width: 34, height: 34, padding: 0, fontSize: "16px", fontWeight: 700 }}
              >
                +
              </button>
            </div>
          </div>

          <div style={{ background: "var(--canvas)", padding: "12px", borderRadius: "var(--radius-xs)", border: "1px solid var(--canvas)" }}>
            <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--ink)", marginBottom: 6 }}>
              Female Workers
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setFemaleCount(String(Math.max(0, (Number(femaleCount) || 0) - 1)))}
                style={{ width: 34, height: 34, padding: 0, fontSize: "16px", fontWeight: 700 }}
              >
                &minus;
              </button>
              <input
                type="number"
                min="0"
                value={femaleCount}
                onChange={(e) => setFemaleCount(e.target.value)}
                className="input-field"
                style={{ textAlign: "center", fontFamily: "var(--font-mono)", fontWeight: 700, fontSize: "16px", height: 34 }}
              />
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setFemaleCount(String((Number(femaleCount) || 0) + 1))}
                style={{ width: 34, height: 34, padding: 0, fontSize: "16px", fontWeight: 700 }}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {/* Wage Rate & Live Outflow */}
        <div style={{ background: "var(--canvas)", padding: "14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--canvas)", display: "grid", gap: 10 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontSize: 12, fontWeight: 650, color: "var(--ink)", margin: 0 }}>
              Daily Wage Rate (₹ / Day)
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              {[350, 400, 450, 500].map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setDailyWageRate(String(rate))}
                  className="select-chip"
                  data-selected={dailyWageRate === String(rate)}
                >
                  ₹{rate}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div>
              <input
                type="number"
                step="10"
                value={dailyWageRate}
                onChange={(e) => setDailyWageRate(e.target.value)}
                placeholder="₹ Rate"
                className="input-field"
                style={{ fontFamily: "var(--font-mono)", fontSize: 15, fontWeight: 700 }}
              />
            </div>
            <div>
              <select
                value={hoursPerShift}
                onChange={(e) => setHoursPerShift(e.target.value)}
                className="input-field"
                style={{ fontSize: 13 }}
              >
                <option value="4">4h (Half Day)</option>
                <option value="8">8h (Standard Shift)</option>
                <option value="10">10h (Overtime Shift)</option>
              </select>
            </div>
          </div>

          {/* Live Wage Calculation Hero */}
            <div
            style={{
              background: "var(--green-light)",
              border: "1px solid var(--green-light)",
              borderRadius: "var(--radius-xs)",
              padding: "10px 14px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 2,
            }}
          >
            <span style={{ fontSize: "12px", color: "var(--ink-soft)", fontWeight: 600 }}>
              Daily Labour Outflow ({totalLabourers || 0} hands &times; ₹{dailyWageRate || 0}):
            </span>
            <span style={{ fontFamily: "var(--font-mono)", fontSize: "18px", fontWeight: 800, color: "var(--green)" }}>
              ₹{calculatedTotalSpend.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        {/* Contractor Chips & Name */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--ink)", marginBottom: 6 }}>
            Labour Contractor / Gang Leader
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 8 }}>
            {["Direct Field Hands", "Murugan Contractor", "Local Village Gang"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setContractorName(c)}
                className="select-chip select-chip-pill"
                data-selected={contractorName === c}
              >
                {c}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={contractorName}
            onChange={(e) => setContractorName(e.target.value)}
            placeholder="e.g. Ramesh Maistry / Gang Name"
            className="input-field"
            style={{ width: "100%" }}
          />
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 650, color: "var(--ink)", marginBottom: 4 }}>
            Work Description / Plot Assignments
          </label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 6 weeding Plot 1, 4 staking Plot 3"
            className="input-field"
            style={{ width: "100%" }}
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary"
          style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}
        >
          {pending ? (
            "Recording Muster..."
          ) : (
            <>
              <Icons.CheckCircle size={16} />
              Save Crew Muster
            </>
          )}
        </button>
      </form>

      {/* Recent Musters Table */}
      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
            <Icons.Clock size={14} />
            Recent Crew Musters
          </h2>

          <button
            type="button"
            onClick={() => {
              const farmName = farms.find((f) => f.id === selectedFarmId)?.name || "Estate";
              const headers = [
                "Muster Date",
                "Farm",
                "Total Labourers",
                "Male",
                "Female",
                "Hours/Shift",
                "Daily Wage Rate (INR)",
                "Total Wage Cost (INR)",
                "Contractor / Gang",
                "Recorded By",
                "Notes",
              ];
              const rows = records.map((r) => [
                r.musterDate.slice(0, 10),
                r.farm.name,
                r.totalLabourers,
                r.maleCount ?? "",
                r.femaleCount ?? "",
                r.hoursPerShift,
                r.dailyWageRate ?? "",
                r.totalWageCost ?? "",
                r.contractorName ?? "N/A",
                r.recordedBy.name,
                r.notes ?? "",
              ]);
              downloadCsv(`crew-payroll-${farmName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`, headers, rows);
              toast.show("Crew muster payroll exported to CSV!", "success");
            }}
            disabled={records.length === 0}
            className="btn btn-sm btn-ghost"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--muted)" }}
          >
            <Icons.FileText size={13} />
            Export Payroll CSV
          </button>
        </div>

        {loading ? (
          <div className="muted" style={{ fontSize: 12, padding: "16px 0", textAlign: "center" }}>Loading muster records...</div>
        ) : records.length === 0 ? (
          <div className="muted" style={{ fontSize: 12, padding: "16px 0", textAlign: "center" }}>No crew muster records found.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {records.slice(0, 7).map((r) => (
              <div key={r.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--stone)", fontSize: 12 }}>
                <div>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>
                    {r.totalLabourers} Field Hands ({r.maleCount || 0}M / {r.femaleCount || 0}F)
                  </div>
                  <div className="muted" style={{ fontSize: 11 }}>
                    {formatDate(r.musterDate)} {r.contractorName ? `• Contractor: ${r.contractorName}` : ""}
                  </div>
                  {r.notes && <div style={{ fontSize: 11, color: "var(--ink-soft)", marginTop: 2 }}>{r.notes}</div>}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontFamily: "monospace", color: "var(--green)", fontSize: 13 }}>
                    {r.totalWageCost ? `₹${Number(r.totalWageCost).toLocaleString("en-IN")}` : "-"}
                  </div>
                  <span className="muted" style={{ fontSize: 10 }}>
                    Logged by {r.recordedBy.name}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
