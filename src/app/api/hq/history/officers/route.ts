import { NextRequest, NextResponse } from "next/server";
import { accessibleFarmWhere, currentActor, requireRole, HttpError } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const MAX_SPAN_DAYS = 93;
const DEFAULT_SPAN_DAYS = 31;
// Bounded group-by fan-out — never fetch-all.
const GROUP_TAKE = 500;

function parseDay(value: string | null, label: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (isNaN(d.getTime())) throw new HttpError(422, `${label} must be YYYY-MM-DD.`);
  return d;
}

export interface OfficerRow {
  officerId: string;
  name: string;
  tasksAssigned: number;
  tasksCompleted: number;
  incidentsReported: number;
  attendanceDays: number;
  attendanceExceptions: number;
  monitoringCount: number;
  mustersRecorded: number;
}

/**
 * Officer lens (read-model): who worked on what per farm scope — tasks
 * completed/assigned, incidents reported, attendance days. Reused by Client
 * 360 history and analytics. Immutable: aggregates only, nothing is written.
 */
export async function GET(request: NextRequest) {
  try {
    // HQ platform surface: SUPER_ADMIN + AGRONOMIST (same gate as hq/map).
    const actor = await currentActor();
    requireRole(actor.role, ["AGRONOMIST"]);
    const sp = request.nextUrl.searchParams;

    const farmId = sp.get("farmId")?.trim() || null;
    const clientId = sp.get("clientId")?.trim() || null;
    if (!farmId && !clientId) throw new HttpError(422, "Select a farm or client for the officer lens.");

    const farmWhere = await accessibleFarmWhere();
    const accessible = await prisma.farm.findMany({ where: farmWhere, select: { id: true, clientId: true } });
    let farmIds = accessible.map((f) => f.id);
    if (clientId) farmIds = accessible.filter((f) => f.clientId === clientId).map((f) => f.id);
    if (farmId) {
      if (!farmIds.includes(farmId)) throw new HttpError(403, "You do not have access to this farm.");
      farmIds = [farmId];
    }
    if (farmIds.length === 0) {
      return NextResponse.json({ farmId, clientId, officers: [] }, { headers: { "Cache-Control": "no-store" } });
    }

    const now = new Date();
    const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const defaultFrom = new Date(defaultTo);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - (DEFAULT_SPAN_DAYS - 1));
    const fromDay = parseDay(sp.get("from"), "from") ?? defaultFrom;
    const toDay = parseDay(sp.get("to"), "to") ?? defaultTo;
    if (fromDay > toDay) throw new HttpError(422, "from must not be after to.");
    if (Math.floor((toDay.getTime() - fromDay.getTime()) / 86_400_000) + 1 > MAX_SPAN_DAYS) {
      throw new HttpError(422, `Officer lens range is capped at ${MAX_SPAN_DAYS} days.`);
    }
    const from = new Date(Date.UTC(fromDay.getUTCFullYear(), fromDay.getUTCMonth(), fromDay.getUTCDate()));
    const to = new Date(Date.UTC(toDay.getUTCFullYear(), toDay.getUTCMonth(), toDay.getUTCDate(), 23, 59, 59, 999));
    const farmFilter = farmIds.length === 1 ? { farmId: farmIds[0] } : { farmId: { in: farmIds } };

    const [assigned, completed, incidents, attendance, monitoring, musters] = await Promise.all([
      prisma.task.groupBy({
        by: ["assignedOfficerId"],
        where: { ...farmFilter, assignedOfficerId: { not: null }, dueDate: { gte: from, lte: to } },
        _count: true,
        orderBy: { assignedOfficerId: "asc" },
        take: GROUP_TAKE,
      }),
      prisma.taskExecution.groupBy({
        by: ["officerId"],
        where: { completedAt: { gte: from, lte: to }, task: farmFilter },
        _count: true,
        orderBy: { officerId: "asc" },
        take: GROUP_TAKE,
      }),
      prisma.incident.groupBy({
        by: ["reporterId"],
        where: { ...farmFilter, createdAt: { gte: from, lte: to } },
        _count: true,
        orderBy: { reporterId: "asc" },
        take: GROUP_TAKE,
      }),
      prisma.attendance.groupBy({
        by: ["userId", "attendanceDate"],
        where: { ...farmFilter, attendanceDate: { gte: from, lte: to } },
        _count: true,
        orderBy: [{ userId: "asc" }, { attendanceDate: "asc" }],
        take: GROUP_TAKE,
      }),
      prisma.cropMonitoring.groupBy({
        by: ["officerId"],
        where: { ...farmFilter, createdAt: { gte: from, lte: to } },
        _count: true,
        orderBy: { officerId: "asc" },
        take: GROUP_TAKE,
      }),
      prisma.dailyCrewMuster.groupBy({
        by: ["recordedById"],
        where: { ...farmFilter, musterDate: { gte: from, lte: to } },
        _count: true,
        orderBy: { recordedById: "asc" },
        take: GROUP_TAKE,
      }),
    ]);

    // Attendance exceptions need status, which groupBy above drops — one slim
    // bounded pass over exception rows only (a small subset by design).
    const exceptions = await prisma.attendance.groupBy({
      by: ["userId"],
      where: { ...farmFilter, attendanceDate: { gte: from, lte: to }, status: { in: ["EXCEPTION_PENDING", "EXCEPTION_REJECTED"] } },
      _count: true,
      orderBy: { userId: "asc" },
      take: GROUP_TAKE,
    });

    const rows = new Map<string, OfficerRow>();
    const row = (id: string): OfficerRow => {
      let r = rows.get(id);
      if (!r) {
        r = { officerId: id, name: id, tasksAssigned: 0, tasksCompleted: 0, incidentsReported: 0, attendanceDays: 0, attendanceExceptions: 0, monitoringCount: 0, mustersRecorded: 0 };
        rows.set(id, r);
      }
      return r;
    };

    for (const g of assigned) if (g.assignedOfficerId) row(g.assignedOfficerId).tasksAssigned += g._count;
    for (const g of completed) row(g.officerId).tasksCompleted += g._count;
    for (const g of incidents) row(g.reporterId).incidentsReported += g._count;
    for (const g of attendance) row(g.userId).attendanceDays += 1;
    for (const g of monitoring) row(g.officerId).monitoringCount += g._count;
    for (const g of musters) row(g.recordedById).mustersRecorded += g._count;
    for (const g of exceptions) row(g.userId).attendanceExceptions += g._count;

    if (rows.size > 0) {
      const users = await prisma.user.findMany({
        where: { id: { in: [...rows.keys()] } },
        select: { id: true, name: true },
      });
      for (const u of users) {
        const r = rows.get(u.id);
        if (r) r.name = u.name;
      }
    }

    const officers = [...rows.values()].sort((a, b) => b.tasksCompleted - a.tasksCompleted || b.attendanceDays - a.attendanceDays);
    return NextResponse.json({ farmId, clientId, officers }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return apiError(error);
  }
}
