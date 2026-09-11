import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { testSessionContext } from "./auth";
import { commitBoundary } from "./geo-versions";
import { PATCH as patchFarmHandler } from "@/app/api/farms/[farmId]/route";
import { POST as restoreHandler } from "@/app/api/boundary-versions/[id]/restore/route";
import { GET as farmHistoryHandler } from "@/app/api/farms/[farmId]/boundary-versions/route";

const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET || "local-development-session-secret-change-this-before-production-32chars");

async function cookieFor(user: { id: string; name: string; role: string }) {
  const token = await new SignJWT({ userId: user.id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  return `agaate_session=${token}`;
}

const sq = (x0: number, y0: number, s: number) =>
  JSON.stringify({ type: "Polygon", coordinates: [[[x0, y0], [x0 + s, y0], [x0 + s, y0 + s], [x0, y0 + s], [x0, y0]]] });
const FARM_SQ = sq(77.59, 13.08, 0.02);

describe.sequential("Phase 5: geometry versions + provenance", () => {
  let adminCookie = "";
  let strangerCookie = "";
  let adminId = "";
  let farmId = "";
  let bareId = "";

  async function cleanup() {
    await prisma.boundaryVersion.deleteMany({
      where: { OR: [{ entityId: farmId }, { entityId: bareId }, { actorId: adminId }] },
    });
    await prisma.walkTrack.deleteMany({ where: { actorId: adminId } });
    await prisma.plot.deleteMany({ where: { farm: { name: { startsWith: "VERGEO Farm" } } } });
    await prisma.farmAccess.deleteMany({ where: { user: { email: { contains: "@ver-geo.agaate.local" } } } });
    await prisma.farm.deleteMany({ where: { name: { startsWith: "VERGEO Farm" } } });
    await prisma.user.deleteMany({ where: { email: { contains: "@ver-geo.agaate.local" } } });
  }

  beforeAll(async () => {
    await cleanup();
    const admin = await prisma.user.create({ data: { name: "VERGEO Admin", email: "va@ver-geo.agaate.local", passwordHash: "x", role: "FARM_ADMIN" } });
    const stranger = await prisma.user.create({ data: { name: "VERGEO Stranger", email: "vs@ver-geo.agaate.local", passwordHash: "x", role: "FARM_ADMIN" } });
    adminId = admin.id;
    adminCookie = await cookieFor({ ...admin, role: "FARM_ADMIN" });
    strangerCookie = await cookieFor({ ...stranger, name: "VERGEO Stranger", role: "FARM_ADMIN" });
    const mkFarm = (name: string) =>
      prisma.farm.create({
        data: {
          name, ownerName: "VERGEO", location: "V", latitude: 13.09, longitude: 77.6,
          totalArea: 2000, cultivableArea: 2000, waterSource: "Borewell", status: "ACTIVE",
        },
      });
    farmId = (await mkFarm("VERGEO Farm Fenced")).id;
    bareId = (await mkFarm("VERGEO Farm Bare")).id;
    await prisma.farmAccess.create({ data: { userId: admin.id, farmId, canManage: true } });
    await prisma.farmAccess.create({ data: { userId: admin.id, farmId: bareId, canManage: true } });
  });

  afterAll(async () => {
    await cleanup();
  });

  const authed = (cookie: string, fn: () => Promise<Response>) =>
    testSessionContext.run({ token: cookie.replace("agaate_session=", "") }, fn);
  const patch = (id: string, body: unknown, cookie: string) =>
    authed(cookie, () =>
      patchFarmHandler(
        new NextRequest(`http://localhost:3000/api/farms/${id}`, {
          method: "PATCH",
          headers: new Headers({ "Content-Type": "application/json", Cookie: cookie }),
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ farmId: id }) }
      )
    );
  const versions = (entityId: string) =>
    prisma.boundaryVersion.findMany({ where: { entityId }, orderBy: { version: "asc" } });

  it("farm PATCH with fence creates v1 with full provenance", async () => {
    const res = await patch(farmId, { boundaryGeoJson: FARM_SQ }, adminCookie);
    expect(res.status).toBe(200);
    const vs = await versions(farmId);
    expect(vs).toHaveLength(1);
    expect(vs[0]).toMatchObject({ version: 1, source: "MANUAL_DRAW", actorId: adminId, actorName: "VERGEO Admin", captureId: null, restoredFromVersionId: null });
    expect(Number(vs[0].measuredAcres)).toBeGreaterThan(1000);
    expect(Number(vs[0].perimeterM)).toBeGreaterThan(8000);
    expect(vs[0].prevAcres).toBeNull();
    expect(vs[0].areaFlagged).toBe(false);
    expect(vs[0].centroidLat).not.toBeNull();
  });

  it("sequential edits chain prevAcres; old rows immutable", async () => {
    const v1json = JSON.stringify((await versions(farmId))[0]);
    await patch(farmId, { boundaryGeoJson: sq(77.59, 13.08, 0.021) }, adminCookie);
    await patch(farmId, { boundaryGeoJson: sq(77.59, 13.08, 0.022) }, adminCookie);
    const vs = await versions(farmId);
    expect(vs.map((v) => v.version)).toEqual([1, 2, 3]);
    expect(Number(vs[1].prevAcres)).toBeCloseTo(Number(vs[0].measuredAcres), 2);
    expect(Number(vs[2].prevAcres)).toBeCloseTo(Number(vs[1].measuredAcres), 2);
    expect(JSON.stringify((await versions(farmId))[0])).toBe(v1json);
  });

  it("area-change flag: +15% flagged, -5% not, +12% flagged (threshold is >=10%)", async () => {
    const r1 = await patch(farmId, { boundaryGeoJson: sq(77.59, 13.08, 0.022 * Math.sqrt(1.15)) }, adminCookie);
    expect(r1.status).toBe(200);
    let vs = await versions(farmId);
    expect(vs[vs.length - 1].areaFlagged).toBe(true);
    await patch(farmId, { boundaryGeoJson: sq(77.585, 13.075, 0.022 * Math.sqrt(1.15) * Math.sqrt(0.95)) }, adminCookie);
    vs = await versions(farmId);
    expect(vs[vs.length - 1].areaFlagged).toBe(false);
    // +12%: safely above the 10% line (exactly-10.000% is untestable
    // through spherical geometry + 2dp rounding, by design).
    const s = 0.02;
    await patch(farmId, { boundaryGeoJson: sq(77.59, 13.08, s) }, adminCookie);
    const before = await versions(farmId);
    const a0 = Number(before[before.length - 1].measuredAcres);
    await patch(farmId, { boundaryGeoJson: sq(77.59, 13.08, s * Math.sqrt(1.12)) }, adminCookie);
    const after = await versions(farmId);
    const last = after[after.length - 1];
    expect(Number(last.measuredAcres) / a0 - 1).toBeGreaterThan(0.11);
    expect(last.areaFlagged).toBe(true);
  });

  it("invalid boundary → 422, no version, current unchanged", async () => {
    const before = await prisma.farm.findUniqueOrThrow({ where: { id: farmId }, select: { boundaryGeoJson: true } });
    const n0 = (await versions(farmId)).length;
    const res = await patch(farmId, { boundaryGeoJson: JSON.stringify({ type: "Polygon", coordinates: [[[0, 0], [1, 1]]] }) }, adminCookie);
    expect(res.status).toBe(422);
    expect((await versions(farmId)).length).toBe(n0);
    const after = await prisma.farm.findUniqueOrThrow({ where: { id: farmId }, select: { boundaryGeoJson: true } });
    expect(after.boundaryGeoJson).toBe(before.boundaryGeoJson);
  });

  it("unauthorized PATCH → 403, no version", async () => {
    const n0 = (await versions(farmId)).length;
    const res = await patch(farmId, { boundaryGeoJson: sq(77.5, 13.0, 0.01) }, strangerCookie);
    expect(res.status).toBe(403);
    expect((await versions(farmId)).length).toBe(n0);
  });

  it("concurrent edits: unique sequential versions, complete history", async () => {
    const bodies = [0, 1, 2, 3, 4].map((i) => ({ boundaryGeoJson: sq(77.59 + i * 0.0002, 13.08, 0.01) }));
    const results = await Promise.all(bodies.map((b) => patch(bareId, b, adminCookie)));
    expect(results.every((r) => r.status === 200)).toBe(true);
    const vs = await versions(bareId);
    expect(vs).toHaveLength(5);
    expect(vs.map((v) => v.version).sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5]);
  });

  it("restore creates a NEW version with old geometry; history untouched", async () => {
    const vs = await versions(farmId);
    const v1 = vs[0];
    const v1json = JSON.stringify(v1);
    const res = await authed(adminCookie, () =>
      restoreHandler(
        new NextRequest(`http://localhost:3000/api/boundary-versions/${v1.id}/restore`, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json", Cookie: adminCookie }),
        }),
        { params: Promise.resolve({ id: v1.id }) }
      )
    );
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.version).toBe(vs.length + 1);
    expect(body.boundaryGeoJson).toBe(v1.boundaryGeoJson);
    expect(body.restoredFromVersionId).toBe(v1.id);
    expect(body.source).toBe(v1.source);
    const after = await versions(farmId);
    expect(after.length).toBe(vs.length + 1);
    expect(JSON.stringify(after[0])).toBe(v1json);
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmId } });
    expect(farm.boundaryGeoJson).toBe(v1.boundaryGeoJson);
  });

  it("restore: unknown id 404, stranger 404-masked (no existence oracle)", async () => {
    const call = (id: string, cookie: string) =>
      authed(cookie, () =>
        restoreHandler(
          new NextRequest(`http://localhost:3000/api/boundary-versions/${id}/restore`, {
            method: "POST",
            headers: new Headers({ "Content-Type": "application/json", Cookie: cookie }),
          }),
          { params: Promise.resolve({ id }) }
        )
      );
    expect((await call("cuid-does-not-exist-000", adminCookie)).status).toBe(404);
    const v1 = (await versions(farmId))[0];
    expect((await call(v1.id, strangerCookie)).status).toBe(404);
  });

  it("farm history without access reads as 404 (no oracle)", async () => {
    const res = await authed(strangerCookie, () =>
      farmHistoryHandler(
        new NextRequest(`http://localhost:3000/api/farms/${farmId}/boundary-versions`, {
          headers: new Headers({ Cookie: strangerCookie }),
        }),
        { params: Promise.resolve({ farmId }) }
      )
    );
    expect(res.status).toBe(404);
  });

  it("clear-then-refence flags against last known acres (no laundering)", async () => {
    // Geometry → clear (null, unflagged) → re-fence at 2× → flagged vs last known.
    await patch(bareId, { boundaryGeoJson: sq(77.59, 13.08, 0.01) }, adminCookie);
    const v1 = (await versions(bareId)).slice(-1)[0];
    const a0 = Number(v1.measuredAcres);
    await patch(bareId, { boundaryGeoJson: null }, adminCookie);
    const cleared = (await versions(bareId)).slice(-1)[0];
    expect(cleared.measuredAcres).toBeNull();
    expect(cleared.areaFlagged).toBe(false);
    await patch(bareId, { boundaryGeoJson: sq(77.59, 13.08, 0.01 * Math.sqrt(2)) }, adminCookie);
    const v3 = (await versions(bareId)).slice(-1)[0];
    expect(v3.prevAcres).toBeNull();
    expect(Number(v3.measuredAcres) / a0 - 1).toBeGreaterThan(0.9);
    expect(v3.areaFlagged).toBe(true);
  });

  it("restore of a plot outside the shrunken farm fence is rejected", async () => {
    // Plot fenced inside farm; shrink the farm fence away from the plot; restore must refuse.
    const plotFarm = await prisma.farm.create({
      data: {
        name: "VERGEO Farm Shrink", ownerName: "V", location: "V", latitude: 13.09, longitude: 77.6,
        totalArea: 2000, cultivableArea: 2000, waterSource: "Borewell", status: "ACTIVE",
        boundaryGeoJson: FARM_SQ,
      },
    });
    await prisma.farmAccess.create({ data: { userId: adminId, farmId: plotFarm.id, canManage: true } });
    const plot = await prisma.plot.create({
      data: {
        farmId: plotFarm.id, name: "VERGEO ShrinkPlot", area: 10, latitude: 13.095, longitude: 77.605,
        boundaryGeoJson: JSON.stringify({ type: "Polygon", coordinates: [[[77.6, 13.09], [77.605, 13.09], [77.605, 13.095], [77.6, 13.095], [77.6, 13.09]]] }),
        measuredAcres: 100, status: "ACTIVE",
      },
    });
    // Manually seed its v1 (plot created directly, bypassing endpoints).
    await prisma.boundaryVersion.create({
      data: {
        entityType: "PLOT", entityId: plot.id, version: 1,
        boundaryGeoJson: plot.boundaryGeoJson, measuredAcres: 100,
        source: "MANUAL_DRAW", actorId: adminId, actorName: "VERGEO Admin",
      },
    });
    // Shrink the farm fence to the western half (plot sits in the east).
    // Shrink-guard requires force:true here — that is the point of the guard.
    const shrink = await patch(plotFarm.id, { boundaryGeoJson: sq(77.59, 13.08, 0.005), force: true }, adminCookie);
    expect(shrink.status).toBe(200);
    const v1 = (await versions(plot.id)).find((v) => v.version === 1)!;
    const res = await authed(adminCookie, () =>
      restoreHandler(
        new NextRequest(`http://localhost:3000/api/boundary-versions/${v1.id}/restore`, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json", Cookie: adminCookie }),
        }),
        { params: Promise.resolve({ id: v1.id }) }
      )
    );
    expect(res.status).toBe(422);
    // Plot keeps its current (pre-shrink) fence; no new version.
    expect((await versions(plot.id))).toHaveLength(1);
  });

  it("history list is paginated newest-first with deltas", async () => {
    const res = await authed(adminCookie, () =>
      farmHistoryHandler(
        new NextRequest(`http://localhost:3000/api/farms/${farmId}/boundary-versions?limit=2`, {
          headers: new Headers({ Cookie: adminCookie }),
        }),
        { params: Promise.resolve({ farmId }) }
      )
    );
    expect(res.status).toBe(200);
    expect(Number(res.headers.get("X-Total-Count"))).toBeGreaterThanOrEqual(3);
    const body = await res.json();
    expect(body).toHaveLength(2);
    expect(body[0].version).toBeGreaterThan(body[1].version);
    expect(body[0]).toHaveProperty("actorName", "VERGEO Admin");
    expect(body[0]).toHaveProperty("source");
  });

  it("farm shrink over fenced plots needs force:true (audited)", async () => {
    const farm = await prisma.farm.create({
      data: {
        name: "VERGEO Farm Shrink2", ownerName: "V", location: "V", latitude: 13.09, longitude: 77.6,
        totalArea: 2000, cultivableArea: 2000, waterSource: "Borewell", status: "ACTIVE",
        boundaryGeoJson: sq(77.59, 13.08, 0.02),
      },
    });
    await prisma.farmAccess.create({ data: { userId: adminId, farmId: farm.id, canManage: true } });
    await prisma.plot.create({
      data: {
        farmId: farm.id, name: "VERGEO Held", area: 10, latitude: 13.095, longitude: 77.605,
        boundaryGeoJson: sq(77.6, 13.09, 0.005), measuredAcres: 74, status: "ACTIVE",
      },
    });
    const small = sq(77.59, 13.08, 0.005);
    const blocked = await patch(farm.id, { boundaryGeoJson: small }, adminCookie);
    expect(blocked.status).toBe(409);
    const blockedBody = await blocked.json();
    expect(blockedBody.code).toBe("FARM_SHRINK_ORPHANS");
    expect(blockedBody.plots).toContain("VERGEO Held");
    // No version, current fence untouched.
    expect(await prisma.boundaryVersion.count({ where: { entityId: farm.id } })).toBe(0);
    const forced = await patch(farm.id, { boundaryGeoJson: small, force: true }, adminCookie);
    expect(forced.status).toBe(200);
    expect((await versions(farm.id)).length).toBe(1);
  });

  it("commitBoundary versions a create without a prior id", async () => {
    const made = await prisma.$transaction((tx) =>
      commitBoundary(
        tx,
        { type: "FARM" },
        { geoJson: sq(77.5, 13.0, 0.01), acres: 309.5 },
        { source: "MANUAL_DRAW", actorId: adminId, actorName: "VERGEO Admin" },
        async (t) =>
          t.farm.create({
            data: {
              name: "VERGEO Farm Direct", ownerName: "V", location: "V", latitude: 13.0, longitude: 77.5,
              totalArea: 400, cultivableArea: 400, waterSource: "Borewell",
              boundaryGeoJson: sq(77.5, 13.0, 0.01), measuredAcres: 309.5, status: "ACTIVE",
            },
          })
      )
    );
    expect(made.version).toBe(1);
    expect(made.result.name).toBe("VERGEO Farm Direct");
    await prisma.boundaryVersion.deleteMany({ where: { entityId: made.result.id } });
    await prisma.farm.delete({ where: { id: made.result.id } });
  });

  it("rollback: duplicate plot name fails the whole write (no plot, no version)", async () => {
    await prisma.plot.create({
      data: { farmId, name: "VERGEO Taken", area: 1, latitude: 13.09, longitude: 77.6, status: "ACTIVE" },
    });
    const { POST: syncHandler } = await import("@/app/api/geo/captures/sync/route");
    // Proven 100m-square walk pattern (simple ring, valid closure), inside the farm fence.
    const walkSamples = (t0: number) => {
      const pts = [];
      let t = t0;
      const corners: Array<[number, number]> = [
        [13.085, 77.595],
        [13.085, 77.596],
        [13.086, 77.596],
        [13.086, 77.595],
      ];
      for (let e = 0; e < 4; e++) {
        const [la1, ln1] = corners[e];
        const [la2, ln2] = corners[(e + 1) % 4];
        for (let i = 0; i < 8; i++) {
          pts.push({ lat: la1 + ((la2 - la1) * i) / 8, lng: ln1 + ((ln2 - ln1) * i) / 8, acc: 5, t });
          t += 9000;
        }
      }
      pts.push({ lat: 13.08503, lng: 77.59504, acc: 5, t });
      return pts;
    };
    const n0 = await prisma.boundaryVersion.count({ where: { entityType: "PLOT" } });
    const res = await authed(adminCookie, () =>
      syncHandler(
        new NextRequest("http://localhost:3000/api/geo/captures/sync", {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json", Cookie: adminCookie }),
          body: JSON.stringify({
            captureId: "vergeo-rollback-1",
            target: { kind: "PLOT_NEW", farmId, name: "VERGEO Taken" },
            samples: walkSamples(2_000_000),
          }),
        })
      )
    );
    expect(res.status).toBe(409);
    expect(await prisma.plot.count({ where: { farmId, name: "VERGEO Taken" } })).toBe(1);
    expect(await prisma.boundaryVersion.count({ where: { entityType: "PLOT" } })).toBe(n0);
  });
});
