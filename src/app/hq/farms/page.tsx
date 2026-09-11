import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
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
        <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Farms</h1>
        <Suspense fallback={<div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading…</div>}>
          <HqFarmRegistry />
        </Suspense>
      </main>
    </>
  );
}
