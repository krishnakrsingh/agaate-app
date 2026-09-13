import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OnboardingWorkspace } from "@/components/admin/onboarding/onboarding-workspace";

export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const session = await requireSession();
  if (session.role === "SUPER_ADMIN") {
    redirect("/hq/onboarding");
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>Onboarding Pipeline</h1>
        </div>

        <Suspense fallback={<div style={{ padding: "32px", textAlign: "center", color: "var(--muted)" }}>Loading onboarding cases…</div>}>
          <OnboardingWorkspace />
        </Suspense>
      </main>
    </>
  );
}
