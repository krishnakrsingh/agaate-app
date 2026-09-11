import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { testSessionContext } from "./auth";
import { ringWithinRing, parseBoundaryToRing } from "./geo-server";

import { POST as createPlotHandler } from "@/app/api/farms/[farmId]/plots/route";
import { PATCH as updatePlotHandler } from "@/app/api/plots/[plotId]/route";
import { POST as generateHandler } from "@/app/api/farms/[farmId]/plots/generate/route";

const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET || "local-development-session-secret-change-this-before-production-32chars");

async function cookieFor(user: { id: string; name: string; role: string }) {
  const token = await new SignJWT({ userId: user.id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  return `agaate_session=${token}`;
}

function req(url: string, method: string, body: unknown, cookie: string) {
  return new NextRequest(url, {
    method,
    headers: new Headers({ "Content-Type": "application/json", Cookie: cookie }),
    body: JSON.stringify(body),
  });
}

// Test fence: square 77.59..77.61 × 13.08..13.10 (closed ring).
const FARM_RING = [
  [77.59, 13.08],
  [77.61, 13.08],
  [77.61, 13.1],
  [77.59, 13.1],
  [77.59, 13.08],
];
const FARM_GEOJSON = JSON.stringify({ type: "Polygon", coordinates: [FARM_RING] });
const INSIDE = [
  [77.595, 13.085],
  [77.6, 13.085],
  [77.6, 13.09],
  [77.595, 13.09],
  [77.595, 13.085],
];
const TOUCHING = [
  [77.59, 13.085],
  [77.6, 13.085],
  [77.6, 13.09],
  [77.59, 13.09],
  [77.59, 13.085],
];
const STRADDLE = [
  [77.605, 13.085],
  [77.615, 13.085],
  [77.615, 13.09],
  [77.605, 13.09],
  [77.605, 13.085],
];
const OUTSIDE = [
  [77.62, 13.085],
  [77.625, 13.085],
  [77.625, 13.09],
  [77.62, 13.09],
  [77.62, 13.085],
];

const plotBody = (name: string, boundary: unknown, area = 0.5) => ({
  name,
  area,
  latitude: 13.087,
  longitude: 77.597,
  soilType: "Red Loam",
  boundary,
  irrigation: [{ type: "Drip" }],
});

describe.sequential("Phase 2: plot fencing (server-enforced containment)", () => {
  let superCookie = "";
  let adminCookie = "";
  let strangerCookie = "";
  let officerCookie = "";
  let farmId = "";
  let bareFarmId = "";

  async function cleanup() {
    const farms = await prisma.farm.findMany({ where: { name: { startsWith: "GEO Test Farm" } }, select: { id: true } });
    const plots = await prisma.plot.findMany({ where: { farm: { name: { startsWith: "GEO Test Farm" } } }, select: { id: true } });
    const ids = [...farms.map((f) => f.id), ...plots.map((p) => p.id)];
    if (ids.length > 0) {
      await prisma.boundaryVersion.deleteMany({ where: { entityId: { in: ids } } });
    }
    await prisma.plot.deleteMany({ where: { farm: { name: { startsWith: "GEO Test Farm" } } } });
    await prisma.farmAccess.deleteMany({ where: { user: { email: { contains: "@geo-test.agaate.local" } } } });
    await prisma.farm.deleteMany({ where: { name: { startsWith: "GEO Test Farm" } } });
    await prisma.user.deleteMany({ where: { email: { contains: "@geo-test.agaate.local" } } });
  }

  beforeAll(async () => {
    await cleanup();
    const sa = await prisma.user.create({ data: { name: "GEO SA", email: "sa@geo-test.agaate.local", passwordHash: "x", role: "SUPER_ADMIN" } });
    const fa = await prisma.user.create({ data: { name: "GEO FA", email: "fa@geo-test.agaate.local", passwordHash: "x", role: "FARM_ADMIN" } });
    const stranger = await prisma.user.create({ data: { name: "GEO Stranger", email: "st@geo-test.agaate.local", passwordHash: "x", role: "FARM_ADMIN" } });
    const officer = await prisma.user.create({ data: { name: "GEO Officer", email: "of@geo-test.agaate.local", passwordHash: "x", role: "FARM_OFFICER" } });
    superCookie = await cookieFor(sa);
    adminCookie = await cookieFor(fa);
    strangerCookie = await cookieFor(stranger);
    officerCookie = await cookieFor(officer);

    const farm = await prisma.farm.create({
      data: {
        name: "GEO Test Farm Fenced", ownerName: "GEO Owner", location: "GEO Village",
        latitude: 13.09, longitude: 77.6, totalArea: 1200, cultivableArea: 1200,
        waterSource: "Borewell", boundaryGeoJson: FARM_GEOJSON, status: "ACTIVE",
      },
    });
    farmId = farm.id;
    const bare = await prisma.farm.create({
      data: {
        name: "GEO Test Farm Bare", ownerName: "GEO Owner", location: "GEO Village",
        latitude: 13.09, longitude: 77.6, totalArea: 50, cultivableArea: 50,
        waterSource: "Borewell", status: "ACTIVE",
      },
    });
    bareFarmId = bare.id;
    await prisma.farmAccess.create({ data: { userId: fa.id, farmId, canManage: true } });
    await prisma.farmAccess.create({ data: { userId: fa.id, farmId: bareFarmId, canManage: true } });
  });

  afterAll(async () => {
    await cleanup();
  });

  const post = (id: string, body: unknown, cookie: string) =>
    testSessionContext.run({ token: cookie.replace("agaate_session=", "") }, () =>
      createPlotHandler(req(`http://localhost:3000/api/farms/${id}/plots`, "POST", body, cookie), {
        params: Promise.resolve({ farmId: id }),
      })
    );

  it("creates an inside plot; server acres override client acres", async () => {
    const res = await post(farmId, plotBody("GEO Inside", INSIDE, 0.5), adminCookie);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(Number(body.area)).not.toBe(0.5);
    expect(Number(body.measuredAcres)).toBeGreaterThan(1);
    expect(Number(body.area)).toBe(Number(body.measuredAcres));
    expect(body.boundaryGeoJson).toContain('"type":"Polygon"');
  });

  it("accepts legacy [{lat,lng}] and stores canonical GeoJSON", async () => {
    const legacy = INSIDE.slice(0, 4).map(([lng, lat]) => ({ lat, lng }));
    const res = await post(farmId, plotBody("GEO Legacy", legacy), adminCookie);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.boundaryGeoJson).toContain('"coordinates"');
    expect(Number(body.measuredAcres)).toBeGreaterThan(1);
  });

  it("accepts a plot sharing the farm border", async () => {
    const res = await post(farmId, plotBody("GEO Touching", TOUCHING), adminCookie);
    expect(res.status).toBe(201);
  });

  it("rejects straddling (422) and fully-outside (422) plots", async () => {
    const r1 = await post(farmId, plotBody("GEO Straddle", STRADDLE), adminCookie);
    expect(r1.status).toBe(422);
    expect(((await r1.json()).error as string)).toMatch(/inside/i);
    const r2 = await post(farmId, plotBody("GEO Outside", OUTSIDE), adminCookie);
    expect(r2.status).toBe(422);
  });

  it("rejects self-intersecting (bowtie) plots", async () => {
    const bowtie = [[77.595, 13.085], [77.6, 13.09], [77.6, 13.085], [77.595, 13.09], [77.595, 13.085]];
    const res = await post(farmId, plotBody("GEO Bowtie", bowtie), adminCookie);
    expect(res.status).toBe(422);
  });

  it("rejects fenced plots on farms with no drawn boundary", async () => {
    const res = await post(bareFarmId, plotBody("GEO NoFence", INSIDE), adminCookie);
    expect(res.status).toBe(422);
    expect(((await res.json()).error as string)).toMatch(/no drawn boundary/i);
  });

  it("PATCH: moving a fence outside is rejected; clearing works", async () => {
    const created = await (await post(farmId, plotBody("GEO Movable", INSIDE), adminCookie)).json();
    const patch = (body: unknown, cookie: string) =>
      testSessionContext.run({ token: cookie.replace("agaate_session=", "") }, () =>
        updatePlotHandler(
          req(`http://localhost:3000/api/plots/${created.id}`, "PATCH", body, cookie),
          { params: Promise.resolve({ plotId: created.id }) }
        )
      );
    const bad = await patch({ boundary: STRADDLE }, adminCookie);
    expect(bad.status).toBe(422);
    const cleared = await patch({ boundary: null }, adminCookie);
    expect(cleared.status).toBe(200);
    const clearedBody = await cleared.json();
    expect(clearedBody.boundaryGeoJson).toBeNull();
    expect(clearedBody.measuredAcres).toBeNull();
  });

  it("authorization: stranger 403 on create, 404-masked on update; super-admin bypasses", async () => {
    const denied = await post(farmId, plotBody("GEO Nope", INSIDE), strangerCookie);
    expect(denied.status).toBe(403);
    const deniedOfficer = await post(farmId, plotBody("GEO Nope2", INSIDE), officerCookie);
    expect(deniedOfficer.status).toBe(403);
    const ok = await post(farmId, plotBody("GEO SA Plot", INSIDE), superCookie);
    expect(ok.status).toBe(201);
    const created = await ok.json();
    const masked = await testSessionContext.run(
      { token: strangerCookie.replace("agaate_session=", "") },
      () =>
        updatePlotHandler(
          req(`http://localhost:3000/api/plots/${created.id}`, "PATCH", { name: "x" }, strangerCookie),
          { params: Promise.resolve({ plotId: created.id }) }
        )
    );
    expect(masked.status).toBe(404);
  });

  it("generate: 3x2 grid partitions the real fence; names unique on rerun", async () => {
    const gen = (body: unknown, cookie: string) =>
      testSessionContext.run({ token: cookie.replace("agaate_session=", "") }, () =>
        generateHandler(req(`http://localhost:3000/api/farms/${farmId}/plots/generate`, "POST", body, cookie), {
          params: Promise.resolve({ farmId }),
        })
      );
    const res = await gen({ cols: 3, rows: 2, namePrefix: "GEOBlock" }, adminCookie);
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.plots).toHaveLength(6);
    expect(body.totalAcres).toBeGreaterThan(body.farmAcres * 0.9);
    const farmRing = parseBoundaryToRing(FARM_GEOJSON)!;
    for (const p of body.plots) {
      const ring = parseBoundaryToRing(p.boundaryGeoJson)!;
      expect(ringWithinRing(ring, farmRing)).toBe(true);
      expect(Number(p.measuredAcres)).toBeGreaterThan(0);
    }
    const names = body.plots.map((p: { name: string }) => p.name);
    expect(new Set(names).size).toBe(6);
    // rerun: same prefixes must auto-suffix instead of unique-violating
    const res2 = await gen({ cols: 3, rows: 2, namePrefix: "GEOBlock" }, adminCookie);
    expect(res2.status).toBe(201);
    expect((await res2.json()).plots).toHaveLength(6);
  });

  it("generate: refuses farms without fence, oversized grids, and strangers", async () => {
    const gen = (id: string, body: unknown, cookie: string) =>
      testSessionContext.run({ token: cookie.replace("agaate_session=", "") }, () =>
        generateHandler(req(`http://localhost:3000/api/farms/${id}/plots/generate`, "POST", body, cookie), {
          params: Promise.resolve({ farmId: id }),
        })
      );
    const noFence = await gen(bareFarmId, { cols: 3, rows: 2 }, adminCookie);
    expect(noFence.status).toBe(422);
    const tooBig = await gen(farmId, { cols: 10, rows: 10 }, adminCookie);
    expect(tooBig.status).not.toBe(201);
    const denied = await gen(farmId, { cols: 2, rows: 1 }, strangerCookie);
    expect(denied.status).toBe(403);
  });

  it("generate: 2x2 grid partitions the real fence; rerun suffixes names", async () => {
    const gen = (body: unknown) =>
      testSessionContext.run({ token: adminCookie.replace("agaate_session=", "") }, () =>
        generateHandler(req(`http://localhost:3000/api/farms/${farmId}/plots/generate`, "POST", body, adminCookie), {
          params: Promise.resolve({ farmId }),
        })
      );
    const res = await gen({ cols: 2, rows: 2, namePrefix: "GEOGrid" });
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.plots).toHaveLength(4);
    expect(body.totalAcres).toBeGreaterThan(body.farmAcres * 0.9);
    const farmRing = parseBoundaryToRing(FARM_GEOJSON)!;
    for (const p of body.plots) {
      const ring = parseBoundaryToRing(p.boundaryGeoJson)!;
      expect(ringWithinRing(ring, farmRing)).toBe(true);
      expect(Number(p.measuredAcres)).toBeGreaterThan(0);
    }
    expect(new Set(body.plots.map((p: { name: string }) => p.name)).size).toBe(4);
    const res2 = await gen({ cols: 2, rows: 2, namePrefix: "GEOGrid" });
    expect(res2.status).toBe(201);
    const names2 = (await res2.json()).plots.map((p: { name: string }) => p.name);
    expect(names2.every((n: string) => /\(2\)$/.test(n))).toBe(true);
  });
});
