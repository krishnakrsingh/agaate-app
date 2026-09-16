import type { Prisma, PrismaClient, GeofenceBasis } from "@prisma/client";

/**
 * attendance/infrastructure/attendanceQueries — persistence boundary for the
 * attendance lifecycle. Farm/plot/media rows are read here as fence/evidence
 * inputs (estates/media own those tables long-term); attendance + exception
 * writes are owned here. Prisma types do not escape as module API.
 */

type Db = Pick<PrismaClient, "attendance" | "attendanceException" | "farm" | "plot" | "mediaAsset">;
type Tx = Prisma.TransactionClient;

export interface FarmFence {
  id: string;
  latitude: number | string | { toString(): string };
  longitude: number | string | { toString(): string };
  geofenceRadiusMeters: number | string | { toString(): string };
  boundaryGeoJson: string | null;
}

export interface PlotFence {
  farmId: string;
  boundaryGeoJson: string | null;
  deletedAt: Date | null;
  status: string | null;
}

export interface VerifiedSelfie {
  verifiedAt: Date | null;
  createdAt: Date;
  storageKey: string;
}

/** Today's row for display (GET): latest start, any farm. */
export async function getTodayShift(db: Db, userId: string, day: Date) {
  return db.attendance.findFirst({
    where: { userId, attendanceDate: day },
    include: { farm: { select: { id: true, name: true, location: true } } },
    orderBy: { startAt: "desc" },
  });
}

/** Exact day row (START dup-guard + END-by-farm lookup), with farm for the fence. */
export async function getDayShift(db: Db, userId: string, farmId: string, day: Date) {
  return db.attendance.findUnique({
    where: { userId_farmId_attendanceDate: { userId, farmId, attendanceDate: day } },
    include: { farm: true },
  });
}

/** Latest open shift across farms (END without farmId). */
export async function findOpenShift(db: Db, userId: string, day: Date) {
  return db.attendance.findFirst({
    where: { userId, attendanceDate: day, endAt: null },
    include: { farm: true },
    orderBy: { startAt: "desc" },
  });
}

export async function getFarmFence(db: Db, farmId: string): Promise<FarmFence> {
  return db.farm.findUniqueOrThrow({ where: { id: farmId } });
}

export async function getPlotFence(db: Db, plotId: string): Promise<PlotFence | null> {
  return db.plot.findUnique({
    where: { id: plotId },
    select: { farmId: true, boundaryGeoJson: true, deletedAt: true, status: true },
  });
}

/** Farm-bound, verified selfie owned by the actor (both actions). */
export async function getVerifiedSelfie(
  db: Db,
  args: { mediaId: string; userId: string; farmId: string }
): Promise<VerifiedSelfie | null> {
  return db.mediaAsset.findFirst({
    where: {
      id: args.mediaId,
      uploadedById: args.userId,
      farmId: args.farmId,
      kind: "SELFIE",
      verifiedAt: { not: null },
    },
  });
}

/** One-time binding: a storageKey may back at most one start/end per day. */
export async function isSelfieReused(db: Db, userId: string, day: Date, storageKey: string): Promise<boolean> {
  const hit = await db.attendance.findFirst({
    where: { userId, attendanceDate: day, OR: [{ startSelfieKey: storageKey }, { endSelfieKey: storageKey }] },
    select: { id: true },
  });
  return !!hit;
}

export interface OpenShiftData {
  userId: string;
  farmId: string;
  plotId: string | null;
  day: Date;
  outside: boolean;
  basis: GeofenceBasis;
  lat: number;
  lng: number;
  selfieKey: string;
  reason: string | undefined;
  distance: number;
  now: Date;
}

/** START write: day row + conditional exception row, atomically. */
export async function openShift(tx: Tx, args: OpenShiftData) {
  const existing = await tx.attendance.findUnique({
    where: {
      userId_farmId_attendanceDate: { userId: args.userId, farmId: args.farmId, attendanceDate: args.day },
    },
  });
  if (existing) throw new Error("Day has already been started for this farm.");

  const created = await tx.attendance.create({
    data: {
      userId: args.userId,
      farmId: args.farmId,
      plotId: args.plotId,
      attendanceDate: args.day,
      status: args.outside ? "EXCEPTION_PENDING" : "OPEN",
      geofenceBasis: args.basis,
      startAt: args.now,
      startLatitude: args.lat,
      startLongitude: args.lng,
      startSelfieKey: args.selfieKey,
      exceptionReason: args.reason,
    },
  });
  if (args.outside) {
    await tx.attendanceException.create({
      data: { attendanceId: created.id, distanceMeters: args.distance, reason: args.reason! },
    });
  }
  return created;
}

export interface CloseShiftData {
  rowId: string;
  endStatus: "EXCEPTION_PENDING" | "COMPLETED" | "OPEN" | "EXCEPTION_APPROVED" | "EXCEPTION_REJECTED";
  endLat: number;
  endLng: number;
  endSelfieKey: string | null;
  existingEndSelfieKey: string | null;
  basis: GeofenceBasis;
  outside: boolean;
  distance: number;
  reason: string | undefined;
  now: Date;
}

/** END write: close row + conditional exception upsert, atomically. */
export async function closeShift(tx: Tx, args: CloseShiftData) {
  return tx.attendance.update({
    where: { id: args.rowId },
    data: {
      endAt: args.now,
      endLatitude: args.endLat,
      endLongitude: args.endLng,
      endSelfieKey: args.endSelfieKey ?? args.existingEndSelfieKey,
      status: args.endStatus,
      geofenceBasis: args.basis,
      exception: args.outside
        ? {
            upsert: {
              create: { distanceMeters: args.distance, reason: args.reason ?? "Outside geofence clock-out" },
              update: { distanceMeters: args.distance, reason: args.reason ?? "Outside geofence clock-out" },
            },
          }
        : undefined,
    },
  });
}
