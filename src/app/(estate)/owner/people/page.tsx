import { requireSession } from "@modules/auth";
import { accessibleFarmWhere } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { Navbar } from "@/components/navigation/navbar";
import { Breadcrumbs } from "@/components/navigation/breadcrumbs";
import { WorkersConsole, FarmWorker } from "@modules/people/ui/workers-console";
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

  const currentUser = await prisma.user.findUnique({
    where: { id: session.userId },
    select: { id: true, clientId: true },
  });

  const farmIds = farms.map((f) => f.id);
  const selectedFarmId = resolvedParams.farmId;
  const isFilteringSpecificFarm =
    Boolean(selectedFarmId) &&
    selectedFarmId !== "all" &&
    farmIds.includes(selectedFarmId!);

  const targetFarm = isFilteringSpecificFarm
    ? farms.find((f) => f.id === selectedFarmId)!
    : activeFarm;

  // Query strictly field personnel (FARM_OFFICER), never farm admins or super admins.
  // Includes personnel assigned to any owned farm or unassigned laborers registered to the client.
  const workers = await prisma.user.findMany({
    where: isFilteringSpecificFarm
      ? {
          role: "FARM_OFFICER",
          farmAccess: { some: { farmId: targetFarm.id } },
        }
      : {
          role: "FARM_OFFICER",
          OR: [
            { farmAccess: { some: { farmId: { in: farmIds } } } },
            ...(currentUser?.clientId ? [{ clientId: currentUser.clientId }] : []),
          ],
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
      farmAccess: {
        select: {
          farmId: true,
          farm: {
            select: { id: true, name: true, location: true },
          },
        },
      },
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
    assignedFarm: w.farmAccess[0]?.farm
      ? {
          id: w.farmAccess[0].farm.id,
          name: w.farmAccess[0].farm.name,
        }
      : null,
  }));

  const allFarmsSummary = farms.map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location,
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <div className="page-header" style={{ paddingBottom: 10 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>People &amp; On-Site Team</h1>
        </div>

        {farms.length > 1 && (
          <form action="/owner/people" method="get" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <label htmlFor="team-farm" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", color: "var(--muted)" }}>
              Filter by Estate:
            </label>
            <select
              id="team-farm"
              name="farmId"
              defaultValue={isFilteringSpecificFarm ? targetFarm.id : "all"}
              style={{ height: 36, fontSize: 13, minWidth: 260 }}
            >
              <option value="all">All Estates &amp; Unassigned Labor ({farms.length} Estates)</option>
              {farms.map((farm) => (
                <option key={farm.id} value={farm.id}>{farm.name} — {farm.location}</option>
              ))}
            </select>
            <button type="submit" className="btn btn-sm btn-secondary">Switch</button>
          </form>
        )}

        <WorkersConsole
          farmId={targetFarm.id}
          farmName={targetFarm.name}
          allFarms={allFarmsSummary}
          initialWorkers={serializedWorkers}
        />
      </main>
    </>
  );
}
