"use client";
import { useState, useEffect, FormEvent } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";

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
            <Icons.Truck size={20} />
          </div>
          <div>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Record Daily Harvest Cut</h1>
            <p className="muted" style={{ fontSize: 12, margin: "2px 0 0" }}>
              Field crate weighing &amp; vehicle dispatch logging.
            </p>
          </div>
        </div>
      </div>

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

        {/* Quantity & Unit */}
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 12 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Harvested Quantity *</label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 450"
              required
              className="input-field"
              style={{ width: "100%", fontFamily: "monospace" }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Unit</label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="input-field"
              style={{ width: "100%" }}
            >
              <option value="KG">KG</option>
              <option value="CRATES">Crates</option>
              <option value="QUINTAL">Quintal</option>
              <option value="TONNE">Tonne</option>
              <option value="BOXES">Boxes</option>
            </select>
          </div>
        </div>

        {/* Grade Selection */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>Quality Grade *</label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 8 }}>
            {[
              { id: "GRADE_A", label: "Grade A (Prem/Export)" },
              { id: "GRADE_B", label: "Grade B (Market)" },
              { id: "GRADE_C", label: "Grade C (Local)" },
              { id: "PROCESSING", label: "Processing / Cull" },
            ].map((g) => {
              const isSelected = grade === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => setGrade(g.id)}
                  className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: 11, padding: "8px 10px", textAlign: "center" }}
                >
                  {g.label}
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
    </div>
  );
}
