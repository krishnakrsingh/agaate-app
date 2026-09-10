import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { testSessionContext } from "./auth";
import { POST as attendanceHandler } from "@/app/api/attendance/route";

const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET || "local-development-session-secret-change-this-before-production-32chars");

async function cookieFor(user: { id: string; name: string; role: string }) {
  const token = await new SignJWT({ userId: user.id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  return `agaate_session=${token}`;
}

function req(url: string, body: unknown, cookie: string) {
  return new NextRequest(url, {
    method: "POST",
    headers: new Headers({ "Content-Type": "application/json", Cookie: cookie }),
    body: JSON.stringify(body),
  });
}

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

async function selfie(userId: string, farmId: string, tag: string) {
  return prisma.mediaAsset.create({
    data: {
      storageKey: `evidence/${farmId}/att-geo/${tag}.jpg`,
      kind: "SELFIE",
      mimeType: "image/jpeg",
      sizeBytes: 1024,
      farmId,
      uploadedById: userId,
      verifiedAt: new Date(),
    },
  });
}

describe.sequential("Phase 3: polygon attendance (server-enforced)", () => {
  let cookieA = "";
  let cookieB = "";
  let cookieC = "";
  let cookieD = "";
  let cookieF = "";
  let cookieStranger = "";
  let officerA: { id: string };
  let officerB: { id: string };
  let officerC: { id: string };
  let officerD: { id: string };
  let officerF: { id: string };
  let fenced = "";
  let fenced2 = "";
  let unfenced = "";
  let plotFarm = "";
  let plotInId = "";
  let plotBareId = "";

  async function cleanup() {
    await prisma.attendanceException.deleteMany({ where: { attendance: { farm: { name: { startsWith: "ATTGEO Farm" } } } } });
    await prisma.attendance.deleteMany({ where: { farm: { name: { startsWith: "ATTGEO Farm" } } } });
    await prisma.mediaAsset.deleteMany({ where: { storageKey: { contains: "/att-geo/" } } });
    await prisma.plot.deleteMany({ where: { farm: { name: { startsWith: "ATTGEO Farm" } } } });
    await prisma.farmAccess.deleteMany({ where: { user: { email: { contains: "@att-geo-test.agaate.local" } } } });
    await prisma.farm.deleteMany({ where: { name: { startsWith: "ATTGEO Farm" } } });
    await prisma.user.deleteMany({ where: { email: { contains: "@att-geo-test.agaate.local" } } });
  }

  beforeAll(async () => {
    await cleanup();
    const mk = (name: string, email: string) =>
      prisma.user.create({ data: { name, email, passwordHash: "x", role: "FARM_OFFICER" } });
    officerA = await mk("ATTGEO A", "a@att-geo-test.agaate.local");
    officerB = await mk("ATTGEO B", "b@att-geo-test.agaate.local");
    officerC = await mk("ATTGEO C", "c@att-geo-test.agaate.local");
    officerD = await mk("ATTGEO D", "d@att-geo-test.agaate.local");
    officerF = await mk("ATTGEO F", "f@att-geo-test.agaate.local");
    const stranger = await mk("ATTGEO S", "s@att-geo-test.agaate.local");
    cookieA = await cookieFor({ ...officerA, name: "ATTGEO A", role: "FARM_OFFICER" });
    cookieB = await cookieFor({ ...officerB, name: "ATTGEO B", role: "FARM_OFFICER" });
    cookieC = await cookieFor({ ...officerC, name: "ATTGEO C", role: "FARM_OFFICER" });
    cookieD = await cookieFor({ ...officerD, name: "ATTGEO D", role: "FARM_OFFICER" });
    cookieF = await cookieFor({ ...officerF, name: "ATTGEO F", role: "FARM_OFFICER" });
    cookieStranger = await cookieFor({ ...stranger, name: "ATTGEO S", role: "FARM_OFFICER" });

    const mkFarm = (name: string, lat: number, lng: number, boundary: string | null) =>
      prisma.farm.create({
        data: {
          name, ownerName: "ATTGEO Owner", location: "ATTGEO Village",
          latitude: lat, longitude: lng, totalArea: 1200, cultivableArea: 1200,
          waterSource: "Borewell", boundaryGeoJson: boundary, status: "ACTIVE",
        },
      });
    fenced = (await mkFarm("ATTGEO Farm Fenced", 13.09, 77.6, FARM_GEOJSON)).id;
    fenced2 = (await mkFarm("ATTGEO Farm Fenced2", 13.09, 77.6, FARM_GEOJSON)).id;
    unfenced = (await mkFarm("ATTGEO Farm Bare", 12.97, 77.59, null)).id;
    plotFarm = (await mkFarm("ATTGEO Farm Plots", 13.09, 77.6, FARM_GEOJSON)).id;
    for (const [uid, fid] of [[officerA.id, fenced], [officerB.id, fenced], [officerC.id, fenced2], [officerA.id, unfenced], [officerB.id, unfenced], [officerD.id, plotFarm], [officerF.id, plotFarm]] as const) {
      await prisma.farmAccess.create({ data: { userId: uid, farmId: fid, canManage: false } });
    }
    const pin = await prisma.plot.create({
      data: {
        farmId: plotFarm, name: "ATTGEO Pinned", area: 10, latitude: 13.087, longitude: 77.597,
        boundaryGeoJson: JSON.stringify({ type: "Polygon", coordinates: [PLOT_RING] }),
        measuredAcres: 100, status: "ACTIVE",
      },
    });
    plotInId = pin.id;
    const bare = await prisma.plot.create({
      data: { farmId: plotFarm, name: "ATTGEO Bare", area: 5, latitude: 13.095, longitude: 77.605, status: "ACTIVE" },
    });
    plotBareId = bare.id;
  });

  afterAll(async () => {
    await cleanup();
  });

  const start = (body: unknown, cookie: string) =>
    testSessionContext.run({ token: cookie.replace("agaate_session=", "") }, () =>
      attendanceHandler(req("http://localhost:3000/api/attendance", body, cookie))
    );

  it("START inside farm polygon → OPEN, FARM_POLYGON persisted", async () => {
    const s = await selfie(officerA.id, fenced, "a1");
    const res = await start({ farmId: fenced, action: "START", latitude: 13.09, longitude: 77.6, selfieMediaId: s.id }, cookieA);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attendance.status).toBe("OPEN");
    expect(body.withinGeofence).toBe(true);
    expect(body.geofenceBasis).toBe("FARM_POLYGON");
    const row = await prisma.attendance.findUniqueOrThrow({ where: { id: body.attendance.id } });
    expect(row.geofenceBasis).toBe("FARM_POLYGON");
  });

  it("START on the exact boundary → OPEN", async () => {
    const s = await selfie(officerC.id, fenced2, "c1");
    const res = await start({ farmId: fenced2, action: "START", latitude: 13.09, longitude: 77.59, selfieMediaId: s.id }, cookieC);
    expect(res.status).toBe(200);
    expect((await res.json()).attendance.status).toBe("OPEN");
  });

  it("START outside polygon without reason → 422 REASON_REQUIRED; with reason → EXCEPTION_PENDING", async () => {
    const s1 = await selfie(officerB.id, fenced, "b1");
    const noReason = await start({ farmId: fenced, action: "START", latitude: 13.09, longitude: 77.62, selfieMediaId: s1.id }, cookieB);
    expect(noReason.status).toBe(422);
    const noBody = await noReason.json();
    expect(noBody.code).toBe("REASON_REQUIRED");
    expect(noBody.geofenceBasis).toBe("FARM_POLYGON");
    const s2 = await selfie(officerB.id, fenced, "b2");
    const withReason = await start(
      { farmId: fenced, action: "START", latitude: 13.09, longitude: 77.62, selfieMediaId: s2.id, reason: "Vehicle breakdown en route" },
      cookieB
    );
    expect(withReason.status).toBe(200);
    const body = await withReason.json();
    expect(body.attendance.status).toBe("EXCEPTION_PENDING");
    expect(body.withinGeofence).toBe(false);
    const exc = await prisma.attendanceException.findUnique({ where: { attendanceId: body.attendance.id } });
    expect(exc).not.toBeNull();
  });

  it("legacy unfenced farm: radius behavior byte-identical (OPEN/RADIUS, 422, exception)", async () => {
    const s1 = await selfie(officerA.id, unfenced, "a2");
    const inside = await start({ farmId: unfenced, action: "START", latitude: 12.9705, longitude: 77.59, selfieMediaId: s1.id }, cookieA);
    expect(inside.status).toBe(200);
    expect((await inside.json()).geofenceBasis).toBe("RADIUS");
    const s2 = await selfie(officerB.id, unfenced, "b3");
    const outside = await start({ farmId: unfenced, action: "START", latitude: 12.99, longitude: 77.59, selfieMediaId: s2.id }, cookieB);
    expect(outside.status).toBe(422);
    const s3 = await selfie(officerB.id, unfenced, "b4");
    const exc = await start(
      { farmId: unfenced, action: "START", latitude: 12.99, longitude: 77.59, selfieMediaId: s3.id, reason: "Attending machinery exhibition" },
      cookieB
    );
    expect(exc.status).toBe(200);
    expect((await exc.json()).attendance.status).toBe("EXCEPTION_PENDING");
  });

  it("plot-aware: inside plot → PLOT_POLYGON; inside farm but outside plot → 422; bare plot falls to farm", async () => {
    const s1 = await selfie(officerD.id, plotFarm, "d1");
    const inside = await start(
      { farmId: plotFarm, plotId: plotInId, action: "START", latitude: 13.087, longitude: 77.597, selfieMediaId: s1.id },
      cookieD
    );
    expect(inside.status).toBe(200);
    expect((await inside.json()).geofenceBasis).toBe("PLOT_POLYGON");
    // END reuses the START-associated plot: still PLOT_POLYGON, COMPLETED.
    const end = await start({ farmId: plotFarm, action: "END", latitude: 13.087, longitude: 77.597 }, cookieD);
    expect(end.status).toBe(200);
    const endBody = await end.json();
    expect(endBody.attendance.status).toBe("COMPLETED");
    expect(endBody.geofenceBasis).toBe("PLOT_POLYGON");

    const sf = await selfie(officerF.id, plotFarm, "f1");
    const outsidePlot = await start(
      { farmId: plotFarm, plotId: plotInId, action: "START", latitude: 13.095, longitude: 77.605, selfieMediaId: sf.id },
      cookieF
    );
    expect(outsidePlot.status).toBe(422);
    const outsideBody = await outsidePlot.json();
    expect(outsideBody.code).toBe("REASON_REQUIRED");
    expect(outsideBody.geofenceBasis).toBe("PLOT_POLYGON");
  });

  it("plot without fence falls through to farm polygon", async () => {
    const s = await selfie(officerF.id, plotFarm, "f2");
    const res = await start(
      { farmId: plotFarm, plotId: plotBareId, action: "START", latitude: 13.095, longitude: 77.605, selfieMediaId: s.id },
      cookieF
    );
    expect(res.status).toBe(200);
    expect((await res.json()).geofenceBasis).toBe("FARM_POLYGON");
  });

  it("plot of another farm → 422 PLOT_FARM_MISMATCH; malformed GPS + coarse fix → 422", async () => {
    await prisma.farmAccess.create({ data: { userId: officerD.id, farmId: fenced2, canManage: false } });
    const s2 = await selfie(officerD.id, fenced2, "d4");
    const mismatch = await start(
      { farmId: fenced2, plotId: plotInId, action: "START", latitude: 13.09, longitude: 77.6, selfieMediaId: s2.id },
      cookieD
    );
    expect(mismatch.status).toBe(422);
    expect(((await mismatch.json()).code)).toBe("PLOT_FARM_MISMATCH");
    const s3 = await selfie(officerD.id, fenced2, "d5");
    const badGps = await start({ farmId: fenced2, action: "START", latitude: 91, longitude: 77.6, selfieMediaId: s3.id }, cookieD);
    expect(badGps.status).toBe(422);
    const s4 = await selfie(officerD.id, fenced2, "d6");
    const coarse = await start(
      { farmId: fenced2, action: "START", latitude: 13.09, longitude: 77.6, accuracyMeters: 2500, selfieMediaId: s4.id },
      cookieD
    );
    expect(coarse.status).toBe(422);
    expect(((await coarse.json()).code)).toBe("GPS_ACCURACY_POOR");
  });

  it("unauthorized officer cannot clock in (403); END outside without reason → 422", async () => {
    const s = await selfie(officerB.id, fenced, "b5");
    // officerB HAS fenced access; stranger has none
    const denied = await start({ farmId: fenced, action: "START", latitude: 13.09, longitude: 77.6, selfieMediaId: s.id }, cookieStranger);
    expect(denied.status).toBe(403);
    // officerA has an OPEN shift on fenced (from test 1): end it outside without reason
    const endBad = await start({ farmId: fenced, action: "END", latitude: 13.09, longitude: 77.63 }, cookieA);
    expect(endBad.status).toBe(422);
    const s2 = await selfie(officerA.id, fenced, "a3");
    const endOk = await start(
      { farmId: fenced, action: "END", latitude: 13.09, longitude: 77.63, reason: "Left for parts run", selfieMediaId: s2.id },
      cookieA
    );
    expect(endOk.status).toBe(200);
    const endBody = await endOk.json();
    expect(endBody.attendance.status).toBe("EXCEPTION_PENDING");
    expect(endBody.geofenceBasis).toBe("FARM_POLYGON");
    expect(s.id).toBeTruthy();
  });
});
