import { NextRequest, NextResponse } from "next/server";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, paginatedJson, paginationParams } from "@/lib/api";
import { serializeBoundaryVersion } from "@/lib/geo-versions";

/**
 * Immutable boundary history for a plot, newest first.
 * Existence is masked as 404 without farm access (same idiom as plot GET).
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ plotId: string }> }
) {
  try {
    const { plotId } = await params;
    const scope = await prisma.plot.findUnique({ where: { id: plotId }, select: { farmId: true } });
    if (!scope) return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    try {
      await requireFarmAccess(scope.farmId);
    } catch {
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }
    const { limit, offset } = paginationParams(request.nextUrl.searchParams);
    const where = { entityType: "PLOT" as const, entityId: plotId };
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
