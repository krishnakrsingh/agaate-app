import { requireSession } from "@modules/auth";
import { accessibleFarmWhere } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { FinancialsConsole } from "@modules/expenses/ui/financials-console";

export const dynamic = "force-dynamic";

export default async function OwnerFinancialsPage() {
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
        <FinancialsConsole farms={farms} />
      </main>
    </>
  );
}
