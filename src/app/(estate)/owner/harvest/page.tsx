import { requireSession } from "@modules/auth";
import { accessibleFarmWhere } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { HarvestConsole } from "@modules/harvest/ui/harvest-console";

export const dynamic = "force-dynamic";

export default async function OwnerHarvestPage() {
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
            select: { id: true, cropName: true },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serializedFarms = farms.map((f) => ({
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
      <main className="shell">
        <HarvestConsole farms={serializedFarms} />
      </main>
    </>
  );
}
