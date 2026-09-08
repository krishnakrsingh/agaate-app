import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import {
  OperationsCalendar,
  CalendarEventsData,
  FarmOption,
} from "@/components/calendar/operations-calendar";
import Link from "next/link";

export const dynamic = "force-dynamic";

interface Props {
  searchParams?: Promise<{ farmId?: string; year?: string; month?: string }>;
}

export default async function OperationsCalendarPage({ searchParams }: Props) {
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
            <h2 className="text-xl font-bold text-white mb-2">No Active Estate Found</h2>
            <p className="text-sm text-slate-400 mb-6">
              You need an established farm to inspect scheduled operations and field calendars.
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

  const now = new Date();
  const year = resolvedParams.year ? parseInt(resolvedParams.year, 10) : now.getFullYear();
  const month = resolvedParams.month ? parseInt(resolvedParams.month, 10) : now.getMonth() + 1;

  // Initial month boundaries
  const startDate = new Date(Date.UTC(year, month - 1, 1 - 7, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month, 7, 23, 59, 59));

  const [tasks, incidents, harvests] = await Promise.all([
    prisma.task.findMany({
      where: {
        farmId: activeFarm.id,
        dueDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
        assignedOfficer: { select: { id: true, name: true, phone: true } },
        executions: {
          select: {
            id: true,
            status: true,
            startedAt: true,
            completedAt: true,
            remarks: true,
            labour: { select: { labourers: true, hours: true, labourHours: true } },
            materials: { select: { materialName: true, quantity: true, unit: true } },
          },
        },
      },
      orderBy: [{ dueDate: "asc" }, { priority: "desc" }],
    }),

    prisma.incident.findMany({
      where: {
        farmId: activeFarm.id,
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
        reporter: { select: { id: true, name: true, phone: true } },
      },
      orderBy: { createdAt: "desc" },
    }),

    prisma.harvestLog.findMany({
      where: {
        farmId: activeFarm.id,
        harvestDate: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: {
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
      },
      orderBy: { harvestDate: "desc" },
    }),
  ]);

  const serializedInitialEvents: CalendarEventsData = {
    tasks: tasks.map((t) => ({
      id: t.id,
      farmId: t.farmId,
      plotName: t.plot?.name || "All Farm",
      cropName: t.cropCycle?.cropName || null,
      title: t.title,
      description: t.description,
      instructions: t.instructions,
      category: t.category,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate.toISOString().split("T")[0],
      assignedOfficer: t.assignedOfficer
        ? {
            id: t.assignedOfficer.id,
            name: t.assignedOfficer.name,
            phone: t.assignedOfficer.phone,
          }
        : null,
      executions: t.executions.map((e) => ({
        id: e.id,
        status: e.status,
        completedAt: e.completedAt ? e.completedAt.toISOString() : null,
        remarks: e.remarks,
        labourHours: e.labour.reduce((sum, l) => sum + Number(l.labourHours), 0),
        materials: e.materials.map((m) => `${m.materialName} (${m.quantity} ${m.unit})`).join(", "),
      })),
    })),

    incidents: incidents.map((i) => ({
      id: i.id,
      farmId: i.farmId,
      plotName: i.plot?.name || "Farm Wide",
      cropName: i.cropCycle?.cropName || null,
      level: i.level,
      type: i.type,
      description: i.description,
      severity: i.severity || "MEDIUM",
      impactPercent: i.impactPercent ? Number(i.impactPercent) : null,
      status: i.status,
      date: i.createdAt.toISOString().split("T")[0],
      createdAt: i.createdAt.toISOString(),
      reporter: {
        id: i.reporter.id,
        name: i.reporter.name,
        phone: i.reporter.phone,
      },
    })),

    harvests: harvests.map((h) => ({
      id: h.id,
      farmId: h.farmId,
      plotName: h.plot?.name || "Plot",
      cropName: h.cropCycle?.cropName || "Crop",
      date: h.harvestDate.toISOString().split("T")[0],
      quantity: Number(h.quantity),
      unit: h.unit,
      grade: h.grade,
      buyerOrMarket: h.buyerOrMarket,
      totalAmount: h.totalAmount ? Number(h.totalAmount) : null,
    })),
  };

  const serializedFarms: FarmOption[] = farms.map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location,
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <OperationsCalendar
          initialFarm={activeFarm}
          farms={serializedFarms}
          initialEvents={serializedInitialEvents}
          initialYear={year}
          initialMonth={month}
        />
      </main>
    </>
  );
}
