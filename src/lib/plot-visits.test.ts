import { describe, it, expect } from "vitest";
import { computePlotVisits } from "./plot-visits";

const RING = JSON.stringify({
  type: "Polygon",
  coordinates: [[[77.59, 13.08], [77.61, 13.08], [77.61, 13.1], [77.59, 13.1], [77.59, 13.08]]],
});
const NOW = "2026-09-10T12:00:00.000Z";
const START = "2026-08-27T00:00:00.000Z"; // 14d window
const OLD = "2026-07-01T12:00:00.000Z";

const plots = [
  { id: "p1", name: "Visited", boundaryGeoJson: RING },
  { id: "p2", name: "Missed", boundaryGeoJson: RING },
  { id: "p3", name: "Never", boundaryGeoJson: RING },
  { id: "p4", name: "Unfenced", boundaryGeoJson: null },
];

describe("plot-visits: pure engine", () => {
  it("visited via task completion (latest wins)", () => {
    const rows = computePlotVisits({
      plots,
      completionsAllTime: { p1: NOW },
      completionsInWindow: { p1: NOW },
      activityAllTime: {},
      activityInWindow: {},
      fixes: [],
      windowStartIso: START,
    });
    const p1 = rows.find((r) => r.plotId === "p1")!;
    expect(p1).toMatchObject({ status: "VISITED", lastVisitAt: NOW, via: "task completion" });
  });

  it("visited via GPS inside fence; outside fixes ignored", () => {
    const rows = computePlotVisits({
      plots,
      completionsAllTime: {},
      completionsInWindow: {},
      activityAllTime: {},
      activityInWindow: {},
      fixes: [
        { lat: 13.09, lng: 77.6, at: NOW }, // inside
        { lat: 13.5, lng: 78.0, at: NOW }, // far outside every plot
      ],
      windowStartIso: START,
    });
    const byId = Object.fromEntries(rows.map((r) => [r.plotId, r]));
    expect(byId.p1).toMatchObject({ status: "VISITED", via: "field presence (GPS)" });
    expect(byId.p2.status).toBe("VISITED"); // same fence in fixture
    expect(byId.p4.status).toBe("NEVER"); // unfenced: no GPS signal
  });

  it("visited via field activity", () => {
    const rows = computePlotVisits({
      plots,
      completionsAllTime: {},
      completionsInWindow: {},
      activityAllTime: { p1: NOW },
      activityInWindow: { p1: NOW },
      fixes: [],
      windowStartIso: START,
    });
    expect(rows.find((r) => r.plotId === "p1")).toMatchObject({ status: "VISITED", via: "field activity" });
  });

  it("missed when only old signals; never when none", () => {
    const rows = computePlotVisits({
      plots,
      completionsAllTime: { p2: OLD },
      completionsInWindow: {},
      activityAllTime: {},
      activityInWindow: {},
      fixes: [],
      windowStartIso: START,
    });
    const byId = Object.fromEntries(rows.map((r) => [r.plotId, r]));
    expect(byId.p2).toMatchObject({ status: "MISSED", lastVisitAt: OLD, via: null });
    expect(byId.p3).toMatchObject({ status: "NEVER", lastVisitAt: null, via: null });
  });

  it("out-of-window fixes do not count", () => {
    const rows = computePlotVisits({
      plots,
      completionsAllTime: {},
      completionsInWindow: {},
      activityAllTime: {},
      activityInWindow: {},
      fixes: [{ lat: 13.09, lng: 77.6, at: OLD }],
      windowStartIso: START,
    });
    expect(rows.every((r) => r.status !== "VISITED")).toBe(true);
  });
});
