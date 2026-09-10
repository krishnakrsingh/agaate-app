import { NextRequest, NextResponse } from "next/server";
import { requireFarmAccess } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";
import { computePlotVisits } from "@/lib/plot-visits";

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
    const since = new Date(Date.now() - days * 86400000);

    const plots = await prisma.plot.findMany({
      where: { farmId, deletedAt: null, status: { not: "ARCHIVED" } },
      select: { id: true, name: true, boundaryGeoJson: true },
      orderBy: { name: "asc" },
    });
    const plotIds = plots.map((p) => p.id);
    if (plotIds.length === 0) {
      return NextResponse.json({ days, plots: [], summary: { total: 0, visited: 0, missed: 0, never: 0 } });
    }

    const [execWindow, execAll, monWindow, monAll, incWindow, incAll, harvWindow, harvAll, attendances] = await Promise.all([
      prisma.taskExecution.groupBy({ by: ["taskId"], where: { status: "COMPLETED", completedAt: { gte: since }, task: { plotId: { in: plotIds } } }, _max: { completedAt: true } }),
      prisma.taskExecution.groupBy({ by: ["taskId"], where: { status: "COMPLETED", task: { plotId: { in: plotIds } } }, _max: { completedAt: true } }),
      prisma.cropMonitoring.groupBy({ by: ["plotId"], where: { plotId: { in: plotIds }, createdAt: { gte: since } }, _max: { createdAt: true } }),
      prisma.cropMonitoring.groupBy({ by: ["plotId"], where: { plotId: { in: plotIds } }, _max: { createdAt: true } }),
      prisma.incident.groupBy({ by: ["plotId"], where: { plotId: { in: plotIds }, createdAt: { gte: since } }, _max: { createdAt: true } }),
      prisma.incident.groupBy({ by: ["plotId"], where: { plotId: { in: plotIds } }, _max: { createdAt: true } }),
      prisma.harvestLog.groupBy({ by: ["plotId"], where: { plotId: { in: plotIds }, harvestDate: { gte: since } }, _max: { harvestDate: true } }),
      prisma.harvestLog.groupBy({ by: ["plotId"], where: { plotId: { in: plotIds } }, _max: { harvestDate: true } }),
      prisma.attendance.findMany({
        where: { farmId, attendanceDate: { gte: new Date(since.toISOString().slice(0, 10)) } },
        select: { startLatitude: true, startLongitude: true, startAt: true, endLatitude: true, endLongitude: true, endAt: true },
        take: 2000,
      }),
    ]);

    // Executions group by task → resolve task.plotId.
    const execTasks = await prisma.task.findMany({
      where: { id: { in: [...execWindow.map((e) => e.taskId), ...execAll.map((e) => e.taskId)] } },
      select: { id: true, plotId: true },
    });
    const plotOfTask = new Map(execTasks.map((t) => [t.id, t.plotId]));
    const maxBy = (rows: { _max: { completedAt?: Date | null } }[], taskIds: string[]) => {
      const out: Record<string, string> = {};
      rows.forEach((r, i) => {
        const pid = plotOfTask.get(taskIds[i]);
        const at = r._max.completedAt?.toISOString();
        if (pid && at && (!out[pid] || at > out[pid])) out[pid] = at;
      });
      return out;
    };
    const maxByPlot = (
      rows: { plotId: string | null; _max: Record<string, Date | null> }[],
      key: string
    ) => {
      const out: Record<string, string> = {};
      for (const r of rows) {
        if (!r.plotId) continue;
        const at = (r._max[key] as Date | null)?.toISOString();
        if (at && (!out[r.plotId] || at > out[r.plotId])) out[r.plotId] = at;
      }
      return out;
    };
    const activity = (w: Record<string, string>[], a: Record<string, string>[]) => {
      const out: Record<string, string> = {};
      for (const m of [...w, ...a]) for (const [k, v] of Object.entries(m)) if (!out[k] || v > out[k]) out[k] = v;
      return out;
    };

    const fixes: { lat: number; lng: number; at: string }[] = [];
    for (const att of attendances) {
      if (att.startLatitude !== null && att.startLongitude !== null && att.startAt) {
        fixes.push({ lat: Number(att.startLatitude), lng: Number(att.startLongitude), at: att.startAt.toISOString() });
      }
      if (att.endLatitude !== null && att.endLongitude !== null && att.endAt) {
        fixes.push({ lat: Number(att.endLatitude), lng: Number(att.endLongitude), at: att.endAt.toISOString() });
      }
    }

    const sinceIso = since.toISOString();
    const results = computePlotVisits({
      plots: plots.map((p) => ({ id: p.id, name: p.name, boundaryGeoJson: p.boundaryGeoJson })),
      completionsAllTime: maxBy(execAll, execAll.map((e) => e.taskId)),
      completionsInWindow: maxBy(execWindow, execWindow.map((e) => e.taskId)),
      activityAllTime: activity(
        [maxByPlot(monAll, "createdAt"), maxByPlot(incAll, "createdAt"), maxByPlot(harvAll, "harvestDate")],
        []
      ),
      activityInWindow: activity(
        [maxByPlot(monWindow, "createdAt"), maxByPlot(incWindow, "createdAt"), maxByPlot(harvWindow, "harvestDate")],
        []
      ),
      fixes,
      windowStartIso: sinceIso,
    });

    const summary = {
      total: results.length,
      visited: results.filter((r) => r.status === "VISITED").length,
      missed: results.filter((r) => r.status === "MISSED").length,
      never: results.filter((r) => r.status === "NEVER").length,
    };
    return NextResponse.json({ days, since: sinceIso, plots: results, summary });
  } catch (error) {
    return apiError(error);
  }
}
