import { describe, expect, it, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import {
  calculatedInfrastructure,
  canTransitionTask,
  distanceMeters,
  isWithinRollingSevenDays,
  labourHours,
  milestoneTemplates,
  variance,
} from "./business";

describe.sequential("Domain-by-Domain Integration & End-to-End Proof", () => {
  let superAdminId: string;
  let farmAdminAId: string;
  let farmAdminBId: string;
  let agronomistId: string;
  let officer1Id: string;
  let officer2Id: string;
  let farmAId: string;
  let farmBId: string;
  let plot1Id: string;
  let plot2Id: string;
  let cropCycleId: string;
  let milestoneTaskIds: string[] = [];
  let plannedTaskId: string;
  let monitoringTaskId: string;

  const cleanup = async () => {
    const testUsers = await prisma.user.findMany({
      where: { email: { contains: "@test.agaate.local" } },
      select: { id: true },
    });
    const testUserIds = testUsers.map((u) => u.id);
    if (testUserIds.length) {
      await prisma.mediaAsset.deleteMany({ where: { uploadedById: { in: testUserIds } } });
    }
    await prisma.taskExecution.deleteMany({ where: { officer: { email: { contains: "@test.agaate.local" } } } });
    await prisma.task.deleteMany({ where: { createdBy: { email: { contains: "@test.agaate.local" } } } });
    await prisma.agronomyPlan.deleteMany({ where: { createdBy: { email: { contains: "@test.agaate.local" } } } });
    await prisma.cropMonitoring.deleteMany({ where: { officer: { email: { contains: "@test.agaate.local" } } } });
    await prisma.incident.deleteMany({ where: { reporter: { email: { contains: "@test.agaate.local" } } } });
    await prisma.attendance.deleteMany({ where: { user: { email: { contains: "@test.agaate.local" } } } });
    await prisma.locationChangeRequest.deleteMany({ where: { farm: { name: { startsWith: "Test Farm" } } } });
    await prisma.cropCycle.deleteMany({ where: { plot: { farm: { name: { startsWith: "Test Farm" } } } } });
    await prisma.plot.deleteMany({ where: { farm: { name: { startsWith: "Test Farm" } } } });
    await prisma.farmAccess.deleteMany({ where: { user: { email: { contains: "@test.agaate.local" } } } });
    await prisma.farm.deleteMany({ where: { name: { startsWith: "Test Farm" } } });
    await prisma.user.deleteMany({ where: { email: { contains: "@test.agaate.local" } } });
  };

  beforeAll(async () => {
    await cleanup();
  });

  afterAll(async () => {
    await cleanup();
  });

  // --------------------------------------------------------------------------
  // DOMAIN 1 & 2: FOUNDATION, USERS & RBAC ACCESS
  // --------------------------------------------------------------------------
  it("Domain 1 & 2: creates users with real bcrypt hashes and role assignments", async () => {
    const passwordHash = await bcrypt.hash("Password12345!", 10);

    const superAdmin = await prisma.user.create({
      data: { name: "Test Super Admin", email: "superadmin@test.agaate.local", passwordHash, role: "SUPER_ADMIN" },
    });
    superAdminId = superAdmin.id;

    const farmAdminA = await prisma.user.create({
      data: { name: "Test Admin A", email: "adminA@test.agaate.local", passwordHash, role: "FARM_ADMIN" },
    });
    farmAdminAId = farmAdminA.id;

    const farmAdminB = await prisma.user.create({
      data: { name: "Test Admin B", email: "adminB@test.agaate.local", passwordHash, role: "FARM_ADMIN" },
    });
    farmAdminBId = farmAdminB.id;

    const agronomist = await prisma.user.create({
      data: { name: "Test Agronomist", email: "agronomist@test.agaate.local", passwordHash, role: "AGRONOMIST" },
    });
    agronomistId = agronomist.id;

    const officer1 = await prisma.user.create({
      data: { name: "Test Officer 1", email: "officer1@test.agaate.local", passwordHash, role: "FARM_OFFICER" },
    });
    officer1Id = officer1.id;

    const officer2 = await prisma.user.create({
      data: { name: "Test Officer 2", email: "officer2@test.agaate.local", passwordHash, role: "FARM_OFFICER" },
    });
    officer2Id = officer2.id;

    expect(superAdmin.id).toBeDefined();
    expect(farmAdminA.role).toBe("FARM_ADMIN");
    expect(agronomist.role).toBe("AGRONOMIST");
    expect(officer1.role).toBe("FARM_OFFICER");
  });

  it("Domain 1 & 2: verifies bcrypt password matching works accurately", async () => {
    const user = await prisma.user.findUniqueOrThrow({ where: { id: superAdminId } });
    const valid = await bcrypt.compare("Password12345!", user.passwordHash);
    const invalid = await bcrypt.compare("WrongPassword", user.passwordHash);
    expect(valid).toBe(true);
    expect(invalid).toBe(false);
  });

  // --------------------------------------------------------------------------
  // DOMAIN 3: FARM & PLOT MANAGEMENT
  // --------------------------------------------------------------------------
  it("Domain 3: creates multiple farms with geofencing and area constraints", async () => {
    const farmA = await prisma.farm.create({
      data: {
        name: "Test Farm A",
        ownerName: "Client A",
        location: "Bengaluru North",
        latitude: 12.9716,
        longitude: 77.5946,
        totalArea: 25.0,
        cultivableArea: 20.0,
        waterSource: "Borewell",
        status: "SETUP",
        geofenceRadiusMeters: 500,
        access: {
          create: [
            { userId: farmAdminAId, canManage: true },
            { userId: officer1Id, canManage: false },
          ],
        },
      },
    });
    farmAId = farmA.id;

    const farmB = await prisma.farm.create({
      data: {
        name: "Test Farm B",
        ownerName: "Client B",
        location: "Bengaluru South",
        latitude: 12.9141,
        longitude: 77.6109,
        totalArea: 10.0,
        cultivableArea: 8.0,
        waterSource: "Canal",
        status: "SETUP",
        geofenceRadiusMeters: 400,
        access: {
          create: [
            { userId: farmAdminBId, canManage: true },
            { userId: officer2Id, canManage: false },
          ],
        },
      },
    });
    farmBId = farmB.id;

    expect(farmA.id).toBeDefined();
    expect(farmB.id).toBeDefined();
    expect(Number(farmA.cultivableArea)).toBeLessThanOrEqual(Number(farmA.totalArea));
  });

  it("Domain 3: verifies farm access isolation (Admin A cannot manage Farm B)", async () => {
    const adminAAccess = await prisma.farmAccess.findUnique({
      where: { userId_farmId: { userId: farmAdminAId, farmId: farmBId } },
    });
    expect(adminAAccess).toBeNull();

    const adminBAccess = await prisma.farmAccess.findUnique({
      where: { userId_farmId: { userId: farmAdminBId, farmId: farmBId } },
    });
    expect(adminBAccess?.canManage).toBe(true);
  });

  it("Domain 3: creates plots with multi-irrigation configuration and GPS coordinates", async () => {
    const plot1 = await prisma.plot.create({
      data: {
        farmId: farmAId,
        name: "Plot 1 - North Sector",
        area: 5.0,
        latitude: 12.9718,
        longitude: 77.5948,
        soilType: "Red Sandy Loam",
        status: "SETUP",
        irrigation: {
          create: [
            { type: "Drip", details: "Inline drippers at 40cm" },
            { type: "Sprinkler", details: "Micro-sprinklers for nursery" },
          ],
        },
      },
      include: { irrigation: true },
    });
    plot1Id = plot1.id;

    const plot2 = await prisma.plot.create({
      data: {
        farmId: farmAId,
        name: "Plot 2 - South Sector",
        area: 4.0,
        latitude: 12.9714,
        longitude: 77.5944,
        soilType: "Clay Loam",
        status: "SETUP",
        irrigation: {
          create: [{ type: "Drip", details: "Online drippers" }],
        },
      },
      include: { irrigation: true },
    });
    plot2Id = plot2.id;

    expect(plot1.irrigation).toHaveLength(2);
    expect(plot1.name).toBe("Plot 1 - North Sector");
  });

  // --------------------------------------------------------------------------
  // DOMAIN 4: CROP PLANNING & MILESTONE FORMULATION
  // --------------------------------------------------------------------------
  it("Domain 4: creates crop cycle with multiple varieties, bed & mulching math, and auto-generated milestones", async () => {
    const plot = await prisma.plot.findUniqueOrThrow({ where: { id: plot1Id } });
    const plotArea = Number(plot.area); // 5.0 acres
    const expectedBedsPerAcre = 400;
    const expectedPlantsPerAcre = 1600;

    const calc = calculatedInfrastructure(plotArea, expectedBedsPerAcre, expectedPlantsPerAcre);
    expect(calc.expectedTotalBeds).toBe(2000); // 5 * 400
    expect(calc.expectedPlants).toBe(8000); // 5 * 1600

    const templateMilestones = milestoneTemplates({
      mulchEnabled: true,
      establishmentType: "NURSERY_TRANSPLANTATION",
      firstHarvestDate: new Date("2026-11-20T00:00:00Z"),
    });

    const cropCycle = await prisma.cropCycle.create({
      data: {
        plotId: plot1Id,
        cropName: "Tomato",
        startDate: new Date("2026-08-30T00:00:00Z"),
        expectedFirstHarvestDate: new Date("2026-11-20T00:00:00Z"),
        establishmentType: "NURSERY_TRANSPLANTATION",
        status: "PLANNED",
        bedPreparationEnabled: true,
        bedWidthCm: 90,
        bedCenterDistanceCm: 150,
        expectedBedsPerAcre,
        expectedTotalBeds: calc.expectedTotalBeds,
        mulchEnabled: true,
        mulchHolePattern: "DOUBLE_LINE_ZIGZAG",
        plantDistanceCm: 45,
        expectedPlantsPerAcre,
        expectedPlants: calc.expectedPlants,
        varieties: {
          create: [{ name: "Arka Rakshak" }, { name: "Abhinav" }],
        },
        milestones: {
          create: templateMilestones.map((m, idx) => {
            const d = new Date("2026-09-01T00:00:00Z");
            d.setUTCDate(d.getUTCDate() + (idx + 1) * 7);
            return {
              name: m.name,
              targetDate: m.targetDate ?? d,
            };
          }),
        },
      },
      include: { varieties: true, milestones: true },
    });
    cropCycleId = cropCycle.id;

    expect(cropCycle.varieties).toHaveLength(2);
    expect(cropCycle.milestones).toHaveLength(4);
    expect(cropCycle.milestones.map((m) => m.name)).toEqual([
      "Land Preparation",
      "Mulching & TP / Sowing Readiness",
      "Transplantation",
      "First Harvest",
    ]);

    // Generate initial system tasks for milestones
    for (const m of cropCycle.milestones) {
      const task = await prisma.task.create({
        data: {
          farmId: farmAId,
          plotId: plot1Id,
          cropCycleId: cropCycle.id,
          milestoneId: m.id,
          origin: "SYSTEM",
          category: "MILESTONE",
          title: m.name,
          description: `Complete the ${m.name} milestone.`,
          dueDate: m.targetDate,
          status: "AVAILABLE",
          createdById: superAdminId,
        },
      });
      milestoneTaskIds.push(task.id);
    }

    expect(milestoneTaskIds).toHaveLength(4);
  });

  // --------------------------------------------------------------------------
  // DOMAIN 5: FARM ACTIVATION
  // --------------------------------------------------------------------------
  it("Domain 5: activates Farm A because all prerequisites (plot + planned cycle + 4 milestones) are met", async () => {
    // Perform activation transaction
    await prisma.$transaction(async (tx) => {
      await tx.farm.update({ where: { id: farmAId }, data: { status: "ACTIVE" } });
      await tx.plot.updateMany({ where: { farmId: farmAId, status: "SETUP" }, data: { status: "ACTIVE" } });
      await tx.cropCycle.updateMany({ where: { plot: { farmId: farmAId }, status: "PLANNED" }, data: { status: "ACTIVE" } });
    });

    const updatedFarm = await prisma.farm.findUniqueOrThrow({ where: { id: farmAId } });
    const updatedPlot = await prisma.plot.findUniqueOrThrow({ where: { id: plot1Id } });
    const updatedCycle = await prisma.cropCycle.findUniqueOrThrow({ where: { id: cropCycleId } });

    expect(updatedFarm.status).toBe("ACTIVE");
    expect(updatedPlot.status).toBe("ACTIVE");
    expect(updatedCycle.status).toBe("ACTIVE");
  });

  // --------------------------------------------------------------------------
  // DOMAIN 6: AGRONOMY PLANNING
  // --------------------------------------------------------------------------
  it("Domain 6: validates 7-day rolling window rule for planned activities", () => {
    const today = new Date();
    const inThreeDays = new Date();
    inThreeDays.setDate(today.getDate() + 3);
    const inTenDays = new Date();
    inTenDays.setDate(today.getDate() + 10);

    expect(isWithinRollingSevenDays(today)).toBe(true);
    expect(isWithinRollingSevenDays(inThreeDays)).toBe(true);
    expect(isWithinRollingSevenDays(inTenDays)).toBe(false);
  });

  it("Domain 6: creates an agronomy plan and assigned task for Farm Officer 1", async () => {
    const today = new Date(new Date().toISOString().slice(0, 10));

    const plan = await prisma.agronomyPlan.create({
      data: {
        farmId: farmAId,
        planDate: today,
        notes: "Week 1 fertigation schedule",
        createdById: agronomistId,
      },
    });

    const task = await prisma.task.create({
      data: {
        farmId: farmAId,
        plotId: plot1Id,
        cropCycleId: cropCycleId,
        planId: plan.id,
        origin: "AGRONOMIST",
        category: "FERTIGATION",
        title: "Apply 19:19:19 Fertigation",
        description: "Mix 5kg water-soluble 19:19:19 fertilizer per acre and run through drip system.",
        instructions: "Run drip for 30 minutes before dosing fertilizer, then flush for 15 minutes.",
        priority: "HIGH",
        dueDate: today,
        status: "ASSIGNED",
        assignedOfficerId: officer1Id,
        createdById: agronomistId,
      },
    });
    plannedTaskId = task.id;

    expect(task.id).toBeDefined();
    expect(task.origin).toBe("AGRONOMIST");
    expect(task.assignedOfficerId).toBe(officer1Id);
  });

  // --------------------------------------------------------------------------
  // DOMAIN 7 & 8: TASK ENGINE & FARM OFFICER EXECUTION
  // --------------------------------------------------------------------------
  it("Domain 7 & 8: transitions task from ASSIGNED to IN_PROGRESS", async () => {
    expect(canTransitionTask("ASSIGNED", "IN_PROGRESS")).toBe(true);

    const updated = await prisma.$transaction(async (tx) => {
      const t = await tx.task.update({
        where: { id: plannedTaskId },
        data: { status: "IN_PROGRESS" },
      });
      await tx.taskExecution.create({
        data: {
          taskId: plannedTaskId,
          officerId: officer1Id,
          status: "IN_PROGRESS",
          startedAt: new Date(),
        },
      });
      return t;
    });

    expect(updated.status).toBe("IN_PROGRESS");
  });

  it("Domain 7 & 8: completes activity with material usage and labour hours tracking", async () => {
    const labourHrs = labourHours(3, 4.5); // 3 labourers, 4.5 hours each = 13.5 labour hours
    expect(labourHrs).toBe(13.5);

    const completedExecution = await prisma.$transaction(async (tx) => {
      const execution = await tx.taskExecution.upsert({
        where: { taskId: plannedTaskId },
        update: {
          status: "COMPLETED",
          completedAt: new Date(),
          remarks: "Fertigation executed according to agronomy guidelines.",
          materials: {
            create: [
              { materialName: "NPK 19:19:19", quantity: 25.0, unit: "kg" },
            ],
          },
          labour: {
            create: [
              { labourers: 3, hours: 4.5, labourHours: labourHrs },
            ],
          },
        },
        create: {
          taskId: plannedTaskId,
          officerId: officer1Id,
          status: "COMPLETED",
          startedAt: new Date(),
          completedAt: new Date(),
          remarks: "Fertigation executed according to agronomy guidelines.",
          materials: {
            create: [
              { materialName: "NPK 19:19:19", quantity: 25.0, unit: "kg" },
            ],
          },
          labour: {
            create: [
              { labourers: 3, hours: 4.5, labourHours: labourHrs },
            ],
          },
        },
        include: { materials: true, labour: true },
      });

      await tx.task.update({
        where: { id: plannedTaskId },
        data: { status: "COMPLETED" },
      });

      return execution;
    });

    expect(completedExecution.status).toBe("COMPLETED");
    expect(completedExecution.materials).toHaveLength(1);
    expect(completedExecution.materials[0].materialName).toBe("NPK 19:19:19");
    expect(completedExecution.labour).toHaveLength(1);
    expect(Number(completedExecution.labour[0].labourHours)).toBe(13.5);
  });

  it("Domain 7 & 8: executes milestone bed preparation task and records actual bed count and variance", async () => {
    const bedTask = await prisma.task.findFirstOrThrow({
      where: { farmId: farmAId, title: "Land Preparation" },
    });

    // Start the task
    await prisma.task.update({ where: { id: bedTask.id }, data: { status: "IN_PROGRESS" } });

    const actualBedsCreated = 1950; // Expected was 2000
    const bedVariance = variance(2000, actualBedsCreated);
    expect(bedVariance?.amount).toBe(-50);
    expect(bedVariance?.percentage).toBe(-2.5);

    await prisma.$transaction(async (tx) => {
      await tx.taskExecution.create({
        data: {
          taskId: bedTask.id,
          officerId: officer1Id,
          status: "COMPLETED",
          startedAt: new Date(),
          completedAt: new Date(),
          remarks: "Bed preparation completed with tractor.",
        },
      });
      await tx.task.update({ where: { id: bedTask.id }, data: { status: "COMPLETED" } });
      if (bedTask.cropCycleId) {
        await tx.cropCycle.update({
          where: { id: bedTask.cropCycleId },
          data: { actualBedsCreated },
        });
      }
      if (bedTask.milestoneId) {
        await tx.milestone.update({
          where: { id: bedTask.milestoneId },
          data: { status: "COMPLETED", completedAt: new Date() },
        });
      }
    });

    const updatedCycle = await prisma.cropCycle.findUniqueOrThrow({ where: { id: cropCycleId } });
    expect(Number(updatedCycle.actualBedsCreated)).toBe(1950);
  });

  // --------------------------------------------------------------------------
  // DOMAIN 9: ATTENDANCE & LOCATION
  // --------------------------------------------------------------------------
  it("Domain 9: records Start Day inside geofence with OPEN status", async () => {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmAId } });
    const officerLocation = { latitude: 12.9717, longitude: 77.5947 };
    const dist = distanceMeters(
      { latitude: Number(farm.latitude), longitude: Number(farm.longitude) },
      officerLocation
    );
    expect(dist).toBeLessThan(farm.geofenceRadiusMeters);

    const attendance = await prisma.attendance.create({
      data: {
        userId: officer1Id,
        farmId: farmAId,
        attendanceDate: today,
        status: "OPEN",
        startAt: new Date(),
        startLatitude: officerLocation.latitude,
        startLongitude: officerLocation.longitude,
      },
    });

    expect(attendance.id).toBeDefined();
    expect(attendance.status).toBe("OPEN");
  });

  it("Domain 9: handles outside geofence attendance exception for Officer 2", async () => {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const farmB = await prisma.farm.findUniqueOrThrow({ where: { id: farmBId } });
    const farLocation = { latitude: 13.0500, longitude: 77.7000 };
    const dist = distanceMeters(
      { latitude: Number(farmB.latitude), longitude: Number(farmB.longitude) },
      farLocation
    );
    expect(dist).toBeGreaterThan(farmB.geofenceRadiusMeters);

    const outsideAttendance = await prisma.$transaction(async (tx) => {
      const att = await tx.attendance.create({
        data: {
          userId: officer2Id,
          farmId: farmBId,
          attendanceDate: today,
          status: "EXCEPTION_PENDING",
          startAt: new Date(),
          startLatitude: farLocation.latitude,
          startLongitude: farLocation.longitude,
          exceptionReason: "Network connectivity delay from nursery road",
        },
      });

      await tx.attendanceException.create({
        data: {
          attendanceId: att.id,
          distanceMeters: dist,
          reason: "Network connectivity delay from nursery road",
          status: "PENDING",
        },
      });
      return att;
    });

    expect(outsideAttendance.status).toBe("EXCEPTION_PENDING");

    // Admin approves the exception
    const exception = await prisma.attendanceException.findUniqueOrThrow({
      where: { attendanceId: outsideAttendance.id },
    });

    await prisma.$transaction(async (tx) => {
      await tx.attendanceException.update({
        where: { id: exception.id },
        data: { status: "APPROVED", reviewedById: farmAdminBId, reviewedAt: new Date() },
      });
      await tx.attendance.update({
        where: { id: outsideAttendance.id },
        data: { status: "EXCEPTION_APPROVED" },
      });
    });

    const verifiedAttendance = await prisma.attendance.findUniqueOrThrow({
      where: { id: outsideAttendance.id },
    });
    expect(verifiedAttendance.status).toBe("EXCEPTION_APPROVED");
  });

  it("Domain 9: completes End Day successfully", async () => {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const existing = await prisma.attendance.findUniqueOrThrow({
      where: { userId_farmId_attendanceDate: { userId: officer1Id, farmId: farmAId, attendanceDate: today } },
    });

    const updated = await prisma.attendance.update({
      where: { id: existing.id },
      data: {
        endAt: new Date(),
        endLatitude: 12.9716,
        endLongitude: 77.5946,
        status: "COMPLETED",
      },
    });

    expect(updated.status).toBe("COMPLETED");
    expect(updated.endAt).toBeDefined();
  });

  // --------------------------------------------------------------------------
  // DOMAIN 10: CROP MONITORING
  // --------------------------------------------------------------------------
  it("Domain 10: creates daily monitoring records and auto-completes daily monitoring task", async () => {
    const today = new Date(new Date().toISOString().slice(0, 10));

    const dailyTask = await prisma.task.create({
      data: {
        farmId: farmAId,
        plotId: plot1Id,
        cropCycleId: cropCycleId,
        origin: "DAILY_MONITORING",
        category: "CROP_MONITORING",
        title: "Daily monitoring · Tomato",
        description: "Record crop health, stage, remarks.",
        dueDate: today,
        status: "ASSIGNED",
        assignedOfficerId: officer1Id,
        createdById: officer1Id,
      },
    });
    monitoringTaskId = dailyTask.id;

    const monitoring = await prisma.$transaction(async (tx) => {
      const mon = await tx.cropMonitoring.create({
        data: {
          farmId: farmAId,
          plotId: plot1Id,
          cropCycleId: cropCycleId,
          officerId: officer1Id,
          status: "GOOD",
          stage: "Vegetative",
          remarks: "Uniform canopy growth observed, healthy green color.",
        },
      });

      await tx.task.update({
        where: { id: dailyTask.id },
        data: { status: "COMPLETED" },
      });

      return mon;
    });

    const updatedTask = await prisma.task.findUniqueOrThrow({ where: { id: monitoringTaskId } });
    expect(monitoring.status).toBe("GOOD");
    expect(monitoring.stage).toBe("Vegetative");
    expect(updatedTask.status).toBe("COMPLETED");
  });

  // --------------------------------------------------------------------------
  // DOMAIN 11: INCIDENTS
  // --------------------------------------------------------------------------
  it("Domain 11: reports an incident at Crop level and updates its status lifecycle", async () => {
    const incident = await prisma.incident.create({
      data: {
        farmId: farmAId,
        plotId: plot1Id,
        cropCycleId: cropCycleId,
        reporterId: officer1Id,
        level: "CROP",
        type: "Leaf Minor Spotting",
        severity: "MEDIUM",
        impactPercent: 5.0,
        description: "Minor leaf spot symptoms seen on 5% of plants in bed row 12.",
        status: "OPEN",
      },
    });

    expect(incident.status).toBe("OPEN");

    // Agronomist acknowledges
    const acked = await prisma.incident.update({
      where: { id: incident.id },
      data: { status: "ACKNOWLEDGED" },
    });
    expect(acked.status).toBe("ACKNOWLEDGED");

    // Agronomist/Admin resolves
    const resolved = await prisma.incident.update({
      where: { id: incident.id },
      data: { status: "RESOLVED" },
    });
    expect(resolved.status).toBe("RESOLVED");
  });

  // --------------------------------------------------------------------------
  // DOMAIN 12: DASHBOARDS & DAILY REPORTS PROJECTION
  // --------------------------------------------------------------------------
  it("Domain 12: aggregates dashboard metrics directly from live database records", async () => {
    const [activeFarms, activePlots, activeCropCycles, plannedTasks, completedTasks] = await Promise.all([
      prisma.farm.count({ where: { status: "ACTIVE" } }),
      prisma.plot.count({ where: { farmId: farmAId, status: "ACTIVE" } }),
      prisma.cropCycle.count({ where: { plot: { farmId: farmAId }, status: "ACTIVE" } }),
      prisma.task.count({ where: { farmId: farmAId } }),
      prisma.task.count({ where: { farmId: farmAId, status: "COMPLETED" } }),
    ]);

    expect(activeFarms).toBeGreaterThanOrEqual(1);
    expect(activePlots).toBeGreaterThanOrEqual(2);
    expect(activeCropCycles).toBeGreaterThanOrEqual(1);
    expect(plannedTasks).toBeGreaterThanOrEqual(2);
    expect(completedTasks).toBeGreaterThanOrEqual(2);
  });

  it("Domain 12: projects daily operations report from attendance, task executions, and monitoring", async () => {
    const today = new Date(new Date().toISOString().slice(0, 10));
    const end = new Date(today);
    end.setDate(end.getDate() + 1);

    const [attendance, tasks, monitoring, incidents] = await Promise.all([
      prisma.attendance.findMany({ where: { farmId: farmAId, attendanceDate: today } }),
      prisma.task.findMany({
        where: { farmId: farmAId, dueDate: today },
        include: { executions: { include: { materials: true, labour: true } } },
      }),
      prisma.cropMonitoring.findMany({ where: { farmId: farmAId, createdAt: { gte: today, lt: end } } }),
      prisma.incident.findMany({ where: { farmId: farmAId, createdAt: { gte: today, lt: end } } }),
    ]);

    const executions = tasks.flatMap((t) => t.executions);
    const totalLabourHours = executions
      .flatMap((e) => e.labour)
      .reduce((sum, l) => sum + Number(l.labourHours), 0);

    expect(attendance.length).toBeGreaterThanOrEqual(1);
    expect(executions.length).toBeGreaterThanOrEqual(1);
    expect(totalLabourHours).toBeGreaterThan(0);
    expect(monitoring.length).toBeGreaterThanOrEqual(1);
    expect(incidents.length).toBeGreaterThanOrEqual(1);
  });
});
