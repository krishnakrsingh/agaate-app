import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { currentActor, requireFarmAccess, requireRole } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, paginatedJson, paginationParams } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const actor = await currentActor();
    requireRole(actor.role, ["SUPER_ADMIN", "FARM_ADMIN"]);
    const sp = request.nextUrl.searchParams;
    const farmIdParam = sp.get("farmId");
    const farmId = farmIdParam ? z.string().min(1).parse(farmIdParam) : null;
    const action = sp.get("action")?.trim();
    const entityType = sp.get("entityType")?.trim();
    const q = sp.get("search")?.trim();
    const from = sp.get("from") || sp.get("dateFrom");
    const to = sp.get("to") || sp.get("dateTo");
    const { limit, offset } = paginationParams(sp);
    const and: any[] = [];
    if (farmId) {
      await requireFarmAccess(farmId);
      and.push({ metadata: { path: "$.farmId", equals: farmId } });
    } else if (actor.role !== "SUPER_ADMIN") {
      const farms = await prisma.farm.findMany({ where: { access: { some: { userId: actor.id } } }, select: { id: true } });
      if (!farms.length) return paginatedJson([], 0);
      and.push({ OR: farms.map((f) => ({ metadata: { path: "$.farmId", equals: f.id } })) });
    }
    if (action && action !== "ALL") and.push({ action });
    if (entityType && entityType !== "ALL") and.push({ entityType });
    if (q)
      and.push({
        OR: [
          { action: { contains: q } },
          { entityType: { contains: q } },
          { entityId: { contains: q } },
          { actor: { name: { contains: q } } },
          { actor: { email: { contains: q } } },
        ],
      });
    if (from || to) {
      const range: any = {};
      const f = from ? new Date(from) : null;
      const t = to ? new Date(to) : null;
      if (f && !isNaN(f.getTime())) range.gte = f;
      if (t && !isNaN(t.getTime())) range.lte = t;
      if (Object.keys(range).length) and.push({ createdAt: range });
    }
    const where: Record<string, unknown> = and.length ? { AND: and } : {};
    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({ where, include: { actor: { select: { name: true, email: true } } }, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      prisma.auditLog.count({ where }),
    ]);
    return paginatedJson(logs, total);
  } catch (error) {
    return apiError(error);
  }
}
