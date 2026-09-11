/**
 * attendance-geo — the ONE canonical server-side location authorizer for
 * attendance check-in/out. Every geofence decision in the app funnels
 * through `validateAttendanceLocation`. No route may inline its own
 * containment, radius, or coordinate checks.
 *
 * Precedence (narrowing only — a plot can never widen the farm):
 *   1. GPS sanity (finite, ranges, accuracy gate)
 *   2. Plot polygon (when the attendance names a plot that has one):
 *      inside = insidePlot AND insideFarm (when the farm is fenced)
 *   3. Farm polygon (when the farm is fenced)
 *   4. Legacy radius: haversine(farm centroid, point) <= radius
 *
 * Boundary-inclusive everywhere (a point ON a fence counts as inside).
 * A farm with no (or unreadable) polygon falls back to radius — legacy
 * unfenced farms behave byte-identically to before.
 *
 * distanceMeters is ALWAYS haversine-to-farm-centroid (even for polygon
 * decisions) so AttendanceException rows keep stable semantics. It reuses
 * lib/business distanceMeters — the pinned implementation — never a copy.
 * Pure functions only: no Prisma, no request objects.
 */

import { pointInRing, parseBoundaryToRing, type LngLat } from "./geo-core";
import { distanceMeters } from "./business";

export type GeofenceBasis = "PLOT_POLYGON" | "FARM_POLYGON" | "RADIUS";
export interface FarmGeoInput {
  latitude: number | string | { toString(): string };
  longitude: number | string | { toString(): string };
  geofenceRadiusMeters: number | string | { toString(): string };
  boundaryGeoJson: string | null;
}

export interface PlotGeoInput {
  farmId: string;
  boundaryGeoJson: string | null;
  deletedAt?: Date | string | null;
  status?: string | null;
}

export interface AttendanceLocationOk {
  ok: true;
  inside: boolean;
  basis: GeofenceBasis;
  distanceMeters: number;
}

export interface AttendanceLocationErr {
  ok: false;
  code: "GPS_INVALID" | "GPS_ACCURACY_POOR" | "PLOT_FARM_MISMATCH";
  message: string;
  status: 422;
}

export type AttendanceLocationResult = AttendanceLocationOk | AttendanceLocationErr;

/** GPS fixes coarser than this are rejected as unverifiable (meters). */
export const MAX_GPS_ACCURACY_METERS = 1000;
function num(v: unknown): number {
  return typeof v === "number" ? v : Number(String(v));
}

function parseRingTolerant(boundaryGeoJson: string | null): LngLat[] | null {
  if (!boundaryGeoJson) return null;
  try {
    return parseBoundaryToRing(boundaryGeoJson);
  } catch {
    return null; // corrupt fence behaves as no fence (radius fallback)
  }
}

/**
 * Authoritative location decision. `plot` is the attendance's plot record
 * (or null when the attendance is farm-level). Never throws on bad input —
 * returns a coded 422 instead. Throws never; pure always.
 */
export function validateAttendanceLocation(input: {
  lat: unknown;
  lng: unknown;
  accuracyMeters?: unknown;
  farmId: string;
  farm: FarmGeoInput;
  plot?: PlotGeoInput | null;
}): AttendanceLocationResult {
  const lat = num(input.lat);
  const lng = num(input.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    return { ok: false, code: "GPS_INVALID", message: "GPS coordinates are invalid.", status: 422 };
  }
  if (input.accuracyMeters !== undefined && input.accuracyMeters !== null) {
    const acc = num(input.accuracyMeters);
    if (!Number.isFinite(acc) || acc < 0) {
      return { ok: false, code: "GPS_INVALID", message: "GPS coordinates are invalid.", status: 422 };
    }
    if (acc > MAX_GPS_ACCURACY_METERS) {
      return {
        ok: false,
        code: "GPS_ACCURACY_POOR",
        message: "GPS fix is too coarse to verify presence. Move to open sky and retry.",
        status: 422,
      };
    }
  }

  const farmLat = num(input.farm.latitude);
  const farmLng = num(input.farm.longitude);
  const radius = num(input.farm.geofenceRadiusMeters);
  const distance = distanceMeters({ latitude: farmLat, longitude: farmLng }, { latitude: lat, longitude: lng });
  const pt: LngLat = [lng, lat];

  const plot = input.plot ?? null;
  if (plot && plot.farmId !== input.farmId) {
    return {
      ok: false,
      code: "PLOT_FARM_MISMATCH",
      message: "The selected plot does not belong to this farm.",
      status: 422,
    };
  }
  // Archived/deleted plots lose their fence authority (fall through to farm).
  const plotAlive = plot && !plot.deletedAt && plot.status !== "ARCHIVED";
  const plotRing = plotAlive ? parseRingTolerant(plot!.boundaryGeoJson) : null;
  const farmRing = parseRingTolerant(input.farm.boundaryGeoJson);

  if (plotRing) {
    const insidePlot = pointInRing(pt, plotRing);
    const insideFarm = farmRing ? pointInRing(pt, farmRing) : true;
    return { ok: true, inside: insidePlot && insideFarm, basis: "PLOT_POLYGON", distanceMeters: distance };
  }
  if (farmRing) {
    return { ok: true, inside: pointInRing(pt, farmRing), basis: "FARM_POLYGON", distanceMeters: distance };
  }
  return { ok: true, inside: distance <= radius, basis: "RADIUS", distanceMeters: distance };
}

/**
 * Display-side verdict for list screens (roster, dashboards). Same canonical
 * math, evaluated over STORED check-in GPS — never fresh coordinates, never
 * a parallel formula. `inside` is always recomputed (identical inputs give
 * identical answers unless the fence changed since check-in); `basis`
 * prefers the basis stored at write time (historical truth), falling back
 * to the recomputed one for pre-Phase-3 rows. Rows without stored GPS keep
 * the legacy default of inside=true.
 */
export function attendanceDisplayVerdict(input: {
  startLat: number | null;
  startLng: number | null;
  farmId: string;
  farm: FarmGeoInput;
  plot?: PlotGeoInput | null;
  storedBasis?: string | null;
}): { inside: boolean; basis: GeofenceBasis } {
  const fallbackBasis = (input.storedBasis as GeofenceBasis | null) ?? "RADIUS";
  if (input.startLat === null || input.startLng === null) {
    return { inside: true, basis: fallbackBasis };
  }
  const attempt = (plot: PlotGeoInput | null) =>
    validateAttendanceLocation({
      lat: input.startLat as number,
      lng: input.startLng as number,
      farmId: input.farmId,
      farm: input.farm,
      plot,
    });
  let r = attempt(input.plot ?? null);
  if (!r.ok && input.plot) r = attempt(null);
  if (!r.ok) return { inside: true, basis: fallbackBasis };
  return { inside: r.inside, basis: (input.storedBasis as GeofenceBasis | null) ?? r.basis };
}
