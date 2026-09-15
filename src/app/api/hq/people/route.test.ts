import { describe, expect, it, beforeAll } from "vitest";
import { SignJWT } from "jose";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { testSessionContext } from "@/lib/auth";
import { GET } from "./route";

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

describe("GET /api/hq/people", () => {
  let superAdmin: { id: string; name: string; role: string };

  beforeAll(async () => {
    const user = await prisma.user.findFirst({
      where: { role: "SUPER_ADMIN", active: true },
      select: { id: true, name: true, role: true },
    });
    if (!user) throw new Error("No super admin in DB");
    superAdmin = user;
  });

  it("returns internal team members for super admin", async () => {
    const token = await authCookie(superAdmin);
    const req = new NextRequest(
      "http://localhost/api/hq/people?limit=25&offset=0&sortBy=createdAt&sortOrder=desc"
    );

    const res = await testSessionContext.run({ token }, () => GET(req));
    const body = await res.json();

    if (res.status !== 200) {
      console.error("error body:", body);
    }

    expect(res.status).toBe(200);
    expect(Array.isArray(body)).toBe(true);
    expect(body.length).toBeGreaterThan(0);
    expect(res.headers.get("X-Total-Count")).toBeTruthy();
    expect(body[0]).toMatchObject({
      roleDefinition: {
        id: expect.any(String),
        slug: expect.any(String),
        label: expect.any(String),
        tier: "hq",
      },
    });
  });
});
