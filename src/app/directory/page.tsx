import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { UnifiedDirectory } from "@/components/ops/unified-directory";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Directory" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              PORTFOLIO • UNIFIED HIGH-PERFORMANCE DIRECTORY
            </div>
            <h1>Entity Directory</h1>
            <p className="muted">
              Unified operational registry across 25,000+ farms, 10,000+ clients, users, and demarcated land plots. Sub-second server search, faceted filtering, and bulk workflow executions.
            </p>
          </div>
        </div>

        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading directory index…</div>}>
          <UnifiedDirectory />
        </Suspense>
      </main>
    </>
  );
}
