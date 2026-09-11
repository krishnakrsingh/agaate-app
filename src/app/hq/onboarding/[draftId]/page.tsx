import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { OnboardingWizard } from "@/components/hq/onboarding-wizard";
import type { WizardData } from "@/components/hq/onboarding-schema";

export const dynamic = "force-dynamic";

export default async function HqOnboardingDraftPage({ params }: { params: Promise<{ draftId: string }> }) {
  const session = await requireSession();
  if (session.role !== "SUPER_ADMIN") redirect("/dashboard");
  const { draftId } = await params;

  const draft = await prisma.onboardingDraft.findFirst({ where: { id: draftId, createdById: session.userId } });
  if (!draft) notFound();

  if (draft.status === "SUBMITTED") {
    const result = draft.resultJson as { client?: { code?: string } } | null;
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell">
          <Breadcrumbs items={[{ label: "HQ" }, { label: "Client onboarding", href: "/hq/onboarding" }, { label: "Submitted" }]} />
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
      <main className="shell">
        <Breadcrumbs items={[{ label: "HQ" }, { label: "Client onboarding", href: "/hq/onboarding" }, { label: draft.clientName || "Draft" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              HQ • CLIENT ONBOARDING
            </div>
            <h1>Resume onboarding{draft.clientName ? ` — ${draft.clientName}` : ""}</h1>
            <p className="muted">Draft from {new Date(draft.updatedAt).toLocaleString()}. Safe to refresh — the draft is kept.</p>
          </div>
        </div>
        <OnboardingWizard
          serverDraft={{
            id: draft.id,
            idempotencyKey: draft.idempotencyKey,
            payload: (draft.payload ?? {}) as Partial<WizardData>,
            updatedAt: draft.updatedAt.toISOString(),
          }}
        />
      </main>
    </>
  );
}
