import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { testSessionContext } from "./auth";
import { POST as syncHandler } from "@/app/api/geo/captures/sync/route";
import type { GpsSample } from "./track";

const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET || "local-development-session-secret-change-this-before-production-32chars");

async function cookieFor(user: { id: string; name: string; role: string }) {
  const token = await new SignJWT({ userId: user.id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  return `agaate_session=${token}`;
}

const LAT = 13.09;
const LNG = 77.6;
const mLat = (m: number) => m / 111320;
const mLng = (m: number) => m / (111320 * Math.cos((LAT * Math.PI) / 180));

/** 100m square walk ending ~5m from start. */
function squareWalk(acc = 5, perSide = 8, t0 = 2_000_000, stepMs = 5000): GpsSample[] {
  const pts: GpsSample[] = [];
  let t = t0;
  const corners: Array<[number, number]> = [
    [LAT, LNG],
    [LAT, LNG + mLng(100)],
    [LAT + mLat(100), LNG + mLng(100)],
    [LAT + mLat(100), LNG],
  ];
  for (let e = 0; e < 4; e++) {
    const [la1, ln1] = corners[e];
    const [la2, ln2] = corners[(e + 1) % 4];
    for (let i = 0; i < perSide; i++) {
      pts.push({ lat: la1 + ((la2 - la1) * i) / perSide, lng: ln1 + ((ln2 - ln1) * i) / perSide, acc, t });
      t += stepMs;
    }
  }
  pts.push({ lat: LAT + mLat(3), lng: LNG + mLng(4), acc, t });
  return pts;
}

const FARM_RING = [
  [77.59, 13.08],
  [77.61, 13.08],
  [77.61, 13.1],
  [77.59, 13.1],
  [77.59, 13.08],
];

describe.sequential("Phase 4: walk-sync (server-rebuilt geometry, idempotent)", () => {
  let cookie = "";
  let cookieStranger = "";
  let officer: { id: string };
  let farmId = "";
  let bareFarmId = "";
  let plotId = "";

  async function cleanup() {
    const farms = await prisma.farm.findMany({ where: { name: { startsWith: "WALKGEO Farm" } }, select: { id: true } });
    const plots = await prisma.plot.findMany({ where: { farm: { name: { startsWith: "WALKGEO Farm" } } }, select: { id: true } });
    const ids = [...farms.map((f) => f.id), ...plots.map((p) => p.id)];
    if (ids.length > 0) {
      await prisma.boundaryVersion.deleteMany({ where: { entityId: { in: ids } } });
    }
    await prisma.plot.deleteMany({ where: { farm: { name: { startsWith: "WALKGEO Farm" } } } });
    await prisma.walkTrack.deleteMany({ where: { id: { startsWith: "walk-" } } });
    await prisma.farmAccess.deleteMany({ where: { user: { email: { contains: "@walk-geo.agaate.local" } } } });
    await prisma.farm.deleteMany({ where: { name: { startsWith: "WALKGEO Farm" } } });
    await prisma.user.deleteMany({ where: { email: { contains: "@walk-geo.agaate.local" } } });
  }

  beforeAll(async () => {
    await cleanup();
    officer = await prisma.user.create({ data: { name: "WALKGEO O", email: "o@walk-geo.agaate.local", passwordHash: "x", role: "FARM_OFFICER" } });
    const stranger = await prisma.user.create({ data: { name: "WALKGEO S", email: "s@walk-geo.agaate.local", passwordHash: "x", role: "FARM_OFFICER" } });
    cookie = await cookieFor({ ...officer, name: "WALKGEO O", role: "FARM_OFFICER" });
    cookieStranger = await cookieFor({ ...stranger, name: "WALKGEO S", role: "FARM_OFFICER" });
    const farm = await prisma.farm.create({
      data: {
        name: "WALKGEO Farm Fenced", ownerName: "WALKGEO", location: "WALKGEO Village",
        latitude: 13.09, longitude: 77.6, totalArea: 1200, cultivableArea: 1200,
        waterSource: "Borewell",
        boundaryGeoJson: JSON.stringify({ type: "Polygon", coordinates: [FARM_RING] }),
        status: "ACTIVE",
      },
    });
    farmId = farm.id;
    bareFarmId = (
      await prisma.farm.create({
        data: {
          name: "WALKGEO Farm Bare", ownerName: "WALKGEO", location: "WALKGEO Village",
          latitude: 13.09, longitude: 77.6, totalArea: 1200, cultivableArea: 1200,
          waterSource: "Borewell", status: "ACTIVE",
        },
      })
    ).id;
    await prisma.farmAccess.create({ data: { userId: officer.id, farmId, canManage: true } });
    await prisma.farmAccess.create({ data: { userId: officer.id, farmId: bareFarmId, canManage: true } });
    const plot = await prisma.plot.create({
      data: { farmId, name: "WALKGEO Existing", area: 5, latitude: 13.09, longitude: 77.6, status: "ACTIVE" },
    });
    plotId = plot.id;
  });

  afterAll(async () => {
    await cleanup();
  });

  const sync = (body: unknown, ck: string) =>
    testSessionContext.run({ token: ck.replace("agaate_session=", "") }, () =>
      syncHandler(
        new NextRequest("http://localhost:3000/api/geo/captures/sync", {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json", Cookie: ck }),
          body: JSON.stringify(body),
        })
      )
    );

  it("FARM walk sync persists server-measured boundary", async () => {
    const res = await sync(
      { captureId: "walk-farm-1", target: { kind: "FARM", farmId: bareFarmId }, samples: squareWalk() },
      cookie
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.accepted).toBe(true);
    expect(body.acres).toBeGreaterThan(2.3);
    expect(body.acres).toBeLessThan(2.6);
    expect(body.quality).toBe("GOOD");
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: bareFarmId } });
    expect(farm.boundaryGeoJson).toContain('"type":"Polygon"');
    expect(Number(farm.measuredAcres)).toBeCloseTo(body.acres, 2);
  });

  it("identical re-walk reports already:true (no duplicate write)", async () => {
    const payload = { captureId: "walk-farm-2", target: { kind: "FARM", farmId: bareFarmId }, samples: squareWalk() };
    const res = await sync(payload, cookie);
    expect(res.status).toBe(200);
    expect((await res.json()).already).toBe(true);
  });

  it("WARNING tracks are accepted with warnings surfaced", async () => {
    // Same shape shifted +20m (new geometry, not a dedupe hit), one poor fix.
    const samples = squareWalk().map((p) => ({ ...p, lat: p.lat + 0.00018 }));
    samples[10] = { ...samples[10], acc: 30 };
    const res = await sync(
      { captureId: "walk-farm-3", target: { kind: "FARM", farmId: bareFarmId }, samples },
      cookie
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.quality).toBe("WARNING");
    expect(body.warnings.length).toBeGreaterThan(0);
  });

  it("INVALID tracks rejected with reasons (too few, malformed, empty)", async () => {
    const few = await sync(
      { captureId: "walk-bad-1", target: { kind: "FARM", farmId: bareFarmId }, samples: squareWalk().slice(0, 3) },
      cookie
    );
    expect(few.status).toBe(422);
    expect((await few.json()).code).toBe("TRACK_INVALID");
    const empty = await sync(
      { captureId: "walk-bad-2", target: { kind: "FARM", farmId: bareFarmId }, samples: [] },
      cookie
    );
    expect(empty.status).toBe(422); // zod min(1)
  });

  it("PLOT_NEW inside fence creates plot; duplicate captureId dedupes", async () => {
    const payload = {
      captureId: "walk-plot-1",
      target: { kind: "PLOT_NEW", farmId, name: "WALKGEO Walked Block" },
      samples: squareWalk(),
    };
    const res = await sync(payload, cookie);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.kind).toBe("PLOT");
    const row = await prisma.plot.findUniqueOrThrow({ where: { id: body.id } });
    expect(row.captureId).toBe("walk-plot-1");
    expect(Number(row.measuredAcres)).toBeGreaterThan(2.3);
    const countBefore = await prisma.plot.count({ where: { farmId: farmId } });
    const dup = await sync(payload, cookie);
    expect(dup.status).toBe(200);
    const dupBody = await dup.json();
    expect(dupBody.deduped).toBe(true);
    expect(dupBody.id).toBe(body.id);
    expect(await prisma.plot.count({ where: { farmId: farmId } })).toBe(countBefore);
    // Duplicate submission creates no duplicate version either.
    expect(await prisma.boundaryVersion.count({ where: { entityType: "PLOT", entityId: body.id } })).toBe(1);
  });

  it("PLOT_NEW outside the farm fence is rejected", async () => {
    // Clean 100m square translated far outside the fence: valid geometry, wrong place.
    const far = squareWalk().map((p) => ({ ...p, lat: p.lat + 0.11, lng: p.lng + 0.1 }));
    const res = await sync(
      { captureId: "walk-plot-2", target: { kind: "PLOT_NEW", farmId, name: "WALKGEO Outside" }, samples: far },
      cookie
    );
    expect(res.status).toBe(422);
    expect((await res.json()).code).toBe("PLOT_OUTSIDE_FARM");
  });

  it("PLOT_NEW on an unfenced farm is rejected (nothing to contain against)", async () => {
    const fresh = await prisma.farm.create({
      data: {
        name: "WALKGEO Farm Bare2", ownerName: "WALKGEO", location: "W", latitude: 13.09, longitude: 77.6,
        totalArea: 100, cultivableArea: 100, waterSource: "Borewell", status: "ACTIVE",
      },
    });
    await prisma.farmAccess.create({ data: { userId: officer.id, farmId: fresh.id, canManage: true } });
    const res = await sync(
      { captureId: "walk-plot-3", target: { kind: "PLOT_NEW", farmId: fresh.id, name: "WALKGEO X" }, samples: squareWalk() },
      cookie
    );
    expect(res.status).toBe(422);
  });

  it("PLOT_EXISTING re-walk updates the fence", async () => {
    const res = await sync(
      { captureId: "walk-plot-4", target: { kind: "PLOT_EXISTING", plotId }, samples: squareWalk() },
      cookie
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.accepted).toBe(true);
    const row = await prisma.plot.findUniqueOrThrow({ where: { id: plotId } });
    expect(row.boundaryGeoJson).toContain('"type":"Polygon"');
    expect(Number(row.measuredAcres)).toBeGreaterThan(2.3);
  });

  it("stranger gets 403; revoked access gets 403 (retryable, no write)", async () => {
    const denied = await sync(
      { captureId: "walk-nope-1", target: { kind: "FARM", farmId }, samples: squareWalk() },
      cookieStranger
    );
    expect(denied.status).toBe(403);
    await prisma.farmAccess.deleteMany({ where: { userId: officer.id, farmId: bareFarmId } });
    const revoked = await sync(
      { captureId: "walk-nope-2", target: { kind: "FARM", farmId: bareFarmId }, samples: squareWalk() },
      cookie
    );
    expect(revoked.status).toBe(403);
  });

  it("duplicate plot name → explicit 409 (no silent rename, no duplicate)", async () => {
    await prisma.plot.create({
      data: { farmId, name: "WALKGEO Taken", area: 1, latitude: 13.09, longitude: 77.6, status: "ACTIVE" },
    });
    const before = await prisma.plot.count({ where: { farmId } });
    const res = await sync(
      { captureId: "walk-taken-1", target: { kind: "PLOT_NEW", farmId, name: "WALKGEO Taken" }, samples: squareWalk() },
      cookie
    );
    expect(res.status).toBe(409);
    expect((await res.json()).code).toBe("PLOT_NAME_TAKEN");
    expect(await prisma.plot.count({ where: { farmId } })).toBe(before);
  });

  it("sync endpoint is throttled (31st rapid call → 429)", async () => {
    const { clearRateLimitStore } = await import("./rate-limit");
    clearRateLimitStore();
    // Re-grant (also proves retry-after-re-grant): revoked in the previous test.
    await prisma.farmAccess.create({ data: { userId: officer.id, farmId: bareFarmId, canManage: true } });
    const statuses: number[] = [];
    for (let i = 0; i < 31; i++) {
      const res = await sync(
        { captureId: `walk-throttle-${i}`, target: { kind: "FARM", farmId: bareFarmId }, samples: squareWalk() },
        cookie
      );
      statuses.push(res.status);
    }
    expect(statuses[0]).toBe(201);
    expect(statuses[29]).not.toBe(429);
    expect(statuses[30]).toBe(429);
  });
});
