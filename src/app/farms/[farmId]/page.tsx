import { notFound } from "next/navigation";
import { requireSession } from "@/lib/auth";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { downloadUrl } from "@/lib/storage";
import { FarmHubClient } from "@/components/farm-hub-client";
import { Navbar } from "@/components/navbar";

export const dynamic = "force-dynamic";

export default async function FarmDetailPage({
  params,
}: {
  params: Promise<{ farmId: string }>;
}) {
  const { farmId } = await params;
  const session = await requireSession();

  try {
    await requireFarmAccess(farmId);
  } catch {
    return notFound();
  }

  let farm;
  try {
    farm = await prisma.farm.findUniqueOrThrow({
      where: { id: farmId },
      include: {
        monitoring: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        incidents: {
          orderBy: { createdAt: "desc" },
          include: {
            media: true,
            reporter: { select: { name: true } },
          },
        },
        plots: {
          where: { deletedAt: null },
          include: {
            irrigation: true,
            cropCycles: {
              include: {
                varieties: true,
                milestones: true,
              },
            },
          },
        },
        access: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
      },
    });
  } catch {
    return notFound();
  }

  const canManage =
    session.role === "SUPER_ADMIN" ||
    farm.access.some((a) => a.userId === session.userId && a.canManage);

  // Serialized numbers and Dates to strings for React Client Component
  const serializedFarm = {
    id: farm.id,
    name: farm.name,
    ownerName: farm.ownerName,
    location: farm.location,
    address: farm.address,
    latitude: farm.latitude.toString(),
    longitude: farm.longitude.toString(),
    totalArea: farm.totalArea.toString(),
    cultivableArea: farm.cultivableArea.toString(),
    waterSource: farm.waterSource,
    status: farm.status,
    geofenceRadiusMeters: farm.geofenceRadiusMeters,
    plots: farm.plots.map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area.toString(),
      latitude: p.latitude.toString(),
      longitude: p.longitude.toString(),
      soilType: p.soilType,
      status: p.status,
      irrigation: p.irrigation.map((ir) => ({
        type: ir.type,
        details: ir.details,
      })),
      cropCycles: p.cropCycles.map((c) => ({
        id: c.id,
        cropName: c.cropName,
        startDate: c.startDate.toISOString(),
        expectedFirstHarvestDate: c.expectedFirstHarvestDate ? c.expectedFirstHarvestDate.toISOString() : null,
        establishmentType: c.establishmentType,
        status: c.status,
        bedPreparationEnabled: c.bedPreparationEnabled,
        expectedBedsPerAcre: c.expectedBedsPerAcre ? c.expectedBedsPerAcre.toString() : null,
        expectedTotalBeds: c.expectedTotalBeds ? c.expectedTotalBeds.toString() : null,
        actualBedsCreated: c.actualBedsCreated ? c.actualBedsCreated.toString() : null,
        mulchEnabled: c.mulchEnabled,
        mulchHolePattern: c.mulchHolePattern,
        plantDistanceCm: c.plantDistanceCm ? c.plantDistanceCm.toString() : null,
        expectedPlantsPerAcre: c.expectedPlantsPerAcre ? c.expectedPlantsPerAcre.toString() : null,
        expectedPlants: c.expectedPlants ? c.expectedPlants.toString() : null,
        actualPlants: c.actualPlants ? c.actualPlants.toString() : null,
        varieties: c.varieties.map((v) => ({ name: v.name })),
        milestones: c.milestones.map((m) => ({
          id: m.id,
          name: m.name,
          targetDate: m.targetDate.toISOString(),
          status: m.status,
          completedAt: m.completedAt ? m.completedAt.toISOString() : null,
        })),
      })),
    })),
    monitoring: farm.monitoring.map((m) => ({
      id: m.id,
      status: m.status,
      stage: m.stage,
      impactPercent: m.impactPercent ? m.impactPercent.toString() : null,
      remarks: m.remarks,
      createdAt: m.createdAt.toISOString(),
    })),
    incidents: await Promise.all(
      farm.incidents.map(async (i) => {
        let imageUrl: string | null = null;
        if (i.media && i.media.length > 0) {
          try {
            imageUrl = await downloadUrl(i.media[0].storageKey);
          } catch {
            imageUrl = null;
          }
        }
        return {
          id: i.id,
          type: i.type,
          level: i.level,
          severity: i.severity,
          status: i.status,
          description: i.description,
          impactPercent: i.impactPercent ? i.impactPercent.toString() : null,
          reporterName: i.reporter?.name || "Field Officer",
          imageUrl,
          createdAt: i.createdAt.toISOString(),
        };
      })
    ),
    access: farm.access.map((a) => ({
      id: a.id,
      user: {
        id: a.user.id,
        name: a.user.name,
        email: a.user.email,
        role: a.user.role,
      },
    })),
  };

  return (
    <>
      <Navbar role={session.role} userName={session.name} />
      <main className="shell">
        <FarmHubClient
          farm={serializedFarm}
          role={session.role}
          canManage={canManage}
        />
      </main>
    </>
  );
}
