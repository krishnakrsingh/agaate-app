import { NextRequest } from "next/server";
import { accessibleFarmWhere } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { apiError, paginatedJson, paginationParams } from "@/lib/api";

export async function GET(request: NextRequest) {
  try {
    const accessibleWhere = await accessibleFarmWhere();
    const sp = request.nextUrl.searchParams;
    const { limit, offset } = paginationParams(sp);
    const search = sp.get("search")?.trim();
    const farmId = sp.get("farmId")?.trim();
    const status = sp.get("status")?.trim();

    const where: any = {
      deletedAt: null,
      farm: accessibleWhere,
    };

    if (farmId) {
      where.farmId = farmId;
    }

    if (status && status !== "ALL") {
      where.status = status;
    }

    if (search) {
      where.OR = [
        { name: { contains: search } },
        { soilType: { contains: search } },
        { farm: { name: { contains: search } } },
      ];
    }

    const [plots, total] = await Promise.all([
      prisma.plot.findMany({
        where,
        include: {
          farm: {
            select: { id: true, name: true, location: true, ownerName: true },
          },
          irrigation: {
            select: { id: true, type: true },
          },
          cropCycles: {
            where: { status: { in: ["PLANNED", "ACTIVE"] } },
            select: { id: true, cropName: true, status: true },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.plot.count({ where }),
    ]);

    const formatted = plots.map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area.toString(),
      soilType: p.soilType || "Unspecified",
      status: p.status,
      farmId: p.farmId,
      farmName: p.farm.name,
      farmLocation: p.farm.location,
      irrigationTypes: p.irrigation.map((ir) => ir.type).join(", ") || "None",
      activeCrops: p.cropCycles.map((c) => c.cropName).join(", ") || "Fallow",
    }));

    return paginatedJson(formatted, total);
  } catch (error) {
    return apiError(error);
  }
}
