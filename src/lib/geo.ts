/**
 * Boundary geometry helpers (map UI side).
 *
 * Compatibility layer: ALL math lives in `./geo-core`. This module keeps
 * the original names/signatures so existing imports and tests are
 * unaffected. Do not add geometry logic here — extend geo-core instead.
 */

import {
  LngLat,
  EARTH_RADIUS_M,
  SQM_PER_ACRE,
  MAX_BOUNDARY_POINTS,
  MIN_BOUNDARY_ACRES,
  ringAcres as coreRingAcres,
  toGeoJsonPolygon as coreToGeoJson,
  validatePolygon as coreValidatePolygon,
  parseBoundaryToRing,
} from "./geo-core";

export type { LngLat };
export { MAX_BOUNDARY_POINTS, MIN_BOUNDARY_ACRES };
export { EARTH_RADIUS_M as EARTH_RADIUS_METERS };
/** Historic alias (server core name is SQM_PER_ACRE). Same value. */
export const SQ_METERS_PER_ACRE = SQM_PER_ACRE;

export function ringAcres(ring: LngLat[]): number {
  return coreRingAcres(ring);
}

export function toGeoJsonPolygon(ring: LngLat[]): string {
  return coreToGeoJson(ring);
}

/**
 * Accepts a GeoJSON Polygon string OR a legacy `[{lat,lng}]` string and
 * returns a closed [lng,lat] ring, or null when unparseable.
 */
export function parseBoundary(input: string | null): LngLat[] | null {
  if (typeof input !== "string") return null;
  try {
    return parseBoundaryToRing(input);
  } catch {
    return null;
  }
}

/**
 * True when a STORED boundary exists but cannot be parsed (corrupt data).
 * Distinct from "no fence" (null/empty → false). Use to show a
 * "redraw" banner instead of a misleading empty map.
 */
export function isBoundaryCorrupt(stored: string | null | undefined): boolean {
  if (typeof stored !== "string" || stored.trim() === "") return false;
  return parseBoundary(stored) === null;
}

/**
 * Validation errors for a boundary JSON string (empty = valid).
 * NOTE: unlike parseBoundary (tolerant), malformed input is an error here.
 */
export function validatePolygon(input: string | null): string[] {
  if (input === null || input === undefined || input.trim() === "") {
    return ["Boundary is required."];
  }
  let ring: LngLat[] | null = null;
  try {
    ring = parseBoundaryToRing(input);
  } catch {
    ring = null;
  }
  if (!ring) {
    return ["Boundary must be a GeoJSON Polygon or a legacy [{lat,lng}] JSON string."];
  }
  return coreValidatePolygon(input);
}
