import { describe, it, expect } from "vitest";
import { validateAttendanceLocation, type FarmGeoInput } from "./attendance-geo";

const FARM_RING = [
  [77.59, 13.08],
  [77.61, 13.08],
  [77.61, 13.1],
  [77.59, 13.1],
  [77.59, 13.08],
];
const FARM_GEOJSON = JSON.stringify({ type: "Polygon", coordinates: [FARM_RING] });
const PLOT_RING = [
  [77.595, 13.085],
  [77.6, 13.085],
  [77.6, 13.09],
  [77.595, 13.09],
  [77.595, 13.085],
];
const PLOT_GEOJSON = JSON.stringify({ type: "Polygon", coordinates: [PLOT_RING] });

const farm = (boundaryGeoJson: string | null = FARM_GEOJSON, radius = 500): FarmGeoInput => ({
  latitude: 13.09,
  longitude: 77.6,
  geofenceRadiusMeters: radius,
  boundaryGeoJson,
});
const plot = (boundaryGeoJson: string | null = PLOT_GEOJSON, farmId = "farm-1") => ({
  farmId,
  boundaryGeoJson,
});

const check = (args: Parameters<typeof validateAttendanceLocation>[0]) => validateAttendanceLocation(args);

describe("attendance-geo: farm polygon", () => {
  it("inside → allowed, FARM_POLYGON", () => {
    const r = check({ lat: 13.09, lng: 77.6, farmId: "farm-1", farm: farm() });
    expect(r).toMatchObject({ ok: true, inside: true, basis: "FARM_POLYGON" });
  });
  it("outside → rejected, FARM_POLYGON", () => {
    const r = check({ lat: 13.09, lng: 77.62, farmId: "farm-1", farm: farm() });
    expect(r).toMatchObject({ ok: true, inside: false, basis: "FARM_POLYGON" });
  });
  it("exactly on the boundary → allowed", () => {
    const r = check({ lat: 13.09, lng: 77.59, farmId: "farm-1", farm: farm() });
    expect(r).toMatchObject({ ok: true, inside: true });
  });
  it("1m inside → allowed; 1m outside → rejected", () => {
    const inside = check({ lat: 13.09, lng: 77.59 + 0.00001, farmId: "farm-1", farm: farm() });
    const outside = check({ lat: 13.09, lng: 77.59 - 0.00001, farmId: "farm-1", farm: farm() });
    expect(inside).toMatchObject({ ok: true, inside: true });
    expect(outside).toMatchObject({ ok: true, inside: false });
  });
  it("concave notch (inside bbox, outside polygon) → rejected", () => {
    const cShape = JSON.stringify({
      type: "Polygon",
      coordinates: [[[77.59, 13.08], [77.61, 13.08], [77.61, 13.1], [77.6, 13.1], [77.6, 13.085], [77.59, 13.085], [77.59, 13.08]]],
    });
    const notch = check({ lat: 13.095, lng: 77.595, farmId: "farm-1", farm: farm(cShape) });
    const arm = check({ lat: 13.082, lng: 77.605, farmId: "farm-1", farm: farm(cShape) });
    expect(notch).toMatchObject({ ok: true, inside: false });
    expect(arm).toMatchObject({ ok: true, inside: true });
  });
  it("corrupt farm fence falls back to radius", () => {
    const r = check({ lat: 13.0905, lng: 77.6, farmId: "farm-1", farm: farm("[[[oops]]]") });
    expect(r).toMatchObject({ ok: true, inside: true, basis: "RADIUS" });
  });
});

describe("attendance-geo: radius fallback (legacy unfenced farms)", () => {
  it("within radius → allowed with RADIUS basis", () => {
    const r = check({ lat: 13.0905, lng: 77.6, farmId: "farm-1", farm: farm(null) });
    expect(r).toMatchObject({ ok: true, inside: true, basis: "RADIUS" });
  });
  it("beyond radius → rejected with RADIUS basis", () => {
    const r = check({ lat: 13.1, lng: 77.6, farmId: "farm-1", farm: farm(null) });
    expect(r).toMatchObject({ ok: true, inside: false, basis: "RADIUS" });
  });
});

describe("attendance-geo: plot precedence", () => {
  it("plot polygon decides (PLOT_POLYGON), inside plot", () => {
    const r = check({ lat: 13.087, lng: 77.597, farmId: "farm-1", farm: farm(), plot: plot() });
    expect(r).toMatchObject({ ok: true, inside: true, basis: "PLOT_POLYGON" });
  });
  it("inside farm but outside plot → rejected (plot narrows)", () => {
    const r = check({ lat: 13.095, lng: 77.605, farmId: "farm-1", farm: farm(), plot: plot() });
    expect(r).toMatchObject({ ok: true, inside: false, basis: "PLOT_POLYGON" });
  });
  it("plot without polygon falls through to farm", () => {
    const r = check({ lat: 13.095, lng: 77.605, farmId: "farm-1", farm: farm(), plot: plot(null) });
    expect(r).toMatchObject({ ok: true, inside: true, basis: "FARM_POLYGON" });
  });
  it("archived plot loses fence authority", () => {
    const r = check({
      lat: 13.095, lng: 77.605, farmId: "farm-1", farm: farm(),
      plot: { ...plot(), status: "ARCHIVED" },
    });
    expect(r).toMatchObject({ ok: true, inside: true, basis: "FARM_POLYGON" });
  });
  it("plot of another farm → PLOT_FARM_MISMATCH", () => {
    const r = check({ lat: 13.087, lng: 77.597, farmId: "farm-1", farm: farm(), plot: plot(PLOT_GEOJSON, "farm-2") });
    expect(r).toMatchObject({ ok: false, code: "PLOT_FARM_MISMATCH", status: 422 });
  });
  it("plot polygon alone decides when farm unfenced", () => {
    const inside = check({ lat: 13.087, lng: 77.597, farmId: "farm-1", farm: farm(null), plot: plot() });
    const outside = check({ lat: 13.095, lng: 77.605, farmId: "farm-1", farm: farm(null), plot: plot() });
    expect(inside).toMatchObject({ ok: true, inside: true, basis: "PLOT_POLYGON" });
    expect(outside).toMatchObject({ ok: true, inside: false, basis: "PLOT_POLYGON" });
  });
});

describe("attendance-geo: GPS sanity", () => {
  const base = { farmId: "farm-1", farm: farm() };
  it("missing/non-finite/out-of-range → GPS_INVALID", () => {
    for (const bad of [
      { lat: undefined, lng: 77.6 },
      { lat: NaN, lng: 77.6 },
      { lat: 91, lng: 77.6 },
      { lat: 13.09, lng: 181 },
      { lat: "abc", lng: 77.6 },
    ]) {
      expect(check({ ...base, ...bad })).toMatchObject({ ok: false, code: "GPS_INVALID", status: 422 });
    }
  });
  it("accuracy >1000m rejected, ≤1000m accepted, negative invalid", () => {
    expect(check({ ...base, lat: 13.09, lng: 77.6, accuracyMeters: 1500 })).toMatchObject({
      ok: false, code: "GPS_ACCURACY_POOR", status: 422,
    });
    expect(check({ ...base, lat: 13.09, lng: 77.6, accuracyMeters: 25 })).toMatchObject({ ok: true, inside: true });
    expect(check({ ...base, lat: 13.09, lng: 77.6, accuracyMeters: -5 })).toMatchObject({ ok: false, code: "GPS_INVALID" });
  });
  it("distance is centroid haversine in all modes", () => {
    const poly = check({ lat: 13.09, lng: 77.6, farmId: "farm-1", farm: farm() });
    const rad = check({ lat: 13.09, lng: 77.6, farmId: "farm-1", farm: farm(null) });
    expect(poly).toMatchObject({ ok: true });
    expect(rad).toMatchObject({ ok: true });
    if (poly.ok && rad.ok) {
      expect(poly.distanceMeters).toBe(0);
      expect(rad.distanceMeters).toBe(0);
    }
  });
});
