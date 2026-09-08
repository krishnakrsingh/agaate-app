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
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div className="card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "var(--radius-sm)",
              backgroundColor: "var(--stone)",
              color: "var(--green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icons.Users size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Daily Labour &amp; Crew Muster</h1>
            <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
              Track daily field hands, contractors, and wage outflow for your farm.
            </p>
          </div>
        </div>
      </div>

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

        {/* Headcounts */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Total Labourers *</label>
            <input
              type="number"
              min="1"
              value={totalLabourers}
              onChange={(e) => setTotalLabourers(e.target.value)}
              required
              className="input-field"
              style={{ width: "100%", fontFamily: "monospace" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Male Count</label>
            <input
              type="number"
              min="0"
              value={maleCount}
              onChange={(e) => setMaleCount(e.target.value)}
              className="input-field"
              style={{ width: "100%", fontFamily: "monospace" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Female Count</label>
            <input
              type="number"
              min="0"
              value={femaleCount}
              onChange={(e) => setFemaleCount(e.target.value)}
              className="input-field"
              style={{ width: "100%", fontFamily: "monospace" }}
            />
          </div>
        </div>

        {/* Shift hours & Wage Rate */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Shift (Hours)</label>
            <input
              type="number"
              step="0.5"
              value={hoursPerShift}
              onChange={(e) => setHoursPerShift(e.target.value)}
              className="input-field"
              style={{ width: "100%", fontFamily: "monospace" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Daily Wage / Person (₹)</label>
            <input
              type="number"
              step="1"
              value={dailyWageRate}
              onChange={(e) => setDailyWageRate(e.target.value)}
              placeholder="e.g. 450"
              className="input-field"
              style={{ width: "100%", fontFamily: "monospace" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Daily Payout</label>
            <div style={{ padding: "8px 12px", borderRadius: "var(--radius-xs)", backgroundColor: "var(--stone)", border: "1px solid var(--line)", fontSize: 14, fontFamily: "monospace", fontWeight: 700, color: "var(--green)" }}>
              ₹{calculatedTotalSpend.toLocaleString("en-IN")}
            </div>
          </div>
        </div>

        {/* Contractor Name */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Labour Contractor / Gang Leader</label>
          <input
            type="text"
            value={contractorName}
            onChange={(e) => setContractorName(e.target.value)}
            placeholder="e.g. Ramesh Maistry / Local Gang"
            className="input-field"
            style={{ width: "100%" }}
          />
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Work Description / Plot Assignments</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 6 weeding in Plot 1, 4 harvesting in Plot 3"
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
