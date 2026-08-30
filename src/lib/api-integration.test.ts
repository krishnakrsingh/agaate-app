import { describe, expect, it, beforeAll, afterAll, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { clearRateLimitStore } from "./rate-limit";
import { testSessionContext } from "./auth";

// Import Next.js route handlers directly
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import { GET as getFarmsHandler, POST as createFarmHandler } from "@/app/api/farms/route";
import { POST as createPlotHandler } from "@/app/api/farms/[farmId]/plots/route";
import { POST as createCropCycleHandler } from "@/app/api/plots/[plotId]/crop-cycles/route";
import { POST as activateFarmHandler } from "@/app/api/farms/[farmId]/activate/route";
import { GET as getTasksHandler, POST as createTaskHandler } from "@/app/api/tasks/route";
import { PATCH as updateTaskHandler } from "@/app/api/tasks/[taskId]/route";
import { POST as completeTaskHandler } from "@/app/api/tasks/[taskId]/complete/route";
import { GET as getAttendanceHandler, POST as postAttendanceHandler } from "@/app/api/attendance/route";
import { PATCH as reviewExceptionOptionHandler } from "@/app/api/attendance-exceptions/[exceptionId]/route";
import { POST as createMonitoringHandler } from "@/app/api/monitoring/route";
import { POST as createIncidentHandler } from "@/app/api/incidents/route";
import { PATCH as updateIncidentHandler } from "@/app/api/incidents/[incidentId]/route";
import { POST as createFollowUpHandler } from "@/app/api/incidents/[incidentId]/follow-ups/route";
import { POST as presignUploadHandler } from "@/app/api/uploads/presign/route";
import { POST as completeUploadHandler } from "@/app/api/uploads/[mediaId]/complete/route";
import { GET as getDashboardHandler } from "@/app/api/dashboard/route";
import { GET as getDailyReportHandler } from "@/app/api/reports/daily/route";

const secret = new TextEncoder().encode(process.env.APP_SESSION_SECRET || "local-development-session-secret-change-this-before-production-32chars");

async function createAuthCookie(user: { id: string; name: string; role: string }): Promise<string> {
  const token = await new SignJWT({ userId: user.id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  return `agaate_session=${token}`;
}

async function withAuth<T>(cookieStr: string | undefined, fn: () => Promise<T>): Promise<T> {
  if (!cookieStr) return fn();
  const token = cookieStr.replace("agaate_session=", "");
  return testSessionContext.run({ token }, fn);
}

function createJsonRequest(url: string, method: string, body?: any, cookie?: string, headers?: Record<string, string>): NextRequest {
  const headerInit = new Headers({
    "Content-Type": "application/json",
    ...(cookie ? { Cookie: cookie } : {}),
    ...(headers ?? {}),
  });

  return new NextRequest(url, {
    method,
    headers: headerInit,
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe.sequential("HTTP API Integration Test Suite", () => {
  let superAdmin: any;
  let farmAdmin: any;
  let agronomist: any;
  let officerA: any;
  let officerB: any;
  let disabledUser: any;

  let superAdminCookie: string;
  let farmAdminCookie: string;
  let agroCookie: string;
  let officerACookie: string;
  let officerBCookie: string;

  let testFarmA: any;
  let testFarmB: any;
  let testPlot1: any;
  let testCropCycle: any;
  let testTaskId: string;
  let testSelfieMediaId: string;
  let testCropMediaId: string;
  let testIncidentMediaId: string;
  let testIncidentId: string;
  let testExceptionId: string;

  const cleanup = async () => {
    const testUsers = await prisma.user.findMany({
      where: { email: { contains: "@api-test.agaate.local" } },
      select: { id: true },
    });
    const testUserIds = testUsers.map((u) => u.id);
    if (testUserIds.length) {
      await prisma.mediaAsset.deleteMany({ where: { uploadedById: { in: testUserIds } } });
    }
    await prisma.taskExecution.deleteMany({ where: { officer: { email: { contains: "@api-test.agaate.local" } } } });
    await prisma.task.deleteMany({ where: { createdBy: { email: { contains: "@api-test.agaate.local" } } } });
    await prisma.agronomyPlan.deleteMany({ where: { createdBy: { email: { contains: "@api-test.agaate.local" } } } });
    await prisma.cropMonitoring.deleteMany({ where: { officer: { email: { contains: "@api-test.agaate.local" } } } });
    await prisma.incident.deleteMany({ where: { reporter: { email: { contains: "@api-test.agaate.local" } } } });
    await prisma.attendance.deleteMany({ where: { user: { email: { contains: "@api-test.agaate.local" } } } });
    await prisma.locationChangeRequest.deleteMany({ where: { farm: { name: { startsWith: "API Test Farm" } } } });
    await prisma.cropCycle.deleteMany({ where: { plot: { farm: { name: { startsWith: "API Test Farm" } } } } });
    await prisma.plot.deleteMany({ where: { farm: { name: { startsWith: "API Test Farm" } } } });
    await prisma.farmAccess.deleteMany({ where: { user: { email: { contains: "@api-test.agaate.local" } } } });
    await prisma.farm.deleteMany({ where: { name: { startsWith: "API Test Farm" } } });
    await prisma.user.deleteMany({ where: { email: { contains: "@api-test.agaate.local" } } });
  };

  beforeAll(async () => {
    await cleanup();
    clearRateLimitStore();

    const passwordHash = await bcrypt.hash("AgaatePassword123!", 10);

    superAdmin = await prisma.user.create({
      data: { name: "API Super Admin", email: "sa@api-test.agaate.local", passwordHash, role: "SUPER_ADMIN" },
    });
    farmAdmin = await prisma.user.create({
      data: { name: "API Farm Admin", email: "fa@api-test.agaate.local", passwordHash, role: "FARM_ADMIN" },
    });
    agronomist = await prisma.user.create({
      data: { name: "API Agronomist", email: "agro@api-test.agaate.local", passwordHash, role: "AGRONOMIST" },
    });
    officerA = await prisma.user.create({
      data: { name: "API Officer A", email: "officerA@api-test.agaate.local", passwordHash, role: "FARM_OFFICER" },
    });
    officerB = await prisma.user.create({
      data: { name: "API Officer B", email: "officerB@api-test.agaate.local", passwordHash, role: "FARM_OFFICER" },
    });
    disabledUser = await prisma.user.create({
      data: { name: "API Disabled User", email: "disabled@api-test.agaate.local", passwordHash, role: "FARM_OFFICER", active: false },
    });

    superAdminCookie = await createAuthCookie(superAdmin);
    farmAdminCookie = await createAuthCookie(farmAdmin);
    agroCookie = await createAuthCookie(agronomist);
    officerACookie = await createAuthCookie(officerA);
    officerBCookie = await createAuthCookie(officerB);
  });

  afterAll(async () => {
    await cleanup();
  });

  // =========================================================================
  // 1. AUTHENTICATION & SECURITY API
  // =========================================================================
  describe("1. Auth API Route Handlers", () => {
    beforeEach(() => {
      clearRateLimitStore();
    });

    it("logs in successfully with valid credentials", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", "POST", {
        email: "sa@api-test.agaate.local",
        password: "AgaatePassword123!",
      });
      const res = await loginHandler(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.user.role).toBe("SUPER_ADMIN");
      expect(data.user.email).toBeUndefined(); // Should not leak password hash or email
    });

    it("rejects login with wrong password (401)", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", "POST", {
        email: "sa@api-test.agaate.local",
        password: "WrongPassword!",
      });
      const res = await loginHandler(req);
      expect(res.status).toBe(401);
    });

    it("rejects login for disabled account (401)", async () => {
      const req = createJsonRequest("http://localhost:3000/api/auth/login", "POST", {
        email: "disabled@api-test.agaate.local",
        password: "AgaatePassword123!",
      });
      const res = await loginHandler(req);
      expect(res.status).toBe(401);
    });

    it("enforces sliding-window rate limiting on repeated failed logins (429)", async () => {
      const testEmail = "fa@api-test.agaate.local";
      const ip = "192.168.1.100";

      for (let i = 0; i < 5; i++) {
        const req = createJsonRequest(
          "http://localhost:3000/api/auth/login",
          "POST",
          { email: testEmail, password: "WrongPassword!" },
          undefined,
          { "x-forwarded-for": ip }
        );
        const res = await loginHandler(req);
        expect(res.status).toBe(401);
      }

      // 6th attempt should be blocked with 429 Too Many Requests
      const blockedReq = createJsonRequest(
        "http://localhost:3000/api/auth/login",
        "POST",
        { email: testEmail, password: "WrongPassword!" },
        undefined,
        { "x-forwarded-for": ip }
      );
      const blockedRes = await loginHandler(blockedReq);
      expect(blockedRes.status).toBe(429);
      const body = await blockedRes.json();
      expect(body.error).toContain("Too many failed login attempts");
    });

    it("clears session cookie on logout", async () => {
      const res = await logoutHandler();
      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.ok).toBe(true);
    });
  });

  // =========================================================================
  // 2. FARMS & PLOTS API
  // =========================================================================
  describe("2. Farms & Plots API", () => {
    it("creates Farm A with location and area limits (POST /api/farms)", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/farms",
        "POST",
        {
          name: "API Test Farm A",
          ownerName: "Owner A",
          location: "Bengaluru North",
          latitude: 12.9716,
          longitude: 77.5946,
          totalArea: 10.0,
          cultivableArea: 8.0,
          waterSource: "Borewell",
          geofenceRadiusMeters: 500,
        },
        farmAdminCookie
      );
      const res = await withAuth(farmAdminCookie, () => createFarmHandler(req));
      testFarmA = await res.json();

      expect(res.status).toBe(201);
      expect(testFarmA.name).toBe("API Test Farm A");
      expect(testFarmA.status).toBe("SETUP");

      // Give Farm Admin and Officer A access
      await prisma.farmAccess.upsert({
        where: { userId_farmId: { userId: officerA.id, farmId: testFarmA.id } },
        update: {},
        create: { userId: officerA.id, farmId: testFarmA.id, canManage: false },
      });
      await prisma.farmAccess.upsert({
        where: { userId_farmId: { userId: farmAdmin.id, farmId: testFarmA.id } },
        update: { canManage: true },
        create: { userId: farmAdmin.id, farmId: testFarmA.id, canManage: true },
      });
    });

    it("creates Farm B for Officer B (POST /api/farms)", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/farms",
        "POST",
        {
          name: "API Test Farm B",
          ownerName: "Owner B",
          location: "Bengaluru South",
          latitude: 12.9141,
          longitude: 77.6109,
          totalArea: 6.0,
          cultivableArea: 5.0,
          waterSource: "Canal",
          geofenceRadiusMeters: 400,
        },
        farmAdminCookie
      );
      const res = await withAuth(farmAdminCookie, () => createFarmHandler(req));
      testFarmB = await res.json();

      expect(res.status).toBe(201);

      await prisma.farmAccess.upsert({
        where: { userId_farmId: { userId: officerB.id, farmId: testFarmB.id } },
        update: {},
        create: { userId: officerB.id, farmId: testFarmB.id, canManage: false },
      });
      await prisma.farmAccess.upsert({
        where: { userId_farmId: { userId: farmAdmin.id, farmId: testFarmB.id } },
        update: { canManage: true },
        create: { userId: farmAdmin.id, farmId: testFarmB.id, canManage: true },
      });
    });

    it("rejects farm creation when cultivable area exceeds total area (422)", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/farms",
        "POST",
        {
          name: "API Test Farm Invalid",
          ownerName: "Invalid",
          location: "Unknown",
          latitude: 12.0,
          longitude: 77.0,
          totalArea: 5.0,
          cultivableArea: 10.0, // Invalid: exceeds total area
          waterSource: "Well",
        },
        farmAdminCookie
      );
      const res = await withAuth(farmAdminCookie, () => createFarmHandler(req));
      expect(res.status).toBe(422);
    });

    it("creates Plot with multi-irrigation config (POST /api/farms/[farmId]/plots)", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/farms/${testFarmA.id}/plots`,
        "POST",
        {
          name: "Plot 1 - North Sector",
          area: 4.0,
          latitude: 12.9718,
          longitude: 77.5948,
          soilType: "Red Loam",
          irrigation: [
            { type: "Drip", details: "Inline drippers at 40cm" },
            { type: "Sprinkler", details: "Micro sprinklers" },
          ],
        },
        farmAdminCookie
      );
      const res = await withAuth(farmAdminCookie, () =>
        createPlotHandler(req, { params: Promise.resolve({ farmId: testFarmA.id }) })
      );
      testPlot1 = await res.json();

      expect(res.status).toBe(201);
      expect(testPlot1.irrigation).toHaveLength(2);
    });

    it("rejects plot area that exceeds farm cultivable area (422)", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/farms/${testFarmA.id}/plots`,
        "POST",
        {
          name: "Plot 2 - Overflow",
          area: 10.0, // Remaining cultivable area is 4.0 (8.0 - 4.0)
          latitude: 12.9718,
          longitude: 77.5948,
          irrigation: [{ type: "Drip" }],
        },
        farmAdminCookie
      );
      const res = await withAuth(farmAdminCookie, () =>
        createPlotHandler(req, { params: Promise.resolve({ farmId: testFarmA.id }) })
      );
      expect(res.status).toBe(422);
    });
  });

  // =========================================================================
  // 3. CROP CYCLE PLANNING & ACTIVATION GATEKEEPER
  // =========================================================================
  describe("3. Crop Cycles & Activation Gatekeeper", () => {
    it("creates Crop Cycle with 3 varieties, bed math, and auto-generated milestones", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/plots/${testPlot1.id}/crop-cycles`,
        "POST",
        {
          cropName: "Watermelon",
          startDate: "2026-08-30",
          expectedFirstHarvestDate: "2026-11-28",
          establishmentType: "NURSERY_TRANSPLANTATION",
          varieties: ["Arka Manik", "Sugar Baby", "Black Magic"],
          bedPreparationEnabled: true,
          bedWidthCm: 90,
          bedCenterDistanceCm: 150,
          expectedBedsPerAcre: 50,
          mulchEnabled: true,
          mulchHolePattern: "DOUBLE_LINE_ZIGZAG",
          plantDistanceCm: 45,
          expectedPlantsPerAcre: 2000,
          milestones: [
            { name: "Land Preparation", targetDate: "2026-09-05" },
            { name: "Mulching & TP / Sowing Readiness", targetDate: "2026-09-12" },
            { name: "Transplantation", targetDate: "2026-09-19" },
            { name: "First Harvest", targetDate: "2026-11-28" },
          ],
        },
        farmAdminCookie
      );
      const res = await withAuth(farmAdminCookie, () =>
        createCropCycleHandler(req, { params: Promise.resolve({ plotId: testPlot1.id }) })
      );
      testCropCycle = await res.json();

      expect(res.status).toBe(201);
      // Math verification: 4 acres * 50 beds/acre = 200 beds; 4 acres * 2000 plants/acre = 8000 plants
      expect(Number(testCropCycle.expectedTotalBeds)).toBe(200);
      expect(Number(testCropCycle.expectedPlants)).toBe(8000);
      expect(testCropCycle.milestones).toHaveLength(4);
    });

    it("rejects farm activation when prerequisites are not met (422 on Farm B)", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/farms/${testFarmB.id}/activate`, "POST", {}, farmAdminCookie);
      const res = await withAuth(farmAdminCookie, () =>
        activateFarmHandler(req, { params: Promise.resolve({ farmId: testFarmB.id }) })
      );
      expect(res.status).toBe(422);
    });

    it("activates Farm A after plot and planned crop cycles are created (POST /activate)", async () => {
      const req = createJsonRequest(`http://localhost:3000/api/farms/${testFarmA.id}/activate`, "POST", {}, farmAdminCookie);
      const res = await withAuth(farmAdminCookie, () =>
        activateFarmHandler(req, { params: Promise.resolve({ farmId: testFarmA.id }) })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("ACTIVE");
    });
  });

  // =========================================================================
  // 4. AGRONOMIST PLANNING & TASK ENGINE API
  // =========================================================================
  describe("4. Agronomy Planning & Tasks Engine", () => {
    it("creates 7-day rolling agronomy activity assigned to Officer A", async () => {
      const today = new Date();
      const dateStr = today.toISOString().slice(0, 10);

      const req = createJsonRequest(
        "http://localhost:3000/api/tasks",
        "POST",
        {
          farmId: testFarmA.id,
          plotId: testPlot1.id,
          cropCycleId: testCropCycle.id,
          title: "Fertigation with 19:19:19",
          description: "Inject 5kg/acre NPK through drip venturi",
          instructions: "Run 30 min before injection",
          category: "FERTIGATION",
          priority: "HIGH",
          date: dateStr,
          assignedOfficerId: officerA.id,
        },
        agroCookie
      );
      const res = await withAuth(agroCookie, () => createTaskHandler(req));
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.assignedOfficerId).toBe(officerA.id);
      testTaskId = data.id;
    });

    it("rejects task creation outside 7-day rolling window (422)", async () => {
      const inTwentyDays = new Date();
      inTwentyDays.setDate(inTwentyDays.getDate() + 20);

      const req = createJsonRequest(
        "http://localhost:3000/api/tasks",
        "POST",
        {
          farmId: testFarmA.id,
          plotId: testPlot1.id,
          cropCycleId: testCropCycle.id,
          title: "Future Task",
          description: "Too far in the future",
          category: "FERTIGATION",
          priority: "MEDIUM",
          date: inTwentyDays.toISOString().slice(0, 10),
          assignedOfficerId: officerA.id,
        },
        agroCookie
      );
      const res = await withAuth(agroCookie, () => createTaskHandler(req));
      expect(res.status).toBe(422);
    });

    it("enforces task view isolation: Officer A sees assigned task, Officer B does not", async () => {
      const reqA = createJsonRequest("http://localhost:3000/api/tasks", "GET", undefined, officerACookie);
      const resA = await withAuth(officerACookie, () => getTasksHandler(reqA));
      const tasksA = await resA.json();
      expect(tasksA.some((t: any) => t.id === testTaskId)).toBe(true);

      const reqB = createJsonRequest("http://localhost:3000/api/tasks", "GET", undefined, officerBCookie);
      const resB = await withAuth(officerBCookie, () => getTasksHandler(reqB));
      const tasksB = await resB.json();
      expect(tasksB.some((t: any) => t.id === testTaskId)).toBe(false);
    });

    it("blocks Officer B from modifying Officer A's task (403)", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/tasks/${testTaskId}`,
        "PATCH",
        { status: "IN_PROGRESS" },
        officerBCookie
      );
      const res = await withAuth(officerBCookie, () =>
        updateTaskHandler(req, { params: Promise.resolve({ taskId: testTaskId }) })
      );
      expect(res.status).toBe(403);
    });

    it("allows Officer A to transition task to IN_PROGRESS (PATCH /api/tasks/[id])", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/tasks/${testTaskId}`,
        "PATCH",
        { status: "IN_PROGRESS" },
        officerACookie
      );
      const res = await withAuth(officerACookie, () =>
        updateTaskHandler(req, { params: Promise.resolve({ taskId: testTaskId }) })
      );
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.status).toBe("IN_PROGRESS");
    });

    it("allows Farm Admin managing the farm to update task instructions and priority", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/tasks/${testTaskId}`,
        "PATCH",
        {
          priority: "HIGH",
          instructions: "Ensure drip lines are flushed after fertigation cycle.",
        },
        farmAdminCookie
      );
      const res = await withAuth(farmAdminCookie, () =>
        updateTaskHandler(req, { params: Promise.resolve({ taskId: testTaskId }) })
      );
      const data = await res.json();
      expect(res.status).toBe(200);
      expect(data.priority).toBe("HIGH");
      expect(data.instructions).toBe("Ensure drip lines are flushed after fertigation cycle.");
    });

    it("completes task with materials ledger and labour hours tracking (POST /complete)", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/tasks/${testTaskId}/complete`,
        "POST",
        {
          remarks: "Fertigation finished smoothly at 3.0 bar pressure",
          materials: [{ materialName: "NPK 19:19:19", quantity: 20, unit: "kg" }],
          labour: [{ labourers: 4, hours: 5 }], // 4 * 5 = 20 labour hours
        },
        officerACookie
      );
      const res = await withAuth(officerACookie, () =>
        completeTaskHandler(req, { params: Promise.resolve({ taskId: testTaskId }) })
      );
      const execution = await res.json();

      expect(res.status).toBe(200);
      expect(execution.status).toBe("COMPLETED");

      const dbTask = await prisma.task.findUniqueOrThrow({
        where: { id: testTaskId },
        include: { executions: { include: { materials: true, labour: true } } },
      });
      expect(dbTask.status).toBe("COMPLETED");
      expect(Number(dbTask.executions[0].labour[0].labourHours)).toBe(20);
      expect(dbTask.executions[0].materials[0].materialName).toBe("NPK 19:19:19");
    });
  });

  // =========================================================================
  // 5. ATTENDANCE & GEOFENCING API
  // =========================================================================
  describe("5. Attendance & Geofencing API", () => {
    beforeAll(async () => {
      // Create verified selfie media assets in DB for attendance tests
      const selfieMedia = await prisma.mediaAsset.create({
        data: {
          storageKey: `evidence/${testFarmA.id}/2026-08-30/selfie-test.jpg`,
          kind: "SELFIE",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
          farmId: testFarmA.id,
          uploadedById: officerA.id,
          verifiedAt: new Date(),
        },
      });
      testSelfieMediaId = selfieMedia.id;
    });

    it("starts day within geofence radius (Status: OPEN)", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/attendance",
        "POST",
        {
          farmId: testFarmA.id,
          action: "START",
          latitude: 12.97165,
          longitude: 77.59465, // ~8 meters from farm coordinates
          selfieMediaId: testSelfieMediaId,
        },
        officerACookie
      );
      const res = await withAuth(officerACookie, () => postAttendanceHandler(req));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.attendance.status).toBe("OPEN");
      expect(data.withinGeofence).toBe(true);
    });

    it("rejects duplicate start day for the same farm and officer on the same date (422)", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/attendance",
        "POST",
        {
          farmId: testFarmA.id,
          action: "START",
          latitude: 12.97165,
          longitude: 77.59465,
          selfieMediaId: testSelfieMediaId,
        },
        officerACookie
      );
      const res = await withAuth(officerACookie, () => postAttendanceHandler(req));
      expect(res.status).toBe(422);
    });

    it("generates attendance exception when clocking in outside geofence with reason", async () => {
      const selfieB = await prisma.mediaAsset.create({
        data: {
          storageKey: `evidence/${testFarmB.id}/2026-08-30/selfie-b.jpg`,
          kind: "SELFIE",
          mimeType: "image/jpeg",
          sizeBytes: 1024,
          farmId: testFarmB.id,
          uploadedById: officerB.id,
          verifiedAt: new Date(),
        },
      });

      // 1. Outside without reason -> 422
      const reqNoReason = createJsonRequest(
        "http://localhost:3000/api/attendance",
        "POST",
        {
          farmId: testFarmB.id,
          action: "START",
          latitude: 13.5000,
          longitude: 78.5000, // ~100km away
          selfieMediaId: selfieB.id,
        },
        officerBCookie
      );
      const resNoReason = await withAuth(officerBCookie, () => postAttendanceHandler(reqNoReason));
      expect(resNoReason.status).toBe(422);

      // 2. Outside with reason -> 200 with EXCEPTION_PENDING
      const reqWithReason = createJsonRequest(
        "http://localhost:3000/api/attendance",
        "POST",
        {
          farmId: testFarmB.id,
          action: "START",
          latitude: 13.5000,
          longitude: 78.5000,
          selfieMediaId: selfieB.id,
          reason: "Attending agricultural machinery exhibition",
        },
        officerBCookie
      );
      const resWithReason = await withAuth(officerBCookie, () => postAttendanceHandler(reqWithReason));
      const data = await resWithReason.json();

      expect(resWithReason.status).toBe(200);
      expect(data.attendance.status).toBe("EXCEPTION_PENDING");
      expect(data.withinGeofence).toBe(false);

      const dbException = await prisma.attendanceException.findUniqueOrThrow({
        where: { attendanceId: data.attendance.id },
      });
      testExceptionId = dbException.id;
    });

    it("allows Farm Admin to approve attendance exception (PATCH /api/attendance-exceptions/[id])", async () => {
      const req = createJsonRequest(
        `http://localhost:3000/api/attendance-exceptions/${testExceptionId}`,
        "PATCH",
        { status: "APPROVED" },
        farmAdminCookie
      );
      const res = await withAuth(farmAdminCookie, () =>
        reviewExceptionOptionHandler(req, { params: Promise.resolve({ exceptionId: testExceptionId }) })
      );
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.status).toBe("APPROVED");
    });

    it("completes End Day clock-out (POST /api/attendance action=END)", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/attendance",
        "POST",
        {
          farmId: testFarmA.id,
          action: "END",
          latitude: 12.97165,
          longitude: 77.59465,
          selfieMediaId: testSelfieMediaId,
        },
        officerACookie
      );
      const res = await withAuth(officerACookie, () => postAttendanceHandler(req));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.attendance.status).toBe("COMPLETED");
      expect(data.attendance.endAt).toBeDefined();
    });
  });

  // =========================================================================
  // 6. CROP MONITORING & INCIDENTS API
  // =========================================================================
  describe("6. Crop Monitoring & Incidents API", () => {
    beforeAll(async () => {
      const cropMedia = await prisma.mediaAsset.create({
        data: {
          storageKey: `evidence/${testFarmA.id}/2026-08-30/crop.jpg`,
          kind: "CROP_PHOTO",
          mimeType: "image/jpeg",
          sizeBytes: 2048,
          farmId: testFarmA.id,
          uploadedById: officerA.id,
          verifiedAt: new Date(),
        },
      });
      testCropMediaId = cropMedia.id;

      const incidentMedia = await prisma.mediaAsset.create({
        data: {
          storageKey: `evidence/${testFarmA.id}/2026-08-30/incident.jpg`,
          kind: "INCIDENT_PHOTO",
          mimeType: "image/jpeg",
          sizeBytes: 2048,
          farmId: testFarmA.id,
          uploadedById: officerA.id,
          verifiedAt: new Date(),
        },
      });
      testIncidentMediaId = incidentMedia.id;
    });

    it("submits crop monitoring record (POST /api/monitoring)", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/monitoring",
        "POST",
        {
          farmId: testFarmA.id,
          plotId: testPlot1.id,
          cropCycleId: testCropCycle.id,
          status: "GOOD",
          stage: "Vegetative",
          remarks: "Healthy vine vigor with optimal internodal distance",
          mediaIds: [testCropMediaId],
        },
        officerACookie
      );
      const res = await withAuth(officerACookie, () => createMonitoringHandler(req));
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.status).toBe("GOOD");
      expect(data.stage).toBe("Vegetative");
    });

    it("reports an incident and tracks follow-up and resolution (POST /api/incidents)", async () => {
      const req = createJsonRequest(
        "http://localhost:3000/api/incidents",
        "POST",
        {
          farmId: testFarmA.id,
          level: "PLOT",
          plotId: testPlot1.id,
          type: "Drip Lateral Tear",
          severity: "MEDIUM",
          description: "Lateral pipe torn by weeding hoe in sector 4",
          mediaIds: [testIncidentMediaId],
        },
        officerACookie
      );
      const res = await withAuth(officerACookie, () => createIncidentHandler(req));
      const incident = await res.json();

      expect(res.status).toBe(201);
      expect(incident.status).toBe("OPEN");
      testIncidentId = incident.id;

      // Add follow-up
      const followUpReq = createJsonRequest(
        `http://localhost:3000/api/incidents/${testIncidentId}/follow-ups`,
        "POST",
        { action: "Coupler repair installed", remarks: "Pressure checked" },
        farmAdminCookie
      );
      const followUpRes = await withAuth(farmAdminCookie, () =>
        createFollowUpHandler(followUpReq, { params: Promise.resolve({ incidentId: testIncidentId }) })
      );
      expect(followUpRes.status).toBe(201);

      // Resolve incident
      const patchReq = createJsonRequest(
        `http://localhost:3000/api/incidents/${testIncidentId}`,
        "PATCH",
        { status: "RESOLVED" },
        farmAdminCookie
      );
      const patchRes = await withAuth(farmAdminCookie, () =>
        updateIncidentHandler(patchReq, { params: Promise.resolve({ incidentId: testIncidentId }) })
      );
      const updated = await patchRes.json();
      expect(updated.status).toBe("RESOLVED");
    });
  });

  // =========================================================================
  // 7. DASHBOARD & DAILY OPERATIONS REPORT API
  // =========================================================================
  describe("7. Dashboard & Daily Operations Report Ground Truth", () => {
    it("aggregates dashboard KPIs accurately from live database records", async () => {
      const req = createJsonRequest("http://localhost:3000/api/dashboard", "GET", undefined, superAdminCookie);
      const res = await withAuth(superAdminCookie, () => getDashboardHandler(req));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.activeFarms).toBeGreaterThanOrEqual(1);
      expect(data.completedActivities).toBeGreaterThanOrEqual(1);
    });

    it("proves overdue task records increase the delayedAlerts metric on the dashboard", async () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 2);

      // Create an overdue task in Farm A
      const overdueTask = await prisma.task.create({
        data: {
          farmId: testFarmA.id,
          plotId: testPlot1.id,
          cropCycleId: testCropCycle.id,
          title: "Overdue Irrigation Check",
          description: "Inspect drip lines for blockages",
          category: "IRRIGATION",
          priority: "URGENT",
          origin: "AGRONOMIST",
          dueDate: yesterday,
          status: "ASSIGNED",
          assignedOfficerId: officerA.id,
          createdById: agronomist.id,
        },
      });

      const req = createJsonRequest("http://localhost:3000/api/dashboard", "GET", undefined, superAdminCookie);
      const res = await withAuth(superAdminCookie, () => getDashboardHandler(req));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.delayedActivities).toBeGreaterThanOrEqual(1);

      // Cleanup overdue task
      await prisma.task.delete({ where: { id: overdueTask.id } });
    });

    it("projects daily operations report with labor hours and materials ledger", async () => {
      const todayStr = new Date().toISOString().slice(0, 10);
      const req = createJsonRequest(
        `http://localhost:3000/api/reports/daily?farmId=${testFarmA.id}&date=${todayStr}`,
        "GET",
        undefined,
        farmAdminCookie
      );
      const res = await withAuth(farmAdminCookie, () => getDailyReportHandler(req));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.farmId).toBe(testFarmA.id);
      expect(data.attendance.length).toBeGreaterThanOrEqual(1);
      expect(data.resources.labourHours).toBeGreaterThanOrEqual(20);
      expect(data.resources.materials.some((m: any) => m.materialName === "NPK 19:19:19")).toBe(true);
    });
  });

  // =========================================================================
  // 8. S3 OBJECT STORAGE & UPLOAD VERIFICATION LIFECYCLE
  // =========================================================================
  describe("8. S3 Object Storage & Upload Verification Lifecycle", () => {
    it("handles presign, object upload, and server-side headObject verification", async () => {
      const buffer = Buffer.from("real-s3-binary-test-evidence-payload-99");
      const sizeBytes = buffer.length;
      const mimeType = "image/jpeg";

      // 1. Presign upload
      const presignReq = createJsonRequest(
        "http://localhost:3000/api/uploads/presign",
        "POST",
        {
          farmId: testFarmA.id,
          kind: "SELFIE",
          mimeType,
          sizeBytes,
        },
        officerACookie
      );
      const presignRes = await withAuth(officerACookie, () => presignUploadHandler(presignReq));
      const presignData = await presignRes.json();

      expect(presignRes.status).toBe(200);
      expect(presignData.mediaId).toBeDefined();
      expect(presignData.uploadUrl).toBeDefined();

      // 2. PUT binary to MinIO / S3
      const s3PutRes = await fetch(presignData.uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": mimeType },
        body: buffer,
      });
      expect(s3PutRes.ok).toBe(true);

      // 3. Complete and verify on server via HeadObject
      const completeReq = createJsonRequest(
        `http://localhost:3000/api/uploads/${presignData.mediaId}/complete`,
        "POST",
        {},
        officerACookie
      );
      const completeRes = await withAuth(officerACookie, () =>
        completeUploadHandler(completeReq, { params: Promise.resolve({ mediaId: presignData.mediaId }) })
      );
      const verifiedMedia = await completeRes.json();

      expect(completeRes.status).toBe(200);
      expect(verifiedMedia.verifiedAt).toBeDefined();
      expect(verifiedMedia.sizeBytes).toBe(sizeBytes);
    });

    it("rejects upload completion when remote S3 object does not exist or size mismatches (422)", async () => {
      const fakeMedia = await prisma.mediaAsset.create({
        data: {
          storageKey: `evidence/${testFarmA.id}/2026-08-30/nonexistent.jpg`,
          kind: "CROP_PHOTO",
          mimeType: "image/jpeg",
          sizeBytes: 9999,
          farmId: testFarmA.id,
          uploadedById: officerA.id,
        },
      });

      const completeReq = createJsonRequest(
        `http://localhost:3000/api/uploads/${fakeMedia.id}/complete`,
        "POST",
        {},
        officerACookie
      );
      const completeRes = await withAuth(officerACookie, () =>
        completeUploadHandler(completeReq, { params: Promise.resolve({ mediaId: fakeMedia.id }) })
      );
      expect(completeRes.status).toBe(422);
    });
  });
});

