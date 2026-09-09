import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";
import { acquireRateLimitSlot, resetRateLimit } from "@/lib/rate-limit";
import { assertSameOrigin, getClientIp } from "@/lib/security";

// Cost-matched dummy hash so miss path takes as long as hit path (no enumeration oracle).
const DUMMY_HASH = "$2b$12$it081XdNqvkH.e8K8R5mgeht3W.wsxNzzBJUdiEnAA/G7CONJLVLe";
function normalizePhone(raw: string) {
  const digits = raw.replace(/[^\d]/g, "");
  const hasPlus = raw.trim().startsWith("+");
  // Require plausible E.164-ish length; reject empty/short GPS-like "0".
  if (digits.length < 10 || digits.length > 15) return null;
  return hasPlus ? `+${digits}` : digits;
}

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    const raw = await request.json();
    const schema = z.object({
      identifier: z.string().optional(),
      email: z.string().optional(),
      phone: z.string().optional(),
      emailOrPhone: z.string().optional(),
      password: z.string().min(1, "Password is required").max(256),
    });
    const input = schema.parse(raw);
    const rawIdentifier = (input.identifier || input.email || input.phone || input.emailOrPhone || "").trim();

    if (!rawIdentifier) {
      return NextResponse.json({ error: "Email or phone number is required." }, { status: 422 });
    }

    const isEmail = rawIdentifier.includes("@");
    let normalizedIdentifier: string | null = null;
    if (isEmail) {
      const email = rawIdentifier.toLowerCase();
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email) || email.length > 254) {
        await bcrypt.compare(input.password, DUMMY_HASH);
        return NextResponse.json({ error: "Invalid email or password." }, { status: 401 });
      }
      normalizedIdentifier = email;
    } else {
      normalizedIdentifier = normalizePhone(rawIdentifier);
      if (!normalizedIdentifier) {
        await bcrypt.compare(input.password, DUMMY_HASH);
        return NextResponse.json({ error: "Invalid email, phone number, or password." }, { status: 401 });
      }
    }

    const ip = getClientIp(request.headers);
    const rateKey = `login:${ip}:${normalizedIdentifier.toLowerCase()}`;
    const ipKey = `login-ip:${ip}`;

    const limitStatus = acquireRateLimitSlot(rateKey, 5, 15 * 60 * 1000);
    const ipStatus = acquireRateLimitSlot(ipKey, 30, 15 * 60 * 1000);
    const blocked = !limitStatus.allowed ? limitStatus : !ipStatus.allowed ? ipStatus : null;
    if (blocked) {
      return NextResponse.json(
        { error: "Too many failed login attempts. Please try again later." },
        { status: 429, headers: { "Retry-After": String(blocked.retryAfterSeconds) } }
      );
    }

    const user = isEmail
      ? await prisma.user.findUnique({ where: { email: normalizedIdentifier } })
      : await prisma.user.findFirst({
          where: {
            OR: [
              { phone: normalizedIdentifier },
              { email: rawIdentifier.toLowerCase() },
            ],
          },
        });

    const passwordOk = user ? await bcrypt.compare(input.password, user.passwordHash) : await bcrypt.compare(input.password, DUMMY_HASH).then(() => false);
    if (!user?.active || !passwordOk) {
      return NextResponse.json({ error: isEmail ? "Invalid email or password." : "Invalid phone number or password." }, { status: 401 });
    }

    resetRateLimit(rateKey);
    resetRateLimit(ipKey);
    await createSession({ userId: user.id, name: user.name, role: user.role });
    await audit(user.id, "LOGIN", "User", user.id);
    return NextResponse.json({ user: { id: user.id, name: user.name, role: user.role } });
  } catch (error) {
    return apiError(error);
  }
}

