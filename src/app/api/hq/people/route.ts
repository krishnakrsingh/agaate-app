import { NextRequest } from "next/server";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, paginatedJson, paginationParams, parseSort } from "@/lib/api";

const ROLES = ["SUPER_ADMIN", "FARM_ADMIN", "AGRONOMIST", "FARM_OFFICER"] as const;

// GET /api/hq/people — lakh-scale user directory.
// Array body + X-Total-Count header (see paginatedJson). Never fetch-all:
// every filter runs in the DB where-clause, one page (max 200) per request.
export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const sp = request.nextUrl.searchParams;
    const { limit, offset } = paginationParams(sp);
    const search = sp.get("search")?.trim();
    const roleParam = sp.get("role")?.trim();
    const clientIdParam = sp.get("clientId")?.trim();
    const activeParam = sp.get("active")?.trim();
    const { sortBy, order } = parseSort(sp, ["name", "createdAt", "updatedAt"], "createdAt");

    const where: any = {};
    if (roleParam && (ROLES as readonly string[]).includes(roleParam)) {
      where.role = roleParam;
    }
    if (clientIdParam) {
      where.clientId = clientIdParam;
    }
    if (activeParam === "true") where.active = true;
    else if (activeParam === "false") where.active = false;

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { id: { contains: search } },
            { name: { contains: search } },
            { email: { contains: search } },
            { phone: { contains: search } },
            { client: { name: { contains: search } } },
          ],
        },
      ];
    }

    const [total, users] = await Promise.all([
      prisma.user.count({ where }),
      prisma.user.findMany({
        where,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          role: true,
          active: true,
          clientId: true,
          client: { select: { id: true, name: true, code: true } },
          createdAt: true,
          updatedAt: true,
          farmAccess: {
            select: {
              farmId: true,
              canManage: true,
              farm: {
                select: {
                  id: true,
                  name: true,
                  client: { select: { id: true, name: true } },
                },
              },
            },
          },
        },
        orderBy: { [sortBy]: order },
        take: limit,
        skip: offset,
      }),
    ]);

    // Last-active signals, batched (2 indexed group-bys for the whole page,
    // never N+1). Console activity via audit log, field activity via muster.
    const ids = users.map((u) => u.id);
    const [consoleActivity, fieldActivity] = ids.length
      ? await Promise.all([
          prisma.auditLog.groupBy({
            by: ["actorId"],
            where: { actorId: { in: ids } },
            _max: { createdAt: true },
          }),
          prisma.attendance.groupBy({
            by: ["userId"],
            where: { userId: { in: ids } },
            _max: { attendanceDate: true },
          }),
        ])
      : [[], []];

    const lastConsole = new Map(
      consoleActivity.map((a) => [a.actorId, a._max.createdAt?.getTime() ?? 0])
    );
    const lastField = new Map(
      fieldActivity.map((a) => [a.userId, a._max.attendanceDate?.getTime() ?? 0])
    );

    const rows = users.map((u) => {
      const consoleTs = lastConsole.get(u.id) ?? 0;
      const fieldTs = lastField.get(u.id) ?? 0;
      const accountTs = u.updatedAt.getTime();
      const best = Math.max(consoleTs, fieldTs, accountTs);
      return {
        ...u,
        farmCount: u.farmAccess.length,
        createdAt: u.createdAt.toISOString(),
        updatedAt: u.updatedAt.toISOString(),
        lastActive: new Date(best).toISOString(),
        lastActiveSource:
          best === fieldTs && fieldTs > 0
            ? "field"
            : best === consoleTs && consoleTs > 0
              ? "console"
              : "account",
      };
    });

    return paginatedJson(rows, total);
  } catch (error) {
    return apiError(error);
  }
}
