/**
 * Server-safe farm/plot boundary helpers.
 *
 * Compatibility layer: ALL math lives in `./geo-core` (shared with the map
 * UI — `src/lib/geo.ts` — so client and server can never disagree). This
 * module keeps the original names, throw-semantics, and error messages, and
 * adds the canonical PLOT write path (containment + grid partition).
 * Pure functions only: no leaflet/DOM. Do not add geometry logic here —
 * extend geo-core instead.
 */

import {
  LngLat,
  EARTH_RADIUS_M,
  SQM_PER_ACRE,
  MAX_BOUNDARY_POINTS,
  MIN_BOUNDARY_ACRES,
  ringAcres as coreRingAcres,
  roundAcresForDb as coreRoundAcres,
  parseBoundaryToRing as coreParseRing,
  toGeoJsonPolygon as coreToGeoJson,
  validateRingPositions as coreValidatePositions,
  ringIsSimple,
  ringWithinRing,
  gridSplitRing,
  openRing,
  pointInRing,
  representativePoint,
} from "./geo-core";

export type { LngLat };
export {
  EARTH_RADIUS_M as EARTH_RADIUS_M,
  SQM_PER_ACRE,
  MAX_BOUNDARY_POINTS,
  MIN_BOUNDARY_ACRES,
  openRing,
  ringWithinRing,
  ringIsSimple,
  gridSplitRing,
  pointInRing,
  representativePoint,
};
export { EARTH_RADIUS_M as EARTH_RADIUS_METERS };
export { coreParseRing as parseBoundaryToRing, coreToGeoJson as toGeoJsonPolygon };

export function ringAcres(ring: readonly (readonly [number, number])[]): number {
  return coreRingAcres(ring);
}

export function roundAcresForDb(acres: number): number {
  return coreRoundAcres(acres);
}

function throwFirst(errors: string[]): never {
  throw new Error(errors[0]);
}

/**
 * Tolerant parse + validate. Returns canonical GeoJSON Polygon string, or
 * null when input is absent (null/undefined/empty string/empty array).
 * Throws Error with a clear message on invalid input (caller maps to 422).
 * Output ring is always closed; legacy `[{lat,lng}]` is auto-closed.
 */
export function normalizeToGeoJson(input: unknown): string | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "string" && input.trim() === "") return null;
  let ring: LngLat[];
  try {
    const parsed = coreParseRing(input);
    if (parsed === null) return null;
    ring = parsed;
  } catch (e) {
    throw new Error(e instanceof Error ? e.message : "Boundary must be a GeoJSON Polygon or an array of {lat,lng} points.");
  }
  const structural = coreValidatePositions(ring);
  if (structural.length > 0) throwFirst(structural);
  if (!ringIsSimple(ring)) {
    throw new Error("Boundary polygon must not cross itself (self-intersecting).");
  }
  const acres = coreRingAcres(ring);
  if (!Number.isFinite(acres) || acres <= MIN_BOUNDARY_ACRES) {
    throw new Error(
      `Boundary polygon area must be greater than ${MIN_BOUNDARY_ACRES} acres (degenerate or too small).`
    );
  }
  return coreToGeoJson(ring);
}

/**
 * Full tolerant parse: null when no polygon, otherwise canonical GeoJSON,
 * closed ring, and spherical acres (raw float; round to 2dp for Decimal(12,2)).
 * Throws Error with a clear message on invalid input.
 */
export function parseBoundary(input: unknown): { ring: LngLat[]; geoJson: string; acres: number } | null {
  const geoJson = normalizeToGeoJson(input);
  if (geoJson === null) return null;
  const ring = (JSON.parse(geoJson) as { coordinates: LngLat[][] }).coordinates[0];
  return { ring, geoJson, acres: coreRingAcres(ring) };
}

// ---------------------------------------------------------------------------
// canonical PLOT write path — every plot geometry write funnels through here
// ---------------------------------------------------------------------------

export interface ValidatedPlotGeometry {
  /** Canonical GeoJSON Polygon string, ready to persist. */
  geoJson: string;
  /** Closed [lng,lat] ring. */
  ring: LngLat[];
  /** Server-computed acres (raw float — round with roundAcresForDb). */
  acres: number;
}

/**
 * Validate a plot boundary against its parent farm ring. Throws Error
 * (caller maps to 422) with a useful message. Rules:
 * - absent input → null (plot without drawn boundary; legacy path)
 * - farm without polygon + plot WITH boundary → reject (nothing to check
 *   against; draw the farm boundary first)
 * - plot ring must be simple, non-degenerate, and COMPLETELY inside the
 *   farm ring. Boundary-touching is allowed (shared borders pass); any
 *   proper edge crossing or outside vertex rejects.
 */
export function validatePlotGeometry(
  plotInput: unknown,
  farmBoundaryGeoJson: string | null
): ValidatedPlotGeometry | null {
  const parsed = parseBoundary(plotInput);
  if (parsed === null) return null;
  if (!farmBoundaryGeoJson) {
    throw new Error(
      "This farm has no drawn boundary yet — draw the farm boundary before fencing plots inside it."
    );
  }
  let farmRing: LngLat[];
  try {
    const farmParsed = coreParseRing(farmBoundaryGeoJson);
    if (farmParsed === null) {
      throw new Error("The farm's stored boundary is unreadable — redraw the farm boundary first.");
    }
    farmRing = farmParsed;
  } catch {
    throw new Error("The farm's stored boundary is unreadable — redraw the farm boundary first.");
  }
  if (!ringWithinRing(parsed.ring, farmRing)) {
    throw new Error(
      "Plot boundary must lie completely inside the farm boundary (vertices outside or edges crossing the farm fence are rejected; touching the fence is allowed)."
    );
  }
  return { geoJson: parsed.geoJson, acres: parsed.acres, ring: parsed.ring };
}
