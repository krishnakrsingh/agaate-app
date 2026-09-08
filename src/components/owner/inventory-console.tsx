"use client";
import { useEffect, useState, FormEvent } from "react";
import { Icons } from "@/components/icons";
import { useToast } from "@/components/ui/toast";
import { formatDate } from "@/lib/business";
import { downloadCsv } from "@/lib/export";

type Farm = {
  id: string;
  name: string;
};

type InventoryTx = {
  id: string;
  type: string;
  quantity: string;
  notes?: string | null;
  createdAt: string;
};

type InventoryItem = {
  id: string;
  farmId: string;
  name: string;
  category: string;
  quantityInStock: string;
  unit: string;
  reorderLevel?: string | null;
  costPerUnit?: string | null;
  isLowStock: boolean;
  transactions?: InventoryTx[];
  updatedAt: string;
};

export function InventoryConsole({ farms }: { farms: Farm[] }) {
  const toast = useToast();
  const [selectedFarmId, setSelectedFarmId] = useState(farms[0]?.id || "");
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [showLowOnly, setShowLowOnly] = useState(false);
  
  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [activeTxItem, setActiveTxItem] = useState<InventoryItem | null>(null);
  const [pending, setPending] = useState(false);

  const loadInventory = async () => {
    if (!selectedFarmId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/inventory?farmId=${selectedFarmId}`);
      if (res.ok) {
        setItems(await res.json());
      }
    } catch {
      toast.show("Failed to load shed inventory", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadInventory();
  }, [selectedFarmId]);

  const filteredItems = items.filter((item) => {
    if (showLowOnly && !item.isLowStock) return false;
    if (categoryFilter !== "ALL" && item.category !== categoryFilter) return false;
    return true;
  });

  const totalSKUs = items.length;
  const lowStockCount = items.filter((i) => i.isLowStock).length;
  const totalValuation = items.reduce((acc, curr) => {
    const qty = Number(curr.quantityInStock) || 0;
    const cost = Number(curr.costPerUnit) || 0;
    return acc + qty * cost;
  }, 0);

  const handleAddItem = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPending(true);
    const form = new FormData(e.currentTarget);
    const body = {
      farmId: selectedFarmId,
      name: form.get("name"),
      category: form.get("category"),
      quantity: Number(form.get("quantity")),
      unit: form.get("unit"),
      reorderLevel: form.get("reorderLevel") ? Number(form.get("reorderLevel")) : null,
      costPerUnit: form.get("costPerUnit") ? Number(form.get("costPerUnit")) : null,
    };

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to add inventory item");
      }
      toast.show("Inventory item saved to shed", "success");
      setShowAddModal(false);
      void loadInventory();
    } catch (err: any) {
      toast.show(err.message || "Failed to save item", "error");
    } finally {
      setPending(false);
    }
  };

  const handleLogTransaction = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!activeTxItem) return;
    setPending(true);
    const form = new FormData(e.currentTarget);
    const body = {
      itemId: activeTxItem.id,
      type: form.get("type"),
      quantity: Number(form.get("quantity")),
      notes: form.get("notes"),
    };

    try {
      const res = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to log transaction");
      }
      toast.show("Inventory balance updated", "success");
      setActiveTxItem(null);
      void loadInventory();
    } catch (err: any) {
      toast.show(err.message || "Transaction error", "error");
    } finally {
      setPending(false);
    }
  };

  const categoryColor: Record<string, string> = {
    FERTILIZER: "bg-amber-500/10 text-amber-500 border-amber-500/20",
    PESTICIDE: "bg-rose-500/10 text-rose-500 border-rose-500/20",
    SEED: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20",
    IRRIGATION: "bg-cyan-500/10 text-cyan-500 border-cyan-500/20",
    PACKAGING: "bg-purple-500/10 text-purple-500 border-purple-500/20",
    TOOLS: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    OTHER: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
              <Icons.Package className="w-6 h-6 text-emerald-400" />
              Shed & Inventory Ledger
            </h1>
            <span className="text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full font-medium">
              Owner Oversight
            </span>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Real-time fertilizer, agro-chemical, seeds and equipment stock. Prevents input leakage and stock-outs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {farms.length > 1 && (
            <select
              value={selectedFarmId}
              onChange={(e) => setSelectedFarmId(e.target.value)}
              className="bg-zinc-900 border border-zinc-800 text-zinc-100 text-sm rounded-lg px-3 py-2 outline-none focus:border-emerald-500 transition-colors"
            >
              {farms.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.name}
                </option>
              ))}
            </select>
          )}

          <button
            onClick={handleExportCsv}
            disabled={items.length === 0}
            className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-medium text-sm px-4 py-2 rounded-lg transition-colors border border-zinc-700 disabled:opacity-50"
            title="Download CSV for warehouse audit & tax records"
          >
            <Icons.FileText className="w-4 h-4" />
            Export CSV
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm px-4 py-2 rounded-lg transition-colors shadow-sm"
          >
            <Icons.Plus className="w-4 h-4" />
            Add SKU
          </button>
        </div>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Total Tracked Items</span>
            <Icons.Package className="w-4 h-4 text-zinc-500" />
          </div>
          <div className="text-2xl font-bold text-white mt-2">{totalSKUs} <span className="text-xs text-zinc-500 font-normal">items</span></div>
          <div className="text-xs text-zinc-500 mt-1">Across chemicals, fertilizers, & seeds</div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Low Stock Reorders</span>
            <Icons.AlertTriangle className={`w-4 h-4 ${lowStockCount > 0 ? "text-amber-400" : "text-zinc-500"}`} />
          </div>
          <div className={`text-2xl font-bold mt-2 ${lowStockCount > 0 ? "text-amber-400" : "text-white"}`}>
            {lowStockCount} <span className="text-xs text-zinc-500 font-normal">below threshold</span>
          </div>
          <div className="text-xs text-zinc-500 mt-1">
            {lowStockCount > 0 ? "Risk of farm operation disruption" : "Adequate safety stock available"}
          </div>
        </div>

        <div className="p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/60 backdrop-blur">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">Estimated Shed Valuation</span>
            <Icons.Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold text-emerald-400 mt-2">
            ₹{totalValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-xs text-zinc-500 mt-1">Stored capital in shed warehouse</div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-zinc-900/40 border border-zinc-800 rounded-xl">
        <div className="flex flex-wrap items-center gap-1.5">
          {["ALL", "FERTILIZER", "PESTICIDE", "SEED", "IRRIGATION", "PACKAGING", "TOOLS", "OTHER"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                categoryFilter === cat
                  ? "bg-zinc-700 text-white shadow-sm"
                  : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
              }`}
            >
              {cat.replace("_", " ")}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 select-none">
          <input
            type="checkbox"
            checked={showLowOnly}
            onChange={(e) => setShowLowOnly(e.target.checked)}
            className="rounded border-zinc-700 bg-zinc-800 text-amber-500 focus:ring-0"
          />
          Show Low Stock Only
        </label>
      </div>

      {/* Items Table */}
      <div className="border border-zinc-800/80 rounded-xl overflow-hidden bg-zinc-900/60 backdrop-blur">
        {loading ? (
          <div className="p-8 text-center text-zinc-400">
            <Icons.Spinner className="w-6 h-6 animate-spin mx-auto text-emerald-500 mb-2" />
            Loading shed inventory...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="p-12 text-center">
            <Icons.Package className="w-10 h-10 text-zinc-600 mx-auto mb-3" />
            <div className="text-zinc-300 font-medium">No inventory items found</div>
            <p className="text-xs text-zinc-500 mt-1">
              Add products or fertilizers used on this estate to monitor burn rate and stock depletion.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-2 rounded-lg font-medium"
            >
              <Icons.Plus className="w-3.5 h-3.5" />
              Add First Item
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="text-xs uppercase bg-zinc-800/50 text-zinc-400 border-b border-zinc-800">
                <tr>
                  <th className="px-4 py-3">Item Name</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3 text-right">Available Stock</th>
                  <th className="px-4 py-3 text-right">Reorder Threshold</th>
                  <th className="px-4 py-3 text-right">Unit Rate (₹)</th>
                  <th className="px-4 py-3 text-right">Valuation (₹)</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredItems.map((item) => {
                  const stockNum = Number(item.quantityInStock);
                  const costNum = Number(item.costPerUnit) || 0;
                  const itemValuation = stockNum * costNum;

                  return (
                    <tr key={item.id} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-white flex items-center gap-2">
                          {item.name}
                          {item.isLowStock && (
                            <span className="inline-flex items-center gap-1 text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-1.5 py-0.5 rounded font-medium">
                              <Icons.AlertTriangle className="w-2.5 h-2.5" /> Low Stock
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-zinc-500">Updated {formatDate(item.updatedAt)}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs px-2 py-0.5 rounded border font-medium ${
                            categoryColor[item.category] || categoryColor.OTHER
                          }`}
                        >
                          {item.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span className={`font-mono font-semibold ${item.isLowStock ? "text-amber-400" : "text-zinc-100"}`}>
                          {stockNum.toLocaleString()}
                        </span>{" "}
                        <span className="text-xs text-zinc-400">{item.unit}</span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-400">
                        {item.reorderLevel ? `${Number(item.reorderLevel).toLocaleString()} ${item.unit}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-zinc-400">
                        {item.costPerUnit ? `₹${Number(item.costPerUnit).toLocaleString()}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-400 font-medium">
                        {itemValuation > 0 ? `₹${itemValuation.toLocaleString("en-IN", { maximumFractionDigits: 0 })}` : "-"}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => setActiveTxItem(item)}
                          className="text-xs px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 transition-colors font-medium inline-flex items-center gap-1"
                        >
                          <Icons.Clock className="w-3 h-3 text-zinc-400" />
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Icons.Package className="w-5 h-5 text-emerald-400" />
                Add Shed Item (SKU)
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Item / Product Name *</label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g. NPK 19-19-19, Neem Oil, Drip Pipes"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Category *</label>
                  <select
                    name="category"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  >
                    <option value="FERTILIZER">Fertilizer</option>
                    <option value="PESTICIDE">Pesticide / Bio-control</option>
                    <option value="SEED">Seed / Planting Material</option>
                    <option value="IRRIGATION">Irrigation / Fittings</option>
                    <option value="PACKAGING">Packaging / Crates</option>
                    <option value="TOOLS">Tools & Machinery</option>
                    <option value="OTHER">Other / Consumable</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Unit of Measure *</label>
                  <input
                    type="text"
                    name="unit"
                    defaultValue="KG"
                    placeholder="KG, L, BAGS, PCS"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Current Stock *</label>
                  <input
                    type="number"
                    step="0.01"
                    name="quantity"
                    placeholder="0"
                    required
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Reorder Level</label>
                  <input
                    type="number"
                    step="0.01"
                    name="reorderLevel"
                    placeholder="Min qty alert"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Cost Per Unit (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    name="costPerUnit"
                    placeholder="₹ rate"
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {pending && <Icons.Spinner className="w-3.5 h-3.5 animate-spin" />}
                  Register Item
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Adjust Stock Transaction Modal */}
      {activeTxItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
              <div>
                <h2 className="text-lg font-bold text-white">Log Stock Movement</h2>
                <div className="text-xs text-zinc-400 mt-0.5">
                  Item: <span className="text-emerald-400 font-semibold">{activeTxItem.name}</span> (Current:{" "}
                  {Number(activeTxItem.quantityInStock)} {activeTxItem.unit})
                </div>
              </div>
              <button
                onClick={() => setActiveTxItem(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <Icons.X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleLogTransaction} className="space-y-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Movement Type *</label>
                <select
                  name="type"
                  required
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                >
                  <option value="STOCK_OUT">Stock Out / Consumed on Plot (-)</option>
                  <option value="STOCK_IN">Stock In / New Purchase (+)</option>
                  <option value="ADJUSTMENT">Audit Adjustment (Spillage / Count Correction)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Quantity ({activeTxItem.unit}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  name="quantity"
                  required
                  placeholder={`Amount in ${activeTxItem.unit}`}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Reason / Notes / Batch</label>
                <input
                  type="text"
                  name="notes"
                  placeholder="e.g. Applied to Plot B for aphid treatment"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveTxItem(null)}
                  className="px-4 py-2 text-xs font-medium text-zinc-300 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                >
                  {pending && <Icons.Spinner className="w-3.5 h-3.5 animate-spin" />}
                  Record Movement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
