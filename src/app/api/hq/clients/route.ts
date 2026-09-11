import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError, noStore, paginationParams } from "@/lib/api";

const DIRECTORY_PAGE_SIZE = 20;
const BULK_MAX = 50;

type SortKey = "name" | "farms" | "acreage" | "recent";

function buildWhere(search?: string, status?: string, state?: string) {
  const where: any = {};
  if (status && status !== "ALL") where.status = status;
  if (state && state !== "ALL") where.state = state;
  if (search) {
    where.OR = [
      { id: { contains: search } },
      { name: { contains: search } },
      { code: { contains: search } },
      { phone: { contains: search } },
      { companyName: { contains: search } },
    ];
  }
  return where;
}

interface ClientStats {
  farmCount: number;
  plotCount: number;
  officerCount: number;
  totalAcreage: number;
}

const emptyStats = (): ClientStats => ({
  farmCount: 0,
  plotCount: 0,
  officerCount: 0,
  totalAcreage: 0,
});

// Bounded enrichment for one page of client ids: aggregate rows only,
// never full farm/plot entities.
async function enrichPage(ids: string[]): Promise<Map<string, ClientStats>> {
  const stats = new Map<string, ClientStats>(ids.map((id) => [id, emptyStats()]));
  if (ids.length === 0) return stats;

  const [farmStats, farms, officerStats] = await Promise.all([
    prisma.farm.groupBy({
      by: ["clientId"],
      where: { clientId: { in: ids } },
      _count: { _all: true },
      _sum: { totalArea: true },
    }),
    prisma.farm.findMany({
      where: { clientId: { in: ids } },
      select: { id: true, clientId: true },
    }),
    prisma.user.groupBy({
      by: ["clientId"],
      where: { clientId: { in: ids }, role: "FARM_OFFICER", active: true },
      _count: { _all: true },
    }),
  ]);

  for (const row of farmStats) {
    if (!row.clientId) continue;
    const s = stats.get(row.clientId);
    if (!s) continue;
    s.farmCount = row._count._all;
    s.totalAcreage = Number(row._sum.totalArea || 0);
  }
  for (const row of officerStats) {
    if (!row.clientId) continue;
    const s = stats.get(row.clientId);
    if (s) s.officerCount = row._count._all;
  }

  const farmIds = farms.map((f) => f.id);
  const farmToClient = new Map(farms.map((f) => [f.id, f.clientId as string]));
  if (farmIds.length > 0) {
    const plotStats = await prisma.plot.groupBy({
      by: ["farmId"],
      where: { farmId: { in: farmIds }, deletedAt: null },
      _count: { _all: true },
    });
    for (const row of plotStats) {
      const clientId = farmToClient.get(row.farmId);
      if (!clientId) continue;
      const s = stats.get(clientId);
      if (s) s.plotCount += row._count._all;
    }
  }
  return stats;
}

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);

    const sp = request.nextUrl.searchParams;
    const { offset } = paginationParams(sp);
    const limit = DIRECTORY_PAGE_SIZE;
    const search = sp.get("search")?.trim() || undefined;
    const status = sp.get("status")?.trim() || undefined;
    const state = sp.get("state")?.trim() || undefined;
    const rawSort = sp.get("sortBy")?.trim() as SortKey | null;
    const sort: SortKey =
      rawSort === "farms" || rawSort === "acreage" || rawSort === "recent" ? rawSort : "name";

    const where = buildWhere(search, status, state);
    const total = await prisma.client.count({ where });

    // Aggregate sorts (farms, acreage) are resolved from one small
    // groupBy row per client, then the requested id-page is fetched.
    if (sort === "farms" || sort === "acreage") {
      const grouped = await prisma.farm.groupBy({
        by: ["clientId"],
        where: { clientId: { not: null }, client: where },
        _count: { _all: true },
        _sum: { totalArea: true },
      });
      const byClient = new Map(
        grouped
          .filter((g) => g.clientId)
          .map((g) => [
            g.clientId as string,
            { farms: g._count._all, acres: Number(g._sum.totalArea || 0) },
          ])
      );
      const matchedIds = (await prisma.client.findMany({ where, select: { id: true } })).map(
        (c) => c.id
      );
      matchedIds.sort((a, b) => {
        const sa = byClient.get(a) || { farms: 0, acres: 0 };
        const sb = byClient.get(b) || { farms: 0, acres: 0 };
        return sort === "farms" ? sb.farms - sa.farms : sb.acres - sa.acres;
      });
      const pageIds = matchedIds.slice(offset, offset + limit);
      const [rows, stats] = await Promise.all([
        prisma.client.findMany({ where: { id: { in: pageIds } } }),
        enrichPage(pageIds),
      ]);
      const byId = new Map(rows.map((r) => [r.id, r]));
      const clients = pageIds
        .map((id) => byId.get(id))
        .filter((c): c is NonNullable<typeof c> => !!c)
        .map((c) => formatRow(c, stats.get(c.id) || emptyStats()));
      return NextResponse.json({ clients, total, limit, offset }, { headers: noStore });
    }

    const orderBy = sort === "recent" ? { updatedAt: "desc" as const } : { name: "asc" as const };
    const rows = await prisma.client.findMany({
      where,
      orderBy,
      take: limit,
      skip: offset,
    });
    const stats = await enrichPage(rows.map((c) => c.id));
    const clients = rows.map((c) => formatRow(c, stats.get(c.id) || emptyStats()));
    return NextResponse.json({ clients, total, limit, offset }, { headers: noStore });
  } catch (error) {
    return apiError(error);
  }
}

function formatRow(c: any, s: ClientStats) {
  return {
    id: c.id,
    code: c.code || `CLI-${c.id.slice(-4).toUpperCase()}`,
    name: c.name,
    companyName: c.companyName,
    phone: c.phone,
    state: c.state,
    district: c.district,
    status: c.status,
    updatedAt: c.updatedAt.toISOString(),
    farmCount: s.farmCount,
    plotCount: s.plotCount,
    officerCount: s.officerCount,
    totalAcreage: s.totalAcreage,
  };
}

const bulkStatusSchema = z.object({
  ids: z.array(z.string().min(1)).min(1).max(BULK_MAX),
  status: z.enum(["ACTIVE", "INACTIVE"]),
});

export async function PATCH(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN"]);
    const input = bulkStatusSchema.parse(await request.json());

    const result = await prisma.client.updateMany({
      where: { id: { in: input.ids } },
      data: { status: input.status },
    });
    await Promise.all(
      input.ids.map((id) => audit(actor.id, "UPDATE", "Client", id, { status: input.status }))
    );
    return NextResponse.json({ updated: result.count });
  } catch (error) {
    return apiError(error);
  }
}
