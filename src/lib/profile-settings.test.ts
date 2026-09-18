import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { PUT as updateProfileHandler } from "@/app/api/me/route";
import { PUT as updatePasswordHandler } from "@/app/api/me/password/route";
import { prisma } from "@infrastructure/db";
import { testSessionContext, signSessionToken } from "@modules/auth";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

describe("Profile & Settings API Tests", () => {
  const timestamp = Date.now();
  const testEmail = `settings.${timestamp}@agaate.local`;
  const initialPassword = "InitialPassword123!";
  const newPassword = "NewSecurePassword456!";
  let testUserId: string;
  let sessionToken: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(initialPassword, 10);
    const user = await prisma.user.create({
      data: {
        name: "Arjun Singhania",
        email: testEmail,
        phone: "+919876543210",
        passwordHash,
        role: "SUPER_ADMIN",
      },
    });
    testUserId = user.id;

    // Create session token for the user
    sessionToken = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: "SUPER_ADMIN",
      permissions: [],
      farmIds: [],
    });
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
  });

  function makeRequest(url: string, method: string, body: Record<string, any>, token?: string) {
    const headers = new Headers({
      "Content-Type": "application/json",
    });
    if (token) {
      headers.set("Cookie", `agaate_session=${token}`);
    }
    return new NextRequest(url, {
      method,
      headers,
      body: JSON.stringify(body),
    });
  }

  describe("PUT /api/me (Profile update)", () => {
    it("updates name and phone successfully for authenticated user", async () => {
      await testSessionContext.run({ token: sessionToken }, async () => {
        const req = makeRequest("http://localhost:3000/api/me", "PUT", {
          name: "Arjun S. Singhania",
          phone: "+919876500000",
        }, sessionToken);
        const res = await updateProfileHandler(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.name).toBe("Arjun S. Singhania");
        expect(data.phone).toBe("+919876500000");

        // Verify in DB
        const inDb = await prisma.user.findUnique({ where: { id: testUserId } });
        expect(inDb?.name).toBe("Arjun S. Singhania");
        expect(inDb?.phone).toBe("+919876500000");
      });
    });

    it("rejects unauthenticated profile update", async () => {
      const req = makeRequest("http://localhost:3000/api/me", "PUT", { name: "Hacker" });
      const res = await updateProfileHandler(req);
      expect(res.status).toBe(401);
    });
  });

  describe("PUT /api/me/password (Password update)", () => {
    it("rejects unauthenticated password update", async () => {
      const req = makeRequest("http://localhost:3000/api/me/password", "PUT", {
        currentPassword: initialPassword,
        newPassword,
        confirmPassword: newPassword,
      });
      const res = await updatePasswordHandler(req);
      expect(res.status).toBe(401);
    });

    it("rejects password update when current password is wrong", async () => {
      await testSessionContext.run({ token: sessionToken }, async () => {
        const req = makeRequest("http://localhost:3000/api/me/password", "PUT", {
          currentPassword: "WrongPassword!",
          newPassword,
          confirmPassword: newPassword,
        }, sessionToken);
        const res = await updatePasswordHandler(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("Current password is incorrect.");
      });
    });

    it("rejects password update when new passwords do not match", async () => {
      await testSessionContext.run({ token: sessionToken }, async () => {
        const req = makeRequest("http://localhost:3000/api/me/password", "PUT", {
          currentPassword: initialPassword,
          newPassword,
          confirmPassword: "MismatchPassword!",
        }, sessionToken);
        const res = await updatePasswordHandler(req);
        expect(res.status).toBe(400);
        const data = await res.json();
        expect(data.error).toBe("New passwords do not match");
      });
    });

    it("rejects password update when new password is too short", async () => {
      await testSessionContext.run({ token: sessionToken }, async () => {
        const req = makeRequest("http://localhost:3000/api/me/password", "PUT", {
          currentPassword: initialPassword,
          newPassword: "short",
          confirmPassword: "short",
        }, sessionToken);
        const res = await updatePasswordHandler(req);
        expect(res.status).toBe(400);
      });
    });

    it("successfully updates password with valid current password and matching new password", async () => {
      await testSessionContext.run({ token: sessionToken }, async () => {
        const req = makeRequest("http://localhost:3000/api/me/password", "PUT", {
          currentPassword: initialPassword,
          newPassword,
          confirmPassword: newPassword,
        }, sessionToken);
        const res = await updatePasswordHandler(req);
        expect(res.status).toBe(200);
        const data = await res.json();
        expect(data.ok).toBe(true);

        // Verify updated hash in DB matches new password
        const inDb = await prisma.user.findUnique({ where: { id: testUserId } });
        expect(inDb?.passwordHash).toBeTruthy();
        const valid = await bcrypt.compare(newPassword, inDb!.passwordHash);
        expect(valid).toBe(true);
        const oldValid = await bcrypt.compare(initialPassword, inDb!.passwordHash);
        expect(oldValid).toBe(false);
      });
    });
  });
});
