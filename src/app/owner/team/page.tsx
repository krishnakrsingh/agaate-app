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
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflowX: "auto", paddingBottom: 8, marginBottom: 20 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--muted)" }}>
              Select Estate:
            </span>
            {farms.map((farm) => {
              const isSelected = farm.id === activeFarm.id;
              return (
                <Link
                  key={farm.id}
                  href={`/owner/team?farmId=${farm.id}`}
                  className={`btn btn-sm ${isSelected ? "btn-primary" : "btn-secondary"}`}
                  style={{ fontSize: 12, padding: "5px 14px", borderRadius: "var(--radius-pill)" }}
                >
                  {farm.name}
                </Link>
              );
            })}
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
