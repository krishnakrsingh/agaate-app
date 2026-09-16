/**
 * modules/estates/infrastructure/estateQueries — database queries for estates.
 *
 * Direct Prisma access is sealed inside this layer.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import type { EstateCreateInput, EstateListFilters } from "../schemas/estate";
import { DEFAULT_GEOFENCE_RADIUS_METERS } from "@/lib/business";

type Db = Pick<PrismaClient, "farm" | "plot" | "auditLog">;

export interface EstateListRow {
  id: string;
  name: string;
  ownerName: string;
  location: string;
  address: string | null;
  latitude: number | Prisma.Decimal;
  longitude: number | Prisma.Decimal;
  totalArea: number | Prisma.Decimal;
  cultivableArea: number | Prisma.Decimal;
  waterSource: string;
  status: string;
  setupStage: string | null;
  setupProgress: number | null;
  boundaryGeoJson: string | null;
  measuredAcres: number | Prisma.Decimal | null;
  createdAt: Date;
  updatedAt: Date;
  client?: { id: string; name: string; code: string | null } | null;
  _count?: { plots: number; access: number };
  plots?: Array<{
    id: string;
    name: string;
    area: number | Prisma.Decimal;
    measuredAcres: number | Prisma.Decimal | null;
    boundaryGeoJson: string | null;
    status: string;
    cropCycles: Array<{ id: string }>;
  }>;
}

export function buildEstateWhere(
  accessibleWhere: Prisma.FarmWhereInput,
  filters: EstateListFilters
): Prisma.FarmWhereInput {
  const where: Prisma.FarmWhereInput = {
    ...accessibleWhere,
  };

  if (filters.clientId) {
    where.clientId = filters.clientId;
  }

  if (filters.status && filters.status !== "ALL") {
    where.status = filters.status as any;
  }
  if (filters.setupStage && filters.setupStage !== "ALL") {
    where.setupStage = filters.setupStage as any;
  }
  if (filters.state && filters.state !== "ALL") {
    where.state = filters.state;
  }
  if (filters.district) {
    where.district = { contains: filters.district };
  }
  if (filters.hasBoundary === "YES") {
    where.boundaryGeoJson = { not: null };
  } else if (filters.hasBoundary === "NO") {
    where.boundaryGeoJson = null;
  }
  if (filters.stalledOnly) {
    const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    where.status = "SETUP";
    where.updatedAt = { lte: cutoff };
  }

  if (filters.search) {
    const search = filters.search;
    where.AND = [
      ...(Array.isArray(where.AND) ? where.AND : where.AND ? [where.AND] : []),
      {
        OR: [
          { id: { contains: search } },
          { name: { contains: search } },
          { location: { contains: search } },
          { village: { contains: search } },
          { taluk: { contains: search } },
          { district: { contains: search } },
          { state: { contains: search } },
          { pincode: { contains: search } },
          { ownerName: { contains: search } },
          { surveyNumber: { contains: search } },
          { client: { name: { contains: search } } },
          { client: { code: { contains: search } } },
        ],
      },
    ];
  }

  return where;
}

export async function findEstatesPage(
  db: Db,
  args: {
    accessibleWhere: Prisma.FarmWhereInput;
    filters: EstateListFilters;
    limit: number;
    offset: number;
    sortBy: string;
    order: "asc" | "desc";
  }
): Promise<{ estates: EstateListRow[]; total: number }> {
  const where = buildEstateWhere(args.accessibleWhere, args.filters);

  const [estates, total] = await Promise.all([
    db.farm.findMany({
      where,
      include: {
        client: {
          select: { id: true, name: true, code: true },
        },
        _count: {
          select: { plots: true, access: true },
        },
        plots: {
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            area: true,
            measuredAcres: true,
            boundaryGeoJson: true,
            status: true,
            cropCycles: {
              where: { status: { in: ["PLANNED", "ACTIVE"] } },
              select: { id: true },
            },
          },
        },
      },
      orderBy: { [args.sortBy]: args.order },
      take: args.limit,
      skip: args.offset,
    }) as unknown as Promise<EstateListRow[]>,
    db.farm.count({ where }),
  ]);

  return { estates, total };
}

export async function findEstateDetail(db: Db, estateId: string) {
  return db.farm.findUniqueOrThrow({
    where: { id: estateId },
    include: {
      access: {
        include: {
          user: { select: { id: true, name: true, role: true } },
        },
      },
      plots: {
        where: { deletedAt: null },
        include: {
          irrigation: true,
          cropCycles: { include: { varieties: true, milestones: true } },
        },
      },
    },
  });
}

export async function findEstateCommandCenterData(db: Db, estateId: string) {
  const prismaDb = db as unknown as PrismaClient;
  const [farm, plotsTotal, incidentsTotal] = await Promise.all([
    prismaDb.farm.findUniqueOrThrow({
      where: { id: estateId },
      include: {
        monitoring: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        incidents: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            media: { take: 1 },
            reporter: { select: { name: true } },
          },
        },
        plots: {
          where: { deletedAt: null },
          orderBy: { name: "asc" },
          take: 200,
          include: {
            irrigation: true,
            cropCycles: {
              include: {
                varieties: true,
                milestones: true,
              },
            },
          },
        },
        access: {
          include: {
            user: { select: { id: true, name: true, email: true, role: true } },
          },
        },
        client: {
          select: { id: true, name: true, code: true, phone: true },
        },
      },
    }),
    prismaDb.plot.count({
      where: { farmId: estateId, deletedAt: null },
    }),
    prismaDb.incident.count({ where: { farmId: estateId } }),
  ]);

  return { farm, plotsTotal, incidentsTotal };
}

export async function createEstateRecord(
  db: Db,
  args: {
    input: EstateCreateInput;
    actorId: string;
    canManage: boolean;
    targetClientId: string | null;
  }
) {
  const { input, actorId, canManage, targetClientId } = args;
  return db.farm.create({
    data: {
      name: input.name,
      ownerName: input.ownerName,
      location: input.location,
      address: input.address || null,
      latitude: input.latitude,
      longitude: input.longitude,
      totalArea: input.totalArea,
      cultivableArea: input.cultivableArea,
      waterSource: input.waterSource,
      geofenceRadiusMeters: input.geofenceRadiusMeters ?? DEFAULT_GEOFENCE_RADIUS_METERS,
      clientId: targetClientId,
      setupStage: input.setupStage || "SURVEY_SOIL_TEST",
      setupProgress: input.setupStage === "HANDED_OVER" ? 100 : 10,
      status: input.setupStage === "HANDED_OVER" ? "ACTIVE" : "SETUP",
      access: {
        create: {
          userId: actorId,
          canManage,
        },
      },
    },
  });
}
