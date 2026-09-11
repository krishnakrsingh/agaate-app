import { Suspense } from "react";
import Link from "next/link";
import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Icons } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function OwnerRecordsPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const [harvestCount, inventoryCount, expenseCount] = await Promise.all([
    prisma.harvestLog.count({ where: { farm: farmWhere } }),
    prisma.inventoryItem.count({ where: { farm: farmWhere } }),
    prisma.expenseLog.count({ where: { farm: farmWhere } }),
  ]);

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Logistics & Records" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              ESTATE • LOGISTICS &amp; OPERATIONAL RECORDS
            </div>
            <h1>Logistics &amp; Records</h1>
            <p className="muted">
              Unified registry of harvest weighbridge receipts, shed stock inventory transactions, and operating expenditures.
            </p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px" }}>
          {/* Harvest Card */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-xl)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Icons.Truck size={20} style={{ color: "var(--primary)" }} />
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                Harvest Logistics
              </h3>
            </div>
            <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}>
              Yield quantities, produce grade sorting, buyer dispatches, and vehicle transport receipts.
            </p>
            <div style={{ fontSize: "24px", fontWeight: 600, fontFamily: "var(--font-mono)", marginTop: "4px" }}>
              {harvestCount} <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--muted)" }}>logs recorded</span>
            </div>
            <Link href="/owner/harvest" className="btn btn-secondary btn-sm" style={{ marginTop: "auto" }}>
              Open Harvest Console →
            </Link>
          </div>

          {/* Shed Inventory Card */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-xl)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Icons.Package size={20} style={{ color: "var(--primary)" }} />
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                Shed Stock Inventory
              </h3>
            </div>
            <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}>
              Fertilizers, agrochemicals, seed varieties, reorder thresholds, and material issue slips.
            </p>
            <div style={{ fontSize: "24px", fontWeight: 600, fontFamily: "var(--font-mono)", marginTop: "4px" }}>
              {inventoryCount} <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--muted)" }}>skus in shed</span>
            </div>
            <Link href="/owner/inventory" className="btn btn-secondary btn-sm" style={{ marginTop: "auto" }}>
              Open Inventory Console →
            </Link>
          </div>

          {/* Financials Card */}
          <div
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--hairline)",
              borderRadius: "var(--radius-xl)",
              padding: "24px",
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <Icons.Coins size={20} style={{ color: "var(--primary)" }} />
              <h3 style={{ fontSize: "18px", fontWeight: 600, color: "var(--ink)", margin: 0 }}>
                Financials &amp; Expenditure
              </h3>
            </div>
            <p style={{ fontSize: "14px", color: "var(--muted)", margin: 0 }}>
              Operating expense logs, daily labor wage disbursements, and material purchasing receipts.
            </p>
            <div style={{ fontSize: "24px", fontWeight: 600, fontFamily: "var(--font-mono)", marginTop: "4px" }}>
              {expenseCount} <span style={{ fontSize: "14px", fontWeight: 400, color: "var(--muted)" }}>entries logged</span>
            </div>
            <Link href="/owner/financials" className="btn btn-secondary btn-sm" style={{ marginTop: "auto" }}>
              Open Financials Console →
            </Link>
          </div>
        </div>
      </main>
    </>
  );
}
