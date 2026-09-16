/**
 * attendance/domain/attendancePolicy — pure lifecycle rules for START/END.
 *
 * Attendance owns lifecycle validity; spatial owns location validity.
 * Three error channels, preserved exactly as the legacy route behaved:
 * - AttendanceFault(status, body): direct-JSON contract errors (presence
 *   422s, plot 404, validator failures, REASON_REQUIRED).
 * - plain Error with allow-listed message: selfie/dup/state gates mapped
 *   to 422 by apiError (identical strings, identical codes).
 * - Prisma P2002 on the unique key: concurrent double-START → 409.
 *
 * Pure: no Prisma, no Next, no HTTP. `now` injectable for tests.
 */

export class AttendanceFault extends Error {
  constructor(
    public status: number,
    public body: Record<string, unknown>
  ) {
    super(typeof body.error === "string" ? body.error : "Attendance operation failed.");
    this.name = "AttendanceFault";
  }
}

/** Selfies expire 30 minutes after verification AND after creation. */
export const SELFIE_FRESH_MS = 30 * 60 * 1000;

export interface SelfieRow {
  verifiedAt: Date | string | null;
  createdAt: Date | string;
  storageKey: string;
}

/** Fresh on both clocks (verifiedAt and createdAt within the window). */
export function isSelfieFresh(media: SelfieRow, now: Date = new Date()): boolean {
  if (!media.verifiedAt) return false;
  const t = now.getTime();
  return (
    t - new Date(media.verifiedAt).getTime() <= SELFIE_FRESH_MS &&
    t - new Date(media.createdAt).getTime() <= SELFIE_FRESH_MS
  );
}

export interface StartPresence {
  farmId?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  selfieMediaId?: string | null;
}

/** START presence gates, in legacy order (farm → GPS → selfie id). */
export function assertStartPresent(input: StartPresence): void {
  if (!input.farmId) {
    throw new AttendanceFault(422, { error: "Farm selection is required to start a shift." });
  }
  if (input.latitude == null || input.longitude == null) {
    throw new AttendanceFault(422, { error: "GPS location is required to verify start-of-shift presence." });
  }
  if (!input.selfieMediaId) {
    throw new AttendanceFault(422, { error: "A valid uploaded selfie is required to start a shift." });
  }
}

/** START allowed only when no row exists for (user, farm, day) — any status. */
export function assertStartAllowed(existing: { id: string } | null): void {
  if (existing) {
    throw new Error("Day has already been started for this farm.");
  }
}

export interface EndableRow {
  startAt: Date | string | null;
  endAt: Date | string | null;
}

/** END requires a started, un-ended row (checked before GPS, as legacy). */
export function assertEndAllowed(row: EndableRow | null): void {
  if (!row || !row.startAt) {
    throw new Error("Start the day before ending it.");
  }
  if (row.endAt) {
    throw new Error("Day has already been ended.");
  }
}

export type AttendanceStatus = "OPEN" | "COMPLETED" | "EXCEPTION_PENDING" | "EXCEPTION_APPROVED" | "EXCEPTION_REJECTED";

/**
 * END status resolution, verbatim legacy ternary:
 * - outside → EXCEPTION_PENDING (unconditional overwrite)
 * - inside + OPEN/APPROVED → COMPLETED
 * - inside + PENDING/REJECTED → unchanged (exception survives clock-out)
 */
export function resolveEndStatus(outside: boolean, prior: AttendanceStatus): AttendanceStatus {
  if (outside) return "EXCEPTION_PENDING";
  if (prior === "OPEN" || prior === "EXCEPTION_APPROVED") return "COMPLETED";
  return prior;
}

/** Plot link survives only for live (non-deleted, non-archived) plots. */
export function resolveLinkPlotId(
  plot: { deletedAt: Date | string | null; status: string | null } | null,
  plotId: string | undefined
): string | null {
  if (plot && !plot.deletedAt && plot.status !== "ARCHIVED") return plotId ?? null;
  return null;
}
