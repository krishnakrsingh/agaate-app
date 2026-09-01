import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { acquireRateLimitSlot, resetRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  try {
    const input = z.object({ email: z.string().email(), password: z.string().min(8) }).parse(await request.json());
    const normalizedEmail = input.email.toLowerCase();
    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateKey = `login:${ip}:${normalizedEmail}`;

    const limitStatus = acquireRateLimitSlot(rateKey, 5, 15 * 60 * 1000);
    if (!limitStatus.allowed) {
      return NextResponse.json(
        { error: "Too many failed login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limitStatus.retryAfterSeconds) } }
      );
    }

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (!user?.active || !(await bcrypt.compare(input.password, user.passwordHash))) {
      // Slot already reserved atomically; no additional record needed
      return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
    }

    resetRateLimit(rateKey);
    await createSession({ userId: user.id, name: user.name, role: user.role });
    await audit(user.id, "LOGIN", "User", user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    return apiError(error);
  }
}

