import { notFound } from "next/navigation";
import { requireSession } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { FarmCreateForm } from "@modules/estates/ui/farm-create-form";

export const dynamic = "force-dynamic";

export default async function AddClientFarmPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const session = await requireSession();

  // Matches createEstate authorization (POST /api/farms).
  if (!["SUPER_ADMIN", "FARM_ADMIN"].includes(session.role)) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "Clients", href: "/hq/clients" }, { label: "Add Farm Estate" }]} />
          <h1>Access Restricted</h1>
          <p className="error">Only Super Admins and Farm Admins can register new farm estates.</p>
        </main>
      </>
    );
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      name: true,
      code: true,
      companyName: true,
      village: true,
      city: true,
      state: true,
      pincode: true,
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
            { label: "Add Farm Estate" },
          ]}
        />
        <FarmCreateForm
          client={{
            id: client.id,
            name: client.name,
            code: client.code || `CLI-${client.id.slice(-4).toUpperCase()}`,
            ownerName: client.companyName || client.name,
            village: client.village,
            city: client.city,
            state: client.state,
            pincode: client.pincode,
          }}
          returnTo={`/hq/clients/${client.id}`}
        />
      </main>
    </>
  );
}
