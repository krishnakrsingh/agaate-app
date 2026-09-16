import Link from "next/link";
import { redirect } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { hasPermission } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { Icons } from "@/components/icons";
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
    });

    if (client) {
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
          },
        },
      };
    }
  }

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "HQ", href: "/hq" }, { label: "Onboarding", href: "/hq/onboarding" }, { label: "New" }]} />
        <div
          style={{
            margin: "8px 0 20px",
            padding: "14px 18px",
            background: "var(--surface-card)",
            border: "1px solid var(--hairline)",
            borderRadius: "var(--radius-lg, 12px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 16,
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0, flex: 1 }}>
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: 10,
                background: "var(--ink)",
                color: "#ffffff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
                fontWeight: 700,
                flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0, 0, 0, 0.14)",
              }}
            >
              {serverDraft?.payload?.client?.name ? (
                serverDraft.payload.client.name.charAt(0).toUpperCase()
              ) : (
                <Icons.User size={20} style={{ color: "#ffffff" }} />
              )}
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <h1
                  style={{
                    fontSize: 17,
                    fontWeight: 700,
                    margin: 0,
                    letterSpacing: "-0.015em",
                    color: "var(--ink)",
                    lineHeight: 1.25,
                  }}
                >
                  {serverDraft?.payload?.client?.name
                    ? `Onboard Estate for ${serverDraft.payload.client.name}`
                    : "New Client Onboarding"}
                </h1>
                {clientId && (
                  <span
                    style={{
                      fontSize: 10.5,
                      fontWeight: 700,
                      color: "var(--ink)",
                      background: "var(--surface-strong)",
                      border: "1px solid var(--hairline)",
                      padding: "2px 8px",
                      borderRadius: "var(--radius-pill)",
                      letterSpacing: "0.04em",
                    }}
                  >
                    HQ DIRECTORY • {clientId.toUpperCase()}
                  </span>
                )}
              </div>
              <p
                style={{
                  margin: "3px 0 0",
                  fontSize: 12.5,
                  color: "var(--muted)",
                  lineHeight: 1.4,
                }}
              >
                {serverDraft?.payload?.client?.name
                  ? `Configure new farm estates, GIS boundaries, plots, and team credentials for ${serverDraft.payload.client.name}.`
                  : "Complete client intake, add farm estates, map GIS plot boundaries, and issue admin team credentials."}
              </p>
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
            <Link
              className="btn btn-secondary btn-sm"
              href="/hq/onboarding"
              style={{ fontSize: 12, padding: "5px 14px", height: 34, gap: 6 }}
            >
              <Icons.ArrowLeft size={13} />
              <span>Return to List</span>
            </Link>
          </div>
        </div>
        <OnboardingWizard serverDraft={serverDraft} existingClientId={clientId} />
      </main>
    </>
  );
}
