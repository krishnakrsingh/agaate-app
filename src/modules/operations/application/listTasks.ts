import type { Prisma } from "@prisma/client";
import { prisma } from "@/infrastructure/db";
import { parseUtcDate } from "@/shared/dates";
import { requireFarmAccess } from "@modules/auth";
import type { Actor } from "@modules/auth";
import { findTasksPage } from "../infrastructure/taskQueries";
import { presentTaskMedia } from "./presentTaskMedia";
import type { TaskListFilters } from "../schemas/taskList";

type Db = typeof prisma;

/**
 * listTasks — the ONE application use-case for task retrieval
 * (GET /api/tasks): visibility scope → filters → page query → media
 * presentation. Moved verbatim from the route: same gate, same branches,
 * same sentinels, same AND-nesting, same ordering, same envelope inputs.
 *
 * Authorization is preserved EXACTLY, including the asymmetries:
 * - `requireFarmAccess(farmId)` runs only when farmId is explicit; the
 *   bare `{farmId}` scope below is safe ONLY because that gate ran.
 * - `unrestricted` is SUPER_ADMIN/AGRONOMIST — OPERATIONS_MANAGER stays
 *   access-scoped without farmId (do NOT "fix" via accessibleFarmWhere).
 * - FARM_OFFICER sees own-assigned + AVAILABLE-unassigned within own (or
 *   explicit, gated) farms; empty access → `in: []` → zero rows, no error.
 * - Filters only narrow (AND over the scoped base); they can never expand.
 *
 * KNOWN DEFECT, preserved (not fixed — contract change needs its own
 * slice): invalid date strings produce `Invalid Date`, which reaches
 * Prisma and surfaces as 500 via apiError instead of 422. The dead
 * try/catch below documents behavior that does not exist; the reference
 * fix pattern is hq/analytics/overview.
 */
export async function listTasks(opts: {
  actor: Actor;
  filters: TaskListFilters;
  limit: number;
  offset: number;
  db?: Db;
}): Promise<{ tasks: Array<Record<string, unknown>>; total: number }> {
  const { actor, filters, limit, offset, db = prisma } = opts;
  const { farmId, day } = filters;

  if (farmId) await requireFarmAccess(farmId);

  let where: Prisma.TaskWhereInput;
  if (actor.role === "FARM_OFFICER") {
    const officerFarms = await db.farm.findMany({
      where: { access: { some: { userId: actor.id } } },
      select: { id: true },
    });
    const officerFarmIds = officerFarms.map((f) => f.id);

    where = {
      ...(farmId ? { farmId } : { farmId: { in: officerFarmIds } }),
      ...(day ? { dueDate: parseUtcDate(day) } : {}),
      OR: [{ assignedOfficerId: actor.id }, { status: "AVAILABLE", assignedOfficerId: null }],
    };
  } else {
    const unrestricted = actor.role === "SUPER_ADMIN" || actor.role === "AGRONOMIST";
    where = {
      ...(farmId
        ? { farmId }
        : unrestricted
          ? {}
          : { farm: { access: { some: { userId: actor.id } } } }),
      ...(day ? { dueDate: parseUtcDate(day) } : {}),
    };
  }

  // Server-side queue filters — previously client-side useMemo over the
  // first 100 rows (silent data loss at scale). All optional.
  const and: Prisma.TaskWhereInput[] = [];
  const { status: statusParam, priority: priorityParam, category: categoryParam, assignee: assigneeParam } = filters;
  if (statusParam && statusParam !== "ALL") {
    if (statusParam === "QUEUED") and.push({ status: { in: ["DRAFT", "ASSIGNED", "AVAILABLE"] } });
    else and.push({ status: statusParam as Prisma.EnumTaskStatusFilter["equals"] });
  }
  if (priorityParam && priorityParam !== "ALL") and.push({ priority: priorityParam });
  if (categoryParam && categoryParam !== "ALL") and.push({ category: categoryParam });
  if (assigneeParam && assigneeParam !== "ALL") {
    and.push(assigneeParam === "UNASSIGNED" ? { assignedOfficerId: null } : { assignedOfficerId: assigneeParam });
  }
  const { dateFrom, dateTo, q } = filters;
  if (dateFrom || dateTo) {
    const range: { gte?: Date; lte?: Date } = {};
    try {
      if (dateFrom) range.gte = parseUtcDate(dateFrom);
      if (dateTo) range.lte = parseUtcDate(dateTo);
    } catch {
      /* invalid date strings fall through to 422 via parseUtcDate in where */
    }
    if (Object.keys(range).length) and.push({ dueDate: range });
  }
  if (q) {
    and.push({
      OR: [{ title: { contains: q } }, { description: { contains: q } }, { farm: { name: { contains: q } } }],
    });
  }
  if (and.length) where = { AND: [where, ...and] };

  const { rows, total } = await findTasksPage(db, { where, limit, offset });

  const tasks = await Promise.all(
    rows.map(async (t) => {
      const allMedia = t.executions.flatMap((e) => e.media || []);
      const { media, primaryImageUrl } = await presentTaskMedia(allMedia);
      return { ...t, primaryImageUrl, media };
    })
  );

  return { tasks, total };
}
