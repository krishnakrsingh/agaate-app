import { NextRequest, NextResponse } from "next/server";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

/**
 * Map payload: open tasks pinned to fenced plots, plus the farm fence.
 * Bounded (200). Tasks without a plot, and plots without fences, are
 * excluded — the map shows located work, never guesses.
 * GET /api/farms/[farmId]/task-pins?status=OPEN
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
    const statusParam = request.nextUrl.searchParams.get("status");
    const STATUSES = ["DRAFT", "ASSIGNED", "AVAILABLE", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"] as const;
    const farm = await prisma.farm.findUniqueOrThrow({
      where: { id: farmId },
      select: { id: true, name: true, boundaryGeoJson: true, latitude: true, longitude: true },
    });
    const tasks = await prisma.task.findMany({
      where: {
        farmId,
        plotId: { not: null },
        ...(statusParam && statusParam !== "ALL" && (STATUSES as readonly string[]).includes(statusParam)
          ? { status: statusParam as (typeof STATUSES)[number] }
          : { status: { notIn: ["COMPLETED", "CANCELLED"] as const } }),
      },
      select: {
        id: true,
        title: true,
        status: true,
        priority: true,
        dueDate: true,
        plot: { select: { id: true, name: true, boundaryGeoJson: true, latitude: true, longitude: true } },
        assignedOfficer: { select: { name: true } },
      },
      orderBy: { dueDate: "asc" },
      take: 200,
    });
    const pins = tasks
      .filter((t) => t.plot && t.plot.boundaryGeoJson)
      .map((t) => ({
        taskId: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        dueDate: t.dueDate.toISOString().slice(0, 10),
        officer: t.assignedOfficer?.name ?? null,
        plotId: t.plot!.id,
        plotName: t.plot!.name,
        boundaryGeoJson: t.plot!.boundaryGeoJson,
        latitude: Number(t.plot!.latitude),
        longitude: Number(t.plot!.longitude),
      }));
    return NextResponse.json({
      farm: {
        id: farm.id,
        name: farm.name,
        boundaryGeoJson: farm.boundaryGeoJson,
        latitude: Number(farm.latitude),
        longitude: Number(farm.longitude),
      },
      pins,
      excluded: { unlocated: tasks.length - pins.length },
    });
  } catch (error) {
    return apiError(error);
  }
}
