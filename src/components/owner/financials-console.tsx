"use client";
import { useEffect, useState, FormEvent } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";

type Farm = {
  id: string;
  name: string;
};

type Expense = {
  id: string;
  date: string;
  category: string;
  amount: string;
  description: string;
  receiptKey?: string | null;
  recordedBy: { id: string; name: string; role: string };
};

export function FinancialsConsole({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categorySums, setCategorySums] = useState<{ category: string; total: number }[]>([]);
  const [totalBurn, setTotalBurn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pending, setPending] = useState(false);

  const loadExpenses = async () => {
    if (!selectedFarmId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/expenses?farmId=${selectedFarmId}`);
      if (res.ok) {
        const data = await res.json();
        setExpenses(data.expenses || []);
        setCategorySums(data.categorySums || []);
        setTotalBurn(data.totalBurn || 0);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadExpenses();
  }, [selectedFarmId]);

  async function handleAddExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: selectedFarmId,
          date: fd.get("date"),
          category: fd.get("category"),
          amount: Number(fd.get("amount")),
          description: fd.get("description"),
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || "Failed to log expense");
      }

      toast.success("Operational expense logged successfully!");
      setShowAddModal(false);
      void loadExpenses();
    } catch (err: any) {
      toast.error(err.message || "Failed to record expense");
    } finally {
      setPending(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      {/* ── 1. HEADER & FARM SELECTOR ── */}
      <div className="page-header">
        <div className="page-header-content">
          <div className="eyebrow">
            <span className="eyebrow-dot" />
            <span>FINANCIAL VISIBILITY &bull; BURN RATE &amp; OPERATING COSTS</span>
          </div>
          <h1 className="page-title">Farm Financials &amp; Expense Ledger</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Direct visibility over estate spending: labour wages, input chemicals, tractor fuel, electricity, and repairs.
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
            className="btn btn-green"
            onClick={() => setShowAddModal(true)}
          >
            <Icons.Plus size={15} />
            <span>Record Farm Expense</span>
          </button>
        </div>
      </div>

      {/* ── 2. FINANCIAL TELEMETRY CARDS ── */}
      <div className="metric-summary-row">
        <div className="metric-summary-item">
          <span className="metric-label">Total Operating Spend</span>
          <div className="metric-value" style={{ color: "var(--ink)" }}>
            ₹{totalBurn.toLocaleString()}
          </div>
          <div className="metric-sub">{expenses.length} transaction entries</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Labour Wages</span>
          <div className="metric-value" style={{ color: "var(--green)" }}>
            ₹{((categorySums.find((c) => c.category === "LABOUR_WAGES")?.total) || 0).toLocaleString()}
          </div>
          <div className="metric-sub">Field workforce payouts</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Agri-Inputs &amp; Chemicals</span>
          <div className="metric-value">
            ₹{((categorySums.find((c) => c.category === "INPUTS")?.total) || 0).toLocaleString()}
          </div>
          <div className="metric-sub">Fertilizers, seeds, and sprays</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Machinery, Fuel &amp; Repairs</span>
          <div className="metric-value">
            ₹{(((categorySums.find((c) => c.category === "MACHINERY_FUEL")?.total) || 0) +
              ((categorySums.find((c) => c.category === "REPAIRS")?.total) || 0)).toLocaleString()}
          </div>
          <div className="metric-sub">Tractor diesel &amp; pump upkeep</div>
        </div>
      </div>

      {/* ── 3. EXPENSES TABLE ── */}
      <div className="compact-card" style={{ padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--line)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong style={{ fontSize: "15px" }}>Itemized Operational Ledger</strong>
          <span className="muted" style={{ fontSize: "12px" }}>Showing recent 100 entries</span>
        </div>

        <div style={{ overflowX: "auto" }}>
          <table className="operational-table" style={{ width: "100%", margin: 0, border: "none" }}>
            <thead>
              <tr>
                <th>Date</th>
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td>
                    <strong>{formatDate(exp.date)}</strong>
                  </td>
                  <td>
                    <span className="badge badge-secondary" style={{ fontSize: "11px" }}>
                      {exp.category.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: "var(--ink)" }}>{exp.description}</span>
                  </td>
                  <td>
                    <strong style={{ color: "var(--ink)" }}>₹{Number(exp.amount).toLocaleString()}</strong>
                  </td>
                  <td>
                    <span className="muted" style={{ fontSize: "12px" }}>{exp.recordedBy.name}</span>
                  </td>
                </tr>
              ))}
              {expenses.length === 0 && !loading && (
                <tr>
                  <td colSpan={5} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                    No expenses logged yet. Tap &ldquo;Record Farm Expense&rdquo; to add your first entry.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── 4. RECORD EXPENSE MODAL ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div
            className="modal-content"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: 480, borderRadius: "var(--radius-lg)", padding: 24 }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <h3 style={{ margin: 0, fontSize: "18px" }}>Record Farm Expense</h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddModal(false)}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div className="two-column">
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Expense Date</label>
                  <input
                    name="date"
                    type="date"
                    required
                    defaultValue={new Date().toISOString().slice(0, 10)}
                  />
                </div>
                <div className="form-group" style={{ margin: 0 }}>
                  <label>Category</label>
                  <select name="category" defaultValue="LABOUR_WAGES" required>
                    <option value="LABOUR_WAGES">Labour Wages</option>
                    <option value="INPUTS">Agri-Inputs (Fertilizer/Spray)</option>
                    <option value="MACHINERY_FUEL">Machinery &amp; Diesel</option>
                    <option value="ELECTRICITY">Electricity &amp; Power</option>
                    <option value="REPAIRS">Pump &amp; Infrastructure Repairs</option>
                    <option value="OTHER">Other Miscellaneous</option>
                  </select>
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Amount (₹)</label>
                <input name="amount" type="number" step="1" min="1" required placeholder="e.g. 4500" />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label>Description &amp; Payee</label>
                <textarea
                  name="description"
                  rows={2}
                  required
                  placeholder="e.g., Weekly wages for 8 pruning labourers / Replaced 15HP motor capacitor"
                />
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
                  {pending ? "Saving…" : "Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
