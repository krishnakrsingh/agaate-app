import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { HqFarmRegistry } from "@/components/hq/farm-registry";

export const dynamic = "force-dynamic";

export default async function HqFarmsPage() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return notFound();
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "HQ", href: "/hq" }, { label: "Farms" }]} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow" style={{ margin: 0 }}>
              <span className="eyebrow-dot" />
              HQ • FARMS REGISTRY
            </div>
            <h1 style={{ fontSize: 24, margin: "2px 0 0", fontWeight: 700 }}>Farms</h1>
            <p className="muted" style={{ margin: "4px 0 0", fontSize: 13 }}>
              Super-admin registry across all clients. Farm and Client IDs are always visible for lakh-scale operations.
            </p>
          </div>
        </div>

        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading HQ farm registry…</div>}>
          <HqFarmRegistry />
        </Suspense>
      </main>
    </>
  );
}
