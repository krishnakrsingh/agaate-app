import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";
import { parseBoundary } from "@/lib/geo-server";

export const dynamic = "force-dynamic";

/**
 * HQ boundary QA flags: farms whose recorded acres (measured, falling back
 * to total area) differ from the server-computed boundary acres by more than
 * `tolerance` (default 5%). Invalid GeoJSON is skipped and counted.
 * GET /api/hq/map/qa?tolerance=0.05&clientId=&limit=100
 */
const SCAN_CAP = 2000;

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["AGRONOMIST"]);

    const sp = request.nextUrl.searchParams;
    const rawTol = Number(sp.get("tolerance") ?? 0.05);
    const tolerance = Number.isFinite(rawTol) && rawTol > 0 && rawTol < 1 ? rawTol : 0.05;
    const clientId = sp.get("clientId")?.trim() || null;
    const limit = Math.min(200, Math.max(1, Number(sp.get("limit") || 100) || 100));

    const where: any = { boundaryGeoJson: { not: null } };
    if (clientId) where.clientId = clientId;

    const rows = await prisma.farm.findMany({
      where,
      select: {
        id: true,
        name: true,
        totalArea: true,
        measuredAcres: true,
        boundaryGeoJson: true,
        client: { select: { name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: SCAN_CAP,
    });

    const flags: any[] = [];
    let invalidCount = 0;
    for (const f of rows) {
      const parsed = parseBoundary(f.boundaryGeoJson);
      if (!parsed) {
        invalidCount += 1;
        continue;
      }
      const recorded = f.measuredAcres !== null ? Number(f.measuredAcres) : Number(f.totalArea);
      if (!Number.isFinite(recorded) || recorded <= 0) continue;
      const deltaPct = Math.abs(parsed.acres - recorded) / recorded;
      if (deltaPct > tolerance) {
        flags.push({
          farmId: f.id,
          farmName: f.name,
          clientName: f.client?.name ?? null,
          recordedAcres: recorded,
          computedAcres: Math.round(parsed.acres * 100) / 100,
          deltaPct: Math.round(deltaPct * 1000) / 10,
          compareHref: `/farms/${f.id}?tab=boundaries`,
        });
      }
    }

    flags.sort((a, b) => b.deltaPct - a.deltaPct);

    return NextResponse.json(
      {
        flags: flags.slice(0, limit),
        flagCount: flags.length,
        scanned: rows.length,
        scanCapped: rows.length >= SCAN_CAP,
        invalidCount,
        tolerance,
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}
