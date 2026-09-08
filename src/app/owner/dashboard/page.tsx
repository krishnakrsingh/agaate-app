import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { OwnerCockpit } from "@/components/owner/owner-cockpit";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    include: {
      plots: {
        where: { deletedAt: null, status: { not: "ARCHIVED" } },
        include: {
          cropCycles: {
            where: { status: { in: ["ACTIVE", "PLANNED"] } },
            select: { id: true, cropName: true, status: true, startDate: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedFarms = farms.map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location,
    totalArea: f.totalArea.toString(),
    cultivableArea: f.cultivableArea.toString(),
    plots: f.plots.map((p) => ({
      id: p.id,
      name: p.name,
      cropCycles: p.cropCycles.map((c) => ({
        id: c.id,
        cropName: c.cropName,
        status: c.status,
        startDate: c.startDate.toISOString(),
      })),
    })),
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <OwnerCockpit initialFarms={serializedFarms} />
      </main>
    </>
  );
}
