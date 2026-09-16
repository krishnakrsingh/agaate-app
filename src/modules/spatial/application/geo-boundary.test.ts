import { describe, it, expect } from "vitest";
import { normalizeToGeoJson, ringAcres, parseBoundary } from "./geo-server";

describe("geo-server boundary (pure, no DB/auth)", () => {
  it("normalizes legacy [{lat,lng}] array to canonical GeoJSON Polygon", () => {
    const legacy = [
      { lat: 13.0827, lng: 77.5946 },
      { lat: 13.0827, lng: 77.6046 },
      { lat: 13.0927, lng: 77.6046 },
      { lat: 13.0927, lng: 77.5946 },
    ];
    // raw array form
    const fromArray = normalizeToGeoJson(legacy);
    expect(fromArray).toBeTruthy();
    const parsedArray = JSON.parse(fromArray!);
    expect(parsedArray.type).toBe("Polygon");
    expect(parsedArray.coordinates[0]).toHaveLength(5); // 4 + auto-closed
    expect(parsedArray.coordinates[0][0]).toEqual([77.5946, 13.0827]); // [lng,lat] order
    const first = parsedArray.coordinates[0][0];
    const last = parsedArray.coordinates[0][parsedArray.coordinates[0].length - 1];
    expect(last).toEqual(first); // closed ring

    // stringified legacy form (what the onboarding UI sends today)
    const fromString = normalizeToGeoJson(JSON.stringify(legacy));
    expect(fromString).toBe(fromArray);

    // canonical form passes through normalized
    const canonical = JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [77.5946, 13.0827],
          [77.6046, 13.0827],
          [77.6046, 13.0927],
          [77.5946, 13.0927],
          [77.5946, 13.0827],
        ],
      ],
    });
    const fromCanonical = normalizeToGeoJson(canonical);
    expect(JSON.parse(fromCanonical!).type).toBe("Polygon");
    expect(parseBoundary(canonical)!.acres).toBeGreaterThan(0);
  });

  it("computes ~1-acre square within 2% (spherical, R=6378137)", () => {
    const R = 6378137;
    const degMeters = (2 * Math.PI * R) / 360;
    const sideM = Math.sqrt(4046.8564224); // 1 acre square side
    const d = sideM / degMeters;
    const ring: [number, number][] = [
      [0, 0],
      [d, 0],
      [d, d],
      [0, d],
      [0, 0],
    ];
    const acres = ringAcres(ring);
    expect(acres).toBeGreaterThan(0.98);
    expect(acres).toBeLessThan(1.02);
  });

  it("rejects garbage string", () => {
    expect(() => normalizeToGeoJson("not-json{{{")).toThrow(/valid JSON/i);
  });

  it("rejects polygon with only 2 points", () => {
    const two = [
      { lat: 13.0827, lng: 77.5946 },
      { lat: 13.0837, lng: 77.5956 },
    ];
    expect(() => normalizeToGeoJson(JSON.stringify(two))).toThrow(/at least 4 positions/i);
    expect(() => normalizeToGeoJson(two)).toThrow(/at least 4 positions/i);
  });

  it("rejects out-of-range longitude", () => {
    const bad = [
      { lat: 13.0827, lng: 77.5946 },
      { lat: 13.0827, lng: 200 }, // invalid lng
      { lat: 13.0927, lng: 77.6046 },
      { lat: 13.0927, lng: 77.5946 },
    ];
    expect(() => normalizeToGeoJson(JSON.stringify(bad))).toThrow(/longitude.*\[-180,180\]/i);
  });

  it("rejects 600-point polygon (limit 500)", () => {
    const pts = Array.from({ length: 600 }, (_, i) => {
      const a = (i / 600) * 2 * Math.PI;
      return { lat: 13.0827 + 0.001 * Math.sin(a), lng: 77.5946 + 0.001 * Math.cos(a) };
    });
    expect(() => normalizeToGeoJson(JSON.stringify(pts))).toThrow(/must not exceed 500/i);
  });

  it("rejects zero-area (degenerate) polygon", () => {
    const flat = [
      { lat: 10, lng: 77 },
      { lat: 10, lng: 77 },
      { lat: 10, lng: 77 },
      { lat: 10, lng: 77 },
    ];
    expect(() => normalizeToGeoJson(JSON.stringify(flat))).toThrow(/greater than 0.001/i);
  });
});
