import { describe, it, expect } from "vitest";
import {
  ringAcres,
  parseBoundaryToRing,
  toGeoJsonPolygon,
  validatePolygon,
  pointInRing,
  onSegment,
  properSegmentsIntersect,
  ringIsSimple,
  ringWithinRing,
  bboxOfRing,
  clipPolygonToRect,
  removeCollinearPoints,
  gridSplitRing,
  representativePoint,
  closeRing,
  type LngLat,
} from "./geo-core";

// ~1 acre square near lat 13 (side ≈ 63.615m ≈ 0.0005729° lng, 0.0005737° lat)
const ACRE_SQ: LngLat[] = [
  [77.5946, 13.0827],
  [77.5951729, 13.0827],
  [77.5951729, 13.0832737],
  [77.5946, 13.0832737],
  [77.5946, 13.0827],
];

const FARM: LngLat[] = [
  [77.59, 13.08],
  [77.61, 13.08],
  [77.61, 13.1],
  [77.59, 13.1],
  [77.59, 13.08],
];

describe("geo-core: area", () => {
  it("computes ~1 acre for a known square", () => {
    const a = ringAcres(ACRE_SQ);
    expect(a).toBeGreaterThan(0.98);
    expect(a).toBeLessThan(1.02);
  });
  it("is absolute (winding independent)", () => {
    expect(ringAcres([...ACRE_SQ].reverse())).toBeCloseTo(ringAcres(ACRE_SQ), 9);
  });
  it("returns 0 for degenerate input", () => {
    expect(ringAcres([])).toBe(0);
    expect(ringAcres([[0, 0], [1, 1]])).toBe(0);
  });
});

describe("geo-core: parse + canonical form", () => {
  it("parses canonical GeoJSON and legacy arrays identically", () => {
    const geo = toGeoJsonPolygon(ACRE_SQ.slice(0, 4));
    const a = parseBoundaryToRing(geo)!;
    const b = parseBoundaryToRing(JSON.stringify(ACRE_SQ.slice(0, 4).map(([lng, lat]) => ({ lat, lng }))))!;
    expect(a).toEqual(b);
    expect(a[0]).toEqual(a[a.length - 1]);
  });
  it("returns null for absent input, throws for garbage", () => {
    expect(parseBoundaryToRing(null)).toBeNull();
    expect(parseBoundaryToRing("")).toBeNull();
    expect(parseBoundaryToRing([])).toBeNull();
    expect(() => parseBoundaryToRing("not-json{{{")).toThrow(/valid JSON/i);
  });
  it("validatePolygon accepts open rings, rejects empties", () => {
    expect(validatePolygon(toGeoJsonPolygon(ACRE_SQ.slice(0, 4)))).toEqual([]);
    expect(validatePolygon(null)).toEqual(["Boundary is required."]);
  });
});

describe("geo-core: point-in-ring (boundary inclusive)", () => {
  it("inside / outside / on-edge / on-vertex", () => {
    expect(pointInRing([77.6, 13.09], FARM)).toBe(true);
    expect(pointInRing([77.62, 13.09], FARM)).toBe(false);
    expect(pointInRing([77.6, 13.08], FARM)).toBe(true); // on edge
    expect(pointInRing([77.59, 13.08], FARM)).toBe(true); // on vertex
  });
  it("onSegment detects endpoints and midpoints only", () => {
    expect(onSegment([0, 0], [2, 0], [1, 0])).toBe(true);
    expect(onSegment([0, 0], [2, 0], [0, 0])).toBe(true);
    expect(onSegment([0, 0], [2, 0], [3, 0])).toBe(false);
    expect(onSegment([0, 0], [2, 0], [1, 1])).toBe(false);
  });
});

describe("geo-core: segment intersection (touching is legal)", () => {
  it("detects proper crossings", () => {
    expect(properSegmentsIntersect([0, 0], [2, 2], [0, 2], [2, 0])).toBe(true);
  });
  it("allows endpoint touches and collinear overlaps", () => {
    expect(properSegmentsIntersect([0, 0], [2, 0], [2, 0], [2, 2])).toBe(false);
    expect(properSegmentsIntersect([0, 0], [4, 0], [1, 0], [3, 0])).toBe(false);
    expect(properSegmentsIntersect([0, 0], [2, 0], [3, 0], [5, 0])).toBe(false);
  });
});

describe("geo-core: simplicity", () => {
  it("accepts simple rings, rejects bowties", () => {
    expect(ringIsSimple(FARM)).toBe(true);
    const bowtie: LngLat[] = [[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]];
    expect(ringIsSimple(bowtie)).toBe(false);
  });
  it("rejects self-intersecting polygons in validation", () => {
    const bowtie = JSON.stringify({ type: "Polygon", coordinates: [[[[0, 0], [2, 2], [2, 0], [0, 2], [0, 0]]]] });
    // note: lng 2/lat 2 in range; shape self-crosses
    const errs = validatePolygon(JSON.stringify({ type: "Polygon", coordinates: [[[0, 0], [0.01, 0.01], [0.01, 0], [0, 0.01], [0, 0]]] }));
    expect(errs.some((e) => /cross itself|itself/i.test(e))).toBe(true);
    expect(bowtie).toContain("Polygon");
  });
});

describe("geo-core: containment (touching allowed)", () => {
  const inner: LngLat[] = [[77.595, 13.085], [77.6, 13.085], [77.6, 13.09], [77.595, 13.09], [77.595, 13.085]];
  it("strictly-inside plot passes", () => {
    expect(ringWithinRing(inner, FARM)).toBe(true);
  });
  it("plot sharing the farm border passes", () => {
    const touching: LngLat[] = [[77.59, 13.085], [77.6, 13.085], [77.6, 13.09], [77.59, 13.09], [77.59, 13.085]];
    expect(ringWithinRing(touching, FARM)).toBe(true);
  });
  it("identical ring (single-plot farm) passes", () => {
    expect(ringWithinRing(FARM, FARM)).toBe(true);
  });
  it("plot 1m outside the fence fails", () => {
    const outside: LngLat[] = [[77.61001, 13.085], [77.615, 13.085], [77.615, 13.09], [77.61001, 13.09], [77.61001, 13.085]];
    expect(ringWithinRing(outside, FARM)).toBe(false);
  });
  it("straddling plot fails", () => {
    const straddle: LngLat[] = [[77.605, 13.085], [77.615, 13.085], [77.615, 13.09], [77.605, 13.09], [77.605, 13.085]];
    expect(ringWithinRing(straddle, FARM)).toBe(false);
  });
});

describe("geo-core: clip + grid partition", () => {
  it("bbox of ring is exact", () => {
    expect(bboxOfRing(FARM)).toEqual({ minX: 77.59, minY: 13.08, maxX: 77.61, maxY: 13.1 });
  });
  it("clip conserves area on concave subjects", () => {
    const concave: LngLat[] = closeRing([[0, 0], [4, 0], [4, 4], [2, 4], [2, 2], [0, 2]]);
    const before = ringAcres(concave);
    const clipped = clipPolygonToRect(concave, { minX: 0, minY: 0, maxX: 4, maxY: 4 });
    expect(Math.abs(ringAcres(clipped) - before) / before).toBeLessThan(0.001);
    expect(ringIsSimple(clipped)).toBe(true);
  });
  it("2x2 grid partitions ≈ farm area, every cell within + simple", () => {
    const farmAcres = ringAcres(FARM);
    const cells = gridSplitRing(FARM, 2, 2, 0.05);
    expect(cells).toHaveLength(4);
    const sum = cells.reduce((s, c) => s + c.acres, 0);
    expect(Math.abs(sum - farmAcres) / farmAcres).toBeLessThan(0.005);
    for (const c of cells) {
      expect(ringWithinRing(c.ring, FARM)).toBe(true);
      expect(ringIsSimple(c.ring)).toBe(true);
      expect(validatePolygon(toGeoJsonPolygon(c.ring))).toEqual([]);
    }
  });
  it("3x2 grid on a concave farm drops slivers, keeps coverage", () => {
    const concave: LngLat[] = closeRing([[77.59, 13.08], [77.61, 13.08], [77.61, 13.1], [77.6, 13.1], [77.6, 13.09], [77.59, 13.09]]);
    const farmAcres = ringAcres(concave);
    const cells = gridSplitRing(concave, 3, 2, Math.max(0.05, farmAcres * 0.01));
    expect(cells.length).toBeGreaterThan(0);
    const sum = cells.reduce((s, c) => s + c.acres, 0);
    expect(sum / farmAcres).toBeGreaterThan(0.9);
    for (const c of cells) {
      expect(ringWithinRing(c.ring, concave)).toBe(true);
      expect(ringIsSimple(c.ring)).toBe(true);
    }
  });
  it("rejects polygons with holes (would silently overstate area)", () => {
    const outer = [[0, 0], [0.01, 0], [0.01, 0.01], [0, 0.01], [0, 0]];
    const hole = [[0.002, 0.002], [0.008, 0.002], [0.008, 0.008], [0.002, 0.008], [0.002, 0.002]];
    const errs = validatePolygon(JSON.stringify({ type: "Polygon", coordinates: [outer, hole] }));
    expect(errs.some((e) => /exactly one linear ring/i.test(e))).toBe(true);
    expect(() => parseBoundaryToRing(JSON.stringify({ type: "Polygon", coordinates: [outer, hole] }))).toThrow(/exactly one linear ring/i);
  });
  it("representativePoint stays inside concave rings (falls back to a vertex when the mean lands in a void)", () => {
    const uShape: LngLat[] = closeRing([[0, 0], [6, 0], [6, 6], [4, 6], [4, 2], [2, 2], [2, 6], [0, 6]]);
    // vertex mean (3, 3.5) sits in the U void → must fall back, still valid
    const p = representativePoint(uShape);
    expect(pointInRing(p, uShape)).toBe(true);
    const convex = representativePoint(FARM);
    expect(pointInRing(convex, FARM)).toBe(true);
    expect(convex).toEqual([77.6, 13.09]);
  });
  it("collinear cleanup preserves shape and area", () => {
    const messy: LngLat[] = closeRing([[0, 0], [1, 0], [2, 0], [2, 1], [0, 1]]);
    const clean = removeCollinearPoints(messy);
    expect(clean.length).toBe(5); // 4 corners + closure
    expect(ringAcres(clean)).toBeCloseTo(ringAcres(messy), 9);
  });
});
