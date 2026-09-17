import { notFound } from "next/navigation";
import { requireSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { ClientEditForm } from "@modules/estates/ui/client-edit-form";

export const dynamic = "force-dynamic";

export default async function EditClientPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const session = await requireSession();

  // Matches PATCH /api/admin/clients/[clientId].
  if (session.role !== "SUPER_ADMIN") {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Clients", href: "/hq/clients" }, { label: "Edit Client" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins can edit client details.</p>
        </main>
      </>
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      companyName: true,
      email: true,
      phone: true,
      whatsappNo: true,
      entityType: true,
      panNumber: true,
      gstin: true,
      secondaryContact: true,
      billingAddress: true,
      village: true,
      city: true,
      state: true,
      district: true,
      pincode: true,
      financeConnect: true,
      purchaserConnect: true,
    },
  });

  if (!client) notFound();

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        <Breadcrumbs
          items={[
            { label: "HQ" },
            { label: "Clients", href: "/hq/clients" },
            { label: client.name, href: `/hq/clients/${client.id}` },
            { label: "Edit Client" },
          ]}
        />
        <ClientEditForm client={client} returnTo={`/hq/clients/${client.id}`} />
      </main>
    </>
  );
}
