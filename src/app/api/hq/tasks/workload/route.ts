import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore } from "@/lib/api";

const asNum = (v: unknown): number => {
  if (typeof v === "bigint") return Number(v);
  if (v == null) return 0;
  const n = Number(v as number);
  return Number.isFinite(n) ? n : 0;
};

// GET /api/hq/tasks/workload — per-officer open/overdue counts, bounded to
// the top 50 by overdue load. One aggregate query (overdue is a subset of
// open, so a single GROUP BY covers both), plus one row for unassigned
// work. Optional farmId/clientId scope mirrors the ledger filters.
export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const sp = request.nextUrl.searchParams;
    const farmId = sp.get("farmId")?.trim() || null;
    const clientId = sp.get("clientId")?.trim() || null;
    const today = new Date().toISOString().slice(0, 10);

    const scope: Prisma.Sql[] = [];
    if (farmId) scope.push(Prisma.sql`\`t\`.\`farmId\` = ${farmId}`);
    if (clientId) scope.push(Prisma.sql`\`f\`.\`clientId\` = ${clientId}`);
    const scopeExpr = scope.length ? Prisma.sql`AND ${Prisma.join(scope, " AND ")}` : Prisma.empty;
    const joins = Prisma.sql`LEFT JOIN \`User\` \`u\` ON \`u\`.\`id\` = \`t\`.\`assignedOfficerId\` LEFT JOIN \`Farm\` \`f\` ON \`f\`.\`id\` = \`t\`.\`farmId\``;

    type WorkloadRow = { officerId: string; officerName: string | null; openCount: unknown; overdueCount: unknown };
    const [officerRows, unassignedRows] = await Promise.all([
      prisma.$queryRaw<WorkloadRow[]>(
        Prisma.sql`SELECT \`t\`.\`assignedOfficerId\` AS \`officerId\`, \`u\`.\`name\` AS \`officerName\`, COUNT(*) AS \`openCount\`, SUM(CASE WHEN \`t\`.\`dueDate\` < ${today} THEN 1 ELSE 0 END) AS \`overdueCount\` FROM \`Task\` \`t\` ${joins} WHERE \`t\`.\`assignedOfficerId\` IS NOT NULL AND \`t\`.\`status\` NOT IN ('COMPLETED', 'CANCELLED') ${scopeExpr} GROUP BY \`t\`.\`assignedOfficerId\`, \`u\`.\`name\` ORDER BY \`overdueCount\` DESC, \`openCount\` DESC LIMIT 50`
      ),
      prisma.$queryRaw<{ openCount: unknown; overdueCount: unknown }[]>(
        Prisma.sql`SELECT COUNT(*) AS \`openCount\`, SUM(CASE WHEN \`t\`.\`dueDate\` < ${today} THEN 1 ELSE 0 END) AS \`overdueCount\` FROM \`Task\` \`t\` ${joins} WHERE \`t\`.\`assignedOfficerId\` IS NULL AND \`t\`.\`status\` NOT IN ('COMPLETED', 'CANCELLED') ${scopeExpr}`
      ),
    ]);

    const unassigned = unassignedRows.length
      ? { open: asNum(unassignedRows[0].openCount), overdue: asNum(unassignedRows[0].overdueCount) }
      : { open: 0, overdue: 0 };

    return NextResponse.json(
      {
        officers: officerRows.map((r) => ({
          officerId: r.officerId,
          officerName: r.officerName,
          open: asNum(r.openCount),
          overdue: asNum(r.overdueCount),
        })),
        unassigned,
      },
      { headers: noStore }
    );
  } catch (error) {
    return apiError(error);
  }
}
