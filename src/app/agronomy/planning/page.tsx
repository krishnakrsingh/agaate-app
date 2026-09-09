import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { WeeklyPlanner } from "@/components/agronomy/weekly-planner";

export const dynamic = "force-dynamic";

export default async function AgronomyPlanningPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  // Bounded to 100 estates + total — the old build loaded every farm with
  // all plots, cycles and officers into one planning dropdown.
  const [farms, farmsTotal] = await Promise.all([
  prisma.farm.findMany({
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
      access: {
        where: {
          user: { role: "FARM_OFFICER", active: true },
        },
        include: {
          user: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  }),
  prisma.farm.count({ where: farmWhere }),
  ]);

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
    officers: f.access.map((a) => ({
      id: a.user.id,
      name: a.user.name,
    })),
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <WeeklyPlanner farms={serialized} farmsTotal={farmsTotal} />
      </main>
    </>
  );
}
