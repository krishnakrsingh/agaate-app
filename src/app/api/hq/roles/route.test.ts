import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { testSessionContext } from "@/lib/auth";
import { GET, POST } from "./route";
import { DELETE as DELETE_ROLE } from "./[id]/route";

const secret = new TextEncoder().encode(
  process.env.APP_SESSION_SECRET || "local-development-session-secret-change-this-before-production-32chars"
);

async function authCookie(user: { id: string; name: string; role: string }) {
  const token = await new SignJWT({ userId: user.id, name: user.name, role: user.role })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(secret);
  return token;
}

describe("/api/hq/roles", () => {
  let superAdmin: { id: string; name: string; role: string };
  let systemRoleId: string;
  const createdRoleIds: string[] = [];

  beforeAll(async () => {
    const user = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", active: true },
      select: { id: true, name: true, role: true },
    });
    if (!user) throw new Error("No super admin in DB");
    superAdmin = user;

    const systemRole = await prisma.roleDefinition.findFirst({
      where: { slug: "SUPER_ADMIN", isSystem: true },
      select: { id: true },
    });
    if (!systemRole) throw new Error("SUPER_ADMIN role definition missing — run seed");
    systemRoleId = systemRole.id;
  });

  afterAll(async () => {
    for (const id of createdRoleIds) {
      await prisma.roleDefinition.deleteMany({ where: { id, isSystem: false } });
    }
  });

  it("lists HQ roles with user counts for super admin", async () => {
    const token = await authCookie(superAdmin);
    const req = new NextRequest("http://localhost/api/hq/roles?tier=hq");

    const res = await testSessionContext.run({ token }, () => GET(req));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toMatchObject({
      id: expect.any(String),
      slug: expect.any(String),
      label: expect.any(String),
      permissions: expect.any(Array),
      userCount: expect.any(Number),
    });
  });

  it("creates a custom HQ role", async () => {
    const token = await authCookie(superAdmin);
    const label = `Test Role ${Date.now()}`;
    const req = new NextRequest("http://localhost/api/hq/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        label,
        description: "Vitest custom role",
        permissions: ["clients:read", "farms:read_all"],
      }),
    });

    const res = await testSessionContext.run({ token }, () => POST(req));
    const body = await res.json();

    expect(res.status).toBe(201);
    expect(body.label).toBe(label);
    expect(body.isSystem).toBe(false);
    expect(body.tier).toBe("hq");
    expect(body.permissions).toEqual(["clients:read", "farms:read_all"]);
    createdRoleIds.push(body.id);
  });

  it("blocks deleting system roles", async () => {
    const token = await authCookie(superAdmin);
    const req = new NextRequest(`http://localhost/api/hq/roles/${systemRoleId}`, { method: "DELETE" });

    const res = await testSessionContext.run({ token }, () =>
      DELETE_ROLE(req, { params: Promise.resolve({ id: systemRoleId }) })
    );
    const body = await res.json();

    expect(res.status).toBeGreaterThanOrEqual(400);
    expect(body.error).toMatch(/system roles cannot be deleted/i);
  });

  it("deletes an unused custom role", async () => {
    const token = await authCookie(superAdmin);
    const row = await prisma.roleDefinition.create({
      data: {
        slug: `vitest-delete-${Date.now()}`,
        label: "Vitest Delete Me",
        description: "",
        tier: "hq",
        scope: "platform",
        permissions: ["clients:read"],
        isSystem: false,
        active: true,
      },
    });

    const req = new NextRequest(`http://localhost/api/hq/roles/${row.id}`, { method: "DELETE" });
    const res = await testSessionContext.run({ token }, () =>
      DELETE_ROLE(req, { params: Promise.resolve({ id: row.id }) })
    );

    expect(res.status).toBe(204);
  });
});
