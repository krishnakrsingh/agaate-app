import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@modules/auth";
import { hasPermission } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { OnboardingWizard } from "@modules/onboarding/ui/onboarding-wizard";
import type { WizardData } from "@modules/onboarding/ui/onboarding-schema";

export const dynamic = "force-dynamic";

export default async function HqOnboardingDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const session = await requireSession();
  if (!hasPermission(session.permissions, "onboarding:manage")) redirect("/dashboard");
  const { draftId } = await params;

  const draft = await prisma.onboardingDraft.findFirst({ where: { id: draftId, createdById: session.userId } });
  if (!draft) notFound();

  if (draft.status === "SUBMITTED") {
    const result = draft.resultJson as { client?: { code?: string } } | null;
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell">
          <Breadcrumbs items={[{ label: "Dashboard", href: "/hq" }, { label: "Client onboarding", href: "/hq/onboarding" }, { label: "Submitted" }]} />
          <div className="section-block">
            <div className="form-section-title">Already activated</div>
            <p className="muted" style={{ fontSize: 13 }}>
              This draft was submitted{result?.client?.code ? ` as client ${result.client.code}` : ""}. It cannot be edited or resubmitted.
            </p>
            <Link className="btn btn-secondary" href="/hq/onboarding">
              Back to resume list
            </Link>
          </div>
        </main>
      </>
    );
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell" style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px 40px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 12 }}>
          <Breadcrumbs items={[{ label: "Dashboard", href: "/hq" }, { label: "Onboarding", href: "/hq/onboarding" }, { label: "New Client Intake" }]} />
        </div>
        <OnboardingWizard
          serverDraft={{
            id: draft.id,
            idempotencyKey: draft.idempotencyKey,
            payload: (draft.payload ?? {}) as Partial<WizardData>,
            updatedAt: draft.updatedAt.toISOString(),
          }}
          title="New Client Onboarding"
          backHref="/hq/onboarding"
        />
      </main>
    </>
  );
}
