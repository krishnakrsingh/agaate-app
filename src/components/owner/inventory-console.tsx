"use client";

import { useState, useEffect, useMemo } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";
import { downloadCsv } from "@/lib/export";

interface InventoryItem {
  id: string;
  farmId: string;
  name: string;
  category: string;
  quantityInStock: string | number;
  unit: string;
  costPerUnit?: string | number | null;
  reorderLevel?: string | number | null;
  isLowStock?: boolean;
  createdAt: string;
  updatedAt: string;
}

interface FarmOption {
  id: string;
  name: string;
}

interface Props {
  farms: FarmOption[];
  initialItems?: InventoryItem[];
  farmId?: string;
}

export function InventoryConsole({ farms, initialItems = [], farmId }: Props) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farmId || (farms.length > 0 ? farms[0].id : ""));
  const [items, setItems] = useState<InventoryItem[]>(initialItems);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showLowOnly, setShowLowOnly] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTxItem, setActiveTxItem] = useState<InventoryItem | null>(null);
  const [pending, setPending] = useState(false);

  const loadItems = async () => {
    if (!selectedFarmId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory?farmId=${selectedFarmId}`);
      if (!res.ok) throw new Error("Failed to load inventory");
      const data = await res.json();
      setItems(data || []);
    } catch {
      toast.show("Error loading inventory items", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedFarmId) {
      void loadItems();
    }
  }, [selectedFarmId]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory = categoryFilter === "ALL" || item.category === categoryFilter;
      const matchesLow = !showLowOnly || Boolean(item.isLowStock);
      const matchesSearch =
        !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.category.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesLow && matchesSearch;
    });
  }, [items, categoryFilter, showLowOnly, searchQuery]);

  const totalSKUs = items.length;
  const lowStockCount = items.filter((i) => i.isLowStock).length;
  const totalValuation = items.reduce((acc, item) => {
    const qty = Number(item.quantityInStock) || 0;
    const rate = Number(item.costPerUnit) || 0;
    return acc + qty * rate;
  }, 0);

  const handleAddItem = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          farmId: selectedFarmId,
          name: fd.get("name"),
          category: fd.get("category"),
          unit: fd.get("unit"),
          quantityInStock: parseFloat(fd.get("quantity") as string) || 0,
          reorderLevel: fd.get("reorderLevel") ? parseFloat(fd.get("reorderLevel") as string) : null,
          costPerUnit: fd.get("costPerUnit") ? parseFloat(fd.get("costPerUnit") as string) : null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to register item");
      }

      toast.show("Item added to shed inventory!", "success");
      setShowAddModal(false);
      void loadItems();
    } catch (err: any) {
      toast.show(err.message || "Failed to add item", "error");
    } finally {
      setPending(false);
    }
  };

  const handleLogTransaction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeTxItem) return;
    setPending(true);
    const fd = new FormData(e.currentTarget);

    try {
      const res = await fetch(`/api/inventory/${activeTxItem.id}/transaction`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: fd.get("type"),
          quantity: parseFloat(fd.get("quantity") as string) || 0,
          notes: fd.get("notes"),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to record movement");
      }

      toast.show("Stock movement recorded successfully!", "success");
      setActiveTxItem(null);
      void loadItems();
    } catch (err: any) {
      toast.show(err.message || "Transaction error", "error");
    } finally {
      setPending(false);
    }
  };

  const handleExportCsv = () => {
    const farmName = farms.find((f) => f.id === selectedFarmId)?.name || "Estate";
    const headers = [
      "SKU Name",
      "Category",
      "Current Stock",
      "Unit",
      "Unit Cost (INR)",
      "Total Valuation (INR)",
      "Reorder Level",
      "Low Stock Alert",
      "Last Updated",
    ];
    const rows = items.map((i) => [
      i.name,
      i.category,
      i.quantityInStock,
      i.unit,
      i.costPerUnit || "",
      ((Number(i.quantityInStock) || 0) * (Number(i.costPerUnit) || 0)).toFixed(2),
      i.reorderLevel || "",
      i.isLowStock ? "YES" : "NO",
      i.updatedAt.slice(0, 10),
    ]);
    downloadCsv(`shed-inventory-${farmName.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().slice(0, 10)}`, headers, rows);
    toast.show("Shed inventory exported to CSV!", "success");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "16px 20px",
        }}
      >
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <h1 style={{ fontSize: 18, fontWeight: 700, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <Icons.Package size={20} style={{ color: "var(--green)" }} />
              Shed &amp; Inventory Ledger
            </h1>
            <span className="badge badge-green">Owner Oversight</span>
          </div>
          <p className="muted" style={{ fontSize: 12, margin: "4px 0 0" }}>
            Real-time fertilizer, agro-chemical, seeds and equipment stock. Prevents input leakage and stock-outs.
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          {farms.length > 1 && (
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="input-field"
              style={{ fontSize: 12, padding: "6px 12px", width: "auto" }}
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
            onClick={handleExportCsv}
            disabled={items.length === 0}
            className="btn btn-sm btn-secondary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 12px" }}
            title="Download CSV for warehouse audit & tax records"
          >
            <Icons.FileText size={14} />
            Export CSV
          </button>

          <button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="btn btn-sm btn-primary"
            style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, padding: "6px 14px" }}
          >
            <Icons.Plus size={14} />
            Add SKU
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="metric-summary-row">
        <div className="metric-summary-item">
          <span className="metric-label">Total Tracked Items</span>
          <div className="metric-value font-mono">{totalSKUs}</div>
          <div className="metric-sub">Across chemicals, fertilizers &amp; seeds</div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Low Stock Reorders</span>
          <div className="metric-value font-mono" style={{ color: lowStockCount > 0 ? "var(--amber)" : "var(--green)" }}>
            {lowStockCount}
          </div>
          <div className="metric-sub">
            {lowStockCount > 0 ? "Risk of farm operation disruption" : "Adequate safety stock available"}
          </div>
        </div>

        <div className="metric-summary-item">
          <span className="metric-label">Estimated Shed Valuation</span>
          <div className="metric-value font-mono" style={{ color: "var(--green)" }}>
            ₹{totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="metric-sub">Stored capital in shed warehouse</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div
        className="card"
        style={{
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          padding: "10px 16px",
        }}
      >
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: 6 }}>
          {["ALL", "FERTILIZER", "PESTICIDE", "SEED", "IRRIGATION", "PACKAGING", "TOOLS", "OTHER"].map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`btn btn-sm ${categoryFilter === cat ? "btn-primary" : "btn-ghost"}`}
              style={{ fontSize: 11, padding: "4px 8px" }}
            >
              {cat.replace("_", " ")}
            </button>
          ))}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <input
            type="text"
            placeholder="Search SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ fontSize: 12, padding: "4px 10px", width: 160 }}
          />

          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showLowOnly}
              onChange={(e) => setShowLowOnly(e.target.checked)}
            />
            Low Stock Only
          </label>
        </div>
      </div>

      {/* Items Table */}
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {loading ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--muted)", fontSize: 13 }}>
            <Icons.Spinner size={20} className="animate-spin" style={{ margin: "0 auto 8px", color: "var(--green)" }} />
            Loading shed inventory...
          </div>
        ) : filteredItems.length === 0 ? (
          <div style={{ padding: 48, textAlign: "center" }}>
            <Icons.Package size={32} style={{ color: "var(--muted)", margin: "0 auto 12px" }} />
            <div style={{ fontWeight: 600, color: "var(--ink)", fontSize: 14 }}>No inventory items found</div>
            <p className="muted" style={{ fontSize: 12, marginTop: 4 }}>
              Add products or fertilizers used on this estate to monitor burn rate and stock depletion.
            </p>
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="btn btn-sm btn-primary"
              style={{ marginTop: 16, display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <Icons.Plus size={14} />
              Add First Item
            </button>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table className="data-table" style={{ width: "100%", margin: 0 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: "left" }}>Item Name</th>
                  <th style={{ textAlign: "left" }}>Category</th>
                  <th style={{ textAlign: "right" }}>Available Stock</th>
                  <th style={{ textAlign: "right" }}>Reorder Threshold</th>
                  <th style={{ textAlign: "right" }}>Unit Rate (₹)</th>
                  <th style={{ textAlign: "right" }}>Valuation (₹)</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.map((item) => {
                  const stockNum = Number(item.quantityInStock);
                  const costNum = Number(item.costPerUnit) || 0;
                  const itemValuation = stockNum * costNum;

                  return (
                    <tr key={item.id}>
                      <td>
                        <div style={{ fontWeight: 600, color: "var(--ink)", display: "flex", alignItems: "center", gap: 6 }}>
                          {item.name}
                          {item.isLowStock && (
                            <span className="badge badge-amber font-mono" style={{ fontSize: 9 }}>
                              Low Stock
                            </span>
                          )}
                        </div>
                        <div className="muted" style={{ fontSize: 11 }}>Updated {formatDate(item.updatedAt)}</div>
                      </td>
                      <td>
                        <span className="badge badge-muted font-mono" style={{ fontSize: 10 }}>
                          {item.category}
                        </span>
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <span style={{ fontFamily: "monospace", fontWeight: 700, color: item.isLowStock ? "var(--amber)" : "var(--ink)" }}>
                          {stockNum.toLocaleString()}
                        </span>{" "}
                        <span className="muted" style={{ fontSize: 11 }}>{item.unit}</span>
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--muted)" }}>
                        {item.reorderLevel ? `${Number(item.reorderLevel).toLocaleString()} ${item.unit}` : "-"}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", color: "var(--muted)" }}>
                        {item.costPerUnit ? `₹${Number(item.costPerUnit).toLocaleString()}` : "-"}
                      </td>
                      <td style={{ textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "var(--green)" }}>
                        {itemValuation > 0 ? `₹${itemValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "-"}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        <button
                          type="button"
                          onClick={() => setActiveTxItem(item)}
                          className="btn btn-sm btn-secondary"
                          style={{ fontSize: 11, padding: "4px 8px" }}
                        >
                          Adjust Stock
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Item Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: 500, padding: 24, boxShadow: "var(--shadow-modal)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
              <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <Icons.Package size={18} style={{ color: "var(--green)" }} />
                Add Shed Item (SKU)
              </h2>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddItem} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Item / Product Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. NPK 19-19-19, Neem Oil, Drip Pipes"
                  required
                  className="input-field"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Category *</label>
                  <select
                    name="category"
                    required
                    className="input-field"
                    style={{ width: "100%" }}
                  >
                    <option value="FERTILIZER">Fertilizer</option>
                    <option value="PESTICIDE">Pesticide / Bio-control</option>
                    <option value="SEED">Seed / Planting Material</option>
                    <option value="IRRIGATION">Irrigation / Fittings</option>
                    <option value="PACKAGING">Packaging / Crates</option>
                    <option value="TOOLS">Tools &amp; Machinery</option>
                    <option value="OTHER">Other / Consumable</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Unit of Measure *</label>
                  <input
                    type="text"
                    name="unit"
                    defaultValue="KG"
                    placeholder="KG, L, BAGS, PCS"
                    required
                    className="input-field"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Current Stock *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="quantity"
                    placeholder="0"
                    required
                    className="input-field"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Reorder Level</label>
                  <input
                    type="number"
                    step="0.01"
                    name="reorderLevel"
                    placeholder="Min qty alert"
                    className="input-field"
                    style={{ width: "100%" }}
                  />
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Cost Per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="costPerUnit"
                    placeholder="₹ rate"
                    className="input-field"
                    style={{ width: "100%" }}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-sm btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-sm btn-primary"
                >
                  {pending ? "Saving..." : "Register Item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Transaction Modal */}
      {activeTxItem && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
            backgroundColor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(4px)",
          }}
          onClick={() => setActiveTxItem(null)}
        >
          <div
            className="card"
            style={{ width: "100%", maxWidth: 440, padding: 24, boxShadow: "var(--shadow-modal)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", paddingBottom: 12, borderBottom: "1px solid var(--line)" }}>
              <div>
                <h2 style={{ fontSize: 16, fontWeight: 700, color: "var(--ink)", margin: 0 }}>Log Stock Movement</h2>
                <div className="muted" style={{ fontSize: 12, marginTop: 2 }}>
                  Item: <strong style={{ color: "var(--green)" }}>{activeTxItem.name}</strong> (Current:{" "}
                  {Number(activeTxItem.quantityInStock)} {activeTxItem.unit})
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTxItem(null)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--muted)", padding: 4 }}
              >
                <Icons.X size={16} />
              </button>
            </div>

            <form onSubmit={handleLogTransaction} style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 16 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Movement Type *</label>
                <select
                  name="type"
                  required
                  className="input-field"
                  style={{ width: "100%" }}
                >
                  <option value="STOCK_OUT">Stock Out / Consumed on Plot (-)</option>
                  <option value="STOCK_IN">Stock In / New Purchase (+)</option>
                  <option value="ADJUSTMENT">Audit Adjustment (Spillage / Count Correction)</option>
                </select>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>
                  Quantity ({activeTxItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="quantity"
                  required
                  placeholder={`Amount in ${activeTxItem.unit}`}
                  className="input-field"
                  style={{ width: "100%" }}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--ink)", marginBottom: 4 }}>Reason / Notes / Batch</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="e.g. Applied to Plot B for aphid treatment"
                  className="input-field"
                  style={{ width: "100%" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, paddingTop: 12, borderTop: "1px solid var(--line)" }}>
                <button
                  type="button"
                  onClick={() => setActiveTxItem(null)}
                  className="btn btn-sm btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="btn btn-sm btn-primary"
                >
                  {pending ? "Recording..." : "Record Movement"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
