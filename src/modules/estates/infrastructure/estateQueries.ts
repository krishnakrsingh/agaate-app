/**
 * modules/estates/infrastructure/estateQueries — database queries for estates.
 *
 * Direct Prisma access is sealed inside this layer.
 */

import type { Prisma, PrismaClient } from "@prisma/client";
import type { EstateCreateInput, EstateListFilters } from "../schemas/estate";
import { commitBoundary, DEFAULT_GEOFENCE_RADIUS_METERS } from "@modules/spatial";
import { assertCultivableNotBelowAllocated } from "../domain/estatePolicy";

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
    where.district = { contains: filters.district, mode: "insensitive" };
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
          { id: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
          { location: { contains: search, mode: "insensitive" } },
          { village: { contains: search, mode: "insensitive" } },
          { taluk: { contains: search, mode: "insensitive" } },
          { district: { contains: search, mode: "insensitive" } },
          { state: { contains: search, mode: "insensitive" } },
          { pincode: { contains: search, mode: "insensitive" } },
          { ownerName: { contains: search, mode: "insensitive" } },
          { surveyNumber: { contains: search, mode: "insensitive" } },
          { client: { name: { contains: search, mode: "insensitive" } } },
          { client: { code: { contains: search, mode: "insensitive" } } },
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
      localConnect: input.localConnect || null,
      surveyNumber: input.surveyNumber || null,
      village: input.village || null,
      city: input.city || null,
      taluk: input.taluk || null,
      district: input.district || null,
      state: input.state || null,
      pincode: input.pincode || null,
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

export async function findEstateForPatch(db: Db, estateId: string) {
  return db.farm.findUniqueOrThrow({
    where: { id: estateId },
    select: { status: true, totalArea: true, cultivableArea: true },
  });
}

export async function countEstateActivePlots(db: Db, estateId: string) {
  return db.plot.count({ where: { farmId: estateId, deletedAt: null } });
}

export type BoundaryIntent =
  | { kind: "keep" }
  | { kind: "set"; geoJson: string; acres: number }
  | { kind: "clear" };

export async function updateEstateWithBoundaryTransaction(
  prismaClient: PrismaClient,
  args: {
    estateId: string;
    updateData: Record<string, unknown>;
    boundaryIntent: BoundaryIntent;
    cultivableArea: number;
    actor: { id: string; name?: string | null };
  }
) {
  const { estateId, updateData, boundaryIntent, cultivableArea, actor } = args;

  const { result: farm } = await prismaClient.$transaction(async (tx) => {
    await tx.$queryRawUnsafe('SELECT id FROM "Farm" WHERE id = $1 FOR UPDATE', estateId);
    const allocated = await tx.plot.aggregate({
      where: { farmId: estateId, deletedAt: null },
      _sum: { area: true },
    });
    const totalAllocated = Math.round(Number(allocated._sum.area ?? 0) * 100) / 100;
    assertCultivableNotBelowAllocated(cultivableArea, totalAllocated);

    if (boundaryIntent.kind === "keep") {
      const unchanged = await tx.farm.update({ where: { id: estateId }, data: updateData });
      return { result: unchanged };
    }

    const b =
      boundaryIntent.kind === "set"
        ? { geoJson: boundaryIntent.geoJson, acres: boundaryIntent.acres }
        : { geoJson: null, acres: null };

    return commitBoundary(
      tx,
      { type: "FARM", id: estateId },
      b,
      { source: "MANUAL_DRAW", actorId: actor.id, actorName: actor.name ?? undefined },
      async (t) =>
        t.farm.update({
          where: { id: estateId },
          data: { ...updateData, boundaryGeoJson: b.geoJson, measuredAcres: b.acres },
        })
    );
  });

  return farm;
}

export async function findEstateForActivation(db: Db, estateId: string) {
  const prismaDb = db as unknown as PrismaClient;
  return prismaDb.farm.findUniqueOrThrow({
    where: { id: estateId },
    include: {
      plots: {
        where: { deletedAt: null, status: { not: "ARCHIVED" } },
        include: {
          cropCycles: {
            where: { status: { in: ["PLANNED", "ACTIVE"] } },
            include: { milestones: true },
          },
        },
      },
    },
  });
}

export async function activateEstateTransaction(prismaClient: PrismaClient, estateId: string) {
  return prismaClient.$transaction(async (tx) => {
    const active = await tx.farm.update({
      where: { id: estateId },
      data: { status: "ACTIVE" },
    });

    await tx.plot.updateMany({
      where: { farmId: estateId, status: "SETUP", deletedAt: null },
      data: { status: "ACTIVE" },
    });

    await tx.cropCycle.updateMany({
      where: { plot: { farmId: estateId }, status: "PLANNED" },
      data: { status: "ACTIVE" },
    });

    return active;
  });
}

export async function findEstateAccessList(db: Db, estateId: string) {
  const prismaDb = db as unknown as PrismaClient;
  const [access, users] = await Promise.all([
    prismaDb.farmAccess.findMany({
      where: { farmId: estateId },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true, active: true },
        },
      },
    }),
    prismaDb.user.findMany({
      where: { role: "FARM_OFFICER", active: true },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        farmAccess: { select: { farmId: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  // A Farm Officer can only be assigned to 1 farm. Only show officers not bound to other farms.
  const availableUsers = users
    .filter((u) => u.farmAccess.length === 0 || u.farmAccess.some((fa) => fa.farmId === estateId))
    .map(({ farmAccess: _, ...rest }) => rest);

  return { access, users: availableUsers };
}

export async function findUserForOfficerAssignment(db: Db, userId: string) {
  const prismaDb = db as unknown as PrismaClient;
  return prismaDb.user.findUniqueOrThrow({
    where: { id: userId },
    select: { role: true, active: true },
  });
}

export async function assignEstateOfficerTransaction(
  prismaClient: PrismaClient,
  args: { estateId: string; userId: string; canManage?: boolean }
) {
  const { estateId, userId, canManage = false } = args;
  return prismaClient.$transaction(async (tx) => {
    // 1 Farm Officer = Exactly 1 Farm:
    // Remove any previous farm access records for this officer so they belong exclusively to estateId.
    await tx.farmAccess.deleteMany({
      where: { userId, farmId: { not: estateId } },
    });

    const access = await tx.farmAccess.upsert({
      where: { userId_farmId: { userId, farmId: estateId } },
      update: { canManage },
      create: { userId, farmId: estateId, canManage },
    });

    // Mark as active Field Supervisor / Farm Officer
    await tx.user.update({
      where: { id: userId },
      data: { isSupervisor: true },
    });

    await tx.task.updateMany({
      where: { farmId: estateId, assignedOfficerId: null, origin: "SYSTEM", status: "AVAILABLE" },
      data: { assignedOfficerId: userId, status: "ASSIGNED" },
    });

    return access;
  });
}

export async function unassignEstateOfficerRecord(db: Db, estateId: string, userId: string) {
  const prismaDb = db as unknown as PrismaClient;
  return prismaDb.$transaction(async (tx) => {
    await tx.farmAccess.deleteMany({
      where: { userId, farmId: estateId },
    });

    const remaining = await tx.farmAccess.count({ where: { userId } });
    if (remaining === 0) {
      await tx.user.update({
        where: { id: userId },
        data: { isSupervisor: false },
      });
    }
  });
}

const TASK_PIN_STATUSES = ["DRAFT", "ASSIGNED", "AVAILABLE", "IN_PROGRESS", "COMPLETED", "CANCELLED", "BLOCKED"] as const;

export async function findEstateTaskPinsData(
  db: Db,
  estateId: string,
  statusParam?: string | null
) {
  const prismaDb = db as unknown as PrismaClient;
  const farm = await prismaDb.farm.findUniqueOrThrow({
    where: { id: estateId },
    select: { id: true, name: true, boundaryGeoJson: true, latitude: true, longitude: true },
  });

  const tasks = await prismaDb.task.findMany({
    where: {
      farmId: estateId,
      plotId: { not: null },
      ...(statusParam && statusParam !== "ALL" && (TASK_PIN_STATUSES as readonly string[]).includes(statusParam)
        ? { status: statusParam as (typeof TASK_PIN_STATUSES)[number] }
        : { status: { notIn: ["COMPLETED", "CANCELLED"] as const } }),
    },
    select: {
      id: true,
      title: true,
      status: true,
      priority: true,
      dueDate: true,
      plot: { select: { id: true, name: true, boundaryGeoJson: true, latitude: true, longitude: true } },
      assignedOfficer: { select: { name: true } },
    },
    orderBy: { dueDate: "asc" },
    take: 200,
  });

  return { farm, tasks };
}
