import { describe, it, expect } from "vitest";
import {
  decideSample,
  cleanSamples,
  trackPerimeterM,
  closureGapM,
  assessTrack,
  nearStart,
  TRACK,
  type GpsSample,
} from "./track";

const LAT = 13.09;
const LNG = 77.6;
const mLat = (m: number) => m / 111320;
const mLng = (m: number) => m / (111320 * Math.cos((LAT * Math.PI) / 180));

function fix(lat: number, lng: number, acc = 5, t = 0): GpsSample {
  return { lat, lng, acc, t };
}

/** Open square walk: sideM per side, perSide samples per edge, ends ~5m from start. */
function squareWalk(sideM: number, perSide = 8, acc = 5, t0 = 1_000_000, stepMs = 5000): GpsSample[] {
  const pts: GpsSample[] = [];
  let t = t0;
  const push = (lat: number, lng: number) => {
    pts.push(fix(lat, lng, acc, t));
    t += stepMs;
  };
  const corners: Array<[number, number]> = [
    [LAT, LNG],
    [LAT, LNG + mLng(sideM)],
    [LAT + mLat(sideM), LNG + mLng(sideM)],
    [LAT + mLat(sideM), LNG],
  ];
  for (let e = 0; e < 4; e++) {
    const [la1, ln1] = corners[e];
    const [la2, ln2] = corners[(e + 1) % 4];
    for (let i = 0; i < perSide; i++) {
      push(la1 + ((la2 - la1) * i) / perSide, ln1 + ((ln2 - ln1) * i) / perSide);
    }
  }
  push(LAT + mLat(3), LNG + mLng(4)); // stop ~5m from start
  return pts;
}

describe("track: sampling gates", () => {
  it("keeps well-spaced fixes", () => {
    const a = fix(13.09, 77.6, 5, 1000);
    const b = fix(13.09 + mLat(10), 77.6, 5, 6000);
    expect(decideSample(null, a)).toMatchObject({ keep: true, poor: false });
    expect(decideSample(a, b)).toMatchObject({ keep: true, poor: false });
  });
  it("drops too-soon and too-close fixes", () => {
    const a = fix(13.09, 77.6, 5, 1000);
    expect(decideSample(a, fix(13.09 + mLat(10), 77.6, 5, 2000)).dropReason).toBe("too-soon");
    expect(decideSample(a, fix(13.09 + mLat(2), 77.6, 5, 9000)).dropReason).toBe("too-close");
  });
  it("drops duplicates and stationary runs", () => {
    const a = fix(13.09, 77.6, 5, 1000);
    expect(decideSample(a, fix(13.09, 77.6, 5, 9000)).dropReason).toBe("duplicate");
    const run = Array.from({ length: 20 }, (_, i) => fix(13.09, 77.6, 5, 1000 + i * 9000));
    const cleaned = cleanSamples(run);
    expect(cleaned.points).toHaveLength(1);
    expect(cleaned.dropped["duplicate"]).toBe(19);
  });
  it("drops >50m accuracy, flags 25–50m as poor", () => {
    const a = fix(13.09, 77.6, 5, 1000);
    expect(decideSample(a, fix(13.09 + mLat(10), 77.6, 80, 9000))).toMatchObject({ keep: false, dropReason: "poor-accuracy" });
    const d = decideSample(a, fix(13.09 + mLat(10), 77.6, 30, 9000));
    expect(d).toMatchObject({ keep: true, poor: true });
  });
  it("drops GPS jumps (>30 m/s), counts them", () => {
    const a = fix(13.09, 77.6, 5, 1000);
    const jump = fix(13.09 + mLat(500), 77.6, 5, 6000); // 100 m/s
    expect(decideSample(a, jump).dropReason).toBe("speed-jump");
    const cleaned = cleanSamples([a, jump, fix(13.09 + mLat(10), 77.6, 5, 12000)]);
    expect(cleaned.jumpCount).toBe(1);
    expect(cleaned.points).toHaveLength(2);
  });
  it("drops malformed coordinates", () => {
    const a = fix(13.09, 77.6, 5, 1000);
    for (const bad of [
      fix(NaN, 77.6, 5, 9000),
      fix(91, 77.6, 5, 9000),
      fix(13.09, 200, 5, 9000),
      fix(13.09, 77.6, -1, 9000),
    ]) {
      expect(decideSample(a, bad).keep).toBe(false);
    }
  });
  it("caps at MAX_TRACK_POINTS", () => {
    const run: GpsSample[] = [];
    for (let i = 0; i < TRACK.MAX_TRACK_POINTS + 50; i++) {
      run.push(fix(13.09 + mLat(i * 10), 77.6, 5, 1000 + i * 9000));
    }
    const cleaned = cleanSamples(run);
    expect(cleaned.points).toHaveLength(TRACK.MAX_TRACK_POINTS);
    expect(cleaned.dropped["track-full"]).toBe(50);
  });
});

describe("track: assessment", () => {
  it("clean 100m square → GOOD with ~2.47ac", () => {
    const cleaned = cleanSamples(squareWalk(100, 8));
    const rep = assessTrack(cleaned);
    expect(rep.quality).toBe("GOOD");
    expect(rep.reasons).toEqual([]);
    expect(rep.acres).toBeGreaterThan(2.3);
    expect(rep.acres).toBeLessThan(2.6);
    expect(rep.perimeterM).toBeGreaterThan(390);
    expect(rep.closureGapM).toBeLessThanOrEqual(TRACK.CLOSURE_SUGGEST_M);
    expect(rep.ring).not.toBeNull();
  });
  it("open out-and-back line → WARNING weak closure", () => {
    const pts: GpsSample[] = [];
    for (let i = 0; i < 12; i++) pts.push(fix(LAT + mLat(i * 10), LNG + mLng(i * 3), 5, 1000 + i * 9000));
    const rep = assessTrack(cleanSamples(pts));
    // thin triangle auto-closed: valid geometry but far from start
    expect(["WARNING", "INVALID"]).toContain(rep.quality);
    if (rep.quality === "WARNING") {
      expect(rep.reasons.some((r) => /from the start/i.test(r))).toBe(true);
    }
  });
  it("too few samples / tiny walk → INVALID with reasons", () => {
    expect(assessTrack(cleanSamples(squareWalk(100, 1))).quality).toBe("INVALID");
    const tiny = cleanSamples([
      fix(13.09, 77.6, 5, 1000),
      fix(13.09 + mLat(6), 77.6, 5, 6000),
      fix(13.09 + mLat(6), 77.6 + mLng(6), 5, 12000),
      fix(13.09, 77.6 + mLng(6), 5, 18000),
      fix(13.09 + mLat(3), 77.6 + mLng(3), 5, 24000),
      fix(13.09 + mLat(6), 77.6 + mLng(2), 5, 30000),
      fix(13.09 + mLat(2), 77.6 + mLng(6), 5, 36000),
      fix(13.09 + mLat(4), 77.6 + mLng(1), 5, 42000),
    ]);
    const rep = assessTrack(tiny);
    expect(rep.quality).toBe("INVALID");
    expect(rep.reasons.length).toBeGreaterThan(0);
  });
  it("bowtie walk → INVALID self-intersection", () => {
    const pts = [
      fix(13.09, 77.6, 5, 1000),
      fix(13.09 + mLat(60), 77.6 + mLng(60), 5, 8000),
      fix(13.09 + mLat(60), 77.6, 5, 16000),
      fix(13.09, 77.6 + mLng(60), 5, 24000),
      fix(13.09 + mLat(20), 77.6 + mLng(70), 5, 32000),
      fix(13.09 + mLat(70), 77.6 + mLng(20), 5, 40000),
      fix(13.09 + mLat(10), 77.6 + mLng(10), 5, 48000),
      fix(13.09 + mLat(55), 77.6 + mLng(5), 5, 56000),
    ];
    const rep = assessTrack(cleanSamples(pts));
    expect(rep.quality).toBe("INVALID");
    expect(rep.reasons.some((r) => /cross itself/i.test(r))).toBe(true);
  });
  it("50km square → INVALID implausible area", () => {
    // Slow timings (5 min/segment ≈ 21 m/s) so the walk survives the speed gate.
    const rep = assessTrack(cleanSamples(squareWalk(50000, 8, 5, 1_000_000, 300000)));
    expect(rep.quality).toBe("INVALID");
    expect(rep.reasons.some((r) => /implausibly large/i.test(r))).toBe(true);
  });
  it("concave walk → GOOD", () => {
    const pts: GpsSample[] = [];
    const path: Array<[number, number]> = [
      [0, 0], [120, 0], [120, 100], [60, 100], [60, 40], [0, 40],
    ];
    let t = 1000;
    for (let e = 0; e < path.length; e++) {
      const [x1, y1] = path[e];
      const [x2, y2] = path[(e + 1) % path.length];
      for (let i = 0; i < 6; i++) {
        pts.push(fix(LAT + mLat(y1 + ((y2 - y1) * i) / 6), LNG + mLng(x1 + ((x2 - x1) * i) / 6), 5, t));
        t += 9000;
      }
    }
    pts.push(fix(LAT + mLat(2), LNG + mLng(3), 5, t));
    const rep = assessTrack(cleanSamples(pts));
    expect(rep.quality).toBe("GOOD");
  });
  it("nearStart nudges only when closable", () => {
    const good = cleanSamples(squareWalk(100, 8));
    expect(nearStart(good.points)).toBe(true);
    const line = cleanSamples([fix(13.09, 77.6, 5, 1000), fix(13.09 + mLat(200), 77.6, 5, 60000)]);
    expect(nearStart(line.points)).toBe(false);
  });
  it("perimeter and closure helpers are exact on known walks", () => {
    const pts = cleanSamples(squareWalk(100, 4)).points;
    expect(trackPerimeterM(pts)).toBeGreaterThan(390);
    expect(closureGapM(pts)).toBeLessThan(10);
    expect(closureGapM([fix(13.09, 77.6, 5, 1)])).toBe(Number.POSITIVE_INFINITY);
  });
});
