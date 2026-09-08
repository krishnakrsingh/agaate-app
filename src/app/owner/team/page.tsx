import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { WorkersConsole, FarmWorker } from "@/components/owner/workers-console";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: Promise<{ farmId?: string }>;
}

export default async function OwnerTeamPage({ searchParams }: Props) {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  const farms = await prisma.farm.findMany({
    where: farmWhere,
    select: { id: true, name: true, location: true },
    orderBy: { createdAt: "desc" },
  });

  const resolvedParams = searchParams ? await searchParams : {};
  const activeFarm = farms.find((f) => f.id === resolvedParams.farmId) || farms[0];

  if (!activeFarm) {
    return (
      <>
        <Navbar role={session.role} userName={session.name} />
        <main className="shell">
          <div className="card text-center py-16 max-w-lg mx-auto mt-12">
            <h2 className="text-xl font-bold text-white mb-2">No Active Farm Found</h2>
            <p className="text-sm text-slate-400 mb-6">
              You need an established farm before onboarding your labor crew and managers.
            </p>
            {session.role === "SUPER_ADMIN" ? (
              <Link href="/farms/new" className="btn-primary inline-flex items-center gap-2">
                Onboard New Client Farm
              </Link>
            ) : (
              <p className="text-xs text-slate-400">
                Contact your Agaate account administrator to assign your farm.
              </p>
            )}
          </div>
        </main>
      </>
    );
  }

  const workers = await prisma.user.findMany({
    where: {
      farmAccess: { some: { farmId: activeFarm.id } },
      role: { in: ["FARM_OFFICER", "FARM_ADMIN"] },
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
        {farms.length > 1 && (
          <div className="mb-6 flex items-center gap-3 overflow-x-auto pb-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Select Estate:</span>
            {farms.map((farm) => (
              <Link
                key={farm.id}
                href={`/owner/team?farmId=${farm.id}`}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  farm.id === activeFarm.id
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                    : "bg-slate-900/60 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                {farm.name}
              </Link>
            ))}
          </div>
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
