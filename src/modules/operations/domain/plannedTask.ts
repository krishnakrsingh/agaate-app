/**
 * operations/domain/plannedTask — pure rules for agronomist task planning.
 *
 * Source of truth for the CREATION path only (PATCH/bulk/hq keep their own
 * checks until their slices — see MIGRATION_STATUS; the 3× inline copies
 * found by the checkpoint-5 audit are documented, not consolidated here):
 * - rolling 7-day planning window (UTC calendar days, today..today+6)
 * - farm must be ACTIVE
 * - assignee must be an active FARM_OFFICER with farm access
 * - plot / crop-cycle scope membership
 *
 * Pure: no Prisma, no Next, no HTTP. Throws framework-free HttpError
 * (status + message) which the transport layer renders via apiError.
 * `now` is injectable — the legacy default (wall clock) is preserved
 * for production; tests pin boundaries with explicit clocks.
 */

import { HttpError } from "@/shared/errors";
import { isWithinRollingSevenDays } from "@/shared/dates";

export interface OfficerEligibilityRow {
  role: unknown;
  active: unknown;
  farmAccess: unknown[];
}

/** Agronomy activities must be planned within the rolling seven-day window. */
export function assertPlanningWindow(date: Date, now: Date = new Date()): void {
  if (!isWithinRollingSevenDays(date, now)) {
    throw new HttpError(422, "Agronomy activities must be planned within the rolling seven-day window.");
  }
}

/** Planning targets active farms only (creation-time guard, not a filter). */
export function assertFarmActive(status: string): void {
  if (status !== "ACTIVE") {
    throw new HttpError(422, "Agronomy activities can only be planned for an active farm.");
  }
}

/** Assignee must be an active Farm Officer holding access to THIS farm. */
export function assertOfficerEligible(row: OfficerEligibilityRow | null | undefined): void {
  if (!row || row.role !== "FARM_OFFICER" || !row.active || !row.farmAccess.length) {
    throw new HttpError(422, "The assigned user must be an active Farm Officer assigned to this farm.");
  }
}

/** Plot must belong to the farm (soft-deleted plots excluded by the query). */
export function assertPlotInFarm(found: boolean): void {
  if (!found) {
    throw new HttpError(422, "The selected plot is not part of this farm.");
  }
}

/** Crop cycle must belong to the farm (and the plot, when one is named). */
export function assertCycleInScope(found: boolean): void {
  if (!found) {
    throw new HttpError(422, "The selected crop cycle is not part of this farm and plot.");
  }
}
