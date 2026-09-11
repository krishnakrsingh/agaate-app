"use client";
import { useEffect, useState, FormEvent, useMemo } from "react";
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
  const [selectedFarmId, setSelectedFarmId] = useState(farms.length > 1 ? "ALL" : farms[0]?.id || "");
  const [logs, setLogs] = useState<HarvestLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pending, setPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [gradeFilter, setGradeFilter] = useState("ALL");

  const isAll = selectedFarmId === "ALL";
  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];
  const [selectedPlotId, setSelectedPlotId] = useState("");
  const [selectedCycleId, setSelectedCycleId] = useState("");

  const loadLogs = async () => {
    setLoading(true);
    try {
      const url = isAll ? "/api/harvest" : `/api/harvest?farmId=${selectedFarmId}`;
      const res = await fetch(url);
      if (res.ok) setLogs(await res.json());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLogs();
  }, [selectedFarmId, isAll]);

  const activePlot = selectedFarm?.plots.find((p) => p.id === selectedPlotId);

  async function handleAddHarvest(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const targetFarmId = isAll ? farms[0]?.id : selectedFarmId;

    try {
      const res = await fetch("/api/harvest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: targetFarmId,
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

  // Filtered logs
  const filteredLogs = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return logs.filter((l) => {
      const matchesSearch =
        !q ||
        l.plot.name.toLowerCase().includes(q) ||
        l.cropCycle.cropName.toLowerCase().includes(q) ||
        (l.farm?.name && l.farm.name.toLowerCase().includes(q)) ||
        (l.buyerOrMarket && l.buyerOrMarket.toLowerCase().includes(q)) ||
        (l.vehicleNumber && l.vehicleNumber.toLowerCase().includes(q));

      const matchesGrade = gradeFilter === "ALL" || l.grade === gradeFilter;
      return matchesSearch && matchesGrade;
    });
  }, [logs, searchQuery, gradeFilter]);

  const totalQuantity = filteredLogs.reduce((acc, l) => acc + Number(l.quantity || 0), 0);
  const gradeACount = filteredLogs.filter((l) => l.grade === "GRADE_A").reduce((acc, l) => acc + Number(l.quantity || 0), 0);
  const gradeBCount = filteredLogs.filter((l) => l.grade === "GRADE_B").reduce((acc, l) => acc + Number(l.quantity || 0), 0);
  const totalValue = filteredLogs.reduce((acc, l) => acc + Number(l.totalAmount || 0), 0);

  const handleExportCsv = () => {
    const scopeLabel = isAll ? "all-estates" : (selectedFarm?.name || "estate").toLowerCase().replace(/\s+/g, "-");
    const headers = isAll
      ? [
          "Harvest Date",
          "Estate",
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
        ]
      : [
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

    const rows = filteredLogs.map((l) => {
      if (isAll) {
        return [
          l.harvestDate.slice(0, 10),
          l.farm?.name || "N/A",
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
        ];
      }
      return [
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
      ];
    });

    downloadCsv(`harvest-ledger-${scopeLabel}-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success("Harvest & Mandi records exported to CSV!");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── 1. HEADER & FARM SELECTOR ── */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>
              {isAll
                ? `COMMERCIAL OPERATIONS • ${farms.length} ESTATES`
                : `COMMERCIAL HARVEST • ${selectedFarm?.name}`}
            </span>
          </div>
          <h1 className="page-title">Commercial Harvest Ledger</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Recorded picking batches, crate weights, quality grading, buyer dispatch receipts, and commercial revenue totals.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          {farms.length > 1 && (
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="input-field"
              style={{ width: "auto", fontWeight: 600, fontSize: "13px" }}
            >
              <option value="ALL">★ All Estates Portfolio ({farms.length} Estates)</option>
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
            disabled={filteredLogs.length === 0}
            title="Download CSV for buyer reconciliation & accounting"
          >
            <Icons.FileText size={15} />
            <span>Export CSV</span>
          </button>

          <button
            type="button"
            className="btn btn-green"
            onClick={() => {
              const targetF = isAll ? farms[0] : selectedFarm;
              if (targetF?.plots[0]) {
                setSelectedPlotId(targetF.plots[0].id);
                setSelectedCycleId(targetF.plots[0].cropCycles[0]?.id || "");
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
      <div className="metric-summary-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="metric-summary-item">
          <span className="metric-label">Cumulative Harvest</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {totalQuantity.toLocaleString()} <span style={{ fontSize: 16 }}>kg</span>
          </div>
          <div className="metric-sub">{filteredLogs.length} picking batches logged</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Grade A (Premium)</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            {gradeACount.toLocaleString()} <span style={{ fontSize: 16 }}>kg</span>
          </div>
          <div className="metric-sub">
            {totalQuantity > 0 ? `${Math.round((gradeACount / totalQuantity) * 100)}% quality index` : "No harvest"}
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Grade B (Standard)</span>
          <div className="metric-value">{gradeBCount.toLocaleString()} <span style={{ fontSize: 16 }}>kg</span></div>
          <div className="metric-sub">Secondary market produce</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Estimated Gross Revenue</span>
          <div className="metric-value" style={{ color: "var(--ink)" }}>
            ₹{totalValue.toLocaleString()}
          </div>
          <div className="metric-sub">Commercial dispatched value</div>
        </div>
      </div>

      {/* ── 3. HARVEST LOGS TABLE & SEARCH ── */}
      <div className="compact-card" style={{ padding: 22, gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="mono-label" style={{ color: "var(--green-dark)" }}>PICKING BATCHES</span>
            <h2 className="section-title" style={{ fontSize: "17px", margin: "2px 0 0" }}>
              Harvest &amp; Dispatch History ({filteredLogs.length})
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <select
              value={gradeFilter}
              onChange={(e) => setGradeFilter(e.target.value)}
              className="input-field"
              style={{ fontSize: "12px", height: 34, width: "auto" }}
            >
              <option value="ALL">All Grades</option>
              <option value="GRADE_A">Grade A (Premium)</option>
              <option value="GRADE_B">Grade B (Standard)</option>
              <option value="GRADE_C">Grade C / Processing</option>
              <option value="REJECT">Reject / Discard</option>
            </select>

            <div style={{ position: "relative", width: 240 }}>
              <input
                type="text"
                placeholder="Search plot, crop, mandi, buyer…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-field"
                style={{ paddingLeft: 30, fontSize: "12px", height: 34 }}
              />
              <div style={{ position: "absolute", left: 9, top: 9, color: "var(--muted)" }}>
                <Icons.Search size={14} />
              </div>
            </div>
          </div>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="data-table" style={{ width: "100%", fontSize: "13px" }}>
            <thead>
              <tr>
                <th>Date</th>
                {isAll && <th>Estate</th>}
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
              {filteredLogs.map((log) => (
                <tr key={log.id}>
                  <td>
                    <strong>{formatDate(log.harvestDate)}</strong>
                  </td>
                  {isAll && (
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {log.farm?.name || "Estate"}
                      </span>
                    </td>
                  )}
                  <td>
                    <strong style={{ color: "var(--ink)", display: "block" }}>{log.plot.name}</strong>
                    <span className="muted" style={{ fontSize: "11px" }}>{log.cropCycle.cropName}</span>
                  </td>
                  <td>
                    <strong style={{ color: "var(--green)" }}>{Number(log.quantity).toLocaleString()}</strong>{" "}
                    <span className="muted" style={{ fontSize: "11px" }}>{log.unit}</span>
                  </td>
                  <td>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "var(--radius-pill)",
                        background: log.grade === "GRADE_A" ? "var(--green-light)" : "var(--stone)",
                        color: log.grade === "GRADE_A" ? "var(--green-dark)" : "var(--ink)",
                        border: log.grade === "GRADE_A" ? "1px solid var(--green-light)" : "1px solid var(--stone)",
                      }}
                    >
                      {log.grade.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>{log.buyerOrMarket || <span className="muted">Farm Gate</span>}</td>
                  <td>
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: "12px" }}>
                      {log.vehicleNumber || <span className="muted">-</span>}
                    </span>
                  </td>
                  <td>
                    {log.pricePerUnit ? (
                      <span style={{ fontFamily: "var(--font-mono)" }}>₹{Number(log.pricePerUnit).toLocaleString()}</span>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td>
                    {log.totalAmount ? (
                      <strong style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                        ₹{Number(log.totalAmount).toLocaleString()}
                      </strong>
                    ) : (
                      <span className="muted">-</span>
                    )}
                  </td>
                  <td>
                    <span className="muted" style={{ fontSize: "12px" }}>{log.createdBy.name}</span>
                  </td>
                </tr>
              ))}
              {filteredLogs.length === 0 && !loading && (
                <tr>
                  <td colSpan={isAll ? 10 : 9} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                    No harvest records match the selected filters.
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
              <h3 style={{ margin: 0, fontSize: "18px" }}>
                Record Harvest Batch {isAll ? `on ${farms[0]?.name}` : `on ${selectedFarm?.name}`}
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddModal(false)}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddHarvest} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Plot Parcel *</label>
                  <select
                    value={selectedPlotId}
                    onChange={(e) => {
                      setSelectedPlotId(e.target.value);
                      const p = (isAll ? farms[0] : selectedFarm)?.plots.find((plt) => plt.id === e.target.value);
                      setSelectedCycleId(p?.cropCycles[0]?.id || "");
                    }}
                    required
                    className="input-field"
                  >
                    {(isAll ? farms[0] : selectedFarm)?.plots.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Crop Cycle *</label>
                  <select
                    value={selectedCycleId}
                    onChange={(e) => setSelectedCycleId(e.target.value)}
                    required
                    className="input-field"
                  >
                    {activePlot?.cropCycles.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.cropName}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Harvest Date *</label>
                  <input
                    type="date"
                    name="harvestDate"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Quality Grade *</label>
                  <select name="grade" required className="input-field">
                    <option value="GRADE_A">Grade A (Premium / Export)</option>
                    <option value="GRADE_B">Grade B (Domestic Wholesale)</option>
                    <option value="GRADE_C">Grade C (Local / Processing)</option>
                    <option value="REJECT">Reject / Wastage</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Harvest Quantity *</label>
                  <input
                    type="number"
                    name="quantity"
                    step="0.01"
                    min="0.1"
                    required
                    placeholder="e.g. 1250"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Measurement Unit *</label>
                  <select name="unit" required className="input-field">
                    <option value="KG">Kilograms (kg)</option>
                    <option value="QUINTAL">Quintals (100 kg)</option>
                    <option value="CRATES">Standard Crates (20 kg)</option>
                    <option value="BOXES">Carton Boxes</option>
                    <option value="TONNES">Metric Tonnes</option>
                  </select>
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Buyer / Mandi</label>
                  <input
                    type="text"
                    name="buyerOrMarket"
                    placeholder="e.g. Vashi APMC Mandi"
                    className="input-field"
                  />
                </div>

                <div>
                  <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Vehicle / Dispatch No</label>
                  <input
                    type="text"
                    name="vehicleNumber"
                    placeholder="e.g. MH-12-AB-1234"
                    className="input-field"
                  />
                </div>
              </div>

              <div>
                <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Price Realized Per Unit (₹ INR)</label>
                <input
                  type="number"
                  name="pricePerUnit"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 45.00"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Field Notes</label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="e.g. Morning harvest between 6:00 AM - 10:00 AM. Total 62 crates loaded onto tempo."
                  className="input-field"
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowAddModal(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-green"
                >
                  {pending ? "Saving..." : "Confirm & Save Harvest"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
