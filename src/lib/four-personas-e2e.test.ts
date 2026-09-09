import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { testSessionContext } from "./auth";

// Routes to test the complete 4-tier lifecycle
import { POST as onboardClientHandler } from "@/app/api/admin/onboard-client/route";
import { POST as createUserHandler } from "@/app/api/users/route";
import { POST as quickLogHandler } from "@/app/api/officer/quick-log/route";
import { POST as createInventoryHandler, GET as getInventoryHandler } from "@/app/api/inventory/route";
import { POST as createHarvestHandler, GET as getHarvestHandler } from "@/app/api/harvest/route";
import { POST as createCrewHandler, GET as getCrewHandler } from "@/app/api/crew/route";
import { POST as createPrescriptionHandler } from "@/app/api/prescriptions/route";

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

describe.sequential("Complete 4-Tier Persona Operational Lifecycle", () => {
  let superAdmin: any;
  let agronomist: any;
  let saCookie: string;
  let clientCookie: string;
  let officerCookie: string;
  let agroCookie: string;

  let onboardedFarm: any;
  let onboardedOwner: any;
  let onboardedPlot: any;
  let hiredOfficer: any;
  let seededSku: any;
  let blockCycle: any;

  beforeAll(async () => {
    // 1. Fetch or create Super Admin and Central Agronomist
    superAdmin = await prisma.user.findFirst({ where: { role: "SUPER_ADMIN" } });
    if (!superAdmin) {
      superAdmin = await prisma.user.create({
        data: {
          name: "Test HQ Admin",
          email: "hq-admin@test.agaate.ag",
          passwordHash: "dummy-hash",
          role: "SUPER_ADMIN",
        },
      });
    }

    agronomist = await prisma.user.findFirst({ where: { role: "AGRONOMIST" } });
    if (!agronomist) {
      agronomist = await prisma.user.create({
        data: {
          name: "Test Agronomist",
          email: "agronomist@test.agaate.ag",
          passwordHash: "dummy-hash",
          role: "AGRONOMIST",
        },
      });
    }

    saCookie = await cookieFor(superAdmin);
    agroCookie = await cookieFor(agronomist);
  });

  afterAll(async () => {
    // Clean up created entities for this run
    if (onboardedFarm?.id) {
      await prisma.harvestLog.deleteMany({ where: { farmId: onboardedFarm.id } });
      await prisma.dailyCrewMuster.deleteMany({ where: { farmId: onboardedFarm.id } });
      await prisma.inventoryTransaction.deleteMany({ where: { item: { farmId: onboardedFarm.id } } });
      await prisma.inventoryItem.deleteMany({ where: { farmId: onboardedFarm.id } });
      await prisma.agronomyPrescription.deleteMany({ where: { farmId: onboardedFarm.id } });
      await prisma.taskExecution.deleteMany({ where: { task: { farmId: onboardedFarm.id } } });
      await prisma.task.deleteMany({ where: { farmId: onboardedFarm.id } });
      await prisma.cropCycle.deleteMany({ where: { plot: { farmId: onboardedFarm.id } } });
      await prisma.irrigationConfiguration.deleteMany({ where: { plot: { farmId: onboardedFarm.id } } });
      await prisma.plot.deleteMany({ where: { farmId: onboardedFarm.id } });
      await prisma.farmAccess.deleteMany({ where: { farmId: onboardedFarm.id } });
      await prisma.farm.deleteMany({ where: { id: onboardedFarm.id } });
    }
    if (onboardedOwner?.id) {
      await prisma.user.deleteMany({ where: { id: onboardedOwner.id } });
    }
    if (hiredOfficer?.id) {
      await prisma.user.deleteMany({ where: { id: hiredOfficer.id } });
    }
  });

  // ── 1. SUPER ADMIN FLOW ──
  it("Tier 1: Super Admin onboards client estate, creates owner credentials & assigns agronomist", async () => {
    const timestamp = Date.now();
    const payload = {
      farmName: `Sunrise Orchard ${timestamp}`,
      ownerName: "Vikram Singhania",
      ownerEmail: `vikram.owner.${timestamp}@singhania.estate`,
      ownerPassword: "SecureClientPassword123!",
      location: "Chikkaballapur, Karnataka",
      latitude: 13.4325,
      longitude: 77.7275,
      totalArea: 25.0,
      cultivableArea: 22.5,
      waterSource: "3x 20HP Borewells with drip filtration",
      geofenceRadiusMeters: 600,
      agronomistId: agronomist.id,
      initialPlotName: "Block Alpha - Pomegranate",
      initialPlotArea: 10.0,
      initialIrrigationType: "Drip",
    };

    const res = await withAuth(saCookie, async () => {
      return onboardClientHandler(req("http://localhost:3000/api/admin/onboard-client", "POST", payload, saCookie));
    });

    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.farm.name).toBe(payload.farmName);
    expect(body.owner.email).toBe(payload.ownerEmail);
    // Secure handover: server never echoes the credential back. Verify the
    // login identifier + URL instead (see onboard-client route).
    expect(body.handover.loginUrl).toBe("/login");
    expect(body.handover.loginIdentifier).toBeTruthy();

    onboardedFarm = body.farm;
    onboardedOwner = body.owner;
    onboardedPlot = body.plot;

    clientCookie = await cookieFor({ id: onboardedOwner.id, name: onboardedOwner.name, role: "FARM_ADMIN" });
  });

  // ── 2. FARM OWNER (CLIENT) FLOW ──
  it("Tier 2: Farm Owner employs on-site Farm Manager and stocks shed inventory", async () => {
    const timestamp = Date.now();
    // 1. Hire on-site manager
    const hirePayload = {
      name: "Suresh Gowda",
      email: `suresh.manager.${timestamp}@singhania.estate`,
      password: "ManagerPassword123!",
      role: "FARM_OFFICER",
      farmId: onboardedFarm.id,
      farmIds: [onboardedFarm.id],
    };

    const hireRes = await withAuth(clientCookie, async () => {
      return createUserHandler(req("http://localhost:3000/api/users", "POST", hirePayload, clientCookie));
    });

    expect(hireRes.status).toBe(201);
    hiredOfficer = await hireRes.json();
    expect(hiredOfficer.role).toBe("FARM_OFFICER");

    officerCookie = await cookieFor({ id: hiredOfficer.id, name: hiredOfficer.name, role: "FARM_OFFICER" });

    // 2. Add warehouse SKUs to shed inventory
    const skuPayload = {
      farmId: onboardedFarm.id,
      name: "Soluble NPK 19-19-19",
      category: "FERTILIZER",
      quantity: 50,
      unit: "KG",
      reorderLevel: 10,
      costPerUnit: 120,
    };

    const skuRes = await withAuth(clientCookie, async () => {
      return createInventoryHandler(req("http://localhost:3000/api/inventory", "POST", skuPayload, clientCookie));
    });

    expect(skuRes.status).toBe(201);
    seededSku = await skuRes.json();
    expect(Number(seededSku.quantityInStock)).toBe(50);
  });

  // ── 3. FARM OFFICER (ON-SITE SUPERVISOR) FLOW ──
  it("Tier 3: Farm Officer logs quick field work (auto-deducting stock), records harvest, and musters crew", async () => {
    // 1. Express Quick Log with inventory deduction
    const quickLogPayload = {
      farmId: onboardedFarm.id,
      plotId: onboardedPlot.id,
      category: "FERTIGATION",
      title: "Fertigation Run Alpha Block",
      durationMinutes: 45,
      inventoryItemId: seededSku.id,
      inventoryQuantity: 5,
      notes: "Applied 5kg NPK through venturi injector.",
    };

    const qlRes = await withAuth(officerCookie, async () => {
      return quickLogHandler(req("http://localhost:3000/api/officer/quick-log", "POST", quickLogPayload, officerCookie));
    });

    expect(qlRes.status).toBe(201);

    // Verify shed inventory dropped from 50 to 45
    const invRes = await withAuth(clientCookie, async () => {
      return getInventoryHandler(req(`http://localhost:3000/api/inventory?farmId=${onboardedFarm.id}`, "GET", undefined, clientCookie));
    });
    const invItems = await invRes.json();
    const updatedSku = invItems.find((i: any) => i.id === seededSku.id);
    expect(Number(updatedSku.quantityInStock)).toBe(45);

    // 2. Log Commercial Harvest cut (block must have an active crop cycle —
    //    the harvest logger UI requires cycle selection and HarvestLog
    //    carries a mandatory cropCycleId for traceability).
    blockCycle = await prisma.cropCycle.create({
      data: {
        plotId: onboardedPlot.id,
        cropName: "Ruby Red Pomegranate",
        establishmentType: "DIRECT_SOWING",
        startDate: new Date(),
        status: "ACTIVE",
      },
    });
    const harvestPayload = {
      farmId: onboardedFarm.id,
      plotId: onboardedPlot.id,
      cropCycleId: blockCycle.id,
      harvestDate: new Date().toISOString().slice(0, 10),
      quantity: 850,
      unit: "KG",
      grade: "GRADE_A",
      pricePerUnit: 45,
      buyerOrMarket: "Bangalore Yeshwanthpur APMC",
      vehicleNumber: "KA-04-E-9988",
      notes: "42 export crates loaded onto mini-truck.",
    };

    const harvestRes = await withAuth(officerCookie, async () => {
      return createHarvestHandler(req("http://localhost:3000/api/harvest", "POST", harvestPayload, officerCookie));
    });

    expect(harvestRes.status).toBe(201);
    const harvestData = await harvestRes.json();
    expect(Number(harvestData.totalAmount)).toBe(850 * 45);

    // 3. Log Crew Muster & payroll outflow
    const crewPayload = {
      farmId: onboardedFarm.id,
      musterDate: new Date().toISOString().slice(0, 10),
      totalLabourers: 12,
      maleCount: 4,
      femaleCount: 8,
      hoursPerShift: 8,
      dailyWageRate: 450,
      contractorName: "Ramesh Maistry Gang",
      notes: "8 weeding in Block Alpha, 4 picking pomegranate.",
    };

    const crewRes = await withAuth(officerCookie, async () => {
      return createCrewHandler(req("http://localhost:3000/api/crew", "POST", crewPayload, officerCookie));
    });

    expect(crewRes.status).toBe(201);
    const crewData = await crewRes.json();
    expect(Number(crewData.totalWageCost)).toBe(12 * 450);
  });

  // ── 4. CENTRAL AGRONOMIST FLOW ──
  it("Tier 4: Central Agronomist issues prescription that auto-dispatches to officer board", async () => {
    // Target the active cycle established in Tier 3.
    const cropCycle = blockCycle;

    const rxPayload = {
      farmId: onboardedFarm.id,
      plotId: onboardedPlot.id,
      cropCycleId: cropCycle.id,
      targetIssue: "Cercospora Leaf Spot & Fruit Borer Prevention",
      applicationDate: new Date().toISOString().slice(0, 10),
      priority: "HIGH",
      recipeDetails: [
        {
          materialName: "Azoxystrobin 23% SC",
          dosage: "1.0 ml / L water",
          waterVolume: "200 L / Acre",
        },
      ],
      instructions: "Spray during evening twilight after 4:30 PM. Ensure coverage on fruit surface.",
      assignedOfficerId: hiredOfficer.id,
    };

    const rxRes = await withAuth(agroCookie, async () => {
      return createPrescriptionHandler(req("http://localhost:3000/api/prescriptions", "POST", rxPayload, agroCookie));
    });

    expect(rxRes.status).toBe(201);
    const rx = await rxRes.json();
    expect(rx.targetIssue).toBe(rxPayload.targetIssue);

    // Verify task auto-dispatch on officer's board
    const dispatchedTask = await prisma.task.findFirst({
      where: {
        farmId: onboardedFarm.id,
        origin: "AGRONOMIST",
        assignedOfficerId: hiredOfficer.id,
      },
    });

    expect(dispatchedTask).toBeDefined();
    expect(dispatchedTask?.title).toContain(rxPayload.targetIssue);
  });

  // ── 5. OWNER COMMERCIAL AUDIT & REVENUE RECONCILIATION ──
  it("Owner Reconciliation: Verifies gross tonnage, revenue, and payroll totals", async () => {
    const harvestsRes = await withAuth(clientCookie, async () => {
      return getHarvestHandler(req(`http://localhost:3000/api/harvest?farmId=${onboardedFarm.id}`, "GET", undefined, clientCookie));
    });
    const harvests = await harvestsRes.json();
    expect(harvests).toHaveLength(1);
    expect(Number(harvests[0].quantity)).toBe(850);
    expect(Number(harvests[0].totalAmount)).toBe(38250);

    const mustersRes = await withAuth(clientCookie, async () => {
      return getCrewHandler(req(`http://localhost:3000/api/crew?farmId=${onboardedFarm.id}`, "GET", undefined, clientCookie));
    });
    const musters = await mustersRes.json();
    expect(musters).toHaveLength(1);
    expect(Number(musters[0].totalWageCost)).toBe(5400);
  });
});
