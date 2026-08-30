import { describe, expect, it, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { testSessionContext } from "./auth";

// Route handlers for core BRD flow
import { POST as postAttendanceHandler } from "@/app/api/attendance/route";
import { POST as completeUploadHandler } from "@/app/api/uploads/[mediaId]/complete/route";
import { POST as presignHandler } from "@/app/api/uploads/presign/route";
import { POST as postCropCycleHandler } from "@/app/api/plots/[plotId]/crop-cycles/route";
import { POST as postTaskHandler } from "@/app/api/tasks/route";
import { POST as completeTaskHandler } from "@/app/api/tasks/[taskId]/complete/route";
import { POST as postMonitoringHandler } from "@/app/api/monitoring/route";
import { POST as postIncidentHandler } from "@/app/api/incidents/route";
import { GET as getDailyReportHandler } from "@/app/api/reports/daily/route";

const secret = new TextEncoder().encode(
  process.env.APP_SESSION_SECRET || "local-development-session-secret-change-this-before-production-32chars"
);

async function cookieFor(user: { id: string; name: string; role: string }) {
  const token = await new SignJWT({ userId: user.id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  return `agaate_session=${token}`;
}

async function withAuth<T>(cookie: string, fn: () => Promise<T>): Promise<T> {
  const token = cookie.replace("agaate_session=", "");
  return testSessionContext.run({ token }, fn);
}

function req(url: string, method: string, body?: any, cookie?: string) {
  return new NextRequest(url, {
    method,
    headers: new Headers({
      "Content-Type": "application/json",
      ...(cookie ? { Cookie: cookie } : {}),
    }),
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe.sequential("BRD MVP End-to-End Operational Lifecycle", () => {
  let superAdmin: any;
  let farmAdmin: any;
  let agronomist: any;
  let officer: any;
  let farm: any;
  let plot: any;
  let cropCycle: any;

  let saCookie: string;
  let faCookie: string;
  let agroCookie: string;
  let officerCookie: string;

  const cleanup = async () => {
    const users = await prisma.user.findMany({
      where: { email: { contains: "@e2e.agaate.local" } },
      select: { id: true },
    });
    const userIds = users.map((u) => u.id);
    if (userIds.length) {
      await prisma.mediaAsset.deleteMany({ where: { uploadedById: { in: userIds } } });
      await prisma.incidentFollowUp.deleteMany({ where: { authorId: { in: userIds } } });
      await prisma.incident.deleteMany({ where: { reporterId: { in: userIds } } });
      await prisma.cropMonitoring.deleteMany({ where: { officerId: { in: userIds } } });
      await prisma.taskExecution.deleteMany({ where: { officerId: { in: userIds } } });
      await prisma.task.deleteMany({ where: { createdById: { in: userIds } } });
      await prisma.attendanceException.deleteMany({
        where: { attendance: { userId: { in: userIds } } },
      });
      await prisma.attendance.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.farmAccess.deleteMany({ where: { userId: { in: userIds } } });
      await prisma.agronomyPlan.deleteMany({ where: { createdById: { in: userIds } } });
      await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    }
    const e2eFarms = await prisma.farm.findMany({ where: { name: { startsWith: "E2E Farm" } }, select: { id: true } });
    const e2eFarmIds = e2eFarms.map((f) => f.id);
    if (e2eFarmIds.length) {
      await prisma.mediaAsset.deleteMany({ where: { farmId: { in: e2eFarmIds } } });
      await prisma.incidentFollowUp.deleteMany({ where: { incident: { farmId: { in: e2eFarmIds } } } });
      await prisma.incident.deleteMany({ where: { farmId: { in: e2eFarmIds } } });
      await prisma.cropMonitoring.deleteMany({ where: { farmId: { in: e2eFarmIds } } });
      await prisma.taskExecution.deleteMany({ where: { task: { farmId: { in: e2eFarmIds } } } });
      await prisma.task.deleteMany({ where: { farmId: { in: e2eFarmIds } } });
      await prisma.milestone.deleteMany({ where: { cropCycle: { plot: { farmId: { in: e2eFarmIds } } } } });
      await prisma.cropVariety.deleteMany({ where: { cropCycle: { plot: { farmId: { in: e2eFarmIds } } } } });
      await prisma.cropCycle.deleteMany({ where: { plot: { farmId: { in: e2eFarmIds } } } });
      await prisma.irrigationConfiguration.deleteMany({ where: { plot: { farmId: { in: e2eFarmIds } } } });
      await prisma.plot.deleteMany({ where: { farmId: { in: e2eFarmIds } } });
      await prisma.attendanceException.deleteMany({ where: { attendance: { farmId: { in: e2eFarmIds } } } });
      await prisma.attendance.deleteMany({ where: { farmId: { in: e2eFarmIds } } });
      await prisma.farmAccess.deleteMany({ where: { farmId: { in: e2eFarmIds } } });
      await prisma.agronomyPlan.deleteMany({ where: { farmId: { in: e2eFarmIds } } });
      await prisma.locationChangeRequest.deleteMany({ where: { farmId: { in: e2eFarmIds } } });
      await prisma.farm.deleteMany({ where: { id: { in: e2eFarmIds } } });
    }
    await prisma.user.deleteMany({ where: { email: { contains: "@e2e.agaate.local" } } });
  };

  beforeAll(async () => {
    await cleanup();
    const passwordHash = await bcrypt.hash("Password123!", 10);

    superAdmin = await prisma.user.create({
      data: { name: "E2E Super Admin", email: "sa@e2e.agaate.local", passwordHash, role: "SUPER_ADMIN" },
    });
    farmAdmin = await prisma.user.create({
      data: { name: "E2E Farm Admin", email: "fa@e2e.agaate.local", passwordHash, role: "FARM_ADMIN" },
    });
    agronomist = await prisma.user.create({
      data: { name: "E2E Agronomist", email: "agro@e2e.agaate.local", passwordHash, role: "AGRONOMIST" },
    });
    officer = await prisma.user.create({
      data: { name: "E2E Officer", email: "officer@e2e.agaate.local", passwordHash, role: "FARM_OFFICER" },
    });

    saCookie = await cookieFor(superAdmin);
    faCookie = await cookieFor(farmAdmin);
    agroCookie = await cookieFor(agronomist);
    officerCookie = await cookieFor(officer);

    // Setup Farm & Plot
    farm = await prisma.farm.create({
      data: {
        name: `E2E Farm ${Date.now()}`,
        ownerName: "Agaate Estate",
        location: "Mandya, Karnataka",
        latitude: 12.5200,
        longitude: 76.9000,
        totalArea: 10,
        cultivableArea: 8.5,
        waterSource: "Canal & Borewell",
        status: "ACTIVE",
        geofenceRadiusMeters: 500,
      },
    });

    await prisma.farmAccess.createMany({
      data: [
        { userId: farmAdmin.id, farmId: farm.id, canManage: true },
        { userId: officer.id, farmId: farm.id, canManage: false },
      ],
    });

    plot = await prisma.plot.create({
      data: {
        farmId: farm.id,
        name: "Plot 1 - North Sector",
        area: 2.0,
        latitude: 12.5210,
        longitude: 76.9010,
        soilType: "Red Sandy Loam",
        status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    await cleanup();
  });

  async function createVerifiedMedia(kind: "SELFIE" | "CROP_PHOTO" | "INCIDENT_PHOTO" | "ACTIVITY_EVIDENCE", user: { id: string }) {
    const media = await prisma.mediaAsset.create({
      data: {
        storageKey: `evidence/${farm.id}/${new Date().toISOString().slice(0, 10)}/${Date.now()}-${kind.toLowerCase()}.jpg`,
        kind,
        mimeType: "image/jpeg",
        sizeBytes: 1024,
        farmId: farm.id,
        uploadedById: user.id,
        verifiedAt: new Date(),
      },
    });
    return media.id;
  }

  // 1. Crop Cycle Creation with Milestones & Support Activities
  it("Phase 1: launches Crop Cycle with Milestones and Support Activities (BRD §7, §12, §13)", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await withAuth(faCookie, () =>
      postCropCycleHandler(
        req(`http://localhost:3000/api/plots/${plot.id}/crop-cycles`, "POST", {
          cropName: "Watermelon",
          varieties: ["Sugar Baby", "Black Diamond"],
          startDate: today,
          establishmentType: "NURSERY_TRANSPLANTATION",
          bedPreparationEnabled: true,
          bedWidthCm: 90,
          bedCenterDistanceCm: 150,
          expectedBedsPerAcre: 200,
          mulchEnabled: true,
          mulchHolePattern: "DOUBLE_LINE_ZIGZAG",
          plantDistanceCm: 45,
          expectedPlantsPerAcre: 4000,
          milestones: [
            { name: "Land Preparation", targetDate: today },
            { name: "Mulching & TP / Sowing Readiness", targetDate: today },
            { name: "Transplantation", targetDate: today },
            { name: "First Harvest", targetDate: today },
          ],
          supportActivities: [
            { name: "Bamboo Stacking", targetDate: today, remarks: "6ft poles" },
            { name: "Crop Cover", targetDate: today, remarks: "UV stabilized" },
          ],
        }, faCookie),
        { params: Promise.resolve({ plotId: plot.id }) }
      )
    );

    expect(res.status).toBe(201);
    cropCycle = await res.json();
    expect(cropCycle.cropName).toBe("Watermelon");
    expect(cropCycle.expectedTotalBeds.toString()).toBe("400"); // 200 beds/acre * 2 acres
    expect(cropCycle.expectedPlants.toString()).toBe("8000"); // 4000 plants/acre * 2 acres
    expect(cropCycle.milestones.length).toBe(6); // 4 standard + 2 support activities

    // Activate the crop cycle
    await prisma.cropCycle.update({
      where: { id: cropCycle.id },
      data: { status: "ACTIVE" },
    });
  });

  // 2. Agronomist 7-Day Prescription Dispatch
  it("Phase 2: Agronomist schedules 7-day prescription task for Farm Officer (BRD §20)", async () => {
    const today = new Date().toISOString().slice(0, 10);
    const res = await withAuth(agroCookie, () =>
      postTaskHandler(
        req("http://localhost:3000/api/tasks", "POST", {
          farmId: farm.id,
          plotId: plot.id,
          cropCycleId: cropCycle.id,
          date: today,
          category: "FERTIGATION",
          title: "Apply 19:19:19 Fertigation",
          description: "Drip fertigate 5kg NPK soluble grade at 3.5 bar pressure",
          instructions: "Run clear water for 15 mins post fertigation",
          priority: "HIGH",
          assignedOfficerId: officer.id,
        }, agroCookie)
      )
    );

    expect(res.status).toBe(201);
    const task = await res.json();
    expect(task.title).toBe("Apply 19:19:19 Fertigation");
    expect(task.origin).toBe("AGRONOMIST");
    expect(task.assignedOfficerId).toBe(officer.id);
  });

  // 3. Farm Officer Attendance Flow (Selfie + GPS)
  it("Phase 3: Farm Officer starts day inside geofence with selfie (BRD §17, §18)", async () => {
    const selfieId = await createVerifiedMedia("SELFIE", officer);
    const res = await withAuth(officerCookie, () =>
      postAttendanceHandler(
        req("http://localhost:3000/api/attendance", "POST", {
          farmId: farm.id,
          action: "START",
          latitude: 12.5205,
          longitude: 76.9005,
          selfieMediaId: selfieId,
        }, officerCookie)
      )
    );

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.attendance.status).toBe("OPEN");
    expect(body.withinGeofence).toBe(true);
  });

  it("Phase 3b: duplicate start-day attempts on same date are blocked (BRD §17)", async () => {
    const selfieId2 = await createVerifiedMedia("SELFIE", officer);
    const second = await withAuth(officerCookie, () =>
      postAttendanceHandler(
        req("http://localhost:3000/api/attendance", "POST", { farmId: farm.id, action: "START", latitude: 12.5205, longitude: 76.9005, selfieMediaId: selfieId2 }, officerCookie)
      )
    );
    expect(second.status).toBe(422);
    expect((await second.json()).error).toMatch(/already been started/);
  });

  // 4. Farm Officer Task Execution & Labour/Material Logging
  it("Phase 4: Farm Officer executes task with labour & material telemetry (BRD §28, §29)", async () => {
    const task = await prisma.task.findFirstOrThrow({
      where: { farmId: farm.id, assignedOfficerId: officer.id, title: "Apply 19:19:19 Fertigation" },
    });

    await prisma.task.update({ where: { id: task.id }, data: { status: "IN_PROGRESS" } });

    const evidenceId = await createVerifiedMedia("ACTIVITY_EVIDENCE", officer);
    const res = await withAuth(officerCookie, () =>
      completeTaskHandler(
        req(`http://localhost:3000/api/tasks/${task.id}/complete`, "POST", {
          remarks: "Fertigation applied cleanly across Plot 1 drip lines.",
          materials: [{ materialName: "NPK 19:19:19", quantity: 5, unit: "kg" }],
          labour: [{ labourers: 3, hours: 4 }], // 3 laborers * 4 hrs = 12 labour hours
          mediaIds: [evidenceId],
        }, officerCookie),
        { params: Promise.resolve({ taskId: task.id }) }
      )
    );

    expect(res.status).toBe(200);
    const updated = await prisma.task.findUniqueOrThrow({
      where: { id: task.id },
      include: { executions: { include: { materials: true, labour: true } } },
    });
    expect(updated.status).toBe("COMPLETED");
    expect(updated.executions[0].labour[0].labourHours.toString()).toBe("12");
  });

  // 5. Daily Crop Monitoring & Incident Reporting
  it("Phase 5: Farm Officer records crop monitoring signal & reports positive incident (BRD §24, §26)", async () => {
    const cropPhotoId = await createVerifiedMedia("CROP_PHOTO", officer);
    const monRes = await withAuth(officerCookie, () =>
      postMonitoringHandler(
        req("http://localhost:3000/api/monitoring", "POST", {
          farmId: farm.id,
          plotId: plot.id,
          cropCycleId: cropCycle.id,
          status: "GOOD",
          stage: "Vegetative",
          remarks: "Uniform vegetative canopy growth observed.",
          mediaIds: [cropPhotoId],
        }, officerCookie)
      )
    );
    expect(monRes.status).toBe(201);

    const incidentPhotoId = await createVerifiedMedia("INCIDENT_PHOTO", officer);
    const incRes = await withAuth(officerCookie, () =>
      postIncidentHandler(
        req("http://localhost:3000/api/incidents", "POST", {
          farmId: farm.id,
          plotId: plot.id,
          cropCycleId: cropCycle.id,
          level: "CROP",
          type: "High Fruit Setting",
          description: "Exceptional fruit set noted in northern bed rows.",
          severity: "LOW",
          mediaIds: [incidentPhotoId],
        }, officerCookie)
      )
    );
    expect(incRes.status).toBe(201);
  });

  // 6. Farm Officer End Day & Auto-Report Synthesis
  it("Phase 6: Farm Officer ends shift and system synthesizes Daily Auto-Report (BRD §17, §30)", async () => {
    const endSelfieId = await createVerifiedMedia("SELFIE", officer);
    const endRes = await withAuth(officerCookie, () =>
      postAttendanceHandler(
        req("http://localhost:3000/api/attendance", "POST", {
          farmId: farm.id,
          action: "END",
          latitude: 12.5202,
          longitude: 76.9001,
          selfieMediaId: endSelfieId,
        }, officerCookie)
      )
    );
    expect(endRes.status).toBe(200);

    const today = new Date().toISOString().slice(0, 10);
    const reportRes = await withAuth(faCookie, () =>
      getDailyReportHandler(
        req(`http://localhost:3000/api/reports/daily?farmId=${farm.id}&date=${today}`, "GET", undefined, faCookie)
      )
    );

    expect(reportRes.status).toBe(200);
    const report = await reportRes.json();
    expect(report.attendance.length).toBe(1);
    expect(report.attendance[0].status).toBe("COMPLETED");
    expect(report.resources.labourHours).toBe(12);
    expect(report.resources.materials.length).toBeGreaterThan(0);
    expect(report.monitoring.length).toBe(1);
    expect(report.incidents.length).toBe(1);
    expect(report.photoCount).toBeGreaterThanOrEqual(2);
  });

  // 7. Cross-Farm Authorization Guard
  it("Phase 7: Unauthorized officer attempting action on unassigned farm is blocked (BRD §2)", async () => {
    const otherFarm = await prisma.farm.create({
      data: {
        name: `OtherFarm ${Date.now()}`,
        ownerName: "Other",
        location: "Hosur",
        latitude: 12.7,
        longitude: 77.8,
        totalArea: 5,
        cultivableArea: 4,
        waterSource: "Well",
        status: "ACTIVE",
      },
    });
    const selfieId = await createVerifiedMedia("SELFIE", officer);
    const res = await withAuth(officerCookie, () =>
      postAttendanceHandler(
        req("http://localhost:3000/api/attendance", "POST", { farmId: otherFarm.id, action: "START", latitude: 12.7, longitude: 77.8, selfieMediaId: selfieId }, officerCookie)
      )
    );
    expect(res.status).toBe(403);
    await prisma.farm.delete({ where: { id: otherFarm.id } });
  });
});
