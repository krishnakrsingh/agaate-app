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
    const raw = await request.json();
    const schema = z.object({
      identifier: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      emailOrPhone: z.string().optional(),
      password: z.string().min(1, "Password is required"),
    });
    const input = schema.parse(raw);
    const rawIdentifier = (input.identifier || input.email || input.phone || input.emailOrPhone || "").trim();

    if (!rawIdentifier) {
      return NextResponse.json({ error: "Email or phone number is required." }, { status: 422 });
    }

    const isEmail = rawIdentifier.includes("@");
    const normalizedIdentifier = isEmail
      ? rawIdentifier.toLowerCase()
      : rawIdentifier.replace(/[^\d+]/g, "");

    const forwardedFor = request.headers.get("x-forwarded-for");
    const ip = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";
    const rateKey = `login:${ip}:${normalizedIdentifier}`;

    const limitStatus = acquireRateLimitSlot(rateKey, 5, 15 * 60 * 1000);
    if (!limitStatus.allowed) {
      return NextResponse.json(
        { error: "Too many failed login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(limitStatus.retryAfterSeconds) } }
      );
    }

    const baselineUserSelect = {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      role: true,
      active: true,
    } as const;

    let user: {
      id: string;
      name: string;
      email: string;
      passwordHash: string;
      role: "SUPER_ADMIN" | "FARM_ADMIN" | "AGRONOMIST" | "FARM_OFFICER";
      active: boolean;
    } | null = null;

    try {
      if (isEmail) {
        user = await prisma.user.findUnique({
          where: { email: normalizedIdentifier },
          select: baselineUserSelect,
        });
      } else {
        try {
          user = await prisma.user.findFirst({
            where: {
              OR: [
                { phone: normalizedIdentifier },
                { phone: rawIdentifier },
                { email: rawIdentifier.toLowerCase() },
              ],
            },
            select: baselineUserSelect,
          });
        } catch (phoneErr) {
          console.warn("[Auth Login] Phone query failed (schema may lack phone column), falling back to email:", phoneErr);
          user = await prisma.user.findUnique({
            where: { email: rawIdentifier.toLowerCase() },
            select: baselineUserSelect,
          });
        }
      }
    } catch (dbError) {
      console.error("[Auth Login] Database lookup error:", dbError);
      return NextResponse.json(
        { error: "Authentication service temporarily unavailable. Please try again in a few moments." },
        { status: 500 }
      );
    }

    if (!user || !user.active || !(await bcrypt.compare(input.password, user.passwordHash))) {
      return NextResponse.json({ error: "Invalid email, phone number, or password." }, { status: 401 });
    }

    resetRateLimit(rateKey);
    await createSession({ userId: user.id, name: user.name, role: user.role });
    try {
      await audit(user.id, "LOGIN", "User", user.id);
    } catch {
      // Non-blocking audit
    }
    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    return apiError(error);
  }
}

