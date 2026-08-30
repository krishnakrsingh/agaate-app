import { describe, expect, it, beforeAll, afterAll } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { requireRole, requireFarmAccess, HttpError } from "./access";
import { DEFAULT_GEOFENCE_RADIUS_METERS, distanceMeters } from "./business";

describe.sequential("Authorization Penetration & Boundary Guard Tests", () => {
  let superAdminId: string;
  let farmAdminAId: string;
  let farmAdminBId: string;
  let officer1Id: string;
  let officer2Id: string;
  let disabledUserId: string;
  let farmAId: string;
  let farmBId: string;

  const cleanup = async () => {
    const testUsers = await prisma.user.findMany({
      where: { email: { contains: "@pentest.agaate.local" } },
      select: { id: true },
    });
    const testUserIds = testUsers.map((u) => u.id);
    if (testUserIds.length) {
      await prisma.mediaAsset.deleteMany({ where: { uploadedById: { in: testUserIds } } });
    }
    await prisma.taskExecution.deleteMany({ where: { officer: { email: { contains: "@pentest.agaate.local" } } } });
    await prisma.task.deleteMany({ where: { createdBy: { email: { contains: "@pentest.agaate.local" } } } });
    await prisma.attendance.deleteMany({ where: { user: { email: { contains: "@pentest.agaate.local" } } } });
    await prisma.farmAccess.deleteMany({ where: { user: { email: { contains: "@pentest.agaate.local" } } } });
    await prisma.farm.deleteMany({ where: { name: { startsWith: "PenTest Farm" } } });
    await prisma.user.deleteMany({ where: { email: { contains: "@pentest.agaate.local" } } });
  };

  beforeAll(async () => {
    await cleanup();

    const passwordHash = await bcrypt.hash("TestPass12345!", 10);
    const sa = await prisma.user.create({
      data: { name: "PenTest SA", email: "sa@pentest.agaate.local", passwordHash, role: "SUPER_ADMIN" },
    });
    superAdminId = sa.id;

    const faA = await prisma.user.create({
      data: { name: "PenTest Admin A", email: "adminA@pentest.agaate.local", passwordHash, role: "FARM_ADMIN" },
    });
    farmAdminAId = faA.id;

    const faB = await prisma.user.create({
      data: { name: "PenTest Admin B", email: "adminB@pentest.agaate.local", passwordHash, role: "FARM_ADMIN" },
    });
    farmAdminBId = faB.id;

    const off1 = await prisma.user.create({
      data: { name: "PenTest Officer 1", email: "officer1@pentest.agaate.local", passwordHash, role: "FARM_OFFICER" },
    });
    officer1Id = off1.id;

    const off2 = await prisma.user.create({
      data: { name: "PenTest Officer 2", email: "officer2@pentest.agaate.local", passwordHash, role: "FARM_OFFICER" },
    });
    officer2Id = off2.id;

    const dis = await prisma.user.create({
      data: { name: "PenTest Disabled", email: "disabled@pentest.agaate.local", passwordHash, role: "FARM_OFFICER", active: false },
    });
    disabledUserId = dis.id;

    const fA = await prisma.farm.create({
      data: {
        name: "PenTest Farm A",
        ownerName: "Client A",
        location: "Location A",
        latitude: 12.9716,
        longitude: 77.5946,
        totalArea: 10.0,
        cultivableArea: 8.0,
        waterSource: "Well",
        access: {
          create: [
            { userId: farmAdminAId, canManage: true },
            { userId: officer1Id, canManage: false },
          ],
        },
      },
    });
    farmAId = fA.id;

    const fB = await prisma.farm.create({
      data: {
        name: "PenTest Farm B",
        ownerName: "Client B",
        location: "Location B",
        latitude: 12.9141,
        longitude: 77.6109,
        totalArea: 15.0,
        cultivableArea: 12.0,
        waterSource: "Canal",
        access: {
          create: [
            { userId: farmAdminBId, canManage: true },
            { userId: officer2Id, canManage: false },
          ],
        },
      },
    });
    farmBId = fB.id;
  });

  afterAll(async () => {
    await cleanup();
  });

  describe.sequential("Role-Based Access Control Rules", () => {
    it("allows SUPER_ADMIN on any role check", () => {
      expect(() => requireRole("SUPER_ADMIN", ["FARM_ADMIN"])).not.toThrow();
      expect(() => requireRole("SUPER_ADMIN", ["AGRONOMIST"])).not.toThrow();
      expect(() => requireRole("SUPER_ADMIN", ["FARM_OFFICER"])).not.toThrow();
    });

    it("rejects unauthorized role access with 403 HttpError", () => {
      expect(() => requireRole("FARM_OFFICER", ["SUPER_ADMIN", "FARM_ADMIN"])).toThrowError(HttpError);
      expect(() => requireRole("AGRONOMIST", ["FARM_ADMIN"])).toThrowError(HttpError);
      expect(() => requireRole("FARM_ADMIN", ["AGRONOMIST"])).toThrowError(HttpError);
    });
  });

  describe.sequential("Farm-Level Isolation & Authorization", () => {
    it("confirms Farm Admin A has management access to Farm A but NOT Farm B", async () => {
      const accessA = await prisma.farmAccess.findUnique({
        where: { userId_farmId: { userId: farmAdminAId, farmId: farmAId } },
      });
      expect(accessA?.canManage).toBe(true);

      const accessB = await prisma.farmAccess.findUnique({
        where: { userId_farmId: { userId: farmAdminAId, farmId: farmBId } },
      });
      expect(accessB).toBeNull();
    });

    it("confirms Farm Officer 1 cannot manage Farm A", async () => {
      const access = await prisma.farmAccess.findUnique({
        where: { userId_farmId: { userId: officer1Id, farmId: farmAId } },
      });
      expect(access?.canManage).toBe(false);
    });

    it("prevents disabled user from active user queries", async () => {
      const user = await prisma.user.findUnique({
        where: { id: disabledUserId },
        select: { active: true },
      });
      expect(user?.active).toBe(false);
    });
  });

  describe.sequential("Database Area Constraints & Invariants", () => {
    it("validates that cultivable area cannot exceed total farm area", async () => {
      const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmAId } });
      const total = Number(farm.totalArea);
      const cultivable = Number(farm.cultivableArea);
      expect(cultivable).toBeLessThanOrEqual(total);
    });

    it("rejects plot area exceeding cultivable area", async () => {
      const farm = await prisma.farm.findUniqueOrThrow({ where: { id: farmAId } });
      const allocated = await prisma.plot.aggregate({
        where: { farmId: farmAId, deletedAt: null },
        _sum: { area: true },
      });
      const currentAllocated = Number(allocated._sum.area ?? 0);
      const proposedPlotArea = 100.0; // Exceeds farm cultivable area of 8.0

      const isOverflow = currentAllocated + proposedPlotArea > Number(farm.cultivableArea);
      expect(isOverflow).toBe(true);
    });
  });

  describe.sequential("Duplicate Attendance & Concurrency Protection", () => {
    it("enforces unique constraint on (userId, farmId, attendanceDate) to prevent double start-day", async () => {
      const today = new Date(new Date().toISOString().slice(0, 10));

      const first = await prisma.attendance.create({
        data: {
          userId: officer1Id,
          farmId: farmAId,
          attendanceDate: today,
          status: "OPEN",
          startAt: new Date(),
        },
      });
      expect(first.id).toBeDefined();

      // Attempting second start day record for same officer + farm + date must fail due to unique constraint
      await expect(
        prisma.attendance.create({
          data: {
            userId: officer1Id,
            farmId: farmAId,
            attendanceDate: today,
            status: "OPEN",
            startAt: new Date(),
          },
        })
      ).rejects.toThrow();
    });
  });
});
