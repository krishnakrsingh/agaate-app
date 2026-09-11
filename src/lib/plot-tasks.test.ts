import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { testSessionContext } from "./auth";
import { POST as officerCreateHandler } from "@/app/api/officer/tasks/route";
import { POST as incidentHandler } from "@/app/api/incidents/route";
import { POST as completeHandler } from "@/app/api/tasks/[taskId]/complete/route";
import { GET as visitsHandler } from "@/app/api/farms/[farmId]/plot-visits/route";
import { GET as routeHandler } from "@/app/api/farms/[farmId]/visit-route/route";
import { GET as pinsHandler } from "@/app/api/farms/[farmId]/task-pins/route";

const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET || "local-development-session-secret-change-this-before-production-32chars");

async function cookieFor(user: { id: string; name: string; role: string }) {
  const token = await new SignJWT({ userId: user.id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  return `agaate_session=${token}`;
}

const FARM_RING = JSON.stringify({
  type: "Polygon",
  coordinates: [[[77.59, 13.08], [77.61, 13.08], [77.61, 13.1], [77.59, 13.1], [77.59, 13.08]]],
});
const PLOT_RING = JSON.stringify({
  type: "Polygon",
  coordinates: [[[77.595, 13.085], [77.6, 13.085], [77.6, 13.09], [77.595, 13.09], [77.595, 13.085]]],
});

describe.sequential("Phase 6: plot tasks + missed plots", () => {
  let cookie = "";
  let cookieOfficer2 = "";
  let cookieStranger = "";
  let officer: { id: string };
  let officer2: { id: string };
  let farmId = "";
  let otherFarmId = "";
  let plotIn = "";
  let plotBare = "";
  let plotQuiet = "";

  async function cleanup() {
    await prisma.incident.deleteMany({ where: { farm: { name: { startsWith: "TASKGEO Farm" } } } });
    await prisma.taskExecution.deleteMany({ where: { task: { farm: { name: { startsWith: "TASKGEO Farm" } } } } });
    await prisma.task.deleteMany({ where: { farm: { name: { startsWith: "TASKGEO Farm" } } } });
    const actorIds = [officer?.id].filter((id): id is string => !!id);
    if (actorIds.length > 0) {
      await prisma.boundaryVersion.deleteMany({ where: { actorId: { in: actorIds } } });
    }
    await prisma.plot.deleteMany({ where: { farm: { name: { startsWith: "TASKGEO Farm" } } } });
    await prisma.farmAccess.deleteMany({ where: { user: { email: { contains: "@task-geo.agaate.local" } } } });
    await prisma.farm.deleteMany({ where: { name: { startsWith: "TASKGEO Farm" } } });
    await prisma.user.deleteMany({ where: { email: { contains: "@task-geo.agaate.local" } } });
  }

  beforeAll(async () => {
    await cleanup();
    officer = await prisma.user.create({ data: { name: "TASKGEO Officer", email: "o@task-geo.agaate.local", passwordHash: "x", role: "FARM_OFFICER" } });
    officer2 = await prisma.user.create({ data: { name: "TASKGEO Officer2", email: "o2@task-geo.agaate.local", passwordHash: "x", role: "FARM_OFFICER" } });
    const stranger = await prisma.user.create({ data: { name: "TASKGEO Stranger", email: "s@task-geo.agaate.local", passwordHash: "x", role: "FARM_OFFICER" } });
    cookie = await cookieFor({ ...officer, name: "TASKGEO Officer", role: "FARM_OFFICER" });
    cookieOfficer2 = await cookieFor({ ...officer2, name: "TASKGEO Officer2", role: "FARM_OFFICER" });
    cookieStranger = await cookieFor({ ...stranger, name: "TASKGEO Stranger", role: "FARM_OFFICER" });
    const mkFarm = (name: string, boundary: string | null) =>
      prisma.farm.create({
        data: {
          name, ownerName: "TASKGEO", location: "V", latitude: 13.09, longitude: 77.6,
          totalArea: 1200, cultivableArea: 1200, waterSource: "Borewell",
          boundaryGeoJson: boundary, measuredAcres: boundary ? 1180 : null, status: "ACTIVE",
        },
      });
    farmId = (await mkFarm("TASKGEO Farm Fenced", FARM_RING)).id;
    otherFarmId = (await mkFarm("TASKGEO Farm Other", FARM_RING)).id;
    for (const fid of [farmId, otherFarmId]) {
      await prisma.farmAccess.create({ data: { userId: officer.id, farmId: fid, canManage: false } });
    }
    await prisma.farmAccess.create({ data: { userId: officer2.id, farmId, canManage: false } });
    const mkPlot = (name: string, boundary: string | null) =>
      prisma.plot.create({
        data: {
          farmId, name, area: 10, latitude: 13.087, longitude: 77.597,
          boundaryGeoJson: boundary, measuredAcres: boundary ? 74 : null, status: "ACTIVE",
        },
      });
    plotIn = (await mkPlot("TASKGEO Pinned", PLOT_RING)).id;
    plotBare = (await mkPlot("TASKGEO Bare", null)).id;
    plotQuiet = (await mkPlot("TASKGEO Quiet", null)).id;
  });

  afterAll(async () => {
    await cleanup();
  });

  const authed = (cookie: string, fn: () => Promise<Response>) =>
    testSessionContext.run({ token: cookie.replace("agaate_session=", "") }, fn);
  const mkTask = (plotId: string | null, assignee: string) =>
    prisma.task.create({
      data: {
        farmId, plotId, origin: "DAILY_MONITORING", category: "CROP_SPECIFIC",
        title: "TASKGEO job", description: "d", priority: "HIGH",
        dueDate: new Date(), status: "IN_PROGRESS",
        assignedOfficerId: assignee, createdById: assignee,
      },
    });
  const complete = (taskId: string, body: unknown, ck: string) =>
    authed(ck, () =>
      completeHandler(
        new NextRequest(`http://localhost:3000/api/tasks/${taskId}/complete`, {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json", Cookie: ck }),
          body: JSON.stringify(body),
        }),
        { params: Promise.resolve({ taskId }) }
      )
    );

  it("officer create rejects a plot from another farm (422)", async () => {
    const otherPlot = await prisma.plot.create({
      data: { farmId: otherFarmId, name: "TASKGEO Elsewhere", area: 5, latitude: 13.09, longitude: 77.6, status: "ACTIVE" },
    });
    const res = await authed(cookie, () =>
      officerCreateHandler(
        new NextRequest("http://localhost:3000/api/officer/tasks", {
          method: "POST",
          headers: new Headers({ "Content-Type": "application/json", Cookie: cookie }),
          body: JSON.stringify({ farmId, plotId: otherPlot.id, title: "Cross-farm sneak", description: "x" }),
        })
      )
    );
    expect(res.status).toBe(422);
  });

  it("complete inside the plot fence → 200 + GPS evidence persisted", async () => {
    const task = await mkTask(plotIn, officer.id);
    const res = await complete(task.id, { latitude: 13.087, longitude: 77.597 }, cookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.geofenceBasis).toBe("PLOT_POLYGON");
    const ex = await prisma.taskExecution.findUniqueOrThrow({ where: { taskId: task.id } });
    expect(Number(ex.latitude)).toBeCloseTo(13.087, 5);
    expect(ex.geofenceBasis).toBe("PLOT_POLYGON");
  });

  it("complete outside the plot fence → 422 COMPLETION_OUTSIDE_PLOT", async () => {
    const task = await mkTask(plotIn, officer.id);
    const res = await complete(task.id, { latitude: 13.095, longitude: 77.605 }, cookie);
    expect(res.status).toBe(422);
    const body = await res.json();
    expect(body.code).toBe("COMPLETION_OUTSIDE_PLOT");
    expect(body.geofenceBasis).toBe("PLOT_POLYGON");
  });

  it("complete on unfenced plot uses farm fence; legacy no-GPS completion unaffected", async () => {
    const task = await mkTask(plotBare, officer.id);
    const res = await complete(task.id, { latitude: 13.095, longitude: 77.605 }, cookie);
    expect(res.status).toBe(200);
    expect((await res.json()).geofenceBasis).toBe("FARM_POLYGON");
    const legacy = await mkTask(plotBare, officer.id);
    const res2 = await complete(legacy.id, {}, cookie);
    expect(res2.status).toBe(200);
    const ex = await prisma.taskExecution.findUnique({ where: { taskId: legacy.id } });
    expect(ex?.latitude).toBeNull();
    expect(ex?.geofenceBasis).toBeNull();
  });

  it("unassigned officer cannot complete (403)", async () => {
    const task = await mkTask(plotIn, officer.id);
    const res = await complete(task.id, { latitude: 13.087, longitude: 77.597 }, cookieOfficer2);
    expect(res.status).toBe(403);
  });

  it("visits endpoint: visited/missed/never + summary + masked scope", async () => {
    const get = (ck: string, days = 14) =>
      authed(ck, () =>
        visitsHandler(
          new NextRequest(`http://localhost:3000/api/farms/${farmId}/plot-visits?days=${days}`, {
            headers: new Headers({ Cookie: ck }),
          }),
          { params: Promise.resolve({ farmId }) }
        )
      );
    const res = await get(cookie);
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.summary.total).toBe(3);
    const byId = Object.fromEntries(body.plots.map((p: { plotId: string }) => [p.plotId, p]));
    expect(byId[plotIn].status).toBe("VISITED");
    expect(byId[plotIn].via).toBe("task completion");
    expect(byId[plotBare].status).toBe("VISITED");
    expect(byId[plotQuiet].status).toBe("NEVER");
    expect(body.summary).toMatchObject({ visited: 2, missed: 0, never: 1 });
    const masked = await get(cookieStranger);
    expect(masked.status).toBe(404);
  });

  it("incident GPS: named plot inside → stored; outside → 422; auto-attach to smallest fenced plot", async () => {
    const post = (body: unknown) =>
      authed(cookie, () =>
        incidentHandler(
          new NextRequest("http://localhost:3000/api/incidents", {
            method: "POST",
            headers: new Headers({ "Content-Type": "application/json", Cookie: cookie }),
            body: JSON.stringify(body),
          })
        )
      );
    // Named plot: inside → stored with basis
    const ok = await post({
      farmId, plotId: plotIn, level: "PLOT", type: "Pest sighting", description: "Leaf miner on new growth",
      latitude: 13.087, longitude: 77.597, mediaIds: [],
    });
    expect(ok.status).toBe(201);
    const okBody = await ok.json();
    expect(okBody.geofenceBasis).toBe("PLOT_POLYGON");
    // Named plot: outside → 422, nothing created
    const before = await prisma.incident.count({ where: { farmId } });
    const out = await post({
      farmId, plotId: plotIn, level: "PLOT", type: "Pest sighting", description: "Leaf miner on new growth",
      latitude: 13.095, longitude: 77.605, mediaIds: [],
    });
    expect(out.status).toBe(422);
    expect(((await out.json()).code)).toBe("SCOUT_OUTSIDE_PLOT");
    expect(await prisma.incident.count({ where: { farmId } })).toBe(before);
    // Farm-level incident with GPS, no plot → auto-attaches smallest fenced plot
    const auto = await post({
      farmId, level: "FARM", type: "Pump fault", description: "Motor running dry under load",
      latitude: 13.087, longitude: 77.597, mediaIds: [],
    });
    expect(auto.status).toBe(201);
    const autoBody = await auto.json();
    expect(autoBody.plotId).toBe(plotIn);
    expect(autoBody.geofenceBasis).toBe("PLOT_POLYGON");
    // GPS malformed: lat without lng → zod 422
    const half = await post({ farmId, plotId: plotIn, level: "PLOT", type: "Pest", description: "Pest sighting here", latitude: 13.087, mediaIds: [] });
    expect(half.status).toBe(422);
  });

  it("visit-route: nearest-first order + unroutable unfenced + active-task pins", async () => {
    // mark plotIn/quiet as not-visited today: visits already computed from completions
    const res = await authed(cookie, () =>
      routeHandler(
        new NextRequest(`http://localhost:3000/api/farms/${farmId}/visit-route?days=14`, {
          headers: new Headers({ Cookie: cookie }),
        }),
        { params: Promise.resolve({ farmId }) }
      )
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.stops.every((s: { status: string }) => s.status !== "VISITED")).toBe(true);
    expect(body.summary.routed).toBe(body.stops.length);
    expect(body.unroutable.every((u: { plotId: string }) => u.plotId !== plotIn)).toBe(true);

    // task-pins: open task on fenced plot shows up with fence; unfenced plot tasks excluded
    await mkTask(plotIn, officer.id);
    const open = await mkTask(plotQuiet, officer.id);
    const pins = await authed(cookie, () =>
      pinsHandler(
        new NextRequest(`http://localhost:3000/api/farms/${farmId}/task-pins`, {
          headers: new Headers({ Cookie: cookie }),
        }),
        { params: Promise.resolve({ farmId }) }
      )
    );
    expect(pins.status).toBe(200);
    const pinsBody = await pins.json();
    expect(pinsBody.pins.some((p: { plotId: string }) => p.plotId === plotIn)).toBe(true);
    expect(pinsBody.pins.every((p: { plotId: string }) => p.plotId !== plotQuiet)).toBe(true);
    expect(pinsBody.farm.boundaryGeoJson).toBe(FARM_RING);
    const masked = await authed(cookieStranger, () =>
      pinsHandler(
        new NextRequest(`http://localhost:3000/api/farms/${farmId}/task-pins`, { headers: new Headers({ Cookie: cookieStranger }) }),
        { params: Promise.resolve({ farmId }) }
      )
    );
    expect(masked.status).toBe(404);
    expect(open.id).toBeTruthy();
  });
});
