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
        <Breadcrumbs items={[{ label: "HQ", href: "/hq" }, { label: "Onboarding", href: "/hq/onboarding" }, { label: "New" }]} />
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>New Client Onboarding</h1>
        </div>
        <OnboardingWizard serverDraft={null} />
      </main>
    </>
  );
}
