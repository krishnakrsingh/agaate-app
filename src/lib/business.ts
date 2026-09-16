/**
 * COMPATIBILITY SHIM (checkpoint 7 / Phase E.1):
 *
 * All business and utility logic has been moved to canonical owners:
 * - Spatial: distanceMeters, DEFAULT_GEOFENCE_RADIUS_METERS -> @/modules/spatial
 * - Cropping: calculatedInfrastructure, milestoneTemplates -> @/modules/cropping
 * - Operations: labourHours, taskTransitions, canTransitionTask -> @/modules/operations
 * - Dates: utcDateOnly, parseUtcDate, isWithinRollingSevenDays -> @/shared/dates
 * - Formatting: formatDate, formatTime, formatDateTime -> @/shared/format
 * - Math: variance -> @/shared/math
 *
 * Do NOT add new callers to this file.
 */

export {
  DEFAULT_GEOFENCE_RADIUS_METERS,
  distanceMeters,
} from "@modules/spatial/domain/geo-core";

export {
  calculatedInfrastructure,
  milestoneTemplates,
} from "@modules/cropping/domain/cropCyclePolicy";

export function labourHours(labourers: number, hours: number) {
  return labourers * hours;
}

export {
  TASK_TRANSITIONS as taskTransitions,
  canTransitionTask,
} from "@modules/operations/domain/taskTransitions";

export {
  utcDateOnly,
  parseUtcDate,
  isWithinRollingSevenDays,
} from "@/shared/dates";

export {
  formatTime,
  formatDate,
  formatDateTime,
} from "@/shared/format";

export {
  variance,
} from "@/shared/math";


