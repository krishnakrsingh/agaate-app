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

import { pointInRing, parseBoundaryToRing, type LngLat } from "./geo-core";

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
