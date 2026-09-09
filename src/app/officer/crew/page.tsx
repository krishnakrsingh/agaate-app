import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { MobileCrewMuster } from "@/components/officer/mobile-crew-muster";

import { MobileOfficerHeader } from "@/components/officer/mobile-officer-header";

export const dynamic = "force-dynamic";

export default async function OfficerCrewPage() {
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
      <main className="shell narrow">
        <MobileOfficerHeader
          title="Daily Crew Muster"
          subtitle="Track morning labour attendance, contractor gangs, and wage outflow."
          officerName={session.name}
        />
        <MobileCrewMuster farms={farms} />
      </main>
    </>
  );
}
