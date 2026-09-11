import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { currentActor, requireRole, HttpError } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, paginatedJson } from "@/lib/api";

const TASK_STATUSES = ["DRAFT", "ASSIGNED", "AVAILABLE", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"];
const SORTS = ["due", "priority", "recent"];
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

const asIso = (v: unknown): string => {
  const d = v instanceof Date ? v : new Date(v as string);
  return isNaN(d.getTime()) ? "" : d.toISOString();
};
const asNum = (v: unknown): number => {
  if (typeof v === "bigint") return Number(v);
  const n = Number(v as number);
  return Number.isFinite(n) ? n : 0;
};
const escapeLike = (s: string) => s.replace(/[\\%_]/g, (m) => `\\${m}`);

type LedgerDbRow = {
  id: string;
  title: string;
  farmId: string;
  plotId: string | null;
  status: string;
  priority: string;
  dueDate: Date | string;
  origin: string;
  createdAt: Date | string;
  assignedOfficerId: string | null;
  farmName: string | null;
  clientName: string | null;
  plotName: string | null;
  officerName: string | null;
};

// GET /api/hq/tasks — platform task ledger. Array body + X-Total-Count
// header (see paginatedJson). Scale contract: one COUNT plus one bounded
// page query, never fetch-all. Priority is a free-text column so urgency
// ordering uses an explicit CASE — lexicographic order would rank MEDIUM
// above HIGH.
export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const sp = request.nextUrl.searchParams;
    const rawLimit = sp.get("limit");
    const rawOffset = sp.get("offset");
    const limit = rawLimit == null ? 25 : Number(rawLimit);
    const offset = rawOffset == null ? 0 : Number(rawOffset);
    if (!Number.isInteger(limit) || limit < 1 || limit > 200) throw new HttpError(422, "limit must be an integer between 1 and 200.");
    if (!Number.isInteger(offset) || offset < 0) throw new HttpError(422, "offset must be a non-negative integer.");

    const q = (sp.get("search") ?? sp.get("q") ?? "").trim();
    const status = (sp.get("status") ?? "ALL").trim();
    const priority = (sp.get("priority") ?? "ALL").trim();
    const farmId = sp.get("farmId")?.trim() || null;
    const clientId = sp.get("clientId")?.trim() || null;
    const officerId = sp.get("officerId")?.trim() || sp.get("assignedOfficerId")?.trim() || null;
    const overdueOnly = sp.get("overdueOnly") === "true" || sp.get("overdue") === "true";
    const dateFrom = sp.get("dateFrom")?.trim() || null;
    const dateTo = sp.get("dateTo")?.trim() || null;
    const sort = (sp.get("sort") ?? "due").trim();

    if (status !== "ALL" && !TASK_STATUSES.includes(status)) throw new HttpError(422, "Unknown task status filter.");
    if (priority !== "ALL" && !PRIORITIES.includes(priority)) throw new HttpError(422, "Unknown task priority filter.");
    if (!SORTS.includes(sort)) throw new HttpError(422, "Unknown sort mode.");
    if (dateFrom && !DATE_RE.test(dateFrom)) throw new HttpError(422, "dateFrom must be YYYY-MM-DD.");
    if (dateTo && !DATE_RE.test(dateTo)) throw new HttpError(422, "dateTo must be YYYY-MM-DD.");

    const today = new Date().toISOString().slice(0, 10);
    const conds: Prisma.Sql[] = [];
    if (q) {
      const pattern = `%${escapeLike(q)}%`;
      conds.push(Prisma.sql`(\`t\`.\`title\` LIKE ${pattern} OR \`t\`.\`description\` LIKE ${pattern})`);
    }
    if (status !== "ALL") conds.push(Prisma.sql`\`t\`.\`status\` = ${status}`);
    if (priority !== "ALL") conds.push(Prisma.sql`\`t\`.\`priority\` = ${priority}`);
    if (farmId) conds.push(Prisma.sql`\`t\`.\`farmId\` = ${farmId}`);
    if (clientId) conds.push(Prisma.sql`\`f\`.\`clientId\` = ${clientId}`);
    if (officerId === "UNASSIGNED") conds.push(Prisma.sql`\`t\`.\`assignedOfficerId\` IS NULL`);
    else if (officerId) conds.push(Prisma.sql`\`t\`.\`assignedOfficerId\` = ${officerId}`);
    if (overdueOnly) conds.push(Prisma.sql`(\`t\`.\`dueDate\` < ${today} AND \`t\`.\`status\` NOT IN ('COMPLETED', 'CANCELLED'))`);
    if (dateFrom) conds.push(Prisma.sql`\`t\`.\`dueDate\` >= ${dateFrom}`);
    if (dateTo) conds.push(Prisma.sql`\`t\`.\`dueDate\` <= ${dateTo}`);

    const whereExpr = conds.length ? Prisma.join(conds, " AND ") : Prisma.sql`1 = 1`;
    const joins = Prisma.sql`LEFT JOIN \`Farm\` \`f\` ON \`f\`.\`id\` = \`t\`.\`farmId\` LEFT JOIN \`Client\` \`c\` ON \`c\`.\`id\` = \`f\`.\`clientId\` LEFT JOIN \`Plot\` \`p\` ON \`p\`.\`id\` = \`t\`.\`plotId\` LEFT JOIN \`User\` \`u\` ON \`u\`.\`id\` = \`t\`.\`assignedOfficerId\``;
    const orderBy =
      sort === "priority"
        ? Prisma.sql`CASE \`t\`.\`priority\` WHEN 'URGENT' THEN 0 WHEN 'HIGH' THEN 1 WHEN 'MEDIUM' THEN 2 WHEN 'LOW' THEN 3 ELSE 4 END, \`t\`.\`dueDate\` ASC, \`t\`.\`createdAt\` DESC`
        : sort === "recent"
          ? Prisma.sql`\`t\`.\`createdAt\` DESC`
          : Prisma.sql`\`t\`.\`dueDate\` ASC, \`t\`.\`createdAt\` DESC`;

    const [countRows, rows] = await Promise.all([
      prisma.$queryRaw<{ total: unknown }[]>(
        Prisma.sql`SELECT COUNT(*) AS \`total\` FROM \`Task\` \`t\` ${joins} WHERE ${whereExpr}`
      ),
      prisma.$queryRaw<LedgerDbRow[]>(
        Prisma.sql`SELECT \`t\`.\`id\`, \`t\`.\`title\`, \`t\`.\`farmId\`, \`t\`.\`plotId\`, \`t\`.\`status\`, \`t\`.\`priority\`, \`t\`.\`dueDate\`, \`t\`.\`origin\`, \`t\`.\`createdAt\`, \`t\`.\`assignedOfficerId\`, \`f\`.\`name\` AS \`farmName\`, \`c\`.\`name\` AS \`clientName\`, \`p\`.\`name\` AS \`plotName\`, \`u\`.\`name\` AS \`officerName\` FROM \`Task\` \`t\` ${joins} WHERE ${whereExpr} ORDER BY ${orderBy} LIMIT ${limit} OFFSET ${offset}`
      ),
    ]);
    const total = countRows.length ? asNum(countRows[0].total) : 0;

    // Who worked / is working on the page rows: one bounded lookup, not
    // per-row queries. TaskExecution is 1:1 per task (taskId unique).
    const ids = rows.map((r) => r.id);
    const execs = ids.length
      ? await prisma.taskExecution.findMany({
          where: { taskId: { in: ids } },
          select: { taskId: true, officer: { select: { name: true } } },
        })
      : [];
    const workedBy = new Map<string, string[]>();
    for (const e of execs) {
      const name = e.officer?.name;
      if (!name) continue;
      const arr = workedBy.get(e.taskId) ?? [];
      if (!arr.includes(name)) arr.push(name);
      workedBy.set(e.taskId, arr);
    }

    return paginatedJson(
      rows.map((r) => ({
        id: r.id,
        title: r.title,
        farmId: r.farmId,
        plotId: r.plotId,
        status: r.status,
        priority: r.priority,
        dueDate: asIso(r.dueDate),
        origin: r.origin,
        createdAt: asIso(r.createdAt),
        assignedOfficerId: r.assignedOfficerId,
        farmName: r.farmName,
        clientName: r.clientName,
        plotName: r.plotName,
        officerName: r.officerName,
        workedBy: workedBy.get(r.id) ?? [],
      })),
      total
    );
  } catch (error) {
    return apiError(error);
  }
}
