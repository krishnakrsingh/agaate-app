import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { downloadUrl } from "@/lib/storage";
import { distanceMeters, utcDateOnly } from "@/lib/business";
import { attendanceDisplayVerdict } from "@/lib/attendance-geo";
import { Navbar } from "@/components/navbar";
import { OwnerCockpit, TelemetryPhoto } from "@/components/owner/owner-cockpit";

export const dynamic = "force-dynamic";

export default async function OwnerDashboardPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();
  const todayUtc = utcDateOnly(new Date());

  const startOfMonth = new Date(Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), 1));

  // Run parallel server-side queries for instantaneous rendering
  const [
    farms,
    todayAttendancesRaw,
    todayMusters,
    tasksRaw,
    harvestsRaw,
    expensesRaw,
    recentMonitoringPhotosRaw,
    activeIncidentsRaw,
  ] = await Promise.all([
    // 1. Client's farms and parcels
    prisma.farm.findMany({
      where: farmWhere,
      include: {
        plots: {
          where: { deletedAt: null, status: { not: "ARCHIVED" } },
          include: {
            cropCycles: {
              where: { status: { in: ["ACTIVE", "PLANNED"] } },
              select: { id: true, cropName: true, status: true, startDate: true },
            },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // 2. Today's field manager attendance & selfie
    prisma.attendance.findMany({
      where: {
        farm: farmWhere,
        attendanceDate: todayUtc,
      },
      include: {
        user: { select: { id: true, name: true, phone: true } },
        farm: {
          select: {
            id: true,
            name: true,
            latitude: true,
            longitude: true,
            geofenceRadiusMeters: true,
            boundaryGeoJson: true,
          },
        },
        exception: true,
      },
      orderBy: { startAt: "desc" },
    }),

    // 3. Today's labour musters
    prisma.dailyCrewMuster.findMany({
      where: {
        farm: farmWhere,
        musterDate: todayUtc,
      },
      select: {
        id: true,
        farmId: true,
        totalLabourers: true,
        contractorName: true,
        notes: true,
      },
    }),

    // 4. Tasks for operational pace
    prisma.task.findMany({
      where: { farm: farmWhere },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        farmId: true,
        farm: { select: { id: true, name: true } },
        plot: { select: { id: true, name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),

    // 5. Commercial harvest totals
    prisma.harvestLog.findMany({
      where: { farm: farmWhere },
      select: {
        id: true,
        farmId: true,
        cropCycle: { select: { cropName: true } },
        quantity: true,
        totalAmount: true,
        buyerOrMarket: true,
        harvestDate: true,
      },
      orderBy: { harvestDate: "desc" },
      take: 30,
    }),

    // 6. MTD operating spend
    prisma.expenseLog.findMany({
      where: {
        farm: farmWhere,
        date: { gte: startOfMonth },
      },
      select: {
        id: true,
        farmId: true,
        category: true,
        amount: true,
      },
    }),

    // 7. Recent monitoring & proof-of-work photos
    prisma.cropMonitoring.findMany({
      where: { farm: farmWhere },
      include: {
        farm: { select: { name: true } },
        plot: { select: { name: true } },
        cropCycle: { select: { cropName: true } },
        media: true,
      },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),

    // 8. Open hazards & incidents
    prisma.incident.findMany({
      where: {
        farm: farmWhere,
        status: { in: ["OPEN", "ACKNOWLEDGED"] },
      },
      include: {
        farm: { select: { id: true, name: true } },
        plot: { select: { name: true } },
        reporter: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
  ]);

  // Resolve selfie images safely
  const dashPlotIds = [...new Set(todayAttendancesRaw.map((a) => a.plotId).filter((id): id is string => !!id))];
  const dashPlots = dashPlotIds.length
    ? await prisma.plot.findMany({
        where: { id: { in: dashPlotIds } },
        select: { id: true, farmId: true, boundaryGeoJson: true, deletedAt: true, status: true },
      })
    : [];
  const dashPlotMap = new Map(dashPlots.map((p) => [p.id, p]));
  const todayAttendances = await Promise.all(
    todayAttendancesRaw.map(async (att) => {
      let selfieUrl: string | null = null;
      if (att.startSelfieKey) {
        try {
          selfieUrl = await downloadUrl(att.startSelfieKey);
        } catch {
          selfieUrl = null;
        }
      }

      const startLat = att.startLatitude === null || att.startLatitude === undefined ? null : Number(att.startLatitude);
      const startLng = att.startLongitude === null || att.startLongitude === undefined ? null : Number(att.startLongitude);
      let dist: number | null = null;
      if (startLat && startLng) {
        dist = distanceMeters(
          { latitude: Number(att.farm.latitude), longitude: Number(att.farm.longitude) },
          { latitude: startLat, longitude: startLng }
        );
      }
      // Canonical display verdict over stored check-in GPS (never a copy).
      const verdict = attendanceDisplayVerdict({
        startLat,
        startLng,
        farmId: att.farm.id,
        farm: att.farm,
        plot: att.plotId ? dashPlotMap.get(att.plotId) ?? null : null,
        storedBasis: att.geofenceBasis,
      });
      const withinGeofence = verdict.inside;

      return {
        id: att.id,
        farmId: att.farm.id,
        farmName: att.farm.name,
        officerName: att.user.name,
        officerPhone: att.user.phone,
        startAt: att.startAt ? att.startAt.toISOString() : null,
        selfieUrl,
        withinGeofence,
        geofenceBasis: verdict.basis,
        distanceMeters: dist !== null ? Math.round(dist) : null,
        status: att.status,
      };
    })
  );

  // Resolve field proof-of-work photos safely
  const proofOfWorkPhotos: TelemetryPhoto[] = [];
  for (const mon of recentMonitoringPhotosRaw) {
    if (!mon.media || mon.media.length === 0) continue;
    for (const med of mon.media) {
      let url: string | null = null;
      try {
        url = await downloadUrl(med.storageKey);
      } catch {
        url = null;
      }
      if (url) {
        proofOfWorkPhotos.push({
          id: med.id,
          url,
          farmName: mon.farm.name,
          plotName: mon.plot.name,
          cropName: mon.cropCycle.cropName,
          stage: mon.stage,
          healthStatus: mon.status,
          createdAt: mon.createdAt.toISOString(),
        });
      }
    }
  }

  // Serialize farms
  const serializedFarms = farms.map((f) => ({
    id: f.id,
    name: f.name,
    location: f.location,
    totalArea: f.totalArea?.toString() ?? "0",
    cultivableArea: f.cultivableArea?.toString() ?? "0",
    status: f.status,
    setupStage: f.setupStage,
    surveyNumber: f.surveyNumber,
    village: f.village,
    taluk: f.taluk,
    district: f.district,
    state: f.state,
    pincode: f.pincode,
    soilPh: f.soilPh ? f.soilPh.toString() : null,
    soilEc: f.soilEc ? f.soilEc.toString() : null,
    soilOrganicCarbon: f.soilOrganicCarbon ? f.soilOrganicCarbon.toString() : null,
    waterSource: f.waterSource,
    borewellCount: f.borewellCount,
    borewellDepthFeet: f.borewellDepthFeet,
    waterYieldGph: f.waterYieldGph,
    fencingType: f.fencingType,
    contractValue: f.contractValue ? f.contractValue.toString() : null,
    plots: f.plots.map((p) => ({
      id: p.id,
      name: p.name,
      cropCycles: p.cropCycles.map((c) => ({
        id: c.id,
        cropName: c.cropName,
        status: c.status,
        startDate: c.startDate.toISOString(),
      })),
    })),
  }));

  // Aggregate category sums for expenses
  const expenseCategoryMap = new Map<string, number>();
  let totalBurn = 0;
  for (const exp of expensesRaw) {
    const amt = Number(exp.amount || 0);
    totalBurn += amt;
    const curr = expenseCategoryMap.get(exp.category) || 0;
    expenseCategoryMap.set(exp.category, curr + amt);
  }
  const categorySums = Array.from(expenseCategoryMap.entries()).map(([category, total]) => ({
    category,
    total,
  }));

  const initialTelemetry = {
    attendances: todayAttendances,
    musters: todayMusters.map((m) => ({
      id: m.id,
      farmId: m.farmId,
      totalLabourers: m.totalLabourers,
      contractorName: m.contractorName,
      activityDescription: m.notes || "Contractor Field Crew",
    })),
    tasks: tasksRaw.map((t) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      priority: t.priority,
      dueDate: t.dueDate ? t.dueDate.toISOString().slice(0, 10) : null,
      farmId: t.farmId,
      farm: t.farm,
      plot: t.plot,
    })),
    harvests: harvestsRaw.map((h) => ({
      id: h.id,
      farmId: h.farmId,
      cropName: h.cropCycle?.cropName || "Field Produce",
      quantity: Number(h.quantity || 0),
      totalAmount: Number(h.totalAmount || 0),
      buyerName: h.buyerOrMarket || "Local Mandi",
      harvestDate: h.harvestDate.toISOString().slice(0, 10),
    })),
    expenses: {
      totalBurn,
      categorySums,
    },
    proofPhotos: proofOfWorkPhotos,
    incidents: activeIncidentsRaw.filter((i) => i.farm).map((i) => ({
      id: i.id,
      farmId: i.farm!.id,
      farm: i.farm,
      plot: i.plot,
      reporter: i.reporter ?? { id: "deleted", name: "Former officer" },
      type: i.type,
      description: i.description,
      severity: i.severity || "MEDIUM",
      createdAt: i.createdAt.toISOString(),
    })),
  };

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <OwnerCockpit
          initialFarms={serializedFarms}
          initialTelemetry={initialTelemetry}
        />
      </main>
    </>
  );
}
