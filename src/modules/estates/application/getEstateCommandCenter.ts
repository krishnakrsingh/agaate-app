/**
 * modules/estates/application/getEstateCommandCenter — application use-case for
 * the Estate Command Center server page (src/app/farms/[farmId]/page.tsx).
 */

import { prisma } from "@/infrastructure/db";
import { requireFarmAccess } from "@modules/auth";
import { downloadUrl } from "@/infrastructure/storage";
import { findEstateCommandCenterData } from "../infrastructure/estateQueries";

type Db = typeof prisma;

export async function getEstateCommandCenter(opts: {
  estateId: string;
  userId: string;
  db?: Db;
}) {
  const { estateId, userId, db = prisma } = opts;
  await requireFarmAccess(estateId);

  const { farm, plotsTotal, incidentsTotal } = await findEstateCommandCenterData(db, estateId);
  const canManage = farm.access.some((a) => a.userId === userId && a.canManage);

  const serializedFarm = {
    id: farm.id,
    name: farm.name,
    ownerName: farm.ownerName,
    location: farm.location,
    address: farm.address,
    latitude: farm.latitude?.toString() ?? "0",
    longitude: farm.longitude?.toString() ?? "0",
    totalArea: farm.totalArea?.toString() ?? "0",
    cultivableArea: farm.cultivableArea?.toString() ?? "0",
    waterSource: farm.waterSource,
    status: farm.status,
    setupStage: farm.setupStage,
    setupProgress: farm.setupProgress,
    handedOverAt: farm.handedOverAt ? farm.handedOverAt.toISOString() : null,
    surveyNumber: farm.surveyNumber,
    village: farm.village,
    taluk: farm.taluk,
    district: farm.district,
    state: farm.state,
    pincode: farm.pincode,
    terrainType: farm.terrainType,
    fencingType: farm.fencingType,
    borewellCount: farm.borewellCount,
    borewellDepthFeet: farm.borewellDepthFeet,
    waterYieldGph: farm.waterYieldGph,
    electricitySupply: farm.electricitySupply,
    soilPh: farm.soilPh ? farm.soilPh.toString() : null,
    soilEc: farm.soilEc ? farm.soilEc.toString() : null,
    soilOrganicCarbon: farm.soilOrganicCarbon ? farm.soilOrganicCarbon.toString() : null,
    proposedCrops: farm.proposedCrops,
    contractValue: farm.contractValue ? farm.contractValue.toString() : null,
    targetHandoverDate: farm.targetHandoverDate ? farm.targetHandoverDate.toISOString() : null,
    client: farm.client
      ? {
          id: farm.client.id,
          name: farm.client.name,
          code: farm.client.code,
          phone: farm.client.phone,
        }
      : null,
    geofenceRadiusMeters: farm.geofenceRadiusMeters,
    boundaryGeoJson: farm.boundaryGeoJson,
    plots: farm.plots.map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area?.toString() ?? "0",
      latitude: p.latitude?.toString() ?? "0",
      longitude: p.longitude?.toString() ?? "0",
      soilType: p.soilType,
      status: p.status,
      boundaryGeoJson: p.boundaryGeoJson,
      measuredAcres: p.measuredAcres ? p.measuredAcres.toString() : null,
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
    plotsTotal,
    plotsTruncated: plotsTotal > farm.plots.length,
    incidentsTotal,
    incidentsTruncated: incidentsTotal > farm.incidents.length,
  };

  return { farm: serializedFarm, canManage };
}
