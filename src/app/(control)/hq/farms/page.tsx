import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSession, hasPermission } from "@modules/auth";
import { Navbar } from "@/components/navigation/navbar";
import { HqFarmRegistry } from "@modules/estates/ui/farm-registry";

export const dynamic = "force-dynamic";

export default async function HqFarmsPage() {
  const session = await requireSession();

  if (!hasPermission(session.permissions, "farms:read_all")) {
    return notFound();
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <div className="dir-root">
          <header className="dir-header">
            <div className="dir-header-text">
              <h1 className="dir-title">Farms</h1>
              <p className="dir-subtitle">Every registered estate across all clients.</p>
            </div>
          </header>
          <Suspense fallback={<div style={{ padding: "24px", textAlign: "center", color: "var(--muted)", fontSize: 13 }}>Loading…</div>}>
            <HqFarmRegistry />
          </Suspense>
        </div>
      </main>
    </>
  );
}
