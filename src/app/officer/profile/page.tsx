import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Navbar } from "@/components/navbar";
import { OfficerProfileView } from "@/components/officer/officer-profile-view";

export const dynamic = "force-dynamic";

export default async function OfficerProfilePage() {
  const session = await requireSession();

  const [user, shiftsHistory, taskExecutions, incidentsHistory] = await Promise.all([
    prisma.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        createdAt: true,
        farmAccess: {
          include: {
            farm: {
              include: {
                _count: {
                  select: { plots: true },
                },
              },
            },
          },
        },
      },
    }),

    // 1. Shift attendance history
    prisma.attendance.findMany({
      where: { userId: session.userId },
      orderBy: [{ attendanceDate: "desc" }, { startAt: "desc" }],
      take: 30,
      include: {
        farm: { select: { id: true, name: true } },
      },
    }),

    // 2. Task executions completed by this officer
    prisma.taskExecution.findMany({
      where: { officerId: session.userId },
      orderBy: [{ completedAt: "desc" }, { startedAt: "desc" }],
      take: 30,
      include: {
        task: {
          select: {
            id: true,
            title: true,
            priority: true,
            category: true,
            farm: { select: { id: true, name: true } },
            plot: { select: { id: true, name: true } },
            cropCycle: { select: { id: true, cropName: true } },
          },
        },
        labour: { select: { labourers: true, hours: true, labourHours: true } },
        materials: { select: { materialName: true, quantity: true, unit: true } },
      },
    }),

    // 3. Incidents reported by this officer
    prisma.incident.findMany({
      where: { reporterId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 30,
      include: {
        farm: { select: { id: true, name: true } },
        plot: { select: { id: true, name: true } },
        cropCycle: { select: { id: true, cropName: true } },
        media: { select: { id: true, storageKey: true } },
      },
    }),
  ]);

  if (!user) {
    throw new Error("User record not found");
  }

  const primaryAccess = user.farmAccess[0];
  const farmData = primaryAccess
    ? {
        id: primaryAccess.farm.id,
        name: primaryAccess.farm.name,
        location: primaryAccess.farm.location,
        totalArea: Number(primaryAccess.farm.totalArea),
        cultivableArea: Number(primaryAccess.farm.cultivableArea),
        geofenceRadiusMeters: primaryAccess.farm.geofenceRadiusMeters,
        plotsCount: primaryAccess.farm._count.plots,
      }
    : null;

  // Compute aggregate stats metrics
  const totalShiftsCount = shiftsHistory.length;
  const totalMinutesLogged = shiftsHistory.reduce((acc, s) => {
    if (s.startAt && s.endAt) {
      return acc + Math.round((new Date(s.endAt).getTime() - new Date(s.startAt).getTime()) / 60000);
    }
    return acc;
  }, 0);
  const totalHoursLogged = (totalMinutesLogged / 60).toFixed(1);

  const completedTasksCount = taskExecutions.filter((e) => e.status === "COMPLETED").length;
  const totalIncidentsCount = incidentsHistory.length;

  // Today's attendance
  const now = new Date();
  const todayDate = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0));
  const todayAttendanceRecord = shiftsHistory.find(
    (s) => s.attendanceDate.toISOString().split("T")[0] === todayDate.toISOString().split("T")[0]
  );

  const serializedTodayAttendance = todayAttendanceRecord && todayAttendanceRecord.startAt
    ? {
        id: todayAttendanceRecord.id,
        status: todayAttendanceRecord.status,
        startAt: todayAttendanceRecord.startAt.toISOString(),
        endAt: todayAttendanceRecord.endAt ? todayAttendanceRecord.endAt.toISOString() : null,
        durationMinutes: todayAttendanceRecord.endAt
          ? Math.round(
              (new Date(todayAttendanceRecord.endAt).getTime() -
                new Date(todayAttendanceRecord.startAt).getTime()) /
                60000
            )
          : null,
        isInsideGeofence:
          todayAttendanceRecord.status !== "EXCEPTION_PENDING" &&
          todayAttendanceRecord.status !== "EXCEPTION_REJECTED",
        selfieUrl: todayAttendanceRecord.startSelfieKey || null,
      }
    : null;

  // Serialize Shift History
  const serializedShifts = shiftsHistory.map((s) => {
    let durationMins: number | null = null;
    if (s.startAt && s.endAt) {
      durationMins = Math.round(
        (new Date(s.endAt).getTime() - new Date(s.startAt).getTime()) / 60000
      );
    }
    return {
      id: s.id,
      farmName: s.farm.name,
      date: s.attendanceDate.toISOString().split("T")[0],
      startAt: s.startAt ? s.startAt.toISOString() : null,
      endAt: s.endAt ? s.endAt.toISOString() : null,
      durationMinutes: durationMins,
      status: s.status,
      insideGeofence: s.status !== "EXCEPTION_PENDING" && s.status !== "EXCEPTION_REJECTED",
      exceptionReason: s.exceptionReason,
    };
  });

  // Serialize Task Executions
  const serializedTasks = taskExecutions.map((e) => ({
    id: e.id,
    taskId: e.task.id,
    title: e.task.title,
    priority: e.task.priority,
    category: e.task.category,
    status: e.status,
    farmName: e.task.farm.name,
    plotName: e.task.plot?.name || "Farm Wide",
    cropName: e.task.cropCycle?.cropName || null,
    completedAt: e.completedAt ? e.completedAt.toISOString() : null,
    startedAt: e.startedAt ? e.startedAt.toISOString() : null,
    remarks: e.remarks,
    labourHours: e.labour.reduce((sum, l) => sum + Number(l.labourHours), 0),
    materials: e.materials.map((m) => `${m.materialName} (${m.quantity} ${m.unit})`).join(", "),
  }));

  // Serialize Incidents
  const serializedIncidents = incidentsHistory.map((i) => ({
    id: i.id,
    date: i.createdAt.toISOString().split("T")[0],
    createdAt: i.createdAt.toISOString(),
    severity: i.severity || "MEDIUM",
    type: i.type,
    level: i.level,
    status: i.status,
    description: i.description,
    farmName: i.farm.name,
    plotName: i.plot?.name || "Farm Wide",
    cropName: i.cropCycle?.cropName || null,
    photosCount: i.media.length,
  }));

  return (
    <>
      <Navbar role={session.role} userName={session.name} />

      <main className="shell narrow">
        <OfficerProfileView
          user={{
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            role: user.role,
            createdAt: user.createdAt.toISOString(),
          }}
          farm={farmData}
          stats={{
            totalShifts: totalShiftsCount,
            totalHoursLogged: Number(totalHoursLogged),
            completedTasks: completedTasksCount,
            reportedIncidents: totalIncidentsCount,
          }}
          todayAttendance={serializedTodayAttendance}
          shiftsHistory={serializedShifts}
          tasksHistory={serializedTasks}
          incidentsHistory={serializedIncidents}
        />
      </main>
    </>
  );
}
