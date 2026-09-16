/**
 * modules/plots/infrastructure/plotQueries — database queries for plots.
 *
 * Direct Prisma access is sealed inside this layer.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import type { PlotListFilters } from "../schemas/plot";

type Db = Pick<PrismaClient, "plot" | "farm" | "auditLog">;

export function buildPlotWhere(
  accessibleWhere: Prisma.FarmWhereInput,
  filters: PlotListFilters
): Prisma.PlotWhereInput {
  const where: Prisma.PlotWhereInput = {
    deletedAt: null,
    farm: accessibleWhere,
  };

  if (filters.farmId) {
    where.farmId = filters.farmId;
  }

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as any;
  }

  if (filters.search) {
    const search = filters.search;
    where.OR = [
      { name: { contains: search } },
      { soilType: { contains: search } },
      { farm: { name: { contains: search } } },
    ];
  }

  return where;
}

export async function findPlotsPage(
  db: Db,
  args: {
    accessibleWhere: Prisma.FarmWhereInput;
    filters: PlotListFilters;
    limit: number;
    offset: number;
  }
) {
  const where = buildPlotWhere(args.accessibleWhere, args.filters);

  const [plots, total] = await Promise.all([
    db.plot.findMany({
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
      take: args.limit,
      skip: args.offset,
    }),
    db.plot.count({ where }),
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

  return { plots: formatted, total };
}

export async function findPlotDetail(db: Db, plotId: string) {
  return db.plot.findUnique({
    where: { id: plotId },
    include: {
      farm: {
        select: { id: true, name: true, location: true, boundaryGeoJson: true, latitude: true, longitude: true },
      },
      irrigation: true,
      cropCycles: {
        include: {
          varieties: true,
          milestones: true,
        },
      },
    },
  });
}

export async function findPlotPageData(db: Db, plotId: string) {
  return db.plot.findUniqueOrThrow({
    where: { id: plotId },
    include: {
      irrigation: true,
      farm: { select: { id: true, name: true, boundaryGeoJson: true, latitude: true, longitude: true } },
    },
  });
}

export async function findOwnerLandData(db: Db, farmWhere: Prisma.FarmWhereInput) {
  const farms = await db.farm.findMany({
    where: farmWhere,
    include: {
      plots: {
        where: { deletedAt: null, status: { not: "ARCHIVED" } },
        include: {
          irrigation: true,
          cropCycles: {
            where: { status: "ACTIVE" },
            select: {
              id: true,
              cropName: true,
              varieties: { select: { name: true } },
              status: true,
              startDate: true,
              expectedFirstHarvestDate: true,
            },
          },
        },
        orderBy: { name: "asc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return farms.map((f) => ({
    id: f.id,
    name: f.name,
    cultivableArea: f.cultivableArea?.toString() ?? "0",
    totalArea: f.totalArea?.toString() ?? "0",
    latitude: f.latitude?.toString() ?? "0",
    longitude: f.longitude?.toString() ?? "0",
    boundaryGeoJson: f.boundaryGeoJson ?? null,
    plots: f.plots.map((p) => ({
      id: p.id,
      name: p.name,
      area: p.area?.toString() ?? "0",
      soilType: p.soilType,
      status: p.status,
      latitude: p.latitude?.toString() ?? "0",
      longitude: p.longitude?.toString() ?? "0",
      irrigation: p.irrigation.map((i) => ({
        id: i.id,
        type: i.type,
        details: i.details,
      })),
      cropCycles: p.cropCycles.map((c) => ({
        id: c.id,
        cropName: c.cropName,
        variety: c.varieties[0]?.name || null,
        status: c.status,
        startDate: c.startDate.toISOString(),
        endDate: c.expectedFirstHarvestDate ? c.expectedFirstHarvestDate.toISOString() : null,
      })),
    })),
  }));
}
