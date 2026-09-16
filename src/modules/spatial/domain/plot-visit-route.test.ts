import { describe, it, expect } from "vitest";
import { planVisitRoute } from "./plot-visits";
import type { LngLat } from "./geo-core";

const sq = (x0: number, y0: number): LngLat[] => [
  [x0, y0],
  [x0 + 0.01, y0],
  [x0 + 0.01, y0 + 0.01],
  [x0, y0 + 0.01],
  [x0, y0],
];

const visits = [
  { plotId: "east", name: "East", status: "MISSED" as const, lastVisitAt: null, via: null },
  { plotId: "west", name: "West", status: "NEVER" as const, lastVisitAt: null, via: null },
  { plotId: "visited", name: "Done", status: "VISITED" as const, lastVisitAt: null, via: null },
  { plotId: "nofence", name: "No fence", status: "NEVER" as const, lastVisitAt: null, via: null },
];

const fences = {
  east: sq(77.61, 13.08),
  west: sq(77.59, 13.08),
  visited: sq(77.59, 13.09),
  nofence: null,
};

describe("planVisitRoute", () => {
  it("orders nearest-first; visited and unfenced excluded from stops", () => {
    const r = planVisitRoute({ lat: 13.085, lng: 77.585 }, visits, fences);
    expect(r.stops.map((s) => s.plotId)).toEqual(["west", "east"]);
    expect(r.unroutable).toEqual([{ plotId: "nofence", name: "No fence" }]);
    expect(r.stops[0].legMeters).toBeGreaterThan(0);
    expect(r.stops[1].legMeters).toBeGreaterThan(0);
    expect(r.totalMeters).toBe(r.stops[0].legMeters + r.stops[1].legMeters);
  });
  it("empty targets → empty route", () => {
    const r = planVisitRoute({ lat: 13, lng: 77 }, [
      { plotId: "a", name: "A", status: "VISITED", lastVisitAt: null, via: null },
    ], { a: sq(77.59, 13.08) });
    expect(r.stops).toEqual([]);
    expect(r.totalMeters).toBe(0);
  });
  it("single stop totals = single leg", () => {
    const r = planVisitRoute({ lat: 13.085, lng: 77.6 }, [visits[0]], fences);
    expect(r.stops).toHaveLength(1);
    expect(r.totalMeters).toBe(r.stops[0].legMeters);
  });
});
