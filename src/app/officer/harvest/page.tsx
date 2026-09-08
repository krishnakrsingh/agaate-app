import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { MobileHarvestLogger } from "@/components/officer/mobile-harvest-logger";

export const dynamic = "force-dynamic";

export default async function OfficerHarvestPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    include: {
      plots: {
        where: { deletedAt: null, status: { not: "ARCHIVED" } },
        include: {
          cropCycles: {
            where: { status: "ACTIVE" },
            select: { id: true, cropName: true },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = farms.map((f) => ({
    id: f.id,
    name: f.name,
    plots: f.plots.map((p) => ({
      id: p.id,
      name: p.name,
      cropCycles: p.cropCycles.map((c) => ({
        id: c.id,
        cropName: c.cropName,
      })),
    })),
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell narrow">
        <MobileHarvestLogger farms={serialized} />
      </main>
    </>
  );
}
