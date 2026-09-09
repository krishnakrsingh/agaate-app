import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { UnifiedDirectory } from "@/components/ops/unified-directory";

export const dynamic = "force-dynamic";

export default async function FarmsPage() {
  const session = await requireSession();
  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Directory", href: "/directory" }, { label: "Farms" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow"><span className="eyebrow-dot" />PORTFOLIO • FARMS DIRECTORY</div>
            <h1>Farms Directory</h1>
            <p className="muted">Faceted server-side search across 25,000+ farms, bulk status & setup stage advancement, saved views, and CSV export.</p>
          </div>
        </div>
        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading farms directory…</div>}>
          <UnifiedDirectory initialTab="farms" />
        </Suspense>
      </main>
    </>
  );
}
