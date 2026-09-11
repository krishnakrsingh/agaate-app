import { NextRequest, NextResponse } from "next/server";
import { accessibleFarmWhere, currentActor, requireRole, HttpError } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

const MAX_SPAN_DAYS = 93;
const SCOPED_SPAN_DAYS = 31;
// Bounded fan-out per source — never fetch-all.
const PER_SOURCE_TAKE = 500;

function parseDay(value: string | null, label: string): Date {
  if (!value) throw new HttpError(422, `${label} is required (YYYY-MM-DD).`);
  const d = new Date(`${value}T00:00:00.000Z`);
  if (isNaN(d.getTime())) throw new HttpError(422, `${label} must be YYYY-MM-DD.`);
  return d;
}

function dayKey(d: Date): string {
  return d.toISOString().slice(0, 10);
}

interface DayBucket {
  date: string;
  tasksDue: number;
  tasksDone: number;
  incidents: number;
  harvests: number;
  monitoring: number;
  musters: number;
  exceptions: number;
}

/**
 * Platform calendar aggregates (read-model). One bounded query per source,
 * bucketed per UTC day. Ranges over 31 days must be scoped to a farm or a
 * client so a platform-wide sweep can never fan out unbounded.
 */
export async function GET(request: NextRequest) {
  try {
    // HQ platform surface: SUPER_ADMIN + AGRONOMIST (same gate as hq/map).
    const actor = await currentActor();
    requireRole(actor.role, ["AGRONOMIST"]);
    const sp = request.nextUrl.searchParams;

    const fromDay = parseDay(sp.get("from"), "from");
    const toDay = parseDay(sp.get("to"), "to");
    if (fromDay > toDay) throw new HttpError(422, "from must not be after to.");
    const spanDays = Math.floor((toDay.getTime() - fromDay.getTime()) / 86_400_000) + 1;
    if (spanDays > MAX_SPAN_DAYS) throw new HttpError(422, `Calendar range is capped at ${MAX_SPAN_DAYS} days.`);

    const farmId = sp.get("farmId")?.trim() || null;
    const clientId = sp.get("clientId")?.trim() || null;
    if (spanDays > SCOPED_SPAN_DAYS && !farmId && !clientId) {
      throw new HttpError(422, "Select a farm or client for ranges over 31 days.");
    }

    const farmWhere = await accessibleFarmWhere();
    const accessible = await prisma.farm.findMany({
      where: farmWhere,
      select: { id: true, clientId: true },
    });
    let farmIds = accessible.map((f) => f.id);
    if (clientId) farmIds = accessible.filter((f) => f.clientId === clientId).map((f) => f.id);
    if (farmId) {
      if (!farmIds.includes(farmId)) throw new HttpError(403, "You do not have access to this farm.");
      farmIds = [farmId];
    }
    if (farmIds.length === 0) {
      return NextResponse.json({ from: sp.get("from"), to: sp.get("to"), days: [], totals: emptyTotals() }, { headers: { "Cache-Control": "no-store" } });
    }

    const from = new Date(Date.UTC(fromDay.getUTCFullYear(), fromDay.getUTCMonth(), fromDay.getUTCDate()));
    const to = new Date(Date.UTC(toDay.getUTCFullYear(), toDay.getUTCMonth(), toDay.getUTCDate(), 23, 59, 59, 999));
    const farmFilter = farmIds.length === 1 ? { farmId: farmIds[0] } : { farmId: { in: farmIds } };

    const [tasks, executions, incidents, harvests, monitoring, attendance, musters] = await Promise.all([
      prisma.task.findMany({
        where: { ...farmFilter, dueDate: { gte: from, lte: to } },
        select: { dueDate: true, status: true },
        take: PER_SOURCE_TAKE,
      }),
      prisma.taskExecution.findMany({
        where: { completedAt: { gte: from, lte: to }, task: farmFilter },
        select: { completedAt: true },
        take: PER_SOURCE_TAKE,
      }),
      prisma.incident.findMany({
        where: { ...farmFilter, createdAt: { gte: from, lte: to } },
        select: { createdAt: true },
        take: PER_SOURCE_TAKE,
      }),
      prisma.harvestLog.findMany({
        where: { ...farmFilter, harvestDate: { gte: from, lte: to } },
        select: { harvestDate: true },
        take: PER_SOURCE_TAKE,
      }),
      prisma.cropMonitoring.findMany({
        where: { ...farmFilter, createdAt: { gte: from, lte: to } },
        select: { createdAt: true },
        take: PER_SOURCE_TAKE,
      }),
      prisma.attendance.findMany({
        where: { ...farmFilter, attendanceDate: { gte: from, lte: to } },
        select: { attendanceDate: true, status: true },
        take: PER_SOURCE_TAKE,
      }),
      prisma.dailyCrewMuster.findMany({
        where: { ...farmFilter, musterDate: { gte: from, lte: to } },
        select: { musterDate: true },
        take: PER_SOURCE_TAKE,
      }),
    ]);

    const buckets = new Map<string, DayBucket>();
    const bucket = (d: Date): DayBucket => {
      const key = dayKey(d);
      let b = buckets.get(key);
      if (!b) {
        b = { date: key, tasksDue: 0, tasksDone: 0, incidents: 0, harvests: 0, monitoring: 0, musters: 0, exceptions: 0 };
        buckets.set(key, b);
      }
      return b;
    };

    for (const t of tasks) bucket(t.dueDate).tasksDue += 1;
    for (const e of executions) if (e.completedAt) bucket(e.completedAt).tasksDone += 1;
    for (const i of incidents) bucket(i.createdAt).incidents += 1;
    for (const h of harvests) bucket(h.harvestDate).harvests += 1;
    for (const m of monitoring) bucket(m.createdAt).monitoring += 1;
    for (const a of attendance) {
      const b = bucket(a.attendanceDate);
      if (a.status === "EXCEPTION_PENDING" || a.status === "EXCEPTION_REJECTED") b.exceptions += 1;
    }
    for (const m of musters) bucket(m.musterDate).musters += 1;

    const days = [...buckets.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
    const totals = emptyTotals();
    for (const d of days) {
      totals.tasksDue += d.tasksDue;
      totals.tasksDone += d.tasksDone;
      totals.incidents += d.incidents;
      totals.harvests += d.harvests;
      totals.monitoring += d.monitoring;
      totals.musters += d.musters;
      totals.exceptions += d.exceptions;
    }

    return NextResponse.json(
      { from: dayKey(from), to: dayKey(to), farmId, clientId, days, totals },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}

function emptyTotals() {
  return { tasksDue: 0, tasksDone: 0, incidents: 0, harvests: 0, monitoring: 0, musters: 0, exceptions: 0 };
}
