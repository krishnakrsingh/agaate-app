"use client";
import { useEffect, useState, FormEvent } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";
import { downloadCsv } from "@/lib/export";

type Farm = {
  id: string;
  name: string;
  plots: {
    id: string;
    name: string;
    cropCycles: { id: string; cropName: string }[];
  }[];
};

type HarvestLog = {
  id: string;
  harvestDate: string;
  quantity: string;
  unit: string;
  grade: string;
  buyerOrMarket?: string | null;
  vehicleNumber?: string | null;
  pricePerUnit?: string | null;
  totalAmount?: string | null;
  notes?: string | null;
  farm: { id: string; name: string };
  plot: { id: string; name: string };
  cropCycle: { id: string; cropName: string };
  createdBy: { id: string; name: string; role: string };
};

export function HarvestConsole({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [logs, setLogs] = useState<HarvestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pending, setPending] = useState(false);

  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [selectedCycleId, setSelectedCycleId] = useState("");

  const loadLogs = async () => {
    if (!selectedFarmId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/harvest?farmId=${selectedFarmId}`);
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [selectedFarmId]);

  const activePlot = selectedFarm?.plots.find((p) => p.id === selectedPlotId);

  async function handleAddHarvest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: selectedFarmId,
          plotId: selectedPlotId,
          cropCycleId: selectedCycleId,
          harvestDate: fd.get("harvestDate"),
          quantity: Number(fd.get("quantity")),
          unit: fd.get("unit") || "KG",
          grade: fd.get("grade") || "GRADE_A",
          buyerOrMarket: fd.get("buyerOrMarket") || null,
          vehicleNumber: fd.get("vehicleNumber") || null,
          pricePerUnit: fd.get("pricePerUnit") ? Number(fd.get("pricePerUnit")) : null,
          notes: fd.get("notes") || null,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to log harvest");
      }

      toast.success("Harvest batch recorded successfully!");
      setShowAddModal(false);
      void loadLogs();
    } catch (err: any) {
      toast.error(err.message || "Failed to save harvest log");
    } finally {
      setPending(false);
    }
  }

  const totalQuantity = logs.reduce((acc, l) => acc + Number(l.quantity || 0), 0);
  const gradeACount = logs.filter((l) => l.grade === "GRADE_A").reduce((acc, l) => acc + Number(l.quantity || 0), 0);
  const gradeBCount = logs.filter((l) => l.grade === "GRADE_B").reduce((acc, l) => acc + Number(l.quantity || 0), 0);
  const totalValue = logs.reduce((acc, l) => acc + Number(l.totalAmount || 0), 0);

  const handleExportCsv = () => {
    const farmName = selectedFarm?.name || "Estate";
    const headers = [
      "Harvest Date",
      "Plot",
      "Crop",
      "Quantity",
      "Unit",
      "Grade",
      "Price Per Unit (INR)",
      "Total Amount (INR)",
      "Buyer / Mandi",
      "Vehicle No",
      "Recorded By",
      "Role",
    ];
    const rows = logs.map((l) => [
      l.harvestDate.slice(0, 10),
      l.plot.name,
      l.cropCycle.cropName,
      l.quantity,
      l.unit,
      l.grade,
      l.pricePerUnit || "",
      l.totalAmount || "",
      l.buyerOrMarket || "N/A",
      l.vehicleNumber || "N/A",
      l.createdBy.name,
      l.createdBy.role,
    ]);
    downloadCsv(`harvest-ledger-${farmName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success("Harvest & Mandi records exported to CSV!");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── 1. HEADER & FARM SELECTOR ── */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>COMMERCIAL OPERATIONS &bull; HARVEST &amp; DISPATCH</span>
          </div>
          <h1 className="page-title">Commercial Harvest Ledger</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Recorded picking batches, crate counts, quality grades, buyer dispatch receipts, and revenue totals.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {farms.length > 1 && (
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="input-field"
              style={{ width: "auto" }}
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            className="btn btn-secondary"
            onClick={handleExportCsv}
            disabled={logs.length === 0}
            title="Download CSV for buyer reconciliation & accounting"
          >
            <Icons.FileText size={15} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-green"
            onClick={() => {
              if (selectedFarm?.plots[0]) {
                setSelectedPlotId(selectedFarm.plots[0].id);
                setSelectedCycleId(selectedFarm.plots[0].cropCycles[0]?.id || "");
              }
              setShowAddModal(true);
            }}
          >
            <Icons.Plus size={15} />
            <span>Record Harvest Batch</span>
          </button>
        </div>
      </div>

      {/* ── 2. HARVEST TELEMETRY ROW ── */}
      <div className="metric-summary-row">
        <div className="metric-summary-item">
          <span className="metric-label">Cumulative Harvest</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {totalQuantity.toLocaleString()} <span style={{ fontSize: 16 }}>kg</span>
          </div>
          <div className="metric-sub">{logs.length} picking batches logged</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Grade A (Export / Premium)</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {gradeACount.toLocaleString()} <span style={{ fontSize: 16 }}>kg</span>
          </div>
          <div className="metric-sub">
            {totalQuantity > 0 ? `${Math.round((gradeACount / totalQuantity) * 100)}% quality index` : "No harvest"}
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Grade B (Local Market)</span>
          <div className="metric-value">{gradeBCount.toLocaleString()} <span style={{ fontSize: 16 }}>kg</span></div>
          <div className="metric-sub">Secondary grade produce</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Estimated Harvest Value</span>
          <div className="metric-value" style={{ color: "var(--ink)" }}>
            ₹{totalValue.toLocaleString()}
          </div>
          <div className="metric-sub">Commercial gross value</div>
        </div>
      </div>

      {/* ── 3. HARVEST LOGS TABLE ── */}
      <div className="compact-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "15px" }}>Picking Batches &amp; Dispatch History</strong>
          <span className="muted" style={{ fontSize: "12px" }}>Showing recent 100 entries</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="operational-table" style={{ width: "100%", margin: 0, border: "none" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Plot &amp; Crop</th>
                <th>Quantity</th>
                <th>Grade</th>
                <th>Buyer / Destination</th>
                <th>Vehicle</th>
                <th>Rate / Kg</th>
                <th>Total Value</th>
                <th>Logged By</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{formatDate(log.harvestDate)}</strong>
                  </td>
                  <td>
                    <div>{log.plot.name}</div>
                    <span className="muted" style={{ fontSize: "11px" }}>{log.cropCycle.cropName}</span>
                  </td>
                  <td>
                    <span style={{ fontWeight: 650, color: "var(--green)" }}>
                      {Number(log.quantity).toLocaleString()} {log.unit}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        log.grade === "GRADE_A"
                          ? "badge-green"
                          : log.grade === "GRADE_B"
                          ? "badge-amber"
                          : "badge-danger"
                      }`}
                    >
                      {log.grade.replace("_", " ")}
                    </span>
                  </td>
                  <td>{log.buyerOrMarket || "—"}</td>
                  <td>
                    <code className="data" style={{ fontSize: "11px" }}>{log.vehicleNumber || "—"}</code>
                  </td>
                  <td>{log.pricePerUnit ? `₹${Number(log.pricePerUnit).toFixed(2)}` : "—"}</td>
                  <td>
                    <strong>{log.totalAmount ? `₹${Number(log.totalAmount).toLocaleString()}` : "—"}</strong>
                  </td>
                  <td>
                    <span className="muted" style={{ fontSize: "12px" }}>{log.createdBy.name}</span>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && !loading && (
                <tr>
                  <td colSpan={9} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                    No harvest records logged yet for this estate. Tap &ldquo;Record Harvest Batch&rdquo; to add the first picking.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. RECORD HARVEST MODAL ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 520, borderRadius: "var(--radius-lg)", padding: 24 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>Record Harvest Batch</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddModal(false)}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddHarvest} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="two-column">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Harvest Date</label>
                  <input
                    name="harvestDate"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Target Plot</label>
                  <select
                    value={selectedPlotId}
                    onChange={(e) => {
                      setSelectedPlotId(e.target.value);
                      const p = selectedFarm?.plots.find((x) => x.id === e.target.value);
                      setSelectedCycleId(p?.cropCycles[0]?.id || "");
                    }}
                    required
                  >
                    {selectedFarm?.plots.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Crop Cycle</label>
                <select
                  value={selectedCycleId}
                  onChange={(e) => setSelectedCycleId(e.target.value)}
                  required
                >
                  {activePlot?.cropCycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.cropName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="two-column">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Quantity Harvested</label>
                  <input name="quantity" type="number" step="0.1" min="0.1" required placeholder="e.g. 450" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Unit of Measure</label>
                  <select name="unit" defaultValue="KG">
                    <option value="KG">Kilograms (kg)</option>
                    <option value="CRATES">Crates (standard)</option>
                    <option value="TONS">Metric Tons</option>
                    <option value="BOXES">Corrugated Boxes</option>
                  </select>
                </div>
              </div>

              <div className="two-column">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Quality Grade</label>
                  <select name="grade" defaultValue="GRADE_A">
                    <option value="GRADE_A">Grade A (Export / Premium)</option>
                    <option value="GRADE_B">Grade B (Domestic Wholesale)</option>
                    <option value="REJECT">Processing / Culls</option>
                  </select>
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Price per Unit (Optional)</label>
                  <input name="pricePerUnit" type="number" step="0.5" min="0" placeholder="e.g. 28.50" />
                </div>
              </div>

              <div className="two-column">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Buyer / Destination Market</label>
                  <input name="buyerOrMarket" placeholder="e.g., Reliance Fresh / APMC Mandi" />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Dispatch Vehicle Number</label>
                  <input name="vehicleNumber" placeholder="e.g., KA-04-E-5512" />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Field Remarks / Notes</label>
                <textarea name="notes" rows={2} placeholder="Fruit sizing, brix rating, weather during harvest..." />
              </div>

              <div style={{ display: "flex", gap: 10, justifyContent: "flex-end", marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-green" disabled={pending}>
                  {pending ? "Recording…" : "Save Harvest Entry"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
