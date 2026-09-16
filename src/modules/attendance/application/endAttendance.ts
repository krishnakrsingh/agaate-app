import type { GeofenceBasis } from "@prisma/client";
import { prisma } from "@/infrastructure/db";
import { utcDateOnly } from "@/shared/dates";
import { audit } from "@/infrastructure/audit";
import { requireFarmAccess } from "@modules/auth";
import type { Actor } from "@modules/auth";
import { validateAttendanceLocation } from "@modules/spatial";
import { AttendanceFault, assertEndAllowed, isSelfieFresh, resolveEndStatus } from "../domain/attendancePolicy";
import {
  closeShift,
  getDayShift,
  findOpenShift,
  getFarmFence,
  getPlotFence,
  getVerifiedSelfie,
  isSelfieReused,
} from "../infrastructure/attendanceQueries";
import type { AttendanceInput } from "../schemas/attendance";

type Db = typeof prisma;

/**
 * endAttendance — clock-out use-case (POST /api/attendance action=END).
 *
 * Moved verbatim from the route: locate row (exact key w/ farmId, else
 * latest open) → state gates (before GPS, as legacy) → stored-farm gate →
 * optional selfie with silent drop → mandatory GPS → geofence on the
 * START-associated plot → reason gate → tx update (+exception upsert) →
 * audit → 200 payload. Stored row is authoritative over request fields.
 */
export async function endAttendance(opts: {
  input: AttendanceInput;
  actor: Actor;
  db?: Db;
  now?: Date;
}): Promise<{ attendance: Record<string, unknown>; distanceMeters: number; withinGeofence: boolean; geofenceBasis: string }> {
  const { input, actor, db = prisma, now = new Date() } = opts;
  const day = utcDateOnly(now);

  // Locate the active shift for today (stored row wins over request fields).
  const existing = input.farmId
    ? await getDayShift(db, actor.id, input.farmId, day)
    : await findOpenShift(db, actor.id, day);

  assertEndAllowed(existing);
  const row = existing!;

  const targetFarmId = row.farmId;
  await requireFarmAccess(targetFarmId);
  const farm = row.farm ?? (await getFarmFence(db, targetFarmId));

  // Optional selfie on clock out (same freshness + farm binding as clock-in).
  // Invalid/stale/reused → silently ignored, clock-out proceeds.
  let endSelfieKey: string | null = null;
  if (input.selfieMediaId) {
    const media = await getVerifiedSelfie(db, { mediaId: input.selfieMediaId, userId: actor.id, farmId: targetFarmId });
    if (media?.verifiedAt && isSelfieFresh(media, now)) {
      if (!(await isSelfieReused(db, actor.id, day, media.storageKey))) endSelfieKey = media.storageKey;
    }
  }

  // GPS is mandatory on clock-out: no fallback to start/farm coords.
  if (input.latitude == null || input.longitude == null) {
    throw new AttendanceFault(422, { error: "GPS location is required to verify end-of-shift presence." });
  }
  const endLat = input.latitude;
  const endLng = input.longitude;

  // END uses the START-associated plot (if any) through the same canonical path.
  let endPlot: { farmId: string; boundaryGeoJson: string | null; deletedAt: Date | null; status: string | null } | null = null;
  if (row.plotId) {
    endPlot = await getPlotFence(db, row.plotId);
  }
  const endChecked = validateAttendanceLocation({
    lat: endLat,
    lng: endLng,
    accuracyMeters: input.accuracyMeters,
    farmId: targetFarmId,
    farm,
    plot: endPlot,
  });
  if (!endChecked.ok) {
    throw new AttendanceFault(endChecked.status, { error: endChecked.message, code: endChecked.code });
  }
  const distance = endChecked.distanceMeters;
  const outside = !endChecked.inside;
  const basis = endChecked.basis;
  if (outside && !input.reason) {
    throw new AttendanceFault(422, {
      error: "A reason is required outside the farm geofence.",
      code: "REASON_REQUIRED",
      distanceMeters: distance,
      geofenceBasis: basis,
    });
  }
  const reason = input.reason || undefined;

  const attendance = await db.$transaction((tx) =>
    closeShift(tx, {
      rowId: row.id,
      endStatus: resolveEndStatus(outside, row.status as never),
      endLat,
      endLng,
      endSelfieKey,
      existingEndSelfieKey: row.endSelfieKey,
      basis: basis as GeofenceBasis,
      outside,
      distance,
      reason,
      now,
    })
  );

  await audit(actor.id, "END_DAY", "Attendance", attendance.id, {
    farmId: targetFarmId,
    outside,
    distanceMeters: distance,
    geofenceBasis: basis,
  });
  return { attendance: attendance as Record<string, unknown>, distanceMeters: distance, withinGeofence: !outside, geofenceBasis: basis };
}
