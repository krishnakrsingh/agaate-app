import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { InventoryConsole } from "@/components/owner/inventory-console";

export const dynamic = "force-dynamic";

export default async function OwnerInventoryPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    select: {
      id: true,
      name: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <InventoryConsole farms={farms} />
      </main>
    </>
  );
}
