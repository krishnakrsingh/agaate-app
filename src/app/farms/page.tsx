import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { FarmRegistry } from "@/components/admin/farm-registry";

export const dynamic = "force-dynamic";

export default async function FarmsPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow" style={{ margin: 0 }}>
              <span className="eyebrow-dot" />
              PORTFOLIO • ESTATE REGISTRY
            </div>
            <h1 style={{ fontSize: 24, margin: "2px 0 0", fontWeight: 700 }}>Farm Portfolio</h1>
          </div>
        </div>

        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading farm portfolio…</div>}>
          <FarmRegistry />
        </Suspense>
      </main>
    </>
  );
}
