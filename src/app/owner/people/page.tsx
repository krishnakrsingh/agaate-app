import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { WorkersConsole, FarmWorker } from "@/components/owner/workers-console";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: Promise<{ farmId?: string }>;
}

export default async function OwnerPeoplePage({ searchParams }: Props) {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const [farms, farmsTotal] = await Promise.all([
    prisma.farm.findMany({
      where: farmWhere,
      select: { id: true, name: true, location: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.farm.count({ where: farmWhere }),
  ]);

  const resolvedParams = searchParams ? await searchParams : {};
  const activeFarm = farms.find((f) => f.id === resolvedParams.farmId) || farms[0];

  if (!activeFarm) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell narrow">
          <Breadcrumbs items={[{ label: "People & Team" }]} />
          <h1>No Active Farm Found</h1>
          <p className="muted">You need an established farm before managing on-site personnel.</p>
        </main>
      </>
    );
  }

  const workers = await prisma.user.findMany({
    where: {
      farmAccess: { some: { farmId: activeFarm.id } },
      role: { in: ["FARM_OFFICER", "FARM_ADMIN", "AGRONOMIST"] },
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      role: true,
      isSupervisor: true,
      active: true,
      createdAt: true,
    },
    orderBy: [{ isSupervisor: "desc" }, { createdAt: "desc" }],
  });

  const serializedWorkers: FarmWorker[] = workers.map((w) => ({
    id: w.id,
    name: w.name,
    email: w.email,
    phone: w.phone,
    role: w.role,
    isSupervisor: w.isSupervisor,
    active: w.active,
    createdAt: w.createdAt.toISOString(),
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs items={[{ label: "People & Labor" }]} />
        <div className="page-header">
          <div className="page-header-content">
            <div className="eyebrow">
              <span className="eyebrow-dot" />
              ESTATE • WORKFORCE &amp; ACCESS
            </div>
            <h1>People &amp; On-Site Team</h1>
            <p className="muted">
              Farm managers, agronomists, and crew supervisors authorized for this estate. Provision mobile phone login credentials.
            </p>
          </div>
        </div>

        {farms.length > 1 && (
          <form action="/owner/people" method="get" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <label htmlFor="team-farm" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
              Estate:
            </label>
            <select
              id="team-farm"
              name="farmId"
              defaultValue={activeFarm.id}
              style={{ height: 36, fontSize: 13, minWidth: 240 }}
            >
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name} — {farm.location}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-sm btn-secondary">Switch</button>
          </form>
        )}

        <WorkersConsole
          farmId={activeFarm.id}
          farmName={activeFarm.name}
          initialWorkers={serializedWorkers}
        />
      </main>
    </>
  );
}
