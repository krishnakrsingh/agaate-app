"use client";

import { useState } from "react";
import { Icons } from "@/components/icons";
import { HarvestConsole } from "@modules/harvest/ui/harvest-console";
import { InventoryConsole } from "@modules/inventory/ui/inventory-console";
import { FinancialsConsole } from "@modules/expenses/ui/financials-console";

export interface HarvestFarmPlot {
  id: string;
  name: string;
  cropCycles: {
    id: string;
    cropName: string;
  }[];
}

export interface HarvestFarm {
  id: string;
  name: string;
  plots: HarvestFarmPlot[];
}

export interface SimpleFarm {
  id: string;
  name: string;
}

interface OwnerRecordsViewProps {
  farmsWithPlots: HarvestFarm[];
  farms: SimpleFarm[];
  initialCounts: {
    harvests: number;
    inventory: number;
    expenses: number;
  };
}

export function OwnerRecordsView({
  farmsWithPlots,
  farms,
  initialCounts,
}: OwnerRecordsViewProps) {
  const [activeTab, setActiveTab] = useState<"harvest" | "inventory" | "financials">("harvest");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0, color: "var(--ink)" }}>
            Logistics &amp; Records Console
          </h1>
          <p style={{ fontSize: 14, color: "var(--muted)", margin: "4px 0 0 0" }}>
            Track produce harvest dispatches, farm shed inventory, and operational expenditure across estates.
          </p>
        </div>

        {/* Tab Switcher */}
        <div
          style={{
            display: "inline-flex",
            background: "var(--surface-canvas)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-md)",
            padding: 3,
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab("harvest")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: activeTab === "harvest" ? "var(--surface-card)" : "transparent",
              color: activeTab === "harvest" ? "var(--ink)" : "var(--muted)",
              boxShadow: activeTab === "harvest" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Icons.Truck size={15} />
            <span>Harvest Logistics ({initialCounts.harvests})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("inventory")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: activeTab === "inventory" ? "var(--surface-card)" : "transparent",
              color: activeTab === "inventory" ? "var(--ink)" : "var(--muted)",
              boxShadow: activeTab === "inventory" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Icons.Package size={15} />
            <span>Shed Inventory ({initialCounts.inventory})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("financials")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 14px",
              fontSize: 13,
              fontWeight: 600,
              borderRadius: "var(--radius-sm)",
              border: "none",
              background: activeTab === "financials" ? "var(--surface-card)" : "transparent",
              color: activeTab === "financials" ? "var(--ink)" : "var(--muted)",
              boxShadow: activeTab === "financials" ? "0 1px 3px rgba(0,0,0,0.1)" : "none",
              cursor: "pointer",
              transition: "all 0.15s ease",
            }}
          >
            <Icons.Coins size={15} />
            <span>Expenses &amp; Ledger ({initialCounts.expenses})</span>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === "harvest" && <HarvestConsole farms={farmsWithPlots} />}
      {activeTab === "inventory" && <InventoryConsole farms={farms} />}
      {activeTab === "financials" && <FinancialsConsole farms={farms} />}
    </div>
  );
}
