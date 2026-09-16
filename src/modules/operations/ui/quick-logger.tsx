"use client";
import { useState, useEffect, FormEvent } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";

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

type InventoryItem = {
  id: string;
  name: string;
  category: string;
  quantityInStock: string;
  unit: string;
};

const CATEGORIES = [
  { id: "IRRIGATION", label: "Irrigation Run", icon: "💧" },
  { id: "FERTIGATION", label: "Fertigation / Drenching", icon: "🧪" },
  { id: "SPRAYING", label: "Pest / Foliar Spray", icon: "🚿" },
  { id: "WEEDING", label: "Manual Weeding", icon: "🌿" },
  { id: "PRUNING", label: "Pruning / Trellising", icon: "✂️" },
  { id: "FIELD_MAINTENANCE", label: "Pump / Shed Repair", icon: "🔧" },
];

export function QuickLogger({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("IRRIGATION");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [selectedItemId, setSelectedItemId] = useState("");
  const [itemQuantity, setItemQuantity] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [pending, setPending] = useState(false);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
  const plots = selectedFarm?.plots || [];
  const activePlot = plots.find((p) => p.id === selectedPlotId);
  const cropCycleId = activePlot?.cropCycles[0]?.id || null;

  useEffect(() => {
    if (plots.length > 0 && !selectedPlotId) {
      setSelectedPlotId(plots[0].id);
    }
  }, [plots, selectedPlotId]);

  useEffect(() => {
    if (!selectedFarmId) return;
    fetch(`/api/inventory?farmId=${selectedFarmId}`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data) => setInventoryItems(data))
      .catch(() => setInventoryItems([]));
  }, [selectedFarmId]);

  // Set default title based on category & plot
  useEffect(() => {
    const catObj = CATEGORIES.find((c) => c.id === selectedCategory);
    const plotName = activePlot?.name || "Plot";
    setTitle(`${catObj?.label || "Operation"} - ${plotName}`);
  }, [selectedCategory, activePlot]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedFarmId) {
      toast.show("Please select a farm", "error");
      return;
    }

    setPending(true);
    try {
      const body = {
        farmId: selectedFarmId,
        plotId: selectedPlotId || null,
        cropCycleId,
        category: selectedCategory,
        title,
        durationMinutes,
        inventoryItemId: selectedItemId || null,
        inventoryQuantity: selectedItemId && itemQuantity ? Number(itemQuantity) : null,
        notes: notes || null,
      };

      const res = await fetch("/api/officer/quick-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to log activity");
      }

      toast.show("Activity recorded directly into farm ledger!", "success");
      setNotes("");
      setSelectedItemId("");
      setItemQuantity("");
    } catch (err: any) {
      toast.show(err.message || "Submission failed", "error");
    } finally {
      setPending(false);
    }
  };

  const selectedInventoryItem = inventoryItems.find((i) => i.id === selectedItemId);

  return (
    <div style={{ maxWidth: 640, margin: "0 auto", display: "flex", flexDirection: "column", gap: 16 }}>
      {/* Main Form */}
      <form onSubmit={handleSubmit} className="card" style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Farm & Plot Selection */}
        <div style={{ display: "grid", gridTemplateColumns: farms.length > 1 ? "1fr 1fr" : "1fr", gap: 12 }}>
          {farms.length > 1 && (
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Select Farm</label>
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
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Target Plot / Zone</label>
            <select
              value={selectedPlotId}
              onChange={(e) => setSelectedPlotId(e.target.value)}
              className="input-field"
              style={{ width: "100%" }}
            >
              {plots.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} {p.cropCycles[0] ? `(${p.cropCycles[0].cropName})` : "(Fallow)"}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Activity Category Selection */}
        <div>
          <label style={{ display: "block", fontSize: 13, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>
            What operation did you execute? *
          </label>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
            {CATEGORIES.map((cat) => {
              const isSelected = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  style={{
                    padding: "12px 14px",
                    borderRadius: "var(--radius-sm)",
                    border: isSelected ? "1px solid var(--green-light)" : "1px solid var(--line)",
                    background: isSelected ? "var(--green-light)" : "var(--canvas)",
                    color: isSelected ? "var(--green-dark)" : "var(--ink)",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{cat.icon}</span>
                  <span style={{ fontSize: 13, fontWeight: isSelected ? 750 : 600, lineHeight: 1.2 }}>
                    {cat.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Title */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Activity Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="input-field"
            style={{ width: "100%" }}
          />
        </div>

        {/* Duration presets */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 6 }}>
            Duration: <strong style={{ color: "var(--green)" }}>{durationMinutes} Minutes</strong> ({ (durationMinutes / 60).toFixed(1) } Hours)
          </label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {[30, 60, 120, 180, 240, 360].map((mins) => {
              const isSelected = durationMinutes === mins;
              return (
                <button
                  key={mins}
                  type="button"
                  onClick={() => setDurationMinutes(mins)}
                  className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-secondary"}`}
                  style={{ flex: 1, minWidth: 50, fontSize: 12, padding: "6px 8px" }}
                >
                  {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                </button>
              );
            })}
          </div>
        </div>

        {/* Shed Stock Consumption (Optional) */}
        {(selectedCategory === "FERTIGATION" || selectedCategory === "SPRAYING" || inventoryItems.length > 0) && (
          <div style={{ padding: 14, borderRadius: "var(--radius-xs)", backgroundColor: "var(--stone)", border: "1px solid var(--stone)", display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                <Icons.Package size={14} style={{ color: "var(--amber)" }} />
                Did you consume any Shed Stock? (Optional)
              </span>
              {selectedItemId && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedItemId("");
                    setItemQuantity("");
                  }}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--danger)", fontSize: 11, padding: 0 }}
                >
                  Clear item
                </button>
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: selectedItemId && selectedInventoryItem ? "1fr 1fr" : "1fr", gap: 8 }}>
              <select
                value={selectedItemId}
                onChange={(e) => setSelectedItemId(e.target.value)}
                className="input-field"
                style={{ width: "100%", fontSize: 12 }}
              >
                <option value="">-- No stock consumed --</option>
                {inventoryItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} (Stock: {Number(item.quantityInStock)} {item.unit})
                  </option>
                ))}
              </select>

              {selectedItemId && selectedInventoryItem && (
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    placeholder={`Quantity in ${selectedInventoryItem.unit}`}
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(e.target.value)}
                    required
                    className="input-field"
                    style={{ flex: 1, fontSize: 12 }}
                  />
                  <span className="badge badge-muted font-mono">
                    {selectedInventoryItem.unit}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Observations & Field Notes */}
        <div>
          <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Notes / Pressure / Observations</label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Pump pressure was 2.5 bar, emitter flow checked, slight weed growth along dripline."
            className="input-field"
            style={{ width: "100%", resize: "vertical" }}
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={pending}
          className="btn btn-primary"
          style={{ width: "100%", padding: "12px", fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, marginTop: 6 }}
        >
          {pending ? (
            "Logging Activity..."
          ) : (
            <>
              <Icons.CheckCircle size={16} />
              Submit Field Log
            </>
          )}
        </button>
      </form>
    </div>
  );
}
