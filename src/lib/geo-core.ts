/**
 * geo-core — the ONE home for all boundary geometry math in this app.
 *
 * Both `src/lib/geo.ts` (map UI) and `src/lib/geo-server.ts` (API validation)
 * are thin compatibility layers over this module. No geometry math lives
 * anywhere else. Pure functions only: no DOM, no leaflet, no node APIs.
 *
 * Conventions:
 * - Rings are [lng,lat] pairs, CLOSED (first === last) unless stated.
 * - Canonical storage: GeoJSON Polygon string
 *   {"type":"Polygon","coordinates":[[[lng,lat],...closed]]}.
 * - Legacy input `[{lat,lng}]` (or bare `[[lng,lat]]`) is tolerated on READ
 *   and normalized to canonical on WRITE. Nothing new is ever persisted
 *   in legacy form.
 * - Containment is boundary-INCLUSIVE: a plot vertex/edge exactly ON the
 *   farm boundary is inside. Only *proper* crossings (edges passing through
 *   each other) count as outside. Plots may share the farm's border.
 */

import { distanceMeters } from "./business";

export type LngLat = [number, number];

export const EARTH_RADIUS_M = 6378137;
export const SQM_PER_ACRE = 4046.8564224;
export const MAX_BOUNDARY_POINTS = 500;
export const MIN_BOUNDARY_ACRES = 0.001;

/** Tolerance in degrees for collinearity / on-segment tests (~mm scale). */
const EPS = 1e-9;

// ---------------------------------------------------------------------------
// rings
// ---------------------------------------------------------------------------

export function samePosition(a: LngLat, b: LngLat): boolean {
  return a[0] === b[0] && a[1] === b[1];
}

export function closeRing(ring: LngLat[]): LngLat[] {
  if (ring.length === 0) return ring;
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (samePosition(first, last)) return ring;
  return [...ring, [first[0], first[1]] as LngLat];
}

/** Unique vertices of a (possibly closed) ring. */
export function openRing(ring: LngLat[]): LngLat[] {
  if (ring.length > 1 && samePosition(ring[0], ring[ring.length - 1])) return ring.slice(0, -1);
  return [...ring];
}

// ---------------------------------------------------------------------------
// area
// ---------------------------------------------------------------------------

/**
 * Spherical-earth polygon area in acres (Chamberlain–Duquette spherical
 * excess, R=6378137). Open rings treated as closed. Returns 0 for degenerate
 * or non-finite input. Absolute value: ring winding does not matter.
 */
export function ringAcres(ring: readonly (readonly [number, number])[]): number {
  if (!Array.isArray(ring) || ring.length < 3) return 0;
  const closed = closeRing(ring as LngLat[]);
  if (closed.length < 4) return 0;
  let total = 0;
  for (let i = 0; i < closed.length - 1; i++) {
    const lng1 = closed[i][0];
    const lat1 = closed[i][1];
    const lng2 = closed[i + 1][0];
    const lat2 = closed[i + 1][1];
    if (!Number.isFinite(lng1) || !Number.isFinite(lat1) || !Number.isFinite(lng2) || !Number.isFinite(lat2)) {
      return 0;
    }
    const lat1Rad = (lat1 * Math.PI) / 180;
    const lat2Rad = (lat2 * Math.PI) / 180;
    let dLng = ((lng2 - lng1) * Math.PI) / 180;
    if (dLng > Math.PI) dLng -= 2 * Math.PI;
    if (dLng < -Math.PI) dLng += 2 * Math.PI;
    total += dLng * (2 + Math.sin(lat1Rad) + Math.sin(lat2Rad));
  }
  const areaM2 = Math.abs((total * EARTH_RADIUS_M * EARTH_RADIUS_M) / 2);
  if (!Number.isFinite(areaM2)) return 0;
  return areaM2 / SQM_PER_ACRE;
}

/** Round acres for Prisma Decimal(12,2). */
export function roundAcresForDb(acres: number): number {
  return Math.round(acres * 100) / 100;
}

// ---------------------------------------------------------------------------
// parsing (tolerant read, canonical write)
// ---------------------------------------------------------------------------

function toFiniteNumber(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function legacyPointToLngLat(pt: unknown, i: number): LngLat {
  if (Array.isArray(pt)) {
    if (pt.length < 2) throw new Error(`Boundary point ${i} must be [lng,lat] or {lat,lng}.`);
    const lng = toFiniteNumber(pt[0]);
    const lat = toFiniteNumber(pt[1]);
    if (lng === null || lat === null) throw new Error(`Boundary point ${i} coordinates must be finite numbers.`);
    return [lng, lat];
  }
  if (pt !== null && typeof pt === "object") {
    const o = pt as Record<string, unknown>;
    const lng = toFiniteNumber(o.lng ?? o.lon ?? o.long ?? o.longitude ?? o.Longitude);
    const lat = toFiniteNumber(o.lat ?? o.latitude ?? o.Latitude);
    if (lng === null || lat === null) throw new Error(`Boundary point ${i} must have finite numeric lat/lng.`);
    return [lng, lat];
  }
  throw new Error(`Boundary point ${i} must be [lng,lat] or {lat,lng}.`);
}

function ringPositionsToLngLat(raw: unknown[]): LngLat[] {
  return raw.map((pos, i) => {
    if (!Array.isArray(pos) || pos.length < 2) throw new Error(`Boundary point ${i} must be [lng,lat].`);
    const lng = toFiniteNumber(pos[0]);
    const lat = toFiniteNumber(pos[1]);
    if (lng === null || lat === null) throw new Error(`Boundary point ${i} coordinates must be finite numbers.`);
    return [lng, lat] as LngLat;
  });
}

function extractRing(parsed: unknown): LngLat[] | null {
  if (parsed === null || parsed === undefined) return null;
  if (Array.isArray(parsed)) {
    if (parsed.length === 0) return null;
    return parsed.map((pt, i) => legacyPointToLngLat(pt, i));
  }
  if (typeof parsed === "object") {
    const o = parsed as Record<string, unknown>;
    const geom = o.type === "Feature" && o.geometry !== null && typeof o.geometry === "object"
      ? (o.geometry as Record<string, unknown>)
      : o;
    if (geom.type === "Polygon" && Array.isArray(geom.coordinates)) {
      const coords = geom.coordinates as unknown[];
      if (coords.length !== 1 || !Array.isArray(coords[0])) {
        throw new Error("Boundary Polygon must have exactly one linear ring in coordinates[0] (holes are not supported).");
      }
      return ringPositionsToLngLat(coords[0] as unknown[]);
    }
    throw new Error("Boundary must be a GeoJSON Polygon or an array of {lat,lng} points.");
  }
  throw new Error("Boundary must be a GeoJSON Polygon or an array of {lat,lng} points.");
}

/**
 * Tolerant parse of a boundary in any accepted form (canonical string,
 * legacy string, raw object/array). Returns a CLOSED ring, or null when
 * input is absent (null/undefined/""/[]). Throws with a clear message on
 * malformed input.
 */
export function parseBoundaryToRing(input: unknown): LngLat[] | null {
  if (input === null || input === undefined) return null;
  if (typeof input === "string") {
    if (input.trim() === "") return null;
    let parsed: unknown;
    try {
      parsed = JSON.parse(input);
    } catch {
      throw new Error("Boundary must be valid JSON (expected GeoJSON Polygon or [{lat,lng}] array).");
    }
    const ring = extractRing(parsed);
    return ring === null ? null : closeRing(ring);
  }
  const ring = extractRing(input);
  return ring === null ? null : closeRing(ring);
}

/** Normalize any ring to the canonical GeoJSON Polygon string (auto-close). */
export function toGeoJsonPolygon(ring: LngLat[]): string {
  return JSON.stringify({ type: "Polygon", coordinates: [closeRing(ring)] });
}

// ---------------------------------------------------------------------------
// validation (returns error lists; never throws)
// ---------------------------------------------------------------------------

/**
 * Structural checks: count + coordinate ranges. Check ORDER is contractual
 * (too many → too few → ranges): existing tests assert these messages.
 */
export function validateRingPositions(ring: LngLat[]): string[] {
  if (ring.length > MAX_BOUNDARY_POINTS) {
    return [`Boundary polygon must not exceed ${MAX_BOUNDARY_POINTS} points (got ${ring.length}).`];
  }
  if (ring.length < 4) {
    return ["Boundary polygon must have at least 4 positions (3 distinct points plus closing point)."];
  }
  for (let i = 0; i < ring.length; i++) {
    const [lng, lat] = ring[i];
    if (!Number.isFinite(lng) || !Number.isFinite(lat)) {
      return [`Boundary point ${i} coordinates must be finite numbers.`];
    }
    if (lng < -180 || lng > 180) {
      return [`Boundary point ${i} longitude ${lng} out of range [-180,180].`];
    }
    if (lat < -90 || lat > 90) {
      return [`Boundary point ${i} latitude ${lat} out of range [-90,90].`];
    }
  }
  return [];
}

/**
 * Full validation of a boundary in any accepted form. Empty = valid.
 * An open ring is auto-closed, NOT an error. Area floor applies.
 */
export function validatePolygon(input: unknown): string[] {
  if (input === null || input === undefined || (typeof input === "string" && input.trim() === "")) {
    return ["Boundary is required."];
  }
  let ring: LngLat[];
  try {
    const parsed = parseBoundaryToRing(input);
    if (parsed === null) return ["Boundary must be a GeoJSON Polygon or a legacy [{lat,lng}] JSON string."];
    ring = parsed;
  } catch (e) {
    return [e instanceof Error ? e.message : "Boundary must be a GeoJSON Polygon or a legacy [{lat,lng}] JSON string."];
  }
  const structural = validateRingPositions(ring);
  if (structural.length > 0) return structural;
  if (!ringIsSimple(ring)) {
    return ["Boundary polygon must not cross itself (self-intersecting)."];
  }
  const acres = ringAcres(ring);
  if (!Number.isFinite(acres) || acres <= MIN_BOUNDARY_ACRES) {
    return [`Boundary polygon area must be greater than ${MIN_BOUNDARY_ACRES} acres (degenerate or too small).`];
  }
  return [];
}

// ---------------------------------------------------------------------------
// planar topology (all coordinates treated as exact; EPS for float noise)
// ---------------------------------------------------------------------------

function cross(o: LngLat, a: LngLat, b: LngLat): number {
  return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}

function orientSign(o: LngLat, a: LngLat, b: LngLat): number {
  const c = cross(o, a, b);
  if (c > EPS) return 1;
  if (c < -EPS) return -1;
  return 0;
}

/** True when p lies on segment ab (endpoints inclusive, ~mm tolerance). */
export function onSegment(a: LngLat, b: LngLat, p: LngLat): boolean {
  if (orientSign(a, b, p) !== 0) return false;
  return (
    p[0] >= Math.min(a[0], b[0]) - EPS &&
    p[0] <= Math.max(a[0], b[0]) + EPS &&
    p[1] >= Math.min(a[1], b[1]) - EPS &&
    p[1] <= Math.max(a[1], b[1]) + EPS
  );
}

/**
 * True only when segments PROPERLY cross (interiors intersect).
 * Endpoint touches and collinear overlaps return false — shared borders
 * and snapped vertices are legal, not violations.
 */
export function properSegmentsIntersect(p1: LngLat, p2: LngLat, p3: LngLat, p4: LngLat): boolean {
  const o1 = orientSign(p1, p2, p3);
  const o2 = orientSign(p1, p2, p4);
  const o3 = orientSign(p3, p4, p1);
  const o4 = orientSign(p3, p4, p2);
  return o1 * o2 < 0 && o3 * o4 < 0;
}

/** Boundary-inclusive point-in-ring: points ON an edge count as inside. */
export function pointInRing(pt: LngLat, ring: LngLat[]): boolean {
  const [x, y] = pt;
  const verts = openRing(ring);
  const n = verts.length;
  if (n < 3) return false;
  for (let i = 0; i < n; i++) {
    if (onSegment(verts[i], verts[(i + 1) % n], pt)) return true;
  }
  let inside = false;
  for (let i = 0, j = n - 1; i < n; j = i++) {
    const xi = verts[i][0];
    const yi = verts[i][1];
    const xj = verts[j][0];
    const yj = verts[j][1];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * True when a closed ring is simple (no proper self-crossings).
 * Consecutive edges and the closing pair are skipped (shared vertices are
 * not crossings); collinear overlaps are allowed so clip-generated spikes
 * and shared farm borders survive.
 */
export function ringIsSimple(closed: LngLat[]): boolean {
  const v = openRing(closed);
  const n = v.length;
  if (n < 3) return false;
  const edge = (i: number): [LngLat, LngLat] => [v[i % n], v[(i + 1) % n]];
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      if (j === i) continue;
      if (j === i + 1) continue; // consecutive
      if (i === 0 && j === n - 1) continue; // closing pair
      const [a1, a2] = edge(i);
      const [b1, b2] = edge(j);
      if (properSegmentsIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}

/**
 * Containment with boundary-touching allowed: every inner vertex must be
 * inside-or-on the outer ring, and no inner edge may PROPERLY cross an
 * outer edge. An identical ring is "within" (single-plot farm support).
 */
export function ringWithinRing(innerClosed: LngLat[], outerClosed: LngLat[]): boolean {
  const inner = openRing(innerClosed);
  const outer = openRing(outerClosed);
  if (inner.length < 3 || outer.length < 3) return false;
  for (const p of inner) {
    if (!pointInRing(p, outerClosed)) return false;
  }
  for (let i = 0; i < inner.length; i++) {
    const a1 = inner[i];
    const a2 = inner[(i + 1) % inner.length];
    for (let j = 0; j < outer.length; j++) {
      const b1 = outer[j];
      const b2 = outer[(j + 1) % outer.length];
      if (properSegmentsIntersect(a1, a2, b1, b2)) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// bbox + clipping + grid partition
// ---------------------------------------------------------------------------

/**
 * Open-path length in meters (no closing edge). For closed-ring perimeter,
 * pass closeRing(ring) — same function, honest about what it measures.
 * Reuses the pinned haversine from lib/business; introduces no new model.
 */
export function pathPerimeterM(pts: LngLat[]): number {
  let total = 0;
  for (let i = 1; i < pts.length; i++) {
    total += distanceMeters(
      { latitude: pts[i - 1][1], longitude: pts[i - 1][0] },
      { latitude: pts[i][1], longitude: pts[i][0] }
    );
  }
  return total;
}

export interface BBox { minX: number; minY: number; maxX: number; maxY: number }

export function bboxOfRing(ring: LngLat[]): BBox {
  const verts = openRing(ring);
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of verts) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}

/**
 * Sutherland–Hodgman clip of a subject ring against an axis-aligned
 * rectangle (convex clip ⇒ exact for concave subjects, up to zero-area
 * spike retracing which collinear cleanup removes).
 */
export function clipPolygonToRect(subjectClosed: LngLat[], rect: BBox): LngLat[] {
  let output = openRing(subjectClosed);
  const edges: Array<{ inside: (p: LngLat) => boolean; intersect: (a: LngLat, b: LngLat) => LngLat }> = [
    {
      inside: (p) => p[0] >= rect.minX - EPS,
      intersect: (a, b) => [rect.minX, a[1] + ((b[1] - a[1]) * (rect.minX - a[0])) / (b[0] - a[0])],
    },
    {
      inside: (p) => p[0] <= rect.maxX + EPS,
      intersect: (a, b) => [rect.maxX, a[1] + ((b[1] - a[1]) * (rect.maxX - a[0])) / (b[0] - a[0])],
    },
    {
      inside: (p) => p[1] >= rect.minY - EPS,
      intersect: (a, b) => [a[0] + ((b[0] - a[0]) * (rect.minY - a[1])) / (b[1] - a[1]), rect.minY],
    },
    {
      inside: (p) => p[1] <= rect.maxY + EPS,
      intersect: (a, b) => [a[0] + ((b[0] - a[0]) * (rect.maxY - a[1])) / (b[1] - a[1]), rect.maxY],
    },
  ];
  for (const { inside, intersect } of edges) {
    if (output.length === 0) return [];
    const input = output;
    output = [];
    let s = input[input.length - 1];
    for (const e of input) {
      if (inside(e)) {
        if (!inside(s)) output.push(intersect(s, e));
        output.push(e);
      } else if (inside(s)) {
        output.push(intersect(s, e));
      }
      s = e;
    }
  }
  return closeRing(removeCollinearPoints(output));
}

/** Drop vertices collinear with their neighbors (post-clip cleanup). */
export function removeCollinearPoints(closed: LngLat[]): LngLat[] {
  const v = openRing(closed);
  if (v.length <= 3) return closeRing(v);
  const out: LngLat[] = [];
  for (let i = 0; i < v.length; i++) {
    const prev = v[(i - 1 + v.length) % v.length];
    const cur = v[i];
    const next = v[(i + 1) % v.length];
    if (samePosition(prev, next)) {
      out.push(cur);
      continue;
    }
    if (onSegment(prev, next, cur)) continue;
    out.push(cur);
  }
  return closeRing(out.length >= 3 ? out : v);
}

export interface GridCell { col: number; row: number; ring: LngLat[]; acres: number }

/**
 * Partition a ring into a cols×rows grid over its bbox, clipping each cell
 * to the ring. Cells whose clipped piece is below minAcres are dropped
 * (concave-edge slivers). Returned pieces are closed rings with acres.
 */
export function gridSplitRing(
  subjectClosed: LngLat[],
  cols: number,
  rows: number,
  minAcres: number
): GridCell[] {
  const box = bboxOfRing(subjectClosed);
  const dx = (box.maxX - box.minX) / cols;
  const dy = (box.maxY - box.minY) / rows;
  const cells: GridCell[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const rect: BBox = {
        minX: box.minX + c * dx,
        minY: box.minY + r * dy,
        maxX: box.minX + (c + 1) * dx,
        maxY: box.minY + (r + 1) * dy,
      };
      const clipped = clipPolygonToRect(subjectClosed, rect);
      if (clipped.length < 4) continue;
      const acres = ringAcres(clipped);
      if (!(acres >= minAcres)) continue;
      cells.push({ col: c, row: r, ring: clipped, acres });
    }
  }
  return cells;
}

/**
 * A label point guaranteed inside-or-on the ring: vertex-mean centroid
 * when it falls inside, otherwise the first ring vertex (exactly ON the
 * fence, hence valid). For plot lat/lng pins, attendance checks, labels.
 */
export function representativePoint(closed: LngLat[]): LngLat {
  const v = openRing(closed);
  let x = 0;
  let y = 0;
  for (const [lng, lat] of v) {
    x += lng;
    y += lat;
  }
  const mean: LngLat = [x / v.length, y / v.length];
  if (pointInRing(mean, closed)) return mean;
  return [closed[0][0], closed[0][1]];
}
