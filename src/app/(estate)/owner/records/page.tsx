import { requireSession, accessibleFarmWhere } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { OwnerRecordsView, HarvestFarm, SimpleFarm } from "@modules/records/ui/owner-records-view";

export const dynamic = "force-dynamic";

export default async function OwnerRecordsPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const [farmsWithPlotsRaw, farmsRaw, harvestCount, inventoryCount, expenseCount] = await Promise.all([
    prisma.farm.findMany({
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
    }),
    prisma.farm.findMany({
      where: farmWhere,
      select: { id: true, name: true },
      orderBy: { createdAt: "desc" },
    }),
    prisma.harvestLog.count({ where: { farm: farmWhere } }),
    prisma.inventoryItem.count({ where: { farm: farmWhere } }),
    prisma.expenseLog.count({ where: { farm: farmWhere } }),
  ]);

  const farmsWithPlots: HarvestFarm[] = farmsWithPlotsRaw.map((f) => ({
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

  const farms: SimpleFarm[] = farmsRaw.map((f) => ({
    id: f.id,
    name: f.name,
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell" style={{ paddingBottom: 32 }}>
        <OwnerRecordsView
          farmsWithPlots={farmsWithPlots}
          farms={farms}
          initialCounts={{
            harvests: harvestCount,
            inventory: inventoryCount,
            expenses: expenseCount,
          }}
        />
      </main>
    </>
  );
}
