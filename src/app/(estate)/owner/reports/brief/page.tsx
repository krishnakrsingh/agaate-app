import { requireSession } from "@modules/auth";
import { accessibleFarmWhere } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { ExecutiveBrief } from "@modules/reporting/ui/executive-brief";

export const dynamic = "force-dynamic";

export default async function OwnerExecutiveBriefPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    select: {
      id: true,
      name: true,
      location: true,
      cultivableArea: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = farms.map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location,
    cultivableArea: f.cultivableArea.toString(),
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <ExecutiveBrief farms={serialized} />
      </main>
    </>
  );
}
