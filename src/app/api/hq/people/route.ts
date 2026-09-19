import { NextRequest } from "next/server";
import { currentActor, requirePermission } from "@modules/auth";
import { prisma } from "@infrastructure/db";
import { apiError, paginatedJson, paginationParams, parseSort } from "@infrastructure/http";

// GET /api/hq/people — internal Agaate team directory (HQ-tier role definitions).
export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requirePermission(actor, "internal_team:manage");

    const sp = request.nextUrl.searchParams;
    const { limit, offset } = paginationParams(sp);
    const search = sp.get("search")?.trim();
    const roleDefId = sp.get("roleDefinitionId")?.trim();
    const activeParam = sp.get("active")?.trim();
    const { sortBy, order } = parseSort(sp, ["name", "createdAt", "updatedAt"], "createdAt");

    const where: any = {
      roleDefinition: { tier: "hq" },
    };

    if (roleDefId) where.roleDefinitionId = roleDefId;
    if (activeParam === "true") where.active = true;
    else if (activeParam === "false") where.active = false;

    if (search) {
      where.AND = [
        ...(where.AND || []),
        {
          OR: [
            { id: { contains: search, mode: "insensitive" } },
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
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
          roleDefinitionId: true,
          roleDefinition: {
            select: {
              id: true,
              slug: true,
              label: true,
              tier: true,
              scope: true,
              isSystem: true,
            },
          },
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
