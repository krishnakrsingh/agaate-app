import { NextRequest, NextResponse } from "next/server";
import { requireFarmAccess } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { apiError, paginatedJson, paginationParams } from "@infrastructure/http";
import { serializeBoundaryVersion } from "@modules/spatial";

/**
 * Immutable boundary history for a farm, newest first.
 * Geometry included per version (rings are small; paginated); raw GPS
 * tracks stay behind /api/walk-tracks/[captureId].
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
      // Mask existence: no-access reads as not-found (plot-route idiom).
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }
    const { limit, offset } = paginationParams(request.nextUrl.searchParams);
    const where = { entityType: "FARM" as const, entityId: farmId };
    const [rows, total] = await Promise.all([
      prisma.boundaryVersion.findMany({
        where,
        orderBy: { version: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.boundaryVersion.count({ where }),
    ]);
    return paginatedJson(rows.map(serializeBoundaryVersion), total);
  } catch (error) {
    return apiError(error);
  }
}
