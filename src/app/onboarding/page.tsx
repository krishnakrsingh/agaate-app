import { Suspense } from "react";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OnboardingWorkspace } from "@/components/admin/onboarding/onboarding-workspace";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireSession();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "Onboarding Workspace" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              OPERATE • ONBOARDING WORKSPACE
            </div>
            <h1>Onboarding Pipeline</h1>
            <p className="muted">
              Operational intake and setup engine. Track in-flight estates across the 5 setup stages, identify SLA bottlenecks, and provision estates at scale.
            </p>
          </div>
        </div>

        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading onboarding cases…</div>}>
          <OnboardingWorkspace />
        </Suspense>
      </main>
    </>
  );
}
