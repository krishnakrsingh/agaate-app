import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole, accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";
import { parseBoundary } from "@/lib/geo-server";

export const dynamic = "force-dynamic";

/**
 * HQ platform map viewport API.
 * Never loads the portfolio: every query is bounded by the map viewport
 * bbox (lat/lng range) and hard-capped at 500 farms. Beyond the cap the
 * request is refused with the total so the UI can suggest filters.
 * GET /api/hq/map/farms?minLat=&maxLat=&minLng=&maxLng=&clientId=&layers=farms,plots,tasks,incidents&ids=
 */
const CAP = 500;

function num(v: string | null, lo: number, hi: number): number | null {
  if (v === null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n) || n < lo || n > hi) return null;
  return n;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["AGRONOMIST"]);
    const farmScope = await accessibleFarmWhere();

    const sp = request.nextUrl.searchParams;
    const clientId = sp.get("clientId")?.trim() || null;
    const layers = new Set(
      (sp.get("layers") || "farms").split(",").map((s) => s.trim()).filter(Boolean)
    );
    const ids = (sp.get("ids") || "")
      .split(",").map((s) => s.trim()).filter(Boolean).slice(0, 25);

    const where: any = { ...farmScope };
    if (clientId) where.clientId = clientId;

    if (ids.length > 0) {
      where.id = { in: ids };
    } else {
      let minLat = num(sp.get("minLat"), -90, 90);
      let maxLat = num(sp.get("maxLat"), -90, 90);
      let minLng = num(sp.get("minLng"), -180, 180);
      let maxLng = num(sp.get("maxLng"), -180, 180);
      if (minLat === null || maxLat === null || minLng === null || maxLng === null) {
        return NextResponse.json(
          { error: "Viewport bounds (minLat, maxLat, minLng, maxLng) are required." },
          { status: 422, headers: noStore }
        );
      }
      if (minLat > maxLat) [minLat, maxLat] = [maxLat, minLat];
      if (minLng > maxLng) [minLng, maxLng] = [maxLng, minLng];
      where.latitude = { gte: minLat, lte: maxLat };
      where.longitude = { gte: minLng, lte: maxLng };
    }

    const total = await prisma.farm.count({ where });
    if (total > CAP && ids.length === 0) {
      return NextResponse.json(
        {
          refused: true,
          total,
          cap: CAP,
          farms: [],
          message: `Too many farms in view (${total}). Zoom in or filter by client to load the map.`,
        },
        { headers: noStore }
      );
    }

    const rows = await prisma.farm.findMany({
      where,
      select: {
        id: true,
        name: true,
        status: true,
        latitude: true,
        longitude: true,
        totalArea: true,
        measuredAcres: true,
        boundaryGeoJson: true,
        client: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: CAP,
    });

    const farms: any[] = [];
    const missingCoords: any[] = [];
    let invalidBoundaryCount = 0;

    for (const f of rows) {
      const lat = f.latitude === null || f.latitude === undefined ? NaN : Number(f.latitude);
      const lng = f.longitude === null || f.longitude === undefined ? NaN : Number(f.longitude);
      const base = {
        id: f.id,
        name: f.name,
        status: f.status,
        clientId: f.client?.id ?? null,
        clientName: f.client?.name ?? null,
        totalArea: Number(f.totalArea),
        measuredAcres: f.measuredAcres === null ? null : Number(f.measuredAcres),
        href: `/farms/${f.id}`,
      };
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        missingCoords.push(base);
        continue;
      }
      let ring: [number, number][] | null = null;
      if (f.boundaryGeoJson) {
        const parsed = parseBoundary(f.boundaryGeoJson);
        if (parsed) ring = parsed.ring as [number, number][];
        else invalidBoundaryCount += 1;
      }
      farms.push({ ...base, lat, lng, hasBoundary: ring !== null, ring });
    }

    const farmIds = farms.map((f) => f.id);
    const farmById = new Map(farms.map((f) => [f.id, f]));

    let plots: any[] = [];
    if (layers.has("plots") && farmIds.length > 0) {
      const plotRows = await prisma.plot.findMany({
        where: { farmId: { in: farmIds }, deletedAt: null },
        select: {
          id: true, farmId: true, name: true, status: true,
          latitude: true, longitude: true, area: true, boundaryGeoJson: true,
        },
        orderBy: { name: "asc" },
        take: CAP,
      });
      for (const p of plotRows) {
        let ring: [number, number][] | null = null;
        if (p.boundaryGeoJson) {
          const parsed = parseBoundary(p.boundaryGeoJson);
          if (parsed) ring = parsed.ring as [number, number][];
          else invalidBoundaryCount += 1;
        }
        plots.push({
          id: p.id,
          farmId: p.farmId,
          name: p.name,
          status: p.status,
          lat: Number(p.latitude),
          lng: Number(p.longitude),
          area: Number(p.area),
          ring,
        });
      }
    }

    let taskCounts: Record<string, number> = {};
    if (layers.has("tasks") && farmIds.length > 0) {
      const groups = await prisma.task.groupBy({
        by: ["farmId"],
        where: {
          farmId: { in: farmIds },
          status: { in: ["ASSIGNED", "AVAILABLE", "IN_PROGRESS", "BLOCKED"] },
        },
        _count: { _all: true },
      });
      for (const g of groups) taskCounts[g.farmId] = g._count._all;
    }

    let incidents: any[] = [];
    if (layers.has("incidents") && farmIds.length > 0) {
      const incRows = await prisma.incident.findMany({
        where: { farmId: { in: farmIds }, status: { in: ["OPEN", "ACKNOWLEDGED"] } },
        select: {
          id: true, farmId: true, type: true, status: true,
          latitude: true, longitude: true, createdAt: true,
        },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      for (const i of incRows) {
        const farm = farmById.get(i.farmId);
        const lat = i.latitude !== null ? Number(i.latitude) : farm?.lat;
        const lng = i.longitude !== null ? Number(i.longitude) : farm?.lng;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
        incidents.push({
          id: i.id, farmId: i.farmId, type: i.type, status: i.status,
          lat, lng, farmName: farm?.name ?? null, createdAt: i.createdAt,
        });
      }
    }

    return NextResponse.json(
      {
        refused: false,
        total,
        farms,
        plots,
        taskCounts,
        incidents,
        missingCoords,
        invalidBoundaryCount,
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}
