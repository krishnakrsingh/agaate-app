import { NextRequest, NextResponse } from "next/server";
import { requireFarmAccess } from "@/lib/access";
import { apiError } from "@/lib/api";
import { getPlotVisits } from "@/lib/plot-visit-service";

/**
 * Field coverage per plot: VISITED (in window) / MISSED (older) / NEVER.
 * Signals: completed task executions, attendance GPS inside plot fences,
 * and field activity (monitoring, incidents, harvests). Read-only,
 * farm-scoped, bounded by plot count.
 * GET /api/farms/[farmId]/plot-visits?days=14
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
      // Mask existence: no-access reads as not-found.
      return NextResponse.json({ error: "The requested record was not found." }, { status: 404 });
    }
    const days = Math.min(90, Math.max(1, Number(request.nextUrl.searchParams.get("days") || 14) || 14));
    const data = await getPlotVisits(farmId, days);
    // fences stay server-side here (map payloads have their own endpoint).
    return NextResponse.json({ days: data.days, since: data.since, plots: data.plots, summary: data.summary });
  } catch (error) {
    return apiError(error);
  }
}
