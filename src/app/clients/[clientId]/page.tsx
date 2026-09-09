import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { ClientWorkspace } from "@/components/ops/client-workspace";

export const dynamic = "force-dynamic";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ clientId: string }>;
}) {
  const { clientId } = await params;
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return notFound();
  }

  const client = await prisma.client.findUnique({
    where: { id: clientId },
    include: {
      farms: {
        include: {
          plots: {
            where: { deletedAt: null },
            select: { id: true, name: true, area: true, status: true },
          },
          access: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true } },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
      },
      users: {
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!client) {
    return notFound();
  }

  const totalAcreage = client.farms.reduce(
    (acc, f) => acc + Number(f.totalArea || 0),
    0
  );
  const totalCultivable = client.farms.reduce(
    (acc, f) => acc + Number(f.cultivableArea || 0),
    0
  );
  const activeFarms = client.farms.filter((f) => f.status === "ACTIVE").length;
  const setupFarms = client.farms.filter((f) => f.status === "SETUP").length;
  const totalPlots = client.farms.reduce((acc, f) => acc + f.plots.length, 0);

  const serializedClient = {
    ...client,
    createdAt: client.createdAt.toISOString(),
    farms: client.farms.map((f) => ({
      ...f,
      totalArea: f.totalArea.toString(),
      cultivableArea: f.cultivableArea.toString(),
      plots: f.plots.map((p) => ({
        ...p,
        area: p.area.toString(),
      })),
    })),
    users: client.users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
    })),
    metrics: {
      totalAcreage,
      totalCultivable,
      activeFarms,
      setupFarms,
      totalFarms: client.farms.length,
      totalPlots,
      totalUsers: client.users.length,
    },
  };

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs
          items={[
            { label: "Directory", href: "/directory" },
            { label: "Clients", href: "/clients" },
            { label: client.name },
          ]}
        />
        <ClientWorkspace initialClient={serializedClient} />
      </main>
    </>
  );
}
