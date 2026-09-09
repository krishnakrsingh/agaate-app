"use client";
import { useState, useEffect, FormEvent } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";
import { MobileCrewMuster } from "@/components/officer/mobile-crew-muster";

type Plot = {
  id: string;
  name: string;
  cropCycles: { id: string; cropName: string }[];
};

type Farm = {
  id: string;
  name: string;
  plots: Plot[];
};

type RecentHarvest = {
  id: string;
  harvestDate: string;
  quantity: string;
  unit: string;
  grade: string;
  buyerOrMarket?: string | null;
  vehicleNumber?: string | null;
  plot: { name: string };
  cropCycle: { cropName: string };
};

export function MobileHarvestLogger({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [activeLogTab, setActiveLogTab] = useState<"HARVEST" | "CREW">("HARVEST");
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [selectedCycleId, setSelectedCycleId] = useState("");
  const [harvestDate, setHarvestDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("KG");
  const [grade, setGrade] = useState("GRADE_A");
  const [buyerOrMarket, setBuyerOrMarket] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);
  const [recentHarvests, setRecentHarvests] = useState<RecentHarvest[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
  const plots = selectedFarm?.plots || [];
  const activePlot = plots.find((p) => p.id === selectedPlotId);
  const availableCrops = activePlot?.cropCycles || [];

  useEffect(() => {
    if (plots.length > 0 && !selectedPlotId) {
      setSelectedPlotId(plots[0].id);
    }
  }, [plots, selectedPlotId]);

  useEffect(() => {
    if (availableCrops.length > 0) {
      setSelectedCycleId(availableCrops[0].id);
    } else {
      setSelectedCycleId("");
    }
  }, [selectedPlotId, availableCrops]);

  const loadRecent = async () => {
    if (!selectedFarmId) return;
    setLoadingRecent(true);
    try {
      const res = await fetch(`/api/harvest?farmId=${selectedFarmId}`);
      if (res.ok) {
        const data = await res.json();
        setRecentHarvests(data.slice(0, 5));
      }
    } finally {
      setLoadingRecent(false);
    }
  };

  useEffect(() => {
    void loadRecent();
  }, [selectedFarmId]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId || !selectedPlotId || !selectedCycleId) {
      toast.show("Select farm, plot, and active crop cycle", "error");
      return;
    }

    setPending(true);
    try {
      const body = {
        farmId: selectedFarmId,
        plotId: selectedPlotId,
        cropCycleId: selectedCycleId,
        harvestDate,
        quantity: Number(quantity),
        unit,
        grade,
        buyerOrMarket: buyerOrMarket || null,
        vehicleNumber: vehicleNumber || null,
        notes: notes || null,
      };

      const res = await fetch("/api/harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to log harvest");
      }

      toast.show("Harvest cut logged successfully!", "success");
      setQuantity("");
      setNotes("");
      setBuyerOrMarket("");
      setVehicleNumber("");
      void loadRecent();
    } catch (err: any) {
      toast.show(err.message || "Failed to log harvest", "error");
    } finally {
      setPending(false);
    }
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Segmented Top Control: Harvest Weighing vs Crew Muster */}
      <div
        style={{
          display: "flex",
          background: "var(--stone)",
          padding: 4,
          borderRadius: "var(--radius-pill)",
          gap: 6,
        }}
      >
        <button
          type="button"
          onClick={() => setActiveLogTab("HARVEST")}
          style={{
            flex: 1,
            borderRadius: "var(--radius-pill)",
            border: "none",
            background: activeLogTab === "HARVEST" ? "var(--green)" : "transparent",
            color: activeLogTab === "HARVEST" ? "#ffffff" : "var(--ink-soft)",
            fontWeight: 700,
            padding: "9px 16px",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: activeLogTab === "HARVEST" ? "0 2px 8px rgba(36, 84, 58, 0.28)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Icons.Truck size={15} />
          <span>Harvest Cut Weighing</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveLogTab("CREW")}
          style={{
            flex: 1,
            borderRadius: "var(--radius-pill)",
            border: "none",
            background: activeLogTab === "CREW" ? "var(--green)" : "transparent",
            color: activeLogTab === "CREW" ? "#ffffff" : "var(--ink-soft)",
            fontWeight: 700,
            padding: "9px 16px",
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            boxShadow: activeLogTab === "CREW" ? "0 2px 8px rgba(36, 84, 58, 0.28)" : "none",
            transition: "all 0.15s ease",
          }}
        >
          <Icons.Users size={15} />
          <span>Daily Crew Muster</span>
        </button>
      </div>

      {activeLogTab === "CREW" ? (
        <MobileCrewMuster farms={farms} />
      ) : (
        <>
          {/* Main Form */}
          <form onSubmit={handleSubmit} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Farm & Plot */}
        <div style={{ display: "grid", gridTemplateColumns: farms.length > 1 ? "1fr 1fr" : "1fr", gap: 12 }}>
          {farms.length > 1 && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Farm</label>
              <select
                value={selectedFarmId}
                onChange={(e) => {
                  setSelectedFarmId(e.target.value);
                  setSelectedPlotId("");
                }}
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
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Plot / Block</label>
            <select
              value={selectedPlotId}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              required
              className="input-field"
              style={{ width: "100%" }}
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Active Crop Cycle & Date */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Crop Cycle *</label>
            <select
              value={selectedCycleId}
              onChange={(e) => setSelectedCycleId(e.target.value)}
              required
              className="input-field"
              style={{ width: "100%" }}
            >
              {availableCrops.length === 0 ? (
                <option value="">No active crop on this plot</option>
              ) : (
                availableCrops.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.cropName}
                  </option>
                ))
              )}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Harvest Date *</label>
            <input
              type="date"
              value={harvestDate}
              onChange={(e) => setHarvestDate(e.target.value)}
              required
              className="input-field"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Quantity, Unit & Accelerators */}
        <div style={{ background: "var(--stone)", padding: "16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--stone)", display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <label style={{ fontSize: "13px", fontWeight: 700, color: "var(--ink)", margin: 0 }}>
              Harvest Weight / Volume *
            </label>
            <div style={{ display: "flex", gap: 4 }}>
              {["KG", "CRATES", "QUINTAL", "TONNE"].map((u) => (
                <button
                  key={u}
                  type="button"
                  onClick={() => setUnit(u)}
                  className="select-chip"
                  data-selected={unit === u}
                >
                  {u}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setQuantity(String(Math.max(0, (Number(quantity) || 0) - (unit === "CRATES" ? 1 : 10))))}
              style={{ width: 44, height: 44, fontSize: "20px", fontWeight: 700 }}
            >
              &minus;
            </button>
            <input
              type="number"
              step="0.1"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0.00"
              required
              className="input-field"
              style={{
                textAlign: "center",
                fontFamily: "var(--font-mono)",
                fontSize: "22px",
                fontWeight: 800,
                height: 44,
                backgroundColor: "var(--canvas)",
              }}
            />
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setQuantity(String((Number(quantity) || 0) + (unit === "CRATES" ? 1 : 10)))}
              style={{ width: 44, height: 44, fontSize: "20px", fontWeight: 700 }}
            >
              +
            </button>
          </div>

          {/* Quick Increment Chips */}
          <div style={{ display: "flex", justifyContent: "center", gap: 6 }}>
            {(unit === "CRATES" ? [1, 5, 10, 25] : [10, 25, 50, 100]).map((addVal) => (
              <button
                key={addVal}
                type="button"
                onClick={() => setQuantity(String((Number(quantity) || 0) + addVal))}
                style={{
                  fontSize: "11px",
                  padding: "3px 10px",
                  borderRadius: "var(--radius-pill)",
                  border: "1px solid var(--line)",
                  background: "var(--canvas)",
                  color: "var(--ink)",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                +{addVal} {unit}
              </button>
            ))}
          </div>
        </div>

        {/* Grade Selection with Visual Quality Badges */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--ink)", marginBottom: 6 }}>
            Quality Classification *
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 8 }}>
            {[
              { id: "GRADE_A", label: "Grade A", desc: "Premium / Export / Retail", color: "var(--green)", bg: "var(--green-light)" },
              { id: "GRADE_B", label: "Grade B", desc: "Domestic APMC Mandi", color: "var(--amber)", bg: "var(--amber-light)" },
              { id: "GRADE_C", label: "Grade C", desc: "Local Market / Secondary", color: "var(--blue)", bg: "var(--blue-light)" },
              { id: "PROCESSING", label: "Processing", desc: "Pulp / Factory / Cull", color: "var(--ink-soft)", bg: "var(--stone)" },
            ].map((g) => {
              const isSelected = grade === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGrade(g.id)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: "var(--radius-sm)",
                    border: isSelected ? `1px solid ${g.bg}` : "1px solid var(--line)",
                    background: isSelected ? g.bg : "var(--canvas)",
                    textAlign: "left",
                    cursor: "pointer",
                    display: "flex",
                    flexDirection: "column",
                    gap: 2,
                  }}
                >
                  <span style={{ fontSize: "13px", fontWeight: 750, color: isSelected ? g.color : "var(--ink)" }}>
                    {g.label}
                  </span>
                  <span style={{ fontSize: "10px", color: "var(--muted)" }}>
                    {g.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Buyer & Vehicle */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Buyer / Mandi Destination</label>
            <input
              type="text"
              value={buyerOrMarket}
              onChange={(e) => setBuyerOrMarket(e.target.value)}
              placeholder="e.g. APMC Hubli, Cold Storage"
              className="input-field"
              style={{ width: "100%" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Vehicle / Dispatch Number</label>
            <input
              type="text"
              value={vehicleNumber}
              onChange={(e) => setVehicleNumber(e.target.value)}
              placeholder="e.g. KA-04-E-1234"
              className="input-field"
              style={{ width: "100%" }}
            />
          </div>
        </div>

        {/* Notes */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Notes / Crate Count / Brix</label>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 18 crates, sugar brix 12.5, picked before noon heat"
            className="input-field"
            style={{ width: "100%" }}
          />
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={pending || !availableCrops.length}
          className="btn btn-primary"
          style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}
        >
          {pending ? (
            "Recording Harvest..."
          ) : (
            <>
              <Icons.CheckCircle size={16} />
              Confirm Harvest Cut
            </>
          )}
        </button>
      </form>

      {/* Recent Harvests on this estate */}
      <div className="card" style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
        <h2 style={{ fontSize: 12, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)", display: "flex", alignItems: "center", gap: 6, margin: 0 }}>
          <Icons.Clock size={14} />
          Recent Harvests on this Farm
        </h2>

        {loadingRecent ? (
          <div className="muted" style={{ fontSize: 12, padding: "16px 0", textAlign: "center" }}>Loading recent cuts...</div>
        ) : recentHarvests.length === 0 ? (
          <div className="muted" style={{ fontSize: 12, padding: "16px 0", textAlign: "center" }}>No harvest cuts logged recently.</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {recentHarvests.map((h) => (
              <div key={h.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--stone)", fontSize: 12 }}>
                <div>
                  <span style={{ fontWeight: 600, color: "var(--ink)" }}>{h.cropCycle.cropName}</span>
                  <span className="muted" style={{ marginLeft: 6 }}>
                    ({h.plot.name} • {formatDate(h.harvestDate)})
                  </span>
                  {h.buyerOrMarket && (
                    <div className="muted" style={{ fontSize: 11, marginTop: 2 }}>To: {h.buyerOrMarket}</div>
                  )}
                </div>
                <div style={{ textAlign: "right" }}>
                  <div style={{ fontWeight: 700, fontFamily: "monospace", color: "var(--green)", fontSize: 13 }}>
                    {Number(h.quantity).toLocaleString()} {h.unit}
                  </div>
                  <span className="badge badge-muted font-mono" style={{ fontSize: 9 }}>
                    {h.grade.replace("_", " ")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
        </>
      )}
    </div>
  );
}
