import { redirect } from "next/navigation";
import { requireSession } from "@modules/auth";
import { hasPermission } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { OnboardingWizard, type ServerDraftProp } from "@modules/onboarding/ui/onboarding-wizard";
import { newIdempotencyKey } from "@modules/onboarding/ui/onboarding-schema";

export const dynamic = "force-dynamic";

type Props = {
  searchParams?: Promise<{ clientId?: string; draftId?: string }>;
};

export default async function HqOnboardingNewPage({ searchParams }: Props) {
  const session = await requireSession();
  if (!hasPermission(session.permissions, "onboarding:manage")) redirect("/dashboard");

  const resolvedParams = searchParams ? await searchParams : {};
  const clientId = resolvedParams.clientId?.trim();

  let serverDraft: ServerDraftProp = null;

  if (clientId) {
    const client = await prisma.client.findFirst({
      where: {
        OR: [{ id: clientId }, { code: clientId }],
      },
      include: {
        contacts: true,
      },
    });

    if (client) {
      const localContact = client.contacts?.find((c) => c.role === "LOCAL");
      serverDraft = {
        id: "",
        idempotencyKey: newIdempotencyKey(),
        updatedAt: new Date().toISOString(),
        payload: {
          client: {
            name: client.name,
            companyName: client.companyName ?? "",
            phone: client.phone ?? "",
            whatsappNo: client.whatsappNo ?? "",
            email: client.email ?? "",
            panNumber: client.panNumber ?? "",
            gstin: client.gstin ?? "",
            billingAddress: client.billingAddress ?? "",
            village: client.village ?? "",
            city: client.city ?? "",
            state: client.state ?? "",
            district: client.district ?? "",
            pincode: client.pincode ?? "",
            financeConnect: client.financeConnect ?? "",
            purchaserConnect: client.purchaserConnect ?? "",
            localConnectName: localContact?.name ?? "",
            localConnectPhone: localContact?.phone ?? "",
            localConnectSameAsClient: false,
          },
        },
      };
    }
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell" style={{ maxWidth: 1180, margin: "0 auto", padding: "16px 24px 40px", display: "flex", flexDirection: "column" }}>
        <div style={{ marginBottom: 12 }}>
          <Breadcrumbs items={[{ label: "Dashboard", href: "/hq" }, { label: "Onboarding", href: "/hq/onboarding" }, { label: "New Client Intake" }]} />
        </div>
        <OnboardingWizard
          serverDraft={serverDraft}
          existingClientId={clientId}
          title={serverDraft?.payload?.client?.name ? `Onboard Estate for ${serverDraft.payload.client.name}` : "New Client Onboarding"}
          backHref="/hq/onboarding"
        />
      </main>
    </>
  );
}
