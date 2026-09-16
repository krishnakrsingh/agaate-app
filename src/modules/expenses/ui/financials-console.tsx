"use client";
import { useEffect, useState, FormEvent, useMemo } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";
import { downloadCsv } from "@/lib/export";

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
  farm?: { id: string; name: string };
  recordedBy: { id: string; name: string; role: string };
};

export function FinancialsConsole({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms.length > 1 ? "ALL" : farms[0]?.id || "");
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categorySums, setCategorySums] = useState<{ category: string; total: number }[]>([]);
  const [totalBurn, setTotalBurn] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [pending, setPending] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("ALL");

  const isAll = selectedFarmId === "ALL";
  const selectedFarm = farms.find((f) => f.id === selectedFarmId) || farms[0];

  const loadExpenses = async () => {
    setLoading(true);
    try {
      const url = isAll ? "/api/expenses" : `/api/expenses?farmId=${selectedFarmId}`;
      const res = await fetch(url);
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
  }, [selectedFarmId, isAll]);

  async function handleAddExpense(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);
    const targetFarmId = isAll ? farms[0]?.id : selectedFarmId;

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: targetFarmId,
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

  const filteredExpenses = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return expenses.filter((e) => {
      const matchesSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.farm?.name && e.farm.name.toLowerCase().includes(q)) ||
        (e.recordedBy?.name && e.recordedBy.name.toLowerCase().includes(q));

      const matchesCat = categoryFilter === "ALL" || e.category === categoryFilter;
      return matchesSearch && matchesCat;
    });
  }, [expenses, searchQuery, categoryFilter]);

  const handleExportCsv = () => {
    const scopeLabel = isAll ? "all-estates" : (selectedFarm?.name || "estate").toLowerCase().replace(/\s+/g, "-");
    const headers = isAll
      ? ["Date", "Estate", "Category", "Amount (INR)", "Description", "Recorded By", "Role"]
      : ["Date", "Category", "Amount (INR)", "Description", "Recorded By", "Role"];

    const rows = filteredExpenses.map((e) => {
      if (isAll) {
        return [
          e.date.slice(0, 10),
          e.farm?.name || "N/A",
          e.category,
          e.amount,
          e.description,
          e.recordedBy?.name || "N/A",
          e.recordedBy?.role || "N/A",
        ];
      }
      return [
        e.date.slice(0, 10),
        e.category,
        e.amount,
        e.description,
        e.recordedBy?.name || "N/A",
        e.recordedBy?.role || "N/A",
      ];
    });

    downloadCsv(`financial-ledger-${scopeLabel}-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.success("Financial ledger exported to CSV!");
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
                ? `PORTFOLIO FINANCIALS • ${farms.length} ESTATES`
                : `ESTATE LEDGER • ${selectedFarm?.name}`}
            </span>
          </div>
          <h1 className="page-title">Farm Financials &amp; Expense Ledger</h1>
          <p className="muted" style={{ marginTop: 4 }}>
            Direct oversight over agricultural operational spending: labour wages, input chemicals, machinery diesel, electricity, and repairs.
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
            disabled={filteredExpenses.length === 0}
            title="Download CSV for chartered accountant & tax records"
          >
            <Icons.FileText size={15} />
            <span>Export CSV</span>
          </button>

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

      {/* ── 2. EXECUTIVE FINANCIAL TELEMETRY ── */}
      <div className="metric-summary-row" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}>
        <div className="metric-summary-item">
          <span className="metric-label">Total Spend (MTD)</span>
          <div className="metric-value" style={{ color: "var(--ink)" }}>
            ₹{totalBurn.toLocaleString()}
          </div>
          <div className="metric-sub">
            {isAll ? `Across ${farms.length} client estates` : "Current calendar month"}
          </div>
        </div>

        {categorySums.slice(0, 3).map((cs) => (
          <div key={cs.category} className="metric-summary-item">
            <span className="metric-label">{cs.category.replaceAll("_", " ")}</span>
            <div className="metric-value" style={{ color: "var(--green)" }}>
              ₹{cs.total.toLocaleString()}
            </div>
            <div className="metric-sub">
              {totalBurn > 0 ? `${Math.round((cs.total / totalBurn) * 100)}% of total burn` : "Active category"}
            </div>
          </div>
        ))}
      </div>

      {/* ── 3. DETAILED LEDGER TABLE WITH ADVANCED SEARCH & FILTER ── */}
      <div className="compact-card" style={{ padding: 22, gap: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <span className="mono-label" style={{ color: "var(--green-dark)" }}>CHRONOLOGICAL LEDGER</span>
            <h2 className="section-title" style={{ fontSize: "17px", margin: "2px 0 0" }}>
              Logged Expenditure Entries ({filteredExpenses.length})
            </h2>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-field"
              style={{ fontSize: "12px", height: 34, width: "auto" }}
            >
              <option value="ALL">All Categories</option>
              <option value="LABOUR_WAGES">Labour Wages</option>
              <option value="INPUTS">Inputs / Fertilizer</option>
              <option value="MACHINERY_FUEL">Machinery &amp; Diesel</option>
              <option value="ELECTRICITY">Electricity</option>
              <option value="REPAIRS">Repairs &amp; Maintenance</option>
              <option value="OTHER">Other</option>
            </select>

            <div style={{ position: "relative", width: 220 }}>
              <input
                type="text"
                placeholder="Search description, staff…"
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
                <th>Category</th>
                <th>Description</th>
                <th>Amount</th>
                <th>Recorded By</th>
              </tr>
            </thead>
            <tbody>
              {filteredExpenses.map((exp) => (
                <tr key={exp.id}>
                  <td>
                    <strong>{formatDate(exp.date)}</strong>
                  </td>
                  {isAll && (
                    <td>
                      <span style={{ fontWeight: 600, color: "var(--ink)" }}>
                        {exp.farm?.name || "Estate"}
                      </span>
                    </td>
                  )}
                  <td>
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 600,
                        padding: "2px 8px",
                        borderRadius: "var(--radius-pill)",
                        background: "var(--stone)",
                        border: "1px solid var(--stone)",
                        color: "var(--ink)",
                      }}
                    >
                      {exp.category.replaceAll("_", " ")}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: "var(--ink)" }}>{exp.description}</span>
                  </td>
                  <td>
                    <strong style={{ color: "var(--ink)", fontFamily: "var(--font-mono)" }}>
                      ₹{Number(exp.amount).toLocaleString()}
                    </strong>
                  </td>
                  <td>
                    <span className="muted" style={{ fontSize: "12px" }}>{exp.recordedBy?.name || "N/A"}</span>
                  </td>
                </tr>
              ))}
              {filteredExpenses.length === 0 && !loading && (
                <tr>
                  <td colSpan={isAll ? 6 : 5} style={{ textAlign: "center", padding: 36, color: "var(--muted)" }}>
                    No expenses match the selected filters.
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
              <h3 style={{ margin: 0, fontSize: "18px" }}>
                Record Farm Expense {isAll ? `on ${farms[0]?.name}` : `on ${selectedFarm?.name}`}
              </h3>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => setShowAddModal(false)}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Date *</label>
                <input
                  type="date"
                  name="date"
                  required
                  defaultValue={new Date().toISOString().slice(0, 10)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Expense Category *</label>
                <select name="category" required className="input-field">
                  <option value="LABOUR_WAGES">Labour Wages</option>
                  <option value="INPUTS">Inputs (Fertilizers / Sprays / Seeds)</option>
                  <option value="MACHINERY_FUEL">Machinery Fuel &amp; Diesel</option>
                  <option value="ELECTRICITY">Electricity &amp; Power</option>
                  <option value="REPAIRS">Equipment &amp; Infrastructure Repairs</option>
                  <option value="OTHER">Other Operational Expense</option>
                </select>
              </div>

              <div>
                <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Amount (₹ INR) *</label>
                <input
                  type="number"
                  name="amount"
                  step="0.01"
                  min="1"
                  required
                  placeholder="e.g. 4500"
                  className="input-field"
                />
              </div>

              <div>
                <label className="mono-label" style={{ display: "block", marginBottom: 4 }}>Description / Purpose *</label>
                <textarea
                  name="description"
                  required
                  rows={3}
                  placeholder="e.g. 15 bags 19:19:19 NPK soluble fertilizer purchased from local kisan seva kendra."
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
                  {pending ? "Saving..." : "Confirm & Save Expense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
