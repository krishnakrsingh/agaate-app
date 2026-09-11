import { NextRequest, NextResponse } from "next/server";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, noStore, paginationParams } from "@/lib/api";

// GET /api/hq/people/labour — labour lens: FARM_OFFICERs grouped by
// farm and by client. Answers "who works where, how many labour per client".
// Aggregates run in the DB (groupBy); only the top-100 farms page back,
// client list is naturally bounded. Never fetch-all.
export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const sp = request.nextUrl.searchParams;
    const { limit, offset } = paginationParams(sp);
    const clientIdParam = sp.get("clientId")?.trim();
    const activeParam = sp.get("active")?.trim();
    const activeOnly = activeParam !== "ALL" && activeParam !== "false";

    const officerWhere: any = { role: "FARM_OFFICER" };
    if (activeOnly) officerWhere.active = true;
    if (clientIdParam) officerWhere.clientId = clientIdParam;

    const accessWhere: any = {
      user: { ...officerWhere },
    };
    if (clientIdParam) accessWhere.farm = { clientId: clientIdParam };

    const [totalOfficers, byClientRaw, byFarmRaw, byFarmTotal] = await Promise.all([
      prisma.user.count({ where: officerWhere }),
      prisma.user.groupBy({
        by: ["clientId"],
        where: officerWhere,
        _count: { _all: true },
      }),
      prisma.farmAccess.groupBy({
        by: ["farmId"],
        where: accessWhere,
        _count: { farmId: true },
        orderBy: { _count: { farmId: "desc" } },
        take: Math.min(limit, 100),
        skip: offset,
      }),
      prisma.farmAccess.groupBy({
        by: ["farmId"],
        where: accessWhere,
        _count: { _all: true },
      }),
    ]);

    const clientIds = [...new Set(byClientRaw.map((r) => r.clientId).filter(Boolean))] as string[];
    const clients = clientIds.length
      ? await prisma.client.findMany({
          where: { id: { in: clientIds } },
          select: { id: true, name: true, code: true },
        })
      : [];
    const clientById = new Map(clients.map((c) => [c.id, c]));

    const farmIds = byFarmRaw.map((r) => r.farmId);
    const farms = farmIds.length
      ? await prisma.farm.findMany({
          where: { id: { in: farmIds } },
          select: {
            id: true,
            name: true,
            location: true,
            client: { select: { id: true, name: true, code: true } },
          },
        })
      : [];
    const farmById = new Map(farms.map((f) => [f.id, f]));

    const byClient = byClientRaw
      .map((r) => ({
        clientId: r.clientId,
        client: r.clientId ? (clientById.get(r.clientId) ?? null) : null,
        officers: r._count._all,
      }))
      .sort((a, b) => b.officers - a.officers);

    const byFarm = byFarmRaw.map((r) => ({
      farmId: r.farmId,
      farm: farmById.get(r.farmId) ?? null,
      officers: r._count.farmId,
    }));

    return NextResponse.json(
      { totalOfficers, byClient, byFarm, farmGroups: byFarmTotal.length },
      { headers: { ...noStore, "X-Total-Count": String(byFarmTotal.length) } }
    );
  } catch (error) {
    return apiError(error);
  }
}
