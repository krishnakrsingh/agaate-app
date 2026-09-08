import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { ExecutiveBrief } from "@/components/owner/executive-brief";

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
