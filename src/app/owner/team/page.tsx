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

  // Bounded estate picker: the old build rendered one button per farm
  // (100k buttons at portfolio scale). A dropdown + total keeps it usable.
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
        <main className="shell">
          <div className="card" style={{ textAlign: "center", padding: "64px 24px", maxWidth: 480, margin: "48px auto" }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: "var(--ink)", marginBottom: 8 }}>No Active Farm Found</h2>
            <p className="muted" style={{ fontSize: 14, marginBottom: 24 }}>
              You need an established farm before onboarding your labor crew and managers.
            </p>
            {session.role === "SUPER_ADMIN" ? (
              <Link href="/farms/new" className="btn btn-primary" style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                Onboard New Client Farm
              </Link>
            ) : (
              <p className="muted" style={{ fontSize: 12 }}>
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
          <form action="/owner/team" method="get" style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 20, flexWrap: "wrap" }}>
            <label htmlFor="team-farm" style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
              Estate{farmsTotal > farms.length ? ` (showing ${farms.length} of ${farmsTotal.toLocaleString()} — search in Farms directory)` : ""}:
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
            <button type="submit" className="btn btn-sm btn-secondary">Open</button>
            <Link href="/farms" style={{ fontSize: 12 }}>Find any farm →</Link>
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
