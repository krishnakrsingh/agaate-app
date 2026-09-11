import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OnboardingWizard } from "@/components/hq/onboarding-wizard";

export const dynamic = "force-dynamic";

export default async function HqOnboardingNewPage() {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "HQ" }, { label: "Client onboarding", href: "/hq/onboarding" }, { label: "New" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              HQ • CLIENT ONBOARDING
            </div>
            <h1>Onboard a client</h1>
            <p className="muted">Five steps: client, farms, plots, team login, review. Safe to refresh — the draft is kept.</p>
          </div>
        </div>
        <OnboardingWizard serverDraft={null} />
      </main>
    </>
  );
}
