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
      <main className="shell" style={{ gap: 12, paddingTop: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Breadcrumbs items={[{ label: "HQ", href: "/hq" }, { label: "Farms" }]} />
        </div>

        <Suspense fallback={<div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading HQ farm registry…</div>}>
          <HqFarmRegistry />
        </Suspense>
      </main>
    </>
  );
}
