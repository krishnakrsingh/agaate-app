import { describe, it, expect, beforeAll } from "vitest";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

describe("Tactical Onboarding, Operations Calendar & Workers Console", () => {
  let superAdminId: string;
  let farmAdminId: string;
  let farmId: string;
  let plotId: string;
  let workerPhone: string;

  beforeAll(async () => {
    // 1. Setup Super Admin
    const superAdmin = await prisma.user.upsert({
      where: { email: "hq.admin@agaate.ag" },
      update: {},
      create: {
        name: "HQ Super Admin",
        email: "hq.admin@agaate.ag",
        phone: "+919876543210",
        passwordHash: await bcrypt.hash("Agaate@HQ2026", 10),
        role: "SUPER_ADMIN",
      },
    });
    superAdminId = superAdmin.id;

    // 2. Setup Farm with GeoJSON Boundary & Client Specs
    const timestamp = Date.now();
    const testGeoJson = JSON.stringify({
      type: "Polygon",
      coordinates: [
        [
          [77.5946, 13.0827],
          [77.6046, 13.0827],
          [77.6046, 13.0927],
          [77.5946, 13.0927],
          [77.5946, 13.0827],
        ],
      ],
    });

    const farm = await prisma.farm.create({
      data: {
        name: `Kolar Highland Orchard ${timestamp}`,
        ownerName: `Devraj Patel ${timestamp}`,
        location: "Kolar, Karnataka",
        latitude: 13.0827,
        longitude: 77.5946,
        totalArea: 25.0,
        cultivableArea: 22.5,
        waterSource: "BOREWELL_AND_DRIP",
        soilType: "RED_LOAMY",
        boundaryGeoJson: testGeoJson,
        clientPhone: `+919988${String(timestamp).slice(-6)}`,
        status: "ACTIVE",
      },
    });
    farmId = farm.id;

    // 3. Setup Farm Admin User
    const farmAdmin = await prisma.user.create({
      data: {
        name: `Devraj Patel ${timestamp}`,
        email: `devraj.${timestamp}@kolarorchards.in`,
        phone: farm.clientPhone,
        passwordHash: await bcrypt.hash("FarmOwner@2026", 10),
        role: "FARM_ADMIN",
        farmAccess: {
          create: { farmId: farm.id, canManage: true },
        },
      },
    });
    farmAdminId = farmAdmin.id;

    // 4. Setup Plot
    const plot = await prisma.plot.create({
      data: {
        farmId: farm.id,
        name: "North Block A",
        area: 10.0,
        latitude: 13.0827,
        longitude: 77.5946,
        status: "ACTIVE",
      },
    });
    plotId = plot.id;
  });

  it("1. Verifies Farm is created with tactical boundary GeoJSON and client phone", async () => {
    const farm = await prisma.farm.findUnique({
      where: { id: farmId },
    });
    expect(farm).toBeDefined();
    expect(farm?.soilType).toBe("RED_LOAMY");
    expect(farm?.boundaryGeoJson).toContain("coordinates");
    expect(farm?.clientPhone).toBeDefined();

    const parsedGeo = JSON.parse(farm!.boundaryGeoJson!);
    expect(parsedGeo.type).toBe("Polygon");
    expect(parsedGeo.coordinates[0]).toHaveLength(5);
  });

  it("2. Creates Farm Officer (Laborer) with phone number and supervisor flag via synthetic email", async () => {
    const timestamp = Date.now();
    workerPhone = `+919123${String(timestamp).slice(-6)}`;
    const syntheticEmail = `${workerPhone.replace(/[^\d]/g, "")}@worker.agaate.ag`;

    const worker = await prisma.user.create({
      data: {
        name: "Ramesh Gowda",
        phone: workerPhone,
        email: syntheticEmail,
        isSupervisor: true,
        passwordHash: await bcrypt.hash("Worker@123", 10),
        role: "FARM_OFFICER",
        farmAccess: {
          create: { farmId, canManage: false },
        },
      },
      include: { farmAccess: true },
    });

    expect(worker.id).toBeDefined();
    expect(worker.phone).toBe(workerPhone);
    expect(worker.isSupervisor).toBe(true);
    expect(worker.role).toBe("FARM_OFFICER");
    expect(worker.farmAccess[0].farmId).toBe(farmId);
  });

  it("3. Populates Task, Incident, and Harvest and queries Operations Calendar ledger", async () => {
    const targetDate = new Date("2026-09-08T00:00:00.000Z");

    // Create Task for today
    const task = await prisma.task.create({
      data: {
        farmId,
        plotId,
        origin: "DAILY_MONITORING",
        category: "IRRIGATION",
        title: "Flush Drip Lines Block A",
        description: "Run 45-minute pressurized flush through sub-main drippers",
        priority: "HIGH",
        dueDate: targetDate,
        status: "COMPLETED",
        createdById: farmAdminId,
      },
    });

    // Create Incident for today
    const incident = await prisma.incident.create({
      data: {
        farmId,
        plotId,
        reporterId: farmAdminId,
        level: "PLOT",
        type: "IRRIGATION_LEAK",
        description: "Pressure drop detected in lateral valve 4",
        severity: "HIGH",
        status: "OPEN",
      },
    });

    // Verify retrieval for calendar
    const tasks = await prisma.task.findMany({
      where: { farmId, dueDate: task.dueDate },
      include: { plot: true },
    });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Flush Drip Lines Block A");
    expect(tasks[0].plot?.name).toBe("North Block A");

    const incidents = await prisma.incident.findMany({
      where: { farmId },
      include: { plot: true, reporter: true },
    });
    expect(incidents.some((i) => i.id === incident.id)).toBe(true);
  });
});
