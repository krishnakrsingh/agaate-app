import { describe, it, expect } from "vitest";
import { parseBoundary, toGeoJsonPolygon, ringAcres, validatePolygon } from "./geo";

const SQ_METERS_PER_ACRE = 4046.8564224;
const EARTH_RADIUS = 6378137;

describe("geo boundary helpers", () => {
  it("computes ~1 acre for a ~63.6m square near lat 13 (within 2%)", () => {
    // Exact-on-sphere square: side = sqrt(1 acre) built from arc lengths.
    const sideMeters = Math.sqrt(SQ_METERS_PER_ACRE); // ~63.615m
    const lat0 = 13;
    const lng0 = 77.5946;
    const dLat = ((sideMeters / EARTH_RADIUS) * 180) / Math.PI;
    const dLng = ((sideMeters / (EARTH_RADIUS * Math.cos((lat0 * Math.PI) / 180))) * 180) / Math.PI;
    const ring: Array<[number, number]> = [
      [lng0, lat0],
      [lng0 + dLng, lat0],
      [lng0 + dLng, lat0 + dLat],
      [lng0, lat0 + dLat],
      [lng0, lat0],
    ];
    const acres = ringAcres(ring);
    expect(Math.abs(acres - 1) / 1).toBeLessThan(0.02);
  });

  it("parses a legacy [{lat,lng}] array string into a closed [lng,lat] ring", () => {
    const legacy = JSON.stringify([
      { lat: 13.0827, lng: 77.5946 },
      { lat: 13.0827, lng: 77.6046 },
      { lat: 13.0927, lng: 77.6046 },
      { lat: 13.0927, lng: 77.5946 },
    ]);
    const ring = parseBoundary(legacy);
    expect(ring).not.toBeNull();
    expect(ring).toHaveLength(5);
    expect(ring![0]).toEqual([77.5946, 13.0827]);
    // Auto-closed.
    expect(ring![4]).toEqual(ring![0]);
  });

  it("parses a canonical GeoJSON Polygon string", () => {
    const geojson = JSON.stringify({
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
    const ring = parseBoundary(geojson);
    expect(ring).not.toBeNull();
    expect(ring).toHaveLength(5);
    expect(ring![0]).toEqual([77.5946, 13.0827]);
    expect(ring![4]).toEqual([77.5946, 13.0827]);
  });

  it("round-trips through toGeoJsonPolygon", () => {
    const ring: Array<[number, number]> = [
      [77.5946, 13.0827],
      [77.6046, 13.0827],
      [77.6046, 13.0927],
      [77.5946, 13.0927],
    ];
    const str = toGeoJsonPolygon(ring);
    const parsed = JSON.parse(str);
    expect(parsed.type).toBe("Polygon");
    expect(parsed.coordinates[0]).toHaveLength(5);
    expect(validatePolygon(str)).toEqual([]);
  });

  it("validation rejects garbage, empty, two-point, and out-of-range input", () => {
    expect(validatePolygon("not-json{{{").length).toBeGreaterThan(0);
    expect(validatePolygon("").length).toBeGreaterThan(0);
    expect(validatePolygon(null).length).toBeGreaterThan(0);
    expect(validatePolygon("[]").length).toBeGreaterThan(0);

    const twoPoints = JSON.stringify([
      { lat: 13.0827, lng: 77.5946 },
      { lat: 13.0927, lng: 77.6046 },
    ]);
    expect(validatePolygon(twoPoints).length).toBeGreaterThan(0);

    const outOfRange = JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [200, 13.0827],
          [201, 13.0827],
          [201, 14.0827],
          [200, 14.0827],
          [200, 13.0827],
        ],
      ],
    });
    expect(validatePolygon(outOfRange).length).toBeGreaterThan(0);

    const outOfLat = JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [77.5946, 95],
          [77.6046, 95],
          [77.6046, 96],
          [77.5946, 96],
          [77.5946, 95],
        ],
      ],
    });
    expect(validatePolygon(outOfLat).length).toBeGreaterThan(0);
  });

  it("validation accepts a healthy polygon (open ring auto-closes, no error)", () => {
    const open = JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [77.5946, 13.0827],
          [77.6046, 13.0827],
          [77.6046, 13.0927],
          [77.5946, 13.0927],
        ],
      ],
    });
    expect(validatePolygon(open)).toEqual([]);
  });
});
