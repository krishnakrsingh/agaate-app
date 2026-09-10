/**
 * track — GPS perimeter-walk sampling, cleaning, and quality assessment.
 *
 * Pure functions only. May import ONLY `./geo-core` (geometry) and
 * `./business` (distanceMeters). No DOM, no geolocation API, no storage —
 * those live in the UI layer. The server runs these SAME functions over
 * submitted raw samples, so client preview and server verdict can never
 * disagree on the math. Server persistence additionally re-validates
 * through the canonical plot/farm paths.
 */

import {
  closeRing,
  ringAcres,
  validatePolygon,
  pathPerimeterM,
  type LngLat,
} from "./geo-core";
import { distanceMeters } from "./business";

/** Raw GPS fix from the device. acc = accuracy radius in meters, t = epoch ms. */
export interface GpsSample {
  lat: number;
  lng: number;
  acc: number;
  t: number;
}

/**
 * Sampling rules — ONE place, no magic numbers elsewhere.
 * Goal: a clean track, not a 20,000-point spaghetti noodle.
 */
export const TRACK = {
  /** Minimum movement since last kept sample. */
  MIN_SAMPLE_DIST_M: 5,
  /** Minimum time since last kept sample. */
  MIN_SAMPLE_INTERVAL_MS: 3000,
  /** Fixes worse than this are dropped entirely. */
  STORE_MAX_ACCURACY_M: 50,
  /** Fixes worse than this are kept but flagged poor. */
  POOR_ACCURACY_M: 25,
  /** Segment faster than this is a GPS jump: latter point dropped. */
  MAX_SEGMENT_SPEED_MPS: 30,
  /** Below this movement = duplicate fix. */
  DUPLICATE_DIST_M: 1,
  /** Hard cap on kept samples per capture (memory + payload). */
  MAX_TRACK_POINTS: 2000,
  /** Finish nudge: within this of start counts as "closed". */
  CLOSURE_SUGGEST_M: 15,
  /** Minimum kept samples for a usable perimeter. */
  MIN_SAMPLES: 8,
  /** Minimum walked perimeter for a usable perimeter. */
  MIN_PERIMETER_M: 30,
  /** Above this the geometry is treated as corrupt, not a farm. */
  MAX_BOUNDARY_ACRES: 50000,
} as const;

export type DropReason =
  | "invalid-coordinate"
  | "poor-accuracy"
  | "too-soon"
  | "too-close"
  | "duplicate"
  | "speed-jump"
  | "track-full";

export interface SampleDecision {
  keep: boolean;
  dropReason?: DropReason;
  /** Kept but GPS was poor — feeds quality WARNING. */
  poor: boolean;
}

function finiteNum(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function validFix(s: GpsSample): boolean {
  return (
    finiteNum(s.lat) && finiteNum(s.lng) && finiteNum(s.acc) && finiteNum(s.t) &&
    s.lat >= -90 && s.lat <= 90 && s.lng >= -180 && s.lng <= 180 && s.acc >= 0
  );
}

/**
 * Per-sample gate: should this fix join the kept track?
 * Stateless except for the last KEPT sample (caller threads it through).
 */
export function decideSample(last: GpsSample | null, s: GpsSample): SampleDecision {
  if (!s || !validFix(s)) return { keep: false, dropReason: "invalid-coordinate", poor: false };
  if (s.acc > TRACK.STORE_MAX_ACCURACY_M) return { keep: false, dropReason: "poor-accuracy", poor: false };
  const poor = s.acc > TRACK.POOR_ACCURACY_M;
  if (!last) return { keep: true, poor };
  const dist = distanceMeters(
    { latitude: last.lat, longitude: last.lng },
    { latitude: s.lat, longitude: s.lng }
  );
  if (dist < TRACK.DUPLICATE_DIST_M) return { keep: false, dropReason: "duplicate", poor: false };
  const dt = s.t - last.t;
  if (!(dt > 0)) return { keep: false, dropReason: "too-soon", poor: false };
  if (dt < TRACK.MIN_SAMPLE_INTERVAL_MS) return { keep: false, dropReason: "too-soon", poor: false };
  if (dist < TRACK.MIN_SAMPLE_DIST_M) return { keep: false, dropReason: "too-close", poor: false };
  if (dist / (dt / 1000) > TRACK.MAX_SEGMENT_SPEED_MPS) {
    return { keep: false, dropReason: "speed-jump", poor: false };
  }
  return { keep: true, poor };
}

export interface CleanedTrack {
  points: GpsSample[];
  dropped: Partial<Record<DropReason, number>>;
  poorCount: number;
  jumpCount: number;
}

/** Run the gate over raw samples in order. Deterministic. */
export function cleanSamples(raw: GpsSample[], maxPoints = TRACK.MAX_TRACK_POINTS): CleanedTrack {
  const points: GpsSample[] = [];
  const dropped: Partial<Record<DropReason, number>> = {};
  let poorCount = 0;
  let jumpCount = 0;
  let last: GpsSample | null = null;
  for (const s of raw) {
    if (points.length >= maxPoints) {
      dropped["track-full"] = (dropped["track-full"] ?? 0) + 1;
      continue;
    }
    const d = decideSample(last, s);
    if (!d.keep) {
      dropped[d.dropReason ?? "invalid-coordinate"] = (dropped[d.dropReason ?? "invalid-coordinate"] ?? 0) + 1;
      if (d.dropReason === "speed-jump") jumpCount++;
      continue;
    }
    if (d.poor) poorCount++;
    points.push(s);
    last = s;
  }
  return { points, dropped, poorCount, jumpCount };
}

/** Open-path walked distance in meters (no closing edge). Delegates to core. */
export function trackPerimeterM(points: GpsSample[]): number {
  return pathPerimeterM(points.map((p) => [p.lng, p.lat] as LngLat));
}

/** Gap between last and first kept sample. Zero when <2 points. */
export function closureGapM(points: GpsSample[]): number {
  if (points.length < 2) return Number.POSITIVE_INFINITY;
  const a = points[0];
  const b = points[points.length - 1];
  return distanceMeters(
    { latitude: a.lat, longitude: a.lng },
    { latitude: b.lat, longitude: b.lng }
  );
}

export function samplesToRing(points: GpsSample[]): LngLat[] {
  return closeRing(points.map((p) => [p.lng, p.lat] as LngLat));
}

export type TrackQuality = "GOOD" | "WARNING" | "INVALID";

export interface QualityReport {
  quality: TrackQuality;
  reasons: string[];
  ring: LngLat[] | null;
  acres: number;
  perimeterM: number;
  closureGapM: number;
  samples: number;
  poorCount: number;
  jumpCount: number;
}

/**
 * Assess a CLEANED track. INVALID = cannot become a polygon (with reasons).
 * WARNING = usable but the officer should know why. GOOD = clean walk.
 * Never silently rewrites geometry: the ring is the walked points, closed.
 */
export function assessTrack(cleaned: CleanedTrack): QualityReport {
  const { points, poorCount, jumpCount } = cleaned;
  const base = {
    ring: null as LngLat[] | null,
    acres: 0,
    perimeterM: trackPerimeterM(points),
    closureGapM: closureGapM(points),
    samples: points.length,
    poorCount,
    jumpCount,
  };
  if (points.length < TRACK.MIN_SAMPLES) {
    return {
      ...base,
      quality: "INVALID",
      reasons: [`Need at least ${TRACK.MIN_SAMPLES} GPS samples for a perimeter (got ${points.length}). Keep walking.`],
    };
  }
  if (base.perimeterM < TRACK.MIN_PERIMETER_M) {
    return {
      ...base,
      quality: "INVALID",
      reasons: [`Walked perimeter is only ${Math.round(base.perimeterM)}m — need at least ${TRACK.MIN_PERIMETER_M}m for a real boundary.`],
    };
  }
  const ring = samplesToRing(points);
  const errors = validatePolygon(ring);
  if (errors.length > 0) {
    return { ...base, ring, quality: "INVALID", reasons: errors };
  }
  const acres = ringAcres(ring);
  if (!(acres <= TRACK.MAX_BOUNDARY_ACRES)) {
    return {
      ...base,
      ring,
      acres,
      quality: "INVALID",
      reasons: [`Captured area (${Math.round(acres).toLocaleString()} ac) is implausibly large — GPS data looks corrupt. Discard and re-walk.`],
    };
  }
  const reasons: string[] = [];
  if (poorCount > 0) reasons.push(`${poorCount} sample${poorCount === 1 ? " was" : "s were"} captured with poor GPS accuracy — boundary edges here are approximate.`);
  if (jumpCount > 0) reasons.push(`${jumpCount} GPS jump${jumpCount === 1 ? " was" : "s were"} removed — check the track for straight-line cuts.`);
  if (base.closureGapM > TRACK.CLOSURE_SUGGEST_M) {
    reasons.push(
      `Track ends ${Math.round(base.closureGapM)}m from the start — walk back to the start marker or finish anyway (the server closes the ring as drawn).`
    );
  }
  return {
    ...base,
    ring,
    acres,
    quality: reasons.length > 0 ? "WARNING" : "GOOD",
    reasons,
  };
}

/** "Near starting point — finish boundary?" nudge (never auto-saves). */
export function nearStart(points: GpsSample[]): boolean {
  if (points.length < TRACK.MIN_SAMPLES) return false;
  if (trackPerimeterM(points) < TRACK.MIN_PERIMETER_M) return false;
  return closureGapM(points) <= TRACK.CLOSURE_SUGGEST_M;
}
