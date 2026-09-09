import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PlatformInsights } from "@/components/ops/platform-insights";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Platform Insights" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              UNDERSTAND • PLATFORM INTELLIGENCE
            </div>
            <h1>Insights & Portfolio Analytics</h1>
            <p className="muted">
              Macro operational intelligence across 25,000+ farms. Geographic density, onboarding stage conversion, and task velocity with instant drill-down.
            </p>
          </div>
        </div>

        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Aggregating analytics data…</div>}>
          <PlatformInsights />
        </Suspense>
      </main>
    </>
  );
}
