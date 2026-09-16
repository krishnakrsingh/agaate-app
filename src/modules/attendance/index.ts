/**
 * modules/attendance — public API (narrow by design).
 *
 * Lifecycle owner: START/END validity, eligibility, persistence
 * orchestration, audit. Spatial owns location validity — consumed via
 * @modules/spatial, never duplicated here.
 *
 * Import ONLY from here — never from domain/, application/,
 * schemas/, infrastructure/ internals (enforced by architecture tests).
 */

export { startAttendance } from "./application/startAttendance";
export { endAttendance } from "./application/endAttendance";
export { getTodayShift } from "./application/getTodayShift";
export { attendanceSchema, type AttendanceInput } from "./schemas/attendance";
export {
  AttendanceFault,
  SELFIE_FRESH_MS,
  isSelfieFresh,
  assertStartPresent,
  assertStartAllowed,
  assertEndAllowed,
  resolveEndStatus,
  resolveLinkPlotId,
  type AttendanceStatus,
} from "./domain/attendancePolicy";
