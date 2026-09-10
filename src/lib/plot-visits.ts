/**
 * plot-visits — "which plots have seen boots recently?" Pure engine.
 *
 * A plot counts as VISITED when, inside the window, any of:
 * - a task execution completed on a task linked to the plot
 * - an attendance GPS fix (start or end) falls inside the plot polygon
 * - field activity landed on the plot (monitoring / incident / harvest)
 * Plots without a drawn fence cannot use the GPS signal (documented).
 * NEVER = no completion and no activity on record + no GPS hit in window.
 */

import { pointInRing, parseBoundaryToRing, representativePoint, type LngLat } from "./geo-core";
import { distanceMeters } from "./business";

export interface VisitPlot {
  id: string;
  name: string;
  boundaryGeoJson: string | null;
}

export interface PlotVisit {
  plotId: string;
  name: string;
  status: "VISITED" | "MISSED" | "NEVER";
  lastVisitAt: string | null;
  via: "task completion" | "field presence (GPS)" | "field activity" | null;
}

function ringOf(boundaryGeoJson: string | null): LngLat[] | null {
  if (!boundaryGeoJson) return null;
  try {
    return parseBoundaryToRing(boundaryGeoJson);
  } catch {
    return null;
  }
}

export function computePlotVisits(input: {
  plots: VisitPlot[];
  /** completedAt ISO per plot (all-time max), for NEVER detection. */
  completionsAllTime: Record<string, string>;
  /** completedAt ISO per plot inside the window. */
  completionsInWindow: Record<string, string>;
  /** field activity (monitoring/incident/harvest) max createdAt per plot. */
  activityAllTime: Record<string, string>;
  activityInWindow: Record<string, string>;
  /** attendance GPS fixes inside the window. */
  fixes: { lat: number; lng: number; at: string }[];
  windowStartIso: string;
}): PlotVisit[] {
  return input.plots.map((plot) => {
    const ring = ringOf(plot.boundaryGeoJson);
    // GPS signal: any in-window fix inside this plot's fence.
    let gpsAt: string | null = null;
    if (ring) {
      for (const f of input.fixes) {
        if (f.at >= input.windowStartIso && pointInRing([f.lng, f.lat], ring)) {
          if (!gpsAt || f.at > gpsAt) gpsAt = f.at;
        }
      }
    }
    const candidates: { at: string; via: PlotVisit["via"] }[] = [];
    if (input.completionsInWindow[plot.id]) {
      candidates.push({ at: input.completionsInWindow[plot.id], via: "task completion" });
    }
    if (gpsAt) candidates.push({ at: gpsAt, via: "field presence (GPS)" });
    if (input.activityInWindow[plot.id]) {
      candidates.push({ at: input.activityInWindow[plot.id], via: "field activity" });
    }
    if (candidates.length > 0) {
      candidates.sort((a, b) => (a.at < b.at ? 1 : -1));
      return { plotId: plot.id, name: plot.name, status: "VISITED", lastVisitAt: candidates[0].at, via: candidates[0].via };
    }
    const ever = input.completionsAllTime[plot.id] ?? input.activityAllTime[plot.id] ?? null;
    if (ever) return { plotId: plot.id, name: plot.name, status: "MISSED", lastVisitAt: ever, via: null };
    return { plotId: plot.id, name: plot.name, status: "NEVER", lastVisitAt: null, via: null };
  });
}

export interface RouteStop {
  plotId: string;
  name: string;
  status: "MISSED" | "NEVER";
  lat: number;
  lng: number;
  /** Meters from the previous stop (0 for the first). */
  legMeters: number;
}

/**
 * Greedy nearest-neighbor walking order over unvisited fenced plots.
 * Unfenced plots cannot be routed (no centroid) and are returned
 * separately — never silently dropped, never faked.
 */
export function planVisitRoute(
  start: { lat: number; lng: number },
  visits: PlotVisit[],
  fences: Record<string, LngLat[] | null>
): { stops: RouteStop[]; unroutable: { plotId: string; name: string }[]; totalMeters: number } {
  const targets = visits.filter((v) => v.status !== "VISITED");
  const routable: { visit: PlotVisit; lat: number; lng: number }[] = [];
  const unroutable: { plotId: string; name: string }[] = [];
  for (const v of targets) {
    const ring = fences[v.plotId];
    if (!ring) {
      unroutable.push({ plotId: v.plotId, name: v.name });
      continue;
    }
    const [lng, lat] = representativePoint(ring);
    routable.push({ visit: v, lat, lng });
  }
  const stops: RouteStop[] = [];
  let curLat = start.lat;
  let curLng = start.lng;
  let totalMeters = 0;
  const remaining = [...routable];
  while (remaining.length > 0) {
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < remaining.length; i++) {
      const d = distanceMeters(
        { latitude: curLat, longitude: curLng },
        { latitude: remaining[i].lat, longitude: remaining[i].lng }
      );
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }
    const [next] = remaining.splice(best, 1);
    totalMeters += bestDist;
    stops.push({
      plotId: next.visit.plotId,
      name: next.visit.name,
      status: next.visit.status === "MISSED" ? "MISSED" : "NEVER",
      lat: next.lat,
      lng: next.lng,
      legMeters: Math.round(bestDist),
    });
    curLat = next.lat;
    curLng = next.lng;
  }
  return { stops, unroutable, totalMeters: Math.round(totalMeters) };
}
