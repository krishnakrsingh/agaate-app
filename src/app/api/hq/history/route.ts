import { NextRequest, NextResponse } from "next/server";
import { currentActor, accessibleFarmWhere, requireRole, HttpError } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api";

export const dynamic = "force-dynamic";

export type HistoryKind =
  | "task_due"
  | "task_completed"
  | "incident"
  | "harvest"
  | "monitoring"
  | "attendance"
  | "muster"
  | "audit";

export interface HistoryItem {
  date: string;
  kind: HistoryKind;
  title: string;
  actor: string | null;
  farmId: string;
  status: string | null;
  links: { taskId?: string; incidentId?: string; harvestId?: string; monitoringId?: string; attendanceId?: string; musterId?: string; auditId?: string };
}

const ALL_KINDS: HistoryKind[] = ["task_due", "task_completed", "incident", "harvest", "monitoring", "attendance", "muster", "audit"];
const MAX_SPAN_DAYS = 93;
const DEFAULT_SPAN_DAYS = 31;
const MAX_LIMIT = 100;
const DEFAULT_LIMIT = 40;
// Bounded fan-out: every source query is range-filtered and capped. The merge
// is in-memory over at most 8 * PER_SOURCE_TAKE slim rows — never fetch-all.
const PER_SOURCE_TAKE = 150;

function parseDay(value: string | null, label: string): Date | null {
  if (!value) return null;
  const d = new Date(`${value}T00:00:00.000Z`);
  if (isNaN(d.getTime())) throw new HttpError(422, `${label} must be YYYY-MM-DD.`);
  return d;
}

function endOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59, 999));
}

function decodeCursor(raw: string | null): { date: string; id: string } | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as { date?: string; id?: string };
    if (typeof parsed.date === "string" && typeof parsed.id === "string") return { date: parsed.date, id: parsed.id };
    return null;
  } catch {
    throw new HttpError(422, "Invalid cursor.");
  }
}

function encodeCursor(date: string, id: string): string {
  return Buffer.from(JSON.stringify({ date, id })).toString("base64url");
}

/**
 * Per-farm history engine (read-model). Merges tasks / incidents / harvests /
 * monitoring / attendance / musters / audit into one chronological feed.
 * Immutable: every source is read-only here, nothing is ever written.
 */
export async function GET(request: NextRequest) {
  try {
    // HQ platform surface: SUPER_ADMIN + AGRONOMIST (same gate as hq/map).
    // Farm-scoped roles keep their per-farm owner calendar instead.
    const actor = await currentActor();
    requireRole(actor.role, ["AGRONOMIST"]);
    const sp = request.nextUrl.searchParams;

    const farmId = sp.get("farmId")?.trim() || null;
    if (!farmId) throw new HttpError(422, "A selected farm is required for history.");

    const farmWhere = await accessibleFarmWhere();
    const accessible = await prisma.farm.findMany({ where: farmWhere, select: { id: true } });
    if (!accessible.some((f) => f.id === farmId)) throw new HttpError(403, "You do not have access to this farm.");

    const now = new Date();
    const defaultTo = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const defaultFrom = new Date(defaultTo);
    defaultFrom.setUTCDate(defaultFrom.getUTCDate() - (DEFAULT_SPAN_DAYS - 1));

    const fromDay = parseDay(sp.get("from"), "from") ?? defaultFrom;
    const toDay = parseDay(sp.get("to"), "to") ?? defaultTo;
    if (fromDay > toDay) throw new HttpError(422, "from must not be after to.");
    const spanDays = Math.floor((toDay.getTime() - fromDay.getTime()) / 86_400_000) + 1;
    if (spanDays > MAX_SPAN_DAYS) throw new HttpError(422, `History range is capped at ${MAX_SPAN_DAYS} days.`);

    const from = new Date(Date.UTC(fromDay.getUTCFullYear(), fromDay.getUTCMonth(), fromDay.getUTCDate()));
    const to = endOfDayUTC(toDay);

    const kindsParam = sp.get("kinds")?.split(",").map((k) => k.trim()).filter(Boolean) ?? [];
    const kinds = new Set<HistoryKind>(kindsParam.length ? (kindsParam.filter((k) => (ALL_KINDS as string[]).includes(k)) as HistoryKind[]) : ALL_KINDS);
    if (kindsParam.length && kinds.size === 0) throw new HttpError(422, "Unknown history kinds requested.");

    const rawLimit = sp.get("limit");
    const limit = rawLimit == null ? DEFAULT_LIMIT : Number(rawLimit);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw new HttpError(422, `limit must be an integer between 1 and ${MAX_LIMIT}.`);
    const cursor = decodeCursor(sp.get("cursor"));

    const wantTaskDue = kinds.has("task_due");
    const wantTaskDone = kinds.has("task_completed");

    const [tasks, incidents, harvests, monitoring, attendance, musters, audits] = await Promise.all([
      kinds.has("task_due") || kinds.has("task_completed")
        ? prisma.task.findMany({
            where: { farmId, dueDate: { gte: from, lte: to } },
            select: {
              id: true, title: true, category: true, status: true, dueDate: true,
              assignedOfficer: { select: { name: true } },
              executions: { select: { status: true, completedAt: true, officer: { select: { name: true } } } },
            },
            orderBy: { dueDate: "desc" },
            take: PER_SOURCE_TAKE,
          })
        : Promise.resolve([]),
      kinds.has("incident")
        ? prisma.incident.findMany({
            where: { farmId, createdAt: { gte: from, lte: to } },
            select: { id: true, type: true, severity: true, status: true, createdAt: true, reporter: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: PER_SOURCE_TAKE,
          })
        : Promise.resolve([]),
      kinds.has("harvest")
        ? prisma.harvestLog.findMany({
            where: { farmId, harvestDate: { gte: from, lte: to } },
            select: { id: true, quantity: true, unit: true, grade: true, harvestDate: true, createdBy: { select: { name: true } } },
            orderBy: { harvestDate: "desc" },
            take: PER_SOURCE_TAKE,
          })
        : Promise.resolve([]),
      kinds.has("monitoring")
        ? prisma.cropMonitoring.findMany({
            where: { farmId, createdAt: { gte: from, lte: to } },
            select: { id: true, status: true, stage: true, createdAt: true, officer: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: PER_SOURCE_TAKE,
          })
        : Promise.resolve([]),
      kinds.has("attendance")
        ? prisma.attendance.findMany({
            where: { farmId, attendanceDate: { gte: from, lte: to } },
            select: { id: true, attendanceDate: true, status: true, user: { select: { name: true } } },
            orderBy: { attendanceDate: "desc" },
            take: PER_SOURCE_TAKE,
          })
        : Promise.resolve([]),
      kinds.has("muster")
        ? prisma.dailyCrewMuster.findMany({
            where: { farmId, musterDate: { gte: from, lte: to } },
            select: { id: true, musterDate: true, totalLabourers: true, recordedBy: { select: { name: true } } },
            orderBy: { musterDate: "desc" },
            take: PER_SOURCE_TAKE,
          })
        : Promise.resolve([]),
      kinds.has("audit")
        ? prisma.auditLog.findMany({
            where: { AND: [{ createdAt: { gte: from, lte: to } }, { metadata: { path: "$.farmId", equals: farmId } }] },
            select: { id: true, action: true, entityType: true, createdAt: true, actor: { select: { name: true } } },
            orderBy: { createdAt: "desc" },
            take: PER_SOURCE_TAKE,
          })
        : Promise.resolve([]),
    ]);

    const items: HistoryItem[] = [];
    for (const t of tasks) {
      if (wantTaskDue) {
        items.push({
          date: t.dueDate.toISOString(), kind: "task_due", title: `Task due: ${t.title} (${t.category})`,
          actor: t.assignedOfficer?.name ?? null, farmId, status: t.status, links: { taskId: t.id },
        });
      }
      if (wantTaskDone) {
        for (const e of t.executions) {
          if (e.completedAt && e.completedAt >= from && e.completedAt <= to) {
            items.push({
              date: e.completedAt.toISOString(), kind: "task_completed", title: `Task completed: ${t.title}`,
              actor: e.officer?.name ?? t.assignedOfficer?.name ?? null, farmId, status: e.status, links: { taskId: t.id },
            });
          }
        }
      }
    }
    for (const i of incidents) {
      items.push({
        date: i.createdAt.toISOString(), kind: "incident", title: `Incident: ${i.type}${i.severity ? ` (${i.severity})` : ""}`,
        actor: i.reporter?.name ?? null, farmId, status: i.status, links: { incidentId: i.id },
      });
    }
    for (const h of harvests) {
      items.push({
        date: h.harvestDate.toISOString(), kind: "harvest", title: `Harvest: ${Number(h.quantity)} ${h.unit} (Grade ${h.grade})`,
        actor: h.createdBy?.name ?? null, farmId, status: null, links: { harvestId: h.id },
      });
    }
    for (const m of monitoring) {
      items.push({
        date: m.createdAt.toISOString(), kind: "monitoring", title: `Crop check: ${m.stage} — ${m.status}`,
        actor: m.officer?.name ?? null, farmId, status: m.status, links: { monitoringId: m.id },
      });
    }
    for (const a of attendance) {
      items.push({
        date: a.attendanceDate.toISOString(), kind: "attendance",
        title: `Attendance: ${a.user?.name ?? "Officer"} — ${a.status.replace(/_/g, " ")}`,
        actor: a.user?.name ?? null, farmId, status: a.status, links: { attendanceId: a.id },
      });
    }
    for (const m of musters) {
      items.push({
        date: m.musterDate.toISOString(), kind: "muster", title: `Crew muster: ${m.totalLabourers} labourers`,
        actor: m.recordedBy?.name ?? null, farmId, status: null, links: { musterId: m.id },
      });
    }
    for (const a of audits) {
      items.push({
        date: a.createdAt.toISOString(), kind: "audit", title: `Record update: ${a.action} (${a.entityType})`,
        actor: a.actor?.name ?? null, farmId, status: null, links: { auditId: a.id },
      });
    }

    items.sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0));

    // Cursor pagination over the merged feed (newest first). The anchor is the
    // last item of the previous page; resume strictly after it. If the anchor
    // is gone (data shifted), resume at the first item older than its date.
    let start = 0;
    if (cursor) {
      const anchor = items.findIndex((it) => it.date === cursor.date && JSON.stringify(it.links) === cursor.id);
      start = anchor === -1
        ? items.findIndex((it) => it.date < cursor.date)
        : anchor + 1;
      if (start === -1) start = items.length;
    }
    const page = items.slice(start, start + limit);
    const next = page.length === limit && start + limit < items.length
      ? encodeCursor(page[page.length - 1].date, JSON.stringify(page[page.length - 1].links))
      : null;

    return NextResponse.json(
      { farmId, from: from.toISOString(), to: to.toISOString(), items: page, nextCursor: next, truncated: items.length >= 8 * PER_SOURCE_TAKE },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    return apiError(error);
  }
}
