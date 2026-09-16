/**
 * modules/spatial — canonical public API for ALL geospatial capability.
 *
 * Physical home (checkpoint 3): implementation lives in
 * domain/ (pure math + decisions), application/ (server validation,
 * versioned writes, coverage queries), ui/ (map + walk-outbox helpers).
 * The old src/lib/geo-* locations are GONE (git mv, history preserved).
 *
 * Ownership:
 * - geometry math .......... domain/geo-core.ts (pure, no DOM/Prisma/Next)
 * - attendance decisions ... domain/attendance-geo.ts (pure)
 * - walk sampling .......... domain/track.ts (pure)
 * - field coverage ......... domain/plot-visits.ts (pure) + application/plot-visit-service.ts (reads)
 * - server validation ...... application/geo-server.ts (pure, throw-semantics)
 * - versioned writes ....... application/geo-versions.ts (Prisma transaction)
 * - policy thresholds ...... domain/geo-policy.ts
 * - map UI helpers ......... ui/geo.ts (import from @modules/spatial/ui/geo)
 * - walk outbox ............ ui/walk-queue.ts (import from @modules/spatial/ui/walk-queue)
 *
 * Rules:
 * - Import via `@modules/spatial` (or `@/modules/spatial`); cross-module
 *   deep imports are banned (arch-tested). Same-module ui/ subpaths are fine.
 * - Never add a second area/containment/distance implementation.
 * - PENDING: domain still reads haversine from `@/lib/business`
 *   (business.ts split into operations/cropping/shared is a later slice).
 */

// Pure geometry (safe in client + server + tests)
export {
  EARTH_RADIUS_M,
  SQM_PER_ACRE,
  MAX_BOUNDARY_POINTS,
  MIN_BOUNDARY_ACRES,
  samePosition,
  closeRing,
  openRing,
  ringAcres,
  roundAcresForDb,
  parseBoundaryToRing,
  toGeoJsonPolygon,
  validateRingPositions,
  validatePolygon,
  onSegment,
  properSegmentsIntersect,
  pointInRing,
  ringIsSimple,
  ringWithinRing,
  pathPerimeterM,
  bboxOfRing,
  clipPolygonToRect,
  removeCollinearPoints,
  gridSplitRing,
  representativePoint,
  type LngLat,
  type BBox,
  type GridCell,
} from "./domain/geo-core";

// Server write-path validation (pure, throw-semantics; caller maps to 422)
export {
  normalizeToGeoJson,
  parseBoundary,
  validatePlotGeometry,
  type ValidatedPlotGeometry,
} from "./application/geo-server";

// Versioned boundary writes (Prisma; MUST run inside caller transaction)
export {
  commitBoundary,
  plotsOutsideRing,
  serializeBoundaryVersion,
  type BoundaryWrite,
  type VersionProvenance,
  type CommittedVersion,
  type SerializedBoundaryVersion,
} from "./application/geo-versions";

// Field coverage: pure presence engine + shared read query
export {
  computePlotVisits,
  planVisitRoute,
  type VisitPlot,
  type PlotVisit,
  type RouteStop,
} from "./domain/plot-visits";
export { getPlotVisits, type PlotVisitData } from "./application/plot-visit-service";

// Canonical attendance geofence decision (pure; no Prisma/request objects)
export {
  validateAttendanceLocation,
  attendanceDisplayVerdict,
  MAX_GPS_ACCURACY_METERS,
  type GeofenceBasis,
  type FarmGeoInput,
  type PlotGeoInput,
  type AttendanceLocationResult,
} from "./domain/attendance-geo";

// GPS walk sampling/cleaning (pure; shared client-preview + server-verdict)
export {
  TRACK,
  decideSample,
  cleanSamples,
  trackPerimeterM,
  closureGapM,
  samplesToRing,
  assessTrack,
  nearStart,
  type GpsSample,
  type DropReason,
  type SampleDecision,
  type CleanedTrack,
  type TrackQuality,
  type QualityReport,
} from "./domain/track";

// Policy thresholds (single home for governance numbers)
export { AREA_CHANGE_FLAG_THRESHOLD, SOURCE_LABELS, areaChangeText } from "./domain/geo-policy";
