import { NextRequest, NextResponse } from "next/server";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { getPlotVisits } from "@/lib/plot-visit-service";
import { planVisitRoute } from "@/lib/plot-visits";

/**
 * Walking order over unvisited plots (MISSED + NEVER with fences),
 * greedy nearest-neighbor from the officer's GPS (or farm center).
 * Unfenced plots are listed as unroutable, never faked.
 * GET /api/farms/[farmId]/visit-route?days=14&fromLat=&fromLng=
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ farmId: string }> }
) {
  try {
    const { farmId } = await params;
    try {
      await requireFarmAccess(farmId);
    } catch {
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }
    const sp = request.nextUrl.searchParams;
    const days = Math.min(90, Math.max(1, Number(sp.get("days") || 14) || 14));
    const farm = await prisma.farm.findUniqueOrThrow({
      where: { id: farmId },
      select: { latitude: true, longitude: true },
    });
    const fromLat = Number(sp.get("fromLat"));
    const fromLng = Number(sp.get("fromLng"));
    const start =
      Number.isFinite(fromLat) && Number.isFinite(fromLng)
        ? { lat: fromLat, lng: fromLng }
        : { lat: Number(farm.latitude), lng: Number(farm.longitude) };

    const data = await getPlotVisits(farmId, days);
    const { stops, unroutable, totalMeters } = planVisitRoute(start, data.plots, data.fences);
    return NextResponse.json({
      days,
      start,
      stops,
      unroutable,
      totalMeters,
      summary: { ...data.summary, routed: stops.length, unroutable: unroutable.length },
    });
  } catch (error) {
    return apiError(error);
  }
}
