import type { GeofenceBasis } from "@prisma/client";
import { prisma } from "@/infrastructure/db";
import { utcDateOnly } from "@/lib/business";
import { audit } from "@/lib/audit";
import { requireFarmAccess } from "@modules/auth";
import type { Actor } from "@modules/auth";
import { validateAttendanceLocation } from "@modules/spatial";
import {
  AttendanceFault,
  assertStartPresent,
  isSelfieFresh,
  resolveLinkPlotId,
} from "../domain/attendancePolicy";
import { openShift, getPlotFence, getVerifiedSelfie, isSelfieReused, getFarmFence } from "../infrastructure/attendanceQueries";
import type { AttendanceInput } from "../schemas/attendance";

type Db = typeof prisma;

/**
 * startAttendance — clock-in use-case (POST /api/attendance action=START).
 *
 * Moved verbatim from the route: presence gates → farm gate → farm row →
 * selfie verify (owner/farm/kind/verified + dual-clock 30-min freshness +
 * replay) → plot fetch (missing → 404) → canonical spatial decision →
 * reason gate → tx (dup-guard → create + conditional exception) → audit →
 * 200 payload. Spatial owns location validity; this owns lifecycle validity.
 */
export async function startAttendance(opts: {
  input: AttendanceInput;
  actor: Actor;
  db?: Db;
  now?: Date;
}): Promise<{ attendance: Record<string, unknown>; distanceMeters: number; withinGeofence: boolean; geofenceBasis: string }> {
  const { input, actor, db = prisma, now = new Date() } = opts;
  const day = utcDateOnly(now);

  assertStartPresent(input);
  const farmId = input.farmId!;
  await requireFarmAccess(farmId);
  const farm = await getFarmFence(db, farmId);

  const media = await getVerifiedSelfie(db, { mediaId: input.selfieMediaId!, userId: actor.id, farmId });
  if (!media?.verifiedAt) throw new Error("A valid uploaded selfie is required.");
  // One-time fresh binding: selfies expire after 30 min and can't be replayed.
  if (!isSelfieFresh(media, now)) {
    throw new Error("A valid uploaded selfie is required.");
  }
  if (await isSelfieReused(db, actor.id, day, media.storageKey)) {
    throw new Error("A valid uploaded selfie is required.");
  }

  // Canonical location decision (plot → farm polygon → radius).
  // Server-authoritative; any frontend radar is display-only.
  let startPlot: { farmId: string; boundaryGeoJson: string | null; deletedAt: Date | null; status: string | null } | null = null;
  if (input.plotId) {
    const found = await getPlotFence(db, input.plotId);
    if (!found) {
      throw new AttendanceFault(404, { error: "The requested record was not found." });
    }
    startPlot = found;
  }
  const checked = validateAttendanceLocation({
    lat: input.latitude,
    lng: input.longitude,
    accuracyMeters: input.accuracyMeters,
    farmId,
    farm,
    plot: startPlot,
  });
  if (!checked.ok) {
    throw new AttendanceFault(checked.status, { error: checked.message, code: checked.code });
  }
  const outside = !checked.inside;
  const basis = checked.basis;
  const distance = checked.distanceMeters;
  const linkPlotId = resolveLinkPlotId(startPlot, input.plotId);
  if (outside && !input.reason) {
    throw new AttendanceFault(422, {
      error: "A reason is required outside the farm geofence.",
      code: "REASON_REQUIRED",
      distanceMeters: distance,
      geofenceBasis: basis,
    });
  }

  // Dup-guard lives inside the transaction (openShift throws on an
  // existing day row); no pre-read, exactly as legacy.
  const attendance = await db.$transaction((tx) =>
    openShift(tx, {
      userId: actor.id,
      farmId,
      plotId: linkPlotId,
      day,
      outside,
      basis: basis as GeofenceBasis,
      lat: input.latitude!,
      lng: input.longitude!,
      selfieKey: media.storageKey,
      reason: input.reason,
      distance,
      now,
    })
  );

  await audit(actor.id, "START_DAY", "Attendance", attendance.id, {
    farmId,
    plotId: linkPlotId,
    outside,
    distanceMeters: distance,
    geofenceBasis: basis,
  });
  return { attendance: attendance as Record<string, unknown>, distanceMeters: distance, withinGeofence: !outside, geofenceBasis: basis };
}
