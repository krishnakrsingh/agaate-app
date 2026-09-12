import { Suspense } from "react";
import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { downloadUrl } from "@/lib/storage";
import { Navbar } from "@/components/navbar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { HqFarm360 } from "@/components/hq/farm-360";

export const dynamic = "force-dynamic";

const PLOT_TAKE = 200;
const TASK_TAKE = 50;
const INCIDENT_TAKE = 50;
const AUDIT_TAKE = 20;
const FILE_TAKE = 20;

export default async function HqFarmDetailPage({
  params,
}: {
  params: Promise<{ farmId: string }>;
}) {
  const { farmId } = await params;
  const session = await requireSession();

  if (session.role !== "SUPER_ADMIN") {
    return notFound();
  }

  let farm;
  let plotsTotal = 0;
  let tasksTotal = 0;
  let tasksOpen = 0;
  let incidentsTotal = 0;
  let incidentsOpen = 0;
  let filesTotal = 0;
  try {
    // Bounded 360 query: one round of parallel, capped selects. No N+1 —
    // counts ride alongside their pages, follow-ups cap at 3 per incident,
    // file URLs resolve in one bounded parallel batch.
    [
      farm,
      plotsTotal,
      tasksTotal,
      tasksOpen,
      incidentsTotal,
      incidentsOpen,
      filesTotal,
    ] = await Promise.all([
      prisma.farm.findUniqueOrThrow({
        where: { id: farmId },
        include: {
          client: { select: { id: true, name: true, code: true, phone: true, email: true, companyName: true } },
          plots: {
            where: { deletedAt: null },
            orderBy: { name: "asc" },
            take: PLOT_TAKE,
            select: {
              id: true,
              name: true,
              area: true,
              measuredAcres: true,
              status: true,
              soilType: true,
              boundaryGeoJson: true,
              latitude: true,
              longitude: true,
              irrigation: { select: { type: true } },
              _count: {
                select: {
                  cropCycles: { where: { status: { in: ["PLANNED", "ACTIVE"] } } },
                },
              },
            },
          },
          tasks: {
            orderBy: { dueDate: "desc" },
            take: TASK_TAKE,
            select: {
              id: true,
              title: true,
              category: true,
              priority: true,
              status: true,
              dueDate: true,
              createdAt: true,
              assignedOfficer: { select: { id: true, name: true } },
              plot: { select: { id: true, name: true } },
            },
          },
          incidents: {
            orderBy: { createdAt: "desc" },
            take: INCIDENT_TAKE,
            select: {
              id: true,
              type: true,
              level: true,
              severity: true,
              status: true,
              description: true,
              createdAt: true,
              reporter: { select: { id: true, name: true } },
              plot: { select: { id: true, name: true } },
              followUps: {
                orderBy: { createdAt: "desc" },
                take: 3,
                select: {
                  id: true,
                  action: true,
                  remarks: true,
                  createdAt: true,
                  author: { select: { id: true, name: true } },
                },
              },
              _count: { select: { followUps: true } },
            },
          },
          access: {
            include: {
              user: { select: { id: true, name: true, email: true, role: true } },
            },
            orderBy: { createdAt: "asc" },
          },
          agronomyPlans: {
            orderBy: { planDate: "desc" },
            take: 12,
            select: { id: true, planDate: true },
          },
        },
      }),
      prisma.plot.count({ where: { farmId, deletedAt: null } }),
      prisma.task.count({ where: { farmId } }),
      prisma.task.count({ where: { farmId, status: { notIn: ["COMPLETED", "CANCELLED"] } } }),
      prisma.incident.count({ where: { farmId } }),
      prisma.incident.count({ where: { farmId, status: { in: ["OPEN", "ACKNOWLEDGED"] } } }),
      prisma.mediaAsset.count({ where: { farmId } }),
    ]);
  } catch {
    return notFound();
  }

  const [auditTrail, files] = await Promise.all([
    prisma.auditLog.findMany({
      where: { entityType: "Farm", entityId: farmId },
      orderBy: { createdAt: "desc" },
      take: AUDIT_TAKE,
      include: { actor: { select: { id: true, name: true } } },
    }),
    prisma.mediaAsset.findMany({
      where: { farmId },
      orderBy: { createdAt: "desc" },
      take: FILE_TAKE,
      select: {
        id: true,
        storageKey: true,
        kind: true,
        mimeType: true,
        sizeBytes: true,
        executionId: true,
        monitoringId: true,
        incidentId: true,
        createdAt: true,
      },
    }),
  ]);

  const filesWithUrls = await Promise.all(
    files.map(async (f) => {
      try {
        return { ...f, url: await downloadUrl(f.storageKey) };
      } catch {
        return { ...f, url: null as string | null };
      }
    })
  );

  const serialized = {
    id: farm.id,
    name: farm.name,
    ownerName: farm.ownerName,
    location: farm.location,
    latitude: farm.latitude?.toString() ?? "0",
    longitude: farm.longitude?.toString() ?? "0",
    totalArea: farm.totalArea?.toString() ?? "0",
    cultivableArea: farm.cultivableArea?.toString() ?? "0",
    waterSource: farm.waterSource,
    status: farm.status,
    setupStage: farm.setupStage,
    setupProgress: farm.setupProgress,
    handedOverAt: farm.handedOverAt ? farm.handedOverAt.toISOString() : null,
    targetHandoverDate: farm.targetHandoverDate ? farm.targetHandoverDate.toISOString() : null,
    surveyNumber: farm.surveyNumber,
    village: farm.village,
    taluk: farm.taluk,
    district: farm.district,
    state: farm.state,
    pincode: farm.pincode,
    soilType: farm.soilType,
    soilPh: farm.soilPh ? farm.soilPh.toString() : null,
    soilEc: farm.soilEc ? farm.soilEc.toString() : null,
    soilOrganicCarbon: farm.soilOrganicCarbon ? farm.soilOrganicCarbon.toString() : null,
    terrainType: farm.terrainType,
    fencingType: farm.fencingType,
    borewellCount: farm.borewellCount,
    borewellDepthFeet: farm.borewellDepthFeet,
    waterYieldGph: farm.waterYieldGph,
    electricitySupply: farm.electricitySupply,
    proposedCrops: farm.proposedCrops,
    contractValue: farm.contractValue ? farm.contractValue.toString() : null,
    boundaryGeoJson: farm.boundaryGeoJson,
    measuredAcres: farm.measuredAcres ? farm.measuredAcres.toString() : null,
    geofenceRadiusMeters: farm.geofenceRadiusMeters,
    updatedAt: farm.updatedAt.toISOString(),
    createdAt: farm.createdAt.toISOString(),
    client: farm.client
      ? {
          id: farm.client.id,
          name: farm.client.name,
          code: farm.client.code,
          phone: farm.client.phone,
          email: farm.client.email,
          companyName: farm.client.companyName,
        }
      : null,
    plots: farm.plots.map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area?.toString() ?? "0",
      measuredAcres: p.measuredAcres ? p.measuredAcres.toString() : null,
      status: p.status,
      soilType: p.soilType,
      hasBoundary: !!p.boundaryGeoJson,
      boundaryGeoJson: p.boundaryGeoJson,
      latitude: p.latitude?.toString() ?? "0",
      longitude: p.longitude?.toString() ?? "0",
      irrigation: p.irrigation.map((r) => r.type),
      activeCycles: p._count.cropCycles,
    })),
    plotsTotal,
    plotsTruncated: plotsTotal > farm.plots.length,
    tasks: farm.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      category: t.category,
      priority: t.priority,
      status: t.status,
      dueDate: t.dueDate.toISOString(),
      createdAt: t.createdAt.toISOString(),
      officer: t.assignedOfficer
        ? { id: t.assignedOfficer.id, name: t.assignedOfficer.name }
        : null,
      plot: t.plot ? { id: t.plot.id, name: t.plot.name } : null,
    })),
    tasksTotal,
    tasksOpen,
    tasksTruncated: tasksTotal > farm.tasks.length,
    incidents: farm.incidents.map((i) => ({
      id: i.id,
      type: i.type,
      level: i.level,
      severity: i.severity,
      status: i.status,
      description: i.description,
      createdAt: i.createdAt.toISOString(),
      reporter: i.reporter ? { id: i.reporter.id, name: i.reporter.name } : { id: "deleted", name: "Former officer" },
      plot: i.plot ? { id: i.plot.id, name: i.plot.name } : null,
      followUpCount: i._count.followUps,
      followUps: i.followUps.map((f) => ({
        id: f.id,
        action: f.action,
        remarks: f.remarks,
        createdAt: f.createdAt.toISOString(),
        author: f.author ? { id: f.author.id, name: f.author.name } : { id: "deleted", name: "Unknown" },
      })),
    })),
    incidentsTotal,
    incidentsOpen,
    incidentsTruncated: incidentsTotal > farm.incidents.length,
    access: farm.access.map((a) => ({
      id: a.id,
      canManage: a.canManage,
      user: { id: a.user.id, name: a.user.name, email: a.user.email, role: a.user.role },
    })),
    plans: farm.agronomyPlans.map((p) => ({ id: p.id, planDate: p.planDate.toISOString() })),
    auditTrail: auditTrail.map((a) => ({
      id: a.id,
      action: a.action,
      entityType: a.entityType,
      entityId: a.entityId,
      createdAt: a.createdAt.toISOString(),
      actor: a.actor ? { id: a.actor.id, name: a.actor.name } : null,
    })),
    files: filesWithUrls.map((f) => ({
      id: f.id,
      storageKey: f.storageKey,
      kind: f.kind,
      mimeType: f.mimeType,
      sizeBytes: f.sizeBytes,
      executionId: f.executionId,
      monitoringId: f.monitoringId,
      incidentId: f.incidentId,
      createdAt: f.createdAt.toISOString(),
      url: f.url,
    })),
    filesTotal,
    filesTruncated: filesTotal > files.length,
  };

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <Breadcrumbs
          items={[{ label: "HQ" }, { label: "Farms", href: "/hq/farms" }, { label: farm.name }]}
        />
        <Suspense fallback={<div style={{ padding: 48, textAlign: "center", color: "var(--muted)" }}>Loading farm management…</div>}>
          <HqFarm360 farm={serialized} />
        </Suspense>
      </main>
    </>
  );
}
