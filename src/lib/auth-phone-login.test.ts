import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";

describe("Phone & Email Dual Authentication Tests", () => {
  const timestamp = Date.now();
  const testPhone = "98765" + Math.floor(10000 + Math.random() * 90000);
  const testEmail = "worker." + timestamp + "@farm.ag";
  const testPassword = "WorkerPassword123!";
  let testUserId: string;

  beforeAll(async () => {
    const passwordHash = await bcrypt.hash(testPassword, 10);
    const user = await prisma.user.create({
      data: {
        name: "Raju Worker",
        email: testEmail,
        phone: testPhone,
        passwordHash,
        role: "FARM_OFFICER",
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    if (testUserId) {
      await prisma.user.deleteMany({ where: { id: testUserId } });
    }
  });

  function makeRequest(body: Record<string, any>) {
    return new NextRequest("http://localhost:3000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("authenticates worker successfully using Phone Number", async () => {
    const res = await loginHandler(makeRequest({ identifier: testPhone, password: testPassword }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.id).toBe(testUserId);
    expect(data.user.role).toBe("FARM_OFFICER");
  });

  it("authenticates worker successfully using phone field directly", async () => {
    const res = await loginHandler(makeRequest({ phone: testPhone, password: testPassword }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.id).toBe(testUserId);
  });

  it("authenticates worker successfully using Email address", async () => {
    const res = await loginHandler(makeRequest({ identifier: testEmail, password: testPassword }));
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(data.user.id).toBe(testUserId);
  });

  it("rejects authentication with invalid phone or wrong password", async () => {
    const res = await loginHandler(makeRequest({ identifier: testPhone, password: "WrongPassword" }));
    expect(res.status).toBe(401);
  });
});
