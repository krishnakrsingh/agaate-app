import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * Super Admin Spatial & Boundary Reviews API.
 * Aggregates portfolio spatial status:
 * 1. Farms with boundaries (for multi-estate mapping)
 * 2. Flagged boundary versions (|Δ| >= policy threshold)
 * 3. Recent GPS perimeter walk tracks
 */
export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const search = request.nextUrl.searchParams.get("search")?.trim();
    const filter = request.nextUrl.searchParams.get("filter") || "demarcated";
    const limit = Math.min(100, Math.max(1, parseInt(request.nextUrl.searchParams.get("limit") || "50", 10)));

    const farmWhere: any = {};
    if (filter === "demarcated") {
      farmWhere.boundaryGeoJson = { not: null };
    } else if (filter === "missing") {
      farmWhere.boundaryGeoJson = null;
    }

    if (search) {
      farmWhere.OR = [
        { name: { contains: search } },
        { location: { contains: search } },
        { surveyNumber: { contains: search } },
        { district: { contains: search } },
      ];
    }

    const [farms, flaggedVersions, recentWalks, totalEstates, demarcatedCount, flaggedCount] = await Promise.all([
      // 1. Portfolio farms with boundary and plot summaries (bounded & filtered)
      prisma.farm.findMany({
        where: farmWhere,
        select: {
          id: true,
          name: true,
          location: true,
          surveyNumber: true,
          district: true,
          latitude: true,
          longitude: true,
          totalArea: true,
          cultivableArea: true,
          measuredAcres: true,
          boundaryGeoJson: true,
          status: true,
          setupStage: true,
          plots: {
            where: { deletedAt: null },
            select: {
              id: true,
              name: true,
              area: true,
              measuredAcres: true,
              boundaryGeoJson: true,
              status: true,
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
      }),

      // 2. Flagged boundary versions across the portfolio
      prisma.boundaryVersion.findMany({
        where: { areaFlagged: true },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),

      // 3. Recent GPS perimeter walk tracks
      prisma.walkTrack.findMany({
        select: {
          id: true,
          entityType: true,
          entityId: true,
          quality: true,
          acres: true,
          samplesKept: true,
          samplesDropped: true,
          actorId: true,
          createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),

      // 4. Quick aggregate counts
      prisma.farm.count(),
      prisma.farm.count({ where: { boundaryGeoJson: { not: null } } }),
      prisma.boundaryVersion.count({ where: { areaFlagged: true } }),
    ]);

    // Resolve entity names for flagged versions
    const farmIds = flaggedVersions
      .filter((v) => v.entityType === "FARM")
      .map((v) => v.entityId);
    const plotIds = flaggedVersions
      .filter((v) => v.entityType === "PLOT")
      .map((v) => v.entityId);

    const [farmsMapData, plotsMapData] = await Promise.all([
      farmIds.length > 0
        ? prisma.farm.findMany({
            where: { id: { in: farmIds } },
            select: { id: true, name: true },
          })
        : [],
      plotIds.length > 0
        ? prisma.plot.findMany({
            where: { id: { in: plotIds } },
            select: { id: true, name: true, farmId: true, farm: { select: { name: true } } },
          })
        : [],
    ]);

    const farmNames = new Map(farmsMapData.map((f) => [f.id, f.name]));
    const plotInfo = new Map(
      plotsMapData.map((p) => [p.id, { name: p.name, farmId: p.farmId, farmName: p.farm.name }])
    );

    const serializedFlagged = flaggedVersions.map((v) => {
      let entityName = v.entityId;
      let farmId = v.entityId;
      let farmName = "Estate";

      if (v.entityType === "FARM") {
        farmName = farmNames.get(v.entityId) || "Estate";
        entityName = farmName;
      } else {
        const info = plotInfo.get(v.entityId);
        if (info) {
          entityName = info.name;
          farmId = info.farmId;
          farmName = info.farmName;
        }
      }

      const measured = v.measuredAcres ? Number(v.measuredAcres) : null;
      const prev = v.prevAcres ? Number(v.prevAcres) : null;
      const deltaPercent =
        measured != null && prev != null && prev > 0
          ? ((measured - prev) / prev) * 100
          : null;

      return {
        id: v.id,
        version: v.version,
        entityType: v.entityType,
        entityId: v.entityId,
        entityName,
        farmId,
        farmName,
        source: v.source,
        measuredAcres: measured,
        prevAcres: prev,
        deltaPercent,
        actorName: v.actorName,
        captureId: v.captureId,
        createdAt: v.createdAt.toISOString(),
      };
    });

    const serializedFarms = farms.map((f) => ({
      id: f.id,
      name: f.name,
      location: f.location,
      latitude: Number(f.latitude),
      longitude: Number(f.longitude),
      totalArea: Number(f.totalArea),
      cultivableArea: Number(f.cultivableArea),
      surveyNumber: f.surveyNumber,
      district: f.district,
      measuredAcres: f.measuredAcres ? Number(f.measuredAcres) : null,
      boundaryGeoJson: f.boundaryGeoJson,
      status: f.status,
      setupStage: f.setupStage,
      plotCount: f.plots.length,
      plots: f.plots.map((p) => ({
        id: p.id,
        name: p.name,
        area: Number(p.area),
        measuredAcres: p.measuredAcres ? Number(p.measuredAcres) : null,
        boundaryGeoJson: p.boundaryGeoJson,
        status: p.status,
      })),
    }));

    const serializedWalks = recentWalks.map((w) => ({
      id: w.id,
      entityType: w.entityType,
      entityId: w.entityId,
      quality: w.quality,
      acres: w.acres ? Number(w.acres) : null,
      samplesKept: w.samplesKept,
      samplesDropped: w.samplesDropped,
      actorId: w.actorId,
      createdAt: w.createdAt.toISOString(),
    }));

    return NextResponse.json(
      {
        farms: serializedFarms,
        flaggedVersions: serializedFlagged,
        recentWalks: serializedWalks,
        stats: {
          totalEstates,
          demarcatedCount,
          flaggedCount,
        },
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}
