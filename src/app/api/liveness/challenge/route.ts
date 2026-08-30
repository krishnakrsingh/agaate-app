import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { currentActor } from "@/lib/access";
import { prisma } from "@/lib/prisma";
import { audit } from "@/lib/audit";
import { apiError } from "@/lib/api";

const INSTRUCTIONS = [
  { code: "TURN_LEFT", text: "Turn head slightly left" },
  { code: "TURN_RIGHT", text: "Turn head slightly right" },
  { code: "LOOK_UP", text: "Look slightly up" },
  { code: "SMILE", text: "Smile naturally" },
  { code: "BLINK", text: "Blink slowly" },
] as const;

const CHALLENGE_TTL_MS = 2 * 60 * 1000; // 2 minutes

export async function POST(request: NextRequest) {
  try {
    const actor = await currentActor();
    if (!actor.active) throw new Error("Account is unavailable");

    // Require face enrollment before liveness (otherwise liveness has no reference)
    const enrollment = await prisma.faceEnrollment.findUnique({ where: { userId: actor.id } });
    if (!enrollment || enrollment.status !== "ACTIVE")
      return NextResponse.json({ error: "Face enrollment required before liveness challenge." }, { status: 409 });

    const pick = INSTRUCTIONS[Math.floor(Math.random() * INSTRUCTIONS.length)];
    const challenge = randomBytes(16).toString("base64url");

    const expiresAt = new Date(Date.now() + CHALLENGE_TTL_MS);

    // Clean old expired for this user
    await prisma.livenessChallenge.deleteMany({ where: { userId: actor.id, expiresAt: { lt: new Date() } } });

    const created = await prisma.livenessChallenge.create({
      data: {
        userId: actor.id,
        challenge,
        instruction: pick.code,
        expiresAt,
      },
    });

    await audit(actor.id, "LIVENESS_CHALLENGE_CREATE", "LivenessChallenge", created.id, {
      instruction: pick.code,
    });

    return NextResponse.json({
      challengeId: created.id,
      challenge: created.challenge,
      instruction: pick.text,
      instructionCode: pick.code,
      expiresAt: created.expiresAt,
      ttlSeconds: CHALLENGE_TTL_MS / 1000,
    });
  } catch (error) {
    return apiError(error);
  }
}

export async function GET() {
  try {
    const actor = await currentActor();
    const pending = await prisma.livenessChallenge.findMany({
      where: { userId: actor.id, used: false, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: "desc" },
      take: 1,
    });
    return NextResponse.json(pending[0] ?? null);
  } catch (error) {
    return apiError(error);
  }
}
