import { requireSession } from "@/lib/auth";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { downloadUrl } from "@/lib/storage";
import { Navbar } from "@/components/navbar";
import {
  DiagnosticsWorkbench,
  DiagnosticCase,
  DispatchedRx,
} from "@/components/agronomy/diagnostics-workbench";

export const dynamic = "force-dynamic";

export default async function AgronomyDiagnosticsPage() {
  const session = await requireSession();
  const farmWhere = await accessibleFarmWhere();

  // 1. Fetch Incidents
  const incidents = await prisma.incident.findMany({
    where: {
      farm: farmWhere,
      status: { not: "CLOSED" },
    },
    include: {
      farm: { select: { id: true, name: true } },
      plot: { select: { id: true, name: true } },
      cropCycle: { select: { id: true, cropName: true } },
      reporter: { select: { name: true } },
      media: { take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // 2. Fetch Poor Health Monitoring
  const poorMonitoring = await prisma.cropMonitoring.findMany({
    where: {
      farm: farmWhere,
      status: "POOR",
    },
    include: {
      farm: { select: { id: true, name: true } },
      plot: { select: { id: true, name: true } },
      cropCycle: { select: { id: true, cropName: true } },
      officer: { select: { name: true } },
      media: { take: 1 },
    },
    orderBy: { createdAt: "desc" },
    take: 30,
  });

  // Resolve Images safely
  const formattedIncidents: DiagnosticCase[] = await Promise.all(
    incidents.map(async (inc) => {
      let imageUrl: string | null = null;
      if (inc.media && inc.media.length > 0) {
        try {
          imageUrl = await downloadUrl(inc.media[0].storageKey);
        } catch {
          imageUrl = null;
        }
      }

      return {
        id: inc.id,
        source: "INCIDENT",
        farmId: inc.farm.id,
        farmName: inc.farm.name,
        plotId: inc.plot?.id || null,
        plotName: inc.plot?.name || null,
        cropCycleId: inc.cropCycle?.id || null,
        cropName: inc.cropCycle?.cropName || null,
        title: `${inc.type} (${inc.level} Level)`,
        description: inc.description,
        severity: inc.severity || "HIGH",
        impactPercent: inc.impactPercent ? inc.impactPercent.toString() : null,
        imageUrl,
        reportedBy: inc.reporter.name,
        reportedAt: inc.createdAt.toISOString(),
      };
    })
  );

  const formattedMonitoring: DiagnosticCase[] = await Promise.all(
    poorMonitoring.map(async (mon) => {
      let imageUrl: string | null = null;
      if (mon.media && mon.media.length > 0) {
        try {
          imageUrl = await downloadUrl(mon.media[0].storageKey);
        } catch {
          imageUrl = null;
        }
      }

      return {
        id: mon.id,
        source: "MONITORING",
        farmId: mon.farm.id,
        farmName: mon.farm.name,
        plotId: mon.plot.id,
        plotName: mon.plot.name,
        cropCycleId: mon.cropCycle.id,
        cropName: mon.cropCycle.cropName,
        title: `Stress at ${mon.stage} Stage`,
        description: mon.remarks || `Crop monitoring flagged with POOR health at ${mon.stage} stage.`,
        severity: mon.impactPercent && Number(mon.impactPercent) > 20 ? "CRITICAL" : "HIGH",
        impactPercent: mon.impactPercent ? mon.impactPercent.toString() : null,
        imageUrl,
        reportedBy: mon.officer.name,
        reportedAt: mon.createdAt.toISOString(),
      };
    })
  );

  // 3. Fetch Dispatched Prescriptions
  const prescriptions = await prisma.agronomyPrescription.findMany({
    where: {
      farm: farmWhere,
    },
    include: {
      farm: { select: { name: true } },
      plot: { select: { name: true } },
      cropCycle: { select: { cropName: true } },
    },
    orderBy: { applicationDate: "desc" },
    take: 30,
  });

  const formattedPrescriptions: DispatchedRx[] = prescriptions.map((rx) => {
    const details = Array.isArray(rx.recipeDetails)
      ? (rx.recipeDetails as any[])
      : [];
    const recipeSummary = details
      .map((d) => `${d.materialName} @ ${d.dosage}`)
      .join(", ");

    return {
      id: rx.id,
      farmName: rx.farm.name,
      plotName: rx.plot.name,
      cropName: rx.cropCycle.cropName,
      targetIssue: rx.targetIssue,
      recipeSummary: recipeSummary || "Custom Recipe",
      priority: rx.priority,
      status: rx.status,
      dispatchedAt: rx.applicationDate.toISOString(),
    };
  });

  const allCases = [...formattedIncidents, ...formattedMonitoring].sort(
    (a, b) => new Date(b.reportedAt).getTime() - new Date(a.reportedAt).getTime()
  );

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <DiagnosticsWorkbench
          cases={allCases}
          recentPrescriptions={formattedPrescriptions}
        />
      </main>
    </>
  );
}
