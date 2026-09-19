/**
 * modules/plots/infrastructure/plotQueries — database queries for plots.
 *
 * Direct Prisma access is sealed inside this layer.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import type { PlotListFilters, PlotCreateInput, PlotPatchInput } from "../schemas/plot";
import { commitBoundary } from "@modules/spatial";
import { assertPlotAreaWithinRemaining } from "../domain/plotPolicy";

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
      { name: { contains: search, mode: "insensitive" } },
      { soilType: { contains: search, mode: "insensitive" } },
      { farm: { name: { contains: search, mode: "insensitive" } } },
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
    cycles: p.cropCycles.map((c) => ({ id: c.id, cropName: c.cropName })),
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

export async function findFarmForPlotCreation(db: Db, farmId: string) {
  return db.farm.findUniqueOrThrow({
    where: { id: farmId },
    select: { cultivableArea: true, boundaryGeoJson: true },
  });
}

export async function createPlotWithBoundaryTransaction(
  prismaClient: PrismaClient,
  args: {
    farmId: string;
    input: PlotCreateInput;
    finalArea: number;
    boundary: { geoJson: string; acres: number } | null;
    actor: { id: string; name?: string | null };
  }
) {
  const { farmId, input, finalArea, boundary, actor } = args;

  const createData = (area: number) => ({
    farmId,
    name: input.name,
    area,
    latitude: input.latitude,
    longitude: input.longitude,
    soilType: input.soilType,
    boundaryGeoJson: boundary?.geoJson ?? null,
    measuredAcres: boundary ? boundary.acres : null,
    status: "SETUP" as const,
    irrigation: { create: input.irrigation },
  });

  const { result: plot } = await prismaClient.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT id FROM "Farm" WHERE id = $1 FOR UPDATE', farmId);
    const farm = await tx.farm.findUniqueOrThrow({
      where: { id: farmId },
      select: { cultivableArea: true },
    });
    const allocated = await tx.plot.aggregate({
      where: { farmId, deletedAt: null },
      _sum: { area: true },
    });
    const totalAllocated = Number(allocated._sum.area ?? 0) + finalArea;
    assertPlotAreaWithinRemaining(totalAllocated, Number(farm.cultivableArea));

    if (!boundary) {
      return {
        result: await tx.plot.create({
          data: createData(finalArea),
          include: { irrigation: true },
        }),
      };
    }

    return commitBoundary(
      tx,
      { type: "PLOT" },
      { geoJson: boundary.geoJson, acres: boundary.acres },
      { source: "MANUAL_DRAW", actorId: actor.id, actorName: actor.name ?? undefined },
      async (t) => t.plot.create({ data: createData(finalArea), include: { irrigation: true } })
    );
  });

  return plot;
}

export async function findPlotForPatch(db: Db, plotId: string) {
  return db.plot.findUnique({
    where: { id: plotId },
    include: {
      farm: {
        select: {
          totalArea: true,
          cultivableArea: true,
          boundaryGeoJson: true,
        },
      },
    },
  });
}

export async function countPlotLiveCycles(db: Db, plotId: string) {
  const prismaDb = db as unknown as PrismaClient;
  return prismaDb.cropCycle.count({
    where: { plotId, status: { in: ["PLANNED", "ACTIVE"] } },
  });
}

export async function updatePlotWithBoundaryTransaction(
  prismaClient: PrismaClient,
  args: {
    plotId: string;
    existing: {
      farmId: string;
      farm: { cultivableArea: number | Prisma.Decimal };
    };
    input: PlotPatchInput;
    area: number;
    geoJson: string | null;
    measured: number | null;
    actor: { id: string; name?: string | null };
  }
) {
  const { plotId, existing, input, area, geoJson, measured, actor } = args;

  return prismaClient.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT id FROM "Farm" WHERE id = $1 FOR UPDATE', existing.farmId);
    const fresh = await tx.plot.aggregate({
      where: { farmId: existing.farmId, deletedAt: null, id: { not: plotId } },
      _sum: { area: true },
    });
    const totalAllocated = Number(fresh._sum.area ?? 0) + area;
    assertPlotAreaWithinRemaining(totalAllocated, Number(existing.farm.cultivableArea));

    if (input.irrigation) {
      const prismaTx = tx as unknown as PrismaClient;
      await prismaTx.irrigationConfiguration.deleteMany({ where: { plotId } });
      await prismaTx.irrigationConfiguration.createMany({
        data: input.irrigation.map((v) => ({ plotId, ...v })),
      });
    }

    const { irrigation, boundary: _boundary, boundaryGeoJson: _bg, ...rest } = input;
    const updateData = { ...rest, area, boundaryGeoJson: geoJson, measuredAcres: measured };

    if (input.boundary === undefined && input.boundaryGeoJson === undefined) {
      return tx.plot.update({ where: { id: plotId }, data: updateData, include: { irrigation: true } });
    }

    const { result } = await commitBoundary(
      tx,
      { type: "PLOT", id: plotId },
      { geoJson, acres: measured },
      { source: "MANUAL_DRAW", actorId: actor.id, actorName: actor.name ?? undefined },
      async (t) => t.plot.update({ where: { id: plotId }, data: updateData, include: { irrigation: true } })
    );

    return result;
  });
}

export async function archivePlotRecord(db: Db, plotId: string) {
  return db.plot.update({
    where: { id: plotId },
    data: { status: "ARCHIVED", deletedAt: new Date() },
  });
}
