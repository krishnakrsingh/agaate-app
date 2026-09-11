import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ClientDirectory } from "@/components/hq/client-directory";

export const dynamic = "force-dynamic";

export default async function HqClientsPage() {
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Clients" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can access the HQ client directory.</p>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "HQ", href: "/hq" }, { label: "Clients" }]} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <div className="eyebrow" style={{ margin: 0 }}>
              <span className="eyebrow-dot" />
              HQ • CLIENT DIRECTORY
            </div>
            <h1 style={{ fontSize: 24, margin: "2px 0 0", fontWeight: 700 }}>Clients</h1>
          </div>
        </div>

        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading client directory…</div>}>
          <ClientDirectory />
        </Suspense>
      </main>
    </>
  );
}
